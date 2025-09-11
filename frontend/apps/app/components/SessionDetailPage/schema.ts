import * as v from 'valibot'

const toolCallSchema = v.object({
  id: v.string(),
  type: v.literal('function'),
  index: v.number(),
  function: v.object({
    name: v.string(),
    arguments: v.string(),
  }),
})

export const toolCallsSchema = v.array(toolCallSchema)
export type ToolCalls = v.InferOutput<typeof toolCallsSchema>
