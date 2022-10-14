import * as core from '@actions/core'
import {extname} from 'path'
import fetch, {Response} from 'node-fetch'
import {existsSync, readFileSync} from 'fs'
import * as fastGlob from 'fast-glob'
import {v4 as uuidv4} from 'uuid'
import {
  createBulkArtifacts,
  BulkArtifact,
  BulkArtifactMimeType,
  updateBulkArtifactsStatus,
  BulkArtifactStatus
} from './api/captain'
import {
  getInputs,
  mimeTypeFromExtension,
  InputArtifact,
  Invalid,
  Valid
} from './utils'

type Artifact = InputArtifact & {
  mime_type: BulkArtifactMimeType
  external_id: string
  original_path: string
}

export default async function run(): Promise<void> {
  try {
    const validatedInputs = getInputs()

    if ((validatedInputs as Invalid).errors) {
      const errors = (validatedInputs as Invalid).errors
      for (const error of errors) {
        core.warning(error)
      }
      core.warning(
        [
          "Captain Uploader Action is misconfigured and can't upload test results.",
          'Please address error(s) above in the GitHub workflow and try again.',
          'These warnings will be errors in version 2'
        ].join('\n')
      )
      return
    }

    const inputs = validatedInputs as Valid
    const artifacts: Artifact[] = inputs.artifacts
      .flatMap(artifact => {
        const expandedGlob = fastGlob.sync(artifact.path)
        if (expandedGlob.length > 0) {
          return expandedGlob.map(path => ({
            ...artifact,
            path,
            original_path: artifact.path
          }))
        } else {
          return [{...artifact, original_path: artifact.path}]
        }
      })
      .map(artifact => ({
        ...artifact,
        mime_type: mimeTypeFromExtension(extname(artifact.path).toLowerCase()),
        external_id: uuidv4()
      }))

    const [artifactsWithFiles, artifactsWithoutFiles] = artifacts.reduce<
      [Artifact[], Artifact[]]
    >(
      ([withFiles, withoutFiles], artifact) => {
        if (existsSync(artifact.path)) {
          return [[...withFiles, artifact], withoutFiles]
        } else {
          return [withFiles, [...withoutFiles, artifact]]
        }
      },
      [[], []]
    )

    if (inputs.ifFilesNotFound === 'warn') {
      for (const artifact of artifactsWithoutFiles) {
        core.warning(
          `Artifact file not found at '${artifact.path}' for artifact '${artifact.name}'`
        )
      }
    } else if (inputs.ifFilesNotFound === 'error') {
      for (const artifact of artifactsWithoutFiles) {
        core.error(
          `Artifact file not found at '${artifact.path}' for artifact '${artifact.name}'`
        )
      }
      if (artifactsWithoutFiles.length) {
        core.setFailed('Artifact(s) are missing file(s)')
      }
    }

    const bulkArtifactsResult = await createBulkArtifacts(
      {
        account_name: inputs.accountName,
        artifacts: artifacts.map(artifact => ({
          kind: artifact.kind,
          name: artifact.name,
          parser: artifact.parser,
          mime_type: artifact.mime_type,
          external_id: artifact.external_id,
          original_path: artifact.original_path
        })),
        job_name: inputs.jobName,
        job_matrix: inputs.jobMatrix,
        repository_name: inputs.repositoryName,
        run_attempt: inputs.runAttempt,
        run_id: inputs.runId
      },
      {
        captainBaseUrl: inputs.captainBaseUrl,
        captainToken: inputs.captainToken
      }
    )

    if (!bulkArtifactsResult.ok) {
      throw new Error(
        `Bulk artifacts POST failed:\n\n  - Errors: ${bulkArtifactsResult.error
          .map(error => error.message)
          .join(', ')}`
      )
    }

    const uploadResponses = await Promise.all(
      uploadEach(bulkArtifactsResult.value, artifactsWithFiles)
    )

    const uploadedExternalIds = uploadResponses
      .filter(([, response]) => response.ok)
      .map(([artifact]) => artifact.external_id)

    const failedArtifacts = uploadResponses
      .filter(([, response]) => !response.ok)
      .map(([artifact]) => artifact)

    // intentionally ignore any potential errors here- if it fails,
    // our server will eventually find out the files were uploaded
    await updateBulkArtifactsStatus(
      [
        uploadedExternalIds.map(externalId => ({
          external_id: externalId,
          status: 'uploaded' as BulkArtifactStatus
        })),
        failedArtifacts.map(artifact => ({
          external_id: artifact.external_id,
          status: 'upload_failed' as BulkArtifactStatus
        })),
        artifactsWithoutFiles.map(artifact => ({
          external_id: artifact.external_id,
          status: 'upload_skipped_file_missing' as BulkArtifactStatus
        }))
      ].flat(),
      {
        captainBaseUrl: inputs.captainBaseUrl,
        captainToken: inputs.captainToken
      }
    )

    if (failedArtifacts.length) {
      throw new Error(
        `Some artifacts could not be uploaded:\n\n  Artifacts: ${failedArtifacts
          .map(artifact => artifact.name)
          .join(', ')}`
      )
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

function uploadEach(
  bulkArtifacts: BulkArtifact[],
  artifactsWithFiles: Artifact[]
): Promise<[Artifact, Response]>[] {
  return artifactsWithFiles.map(async artifact => {
    const bulkArtifact = bulkArtifacts.find(
      ba => ba.external_id === artifact.external_id
    )

    if (!bulkArtifact) {
      throw new Error(
        'Unreachable (could not find bulk artifact with matching external ID)'
      )
    }

    const response = await fetch(bulkArtifact.upload_url, {
      body: readFileSync(artifact.path),
      method: 'PUT'
    })

    return [artifact, response] as [Artifact, Response]
  })
}
