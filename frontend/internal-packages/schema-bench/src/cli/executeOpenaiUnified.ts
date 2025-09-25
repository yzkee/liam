#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'
import {
  err,
  fromPromise,
  ok,
  type Result,
  Result as ResultClass,
} from 'neverthrow'
import * as v from 'valibot'
import { OpenAIExecutor } from '../executors/openai/openaiExecutor'
import type { OpenAIExecutorInput } from '../executors/openai/types'
import {
  getWorkspacePath,
  handleCliError,
  handleUnexpectedError,
} from './utils'

type CliOptions = {
  datasets?: string[]
  useAll?: boolean
}

// Allow alphanumerics, '-', '_', 1..64 chars
const VALID_DATASET = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/

const parseArgs = (argv: string[]): CliOptions => {
  // Supported patterns:
  // - executeOpenai -all
  // - executeOpenai -default -entity-extraction
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
      if (!VALID_DATASET.test(name)) {
        handleCliError(
          `Invalid dataset token "${name}". Allowed: letters, numbers, "-", "_" (1–64 chars).`,
        )
      }
      options.datasets = [...(options.datasets ?? []), name]
    }
  }
  return options
}

const discoverDefaultDatasets = (workspacePath: string): string[] => {
  // Default behavior: run only the 'default' dataset if it exists
  const name = 'default'
  return existsSync(join(workspacePath, name)) ? [name] : []
}

