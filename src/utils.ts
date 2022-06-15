import {BulkArtifactMimeType} from './api/vanguard'

export function mimeTypeFromExtension(extension: string): BulkArtifactMimeType {
  if (extension === '.json') {
    return 'application/json'
  } else if (extension === '.xml') {
    return 'application/xml'
  }

  throw new Error('Only .json and .xml files are permitted.')
}
