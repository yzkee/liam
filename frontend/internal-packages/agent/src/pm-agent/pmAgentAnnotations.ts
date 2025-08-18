import type { BaseMessage } from '@langchain/core/messages'
import { Annotation, MessagesAnnotation } from '@langchain/langgraph'

/**
 * PM Agent subgraph specific state annotation
 * Includes private state for retry tracking
 */
export const pmAgentStateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  analyzedRequirements: Annotation<
    | {
        businessRequirement: string
        functionalRequirements: Record<string, string[]>
        nonFunctionalRequirements: Record<string, string[]>
      }
    | undefined
  >,
  designSessionId: Annotation<string>,

  // PM Agent private state
  analyzedRequirementsRetryCount: Annotation<number>,
})

/**
 * Type definition for PM Agent state
 */
export type PmAgentState = {
  messages: BaseMessage[]
  analyzedRequirements?:
    | {
        businessRequirement: string
        functionalRequirements: Record<string, string[]>
        nonFunctionalRequirements: Record<string, string[]>
      }
    | undefined
  designSessionId: string
  analyzedRequirementsRetryCount: number
}
