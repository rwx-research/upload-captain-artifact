import run from './run'
import {getInputs, Inputs} from './utils'
import * as core from '@actions/core'
import * as exec from '@actions/exec'

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  getInputs: jest.fn()
}))
jest.mock('@actions/core')
jest.mock('@actions/exec')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetInputs = getInputs as unknown as jest.Mock<any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSetFailed = core.setFailed as unknown as jest.Mock<any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockExec = exec.exec as unknown as jest.Mock<any>

beforeEach(() => {
  jest.resetAllMocks()
})

describe('run', () => {
  it('works with multiple test suites', async () => {
    const inputs: Inputs = {
      captainBaseUrl: 'https://captain.example.com',
      captainToken: 'fake-token',
      ifFilesNotFound: 'warn',
      jobMatrix: {some: 'value', other: 'values'},
      jobName: 'some-job-name',
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

    await run()

    expect(mockExec).toBeCalledWith(
      'captain upload results',
      [
        '--suite-id',
        'artifact-json',
        '--github-job-name',
        'some-job-name',
        '--github-job-matrix',
        '{"some":"value","other":"values"}',
        './fixtures/json-artifact.json'
      ],
      expect.objectContaining({
        env: expect.objectContaining({
          RWX_ACCESS_TOKEN: 'fake-token',
          CAPTAIN_HOST: 'captain.example.com'
        })
      })
    )
    expect(mockExec).toBeCalledWith(
      'captain upload results',
      [
        '--suite-id',
        'artifact-xml',
        '--github-job-name',
        'some-job-name',
        '--github-job-matrix',
        '{"some":"value","other":"values"}',
        './fixtures/xml-artifact.xml'
      ],
      expect.objectContaining({
        env: expect.objectContaining({
          RWX_ACCESS_TOKEN: 'fake-token',
          CAPTAIN_HOST: 'captain.example.com'
        })
      })
    )
    expect(mockSetFailed).toBeCalledTimes(0)
  })

  it('works with one test suite', async () => {
    const inputs = {
      captainBaseUrl: 'https://captain.example.com',
      captainToken: 'fake-token',
      ifFilesNotFound: 'warn',
      jobMatrix: {some: 'value', other: 'values'},
      jobName: 'some-job-name',
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
    } as Inputs
    mockGetInputs.mockReturnValueOnce(inputs)

    await run()

    expect(mockExec).toBeCalledWith(
      'captain upload results',
      [
        '--suite-id',
        'test-suite',
        '--github-job-name',
        'some-job-name',
        '--github-job-matrix',
        '{"some":"value","other":"values"}',
        './fixtures/json-artifact.json',
        './fixtures/xml-artifact.xml'
      ],
      expect.objectContaining({
        env: expect.objectContaining({
          RWX_ACCESS_TOKEN: 'fake-token',
          CAPTAIN_HOST: 'captain.example.com'
        })
      })
    )
    expect(mockSetFailed).toBeCalledTimes(0)
  })
})
