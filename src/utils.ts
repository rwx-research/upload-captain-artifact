import * as core from '@actions/core'
import * as github from '@actions/github'
import {
  BulkArtifactKind,
  BulkArtifactMimeType,
  BulkArtifactParser
} from './api/captain'

export type InputArtifact = {
  kind: BulkArtifactKind
  name: string
  path: string
  parser?: BulkArtifactParser
}
export type IfFilesNotFound = 'ignore' | 'warn' | 'error'
export type Inputs = {
  accountName: string
  artifacts: InputArtifact[]
  ifFilesNotFound: IfFilesNotFound
  jobMatrix: object | null
  jobName: string
  repositoryName: string
  runId: string
  runAttempt: number
  captainBaseUrl: string
  captainToken: string
}

export function mimeTypeFromExtension(extension: string): BulkArtifactMimeType {
  const lowerCaseExtension = extension.toLowerCase()

  if (lowerCaseExtension.toLowerCase() === '.json') {
    return 'application/json'
  } else if (lowerCaseExtension === '.xml') {
    return 'application/xml'
  }

  throw new Error('Only .json and .xml files are permitted.')
}

function parseIfFilesNotFound(input: string): IfFilesNotFound {
  if (input === 'ignore' || input === 'warn' || input === 'error') {
    return input
  } else {
    throw new Error(
      `Unexpected value ${input} for 'if-files-not-found'. Acceptable values are 'ignore', 'warn', and 'error'`
    )
  }
}

function runAttempt(): number {
  const githubRunAttempt = process.env.GITHUB_RUN_ATTEMPT

  if (!githubRunAttempt) {
    throw new Error('process.env.GITHUB_RUN_ATTEMPT was undefined')
  }

  return parseInt(githubRunAttempt)
}

export type Valid = Inputs
export type Invalid = {errors: string[]}
export type ValidatedInputs = Valid | Invalid

export function getInputs(): ValidatedInputs {
  const matrix = core.getInput('job-matrix')
  const errors = []
  let artifacts: InputArtifact[]

  try {
    artifacts = JSON.parse(core.getInput('artifacts')) as InputArtifact[]
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
    errors.push("`captain_token` field can't be empty.")
  }

  if (errors.length !== 0) {
    return {errors}
  } else {
    return {
      accountName: github.context.repo.owner,
      ifFilesNotFound: parseIfFilesNotFound(
        core.getInput('if-files-not-found')
      ),
      jobMatrix: matrix ? JSON.parse(matrix) : null,
      jobName: core.getInput('job-name') || github.context.job,
      repositoryName: github.context.repo.repo,
      runId: github.context.runId.toString(),
      runAttempt: runAttempt(),
      captainBaseUrl: core.getInput('captain-base-url'),
      artifacts,
      captainToken
    }
  }
}
