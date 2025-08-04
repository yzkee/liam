import { AIMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import type { Database } from '@liam-hq/db'
import { ResultAsync } from 'neverthrow'
import * as v from 'valibot'
import { getConfigurable } from '../../chat/workflow/shared/getConfigurable'
import type { WorkflowState } from '../../chat/workflow/types'
import { logAssistantMessage } from '../../chat/workflow/utils/timelineLogger'
import {
  createOrUpdateArtifact,
  transformWorkflowStateToArtifact,
} from '../../chat/workflow/utils/transformWorkflowStateToArtifact'
import { withTimelineItemSync } from '../../chat/workflow/utils/withTimelineItemSync'
import type { Repositories } from '../../repositories'
import { WorkflowTerminationError } from '../../shared/errorHandling'

// Valibot schema for validating analyzedRequirements structure
const analyzedRequirementsSchema = v.object({
  businessRequirement: v.string(),
  functionalRequirements: v.record(v.string(), v.array(v.string())),
  nonFunctionalRequirements: v.record(v.string(), v.array(v.string())),
})

type ValidatedAnalyzedRequirements = v.InferOutput<
  typeof analyzedRequirementsSchema
>

// Analysis content is now parsed and available in state.analyzedRequirements

/**
 * Format analyzed requirements into a structured string
 * @param analyzedRequirements - Validated analyzed requirements object
 */
const formatAnalyzedRequirements = (
  analyzedRequirements: ValidatedAnalyzedRequirements,
): string => {
  const formatRequirements = (
    requirements: Record<string, string[]>,
    title: string,
  ): string => {
    const entries = Object.entries(requirements)
    if (entries.length === 0) return ''

    return `${title}:
${entries
  .map(
    ([category, items]) =>
      `- ${category}:\n  ${items.map((item) => `  • ${item}`).join('\n')}`,
  )
  .join('\n')}`
  }

  const sections = [
    `Business Requirement:\n${analyzedRequirements.businessRequirement}`,
    formatRequirements(
      analyzedRequirements.functionalRequirements,
      'Functional Requirements',
    ),
    formatRequirements(
      analyzedRequirements.nonFunctionalRequirements,
      'Non-Functional Requirements',
    ),
  ].filter(Boolean)

  return sections.join('\n\n')
}

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
      'Your requirements have been analyzed and saved',
      assistantRole,
    )
  } else {
    await logAssistantMessage(
      state,
      repositories,
      'Unable to save your requirements. Please try again or contact support...',
      assistantRole,
    )
  }
}

/**
 * Save Requirements to Artifact Node - Process analysis and save artifacts
 * Converts from PMAnalysisAgent tool to a workflow termination node
 */
export async function saveRequirementToArtifactNode(
  state: WorkflowState,
  config: RunnableConfig,
): Promise<WorkflowState> {
  const configurableResult = getConfigurable(config)
  if (configurableResult.isErr()) {
    throw new WorkflowTerminationError(
      configurableResult.error,
      'saveRequirementToArtifactNode',
    )
  }
  const { repositories } = configurableResult.value

  const assistantRole: Database['public']['Enums']['assistant_role_enum'] = 'pm'

  // Check if analyzedRequirements are available (already parsed by analyzeRequirementsNode)
  if (!state.analyzedRequirements) {
    await logAssistantMessage(
      state,
      repositories,
      'No analyzed requirements found to save. Please try again.',
      assistantRole,
    )
    return {
      ...state,
      analyzedRequirements: undefined, // Reset so the workflow can retry
    }
  }

  // Validate analyzedRequirements structure before processing
  const validationResult = v.safeParse(
    analyzedRequirementsSchema,
    state.analyzedRequirements,
  )
  if (!validationResult.success) {
    const validationErrorMessage = `Invalid analyzedRequirements structure: ${validationResult.issues.map((issue) => `${issue.path?.join('.')}: ${issue.message}`).join(', ')}`

    await logAssistantMessage(
      state,
      repositories,
      `Error validating requirements structure: ${validationErrorMessage}`,
      assistantRole,
    )

    return {
      ...state,
      analyzedRequirements: undefined, // Reset so the workflow can retry
    }
  }

  // Process the analysis and save artifacts
  const processResult = await ResultAsync.fromPromise(
    (async () => {
      // Use the validated analyzedRequirements
      const analyzedRequirements = validationResult.output

      // 3. Create complete message with all analyzed requirements and sync to timeline
      const completeMessage = await withTimelineItemSync(
        new AIMessage({
          content: formatAnalyzedRequirements(analyzedRequirements),
          name: 'PMAnalysisAgent',
        }),
        {
          designSessionId: state.designSessionId,
          organizationId: state.organizationId || '',
          userId: state.userId,
          repositories,
          assistantRole,
        },
      )

      // 4. Create updated state
      const updatedState = {
        ...state,
        messages: [...state.messages, completeMessage],
        analyzedRequirements,
      }

      // 5. Save artifacts
      await saveArtifacts(updatedState, repositories, assistantRole)

      return {
        ...updatedState,
        analyzedRequirements,
      }
    })(),
    (error) => (error instanceof Error ? error : new Error(String(error))),
  )

  return processResult.match(
    (result) => result,
    async (error) => {
      console.error('Save requirement node error:', error.message)

      await logAssistantMessage(
        state,
        repositories,
        'Having trouble saving your requirements. Let me try a different approach...',
        assistantRole,
      )

      return {
        ...state,
        analyzedRequirements: undefined, // Reset so the workflow can retry
      }
    },
  )
}
