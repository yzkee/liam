import type { DeepModelingParams, NodeLogger } from '@liam-hq/agent'
import { createSupabaseRepositories, deepModeling } from '@liam-hq/agent'
import { logger, task } from '@trigger.dev/sdk'
import { createClient } from '../libs/supabase'

// Define type excluding repositories and schemaData
type DeepModelingPayload = Omit<
  DeepModelingParams,
  'repositories' | 'schemaData'
>

function createWorkflowLogger(): NodeLogger {
  return {
    debug: (message: string, metadata?: Record<string, unknown>) => {
      logger.debug(message, metadata)
    },
    log: (message: string, metadata?: Record<string, unknown>) => {
      logger.log(message, metadata)
    },
    info: (message: string, metadata?: Record<string, unknown>) => {
      logger.info(message, metadata)
    },
    warn: (message: string, metadata?: Record<string, unknown>) => {
      logger.warn(message, metadata)
    },
    error: (message: string, metadata?: Record<string, unknown>) => {
      logger.error(message, metadata)
    },
  }
}

export const deepModelingWorkflowTask = task({
  id: 'deep-modeling-workflow',
  run: async (payload: DeepModelingPayload) => {
    logger.log('Starting Deep Modeling workflow:', {
      buildingSchemaId: payload.buildingSchemaId,
      messageLength: payload.message.length,
      timestamp: new Date().toISOString(),
    })

    // Create fresh repositories in job to avoid serialization issues
    // When repositories are passed from API Route to Job, class instances lose their methods
    // during JSON serialization/deserialization, causing "createMessage is not a function" errors
    const supabaseClient = createClient()
    const repositories = createSupabaseRepositories(supabaseClient)

    const schemaResult = await repositories.schema.getSchema(
      payload.designSessionId,
    )
    if (schemaResult.error || !schemaResult.data) {
      throw new Error(`Failed to fetch schema data: ${schemaResult.error}`)
    }

    const deepModelingParams: DeepModelingParams = {
      ...payload,
      repositories,
      schemaData: schemaResult.data.schema,
    }

    const workflowLogger = createWorkflowLogger()

    const result = await deepModeling(deepModelingParams, workflowLogger)

    logger.log('Deep Modeling workflow completed:', {
      success: result.success,
    })

    return result
  },
})
