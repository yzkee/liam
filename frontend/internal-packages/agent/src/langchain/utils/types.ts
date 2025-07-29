import type * as v from 'valibot'
import type { reasoningSchema } from './schema'

export type ChatAgent<TVariables = unknown, TResponse = string> = {
  generate(variables: TVariables): Promise<TResponse>
}

export type Reasoning = v.InferOutput<typeof reasoningSchema>
