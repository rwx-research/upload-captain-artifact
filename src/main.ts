import * as core from '@actions/core'
import * as github from '@actions/github'
import {extname} from 'path'
import fetch, {Response} from 'node-fetch'
import {readFileSync} from 'fs'
import {v4 as uuidv4} from 'uuid'
import {
  createBulkArtifacts,
  BulkArtifactKind,
  BulkArtifact,
  BulkArtifactMimeType,
  markBulkArtifactsUploaded
} from './api/vanguard'
import {mimeTypeFromExtension} from './utils'

type InputArtifact = {
  kind: BulkArtifactKind
  name: string
  path: string
}
type Artifact = InputArtifact & {
  mime_type: BulkArtifactMimeType
  external_id: string
}

async function run(): Promise<void> {
  try {
    const artifacts: InputArtifact[] = JSON.parse(core.getInput('artifacts'))
    const artifactsToUpload: Artifact[] = artifacts.map(artifact => ({
      ...artifact,
      mime_type: mimeTypeFromExtension(extname(artifact.path).toLowerCase()),
      external_id: uuidv4()
    }))
    const vanguardToken = core.getInput('vanguard-token')
    const vanguardBaseUrl = core.getInput('vanguard-base-url')

    const bulkArtifactsResult = await createBulkArtifacts(
      {
        account_name: github.context.repo.owner,
        artifacts: artifactsToUpload.map(artifact => ({
          kind: artifact.kind,
          name: artifact.name,
          mime_type: artifact.mime_type,
          external_id: artifact.external_id
        })),
        job_name: core.getInput('job-name') || github.context.job,
        job_matrix: JSON.parse(core.getInput('job-matrix')),
        repository_name: github.context.repo.repo,
        run_id: github.context.runId.toString()
      },
      {
        vanguardToken,
        vanguardBaseUrl
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

    // intentionally ignore any potential errors here- if it fails,
    // our server will eventually find out the files were uploaded
    await markBulkArtifactsUploaded(uploadedExternalIds, {
      vanguardToken,
      vanguardBaseUrl
    })

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

run()
