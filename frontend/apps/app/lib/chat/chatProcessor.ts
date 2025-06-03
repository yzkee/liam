import { convertSchemaToText } from '@/app/lib/schema/convertSchemaToText'
import { isSchemaUpdated } from '@/app/lib/vectorstore/supabaseVectorStore'
import { syncSchemaVectorStore } from '@/app/lib/vectorstore/syncSchemaVectorStore'
import { mastra } from '@/lib/mastra'
import type { Schema } from '@liam-hq/db-structure'

interface ChatProcessorParams {
  message: string
  schemaData: Schema
  history?: [string, string][]
  mode: 'build' | 'ask'
  projectId: string
}

interface ChatProcessorResult {
  text: string
  success: boolean
  error?: string
}

// streaming mode
export function processChatMessage(
  params: ChatProcessorParams,
  options?: { streaming?: true },
): AsyncGenerator<
  { type: 'text' | 'error'; content: string },
  ChatProcessorResult,
  unknown
>

// non-streaming mode
export function processChatMessage(
  params: ChatProcessorParams,
  options: { streaming: false },
): Promise<ChatProcessorResult>

// implementation
export function processChatMessage(
  params: ChatProcessorParams,
  options: { streaming?: boolean } = { streaming: true },
):
  | Promise<ChatProcessorResult>
  | AsyncGenerator<
      { type: 'text' | 'error'; content: string },
      ChatProcessorResult,
      unknown
    > {
  const streaming = options.streaming ?? true

  if (streaming) {
    return processChatMessageStreaming(params)
  }

  return processChatMessageSync(params)
}

// non-streaming implementation (based on original implementation)
async function processChatMessageSync(
  params: ChatProcessorParams,
): Promise<ChatProcessorResult> {
  const { message, schemaData, history, mode, projectId } = params

  try {
    // Determine which agent to use based on the mode
    const agentName =
      mode === 'build' ? 'databaseSchemaBuildAgent' : 'databaseSchemaAskAgent'

    // Check if schema has been updated
    const schemaUpdated = await isSchemaUpdated(schemaData)

    if (schemaUpdated) {
      try {
        // Synchronize vector store
        await syncSchemaVectorStore(schemaData, projectId)
        // Log success message
        process.stdout.write('Vector store synchronized successfully.\n')
      } catch (syncError) {
        // Log error but continue with chat processing
        process.stderr.write(
          `Warning: Failed to synchronize vector store: ${syncError}\n`,
        )
      }
    }

    // Format chat history for prompt
    const formattedChatHistory =
      history && history.length > 0
        ? history
            .map((msg: [string, string]) => `${msg[0]}: ${msg[1]}`)
            .join('\n')
        : 'No previous conversation.'

    // Convert schema to text
    const schemaText = convertSchemaToText(schemaData)

    // Get the agent from Mastra
    const agent = mastra.getAgent(agentName)
    if (!agent) {
      throw new Error(`${agentName} not found in Mastra instance`)
    }

    // Create a response using the agent
    const response = await agent.generate([
      {
        role: 'system',
        content: `
Complete Schema Information:
${schemaText}

Previous conversation:
${formattedChatHistory}
`,
      },
      {
        role: 'user',
        content: message,
      },
    ])

    return {
      text: response.text,
      success: true,
    }
  } catch (error) {
    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// streaming implementation
async function* processChatMessageStreaming(
  params: ChatProcessorParams,
): AsyncGenerator<
  { type: 'text' | 'error'; content: string },
  ChatProcessorResult,
  unknown
> {
  const { message, schemaData, history, mode, projectId } = params

  try {
    // Determine which agent to use based on the mode
    const agentName =
      mode === 'build' ? 'databaseSchemaBuildAgent' : 'databaseSchemaAskAgent'

    // Check if schema has been updated
    const schemaUpdated = await isSchemaUpdated(schemaData)

    if (schemaUpdated) {
      try {
        // Synchronize vector store
        await syncSchemaVectorStore(schemaData, projectId)
      } catch (syncError) {
        // Yield error but continue with chat processing
        yield {
          type: 'error',
          content: `Warning: Failed to synchronize vector store: ${syncError}`,
        }
      }
    }

    // Format chat history for prompt
    const formattedChatHistory =
      history && history.length > 0
        ? history
            .map((msg: [string, string]) => `${msg[0]}: ${msg[1]}`)
            .join('\n')
        : 'No previous conversation.'

    // Convert schema to text
    const schemaText = convertSchemaToText(schemaData)

    // Get the agent from Mastra
    const agent = mastra.getAgent(agentName)
    if (!agent) {
      const errorMsg = `${agentName} not found in Mastra instance`
      yield { type: 'error', content: errorMsg }
      return {
        text: '',
        success: false,
        error: errorMsg,
      }
    }

    // Create the prompt
    const prompt = [
      {
        role: 'system' as const,
        content: `
Complete Schema Information:
${schemaText}

Previous conversation:
${formattedChatHistory}
`,
      },
      {
        role: 'user' as const,
        content: message,
      },
    ]

    // Stream the response using the agent
    const stream = await agent.stream(prompt)

    // Process and yield each chunk
    let fullText = ''
    for await (const chunk of stream.textStream) {
      fullText += chunk
      yield { type: 'text', content: chunk }
    }

    // Return the complete result
    return {
      text: fullText,
      success: true,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    yield { type: 'error', content: errorMsg }
    return {
      text: '',
      success: false,
      error: errorMsg,
    }
  }
}