const listAllDatasets = (workspacePath: string): string[] => {
  try {
    const entries = readdirSync(workspacePath, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

type DatasetResult = { datasetName: string; success: number; failure: number }

const InputSchema = v.object({
  input: v.string(),
})

async function loadInputFiles(
  datasetPath: string,
): Promise<
  Result<Array<{ caseId: string; input: OpenAIExecutorInput }>, Error>
> {
  const inputDir = join(datasetPath, 'execution/input')

  if (!existsSync(inputDir)) {
    return err(
      new Error(
        `Input directory not found: ${inputDir}. Please run setup-workspace first.`,
      ),
    )
  }

  const filesResult = await fromPromise(readdir(inputDir), (error) =>
    error instanceof Error ? error : new Error('Failed to read directory'),
  )

  if (filesResult.isErr()) {
    return err(filesResult.error)
  }

  const jsonFiles = filesResult.value.filter((file) => file.endsWith('.json'))
  const inputs: Array<{ caseId: string; input: OpenAIExecutorInput }> = []

  for (const file of jsonFiles) {
    const caseId = file.replace('.json', '')
    const contentResult = await fromPromise(
      readFile(join(inputDir, file), 'utf-8'),
      (error) =>
        error instanceof Error
          ? error
          : new Error(`Failed to read file ${file}`),
    )

    if (contentResult.isErr()) {
      return err(contentResult.error)
    }

    const parseResult = ResultClass.fromThrowable(
      () => JSON.parse(contentResult.value),
      (error) =>
        error instanceof Error
          ? error
          : new Error(`Failed to parse JSON in ${file}`),
    )()

    if (parseResult.isErr()) {
      return err(parseResult.error)
    }

    const validationResult = v.safeParse(InputSchema, parseResult.value)
    if (!validationResult.success) {
      return err(
        new Error(
          `Invalid input format in ${file}: ${JSON.stringify(validationResult.issues)}`,
        ),
      )
    }

    inputs.push({ caseId, input: validationResult.output })
  }

  return ok(inputs)
}

async function saveOutputFile(
  datasetPath: string,
  caseId: string,
  output: unknown,
): Promise<Result<void, Error>> {
  const outputDir = join(datasetPath, 'execution/output')

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  // Write/refresh the latest flat file only (no per-run archiving)
  const latestPath = join(outputDir, `${caseId}.json`)
  const latestResult = await fromPromise(
    writeFile(latestPath, JSON.stringify(output, null, 2)),
    (error) =>
      error instanceof Error
        ? error
        : new Error(`Failed to write latest output for ${caseId}`),
  )

  return latestResult.map(() => undefined)
}

async function executeCase(
  executor: OpenAIExecutor,
  datasetPath: string,
  caseId: string,
  input: OpenAIExecutorInput,
): Promise<Result<void, Error>> {
  const result = await executor.execute(input)
  if (result.isErr()) {
    return err(
      new Error(`Failed to execute ${caseId}: ${result.error.message}`),
    )
  }

  const saveResult = await saveOutputFile(datasetPath, caseId, result.value)
  if (saveResult.isErr()) {
    return saveResult
  }
  return ok(undefined)
}

const selectTargetDatasets = (
  options: CliOptions,
  workspacePath: string,
): string[] => {
  let targets: string[] = []
  if (options.useAll) {
    targets = listAllDatasets(workspacePath)
  } else if (!options.datasets || options.datasets.length === 0) {
    targets = discoverDefaultDatasets(workspacePath)
  }
  if (options.datasets && options.datasets.length > 0) {
    const union = new Set([...targets, ...options.datasets])
    targets = Array.from(union)
  }
  return targets
}

const filterAndResolveDatasets = (
  targetDatasets: string[],
  workspacePath: string,
): Array<{ name: string; path: string }> => {
  const resolvedWorkspace = resolve(workspacePath)
  const resolved: Array<{ name: string; path: string }> = []
  for (const name of targetDatasets) {
    const datasetPath = resolve(workspacePath, name)
    const rel = relative(resolvedWorkspace, datasetPath)
    if (rel.startsWith('..') || isAbsolute(rel)) {
      console.warn(`   ⚠️  Skipping invalid dataset path: ${name}`)
      continue
    }
    if (!existsSync(datasetPath)) {
      // Silently skip missing datasets to mirror existing behavior
      continue
    }
    resolved.push({ name, path: datasetPath })
  }
  return resolved
}

async function processDataset(
  executor: OpenAIExecutor,
  datasetName: string,
  datasetPath: string,
): Promise<DatasetResult> {
  const inputsResult = await loadInputFiles(datasetPath)
  if (inputsResult.isErr()) {
    console.warn(`⚠️  ${datasetName}: ${inputsResult.error.message}`)
    return { datasetName, success: 0, failure: 1 }
  }

  const inputs = inputsResult.value
  if (inputs.length === 0) {
    console.warn('   ⚠️  No input files found')
    return { datasetName, success: 0, failure: 0 }
  }

  const MAX_CONCURRENT = 5
  let successCount = 0
  let failureCount = 0

  const processBatch = async (
    batch: Array<{ caseId: string; input: OpenAIExecutorInput }>,
  ) => {
    const promises = batch.map(({ caseId, input }) =>
      executeCase(executor, datasetPath, caseId, input),
    )
    const results = await Promise.allSettled(promises)
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.isOk()) {
        successCount++
      } else {
        failureCount++
      }
    })
  }

  for (let i = 0; i < inputs.length; i += MAX_CONCURRENT) {
    const batch = inputs.slice(i, i + MAX_CONCURRENT)
    await processBatch(batch)
  }

  return { datasetName, success: successCount, failure: failureCount }
}

async function main() {
  // Load env from repo root for convenience (align with LiamDB executor)
  loadEnv({ path: resolve(__dirname, '../../../../../.env') })
  // Check API key
  const apiKey =
    process.env['OPENAI_API_KEY'] ??
    handleCliError('OPENAI_API_KEY environment variable is required')

  const options = parseArgs(process.argv)
  const workspacePath = getWorkspacePath()
  const targetDatasets = selectTargetDatasets(options, workspacePath)
  if (targetDatasets.length === 0) {
    handleCliError('No datasets found to process')
  }
  const validDatasets = filterAndResolveDatasets(targetDatasets, workspacePath)

  const executor = new OpenAIExecutor({ apiKey })

  const results: DatasetResult[] = []
  for (const { name, path } of validDatasets) {
    const r = await processDataset(executor, name, path)
    results.push(r)
  }

  if (results.length === 0) {
    handleCliError('No datasets were processed (all were missing or invalid).')
  }

  const totalFailure = results.reduce((sum, r) => sum + r.failure, 0)
  if (totalFailure > 0) {
    handleCliError(`${totalFailure} case(s) failed across selected datasets`)
  }
}

main().catch(handleUnexpectedError)
