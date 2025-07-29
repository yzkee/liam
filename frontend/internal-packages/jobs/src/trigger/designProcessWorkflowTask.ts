import type { DeepModelingParams, DeepModelingResult } from '@liam-hq/agent'
import { createDbAgentGraph, createSupabaseRepositories } from '@liam-hq/agent'
import { logger, task } from '@trigger.dev/sdk'
import { errAsync, ok, ResultAsync } from 'neverthrow'
import { createClient } from '../libs/supabase'

export type DesignProcessPayload = Omit<DeepModelingParams, 'schemaData'>

export const designProcessWorkflowTask = task({
  id: 'design-process-workflow',
  machine: 'medium-1x',
  run: async (
    payload: DesignProcessPayload,
  ): Promise<ResultAsync<DeepModelingResult, Error>> => {
    logger.log('Starting Design Process workflow:', {
      buildingSchemaId: payload.buildingSchemaId,
      messageLength: payload.userInput.length,
      timestamp: new Date().toISOString(),
    })

    const supabaseClientResult = createClient()

    if (supabaseClientResult.isErr()) {
      return errAsync(supabaseClientResult.error)
    }
    const repositories = createSupabaseRepositories(supabaseClientResult.value)

    return repositories.schema
      .getSchema(payload.designSessionId)
      .andThen((schemaResult) => {
        const designProcessParams: DeepModelingParams = {
          ...payload,
          schemaData: schemaResult.schema,
        }

        const compiled = createDbAgentGraph()

        return ResultAsync.fromPromise(
          compiled.invoke(designProcessParams, {
            configurable: {
              repositories,
            },
          }),
          (err) => new Error(String(err)),
        ).map((result) => ok(result))
      })
      .map((result) => {
        logger.log('Design Process workflow completed:', {
          success: result.isOk(),
        })

        return result
      })
  },
})
