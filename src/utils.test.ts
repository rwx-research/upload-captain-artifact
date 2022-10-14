import * as core from '@actions/core'
import {getInputs, mimeTypeFromExtension} from './utils'

jest.mock('@actions/core')
jest.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: 'rwx-research',
      repo: 'upload-captain-artifact'
    },
    job: 'some_job_id',
    runId: 1244592
  }
}))

describe('Utils', () => {
  describe('mimeTypeFromExtension', () => {
    it('can detect JSON', () => {
      expect(mimeTypeFromExtension('.json')).toEqual('application/json')
      expect(mimeTypeFromExtension('.JSON')).toEqual('application/json')
    })

    it('can detect XML', () => {
      expect(mimeTypeFromExtension('.xml')).toEqual('application/xml')
      expect(mimeTypeFromExtension('.XML')).toEqual('application/xml')
    })

    it('throws otherwise', () => {
      expect(() => mimeTypeFromExtension('.jsonl')).toThrowError(
        'Only .json and .xml files are permitted.'
      )
      expect(() => mimeTypeFromExtension('.xmlish')).toThrowError(
        'Only .json and .xml files are permitted.'
      )
    })
  })

  describe('getInputs', () => {
    const originalRunAttempt = process.env.GITHUB_RUN_ATTEMPT

    beforeEach(() => {
      process.env.GITHUB_RUN_ATTEMPT = '4'
    })

    afterEach(() => {
      process.env.GITHUB_RUN_ATTEMPT = originalRunAttempt
    })

    it('gathers inputs from the github context and action input', () => {
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
        accountName: 'rwx-research',
        artifacts: [
          {
            kind: 'test_results',
            name: 'Some Name',
            path: 'some_path.json',
            parser: 'rspec_json'
          }
        ],
        ifFilesNotFound: 'warn',
        jobMatrix: {foo: 1, bar: 2},
        jobName: 'Some Job Name',
        repositoryName: 'upload-captain-artifact',
        runId: '1244592',
        runAttempt: 4,
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(core.getInput as jest.Mock<any>).mockImplementation(input => {
        if (input === 'artifacts') {
          return '[{"kind": "test_results", "name": "Some Name", "path": "some_path.json"}]'
        } else if (input === 'if-files-not-found') {
          return 'ignore'
        } else if (input === 'job-matrix') {
          return null
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
        accountName: 'rwx-research',
        artifacts: [
          {kind: 'test_results', name: 'Some Name', path: 'some_path.json'}
        ],
        ifFilesNotFound: 'ignore',
        jobMatrix: null,
        jobName: 'some_job_id',
        repositoryName: 'upload-captain-artifact',
        runId: '1244592',
        runAttempt: 4,
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      })
    })

    it('handles a missing value for job-matrix', () => {
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
        accountName: 'rwx-research',
        artifacts: [
          {
            kind: 'test_results',
            name: 'Some Name',
            path: 'some_path.json',
            parser: 'rspec_json'
          }
        ],
        ifFilesNotFound: 'warn',
        jobMatrix: null,
        jobName: 'Some Job Name',
        repositoryName: 'upload-captain-artifact',
        runId: '1244592',
        runAttempt: 4,
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(core.getInput as jest.Mock<any>).mockImplementation(input => {
        if (input === 'artifacts') {
          return '[{"kind": "test_results", "name": "Some Name", "path": "some_path.json"}]'
        } else if (input === 'if-files-not-found') {
          return 'ignore'
        } else if (input === 'job-matrix') {
          return null
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
        accountName: 'rwx-research',
        artifacts: [
          {kind: 'test_results', name: 'Some Name', path: 'some_path.json'}
        ],
        ifFilesNotFound: 'ignore',
        jobMatrix: null,
        jobName: 'some_job_id',
        repositoryName: 'upload-captain-artifact',
        runId: '1244592',
        runAttempt: 4,
        captainBaseUrl: 'https://captain.example.com',
        captainToken: 'fake-token'
      })
    })

    it('leaves an error when artifacts are unparsable', () => {
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

    it('leaves an error when artifacts is empty', () => {
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

    it('leaves an error when captain_token is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(core.getInput as jest.Mock<any>).mockImplementation(input => {
        if (input === 'artifacts') {
          return '[{"kind": "test_results", "name": "Some Name", "path": "some_path.json"}]'
        }
      })

      expect(getInputs()).toEqual({
        errors: ["`captain_token` field can't be empty."]
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
        errors: ["`captain_token` field can't be empty."]
      })
    })
  })
})
