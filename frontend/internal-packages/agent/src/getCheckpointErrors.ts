import type { WorkflowConfigurable } from './types'

export type CheckpointError = {
  checkpointId: string
  timestamp: string
  errorMessage: string
  nodeSource: string
  metadata?: Record<string, unknown>
}

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
export async function getCheckpointErrors(config: {
  configurable: WorkflowConfigurable
}): Promise<CheckpointError[]> {
  const { thread_id, repositories } = config.configurable
  const { checkpointer } = repositories.schema

  if (!thread_id) {
    return []
  }

  const checkpointConfig = {
    configurable: {
      thread_id,
    },
  }

  const checkpointTuple = await checkpointer.getTuple(checkpointConfig)
  if (!checkpointTuple || !checkpointTuple.checkpoint) {
    return []
  }

  const errors: CheckpointError[] = []

  // Check pendingWrites for __error__ channel
  if (checkpointTuple.pendingWrites) {
    for (const [taskId, channel, value] of checkpointTuple.pendingWrites) {
      if (channel === '__error__') {
        const errorInfo = extractErrorInfo(value)

        errors.push({
          checkpointId: checkpointTuple.checkpoint.id,
          timestamp: new Date(checkpointTuple.checkpoint.ts).toISOString(),
          errorMessage: errorInfo.message,
          nodeSource: errorInfo.nodeSource,
          metadata: {
            errorData: value,
            source: 'checkpointer.getTuple pendingWrites',
            taskId,
          },
        })
      }
    }
  }

  return errors.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
}
