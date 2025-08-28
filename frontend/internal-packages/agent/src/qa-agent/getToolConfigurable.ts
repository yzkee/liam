import type { RunnableConfig } from '@langchain/core/runnables'
import { fromSafeParse } from '@liam-hq/neverthrow'
import { err, ok, type Result } from 'neverthrow'
import * as v from 'valibot'
import { type Testcase, testcaseSchema } from './generateTestcase/agent'

const configSchema = v.object({
  toolCall: v.object({
    id: v.string(),
  }),
  configurable: v.object({
    testcases: v.array(testcaseSchema),
  }),
})

export const getToolConfigurable = (
  config: RunnableConfig,
): Result<{ testcases: Testcase[]; toolCallId: string }, Error> => {
  const configResult = fromSafeParse(v.safeParse(configSchema, config))
  if (configResult.isErr()) {
    return err(
      new Error(`Invalid config structure: ${configResult.error.message}`),
    )
  }

  return ok({
    testcases: configResult.value.configurable.testcases,
    toolCallId: configResult.value.toolCall.id,
  })
}
