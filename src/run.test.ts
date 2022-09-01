import run from './run'
import fetchMock from './test-utils/fetch-mock'
import {getInputs, Inputs} from './utils'
import {v4} from 'uuid'
import {readFileSync} from 'fs'
import * as core from '@actions/core'

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  getInputs: jest.fn()
}))
jest.mock('uuid')
jest.mock('@actions/core')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUuid = v4 as unknown as jest.Mock<any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetInputs = getInputs as unknown as jest.Mock<any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSetFailed = core.setFailed as unknown as jest.Mock<any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockWarning = core.warning as unknown as jest.Mock<any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockError = core.error as unknown as jest.Mock<any>

describe('run', () => {
  it('does not mark the run as a failure when everything works', async () => {
    const inputs: Inputs = {
      accountName: 'rwx-research',
      artifacts: [
        {
          kind: 'test_results',
          name: 'artifact-json',
          path: './fixtures/json-artifact.json',
          parser: 'rspec_json'
        },
        {
          kind: 'test_results',
          name: 'artifact-xml',
          path: './fixtures/xml-artifact.xml'
        }
      ],
      ifFilesNotFound: 'warn',
      jobMatrix: null,
      jobName: 'some-job-name',
      repositoryName: 'upload-captain-artifact',
      runId: '1234',
      captainBaseUrl: 'https://captain.example.com',
      captainToken: 'fake-token'
    }
    mockGetInputs.mockReturnValueOnce(inputs)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    fetchMock.postOnce(
      {
        body: {
          account_name: 'rwx-research',
          artifacts: [
            {
              kind: 'test_results',
              name: 'artifact-json',
              parser: 'rspec_json',
              mime_type: 'application/json',
              external_id: 'uuid-one'
            },
            {
              kind: 'test_results',
              name: 'artifact-xml',
              mime_type: 'application/xml',
              external_id: 'uuid-two'
            }
          ],
          job_name: 'some-job-name',
          job_matrix: null,
          repository_name: 'upload-captain-artifact',
          run_id: '1234'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
      },
      {
        body: {
          bulk_artifacts: [
            {external_id: 'uuid-one', upload_url: 'https://some-s3-url.one'},
            {
              external_id: 'uuid-two',
              upload_url: 'https://some-s3-url.two'
            }
          ]
        },
        status: 201
      }
    )

    fetchMock.putOnce('https://some-s3-url.one', {status: 200})
    fetchMock.putOnce('https://some-s3-url.two', {status: 200})

    fetchMock.putOnce(
      {
        body: {
          artifacts: [
            {external_id: 'uuid-one', status: 'uploaded'},
            {external_id: 'uuid-two', status: 'uploaded'}
          ]
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts/status'
      },
      {
        status: 204
      }
    )

    await run()

    expect(fetchMock.lastCall('https://some-s3-url.one')?.[1]?.body).toEqual(
      readFileSync('./fixtures/json-artifact.json')
    )
    expect(fetchMock.lastCall('https://some-s3-url.two')?.[1]?.body).toEqual(
      readFileSync('./fixtures/xml-artifact.xml')
    )
    expect(mockSetFailed).toBeCalledTimes(0)
  })

  it('marks the run as a failure when an artifact path is not supported', async () => {
    const inputs: Inputs = {
      accountName: 'rwx-research',
      artifacts: [
        {
          kind: 'test_results',
          name: 'artifact',
          path: './fixtures/artifact.txt'
        }
      ],
      ifFilesNotFound: 'warn',
      jobMatrix: null,
      jobName: 'some-job-name',
      repositoryName: 'upload-captain-artifact',
      runId: '1234',
      captainBaseUrl: 'https://captain.example.com',
      captainToken: 'fake-token'
    }
    mockGetInputs.mockReturnValueOnce(inputs)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    await run()

    expect(mockSetFailed).toBeCalledTimes(1)
    expect(mockSetFailed).toBeCalledWith(
      'Only .json and .xml files are permitted.'
    )
  })

  it('marks the run as a failure when bulk artifact creation fails', async () => {
    const inputs: Inputs = {
      accountName: 'rwx-research',
      artifacts: [
        {
          kind: 'test_results',
          name: 'artifact-json',
          path: './fixtures/json-artifact.json',
          parser: 'rspec_json'
        },
        {
          kind: 'test_results',
          name: 'artifact-xml',
          path: './fixtures/xml-artifact.xml'
        }
      ],
      ifFilesNotFound: 'warn',
      jobMatrix: null,
      jobName: 'some-job-name',
      repositoryName: 'upload-captain-artifact',
      runId: '1234',
      captainBaseUrl: 'https://captain.example.com',
      captainToken: 'fake-token'
    }
    mockGetInputs.mockReturnValueOnce(inputs)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    fetchMock.postOnce(
      {
        body: {
          account_name: 'rwx-research',
          artifacts: [
            {
              kind: 'test_results',
              name: 'artifact-json',
              parser: 'rspec_json',
              mime_type: 'application/json',
              external_id: 'uuid-one'
            },
            {
              kind: 'test_results',
              name: 'artifact-xml',
              mime_type: 'application/xml',
              external_id: 'uuid-two'
            }
          ],
          job_name: 'some-job-name',
          job_matrix: null,
          repository_name: 'upload-captain-artifact',
          run_id: '1234'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
      },
      {
        body: {
          errors: [
            {error: 'huh', message: 'something bad happened'},
            {error: 'wat', message: 'something else happened'}
          ]
        },
        status: 422
      }
    )

    await run()

    expect(mockSetFailed).toBeCalledTimes(1)
    expect(mockSetFailed).toBeCalledWith(
      'Bulk artifacts POST failed:\n\n  - Errors: something bad happened, something else happened'
    )
  })

  it('marks the run as a failure when an upload fails, but still updates the statuses', async () => {
    const inputs: Inputs = {
      accountName: 'rwx-research',
      artifacts: [
        {
          kind: 'test_results',
          name: 'artifact-json',
          path: './fixtures/json-artifact.json',
          parser: 'rspec_json'
        },
        {
          kind: 'test_results',
          name: 'artifact-xml',
          path: './fixtures/xml-artifact.xml'
        }
      ],
      ifFilesNotFound: 'warn',
      jobMatrix: null,
      jobName: 'some-job-name',
      repositoryName: 'upload-captain-artifact',
      runId: '1234',
      captainBaseUrl: 'https://captain.example.com',
      captainToken: 'fake-token'
    }
    mockGetInputs.mockReturnValueOnce(inputs)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    fetchMock.postOnce(
      {
        body: {
          account_name: 'rwx-research',
          artifacts: [
            {
              kind: 'test_results',
              name: 'artifact-json',
              parser: 'rspec_json',
              mime_type: 'application/json',
              external_id: 'uuid-one'
            },
            {
              kind: 'test_results',
              name: 'artifact-xml',
              mime_type: 'application/xml',
              external_id: 'uuid-two'
            }
          ],
          job_name: 'some-job-name',
          job_matrix: null,
          repository_name: 'upload-captain-artifact',
          run_id: '1234'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
      },
      {
        body: {
          bulk_artifacts: [
            {external_id: 'uuid-one', upload_url: 'https://some-s3-url.one'},
            {
              external_id: 'uuid-two',
              upload_url: 'https://some-s3-url.two'
            }
          ]
        },
        status: 201
      }
    )

    fetchMock.putOnce('https://some-s3-url.one', {status: 200})
    fetchMock.putOnce('https://some-s3-url.two', {status: 400})

    fetchMock.putOnce(
      {
        body: {
          artifacts: [
            {external_id: 'uuid-one', status: 'uploaded'},
            {external_id: 'uuid-two', status: 'upload_failed'}
          ]
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts/status'
      },
      {
        status: 204
      }
    )

    await run()

    expect(mockSetFailed).toBeCalledTimes(1)
    expect(mockSetFailed).toBeCalledWith(
      'Some artifacts could not be uploaded:\n\n  Artifacts: artifact-xml'
    )
  })

  it('marks the run as a failure when all uploads fail, but still updates the statuses', async () => {
    const inputs: Inputs = {
      accountName: 'rwx-research',
      artifacts: [
        {
          kind: 'test_results',
          name: 'artifact-json',
          path: './fixtures/json-artifact.json',
          parser: 'rspec_json'
        },
        {
          kind: 'test_results',
          name: 'artifact-xml',
          path: './fixtures/xml-artifact.xml'
        }
      ],
      ifFilesNotFound: 'warn',
      jobMatrix: null,
      jobName: 'some-job-name',
      repositoryName: 'upload-captain-artifact',
      runId: '1234',
      captainBaseUrl: 'https://captain.example.com',
      captainToken: 'fake-token'
    }
    mockGetInputs.mockReturnValueOnce(inputs)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    fetchMock.postOnce(
      {
        body: {
          account_name: 'rwx-research',
          artifacts: [
            {
              kind: 'test_results',
              name: 'artifact-json',
              parser: 'rspec_json',
              mime_type: 'application/json',
              external_id: 'uuid-one'
            },
            {
              kind: 'test_results',
              name: 'artifact-xml',
              mime_type: 'application/xml',
              external_id: 'uuid-two'
            }
          ],
          job_name: 'some-job-name',
          job_matrix: null,
          repository_name: 'upload-captain-artifact',
          run_id: '1234'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
      },
      {
        body: {
          bulk_artifacts: [
            {external_id: 'uuid-one', upload_url: 'https://some-s3-url.one'},
            {
              external_id: 'uuid-two',
              upload_url: 'https://some-s3-url.two'
            }
          ]
        },
        status: 201
      }
    )

    fetchMock.putOnce('https://some-s3-url.one', {status: 400})
    fetchMock.putOnce('https://some-s3-url.two', {status: 400})

    fetchMock.putOnce(
      {
        body: {
          artifacts: [
            {external_id: 'uuid-one', status: 'upload_failed'},
            {external_id: 'uuid-two', status: 'upload_failed'}
          ]
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts/status'
      },
      {
        status: 204
      }
    )

    await run()

    expect(mockSetFailed).toBeCalledTimes(1)
    expect(mockSetFailed).toBeCalledWith(
      'Some artifacts could not be uploaded:\n\n  Artifacts: artifact-json, artifact-xml'
    )
  })

  it('does not mark the run as a failure when the update status request fails', async () => {
    const inputs: Inputs = {
      accountName: 'rwx-research',
      artifacts: [
        {
          kind: 'test_results',
          name: 'artifact-json',
          path: './fixtures/json-artifact.json',
          parser: 'rspec_json'
        },
        {
          kind: 'test_results',
          name: 'artifact-xml',
          path: './fixtures/xml-artifact.xml'
        }
      ],
      ifFilesNotFound: 'warn',
      jobMatrix: null,
      jobName: 'some-job-name',
      repositoryName: 'upload-captain-artifact',
      runId: '1234',
      captainBaseUrl: 'https://captain.example.com',
      captainToken: 'fake-token'
    }
    mockGetInputs.mockReturnValueOnce(inputs)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    fetchMock.postOnce(
      {
        body: {
          account_name: 'rwx-research',
          artifacts: [
            {
              kind: 'test_results',
              name: 'artifact-json',
              parser: 'rspec_json',
              mime_type: 'application/json',
              external_id: 'uuid-one'
            },
            {
              kind: 'test_results',
              name: 'artifact-xml',
              mime_type: 'application/xml',
              external_id: 'uuid-two'
            }
          ],
          job_name: 'some-job-name',
          job_matrix: null,
          repository_name: 'upload-captain-artifact',
          run_id: '1234'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
      },
      {
        body: {
          bulk_artifacts: [
            {external_id: 'uuid-one', upload_url: 'https://some-s3-url.one'},
            {
              external_id: 'uuid-two',
              upload_url: 'https://some-s3-url.two'
            }
          ]
        },
        status: 201
      }
    )

    fetchMock.putOnce('https://some-s3-url.one', {status: 200})
    fetchMock.putOnce('https://some-s3-url.two', {status: 200})

    fetchMock.putOnce(
      {
        body: {
          artifacts: [
            {external_id: 'uuid-one', status: 'uploaded'},
            {external_id: 'uuid-two', status: 'uploaded'}
          ]
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts/status'
      },
      {
        status: 500
      }
    )

    await run()

    expect(mockSetFailed).toBeCalledTimes(0)
  })

  describe('when no files are not found', () => {
    it('outputs neither a warning nor an error when ignoring', async () => {
      const inputs: Inputs = {
        accountName: 'rwx-research',
        artifacts: [
          {
            kind: 'test_results',
            name: 'artifact-json',
            path: './fixtures/does-not-exist.json'
          },
          {
            kind: 'test_results',
            name: 'artifact-xml',
            path: './fixtures/does-not-exist.xml'
          }
        ],
        ifFilesNotFound: 'ignore',
        jobMatrix: null,
        jobName: 'some-job-name',
        repositoryName: 'upload-captain-artifact',
        runId: '1234',
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      }
      mockGetInputs.mockReturnValueOnce(inputs)
      mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

      fetchMock.postOnce(
        {
          body: {
            account_name: 'rwx-research',
            artifacts: [
              {
                kind: 'test_results',
                name: 'artifact-json',
                mime_type: 'application/json',
                external_id: 'uuid-one'
              },
              {
                kind: 'test_results',
                name: 'artifact-xml',
                mime_type: 'application/xml',
                external_id: 'uuid-two'
              }
            ],
            job_name: 'some-job-name',
            job_matrix: null,
            repository_name: 'upload-captain-artifact',
            run_id: '1234'
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
        },
        {
          body: {
            bulk_artifacts: [
              {external_id: 'uuid-one', upload_url: 'https://some-s3-url.one'},
              {
                external_id: 'uuid-two',
                upload_url: 'https://some-s3-url.two'
              }
            ]
          },
          status: 201
        }
      )

      fetchMock.putOnce(
        {
          body: {
            artifacts: [
              {external_id: 'uuid-one', status: 'upload_skipped_file_missing'},
              {external_id: 'uuid-two', status: 'upload_skipped_file_missing'}
            ]
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts/status'
        },
        {
          status: 204
        }
      )

      await run()

      expect(mockSetFailed).toBeCalledTimes(0)
      expect(mockError).toBeCalledTimes(0)
      expect(mockWarning).toBeCalledTimes(0)
    })

    it('outputs a warning when warning', async () => {
      const inputs: Inputs = {
        accountName: 'rwx-research',
        artifacts: [
          {
            kind: 'test_results',
            name: 'artifact-json',
            path: './fixtures/does-not-exist.json'
          },
          {
            kind: 'test_results',
            name: 'artifact-xml',
            path: './fixtures/does-not-exist.xml'
          }
        ],
        ifFilesNotFound: 'warn',
        jobMatrix: null,
        jobName: 'some-job-name',
        repositoryName: 'upload-captain-artifact',
        runId: '1234',
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      }
      mockGetInputs.mockReturnValueOnce(inputs)
      mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

      fetchMock.postOnce(
        {
          body: {
            account_name: 'rwx-research',
            artifacts: [
              {
                kind: 'test_results',
                name: 'artifact-json',
                mime_type: 'application/json',
                external_id: 'uuid-one'
              },
              {
                kind: 'test_results',
                name: 'artifact-xml',
                mime_type: 'application/xml',
                external_id: 'uuid-two'
              }
            ],
            job_name: 'some-job-name',
            job_matrix: null,
            repository_name: 'upload-captain-artifact',
            run_id: '1234'
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
        },
        {
          body: {
            bulk_artifacts: [
              {external_id: 'uuid-one', upload_url: 'https://some-s3-url.one'},
              {
                external_id: 'uuid-two',
                upload_url: 'https://some-s3-url.two'
              }
            ]
          },
          status: 201
        }
      )

      fetchMock.putOnce(
        {
          body: {
            artifacts: [
              {external_id: 'uuid-one', status: 'upload_skipped_file_missing'},
              {external_id: 'uuid-two', status: 'upload_skipped_file_missing'}
            ]
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts/status'
        },
        {
          status: 204
        }
      )

      await run()

      expect(mockSetFailed).toBeCalledTimes(0)
      expect(mockError).toBeCalledTimes(0)
      expect(mockWarning).toBeCalledTimes(2)
      expect(mockWarning).toHaveBeenNthCalledWith(
        1,
        "Artifact file not found at './fixtures/does-not-exist.json' for artifact 'artifact-json'"
      )
      expect(mockWarning).toHaveBeenNthCalledWith(
        2,
        "Artifact file not found at './fixtures/does-not-exist.xml' for artifact 'artifact-xml'"
      )
    })

    it('outputs an error when erroring', async () => {
      const inputs: Inputs = {
        accountName: 'rwx-research',
        artifacts: [
          {
            kind: 'test_results',
            name: 'artifact-json',
            path: './fixtures/does-not-exist.json'
          },
          {
            kind: 'test_results',
            name: 'artifact-xml',
            path: './fixtures/does-not-exist.xml'
          }
        ],
        ifFilesNotFound: 'error',
        jobMatrix: null,
        jobName: 'some-job-name',
        repositoryName: 'upload-captain-artifact',
        runId: '1234',
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      }
      mockGetInputs.mockReturnValueOnce(inputs)
      mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

      fetchMock.postOnce(
        {
          body: {
            account_name: 'rwx-research',
            artifacts: [
              {
                kind: 'test_results',
                name: 'artifact-json',
                mime_type: 'application/json',
                external_id: 'uuid-one'
              },
              {
                kind: 'test_results',
                name: 'artifact-xml',
                mime_type: 'application/xml',
                external_id: 'uuid-two'
              }
            ],
            job_name: 'some-job-name',
            job_matrix: null,
            repository_name: 'upload-captain-artifact',
            run_id: '1234'
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
        },
        {
          body: {
            bulk_artifacts: [
              {external_id: 'uuid-one', upload_url: 'https://some-s3-url.one'},
              {
                external_id: 'uuid-two',
                upload_url: 'https://some-s3-url.two'
              }
            ]
          },
          status: 201
        }
      )

      fetchMock.putOnce(
        {
          body: {
            artifacts: [
              {external_id: 'uuid-one', status: 'upload_skipped_file_missing'},
              {external_id: 'uuid-two', status: 'upload_skipped_file_missing'}
            ]
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts/status'
        },
        {
          status: 204
        }
      )

      await run()

      expect(mockSetFailed).toBeCalledTimes(1)
      expect(mockSetFailed).toBeCalledWith('Artifact(s) are missing file(s)')
      expect(mockError).toBeCalledTimes(2)
      expect(mockError).toHaveBeenNthCalledWith(
        1,
        "Artifact file not found at './fixtures/does-not-exist.json' for artifact 'artifact-json'"
      )
      expect(mockError).toHaveBeenNthCalledWith(
        2,
        "Artifact file not found at './fixtures/does-not-exist.xml' for artifact 'artifact-xml'"
      )
      expect(mockWarning).toBeCalledTimes(0)
    })
  })

  describe('when some files are not found', () => {
    it('outputs neither a warning nor an error when ignoring', async () => {
      const inputs: Inputs = {
        accountName: 'rwx-research',
        artifacts: [
          {
            kind: 'test_results',
            name: 'artifact-json',
            path: './fixtures/json-artifact.json',
            parser: 'rspec_json'
          },
          {
            kind: 'test_results',
            name: 'artifact-xml',
            path: './fixtures/does-not-exist.xml'
          }
        ],
        ifFilesNotFound: 'ignore',
        jobMatrix: null,
        jobName: 'some-job-name',
        repositoryName: 'upload-captain-artifact',
        runId: '1234',
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      }
      mockGetInputs.mockReturnValueOnce(inputs)
      mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

      fetchMock.postOnce(
        {
          body: {
            account_name: 'rwx-research',
            artifacts: [
              {
                kind: 'test_results',
                name: 'artifact-json',
                parser: 'rspec_json',
                mime_type: 'application/json',
                external_id: 'uuid-one'
              },
              {
                kind: 'test_results',
                name: 'artifact-xml',
                mime_type: 'application/xml',
                external_id: 'uuid-two'
              }
            ],
            job_name: 'some-job-name',
            job_matrix: null,
            repository_name: 'upload-captain-artifact',
            run_id: '1234'
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
        },
        {
          body: {
            bulk_artifacts: [
              {external_id: 'uuid-one', upload_url: 'https://some-s3-url.one'},
              {
                external_id: 'uuid-two',
                upload_url: 'https://some-s3-url.two'
              }
            ]
          },
          status: 201
        }
      )

      fetchMock.putOnce('https://some-s3-url.one', {status: 200})

      fetchMock.putOnce(
        {
          body: {
            artifacts: [
              {external_id: 'uuid-one', status: 'uploaded'},
              {external_id: 'uuid-two', status: 'upload_skipped_file_missing'}
            ]
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts/status'
        },
        {
          status: 204
        }
      )

      await run()

      expect(mockSetFailed).toBeCalledTimes(0)
      expect(mockError).toBeCalledTimes(0)
      expect(mockWarning).toBeCalledTimes(0)
    })

    it('outputs a warning when warning', async () => {
      const inputs: Inputs = {
        accountName: 'rwx-research',
        artifacts: [
          {
            kind: 'test_results',
            name: 'artifact-json',
            path: './fixtures/json-artifact.json',
            parser: 'rspec_json'
          },
          {
            kind: 'test_results',
            name: 'artifact-xml',
            path: './fixtures/does-not-exist.xml'
          }
        ],
        ifFilesNotFound: 'warn',
        jobMatrix: null,
        jobName: 'some-job-name',
        repositoryName: 'upload-captain-artifact',
        runId: '1234',
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      }
      mockGetInputs.mockReturnValueOnce(inputs)
      mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

      fetchMock.postOnce(
        {
          body: {
            account_name: 'rwx-research',
            artifacts: [
              {
                kind: 'test_results',
                name: 'artifact-json',
                parser: 'rspec_json',
                mime_type: 'application/json',
                external_id: 'uuid-one'
              },
              {
                kind: 'test_results',
                name: 'artifact-xml',
                mime_type: 'application/xml',
                external_id: 'uuid-two'
              }
            ],
            job_name: 'some-job-name',
            job_matrix: null,
            repository_name: 'upload-captain-artifact',
            run_id: '1234'
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
        },
        {
          body: {
            bulk_artifacts: [
              {external_id: 'uuid-one', upload_url: 'https://some-s3-url.one'},
              {
                external_id: 'uuid-two',
                upload_url: 'https://some-s3-url.two'
              }
            ]
          },
          status: 201
        }
      )

      fetchMock.putOnce('https://some-s3-url.one', {status: 200})

      fetchMock.putOnce(
        {
          body: {
            artifacts: [
              {external_id: 'uuid-one', status: 'uploaded'},
              {external_id: 'uuid-two', status: 'upload_skipped_file_missing'}
            ]
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts/status'
        },
        {
          status: 204
        }
      )

      await run()

      expect(mockSetFailed).toBeCalledTimes(0)
      expect(mockError).toBeCalledTimes(0)
      expect(mockWarning).toBeCalledTimes(1)
      expect(mockWarning).toBeCalledWith(
        "Artifact file not found at './fixtures/does-not-exist.xml' for artifact 'artifact-xml'"
      )
    })

    it('outputs an error when erroring', async () => {
      const inputs: Inputs = {
        accountName: 'rwx-research',
        artifacts: [
          {
            kind: 'test_results',
            name: 'artifact-json',
            path: './fixtures/json-artifact.json',
            parser: 'rspec_json'
          },
          {
            kind: 'test_results',
            name: 'artifact-xml',
            path: './fixtures/does-not-exist.xml'
          }
        ],
        ifFilesNotFound: 'error',
        jobMatrix: null,
        jobName: 'some-job-name',
        repositoryName: 'upload-captain-artifact',
        runId: '1234',
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      }
      mockGetInputs.mockReturnValueOnce(inputs)
      mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

      fetchMock.postOnce(
        {
          body: {
            account_name: 'rwx-research',
            artifacts: [
              {
                kind: 'test_results',
                name: 'artifact-json',
                parser: 'rspec_json',
                mime_type: 'application/json',
                external_id: 'uuid-one'
              },
              {
                kind: 'test_results',
                name: 'artifact-xml',
                mime_type: 'application/xml',
                external_id: 'uuid-two'
              }
            ],
            job_name: 'some-job-name',
            job_matrix: null,
            repository_name: 'upload-captain-artifact',
            run_id: '1234'
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts'
        },
        {
          body: {
            bulk_artifacts: [
              {external_id: 'uuid-one', upload_url: 'https://some-s3-url.one'},
              {
                external_id: 'uuid-two',
                upload_url: 'https://some-s3-url.two'
              }
            ]
          },
          status: 201
        }
      )

      fetchMock.putOnce('https://some-s3-url.one', {status: 200})

      fetchMock.putOnce(
        {
          body: {
            artifacts: [
              {external_id: 'uuid-one', status: 'uploaded'},
              {external_id: 'uuid-two', status: 'upload_skipped_file_missing'}
            ]
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/organization/integrations/github/bulk_artifacts/status'
        },
        {
          status: 204
        }
      )

      await run()

      expect(mockSetFailed).toBeCalledTimes(1)
      expect(mockSetFailed).toBeCalledWith('Artifact(s) are missing file(s)')
      expect(mockError).toBeCalledTimes(1)
      expect(mockError).toBeCalledWith(
        "Artifact file not found at './fixtures/does-not-exist.xml' for artifact 'artifact-xml'"
      )
      expect(mockWarning).toBeCalledTimes(0)
    })
  })
})
