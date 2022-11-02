import run from './run'
import fetchMock from '../test-utils/fetch-mock'
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

const fixtures = {
  oneTestSuiteTwoFiles: {
    input: {
      accountOwner: 'some-account-owner',
      attemptedBy: 'some-actor',
      branch: 'some-branch',
      captainBaseUrl: 'https://captain.example.com',
      captainToken: 'fake-token',
      commitMessage: 'some-commit-message',
      commitSha: 'some-commit-sha',
      ifFilesNotFound: 'warn',
      jobMatrix: {some: 'value', other: 'values'},
      jobName: 'some-job-name',
      repositoryName: 'some-repository-name',
      runAttempt: 'some-run-attempt',
      runId: 'some-run-id',
      testResults: [
        {
          testSuiteIdentifier: 'test-suite',
          originalPath: './fixtures/json-artifact.json',
          format: 'rspec_json'
        },
        {
          testSuiteIdentifier: 'test-suite',
          originalPath: './fixtures/xml-artifact.xml',
          format: 'junit_xml'
        }
      ]
    } as Inputs,
    createBody: {
      attempted_by: 'some-actor',
      branch: 'some-branch',
      commit_message: 'some-commit-message',
      commit_sha: 'some-commit-sha',
      job_tags: {
        github_account_owner: 'some-account-owner',
        github_repository_name: 'some-repository-name',
        github_run_id: 'some-run-id',
        github_run_attempt: 'some-run-attempt',
        github_job_matrix: {some: 'value', other: 'values'},
        github_job_name: 'some-job-name'
      },
      provider: 'github',
      test_results_files: [
        {
          external_identifier: 'uuid-one',
          format: 'rspec_json',
          original_path: './fixtures/json-artifact.json'
        },
        {
          external_identifier: 'uuid-two',
          format: 'junit_xml',
          original_path: './fixtures/xml-artifact.xml'
        }
      ],
      test_suite_identifier: 'test-suite'
    }
  },
  someFilesNotFound: {
    input: {
      accountOwner: 'some-account-owner',
      attemptedBy: 'some-actor',
      branch: 'some-branch',
      captainBaseUrl: 'https://captain.example.com',
      captainToken: 'fake-token',
      commitMessage: 'some-commit-message',
      commitSha: 'some-commit-sha',
      ifFilesNotFound: 'warn',
      jobMatrix: {some: 'value', other: 'values'},
      jobName: 'some-job-name',
      repositoryName: 'some-repository-name',
      runAttempt: 'some-run-attempt',
      runId: 'some-run-id',
      testResults: [
        {
          testSuiteIdentifier: 'test-suite',
          originalPath: './fixtures/json-artifact.json',
          format: 'rspec_json'
        },
        {
          testSuiteIdentifier: 'test-suite',
          originalPath: './fixtures/does-not-exist.xml',
          format: 'junit_xml'
        }
      ]
    } as Inputs,
    createBody: {
      attempted_by: 'some-actor',
      branch: 'some-branch',
      commit_message: 'some-commit-message',
      commit_sha: 'some-commit-sha',
      job_tags: {
        github_account_owner: 'some-account-owner',
        github_repository_name: 'some-repository-name',
        github_run_id: 'some-run-id',
        github_run_attempt: 'some-run-attempt',
        github_job_matrix: {some: 'value', other: 'values'},
        github_job_name: 'some-job-name'
      },
      provider: 'github',
      test_results_files: [
        {
          external_identifier: 'uuid-one',
          format: 'rspec_json',
          original_path: './fixtures/json-artifact.json'
        },
        {
          external_identifier: 'uuid-two',
          format: 'junit_xml',
          original_path: './fixtures/does-not-exist.xml'
        }
      ],
      test_suite_identifier: 'test-suite'
    }
  }
}

beforeEach(() => {
  fetchMock.reset()
  jest.resetAllMocks()
})

