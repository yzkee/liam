#!/usr/bin/env tsx

import type { Result } from 'neverthrow'
import { err, ok } from 'neverthrow'
import { deepModeling } from '../src/deepModeling'
import {
  createBuildingSchema,
  createDesignSession,
  createLogger,
  createWorkflowState,
  getLogLevel,
  logSchemaResults,
  setupDatabaseAndUser,
  showHelp,
  validateEnvironment,
} from './shared/scriptUtils'

const currentLogLevel = getLogLevel()
const logger = createLogger(currentLogLevel)

/**
 * Main execution function
 */
const executeDeepModelingProcess = async (): Promise<Result<void, Error>> => {
  // Validate environment, setup database, create session and schema with andThen chaining
  const sessionName = `Deep Modeling Session - ${new Date().toISOString()}`
  const setupResult = await validateEnvironment()
    .andThen(setupDatabaseAndUser(logger))
    .andThen(createDesignSession(sessionName))
    .andThen(createBuildingSchema)
    .andThen(createWorkflowState)

  if (setupResult.isErr()) return err(setupResult.error)
  const { repositories, workflowState } = setupResult.value

  // Execute deep modeling workflow
  const config = {
    configurable: {
      repositories,
      logger: {
        ...logger,
        log: logger.info,
      },
    },
  }

  logger.info('Starting Deep Modeling workflow execution...')

  const result = await deepModeling(workflowState, config)

  if (result.isErr()) {
    logger.error(`Deep Modeling workflow failed: ${result.error.message}`)
    return err(result.error)
  }

  const finalWorkflowState = result.value
  logger.info('Deep Modeling workflow completed successfully')

  logSchemaResults(
    logger,
    finalWorkflowState.schemaData,
    currentLogLevel,
    finalWorkflowState.error,
  )

  if (finalWorkflowState.error) {
    return err(finalWorkflowState.error)
  }

  return ok(undefined)
}

// Execute if this file is run directly
if (require.main === module) {
  // Show usage information
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    showHelp(
      'executeDeepModelingProcess.ts',
      `Executes the comprehensive Deep Modeling workflow for database schema generation.
  This script creates a design session, builds a schema, and runs the full
  deep modeling workflow including web search, requirements analysis, schema design,
  DDL execution, use case generation, DML preparation, validation, review, and
  artifact finalization.`,
      [
        'pnpm --filter @liam-hq/agent tsx scripts/executeDeepModelingProcess.ts',
        'pnpm --filter @liam-hq/agent tsx scripts/executeDeepModelingProcess.ts --log-level=DEBUG',
        'pnpm --filter @liam-hq/agent tsx scripts/executeDeepModelingProcess.ts --log-level=WARN',
      ],
    )
    process.exit(0)
  }

  logger.info(
    `Starting Deep Modeling process execution (log level: ${currentLogLevel})`,
  )

  executeDeepModelingProcess().then((result) => {
    if (result.isErr()) {
      logger.error(`FAILED: ${result.error.message}`)
      process.exit(1)
    }
  })
}
