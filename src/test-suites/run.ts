import * as core from '@actions/core'
import {getInputs, Invalid, TestResult, Valid} from './utils'
import * as exec from '@actions/exec'

export default async function run(): Promise<void> {
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
    const args = [
      '--suite-id',
      testSuiteIdentifier,
      '--github-job-name',
      inputs.jobName
    ]

    if (inputs.jobMatrix) {
      args.push('--github-job-matrix', JSON.stringify(inputs.jobMatrix))
    }

    args.push(...testResults.map(({originalPath}) => originalPath))

    // TODO(kkt): fail-on-upload-error / ifFilesNotFound
    await exec.exec('captain upload results', args, {
      env: {
        ...process.env,
        RWX_ACCESS_TOKEN: inputs.captainToken,
        CAPTAIN_HOST: new URL(inputs.captainBaseUrl).host
      }
    })
  }
}
