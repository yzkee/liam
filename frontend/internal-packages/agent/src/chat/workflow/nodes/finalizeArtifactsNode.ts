import type { RunnableConfig } from '@langchain/core/runnables'
import type { Command } from '@langchain/langgraph'
import { handleConfigurationError } from '../../../shared/errorHandling'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'

/**
 * Finalize Artifacts Node - Generate & Save Artifacts
 * Performed by dbAgentArtifactGen
 * Note: Error handling is now done immediately at error occurrence, not here
 */
export async function finalizeArtifactsNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState | Command> {
  const configurableResult = getConfigurable(config)
  if (configurableResult.isErr()) {
    return await handleConfigurationError(configurableResult.error, {
      nodeId: 'finalizeArtifactsNode',
      designSessionId: state.designSessionId,
    })
  }

  // Success case - workflow completed successfully
  return state
}
