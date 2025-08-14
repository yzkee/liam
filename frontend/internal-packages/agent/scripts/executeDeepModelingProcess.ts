#!/usr/bin/env tsx

import type { BaseMessage } from '@langchain/core/messages'
import { HumanMessage } from '@langchain/core/messages'
import type { Schema } from '@liam-hq/schema'
import type { Result } from 'neverthrow'
import { err, errAsync, ok, okAsync, ResultAsync } from 'neverthrow'
import { isToolMessageError } from '../src/chat/workflow/utils/toolMessageUtils'
import { createGraph } from '../src/createGraph'
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
import type { Logger } from './shared/types'

const currentLogLevel = getLogLevel()
const logger = createLogger(currentLogLevel)

/**
 * Fetch existing design session from database
 */
const fetchDesignSession =
  (sessionId: string) => (setupData: SetupDatabaseAndUserResult) => {
    const { supabaseClient } = setupData

    return ResultAsync.fromPromise(
      supabaseClient
        .from('design_sessions')
        .select('id, name')
        .eq('id', sessionId)
        .single(),
      (error) => new Error(`Failed to fetch design session: ${error}`),
    ).andThen(({ data, error }) => {
      if (error || !data) {
        return errAsync(
          new Error(
            `Design session not found for session ID ${sessionId}: ${error?.message || 'No data'}`,
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
  (resumeSessionId?: string) => (setupData: SetupDatabaseAndUserResult) => {
    if (resumeSessionId) {
      return fetchDesignSession(resumeSessionId)(setupData).andThen(
        fetchBuildingSchema,
      )
    }

    return createDesignSession(setupData).andThen(createBuildingSchema)
  }

/**
 * Create workflow state for deep modeling
 */
type CreateWorkflowStateInput = SetupDatabaseAndUserResult & {
  buildingSchema: { id: string; latest_version_number: number }
  designSession: { id: string; name: string }
}

const createWorkflowStateForDeepModeling = (
  setupData: CreateWorkflowStateInput,
  customUserInput?: string,
) => {
  const { organization, buildingSchema, designSession, user, repositories } =
    setupData

  const sampleSchema: Schema = {
    tables: {},
    enums: {},
  }

  const userInput = customUserInput || getBusinessManagementSystemUserInput()

  return okAsync({
    ...setupData,
    workflowState: {
      userInput,
      messages: [new HumanMessage(userInput)],
      schemaData: sampleSchema,
      buildingSchemaId: buildingSchema.id,
      latestVersionNumber: buildingSchema.latest_version_number,
      designSessionId: designSession.id,
      userId: user.id,
      organizationId: organization.id,
      retryCount: {},
    },
    options: {
      configurable: {
        repositories,
        thread_id: designSession.id,
      },
      recursionLimit: 50,
      streamMode: 'values' as const,
    },
  })
}

const logWorkflowMessage = (
  logger: Logger,
  message: BaseMessage,
  index: number,
) => {
  const messageType = message.constructor.name
    .toLowerCase()
    .replace('message', '')
  const content = message.text

  // Check if this is a ToolMessage with an error
  if (isToolMessageError(message)) {
    logger.error(
      `  ${index + 1}. [${messageType}] ${content.substring(0, 200)}${
        content.length > 200 ? '...' : ''
      }`,
    )
    return
  }

  logger.info(
    `  ${index + 1}. [${messageType}] ${content.substring(0, 200)}${
      content.length > 200 ? '...' : ''
    }`,
  )
}

/**
 * Main execution function
 */
const executeDeepModelingProcess = async (
  customPrompt?: string,
  resumeSessionId?: string,
): Promise<Result<void, Error>> => {
  const setupResult = await validateEnvironment()
    .andThen(setupDatabaseAndUser(logger))
    .andThen(findOrCreateDesignSession(resumeSessionId))
    .andThen((data) => createWorkflowStateForDeepModeling(data, customPrompt))

  if (setupResult.isErr()) return err(setupResult.error)
  const { workflowState, options } = setupResult.value

  const graph = createGraph(
    options.configurable.repositories.schema.checkpointer,
  )

  logger.info('Starting Deep Modeling workflow execution...')

  // Use streaming with proper async iterator handling
  const streamResult = await (async () => {
    const stream = await graph.stream(workflowState, options)

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

  logger.info('Deep Modeling workflow completed successfully')

  const sessionId = workflowState.designSessionId
  logger.info(`Session ID: ${sessionId}`)
  logger.info(`To resume this session later, use: --session-id ${sessionId}`)

  if (streamResult.messages && streamResult.messages.length > 0) {
    logger.info('Workflow Messages:')
    streamResult.messages.forEach((message, index) => {
      logWorkflowMessage(logger, message, index)
    })
  }

  if (currentLogLevel === 'DEBUG') {
    logger.debug('Final Schema Data:', {
      schemaData: streamResult.schemaData,
    })
  }

  logSchemaResults(logger, streamResult.schemaData, currentLogLevel, undefined)

  return ok(undefined)
}

// Execute if this file is run directly
if (require.main === module) {
  const { prompt, sessionId } = parseDesignProcessArgs()

  if (hasHelpFlag()) {
    showHelp(
      'executeDeepModelingProcess.ts',
      `Executes the comprehensive Deep Modeling workflow for database schema generation.
  This script creates a design session, builds a schema, and runs the full
  deep modeling workflow including web search, requirements analysis, schema design,
  DDL execution, use case generation, DML preparation, validation, review, and
  artifact finalization.

  Additional Options:
    --prompt, -p <text>     Custom prompt for the AI
    --session-id, -s <id>   Resume from existing design session (session ID)`,
      [
        'pnpm --filter @liam-hq/agent tsx scripts/executeDeepModelingProcess.ts',
        'pnpm --filter @liam-hq/agent tsx scripts/executeDeepModelingProcess.ts --prompt "Create a user management system"',
        'pnpm --filter @liam-hq/agent tsx scripts/executeDeepModelingProcess.ts --session-id abc-123 --prompt "Add more tables"',
        'pnpm --filter @liam-hq/agent tsx scripts/executeDeepModelingProcess.ts --log-level=DEBUG',
      ],
    )
    process.exit(0)
  }

  logger.info(
    `Starting Deep Modeling process execution (log level: ${currentLogLevel})`,
  )

  executeDeepModelingProcess(prompt, sessionId).then((result) => {
    if (result.isErr()) {
      logger.error(`FAILED: ${result.error.message}`)
      process.exit(1)
    }

    logger.info('Deep Modeling session completed successfully')
  })
}
