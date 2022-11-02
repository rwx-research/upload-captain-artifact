import * as core from '@actions/core'
import fetch, {Response} from 'node-fetch'
import {existsSync, readFileSync} from 'fs'
import * as fastGlob from 'fast-glob'
import {v4 as uuidv4} from 'uuid'
import {
  createBulkTestResults,
  UploadStatus,
  TestResultsUpload,
  updateBulkTestResults
} from './api/captain'
import {getInputs, Invalid, TestResult, Valid} from './utils'

type ExpandedTestResult = TestResult & {
  expandedPath: string
  externalIdentifier: string
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
    const testResultsByTestSuiteIdentifier: {[key: string]: TestResult[]} =
      inputs.testResults.reduce(
        (byIdentifier, testResult) => ({
          ...byIdentifier,
          [testResult.testSuiteIdentifier]: [
            ...(byIdentifier[testResult.testSuiteIdentifier] || []),
            testResult
          ]
        }),
        {} as {[key: string]: TestResult[]}
      )

    for (const [testSuiteIdentifier, testResults] of Object.entries(
      testResultsByTestSuiteIdentifier
    )) {
      const expandedTestResults: ExpandedTestResult[] = testResults.flatMap(
        testResult => {
          const expandedGlob = fastGlob.sync(testResult.originalPath)
          if (expandedGlob.length > 0) {
            return expandedGlob.map(path => ({
              ...testResult,
              expandedPath: path,
              externalIdentifier: uuidv4()
            }))
          } else {
            return [
              {
                ...testResult,
                expandedPath: testResult.originalPath,
                externalIdentifier: uuidv4()
              }
            ]
          }
        }
      )

      const [testResultsWithFiles, testResultsWithoutFiles] =
        expandedTestResults.reduce<
          [ExpandedTestResult[], ExpandedTestResult[]]
        >(
          ([withFiles, withoutFiles], artifact) => {
            if (existsSync(artifact.expandedPath)) {
              return [[...withFiles, artifact], withoutFiles]
            } else {
              return [withFiles, [...withoutFiles, artifact]]
            }
          },
          [[], []]
        )

      if (inputs.ifFilesNotFound === 'warn') {
        for (const artifact of testResultsWithoutFiles) {
          core.warning(
            `Test results file not found at '${artifact.expandedPath}' for test suite '${artifact.testSuiteIdentifier}'`
          )
        }
      } else if (inputs.ifFilesNotFound === 'error') {
        for (const artifact of testResultsWithoutFiles) {
          core.error(
            `Test results file not found at '${artifact.expandedPath}' for test suite '${artifact.testSuiteIdentifier}'`
          )
        }
        if (testResultsWithoutFiles.length) {
          core.setFailed('Test result(s) are missing file(s)')
        }
      }

      const bulkTestResultsResult = await createBulkTestResults(
        {
          attempted_by: inputs.attemptedBy,
          branch: inputs.branch,
          commit_message: inputs.commitMessage,
          commit_sha: inputs.commitSha,
          job_tags: {
            github_account_owner: inputs.accountOwner,
            github_repository_name: inputs.repositoryName,
            github_run_id: inputs.runId,
            github_run_attempt: inputs.runAttempt,
            github_job_matrix: inputs.jobMatrix,
            github_job_name: inputs.jobName
          },
          test_results_files: expandedTestResults.map(testResult => ({
            external_identifier: testResult.externalIdentifier,
            format: testResult.format,
            original_path: testResult.originalPath
          })),
          test_suite_identifier: testSuiteIdentifier
        },
        {
          captainBaseUrl: inputs.captainBaseUrl,
          captainToken: inputs.captainToken
        }
      )

      if (!bulkTestResultsResult.ok) {
        throw new Error(
          `Bulk test results POST failed:\n\n  - Errors: ${bulkTestResultsResult.error
            .map(error => error.message)
            .join(', ')}`
        )
      }

      const uploadResponses = await Promise.all(
        uploadEach(bulkTestResultsResult.value, testResultsWithFiles)
      )

      const uploaded = uploadResponses.filter(
        ([, , response]) => response && response.ok
      )
      const failed = uploadResponses.filter(
        ([, , response]) => response && !response.ok
      )
      const missing = uploadResponses.filter(([, , response]) => !response)

      // intentionally ignore any potential errors here- if it fails,
      // our server will eventually find out the files were uploaded
      await updateBulkTestResults(
        {
          test_suite_identifier: testSuiteIdentifier,
          test_results_files: [
            uploaded.map(([testResultsUpload]) => ({
              id: testResultsUpload.id,
              upload_status: 'uploaded' as UploadStatus
            })),
            failed.map(([testResultsUpload]) => ({
              id: testResultsUpload.id,
              upload_status: 'upload_failed' as UploadStatus
            })),
            missing.map(([testResultsUpload]) => ({
              id: testResultsUpload.id,
              upload_status: 'upload_skipped_file_missing' as UploadStatus
            }))
          ].flat()
        },
        {
          captainBaseUrl: inputs.captainBaseUrl,
          captainToken: inputs.captainToken
        }
      )

      if (failed.length) {
        throw new Error(
          `Some test results could not be uploaded:\n\n  Test results:\n${failed
            .map(
              ([, testResult]) =>
                `  - Suite: ${testResult?.testSuiteIdentifier}, Path: ${testResult?.originalPath}`
            )
            .join('\n')}`
        )
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

function uploadEach(
  testResultsUploads: TestResultsUpload[],
  testResultsWithFiles: ExpandedTestResult[]
): Promise<
  | [TestResultsUpload, ExpandedTestResult, Response]
  | [TestResultsUpload, undefined, undefined]
>[] {
  return testResultsUploads.map(async testResultsUpload => {
    const testResult = testResultsWithFiles.find(
      r => testResultsUpload.external_identifier === r.externalIdentifier
    )

    if (!testResult) {
      return [testResultsUpload, undefined, undefined] as [
        TestResultsUpload,
        undefined,
        undefined
      ]
    }

    const response = await fetch(testResultsUpload.upload_url, {
      body: readFileSync(testResult.expandedPath),
      method: 'PUT'
    })

    return [testResultsUpload, testResult, response] as [
      TestResultsUpload,
      ExpandedTestResult,
      Response
    ]
  })
}
