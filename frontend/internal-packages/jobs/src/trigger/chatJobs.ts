import { createSupabaseRepositories, processChatMessage } from '@liam-hq/agent'
import type { ChatProcessorParams } from '@liam-hq/agent'
import { logger, task } from '@trigger.dev/sdk'
import { createClient } from '../libs/supabase'

// Define type excluding repositories and schemaData
type ChatJobPayload = Omit<ChatProcessorParams, 'repositories' | 'schemaData'>

export const processChatTask = task({
  id: 'process-chat-message',
  run: async (payload: ChatJobPayload) => {
    logger.log('Starting chat processing job:', {
      buildingSchemaId: payload.buildingSchemaId,
      messageLength: payload.message.length,
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
      const errorMessage =
        schemaResult.error?.message || 'Failed to fetch schema data'
      logger.log('Failed to fetch schema data:', { error: errorMessage })
      return {
        success: false,
        error: errorMessage,
      }
    }

    const chatParams: ChatProcessorParams = {
      ...payload,
      repositories,
      schemaData: schemaResult.data.schema as Parameters<
        typeof processChatMessage
      >[0]['schemaData'],
    }

    const result = await processChatMessage(chatParams)

    logger.log('Chat processing completed:', {
      success: result.success,
    })

    return result
  },
})
