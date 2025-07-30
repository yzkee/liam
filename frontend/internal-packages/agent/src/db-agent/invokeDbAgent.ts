import { ok, ResultAsync } from 'neverthrow'
import type { WorkflowConfigurable } from '../chat/workflow/types'
import type { AgentWorkflowParams, AgentWorkflowResult } from '../types'
import { createDbAgentGraph } from './createDbAgentGraph'

/**
 * Invoke the DB Agent with provided parameters and repositories
 * This function encapsulates the logic for creating and invoking the DB agent graph
 */
export const invokeDbAgent = (
  params: AgentWorkflowParams,
  configurable: WorkflowConfigurable,
): ResultAsync<AgentWorkflowResult, Error> => {
  const compiled = createDbAgentGraph()

  return ResultAsync.fromPromise(
    compiled.invoke(params, {
      configurable,
    }),
    (err) => new Error(String(err)),
  ).map((result) => ok(result))
}
