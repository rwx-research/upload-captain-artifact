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
  BulkArtifactStatus,
  createBulkTestResults,
  BulkTestResultsUploads,
  updateBulkTestResults,
  BulkTestResultsFiles,
  TestResultsUpload
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

    const bulkArtifactsResult = await createBulkTestResults(
      {
        provider: 'github',
        branch: inputs.branchName,
        commit_sha: inputs.commitSha,
        test_suite_identifier: artifacts[0].name,
        job_tags: {
          github_run_id: inputs.runId,
          github_run_attempt: inputs.runAttempt.toString(),
          github_repository_name: inputs.repositoryName,
          github_account_owner: inputs.accountName,
          github_job_matrix: inputs.jobMatrix,
          github_job_name: inputs.jobName
        },
        test_results_files: artifacts.map(artifact => ({
          external_identifier: artifact.external_id,
          format: artifact.parser,
          original_path: artifact.original_path
        }))
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

    const uploadedTestResultUploads = uploadResponses
      .filter(([, response]) => response.ok)
      .map(([testResultUpload]) => testResultUpload)

    const failedTestResultUploads = uploadResponses
      .filter(([, response]) => !response.ok)
      .map(([testResultUpload]) => testResultUpload)

    const testResultUploadsWithoutFiles = artifactsWithoutFiles.map(
      artifact =>
        (
          uploadResponses.find(([testResultUpload]) => {
            testResultUpload.external_identifier === artifact.external_id
          }) as [TestResultsUpload, Response]
        )[0]
    )

    // intentionally ignore any potential errors here- if it fails,
    // our server will eventually find out the files were uploaded
    await updateBulkTestResults(
      artifacts[0].name,
      [
        uploadedTestResultUploads.map(testResultsUpload => ({
          id: testResultsUpload.id,
          status: 'uploaded' as BulkArtifactStatus
        })),
        failedTestResultUploads.map(testResultsUpload => ({
          id: testResultsUpload.id,
          status: 'upload_failed' as BulkArtifactStatus
        })),
        testResultUploadsWithoutFiles.map(testResultsUpload => ({
          id: testResultsUpload.id,
          status: 'upload_skipped_file_missing' as BulkArtifactStatus
        }))
      ].flat(),
      {
        captainBaseUrl: inputs.captainBaseUrl,
        captainToken: inputs.captainToken
      }
    )

    if (failedTestResultUploads.length) {
      const failedArtifactNames = failedTestResultUploads
        .map(testResultUpload => {
          const artifact = artifacts.find(
            artifact =>
              artifact.external_id === testResultUpload.external_identifier
          ) as Artifact
          return artifact.name
        })
        .join(', ')
      throw new Error(
        `Some artifacts could not be uploaded:\n\n  Artifacts: ${failedArtifactNames}`
      )
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

function uploadEach(
  bulkArtifacts: TestResultsUpload[],
  artifactsWithFiles: Artifact[]
): Promise<[TestResultsUpload, Response]>[] {
  return artifactsWithFiles.map(async artifact => {
    const testResultUpload = bulkArtifacts.find(
      ba => ba.external_identifier === artifact.external_id
    )

    if (!testResultUpload) {
      throw new Error(
        'Unreachable (could not find bulk artifact with matching external ID)'
      )
    }

    const response = await fetch(testResultUpload.upload_url, {
      body: readFileSync(artifact.path),
      method: 'PUT'
    })

    return [testResultUpload, response] as [TestResultsUpload, Response]
  })
}
