import {BulkArtifactMimeType} from './api/vanguard'

export function mimeTypeFromExtension(extension: string): BulkArtifactMimeType {
  const lowerCaseExtension = extension.toLowerCase()

  if (lowerCaseExtension.toLowerCase() === '.json') {
    return 'application/json'
  } else if (lowerCaseExtension === '.xml') {
    return 'application/xml'
  }

  throw new Error('Only .json and .xml files are permitted.')
}
