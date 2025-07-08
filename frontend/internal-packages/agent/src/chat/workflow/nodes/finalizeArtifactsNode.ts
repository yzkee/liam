import type { RunnableConfig } from '@langchain/core/runnables'
import type { Repositories } from '../../../repositories'
import type { NodeLogger } from '../../../utils/nodeLogger'
import { getWorkflowNodeProgress } from '../shared/getWorkflowNodeProgress'
import type { WorkflowState } from '../types'
import {
  createOrUpdateArtifact,
  transformWorkflowStateToArtifact,
} from '../utils/transformWorkflowStateToArtifact'

const NODE_NAME = 'finalizeArtifactsNode'

/**
 * Save artifacts if workflow state contains artifact data
 */
async function saveArtifacts(
  state: WorkflowState,
  logger: NodeLogger,
  repositories: Repositories,
): Promise<void> {
  if (!state.analyzedRequirements && !state.generatedUsecases) {
    logger.log(`[${NODE_NAME}] No artifact data available to save`)
    return
  }

  logger.log(`[${NODE_NAME}] Saving artifacts`)
  const artifact = transformWorkflowStateToArtifact(state)
  const artifactResult = await createOrUpdateArtifact(
    state,
    artifact,
    repositories,
  )

  if (artifactResult.success) {
    logger.log(`[${NODE_NAME}] Artifacts saved successfully`)
  } else {
    logger.log(
      `[${NODE_NAME}] Failed to save artifacts: ${artifactResult.error}`,
    )
  }
}

/**
 * Save timeline item to database
 */
async function saveTimelineItem(
  state: WorkflowState,
  content: string,
  type: 'error' | 'assistant',
  repositories: Repositories,
): Promise<void> {
  const saveResult = await repositories.schema.createTimelineItem({
    designSessionId: state.designSessionId,
    content,
    type,
  })

  if (!saveResult.success) {
    console.error(`Failed to save ${type} timeline item:`, saveResult.error)
  }
}

/**
 * Generate final response and determine error state
 */
async function generateFinalResponse(
  state: WorkflowState,
  repositories: Repositories,
): Promise<{
  finalResponse: string
  errorToReturn: string | undefined
}> {
  if (state.error) {
    const finalResponse = `Sorry, an error occurred during processing: ${state.error}`
    await saveTimelineItem(state, finalResponse, 'error', repositories)
    return { finalResponse, errorToReturn: state.error }
  }

  if (state.generatedAnswer) {
    await saveTimelineItem(
      state,
      state.generatedAnswer,
      'assistant',
      repositories,
    )
    return { finalResponse: state.generatedAnswer, errorToReturn: undefined }
  }

  // Fallback case
  const finalResponse =
    'Sorry, we could not generate an answer. Please try again.'
  await saveTimelineItem(state, finalResponse, 'error', repositories)
  return { finalResponse, errorToReturn: 'No generated answer available' }
}

/**
 * Finalize Artifacts Node - Generate & Save Artifacts
 * Performed by dbAgentArtifactGen
 */
export async function finalizeArtifactsNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState> {
  const { repositories, logger } = config.configurable as {
    repositories: Repositories
    logger: NodeLogger
  }

  logger.log(`[${NODE_NAME}] Started`)

  // Update progress message if available
  if (state.progressTimelineItemId) {
    await repositories.schema.updateTimelineItem(state.progressTimelineItemId, {
      content: 'Processing: finalizeArtifacts',
      progress: getWorkflowNodeProgress('finalizeArtifacts'),
    })
  }

  await saveArtifacts(state, logger, repositories)
  const { finalResponse, errorToReturn } = await generateFinalResponse(
    state,
    repositories,
  )

  logger.log(`[${NODE_NAME}] Completed`)

  return {
    ...state,
    finalResponse,
    error: errorToReturn,
  }
}
