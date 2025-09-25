import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  err,
  fromPromise,
  ok,
  type Result,
  Result as ResultClass,
} from 'neverthrow'
import * as v from 'valibot'

/**
 * Load and validate input JSON files under `execution/input` for a dataset.
 * The schema and normalize function allow callers to adapt to per-executor needs.
 */
export async function loadInputFiles<
  Schema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
  T,
>(
  datasetPath: string,
  schema: Schema,
  normalize: (value: v.InferOutput<Schema>) => T,
): Promise<Result<Array<{ caseId: string; input: T }>, Error>> {
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
  if (filesResult.isErr()) return err(filesResult.error)

  const jsonFiles = filesResult.value.filter((file) => file.endsWith('.json'))
  const inputs: Array<{ caseId: string; input: T }> = []

  for (const file of jsonFiles) {
    const caseId = file.replace('.json', '')
    const contentResult = await fromPromise(
      readFile(join(inputDir, file), 'utf-8'),
      (error) =>
        error instanceof Error
          ? error
          : new Error(`Failed to read file ${file}`),
    )
    if (contentResult.isErr()) return err(contentResult.error)

    const parseResult = ResultClass.fromThrowable(
      () => JSON.parse(contentResult.value),
      (error) =>
        error instanceof Error
          ? error
          : new Error(`Failed to parse JSON in ${file}`),
    )()
    if (parseResult.isErr()) return err(parseResult.error)

    const validationResult = v.safeParse(schema, parseResult.value)
    if (!validationResult.success) {
      return err(
        new Error(
          `Invalid input format in ${file}: ${JSON.stringify(validationResult.issues)}`,
        ),
      )
    }

    const normalized: T = normalize(validationResult.output)
    inputs.push({ caseId, input: normalized })
  }

  return ok(inputs)
}
