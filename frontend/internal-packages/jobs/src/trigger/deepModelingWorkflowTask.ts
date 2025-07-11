import type { DeepModelingParams } from '@liam-hq/agent'
import { createSupabaseRepositories, deepModeling } from '@liam-hq/agent'
import { logger, task } from '@trigger.dev/sdk'
import { createClient } from '../libs/supabase'

// Define type excluding schemaData (repositories and logger are now passed via config)
type DeepModelingPayload = Omit<DeepModelingParams, 'schemaData'>

export const deepModelingWorkflowTask = task({
  id: 'deep-modeling-workflow',
  machine: 'medium-1x',
  run: async (payload: DeepModelingPayload) => {
    logger.log('Starting Deep Modeling workflow:', {
      buildingSchemaId: payload.buildingSchemaId,
      messageLength: payload.userInput.length,
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
      schemaData: schemaResult.data.schema,
    }

    const result = await deepModeling(deepModelingParams, {
      configurable: {
        repositories,
      },
    })

    logger.log('Deep Modeling workflow completed:', {
      success: result.isOk(),
    })

    return result
  },
})
