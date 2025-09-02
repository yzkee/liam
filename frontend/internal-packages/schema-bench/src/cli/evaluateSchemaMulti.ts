#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { evaluateSchema } from '../workspace/evaluation/evaluation.ts'
import type { EvaluationConfig } from '../workspace/types'
import {
  getWorkspacePath,
  handleCliError,
  handleUnexpectedError,
} from './utils/index.ts'

async function evaluateDataset(datasetName: string, datasetPath: string) {
  const config: EvaluationConfig = {
    workspacePath: datasetPath,
    outputFormat: 'json',
  }

  const result = await evaluateSchema(config)

  if (result.isErr()) {
    console.error('   ❌ Failed to evaluate dataset')
    return { datasetName, success: false, results: null, error: result.error }
  }

  const results = result.value
  if (results && results.length > 0) {
    // Calculate and display comprehensive metrics
    const totalCases = results.length
    const metrics = {
      tableF1Score:
        results.reduce((sum, r) => sum + (r.metrics.tableF1Score || 0), 0) /
        totalCases,
      tableRecall:
        results.reduce((sum, r) => sum + (r.metrics.tableRecall || 0), 0) /
        totalCases,
      tableAllCorrectRate:
        results.reduce(
          (sum, r) => sum + (r.metrics.tableAllCorrectRate || 0),
          0,
        ) / totalCases,
      columnF1ScoreAverage:
        results.reduce(
          (sum, r) => sum + (r.metrics.columnF1ScoreAverage || 0),
          0,
        ) / totalCases,
      columnRecallAverage:
        results.reduce(
          (sum, r) => sum + (r.metrics.columnRecallAverage || 0),
          0,
        ) / totalCases,
      columnAllCorrectRateAverage:
        results.reduce(
          (sum, r) => sum + (r.metrics.columnAllCorrectRateAverage || 0),
          0,
        ) / totalCases,
      primaryKeyAccuracyAverage:
        results.reduce(
          (sum, r) => sum + (r.metrics.primaryKeyAccuracyAverage || 0),
          0,
        ) / totalCases,
      constraintAccuracy:
        results.reduce(
          (sum, r) => sum + (r.metrics.constraintAccuracy || 0),
          0,
        ) / totalCases,
      foreignKeyF1Score:
        results.reduce(
          (sum, r) => sum + (r.metrics.foreignKeyF1Score || 0),
          0,
        ) / totalCases,
      foreignKeyRecall:
        results.reduce((sum, r) => sum + (r.metrics.foreignKeyRecall || 0), 0) /
        totalCases,
      foreignKeyAllCorrectRate:
        results.reduce(
          (sum, r) => sum + (r.metrics.foreignKeyAllCorrectRate || 0),
          0,
        ) / totalCases,
      overallSchemaAccuracy:
        results.reduce(
          (sum, r) => sum + (r.metrics.overallSchemaAccuracy || 0),
          0,
        ) / totalCases,
    }
  }

  return { datasetName, success: true, results: result.value, error: null }
}

async function main() {
  const workspacePath = getWorkspacePath()

  // Define datasets to evaluate
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
    handleCliError('No datasets found to evaluate')
    return
  }

  // Evaluate datasets
  const evaluationResults = []
  for (const dataset of availableDatasets) {
    const result = await evaluateDataset(dataset.name, dataset.path)
    evaluationResults.push(result)
  }

  // Collect statistics
  let allSuccess = true
  let totalEvaluated = 0
  const failedDatasets = []

  for (const result of evaluationResults) {
    if (result.success && result.results) {
      totalEvaluated += result.results.length
    } else if (!result.success) {
      allSuccess = false
      failedDatasets.push(result.datasetName)
    }
  }

  if (failedDatasets.length > 0) {
  }

  if (!allSuccess) {
    handleCliError(`Evaluation failed for ${failedDatasets.length} dataset(s)`)
    return
  }
}

main().catch(handleUnexpectedError)
