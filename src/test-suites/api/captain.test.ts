import {
  createBulkTestResults,
  updateBulkTestResults,
  CreateBulkTestResultsInput,
  UpdateBulkTestResultsInput
} from './captain'
import fetchMock from '../../test-utils/fetch-mock'

describe('Test Suites', () => {
  describe('Captain API', () => {
    describe('createBulkTestResults', () => {
      const input: CreateBulkTestResultsInput = {
        attempted_by: 'someone',
        branch: 'some-branch',
        commit_message: 'some-message',
        commit_sha: 'some-sha',
        job_tags: {
          github_account_owner: 'some-account-owner',
          github_repository_name: 'some-repository-name',
          github_run_id: 'some-run-id',
          github_run_attempt: 'some-run-attempt',
          github_job_matrix: {some: 'value', other: 'values'},
          github_job_name: 'some-job-name'
        },
        test_results_files: [
          {
            external_identifier: 'some-uuid',
            format: 'some-json-format',
            original_path: 'amongst/the/greatest/test-artifacts.json'
          },
          {
            external_identifier: 'some-other-uuid',
            format: 'some-xml-format',
            original_path: 'an/inferior/test-artifacts.xml'
          }
        ],
        test_suite_identifier: 'some-test-suite-identifier'
      }

      it('returns the test result files when the request is successful', async () => {
        fetchMock.postOnce(
          {
            body: {...input, provider: 'github'},
            headers: {Authorization: 'Bearer fake-token'},
            url: 'https://captain.example.com/api/test_suites/bulk_test_results'
          },
          {
            body: {
              test_results_uploads: [
                {
                  id: 'some-id',
                  external_identifier: 'some-uuid',
                  upload_url: 'https://some-s3-url'
                },
                {
                  id: 'some-other-id',
                  external_identifier: 'some-other-uuid',
                  upload_url: 'https://some-s3-url'
                }
              ]
            },
            status: 201
          }
        )

        const result = await createBulkTestResults(input, {
          captainBaseUrl: 'https://captain.example.com',
          captainToken: 'fake-token'
        })

        expect(result).toEqual({
          ok: true,
          value: [
            {
              id: 'some-id',
              external_identifier: 'some-uuid',
              upload_url: 'https://some-s3-url'
            },
            {
              id: 'some-other-id',
              external_identifier: 'some-other-uuid',
              upload_url: 'https://some-s3-url'
            }
          ]
        })
      })

      it('returns a generic error when the request is not successful', async () => {
        fetchMock.postOnce(
          {
            body: {...input, provider: 'github'},
            headers: {Authorization: 'Bearer fake-token'},
            url: 'https://captain.example.com/api/test_suites/bulk_test_results'
          },
          {
            body: {},
            status: 422
          }
        )

        const result = await createBulkTestResults(input, {
          captainBaseUrl: 'https://captain.example.com',
          captainToken: 'fake-token'
        })

        expect(result).toEqual({
          ok: false,
          error: [
            {
              error: 'unexpected_error',
              message:
                'An unexpected error occurred while creating bulk test results'
            }
          ]
        })
      })
    })

    describe('updateBulkTestResults', () => {
      const input: UpdateBulkTestResultsInput = {
        test_suite_identifier: 'some-test-suite-identifier',
        test_results_files: [
          {id: 'some-id', upload_status: 'uploaded'},
          {id: 'some-other-id', upload_status: 'upload_skipped_file_missing'}
        ]
      }

      it('returns nothing when the request is successful', async () => {
        fetchMock.putOnce(
          {
            body: input,
            headers: {Authorization: 'Bearer fake-token'},
            url: 'https://captain.example.com/api/test_suites/bulk_test_results'
          },
          {status: 204}
        )

        const result = await updateBulkTestResults(input, {
          captainBaseUrl: 'https://captain.example.com',
          captainToken: 'fake-token'
        })

        expect(result).toEqual({ok: true, value: undefined})
      })

      it('returns the errors when the request is not successful and has errors', async () => {
        fetchMock.putOnce(
          {
            body: input,
            headers: {Authorization: 'Bearer fake-token'},
            url: 'https://captain.example.com/api/test_suites/bulk_test_results'
          },
          {
            body: [
              {error: 'err-one', message: 'Error one'},
              {error: 'err-two', message: 'Error two'}
            ],
            status: 422
          }
        )

        const result = await updateBulkTestResults(input, {
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
            body: input,
            headers: {Authorization: 'Bearer fake-token'},
            url: 'https://captain.example.com/api/test_suites/bulk_test_results'
          },
          {
            body: [],
            status: 422
          }
        )

        const result = await updateBulkTestResults(input, {
          captainBaseUrl: 'https://captain.example.com',
          captainToken: 'fake-token'
        })

        expect(result).toEqual({
          ok: false,
          error: [
            {
              error: 'unexpected_error',
              message:
                'An unexpected error occurred while updating bulk test results'
            }
          ]
        })
      })

      it('returns a generic error when the request is not successful and has issues parsing json', async () => {
        fetchMock.putOnce(
          {
            body: input,
            headers: {Authorization: 'Bearer fake-token'},
            url: 'https://captain.example.com/api/test_suites/bulk_test_results'
          },
          {
            body: 'not json',
            status: 500
          }
        )

        const result = await updateBulkTestResults(input, {
          captainBaseUrl: 'https://captain.example.com',
          captainToken: 'fake-token'
        })

        expect(result).toEqual({
          ok: false,
          error: [
            {
              error: 'unexpected_error',
              message:
                'An unexpected error occurred while updating bulk test results'
            }
          ]
        })
      })
    })
  })
})
