import * as core from '@actions/core'
import {getInputs, mimeTypeFromExtension} from './utils'

jest.mock('@actions/core')
jest.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: 'rwx-research',
      repo: 'upload-vanguard-artifact'
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
    it('gathers inputs from the github context and action input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(core.getInput as jest.Mock<any>).mockImplementation(input => {
        if (input === 'artifacts') {
          return '[{"kind": "test_results", "name": "Some Name", "path": "some_path.json"}]'
        } else if (input === 'job-matrix') {
          return '{"foo": 1, "bar": 2}'
        } else if (input === 'job-name') {
          return 'Some Job Name'
        } else if (input === 'vanguard-base-url') {
          return 'https://vanguard.example.com'
        } else if (input === 'vanguard-token') {
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
        jobMatrix: {foo: 1, bar: 2},
        jobName: 'Some Job Name',
        repositoryName: 'upload-vanguard-artifact',
        runId: '1244592',
        vanguardBaseUrl: 'https://vanguard.example.com',
        vanguardToken: 'fake-token'
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(core.getInput as jest.Mock<any>).mockImplementation(input => {
        if (input === 'artifacts') {
          return '[{"kind": "test_results", "name": "Some Name", "path": "some_path.json"}]'
        } else if (input === 'job-matrix') {
          return null
        } else if (input === 'job-name') {
          return ''
        } else if (input === 'vanguard-base-url') {
          return 'https://vanguard.example.com'
        } else if (input === 'vanguard-token') {
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
        jobMatrix: null,
        jobName: 'some_job_id',
        repositoryName: 'upload-vanguard-artifact',
        runId: '1244592',
        vanguardBaseUrl: 'https://vanguard.example.com',
        vanguardToken: 'fake-token'
      })
    })
  })
})