describe('run', () => {
  it('works with multiple test suites', async () => {
    const inputs: Inputs = {
      accountOwner: 'some-account-owner',
      attemptedBy: 'some-actor',
      branch: 'some-branch',
      captainBaseUrl: 'https://captain.example.com',
      captainToken: 'fake-token',
      commitMessage: 'some-commit-message',
      commitSha: 'some-commit-sha',
      ifFilesNotFound: 'warn',
      jobMatrix: {some: 'value', other: 'values'},
      jobName: 'some-job-name',
      repositoryName: 'some-repository-name',
      runAttempt: 'some-run-attempt',
      runId: 'some-run-id',
      testResults: [
        {
          testSuiteIdentifier: 'artifact-json',
          originalPath: './fixtures/json-artifact.json',
          format: 'rspec_json'
        },
        {
          testSuiteIdentifier: 'artifact-xml',
          originalPath: './fixtures/xml-artifact.xml',
          format: 'junit_xml'
        }
      ]
    }
    mockGetInputs.mockReturnValueOnce(inputs)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    fetchMock.postOnce(
      {
        name: 'post json',
        body: {
          attempted_by: 'some-actor',
          branch: 'some-branch',
          commit_message: 'some-commit-message',
          commit_sha: 'some-commit-sha',
          job_tags: {
            github_account_owner: 'some-account-owner',
            github_repository_name: 'some-repository-name',
            github_run_id: 'some-run-id',
            github_run_attempt: 'some-run-attempt',
            github_job_matrix: {some: 'value', other: 'values'},
            github_job_name: 'some-job-name'
          },
          provider: 'github',
          test_results_files: [
            {
              external_identifier: 'uuid-one',
              format: 'rspec_json',
              original_path: './fixtures/json-artifact.json'
            }
          ],
          test_suite_identifier: 'artifact-json'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        body: {
          test_results_uploads: [
            {
              id: 'id-one',
              external_identifier: 'uuid-one',
              upload_url: 'https://some-s3-url.one'
            }
          ]
        },
        status: 201
      }
    )
    fetchMock.postOnce(
      {
        name: 'post xml',
        body: {
          attempted_by: 'some-actor',
          branch: 'some-branch',
          commit_message: 'some-commit-message',
          commit_sha: 'some-commit-sha',
          job_tags: {
            github_account_owner: 'some-account-owner',
            github_repository_name: 'some-repository-name',
            github_run_id: 'some-run-id',
            github_run_attempt: 'some-run-attempt',
            github_job_matrix: {some: 'value', other: 'values'},
            github_job_name: 'some-job-name'
          },
          provider: 'github',
          test_results_files: [
            {
              external_identifier: 'uuid-two',
              format: 'junit_xml',
              original_path: './fixtures/xml-artifact.xml'
            }
          ],
          test_suite_identifier: 'artifact-xml'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        body: {
          test_results_uploads: [
            {
              id: 'id-two',
              external_identifier: 'uuid-two',
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
        name: 'put json',
        body: {
          test_suite_identifier: 'artifact-json',
          test_results_files: [{id: 'id-one', upload_status: 'uploaded'}]
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        status: 204
      }
    )
    fetchMock.putOnce(
      {
        name: 'put xml',
        body: {
          test_suite_identifier: 'artifact-xml',
          test_results_files: [{id: 'id-two', upload_status: 'uploaded'}]
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
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

  it('works with one test suite', async () => {
    mockGetInputs.mockReturnValueOnce(fixtures.oneTestSuiteTwoFiles.input)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    fetchMock.postOnce(
      {
        body: fixtures.oneTestSuiteTwoFiles.createBody,
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        body: {
          test_results_uploads: [
            {
              id: 'id-one',
              external_identifier: 'uuid-one',
              upload_url: 'https://some-s3-url.one'
            },
            {
              id: 'id-two',
              external_identifier: 'uuid-two',
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
          test_suite_identifier: 'test-suite',
          test_results_files: [
            {id: 'id-one', upload_status: 'uploaded'},
            {id: 'id-two', upload_status: 'uploaded'}
          ]
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
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

  it('can glob multiple files', async () => {
    const inputs: Inputs = {
      accountOwner: 'some-account-owner',
      attemptedBy: 'some-actor',
      branch: 'some-branch',
      captainBaseUrl: 'https://captain.example.com',
      captainToken: 'fake-token',
      commitMessage: 'some-commit-message',
      commitSha: 'some-commit-sha',
      ifFilesNotFound: 'warn',
      jobMatrix: {some: 'value', other: 'values'},
      jobName: 'some-job-name',
      repositoryName: 'some-repository-name',
      runAttempt: 'some-run-attempt',
      runId: 'some-run-id',
      testResults: [
        {
          testSuiteIdentifier: 'test-suite',
          originalPath: './fixtures/**/*.json',
          format: 'rspec_json'
        }
      ]
    }
    mockGetInputs.mockReturnValueOnce(inputs)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    fetchMock.postOnce(
      {
        body: {
          attempted_by: 'some-actor',
          branch: 'some-branch',
          commit_message: 'some-commit-message',
          commit_sha: 'some-commit-sha',
          job_tags: {
            github_account_owner: 'some-account-owner',
            github_repository_name: 'some-repository-name',
            github_run_id: 'some-run-id',
            github_run_attempt: 'some-run-attempt',
            github_job_matrix: {some: 'value', other: 'values'},
            github_job_name: 'some-job-name'
          },
          provider: 'github',
          test_results_files: [
            {
              external_identifier: 'uuid-one',
              format: 'rspec_json',
              original_path: './fixtures/**/*.json'
            },
            {
              external_identifier: 'uuid-two',
              format: 'rspec_json',
              original_path: './fixtures/**/*.json'
            }
          ],
          test_suite_identifier: 'test-suite'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        body: {
          test_results_uploads: [
            {
              id: 'id-one',
              external_identifier: 'uuid-one',
              upload_url: 'https://some-s3-url.one'
            },
            {
              id: 'id-two',
              external_identifier: 'uuid-two',
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
          test_suite_identifier: 'test-suite',
          test_results_files: [
            {id: 'id-one', upload_status: 'uploaded'},
            {id: 'id-two', upload_status: 'uploaded'}
          ]
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
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
      readFileSync('./fixtures/glob-test-dir/json-artifact.json')
    )
    expect(mockSetFailed).toBeCalledTimes(0)
  })

  it('can glob one file', async () => {
    const inputs: Inputs = {
      accountOwner: 'some-account-owner',
      attemptedBy: 'some-actor',
      branch: 'some-branch',
      captainBaseUrl: 'https://captain.example.com',
      captainToken: 'fake-token',
      commitMessage: 'some-commit-message',
      commitSha: 'some-commit-sha',
      ifFilesNotFound: 'warn',
      jobMatrix: {some: 'value', other: 'values'},
      jobName: 'some-job-name',
      repositoryName: 'some-repository-name',
      runAttempt: 'some-run-attempt',
      runId: 'some-run-id',
      testResults: [
        {
          testSuiteIdentifier: 'test-suite',
          originalPath: './fixtures/*.json',
          format: 'rspec_json'
        }
      ]
    }
    mockGetInputs.mockReturnValueOnce(inputs)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    fetchMock.postOnce(
      {
        body: {
          attempted_by: 'some-actor',
          branch: 'some-branch',
          commit_message: 'some-commit-message',
          commit_sha: 'some-commit-sha',
          job_tags: {
            github_account_owner: 'some-account-owner',
            github_repository_name: 'some-repository-name',
            github_run_id: 'some-run-id',
            github_run_attempt: 'some-run-attempt',
            github_job_matrix: {some: 'value', other: 'values'},
            github_job_name: 'some-job-name'
          },
          provider: 'github',
          test_results_files: [
            {
              external_identifier: 'uuid-one',
              format: 'rspec_json',
              original_path: './fixtures/*.json'
            }
          ],
          test_suite_identifier: 'test-suite'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        body: {
          test_results_uploads: [
            {
              id: 'id-one',
              external_identifier: 'uuid-one',
              upload_url: 'https://some-s3-url.one'
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
          test_suite_identifier: 'test-suite',
          test_results_files: [{id: 'id-one', upload_status: 'uploaded'}]
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        status: 204
      }
    )

    await run()

    expect(fetchMock.lastCall('https://some-s3-url.one')?.[1]?.body).toEqual(
      readFileSync('./fixtures/json-artifact.json')
    )
    expect(mockSetFailed).toBeCalledTimes(0)
  })

  it('can glob no files', async () => {
    const inputs: Inputs = {
      accountOwner: 'some-account-owner',
      attemptedBy: 'some-actor',
      branch: 'some-branch',
      captainBaseUrl: 'https://captain.example.com',
      captainToken: 'fake-token',
      commitMessage: 'some-commit-message',
      commitSha: 'some-commit-sha',
      ifFilesNotFound: 'warn',
      jobMatrix: {some: 'value', other: 'values'},
      jobName: 'some-job-name',
      repositoryName: 'some-repository-name',
      runAttempt: 'some-run-attempt',
      runId: 'some-run-id',
      testResults: [
        {
          testSuiteIdentifier: 'test-suite',
          originalPath: './fixtures/*.wat',
          format: 'rspec_json'
        }
      ]
    }
    mockGetInputs.mockReturnValueOnce(inputs)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    fetchMock.postOnce(
      {
        body: {
          attempted_by: 'some-actor',
          branch: 'some-branch',
          commit_message: 'some-commit-message',
          commit_sha: 'some-commit-sha',
          job_tags: {
            github_account_owner: 'some-account-owner',
            github_repository_name: 'some-repository-name',
            github_run_id: 'some-run-id',
            github_run_attempt: 'some-run-attempt',
            github_job_matrix: {some: 'value', other: 'values'},
            github_job_name: 'some-job-name'
          },
          provider: 'github',
          test_results_files: [
            {
              external_identifier: 'uuid-one',
              format: 'rspec_json',
              original_path: './fixtures/*.wat'
            }
          ],
          test_suite_identifier: 'test-suite'
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        body: {
          test_results_uploads: [
            {
              id: 'id-one',
              external_identifier: 'uuid-one',
              upload_url: 'https://some-s3-url.one'
            }
          ]
        },
        status: 201
      }
    )

    fetchMock.putOnce(
      {
        body: {
          test_suite_identifier: 'test-suite',
          test_results_files: [
            {id: 'id-one', upload_status: 'upload_skipped_file_missing'}
          ]
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        status: 204
      }
    )

    await run()

    expect(mockWarning).toBeCalledTimes(1)
    expect(mockWarning).toHaveBeenNthCalledWith(
      1,
      "Test results file not found at './fixtures/*.wat' for test suite 'test-suite'"
    )
    expect(mockError).not.toBeCalled()
    expect(mockSetFailed).not.toBeCalled()
  })

  it('marks the run as a failure when bulk test result creation fails', async () => {
    mockGetInputs.mockReturnValueOnce(fixtures.oneTestSuiteTwoFiles.input)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    fetchMock.postOnce(
      {
        body: fixtures.oneTestSuiteTwoFiles.createBody,
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        body: {},
        status: 422
      }
    )

    await run()

    expect(mockSetFailed).toBeCalledTimes(1)
    expect(mockSetFailed).toBeCalledWith(
      'Bulk test results POST failed:\n\n  - Errors: An unexpected error occurred while creating bulk test results'
    )
  })

  it('marks the run as a failure when an upload fails, but still updates the statuses', async () => {
    mockGetInputs.mockReturnValueOnce(fixtures.oneTestSuiteTwoFiles.input)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    fetchMock.postOnce(
      {
        body: fixtures.oneTestSuiteTwoFiles.createBody,
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        body: {
          test_results_uploads: [
            {
              id: 'id-one',
              external_identifier: 'uuid-one',
              upload_url: 'https://some-s3-url.one'
            },
            {
              id: 'id-two',
              external_identifier: 'uuid-two',
              upload_url: 'https://some-s3-url.two'
            }
          ]
        },
        status: 201
      }
    )

    fetchMock.putOnce('https://some-s3-url.one', {status: 422})
    fetchMock.putOnce('https://some-s3-url.two', {status: 200})

    fetchMock.putOnce(
      {
        body: {
          test_suite_identifier: 'test-suite',
          test_results_files: [
            {id: 'id-two', upload_status: 'uploaded'},
            {id: 'id-one', upload_status: 'upload_failed'}
          ]
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        status: 204
      }
    )

    await run()

    expect(mockSetFailed).toBeCalledTimes(1)
    expect(mockSetFailed).toBeCalledWith(
      'Some test results could not be uploaded:\n\n  Test results:\n  - Suite: test-suite, Path: ./fixtures/json-artifact.json'
    )
  })

  it('marks the run as a failure when all uploads fail, but still updates the statuses', async () => {
    mockGetInputs.mockReturnValueOnce(fixtures.oneTestSuiteTwoFiles.input)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    fetchMock.postOnce(
      {
        body: fixtures.oneTestSuiteTwoFiles.createBody,
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        body: {
          test_results_uploads: [
            {
              id: 'id-one',
              external_identifier: 'uuid-one',
              upload_url: 'https://some-s3-url.one'
            },
            {
              id: 'id-two',
              external_identifier: 'uuid-two',
              upload_url: 'https://some-s3-url.two'
            }
          ]
        },
        status: 201
      }
    )

    fetchMock.putOnce('https://some-s3-url.one', {status: 422})
    fetchMock.putOnce('https://some-s3-url.two', {status: 422})

    fetchMock.putOnce(
      {
        body: {
          test_suite_identifier: 'test-suite',
          test_results_files: [
            {id: 'id-one', upload_status: 'upload_failed'},
            {id: 'id-two', upload_status: 'upload_failed'}
          ]
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        status: 204
      }
    )

    await run()

    expect(mockSetFailed).toBeCalledTimes(1)
    expect(mockSetFailed).toBeCalledWith(
      'Some test results could not be uploaded:\n\n  Test results:\n  - Suite: test-suite, Path: ./fixtures/json-artifact.json\n  - Suite: test-suite, Path: ./fixtures/xml-artifact.xml'
    )
  })

  it('does not mark the run as a failure when the update status request fails', async () => {
    mockGetInputs.mockReturnValueOnce(fixtures.oneTestSuiteTwoFiles.input)
    mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

    fetchMock.postOnce(
      {
        body: fixtures.oneTestSuiteTwoFiles.createBody,
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        body: {
          test_results_uploads: [
            {
              id: 'id-one',
              external_identifier: 'uuid-one',
              upload_url: 'https://some-s3-url.one'
            },
            {
              id: 'id-two',
              external_identifier: 'uuid-two',
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
          test_suite_identifier: 'test-suite',
          test_results_files: [
            {id: 'id-one', upload_status: 'uploaded'},
            {id: 'id-two', upload_status: 'uploaded'}
          ]
        },
        headers: {Authorization: 'Bearer fake-token'},
        url: 'https://captain.example.com/api/test_suites/bulk_test_results'
      },
      {
        status: 422
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

  describe('when some files are not found', () => {
    it('outputs neither a warning nor an error when ignoring', async () => {
      mockGetInputs.mockReturnValueOnce({
        ...fixtures.someFilesNotFound.input,
        ifFilesNotFound: 'ignore'
      })
      mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

      fetchMock.postOnce(
        {
          body: fixtures.someFilesNotFound.createBody,
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/test_suites/bulk_test_results'
        },
        {
          body: {
            test_results_uploads: [
              {
                id: 'id-one',
                external_identifier: 'uuid-one',
                upload_url: 'https://some-s3-url.one'
              },
              {
                id: 'id-two',
                external_identifier: 'uuid-two',
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
            test_suite_identifier: 'test-suite',
            test_results_files: [
              {id: 'id-one', upload_status: 'uploaded'},
              {id: 'id-two', upload_status: 'upload_skipped_file_missing'}
            ]
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/test_suites/bulk_test_results'
        },
        {
          status: 422
        }
      )

      await run()

      expect(mockSetFailed).toBeCalledTimes(0)
      expect(mockError).toBeCalledTimes(0)
      expect(mockWarning).toBeCalledTimes(0)
    })

    it('outputs a warning when warning', async () => {
      mockGetInputs.mockReturnValueOnce({
        ...fixtures.someFilesNotFound.input,
        ifFilesNotFound: 'warn'
      })
      mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

      fetchMock.postOnce(
        {
          body: fixtures.someFilesNotFound.createBody,
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/test_suites/bulk_test_results'
        },
        {
          body: {
            test_results_uploads: [
              {
                id: 'id-one',
                external_identifier: 'uuid-one',
                upload_url: 'https://some-s3-url.one'
              },
              {
                id: 'id-two',
                external_identifier: 'uuid-two',
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
            test_suite_identifier: 'test-suite',
            test_results_files: [
              {id: 'id-one', upload_status: 'uploaded'},
              {id: 'id-two', upload_status: 'upload_skipped_file_missing'}
            ]
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/test_suites/bulk_test_results'
        },
        {
          status: 422
        }
      )

      await run()

      expect(mockSetFailed).toBeCalledTimes(0)
      expect(mockError).toBeCalledTimes(0)
      expect(mockWarning).toBeCalledTimes(1)
      expect(mockWarning).toBeCalledWith(
        "Test results file not found at './fixtures/does-not-exist.xml' for test suite 'test-suite'"
      )
    })

    it('outputs an error when erroring', async () => {
      mockGetInputs.mockReturnValueOnce({
        ...fixtures.someFilesNotFound.input,
        ifFilesNotFound: 'error'
      })
      mockUuid.mockReturnValueOnce('uuid-one').mockReturnValueOnce('uuid-two')

      fetchMock.postOnce(
        {
          body: fixtures.someFilesNotFound.createBody,
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/test_suites/bulk_test_results'
        },
        {
          body: {
            test_results_uploads: [
              {
                id: 'id-one',
                external_identifier: 'uuid-one',
                upload_url: 'https://some-s3-url.one'
              },
              {
                id: 'id-two',
                external_identifier: 'uuid-two',
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
            test_suite_identifier: 'test-suite',
            test_results_files: [
              {id: 'id-one', upload_status: 'uploaded'},
              {id: 'id-two', upload_status: 'upload_skipped_file_missing'}
            ]
          },
          headers: {Authorization: 'Bearer fake-token'},
          url: 'https://captain.example.com/api/test_suites/bulk_test_results'
        },
        {
          status: 422
        }
      )

      await run()

      expect(mockSetFailed).toBeCalledTimes(1)
      expect(mockSetFailed).toBeCalledWith('Test result(s) are missing file(s)')
      expect(mockError).toBeCalledTimes(1)
      expect(mockError).toBeCalledWith(
        "Test results file not found at './fixtures/does-not-exist.xml' for test suite 'test-suite'"
      )
      expect(mockWarning).toBeCalledTimes(0)
    })
  })
})
