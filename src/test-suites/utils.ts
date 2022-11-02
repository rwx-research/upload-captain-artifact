import * as core from '@actions/core'
import {GitHubJobTags} from './api/captain'
import {existsSync, readFileSync} from 'fs'

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

export type IfFilesNotFound = 'ignore' | 'warn' | 'error'

export type Inputs = {
  accountOwner: string
  attemptedBy: string
  branch: string
  captainBaseUrl: string
  captainToken: string
  commitMessage?: string
  commitSha: string
  ifFilesNotFound: IfFilesNotFound
  jobMatrix?: GitHubJobTags['github_job_matrix']
  jobName: string
  repositoryName: string
  runAttempt: string
  runId: string
  testResults: TestResult[]
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

function expectEnvironment(variable: string): string {
  const value = process.env[variable]

  if (value) {
    return value
  }

  throw new Error(`process.env.${variable} was not defined`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function eventPayload(): any {
  if (
    process.env.GITHUB_EVENT_PATH &&
    existsSync(process.env.GITHUB_EVENT_PATH)
  ) {
    return JSON.parse(
      readFileSync(process.env.GITHUB_EVENT_PATH, {encoding: 'utf8'})
    )
  }
}

function attemptedBy(): string {
  const triggeringActor = process.env.GITHUB_TRIGGERING_ACTOR
  const actor = process.env.GITHUB_ACTOR

  if (triggeringActor) {
    return triggeringActor
  }
  if (actor) {
    return actor
  }

  throw new Error(
    'process.env.GITHUB_TRIGGERING_ACTOR and process.env.GITHUB_ACTOR was undefined'
  )
}

function branch(): string {
  const pullRequestBranch = eventPayload()?.pull_request?.head?.ref
  if (pullRequestBranch) {
    return pullRequestBranch
  }

  return expectEnvironment('GITHUB_REF_NAME')
}

function commitMessage(): string | undefined {
  const pushCommitMessage = eventPayload()?.head_commit?.message
  if (pushCommitMessage) {
    return pushCommitMessage
  }

  return undefined
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
      accountOwner: expectEnvironment('GITHUB_REPOSITORY').split('/')[0],
      attemptedBy: attemptedBy(),
      branch: branch(),
      captainBaseUrl: core.getInput('captain-base-url'),
      captainToken,
      commitMessage: commitMessage(),
      commitSha: expectEnvironment('GITHUB_SHA'),
      ifFilesNotFound: parseIfFilesNotFound(
        core.getInput('if-files-not-found')
      ),
      jobMatrix: matrix ? JSON.parse(matrix) : undefined,
      jobName: core.getInput('job-name') || expectEnvironment('GITHUB_JOB'),
      repositoryName: expectEnvironment('GITHUB_REPOSITORY').split('/')[1],
      runAttempt: expectEnvironment('GITHUB_RUN_ATTEMPT'),
      runId: expectEnvironment('GITHUB_RUN_ID'),
      testResults: artifacts.map(({name, path, parser}) => ({
        format: parser,
        testSuiteIdentifier: name,
        originalPath: path
      }))
    }
  }
}
