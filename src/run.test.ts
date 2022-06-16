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

describe('run', () => {
  it('does not mark the run as a failure when everything works', async () => {
    const inputs: Inputs = {
      accountName: 'rwx-research',
      artifacts: [
        {
          kind: 'test_results',
          name: 'artifact-json',
          path: './fixtures/json-artifact.json'
        },
        {
          kind: 'test_results',
          name: 'artifact-xml',
          path: './fixtures/xml-artifact.xml'
        }
      ],
      jobMatrix: null,
      jobName: 'some-job-name',
      repositoryName: 'upload-vanguard-artifact',
      runId: '1234',
      vanguardBaseUrl: 'https://vanguard.example.com',
      vanguardToken: 'fake-token'
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
          repository_name: 'upload-vanguard-artifact',
          run_id: '1234'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://vanguard.example.com/api/organization/integrations/github/bulk_artifacts'
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
        body: {external_ids: ['uuid-one', 'uuid-two']},
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://vanguard.example.com/api/organization/integrations/github/bulk_artifacts/uploaded'
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
      jobMatrix: null,
      jobName: 'some-job-name',
      repositoryName: 'upload-vanguard-artifact',
      runId: '1234',
      vanguardBaseUrl: 'https://vanguard.example.com',
      vanguardToken: 'fake-token'
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
          path: './fixtures/json-artifact.json'
        },
        {
          kind: 'test_results',
          name: 'artifact-xml',
          path: './fixtures/xml-artifact.xml'
        }
      ],
      jobMatrix: null,
      jobName: 'some-job-name',
      repositoryName: 'upload-vanguard-artifact',
      runId: '1234',
      vanguardBaseUrl: 'https://vanguard.example.com',
      vanguardToken: 'fake-token'
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
          repository_name: 'upload-vanguard-artifact',
          run_id: '1234'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://vanguard.example.com/api/organization/integrations/github/bulk_artifacts'
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

  it('marks the run as a failure when an upload fails, but still marks the uploaded ones as such', async () => {
    const inputs: Inputs = {
      accountName: 'rwx-research',
      artifacts: [
        {
          kind: 'test_results',
          name: 'artifact-json',
          path: './fixtures/json-artifact.json'
        },
        {
          kind: 'test_results',
          name: 'artifact-xml',
          path: './fixtures/xml-artifact.xml'
        }
      ],
      jobMatrix: null,
      jobName: 'some-job-name',
      repositoryName: 'upload-vanguard-artifact',
      runId: '1234',
      vanguardBaseUrl: 'https://vanguard.example.com',
      vanguardToken: 'fake-token'
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
          repository_name: 'upload-vanguard-artifact',
          run_id: '1234'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://vanguard.example.com/api/organization/integrations/github/bulk_artifacts'
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
        body: {external_ids: ['uuid-one']},
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://vanguard.example.com/api/organization/integrations/github/bulk_artifacts/uploaded'
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

  it('marks the run as a failure when all uploads fail and does not mark any as uploaded', async () => {
    const inputs: Inputs = {
      accountName: 'rwx-research',
      artifacts: [
        {
          kind: 'test_results',
          name: 'artifact-json',
          path: './fixtures/json-artifact.json'
        },
        {
          kind: 'test_results',
          name: 'artifact-xml',
          path: './fixtures/xml-artifact.xml'
        }
      ],
      jobMatrix: null,
      jobName: 'some-job-name',
      repositoryName: 'upload-vanguard-artifact',
      runId: '1234',
      vanguardBaseUrl: 'https://vanguard.example.com',
      vanguardToken: 'fake-token'
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
          repository_name: 'upload-vanguard-artifact',
          run_id: '1234'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://vanguard.example.com/api/organization/integrations/github/bulk_artifacts'
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

    await run()

    expect(mockSetFailed).toBeCalledTimes(1)
    expect(mockSetFailed).toBeCalledWith(
      'Some artifacts could not be uploaded:\n\n  Artifacts: artifact-json, artifact-xml'
    )
  })

  it('does not mark the run as a failure when the mark-uplaoded request fails', async () => {
    const inputs: Inputs = {
      accountName: 'rwx-research',
      artifacts: [
        {
          kind: 'test_results',
          name: 'artifact-json',
          path: './fixtures/json-artifact.json'
        },
        {
          kind: 'test_results',
          name: 'artifact-xml',
          path: './fixtures/xml-artifact.xml'
        }
      ],
      jobMatrix: null,
      jobName: 'some-job-name',
      repositoryName: 'upload-vanguard-artifact',
      runId: '1234',
      vanguardBaseUrl: 'https://vanguard.example.com',
      vanguardToken: 'fake-token'
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
          repository_name: 'upload-vanguard-artifact',
          run_id: '1234'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://vanguard.example.com/api/organization/integrations/github/bulk_artifacts'
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
        body: {external_ids: ['uuid-one', 'uuid-two']},
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://vanguard.example.com/api/organization/integrations/github/bulk_artifacts/uploaded'
      },
      {
        status: 500
      }
    )

    await run()

    expect(mockSetFailed).toBeCalledTimes(0)
  })
})
