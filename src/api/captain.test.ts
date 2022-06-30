import {
  BulkArtifactKind,
  BulkArtifactMimeType,
  BulkStatus,
  createBulkArtifacts,
  updateBulkArtifactsStatus
} from './captain'
import fetchMock from '../test-utils/fetch-mock'

describe('Captain API', () => {
  describe('createBulkArtifacts', () => {
    const input = {
      account_name: 'rwx-research',
      artifacts: [
        {
          kind: 'test_results' as BulkArtifactKind,
          name: 'Jest JUnit',
          mime_type: 'application/json' as BulkArtifactMimeType,
          external_id: 'some-uuid'
        },
        {
          kind: 'test_results' as BulkArtifactKind,
          name: 'Jest Something Else',
          mime_type: 'application/xml' as BulkArtifactMimeType,
          external_id: 'some-other-uuid'
        }
      ],
      job_name: 'test-and-lint',
      job_matrix: null,
      repository_name: 'upload-captain-artifact',
      run_id: 'run-123'
    }

    it('returns the artifacts when the request is successful', async () => {
      fetchMock.postOnce(
        {
          body: input,
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
        },
        {
          body: {
            bulk_artifacts: [
              {external_id: 'some-uuid', upload_url: 'https://some-s3-url'},
              {
                external_id: 'some-other-uuid',
                upload_url: 'https://some-s3-url'
              }
            ]
          },
          status: 201
        }
      )

      const result = await createBulkArtifacts(input, {
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      })

      expect(result).toEqual({
        ok: true,
        value: [
          {external_id: 'some-uuid', upload_url: 'https://some-s3-url'},
          {external_id: 'some-other-uuid', upload_url: 'https://some-s3-url'}
        ]
      })
    })

    it('returns the errors when the request is not successful and has errors', async () => {
      fetchMock.postOnce(
        {
          body: input,
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
        },
        {
          body: {
            errors: [
              {error: 'err-one', message: 'Error one'},
              {error: 'err-two', message: 'Error two'}
            ]
          },
          status: 422
        }
      )

      const result = await createBulkArtifacts(input, {
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      })

      expect(result).toEqual({
        ok: false,
        error: [
          {error: 'err-one', message: 'Error one'},
          {error: 'err-two', message: 'Error two'}
        ]
      })
    })

    it('returns a generic error when the request is not successful and has no errors', async () => {
      fetchMock.postOnce(
        {
          body: input,
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
        },
        {
          body: {},
          status: 422
        }
      )

      const result = await createBulkArtifacts(input, {
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      })

      expect(result).toEqual({
        ok: false,
        error: [
          {
            error: 'unexpected_error',
            message:
              'An unexpected error occurred while creating bulk artifacts'
          }
        ]
      })
    })

    it('returns a generic error when the request is not successful and has issues parsing json', async () => {
      fetchMock.postOnce(
        {
          body: input,
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
        },
        {
          body: 'not json',
          status: 500
        }
      )

      const result = await createBulkArtifacts(input, {
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      })

      expect(result).toEqual({
        ok: false,
        error: [
          {
            error: 'unexpected_error',
            message:
              'An unexpected error occurred while creating bulk artifacts'
          }
        ]
      })
    })
  })

  describe('updateBulkArtifactsStatus', () => {
    const input: BulkStatus[] = [
      {
        external_id: 'some-uuid',
        status: 'uploaded'
      },
      {
        external_id: 'some-other-uuid',
        status: 'upload_failed'
      }
    ]

    it('returns the artifacts when the request is successful', async () => {
      fetchMock.putOnce(
        {
          body: {artifacts: input},
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts/status'
        },
        {status: 204}
      )

      const result = await updateBulkArtifactsStatus(input, {
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      })

      expect(result).toEqual({ok: true, value: null})
    })

    it('returns the errors when the request is not successful and has errors', async () => {
      fetchMock.putOnce(
        {
          body: {artifacts: input},
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts/status'
        },
        {
          body: {
            errors: [
              {error: 'err-one', message: 'Error one'},
              {error: 'err-two', message: 'Error two'}
            ]
          },
          status: 422
        }
      )

      const result = await updateBulkArtifactsStatus(input, {
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      })

      expect(result).toEqual({
        ok: false,
        error: [
          {error: 'err-one', message: 'Error one'},
          {error: 'err-two', message: 'Error two'}
        ]
      })
    })

    it('returns a generic error when the request is not successful and has no errors', async () => {
      fetchMock.putOnce(
        {
          body: {artifacts: input},
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts/status'
        },
        {
          body: {},
          status: 422
        }
      )

      const result = await updateBulkArtifactsStatus(input, {
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      })

      expect(result).toEqual({
        ok: false,
        error: [
          {
            error: 'unexpected_error',
            message:
              'An unexpected error occurred while updating bulk artifacts status'
          }
        ]
      })
    })

    it('returns a generic error when the request is not successful and has issues parsing json', async () => {
      fetchMock.putOnce(
        {
          body: {artifacts: input},
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts/status'
        },
        {
          body: 'not json',
          status: 500
        }
      )

      const result = await updateBulkArtifactsStatus(input, {
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      })

      expect(result).toEqual({
        ok: false,
        error: [
          {
            error: 'unexpected_error',
            message:
              'An unexpected error occurred while updating bulk artifacts status'
          }
        ]
      })
    })
  })
})
