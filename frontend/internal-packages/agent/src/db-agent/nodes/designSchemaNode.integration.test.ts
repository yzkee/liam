import { HumanMessage } from '@langchain/core/messages'
import { END } from '@langchain/langgraph'
import { describe, it } from 'vitest'
import {
  getTestConfig,
  outputStream,
  setupGraph,
} from '../../../test-utils/workflowTestHelpers'
import type { WorkflowState } from '../../chat/workflow/types'
import { designSchemaNode } from './designSchemaNode'

describe('designSchemaNode Integration', () => {
  it('should execute designSchemaNode with real APIs', async () => {
    // Arrange
    const graph = setupGraph(designSchemaNode)
    const { config, context } = await getTestConfig()

    const userInput =
      'Create a user management system with users, roles, and permissions tables'

    const state: WorkflowState = {
      userInput,
      messages: [new HumanMessage(userInput)],
      schemaData: {
        tables: {},
        enums: {},
        extensions: {},
      },
      buildingSchemaId: context.buildingSchemaId,
      latestVersionNumber: context.latestVersionNumber,
      designSessionId: context.designSessionId,
      userId: context.userId,
      organizationId: context.organizationId,
      next: END,
    }

    // Act
    const stream = await graph.stream(state, config)

    // Assert (Output)
    await outputStream(stream)
  })
})
