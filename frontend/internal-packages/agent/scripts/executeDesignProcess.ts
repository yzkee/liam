#!/usr/bin/env tsx

import { HumanMessage } from '@langchain/core/messages'
import type { SupabaseClientType } from '@liam-hq/db'
import type { Schema } from '@liam-hq/schema'
import type { Result } from 'neverthrow'
import { err, ok, okAsync } from 'neverthrow'
import type { WorkflowState } from '../src/chat/workflow/types'
import { createDbAgentGraph } from '../src/db-agent/createDbAgentGraph'
import type { createSupabaseRepositories } from '../src/repositories/factory'
import {
  createBuildingSchema,
  createDesignSession,
  createLogger,
  getBusinessManagementSystemUserInput,
  getLogLevel,
  logSchemaResults,
  setupDatabaseAndUser,
  showHelp,
  validateEnvironment,
} from './shared/scriptUtils'
import { processStreamChunk } from './shared/streamingUtils'

const currentLogLevel = getLogLevel()
const logger = createLogger(currentLogLevel)

/**
 * Parse command line arguments
 */
const parseArgs = () => {
  // TODO(MH4GF): Implement command line argument parsing for checkpoint functionality
  // - Parse --prompt/-p for custom user input
  // - Parse --thread-id/-t for session resumption
  // - Support both --flag=value and --flag value formats
  // - Add validation for argument values
  return { prompt: undefined, threadId: undefined }
}

/**
 * Create DB Agent graph for database schema design
 */
const createSimplifiedGraph = (
  _repositories: ReturnType<typeof createSupabaseRepositories>,
) => {
  // TODO(MH4GF): Integrate checkpointer for persistent workflow state
  // return createDbAgentGraph(repositories.schema.checkpointer)
  return createDbAgentGraph()
}

/**
 * Create minimal data for the workflow
 */
type CreateWorkflowStateInput = {
  supabaseClient: SupabaseClientType
  repositories: ReturnType<typeof createSupabaseRepositories>
  organization: { id: string; name: string }
  buildingSchema: { id: string; latest_version_number: number }
  designSession: { id: string; name: string }
  user: { id: string; email: string }
}

const createWorkflowState = (
  setupData: CreateWorkflowStateInput,
  customUserInput?: string,
) => {
  const { organization, buildingSchema, designSession, user } = setupData

  // Empty schema for testing - let AI design from scratch
  const sampleSchema: Schema = {
    tables: {},
  }

  // Use custom user input if provided, otherwise use default
  const userInput = customUserInput || getBusinessManagementSystemUserInput()

  const workflowState: WorkflowState = {
    userInput,
    messages: [new HumanMessage(userInput)],
    schemaData: sampleSchema,
    buildingSchemaId: buildingSchema.id,
    latestVersionNumber: buildingSchema.latest_version_number,
    designSessionId: designSession.id,
    userId: user.id,
    organizationId: organization.id,
    retryCount: {},
  }

  return okAsync({
    ...setupData,
    workflowState,
  })
}

/**
 * Main execution function
 */
const executeDesignProcess = async (
  customPrompt?: string,
  resumeThreadId?: string,
): Promise<Result<void, Error>> => {
  // TODO(MH4GF): Implement thread_id-based session resumption using checkpointer
  // - When resumeThreadId is provided, use findExistingSession to retrieve session state
  // - Create workflow state with existing schema data instead of empty schema
  // - Preserve session history and context through checkpoint system
  // - Handle workflow configuration for resumed sessions
  // - Add proper error handling for non-existent sessions

  if (resumeThreadId) {
    return err(
      new Error(
        'Session resumption not yet implemented - checkpoint functionality needed',
      ),
    )
  }

  // Create new session (existing implementation)
  const sessionName = `Design Session - ${new Date().toISOString()}`
  const setupResult = await validateEnvironment()
    .andThen(setupDatabaseAndUser(logger))
    .andThen(createDesignSession(sessionName))
    .andThen(createBuildingSchema)
    .andThen((data) => createWorkflowState(data, customPrompt))

  if (setupResult.isErr()) return err(setupResult.error)
  const { repositories, workflowState } = setupResult.value

  // Execute workflow
  const config = {
    configurable: {
      repositories,
      logger,
      buildingSchemaId: workflowState.buildingSchemaId,
      latestVersionNumber: workflowState.latestVersionNumber,
      thread_id: workflowState.designSessionId,
    },
  }
  const graph = createSimplifiedGraph(repositories)

  logger.info('Starting AI workflow execution...')

  // Use streaming with proper async iterator handling
  const streamResult = await (async () => {
    const stream = await graph.stream(workflowState, {
      configurable: config.configurable,
      recursionLimit: 100,
      streamMode: 'values',
    })

    let finalResult = null

    for await (const chunk of stream) {
      processStreamChunk(logger, chunk)
      finalResult = chunk
    }

    return finalResult
  })()

  if (!streamResult) {
    return err(new Error('No result received from workflow'))
  }

  logger.info('Workflow completed')

  // TODO(MH4GF): Add thread_id logging for session tracking
  // Log the thread_id for future reference when resuming sessions

  logSchemaResults(logger, streamResult.schemaData, currentLogLevel, undefined)

  return ok(undefined)
}

// Execute if this file is run directly
if (require.main === module) {
  // Parse command line arguments
  const { prompt, threadId } = parseArgs()

  // Show usage information
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    showHelp(
      'executeDesignProcess.ts',
      `Executes the design process workflow for database schema generation.
  This script creates a design session, builds a schema, and runs the
  design workflow using LangGraph with checkpoint support.

  Additional Options:
    --prompt, -p <text>     Custom prompt for the AI
    --thread-id, -t <id>    Resume from existing design session (thread ID)`,
      [
        'pnpm --filter @liam-hq/agent execute-design-process',
        'pnpm --filter @liam-hq/agent execute-design-process --prompt "Create a user management system"',
        'pnpm --filter @liam-hq/agent execute-design-process --thread-id abc-123 --prompt "Add more tables"',
        'pnpm --filter @liam-hq/agent execute-design-process:debug',
      ],
    )
    process.exit(0)
  }

  logger.info(
    `Starting design process execution (log level: ${currentLogLevel})`,
  )

  // TODO(MH4GF): Add comprehensive checkpoint-aware execution flow
  // - Handle threadId-based resumption with proper logging
  // - Add custom prompt support for both new and resumed sessions
  // - Log thread_id for future session resumption
  // - Add session completion status tracking

  executeDesignProcess(prompt, threadId).then((result) => {
    if (result.isErr()) {
      logger.error(`FAILED: ${result.error.message}`)
      process.exit(1)
    }

    logger.info('Design session completed successfully')
  })
}
