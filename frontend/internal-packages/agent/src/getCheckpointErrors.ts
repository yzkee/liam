import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint'

type ErrorInfo = {
  message: string
  nodeSource: string
}

/**
 * Extract error information from error channel data
 */
function extractErrorInfo(errorChannelData: unknown): ErrorInfo {
  let errorMessage = 'Unknown error'
  let nodeSource = 'unknown'

  if (typeof errorChannelData === 'string') {
    errorMessage = errorChannelData
  } else if (
    typeof errorChannelData === 'object' &&
    errorChannelData !== null
  ) {
    if ('message' in errorChannelData) {
      errorMessage = String(errorChannelData.message)
    }
    if ('node' in errorChannelData) {
      nodeSource = String(errorChannelData.node)
    }
    if (
      'error' in errorChannelData &&
      typeof errorChannelData.error === 'object' &&
      errorChannelData.error !== null &&
      'message' in errorChannelData.error
    ) {
      errorMessage = String(errorChannelData.error.message)
    }
  }

  return { message: errorMessage, nodeSource }
}

/**
 * Extract error information from LangGraph checkpoints for a design session
 *
 * This function examines checkpoint history to find errors that occurred during
 * workflow execution, particularly from validateInitialSchemaNode and other error-prone nodes.
 */
export async function getCheckpointErrors(
  checkpointer: BaseCheckpointSaver,
  threadId: string,
): Promise<string[]> {
  const checkpointConfig = {
    configurable: {
      thread_id: threadId,
    },
  }

  const checkpointTuple = await checkpointer.getTuple(checkpointConfig)
  if (!checkpointTuple || !checkpointTuple.checkpoint) {
    return []
  }

  const errorMessages: string[] = []

  // Check pendingWrites for __error__ channel
  if (checkpointTuple.pendingWrites) {
    for (const [, channel, value] of checkpointTuple.pendingWrites) {
      if (channel === '__error__') {
        const errorInfo = extractErrorInfo(value)
        errorMessages.push(errorInfo.message)
      }
    }
  }

  return errorMessages
}
