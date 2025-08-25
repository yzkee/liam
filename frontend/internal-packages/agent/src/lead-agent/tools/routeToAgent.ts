import { ToolMessage } from '@langchain/core/messages'
import type { RunnableConfig } from '@langchain/core/runnables'
import { tool } from '@langchain/core/tools'
import type { JSONSchema } from '@langchain/core/utils/json_schema'
import { Command } from '@langchain/langgraph'
import { toJsonSchema } from '@valibot/to-json-schema'
import { err, ok, type Result } from 'neverthrow'
import * as v from 'valibot'
import { WorkflowTerminationError } from '../../shared/errorHandling'

const inputSchema = v.object({
  targetAgent: v.picklist(['pmAgent']),
})

// toJsonSchema returns a JSONSchema7, which is not assignable to JSONSchema
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const toolSchema = toJsonSchema(inputSchema) as JSONSchema

const configSchema = v.object({
  toolCall: v.object({
    id: v.string(),
  }),
})

type ToolConfigurable = {
  toolCallId: string
}

/**
 * Extract tool-specific configuration including tool call ID
 */
const getToolConfigurable = (
  config: RunnableConfig,
): Result<ToolConfigurable, Error> => {
  const configParseResult = v.safeParse(configSchema, config)
  if (!configParseResult.success) {
    const errorMessage = configParseResult.issues
      .map((issue) => issue.message)
      .join(', ')
    return err(new Error(`Invalid config structure: ${errorMessage}`))
  }

  return ok({
    toolCallId: configParseResult.output.toolCall.id,
  })
}

export const routeToAgent = tool(
  async (input: unknown, config: RunnableConfig): Promise<Command> => {
    const inputParseResult = v.safeParse(inputSchema, input)
    if (!inputParseResult.success) {
      const errorMessage = inputParseResult.issues
        .map((issue) => issue.message)
        .join(', ')
      throw new WorkflowTerminationError(
        new Error(`Invalid input structure: ${errorMessage}`),
        'routeToAgent',
      )
    }

    const toolConfigurableResult = getToolConfigurable(config)
    if (toolConfigurableResult.isErr()) {
      throw new WorkflowTerminationError(
        toolConfigurableResult.error,
        'routeToAgent',
      )
    }

    const { toolCallId } = toolConfigurableResult.value

    return new Command({
      update: {
        next: inputParseResult.output.targetAgent,
        messages: [
          new ToolMessage({
            content: `Routing request to ${inputParseResult.output.targetAgent}`,
            tool_call_id: toolCallId,
          }),
        ],
      },
    })
  },
  {
    name: 'routeToAgent',
    description: 'Route the user request to the appropriate specialized agent',
    schema: toolSchema,
  },
)
