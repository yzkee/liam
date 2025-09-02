#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  getWorkspacePath,
  handleCliError,
  handleUnexpectedError,
} from './utils/index.ts'
import { processDataset } from './executeLiamDbShared.ts'

async function main() {
  const datasetName = 'default'
  const datasetPath = join(getWorkspacePath(), datasetName)

  if (!existsSync(datasetPath)) {
    handleCliError(`Dataset "${datasetName}" not found at ${datasetPath}`)
    return
  }

  const result = await processDataset(datasetName, datasetPath)
  if (result.failure > 0) {
    handleCliError(`${result.failure} case(s) failed in dataset "${datasetName}"`)
    return
  }
}

main().catch(handleUnexpectedError)

