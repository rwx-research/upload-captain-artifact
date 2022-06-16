import * as core from '@actions/core'
import * as github from '@actions/github'
import {BulkArtifactKind, BulkArtifactMimeType} from './api/vanguard'

export type InputArtifact = {
  kind: BulkArtifactKind
  name: string
  path: string
}
export type Inputs = {
  accountName: string
  artifacts: InputArtifact[]
  jobMatrix: object | null
  jobName: string
  repositoryName: string
  runId: string
  vanguardBaseUrl: string
  vanguardToken: string
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

export function getInputs(): Inputs {
  return {
    accountName: github.context.repo.owner,
    artifacts: JSON.parse(core.getInput('artifacts')) as InputArtifact[],
    jobMatrix: JSON.parse(core.getInput('job-matrix')),
    jobName: core.getInput('job-name') || github.context.job,
    repositoryName: github.context.repo.repo,
    runId: github.context.runId.toString(),
    vanguardBaseUrl: core.getInput('vanguard-base-url'),
    vanguardToken: core.getInput('vanguard-token')
  }
}
