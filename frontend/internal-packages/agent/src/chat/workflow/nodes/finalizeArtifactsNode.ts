import type { RunnableConfig } from '@langchain/core/runnables'
import type { Repositories } from '../../../repositories'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'
import { logAssistantMessage } from '../utils/timelineLogger'
import {
  createOrUpdateArtifact,
  transformWorkflowStateToArtifact,
} from '../utils/transformWorkflowStateToArtifact'

/**
 * Save artifacts if workflow state contains artifact data
 */
async function saveArtifacts(
  state: WorkflowState,
  repositories: Repositories,
): Promise<void> {
  if (!state.analyzedRequirements && !state.generatedUsecases) {
    return
  }

  await logAssistantMessage(state, repositories, 'Saving artifacts...')
  const artifact = transformWorkflowStateToArtifact(state)
  const artifactResult = await createOrUpdateArtifact(
    state,
    artifact,
    repositories,
  )

  if (artifactResult.success) {
    await logAssistantMessage(
      state,
      repositories,
      'Artifacts saved successfully',
    )
  } else {
    await logAssistantMessage(state, repositories, 'Failed to save artifacts')
  }
}

/**
 * Handle workflow errors and save error timeline items
 */
async function handleWorkflowError(
  state: WorkflowState,
  repositories: Repositories,
): Promise<{
  errorToReturn: string | undefined
}> {
  await logAssistantMessage(
    state,
    repositories,
    'Handling workflow completion...',
  )

  if (state.error) {
    const errorMessage = `Sorry, an error occurred during processing: ${state.error.message}`
    const saveResult = await repositories.schema.createTimelineItem({
      designSessionId: state.designSessionId,
      content: errorMessage,
      type: 'error',
    })

    if (!saveResult.success) {
      return {
        errorToReturn: `Failed to save error timeline item: ${saveResult.error}`,
      }
    }
    return { errorToReturn: state.error.message }
  }

  // Success case - workflow completed successfully
  return { errorToReturn: undefined }
}

/**
 * Finalize Artifacts Node - Generate & Save Artifacts
 * Performed by dbAgentArtifactGen
 */
export async function finalizeArtifactsNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState> {
  const configurableResult = getConfigurable(config)
  if (configurableResult.isErr()) {
    return {
      ...state,
      error: configurableResult.error,
    }
  }
  const { repositories } = configurableResult.value

  await logAssistantMessage(
    state,
    repositories,
    'Preparing final deliverables...',
  )

  await saveArtifacts(state, repositories)
  const { errorToReturn } = await handleWorkflowError(state, repositories)

  return {
    ...state,
    error: errorToReturn ? new Error(errorToReturn) : undefined,
  }
}
