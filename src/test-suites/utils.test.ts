import * as core from '@actions/core'
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

      setVariable('GITHUB_JOB', 'some-job')

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
          captainBaseUrl: 'https://captain.example.com',
          captainToken: 'fake-token',
          ifFilesNotFound: 'warn',
          jobMatrix: {foo: 1, bar: 2},
          jobName: 'Some Job Name',
          testResults: [
            {
              testSuiteIdentifier: 'Some Name',
              originalPath: 'some_path.json',
              format: 'rspec_json'
            }
          ]
        } as Inputs)
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
            captainBaseUrl: 'https://captain.example.com',
            captainToken: 'fake-token',
            ifFilesNotFound: 'warn',
            jobMatrix: undefined,
            jobName: 'Some Job Name',
            testResults: [
              {
                testSuiteIdentifier: 'Some Name',
                originalPath: 'some_path.json',
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
            captainBaseUrl: 'https://captain.example.com',
            captainToken: 'fake-token',
            ifFilesNotFound: 'warn',
            jobMatrix: {foo: 1, bar: 2},
            jobName: 'some-job',
            testResults: [
              {
                testSuiteIdentifier: 'Some Name',
                originalPath: 'some_path.json',
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
