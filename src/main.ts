import * as core from '@actions/core'
import testSuitesRun from './test-suites/run'
import setupCaptain from './setup-captain'

async function main(): Promise<void> {
  try {
    await setupCaptain()
    await testSuitesRun()
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed(error as string)
    }
  }
}

main()
