import { postgresqlSchemaDeparser } from '@liam-hq/db-structure'
import { getWorkflowNodeProgress } from '../shared/getWorkflowNodeProgress'
import type { WorkflowState } from '../types'

const NODE_NAME = 'generateDDLNode'

/**
 * Generate DDL Node - Uses existing schema deparser for DDL generation
 * Generates DDL mechanically without LLM
 */
export async function generateDDLNode(
  state: WorkflowState,
): Promise<WorkflowState> {
  try {
    state.logger.log(`[${NODE_NAME}] Started`)

    if (state.onNodeProgress) {
      await state.onNodeProgress(
        'generateDDL',
        getWorkflowNodeProgress('generateDDL'),
      )
    }

    const result = postgresqlSchemaDeparser(state.schemaData)
    const ddlStatements = result.value

    state.logger.log(`[${NODE_NAME}] Completed`)

    return {
      ...state,
      ddlStatements,
    }
  } catch (error) {
    state.logger.log(`[${NODE_NAME}] Failed: ${error}`)

    return {
      ...state,
      ddlStatements: 'DDL generation failed due to an unexpected error.',
    }
  }
}
