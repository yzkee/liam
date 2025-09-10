import type { AIMessage } from '@langchain/core/messages'
import * as v from 'valibot'
<<<<<<<< HEAD:frontend/apps/app/components/SessionDetailPage/components/Chat/components/Messages/utils/extractToolCallsFromMessage.ts
import { type ToolCalls, toolCallsSchema } from '../../../../../schema'
========
import { type ToolCalls, toolCallsSchema } from './toolCallTypes'
>>>>>>>> 8890e3b9f (feat(agent): add tool call display support to streaming infrastructure):frontend/internal-packages/agent/src/streaming/core/extractToolCallsFromMessage.ts

export const extractToolCallsFromMessage = (message: AIMessage): ToolCalls => {
  const parsed = v.safeParse(toolCallsSchema, message.tool_calls)
  if (!parsed.success || parsed.output === undefined) return []

  return parsed.output
}
