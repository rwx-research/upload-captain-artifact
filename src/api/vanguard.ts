import fetch from 'node-fetch'
import Result from '../result'

type Error = {error: string; message: string}
export type BulkArtifact = {external_id: string; upload_url: string}
export type BulkArtifactMimeType = 'application/json' | 'application/xml'
export type BulkArtifactKind = 'test_results'
type BulkArtifactsResult = Result<BulkArtifact[], Error[]>
type BulkArtifactsInput = {
  account_name: string
  artifacts: {
    kind: string
    name: string
    mime_type: BulkArtifactMimeType
    external_id: string
  }[]
  job_name: string
  job_matrix: object | null
  repository_name: string
  run_id: string
}
type VanguardConfig = {
  vanguardBaseUrl: string
  vanguardToken: string
}

const genericCreateBulkArtifactsError = [
  {
    error: 'unexpected_error',
    message: 'An unexpected error occurred while creating bulk artifacts'
  }
]

export async function createBulkArtifacts(
  input: BulkArtifactsInput,
  config: VanguardConfig
): Promise<BulkArtifactsResult> {
  const response = await fetch(
    `${config.vanguardBaseUrl}/api/organization/integrations/github/bulk_artifacts`,
    {
      body: JSON.stringify(input),
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.vanguardToken}`,
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

export async function markBulkArtifactsUploaded(
  externalIds: string[],
  config: VanguardConfig
): Promise<Result<null, Error[]>> {
  const response = await fetch(
    `${config.vanguardBaseUrl}/api/organization/integrations/github/bulk_artifacts/uploaded`,
    {
      body: JSON.stringify({external_ids: externalIds}),
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.vanguardToken}`,
        'Content-Type': 'application/json'
      }
    }
  )

  if (response.ok) {
    return {ok: true, value: null}
  } else {
    return {
      ok: false,
      error: [
        {
          error: 'unexpected_error',
          message:
            'An unexpected error occurred while marking bulk artifacts uploaded'
        }
      ]
    }
  }
}
