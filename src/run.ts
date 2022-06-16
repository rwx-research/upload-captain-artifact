import * as core from '@actions/core'
import {extname} from 'path'
import fetch, {Response} from 'node-fetch'
import {readFileSync} from 'fs'
import {v4 as uuidv4} from 'uuid'
import {
  createBulkArtifacts,
  BulkArtifact,
  BulkArtifactMimeType,
  markBulkArtifactsUploaded
} from './api/vanguard'
import {getInputs, mimeTypeFromExtension, InputArtifact} from './utils'

type Artifact = InputArtifact & {
  mime_type: BulkArtifactMimeType
  external_id: string
}

export default async function run(): Promise<void> {
  try {
    const inputs = getInputs()
    const artifactsToUpload: Artifact[] = inputs.artifacts.map(artifact => ({
      ...artifact,
      mime_type: mimeTypeFromExtension(extname(artifact.path).toLowerCase()),
      external_id: uuidv4()
    }))
    const bulkArtifactsResult = await createBulkArtifacts(
      {
        account_name: inputs.accountName,
        artifacts: artifactsToUpload.map(artifact => ({
          kind: artifact.kind,
          name: artifact.name,
          mime_type: artifact.mime_type,
          external_id: artifact.external_id
        })),
        job_name: inputs.jobName,
        job_matrix: inputs.jobMatrix,
        repository_name: inputs.repositoryName,
        run_id: inputs.runId
      },
      {
        vanguardBaseUrl: inputs.vanguardBaseUrl,
        vanguardToken: inputs.vanguardToken
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
      uploadEach(bulkArtifactsResult.value, artifactsToUpload)
    )

    const uploadedExternalIds = uploadResponses
      .filter(([, response]) => response.ok)
      .map(([artifact]) => artifact.external_id)

    const failedArtifacts = uploadResponses
      .filter(([, response]) => !response.ok)
      .map(([artifact]) => artifact)

    if (uploadedExternalIds.length) {
      // intentionally ignore any potential errors here- if it fails,
      // our server will eventually find out the files were uploaded
      await markBulkArtifactsUploaded(uploadedExternalIds, {
        vanguardBaseUrl: inputs.vanguardBaseUrl,
        vanguardToken: inputs.vanguardToken
      })
    }

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
  originalArtifacts: Artifact[]
): Promise<[Artifact, Response]>[] {
  return bulkArtifacts.map(async bulkArtifact => {
    const originalArtifact = originalArtifacts.find(
      a => a.external_id === bulkArtifact.external_id
    )

    if (!originalArtifact) {
      throw new Error(
        'Unreachable (could not find artifact with matching external ID)'
      )
    }

    const response = await fetch(bulkArtifact.upload_url, {
      body: readFileSync(originalArtifact.path),
      method: 'PUT'
    })

    return [originalArtifact, response] as [Artifact, Response]
  })
}
