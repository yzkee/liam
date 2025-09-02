#!/usr/bin/env node

import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { processDataset } from './executeLiamDbShared.ts'
import {
  getWorkspacePath,
  handleCliError,
  handleUnexpectedError,
} from './utils/index.ts'

type CliOptions = {
  datasets?: string[]
  useAll?: boolean
}

const parseArgs = (argv: string[]): CliOptions => {
  // Supported patterns:
  // - executeLiamDB -all
  // - executeLiamDB -default -entity-extraction
  const options: CliOptions = {}
  const args = argv.slice(2)
  for (const tok of args) {
    if (!tok || !tok.startsWith('-')) continue
    const name = tok.replace(/^-+/, '')
    if (name === 'all') {
      options.useAll = true
      continue
    }
    if (name) {
      options.datasets = [...(options.datasets ?? []), name]
    }
  }
  return options
}

const discoverDefaultDatasets = (workspacePath: string): string[] => {
  // Prefer known names, then fill up to 3 from existing dirs
  const preferred = ['default', 'entity-extraction', 'docs']
  const existing = preferred.filter((name) =>
    existsSync(join(workspacePath, name)),
  )

  if (existing.length >= 3) return existing.slice(0, 3)

  try {
    const entries = readdirSync(workspacePath, { withFileTypes: true })
    const dirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => !existing.includes(name))

    return [...existing, ...dirs].slice(0, 3)
  } catch {
    return existing
  }
}

const listAllDatasets = (workspacePath: string): string[] => {
  try {
    const entries = readdirSync(workspacePath, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

async function main() {
  const options = parseArgs(process.argv)

  const workspacePath = getWorkspacePath()
  let targetDatasets: string[] = []
  if (options.useAll) {
    targetDatasets = listAllDatasets(workspacePath)
  } else if (!options.datasets || options.datasets.length === 0) {
    targetDatasets = discoverDefaultDatasets(workspacePath)
  }
  if (options.datasets && options.datasets.length > 0) {
    const union = new Set([...targetDatasets, ...options.datasets])
    targetDatasets = Array.from(union)
  }

  if (targetDatasets.length === 0) {
    handleCliError('No datasets found to process')
    return
  }

  const results: Array<{
    datasetName: string
    success: number
    failure: number
  }> = []

  for (const name of targetDatasets) {
    const datasetPath = join(workspacePath, name)
    if (!existsSync(datasetPath)) {
      // Silently skip missing datasets to mirror existing behavior
      continue
    }
    const result = await processDataset(name, datasetPath)
    results.push(result)
  }

  const totalFailure = results.reduce((sum, r) => sum + r.failure, 0)
  if (totalFailure > 0) {
    handleCliError(`${totalFailure} case(s) failed across selected datasets`)
    return
  }
}

main().catch(handleUnexpectedError)
