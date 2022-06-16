import {
  BulkArtifactKind,
  BulkArtifactMimeType,
  createBulkArtifacts,
  markBulkArtifactsUploaded
} from '../../src/api/vanguard'
import fetchMock from '../test-utils/fetch-mock'

describe('Vanguard API', () => {
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
      repository_name: 'upload-vanguard-artifact',
      run_id: 'run-123'
    }

    it('returns the artifacts when the request is successful', async () => {
      fetchMock.postOnce(
        {
          body: input,
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://vanguard.example.com/api/organization/integrations/github/bulk_artifacts'
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
        vanguardBaseUrl: 'https://vanguard.example.com',
        vanguardToken: 'fake-token'
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
          url: 'https://vanguard.example.com/api/organization/integrations/github/bulk_artifacts'
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
        vanguardBaseUrl: 'https://vanguard.example.com',
        vanguardToken: 'fake-token'
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
          url: 'https://vanguard.example.com/api/organization/integrations/github/bulk_artifacts'
        },
        {
          body: {},
          status: 422
        }
      )

      const result = await createBulkArtifacts(input, {
        vanguardBaseUrl: 'https://vanguard.example.com',
        vanguardToken: 'fake-token'
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
          url: 'https://vanguard.example.com/api/organization/integrations/github/bulk_artifacts'
        },
        {
          body: 'not json',
          status: 500
        }
      )

      const result = await createBulkArtifacts(input, {
        vanguardBaseUrl: 'https://vanguard.example.com',
        vanguardToken: 'fake-token'
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

  describe('markBulkArtifactsUploaded', () => {
    const externalIds = ['id-one', 'id-two']

    it('returns ok when the request is successful', async () => {
      fetchMock.putOnce(
        {
          body: {external_ids: externalIds},
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://vanguard.example.com/api/organization/integrations/github/bulk_artifacts/uploaded'
        },
        {
          status: 204
        }
      )

      const result = await markBulkArtifactsUploaded(externalIds, {
        vanguardBaseUrl: 'https://vanguard.example.com',
        vanguardToken: 'fake-token'
      })

      expect(result).toEqual({ok: true, value: null})
    })

    it('returns a generic error when the request is not successful', async () => {
      fetchMock.putOnce(
        {
          body: {external_ids: externalIds},
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://vanguard.example.com/api/organization/integrations/github/bulk_artifacts/uploaded'
        },
        {
          status: 422
        }
      )

      const result = await markBulkArtifactsUploaded(externalIds, {
        vanguardBaseUrl: 'https://vanguard.example.com',
        vanguardToken: 'fake-token'
      })

      expect(result).toEqual({
        ok: false,
        error: [
          {
            error: 'unexpected_error',
            message:
              'An unexpected error occurred while marking bulk artifacts uploaded'
          }
        ]
      })
    })
  })
})
