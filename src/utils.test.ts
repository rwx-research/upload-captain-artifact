import {mimeTypeFromExtension} from './utils'

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
})
