import * as core from '@actions/core'
import {extname} from 'path'
import fetch, {Response} from 'node-fetch'
import {existsSync, readFileSync} from 'fs'
import {v4 as uuidv4} from 'uuid'
import {
  createBulkArtifacts,
  BulkArtifact,
  BulkArtifactMimeType,
  updateBulkArtifactsStatus,
  BulkArtifactKind,
  BulkArtifactStatus
} from './api/captain'
import {getInputs, mimeTypeFromExtension} from './utils'

type Artifact = {
  kind: BulkArtifactKind
  path: string
  filename: string
  mime_type: BulkArtifactMimeType
  external_id: string
}

export default async function run(): Promise<void> {
  try {
    const inputs = getInputs()
    const artifacts: Artifact[] = inputs.artifacts.map(artifact => ({
      path: artifact.path,
      kind: artifact.kind,
      filename: artifact.save_as || artifact.path.split('/').pop() || 'file',
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
        core.warning(`Artifact file not found at '${artifact.path}'`)
      }
    } else if (inputs.ifFilesNotFound === 'error') {
      for (const artifact of artifactsWithoutFiles) {
        core.error(`Artifact file not found at '${artifact.path}'`)
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
          filename: artifact.filename,
          mime_type: artifact.mime_type,
          external_id: artifact.external_id
        })),
        job_name: inputs.jobName,
        job_matrix: inputs.jobMatrix,
        repository_name: inputs.repositoryName,
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
          .map(artifact => artifact.path)
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
