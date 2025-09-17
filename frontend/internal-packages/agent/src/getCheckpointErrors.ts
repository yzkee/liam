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
 * Decode hex-encoded string to regular string
 */
function decodeHexString(hexBlob: string): string | null {
  if (!hexBlob.startsWith('\\x')) {
    return hexBlob
  }

  const hexString = hexBlob.slice(2)
  if (hexString.length % 2 !== 0) {
    return null
  }

  const bytes = []
  for (let i = 0; i < hexString.length; i += 2) {
    const hexByte = hexString.slice(i, i + 2)
    const byteValue = Number.parseInt(hexByte, 16)
    if (Number.isNaN(byteValue)) {
      return null
    }

    bytes.push(byteValue)
  }

  return String.fromCharCode(...bytes)
}

/**
 * Decode Base64 string safely
 */
function decodeBase64String(dataString: string): string | null {
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  if (!base64Regex.test(dataString) || dataString.length === 0) {
    return dataString
  }
  if (dataString.length % 4 !== 0) {
    return null
  }
  return atob(dataString)
}

/**
 * Parse JSON string safely
 */
function parseJsonString(jsonString: string): unknown | null {
  if (!jsonString.startsWith('{') && !jsonString.startsWith('[')) {
    return null
  }
  return JSON.parse(jsonString)
}

/**
 * Parse blob data from checkpoint writes
 */
function parseCheckpointBlob(blob: string): unknown | null {
  if (!blob || blob.length === 0) {
    return null
  }

  const decodedString = decodeHexString(blob)
  if (!decodedString) {
    return null
  }

  let finalString: string | null
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  if (
    base64Regex.test(decodedString) &&
    decodedString.length > 0 &&
    decodedString.length % 4 === 0
  ) {
    finalString = decodeBase64String(decodedString)
  } else {
    finalString = decodedString
  }

  if (!finalString) {
    return null
  }
  if (finalString.startsWith('{') || finalString.startsWith('[')) {
    return parseJsonString(finalString)
  }

  return null
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

  if (!thread_id) {
    return []
  }

  const errors: CheckpointError[] = []

  // NOTE: We use direct database access instead of checkpointer.getTuple() because
  // the __error__ channel is not available through the high-level API.
  // checkpointer.getTuple() only provides standard channels like 'messages'
  // but __error__ channel data requires direct checkpoint_writes table access.
  const { data: checkpointWrites, error } =
    await repositories.schema.getCheckpointErrorData(thread_id)

  if (error || !checkpointWrites || checkpointWrites.length === 0) {
    return []
  }

  for (const checkpointWrite of checkpointWrites) {
    if (!checkpointWrite.blob || !checkpointWrite.created_at) {
      continue
    }

    const errorData = parseCheckpointBlob(checkpointWrite.blob)
    if (!errorData) {
      continue
    }

    const errorInfo = extractErrorInfo(errorData)
    errors.push({
      checkpointId: checkpointWrite.checkpoint_id,
      timestamp: checkpointWrite.created_at,
      errorMessage: errorInfo.message,
      nodeSource: errorInfo.nodeSource,
      metadata: {
        errorData,
        source: 'checkpoint_writes __error__ channel',
        channel: checkpointWrite.channel,
      },
    })
  }

  return errors.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
}
