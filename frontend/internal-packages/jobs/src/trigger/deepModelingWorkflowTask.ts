import type {
  DeepModelingParams,
  DeepModelingResult,
  NodeLogger,
} from '@liam-hq/agent'
import { createSupabaseRepositories, deepModeling } from '@liam-hq/agent'
import { logger, task } from '@trigger.dev/sdk'
import { errAsync, ResultAsync } from 'neverthrow'
import { createClient } from '../libs/supabase'

// Define type excluding schemaData (repositories and logger are now passed via config)
export type DeepModelingPayload = Omit<DeepModelingParams, 'schemaData'>

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
  machine: 'medium-1x',
  run: async (
    payload: DeepModelingPayload,
  ): Promise<ResultAsync<DeepModelingResult, Error>> => {
    logger.log('Starting Deep Modeling workflow:', {
      buildingSchemaId: payload.buildingSchemaId,
      messageLength: payload.userInput.length,
      timestamp: new Date().toISOString(),
    })

    // Create fresh repositories in job to avoid serialization issues
    // When repositories are passed from API Route to Job, class instances lose their methods
    // during JSON serialization/deserialization, causing "createMessage is not a function" errors
    const supabaseClientResult = createClient()

    if (supabaseClientResult.isErr()) {
      return errAsync(supabaseClientResult.error)
    }
    const repositories = createSupabaseRepositories(supabaseClientResult.value)

    const workflowLogger = createWorkflowLogger()

    return repositories.schema
      .getSchema(payload.designSessionId)
      .andThen((schemaResult) => {
        const deepModelingParams: DeepModelingParams = {
          ...payload,
          schemaData: schemaResult.schema,
        }

        return ResultAsync.fromPromise(
          deepModeling(deepModelingParams, {
            configurable: {
              repositories,
              logger: workflowLogger,
            },
          }),
          (err) => new Error(String(err)),
        )
      })
      .map((result) => {
        logger.log('Deep Modeling workflow completed:', {
          success: result.isOk(),
        })

        return result
      })
  },
})
