import mockFetch from 'fetch-mock-jest'
import fetchMock from './fetch-mock'

jest.mock('node-fetch', () => mockFetch.sandbox())

afterEach(() => {
  fetchMock.mockClear()
  fetchMock.mockReset()
})
