#!/usr/bin/env tsx

import { HumanMessage } from '@langchain/core/messages'
import type { Schema } from '@liam-hq/schema'
import type { Result } from 'neverthrow'
import { err, errAsync, ok, okAsync, ResultAsync } from 'neverthrow'
import type { WorkflowState } from '../src/chat/workflow/types'
import { createDbAgentGraph } from '../src/db-agent/createDbAgentGraph'
import { hasHelpFlag, parseDesignProcessArgs } from './shared/argumentParser'
import {
  createBuildingSchema,
  createDesignSession,
  createLogger,
  getBusinessManagementSystemUserInput,
  getLogLevel,
  logSchemaResults,
  type SetupDatabaseAndUserResult,
  setupDatabaseAndUser,
  showHelp,
  validateEnvironment,
} from './shared/scriptUtils'
import { processStreamChunk } from './shared/streamingUtils'

const currentLogLevel = getLogLevel()
const logger = createLogger(currentLogLevel)

/**
 * Fetch existing design session from database
 */
const fetchDesignSession =
  (threadId: string) => (setupData: SetupDatabaseAndUserResult) => {
    const { supabaseClient } = setupData

    return ResultAsync.fromPromise(
      supabaseClient
        .from('design_sessions')
        .select('id, name')
        .eq('id', threadId)
        .single(),
      (error) => new Error(`Failed to fetch design session: ${error}`),
    ).andThen(({ data, error }) => {
      if (error || !data) {
        return errAsync(
          new Error(
            `Design session not found for thread ID ${threadId}: ${error?.message || 'No data'}`,
          ),
        )
      }
      logger.info(`Found design session: ${data.name}`)
      return okAsync({
        ...setupData,
        designSession: data,
      })
    })
  }

/**
 * Type for setup data with design session
 */
type SetupDataWithDesignSession = SetupDatabaseAndUserResult & {
  designSession: { id: string; name: string }
}

/**
 * Fetch existing building schema from database with latest version number
 */
const fetchBuildingSchema = (setupData: SetupDataWithDesignSession) => {
  const { supabaseClient, designSession } = setupData

  // First fetch the building schema
  return ResultAsync.fromPromise(
    supabaseClient
      .from('building_schemas')
      .select('id')
      .eq('design_session_id', designSession.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    (error) => new Error(`Failed to fetch building schema: ${error}`),
  ).andThen(({ data: schemaData, error: schemaError }) => {
    if (schemaError || !schemaData) {
      return errAsync(
        new Error(
          `Building schema not found for design session ${designSession.id}: ${schemaError?.message || 'No data'}`,
        ),
      )
    }

    // Then fetch the latest version number
    return ResultAsync.fromPromise(
      supabaseClient
        .from('building_schema_versions')
        .select('number')
        .eq('building_schema_id', schemaData.id)
        .order('number', { ascending: false })
        .limit(1)
        .maybeSingle(),
      (error) => new Error(`Failed to fetch building schema version: ${error}`),
    ).andThen(({ data: versionData }) => {
      // If no versions exist yet, use 0
      const latestVersionNumber = versionData?.number ?? 0

      logger.info(
        `Found building schema: ${schemaData.id} (version: ${latestVersionNumber})`,
      )

      return okAsync({
        ...setupData,
        buildingSchema: {
          id: schemaData.id,
          latest_version_number: latestVersionNumber,
        },
      })
    })
  })
}

/**
 * Find or create design session
 */
const findOrCreateDesignSession =
  (resumeThreadId?: string) => (setupData: SetupDatabaseAndUserResult) => {
    if (resumeThreadId) {
      return fetchDesignSession(resumeThreadId)(setupData).andThen(
        fetchBuildingSchema,
      )
    }

    return createDesignSession(setupData).andThen(createBuildingSchema)
  }

/**
 * Create workflow state
 */
type CreateWorkflowStateInput = SetupDatabaseAndUserResult & {
  buildingSchema: { id: string; latest_version_number: number }
  designSession: { id: string; name: string }
}

const createWorkflowState = (
  setupData: CreateWorkflowStateInput,
  customUserInput?: string,
  _isResume = false,
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
  const setupResult = await validateEnvironment()
    .andThen(setupDatabaseAndUser(logger))
    .andThen(findOrCreateDesignSession(resumeThreadId))
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
  const graph = createDbAgentGraph(repositories.schema.checkpointer)

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

  // Log the thread_id for future reference when resuming sessions
  const sessionThreadId = workflowState.designSessionId
  logger.info(`Session thread ID: ${sessionThreadId}`)
  logger.info(
    `To resume this session later, use: --thread-id ${sessionThreadId}`,
  )

  logSchemaResults(logger, streamResult.schemaData, currentLogLevel, undefined)

  return ok(undefined)
}

// Execute if this file is run directly
if (require.main === module) {
  // Parse command line arguments
  const { prompt, threadId } = parseDesignProcessArgs()

  // Show usage information
  if (hasHelpFlag()) {
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

  executeDesignProcess(prompt, threadId).then((result) => {
    if (result.isErr()) {
      logger.error(`FAILED: ${result.error.message}`)
      process.exit(1)
    }

    logger.info('Design session completed successfully')
  })
}
