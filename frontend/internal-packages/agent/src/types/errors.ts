import type { Result } from 'neverthrow'

type AgentError =
  | { type: 'LANGGRAPH_ERROR'; message: string; cause?: unknown }
  | { type: 'VECTOR_STORE_ERROR'; message: string; cause?: unknown }
  | { type: 'VALIDATION_ERROR'; message: string; cause?: unknown }
  | { type: 'ENVIRONMENT_ERROR'; message: string; cause?: unknown }
  | { type: 'FILE_OPERATION_ERROR'; message: string; cause?: unknown }
  | {
      type: 'WORKFLOW_NODE_ERROR'
      message: string
      node: string
      cause?: unknown
    }
  | { type: 'DDL_GENERATION_ERROR'; message: string; cause?: unknown }

export type AgentResult<T> = Result<T, AgentError>
