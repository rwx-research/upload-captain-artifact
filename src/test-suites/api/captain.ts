import fetch from 'node-fetch'
import Result from '../../result'

type CaptainConfig = {
  captainBaseUrl: string
  captainToken: string
}

export type GitHubJobTags = {
  github_account_owner: string
  github_repository_name: string
  github_run_id: string
  github_run_attempt: string
  github_job_matrix?: {
    [key: string]: string | number | boolean | null | undefined
  }
  github_job_name: string
}

export type TestResultsFile = {
  external_identifier: string
  format: string
  original_path: string
}

export type CreateBulkTestResultsInput = {
  attempted_by: string
  branch: string
  commit_message?: string
  commit_sha: string
  job_tags: GitHubJobTags
  test_results_files: TestResultsFile[]
  test_suite_identifier: string
}

export type UploadStatus =
  | 'uploaded'
  | 'upload_skipped_file_missing'
  | 'upload_failed'

export type UpdateBulkTestResultsInput = {
  test_suite_identifier: string
  test_results_files: {id: string; upload_status: UploadStatus}[]
}

export type TestResultsUpload = {
  id: string
  external_identifier: string
  upload_url: string
}

export type Error = {error: string; message: string}
export type TestResultsUploads = TestResultsUpload[]

const genericCreateError = [
  {
    error: 'unexpected_error',
    message: 'An unexpected error occurred while creating bulk test results'
  }
]

const genericUpdateError = [
  {
    error: 'unexpected_error',
    message: 'An unexpected error occurred while updating bulk test results'
  }
]

export async function createBulkTestResults(
  input: CreateBulkTestResultsInput,
  config: CaptainConfig
): Promise<Result<TestResultsUploads, Error[]>> {
  const response = await fetch(
    `${config.captainBaseUrl}/api/test_suites/bulk_test_results`,
    {
      body: JSON.stringify({
        ...input,
        provider: 'github'
      }),
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
    return {
      ok: false,
      error: genericCreateError
    }
  }
}

export async function updateBulkTestResults(
  input: UpdateBulkTestResultsInput,
  config: CaptainConfig
): Promise<Result<undefined, Error[]>> {
  const response = await fetch(
    `${config.captainBaseUrl}/api/test_suites/bulk_test_results`,
    {
      body: JSON.stringify(input),
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.captainToken}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (response.ok) {
    return {ok: true, value: undefined}
  } else {
    try {
      const errors = (await response.json()) as Error[]
      return {
        ok: false,
        error: errors.length ? errors : genericUpdateError
      }
    } catch {
      return {
        ok: false,
        error: genericUpdateError
      }
    }
  }
}
