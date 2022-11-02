import * as core from '@actions/core'
import os from 'os'
import path from 'path'
import fs from 'fs'
import {v4} from 'uuid'
import {getInputs, Inputs} from './utils'

jest.mock('@actions/core')

describe('Test Suites', () => {
  describe('Utils', () => {
    describe('getInputs', () => {
      function setVariable(variable: string, value: string | undefined): void {
        const originalValue = process.env[variable]

        beforeEach(() => {
          if (value === undefined) {
            delete process.env[variable]
          } else {
            process.env[variable] = value
          }
        })

        afterEach(() => {
          process.env[variable] = originalValue
        })
      }

      function createTempFile(contents: string): string {
        const filepath = path.join(os.tmpdir(), v4())

        beforeEach(() => {
          fs.writeFileSync(filepath, contents)
        })

        afterEach(() => {
          fs.rmSync(filepath)
        })

        return filepath
      }

      setVariable('GITHUB_ACTOR', 'actor')
      setVariable('GITHUB_EVENT_PATH', undefined)
      setVariable('GITHUB_JOB', 'some-job')
      setVariable('GITHUB_REF_NAME', 'some-ref-name')
      setVariable('GITHUB_REPOSITORY', 'rwx-research/upload-captain-artifact')
      setVariable('GITHUB_RUN_ATTEMPT', '4')
      setVariable('GITHUB_RUN_ID', '1244592')
      setVariable('GITHUB_SHA', 'some-commit-sha')
      setVariable('GITHUB_TRIGGERING_ACTOR', undefined)

      describe('when the payload is a pull request and there is an triggering actor', () => {
        setVariable('GITHUB_TRIGGERING_ACTOR', 'triggering-actor')
        setVariable(
          'GITHUB_EVENT_PATH',
          createTempFile(
            JSON.stringify({
              pull_request: {
                head: {
                  ref: 'some-branch'
                }
              }
            })
          )
        )

        it('parses the inputs', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(core.getInput as jest.Mock<any>).mockImplementation(input => {
            if (input === 'artifacts') {
              return '[{"kind": "test_results", "name": "Some Name", "path": "some_path.json", "parser": "rspec_json"}]'
            } else if (input === 'if-files-not-found') {
              return 'warn'
            } else if (input === 'job-matrix') {
              return '{"foo": 1, "bar": 2}'
            } else if (input === 'job-name') {
              return 'Some Job Name'
            } else if (input === 'captain-base-url') {
              return 'https://captain.example.com'
            } else if (input === 'captain-token') {
              return 'fake-token'
            } else {
              return 'nonsense'
            }
          })

          expect(getInputs()).toEqual({
            accountOwner: 'rwx-research',
            attemptedBy: 'triggering-actor',
            branch: 'some-branch',
            captainBaseUrl: 'https://captain.example.com',
            captainToken: 'fake-token',
            commitMessage: undefined,
            commitSha: 'some-commit-sha',
            ifFilesNotFound: 'warn',
            jobMatrix: {foo: 1, bar: 2},
            jobName: 'Some Job Name',
            repositoryName: 'upload-captain-artifact',
            runAttempt: '4',
            runId: '1244592',
            testResultFileInputs: [
              {
                name: 'Some Name',
                path: 'some_path.json',
                format: 'rspec_json'
              }
            ]
          } as Inputs)
        })
      })

      describe('when the payload is a push and there is not an triggering actor', () => {
        setVariable(
          'GITHUB_EVENT_PATH',
          createTempFile(
            JSON.stringify({
              head_commit: {
                message: 'some-commit-message'
              }
            })
          )
        )

        it('parses the inputs', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(core.getInput as jest.Mock<any>).mockImplementation(input => {
            if (input === 'artifacts') {
              return '[{"kind": "test_results", "name": "Some Name", "path": "some_path.json", "parser": "rspec_json"}]'
            } else if (input === 'if-files-not-found') {
              return 'warn'
            } else if (input === 'job-matrix') {
              return '{"foo": 1, "bar": 2}'
            } else if (input === 'job-name') {
              return 'Some Job Name'
            } else if (input === 'captain-base-url') {
              return 'https://captain.example.com'
            } else if (input === 'captain-token') {
              return 'fake-token'
            } else {
              return 'nonsense'
            }
          })

          expect(getInputs()).toEqual({
            accountOwner: 'rwx-research',
            attemptedBy: 'actor',
            branch: 'some-ref-name',
            captainBaseUrl: 'https://captain.example.com',
            captainToken: 'fake-token',
            commitMessage: 'some-commit-message',
            commitSha: 'some-commit-sha',
            ifFilesNotFound: 'warn',
            jobMatrix: {foo: 1, bar: 2},
            jobName: 'Some Job Name',
            repositoryName: 'upload-captain-artifact',
            runAttempt: '4',
            runId: '1244592',
            testResultFileInputs: [
              {
                name: 'Some Name',
                path: 'some_path.json',
                format: 'rspec_json'
              }
            ]
          } as Inputs)
        })
      })

      describe('when the job matrix is not passed', () => {
        it('parses the inputs', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(core.getInput as jest.Mock<any>).mockImplementation(input => {
            if (input === 'artifacts') {
              return '[{"kind": "test_results", "name": "Some Name", "path": "some_path.json", "parser": "rspec_json"}]'
            } else if (input === 'if-files-not-found') {
              return 'warn'
            } else if (input === 'job-matrix') {
              return ''
            } else if (input === 'job-name') {
              return 'Some Job Name'
            } else if (input === 'captain-base-url') {
              return 'https://captain.example.com'
            } else if (input === 'captain-token') {
              return 'fake-token'
            } else {
              return 'nonsense'
            }
          })

          expect(getInputs()).toEqual({
            accountOwner: 'rwx-research',
            attemptedBy: 'actor',
            branch: 'some-ref-name',
            captainBaseUrl: 'https://captain.example.com',
            captainToken: 'fake-token',
            commitMessage: undefined,
            commitSha: 'some-commit-sha',
            ifFilesNotFound: 'warn',
            jobMatrix: undefined,
            jobName: 'Some Job Name',
            repositoryName: 'upload-captain-artifact',
            runAttempt: '4',
            runId: '1244592',
            testResultFileInputs: [
              {
                name: 'Some Name',
                path: 'some_path.json',
                format: 'rspec_json'
              }
            ]
          } as Inputs)
        })
      })

      describe('when the job name is not passed', () => {
        it('parses the inputs', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(core.getInput as jest.Mock<any>).mockImplementation(input => {
            if (input === 'artifacts') {
              return '[{"kind": "test_results", "name": "Some Name", "path": "some_path.json", "parser": "rspec_json"}]'
            } else if (input === 'if-files-not-found') {
              return 'warn'
            } else if (input === 'job-matrix') {
              return '{"foo": 1, "bar": 2}'
            } else if (input === 'job-name') {
              return ''
            } else if (input === 'captain-base-url') {
              return 'https://captain.example.com'
            } else if (input === 'captain-token') {
              return 'fake-token'
            } else {
              return 'nonsense'
            }
          })

          expect(getInputs()).toEqual({
            accountOwner: 'rwx-research',
            attemptedBy: 'actor',
            branch: 'some-ref-name',
            captainBaseUrl: 'https://captain.example.com',
            captainToken: 'fake-token',
            commitMessage: undefined,
            commitSha: 'some-commit-sha',
            ifFilesNotFound: 'warn',
            jobMatrix: {foo: 1, bar: 2},
            jobName: 'some-job',
            repositoryName: 'upload-captain-artifact',
            runAttempt: '4',
            runId: '1244592',
            testResultFileInputs: [
              {
                name: 'Some Name',
                path: 'some_path.json',
                format: 'rspec_json'
              }
            ]
          } as Inputs)
        })
      })

      describe('when artifacts are unparsable', () => {
        it('leaves an error', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(core.getInput as jest.Mock<any>).mockImplementation(input => {
            if (input === 'artifacts') {
              return '[{"]'
            } else if (input === 'captain-token') {
              return 'fake-token'
            }
          })

          expect(getInputs()).toEqual({
            errors: ["`artifacts` field isn't valid JSON."]
          })
        })
      })

      describe('when artifacts are empty', () => {
        it('leaves an error', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(core.getInput as jest.Mock<any>).mockImplementation(input => {
            if (input === 'artifacts') {
              return '[]'
            } else if (input === 'captain-token') {
              return 'fake-token'
            }
          })

          expect(getInputs()).toEqual({
            errors: [
              'You must include at least one artifact in the `artifacts` field.'
            ]
          })
        })
      })

      describe('when captain-token is missing', () => {
        it('leaves an error', () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(core.getInput as jest.Mock<any>).mockImplementation(input => {
            if (input === 'artifacts') {
              return '[{"kind": "test_results", "name": "Some Name", "path": "some_path.json"}]'
            }
          })

          expect(getInputs()).toEqual({
            errors: ["`captain-token` field can't be empty."]
          })

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(core.getInput as jest.Mock<any>).mockImplementation(input => {
            if (input === 'artifacts') {
              return '[{"kind": "test_results", "name": "Some Name", "path": "some_path.json"}]'
            } else if (input === 'captain-token') {
              return ''
            }
          })

          expect(getInputs()).toEqual({
            errors: ["`captain-token` field can't be empty."]
          })
        })
      })
    })
  })
})
