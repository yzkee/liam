import { dispatchCustomEvent } from '@langchain/core/callbacks/dispatch'
import { ToolMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import { type StructuredTool, tool } from '@langchain/core/tools'
import { Command, getCurrentTaskInput } from '@langchain/langgraph'
import { type PgParseResult, pgParse } from '@liam-hq/schema/parser'
import * as v from 'valibot'
import { SSE_EVENTS } from '../../streaming/constants'
import { WorkflowTerminationError } from '../../utils/errorHandling'
import { toJsonSchema } from '../../utils/jsonSchema'
import type { AnalyzedRequirements } from '../../utils/schema/analyzedRequirements'
import { withSentryCaptureException } from '../../utils/withSentryCaptureException'
import type { testcaseAnnotation } from '../testcaseGeneration/testcaseAnnotation'

const saveSqlToolSchema = v.object({
  category: v.string(),
  title: v.string(),
  sql: v.string(),
})

const toolSchema = toJsonSchema(saveSqlToolSchema)

const configSchema = v.object({
  toolCall: v.object({
    id: v.string(),
  }),
})

/**
 * Validate SQL syntax using pgParse
 */
const validateSqlSyntax = async (sql: string): Promise<void> => {
  const parseResult: PgParseResult = await pgParse(sql)

  if (parseResult.error) {
    // LangGraph tool nodes require throwing errors to trigger retry mechanism
    // eslint-disable-next-line no-throw-error/no-throw-error
    throw new Error(
      `SQL syntax error: ${parseResult.error.message}. Fix testcaseWithDml.dmlOperation.sql and retry.`,
    )
  }
}

/**
 * Extract tool call ID from config
 */
const getConfigData = (config: RunnableConfig): { toolCallId: string } => {
  const configParseResult = v.safeParse(configSchema, config)
  if (!configParseResult.success) {
    throw new WorkflowTerminationError(
      new Error('Tool call ID not found in config'),
      'saveTestcaseTool',
    )
  }
  return {
    toolCallId: configParseResult.output.toolCall.id,
  }
}

export const saveTestcaseTool: StructuredTool = tool(
  async (input: unknown, config: RunnableConfig): Promise<Command> => {
    return withSentryCaptureException(async () => {
      const parsed = v.safeParse(saveSqlToolSchema, input)
      if (!parsed.success) {
        throw new WorkflowTerminationError(
          new Error(
            `Invalid tool input: ${parsed.issues
              .map((issue) => issue.message)
              .join(', ')}`,
          ),
          'saveTestcaseTool',
        )
      }

      const { category, title, sql } = parsed.output

      // Validate SQL syntax before saving
      await validateSqlSyntax(sql)

      const { toolCallId } = getConfigData(config)

      // Get current state to update analyzedRequirements
      const currentState = getCurrentTaskInput()

      // Type guard to ensure we have the right state structure
      if (
        !currentState ||
        typeof currentState !== 'object' ||
        !('analyzedRequirements' in currentState) ||
        !currentState.analyzedRequirements
      ) {
        throw new WorkflowTerminationError(
          new Error('analyzedRequirements not found in current state'),
          'saveTestcaseTool',
        )
      }

      // Safe to assert type after validation above
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const state = currentState as typeof testcaseAnnotation.State

      // Create updated analyzedRequirements with SQL
      const updatedTestcases = {
        ...state.analyzedRequirements.testcases,
      }

      if (!updatedTestcases[category]) {
        throw new WorkflowTerminationError(
          new Error(`Category "${category}" not found in analyzedRequirements`),
          'saveTestcaseTool',
        )
      }

      // Find and update the testcase with matching title
      const testcaseIndex = updatedTestcases[category].findIndex(
        (tc: { title: string }) => tc.title === title,
      )

      if (testcaseIndex === -1) {
        throw new WorkflowTerminationError(
          new Error(
            `Test case with title "${title}" not found in category "${category}"`,
          ),
          'saveTestcaseTool',
        )
      }

      const currentTestcase = updatedTestcases[category]?.[testcaseIndex]
      if (!currentTestcase) {
        throw new WorkflowTerminationError(
          new Error(
            `Test case at index ${testcaseIndex} not found in category "${category}"`,
          ),
          'saveTestcaseTool',
        )
      }

      updatedTestcases[category][testcaseIndex] = {
        title: currentTestcase.title,
        type: currentTestcase.type,
        testResults: currentTestcase.testResults,
        sql,
      }

      const updatedAnalyzedRequirements: AnalyzedRequirements = {
        ...state.analyzedRequirements,
        testcases: updatedTestcases,
      }

      const toolMessage = new ToolMessage({
        content: `Successfully saved SQL for test case "${title}" in category "${category}"`,
        tool_call_id: toolCallId,
      })
      await dispatchCustomEvent(SSE_EVENTS.MESSAGES, toolMessage)

      return new Command({
        update: {
          analyzedRequirements: updatedAnalyzedRequirements,
          messages: [toolMessage],
        },
      })
    })
  },
  {
    name: 'saveTestcase',
    description:
      'Save SQL for a test case. Provide the category, title (exactly as shown in the input), and the generated SQL.',
    schema: toolSchema,
  },
)
