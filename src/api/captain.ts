import fetch from 'node-fetch'
import Result from '../result'

type Error = {error: string; message: string}
export type BulkArtifactStatus =
  | 'uploaded'
  | 'upload_skipped_file_missing'
  | 'upload_failed'
export type BulkStatus = {external_id: string; status: BulkArtifactStatus}
export type BulkArtifact = {external_id: string; upload_url: string}
export type BulkArtifactMimeType = 'application/json' | 'application/xml'
export type BulkArtifactParser =
  | 'cypress_junit_xml'
  | 'jest_json'
  | 'junit_xml'
  | 'rspec_json'
  | 'xunit_dot_net_xml'
export type BulkArtifactKind = 'test_results'
type BulkArtifactsResult = Result<BulkArtifact[], Error[]>
type BulkArtifactsInput = {
  account_name: string
  artifacts: {
    kind: string
    name: string
    parser?: BulkArtifactParser
    mime_type: BulkArtifactMimeType
    external_id: string
    original_path: string
  }[]
  job_name: string
  job_matrix: object | null
  repository_name: string
  run_attempt: number
  run_id: string
}
export type TestResultsUpload = {
  id: string
  external_identifier: string
  upload_url: string
}
export type BulkTestResultsFiles = {id: string; upload_status: BulkArtifactStatus}
export type BulkTestResultsUploads = Result<TestResultsUpload[], Error[]>
type BulkTestResultsCreate = {
  provider: string
  branch: string
  commit_sha: string
  test_suite_identifier: string
  job_tags: {
    github_run_id: string
    github_run_attempt: string
    github_repository_name: string
    github_account_owner: string
    github_job_matrix: object | null
    github_job_name: string
  }
  test_results_files: {
    external_identifier: string
    format?: BulkArtifactParser
    original_path: string
  }[]
}
type CaptainConfig = {
  captainBaseUrl: string
  captainToken: string
}

const genericCreateBulkArtifactsError = [
  {
    error: 'unexpected_error',
    message: 'An unexpected error occurred while creating bulk artifacts'
  }
]

const genericUpdateBulkArtifactsStatusError = [
  {
    error: 'unexpected_error',
    message: 'An unexpected error occurred while updating bulk artifacts status'
  }
]

export async function createBulkArtifacts(
  input: BulkArtifactsInput,
  config: CaptainConfig
): Promise<BulkArtifactsResult> {
  const response = await fetch(
    `${config.captainBaseUrl}/api/organization/integrations/github/bulk_artifacts`,
    {
      body: JSON.stringify(input),
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.captainToken}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (response.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {ok: true, value: ((await response.json()) as any).bulk_artifacts}
  } else {
    try {
      return {
        ok: false,
        error:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((await response.json()) as any).errors ||
          genericCreateBulkArtifactsError
      }
    } catch {
      return {
        ok: false,
        error: genericCreateBulkArtifactsError
      }
    }
  }
}

export async function updateBulkArtifactsStatus(
  bulkStatuses: BulkStatus[],
  config: CaptainConfig
): Promise<Result<null, Error[]>> {
  const response = await fetch(
    `${config.captainBaseUrl}/api/organization/integrations/github/bulk_artifacts/status`,
    {
      body: JSON.stringify({artifacts: bulkStatuses}),
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.captainToken}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (response.ok) {
    return {ok: true, value: null}
  } else {
    try {
      return {
        ok: false,
        error:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((await response.json()) as any).errors ||
          genericUpdateBulkArtifactsStatusError
      }
    } catch {
      return {
        ok: false,
        error: genericUpdateBulkArtifactsStatusError
      }
    }
  }
}

export async function createBulkTestResults(
  input: BulkTestResultsCreate,
  config: CaptainConfig
): Promise<BulkTestResultsUploads> {
  const response = await fetch(
    `${config.captainBaseUrl}/api/test_suites/bulk_test_results`,
    {
      body: JSON.stringify(input),
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.captainToken}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (response.ok) {
    return {
      ok: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: ((await response.json()) as any).test_results_uploads
    }
  } else {
    try {
      return {
        ok: false,
        error:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((await response.json()) as any).errors ||
          genericCreateBulkArtifactsError
      }
    } catch {
      return {
        ok: false,
        error: genericCreateBulkArtifactsError
      }
    }
  }
}

export async function updateBulkTestResults(
  testSuite: string,
  bulkStatuses: BulkTestResultsFiles[],
  config: CaptainConfig
): Promise<Result<null, Error[]>> {
  const response = await fetch(
    `${config.captainBaseUrl}/api/test_suites/bulk_test_results`,
    {
      body: JSON.stringify({test_suite_identifier: testSuite, test_results_files: bulkStatuses}),
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.captainToken}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (response.ok) {
    return {ok: true, value: null}
  } else {
    try {
      return {
        ok: false,
        error:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((await response.json()) as any).errors ||
          genericUpdateBulkArtifactsStatusError
      }
    } catch {
      return {
        ok: false,
        error: genericUpdateBulkArtifactsStatusError
      }
    }
  }
}
