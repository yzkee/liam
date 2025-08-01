import { type AIMessage, SystemMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import { ChatOpenAI } from '@langchain/openai'
import type { Database } from '@liam-hq/db'
import { ResultAsync } from 'neverthrow'
import type { Repositories } from '../../../repositories'
import { getConfigurable } from '../shared/getConfigurable'
import type { WorkflowState } from '../types'
import { logAssistantMessage } from '../utils/timelineLogger'
import { withTimelineItemSync } from '../utils/withTimelineItemSync'

/**
 * Generate a workflow summary using LLM
 */
function generateWorkflowSummary(
  state: WorkflowState,
): ResultAsync<AIMessage, Error> {
  // Create LLM for summary generation
  const llm = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0.3,
  })

  // Create a summary prompt based on the workflow messages
  const summaryPrompt = `Based on the following workflow conversation about database design, provide a concise summary of what was accomplished:

Please summarize:
- The main user requirements that were analyzed
- Key database design decisions that were made
- Any schemas, tables, or data structures that were created or modified
- Important outcomes or results from this workflow

Keep the summary informative but concise, focusing on the key achievements and decisions made during this database design session.`

  return ResultAsync.fromPromise(
    llm.invoke([new SystemMessage(summaryPrompt), ...state.messages]),
    (error) => (error instanceof Error ? error : new Error(String(error))),
  )
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
 * Finalize Artifacts Node - Generate & Save Artifacts and Final Summary
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
  const { errorToReturn } = await handleWorkflowError(state, repositories)

  // If there was an error, return early without generating summary
  if (errorToReturn) {
    return {
      ...state,
      error: new Error(errorToReturn),
    }
  }

  // Generate workflow summary for successful workflows
  const assistantRole: Database['public']['Enums']['assistant_role_enum'] = 'db'

  await logAssistantMessage(
    state,
    repositories,
    'Generating workflow summary...',
    assistantRole,
  )

  const syncSummary = (message: AIMessage) =>
    ResultAsync.fromPromise(
      withTimelineItemSync(message, {
        designSessionId: state.designSessionId,
        organizationId: state.organizationId || '',
        userId: state.userId,
        repositories,
        assistantRole,
      }),
      (error) => (error instanceof Error ? error : new Error(String(error))),
    )

  const summaryResult =
    await generateWorkflowSummary(state).andThen(syncSummary)

  return summaryResult.match(
    (summaryMessage) => ({
      ...state,
      messages: [summaryMessage],
      error: undefined,
    }),
    async (error) => {
      await logAssistantMessage(
        state,
        repositories,
        `Unable to generate workflow summary at this time: ${error.message}`,
        assistantRole,
      )

      return {
        ...state,
        error,
      }
    },
  )
}
