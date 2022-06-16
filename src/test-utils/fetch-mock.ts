import fetch from 'node-fetch'
import fetchMockJest from 'fetch-mock-jest'
const fetchMock = fetch as unknown as typeof fetchMockJest

export default fetchMock
