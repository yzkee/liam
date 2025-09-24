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
 * Process streaming with deferred tool_calls - text sent immediately, complete tool_calls sent after streaming finishes
 */
async function processStreamWithDeferredToolCalls(
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

    await dispatchCustomEvent(eventType, finalChunk)
  }

  return accumulatedChunk
}

/**
 * Process streaming with immediate dispatch - all chunks sent immediately as they arrive
 */
async function processStreamWithImmediateDispatch(
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

  // PM Agent needs special handling due to GPT-5's chunked tool_calls response pattern
  // that sends empty tool arguments during streaming. Other agents work fine with immediate dispatch.
  const accumulatedChunk =
    agentName === 'pm'
      ? await processStreamWithDeferredToolCalls(
          stream,
          id,
          agentName,
          eventType,
        )
      : await processStreamWithImmediateDispatch(
          stream,
          id,
          agentName,
          eventType,
        )

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
