import { dispatchCustomEvent } from '@langchain/core/callbacks/dispatch'
import { AIMessage, AIMessageChunk } from '@langchain/core/messages'
import { SSE_EVENTS } from '../streaming/constants'

/**
 * Options for streaming LLM response processing
 */
type StreamLLMOptions = {
  /** Name to assign to the agent (e.g., 'lead', 'qa-agent', 'pm-agent') */
  agentName: string
  /** Event type for dispatching chunks. Defaults to SSE_EVENTS.MESSAGES */
  eventType?: string
}

/**
 * Process PM Agent streaming with separate text and tool_calls handling
 */
async function processPmAgentStream(
  stream: AsyncIterable<AIMessageChunk>,
  id: string,
  agentName: string,
  eventType: string,
): Promise<AIMessageChunk | null> {
  let accumulatedChunk: AIMessageChunk | null = null

  // Process streaming chunks
  for await (const _chunk of stream) {
    const chunk = new AIMessageChunk({ ..._chunk, id, name: agentName })

    // Accumulate chunks
    accumulatedChunk = accumulatedChunk ? accumulatedChunk.concat(chunk) : chunk

    // Send text content immediately for real-time display
    if (chunk.content && chunk.content.length > 0) {
      await dispatchCustomEvent(eventType, chunk)
    }
  }

  // Send final chunk with complete tool_calls after streaming completion
  if (accumulatedChunk?.tool_calls && accumulatedChunk.tool_calls.length > 0) {
    const finalChunk = new AIMessageChunk({
      ...accumulatedChunk,
      content: [], // Text content already sent
      id,
      name: agentName,
    })

    console.info('[streamLLMResponse] Sending final tool_calls chunk:', {
      toolCallsLength: finalChunk.tool_calls?.length || 0,
      toolCallsData:
        finalChunk.tool_calls?.map((tc) => ({
          id: tc.id,
          name: tc.name,
          argsKeys: Object.keys(tc.args || {}),
          argsLength: Object.keys(tc.args || {}).length,
        })) || [],
    })

    await dispatchCustomEvent(eventType, finalChunk)
  }

  return accumulatedChunk
}

/**
 * Process legacy streaming for other agents (DB/QA)
 */
async function processLegacyStream(
  stream: AsyncIterable<AIMessageChunk>,
  id: string,
  agentName: string,
  eventType: string,
): Promise<AIMessageChunk | null> {
  let accumulatedChunk: AIMessageChunk | null = null

  // Send all chunks immediately
  for await (const _chunk of stream) {
    const chunk = new AIMessageChunk({ ..._chunk, id, name: agentName })
    await dispatchCustomEvent(eventType, chunk)

    accumulatedChunk = accumulatedChunk ? accumulatedChunk.concat(chunk) : chunk
  }

  return accumulatedChunk
}

/**
 * Process a streaming LLM response with chunk accumulation and event dispatching
 */
export async function streamLLMResponse(
  stream: AsyncIterable<AIMessageChunk>,
  options: StreamLLMOptions,
): Promise<AIMessage> {
  const { agentName, eventType = SSE_EVENTS.MESSAGES } = options

  // OpenAI ("chatcmpl-...") and LangGraph ("run-...") use different id formats,
  // so we overwrite with a UUID to unify chunk ids for consistent handling.
  const id = crypto.randomUUID()

  const accumulatedChunk =
    agentName === 'pm'
      ? await processPmAgentStream(stream, id, agentName, eventType)
      : await processLegacyStream(stream, id, agentName, eventType)

  const response = accumulatedChunk
    ? new AIMessage({
        id,
        content: accumulatedChunk.content,
        additional_kwargs: accumulatedChunk.additional_kwargs,
        name: agentName,
        ...(accumulatedChunk.tool_calls && {
          tool_calls: accumulatedChunk.tool_calls,
        }),
      })
    : new AIMessage({ id, content: '', name: agentName })

  return response
}
