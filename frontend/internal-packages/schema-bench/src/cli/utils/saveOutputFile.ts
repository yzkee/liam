import { existsSync, mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fromPromise, type Result } from 'neverthrow'

/**
 * Save output JSON for a case under execution/output (overwrites latest).
 */
export async function saveOutputFile(
  datasetPath: string,
  caseId: string,
  output: unknown,
): Promise<Result<void, Error>> {
  const outputDir = join(datasetPath, 'execution/output')
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

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
