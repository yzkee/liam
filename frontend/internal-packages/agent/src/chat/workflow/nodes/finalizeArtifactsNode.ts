import type { RunnableConfig } from '@langchain/core/runnables'
import type { Database } from '@liam-hq/db'
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
  assistantRole: Database['public']['Enums']['assistant_role_enum'],
): Promise<void> {
  if (!state.analyzedRequirements && !state.generatedUsecases) {
    return
  }

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
      'Your database design has been saved and is ready for implementation',
      assistantRole,
    )
  } else {
    await logAssistantMessage(
      state,
      repositories,
      'Unable to save your database design. Please try again or contact support...',
      assistantRole,
    )
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
  const assistantRole: Database['public']['Enums']['assistant_role_enum'] = 'db'
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
    'Compiling your complete database design documentation...',
    assistantRole,
  )

  await saveArtifacts(state, repositories, assistantRole)
  const { errorToReturn } = await handleWorkflowError(state, repositories)

  return {
    ...state,
    error: errorToReturn ? new Error(errorToReturn) : undefined,
  }
}
