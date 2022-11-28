import * as core from '@actions/core'

export type ArtifactInput = {
  kind: string
  name: string
  path: string
  parser: string
}

export type TestResult = {
  testSuiteIdentifier: string
  originalPath: string
  format: string
}

export type Inputs = {
  captainBaseUrl: string
  captainToken: string
  jobMatrix?: {
    [key: string]: string | number | boolean | null | undefined
  }
  jobName: string
  testResults: TestResult[]
}

function expectEnvironment(variable: string): string {
  const value = process.env[variable]

  if (value) {
    return value
  }

  throw new Error(`process.env.${variable} was not defined`)
}

export type Valid = Inputs
export type Invalid = {errors: string[]}
export type ValidatedInputs = Valid | Invalid

export function getInputs(): ValidatedInputs {
  const matrix = core.getInput('job-matrix')
  const errors = []
  let artifacts: ArtifactInput[]

  try {
    artifacts = JSON.parse(core.getInput('artifacts')) as ArtifactInput[]
    if (artifacts.length === 0) {
      errors.push(
        'You must include at least one artifact in the `artifacts` field.'
      )
    }
  } catch (e) {
    errors.push("`artifacts` field isn't valid JSON.")
    artifacts = []
  }

  const captainToken = core.getInput('captain-token')

  if (!captainToken || captainToken.trim().length === 0) {
    errors.push("`captain-token` field can't be empty.")
  }

  if (errors.length !== 0) {
    return {errors}
  } else {
    return {
      captainBaseUrl: core.getInput('captain-base-url'),
      captainToken,
      jobMatrix: matrix ? JSON.parse(matrix) : undefined,
      jobName: core.getInput('job-name') || expectEnvironment('GITHUB_JOB'),
      testResults: artifacts.map(({name, path, parser}) => ({
        format: parser,
        testSuiteIdentifier: name,
        originalPath: path
      }))
    }
  }
}
