#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { processDataset } from './executeLiamDbShared.ts'
import {
  getWorkspacePath,
  handleCliError,
  handleUnexpectedError,
} from './utils/index.ts'

async function main() {
  const workspacePath = getWorkspacePath()

  // Define datasets to process
  const datasets = [
    { name: 'default', path: join(workspacePath, 'default') },
    {
      name: 'entity-extraction',
      path: join(workspacePath, 'entity-extraction'),
    },
  ]

  // Check which datasets exist
  const availableDatasets = datasets.filter((dataset) => {
    const exists = existsSync(dataset.path)
    if (!exists) {
      console.warn(`⚠️  Dataset "${dataset.name}" not found at ${dataset.path}`)
    }
    return exists
  })

  if (availableDatasets.length === 0) {
    handleCliError('No datasets found to process')
    return
  }

  // Process datasets sequentially for clearer output
  const results: Array<{
    datasetName: string
    success: number
    failure: number
  }> = []
  for (const dataset of availableDatasets) {
    const result = await processDataset(dataset.name, dataset.path)
    results.push(result)
  }

  // Calculate totals
  let totalSuccess = 0
  let totalFailure = 0

  for (const result of results) {
    totalSuccess += result.success
    totalFailure += result.failure
  }

  if (totalFailure > 0) {
    handleCliError(`${totalFailure} case(s) failed across all datasets`)
    return
  }
}

main().catch(handleUnexpectedError)
