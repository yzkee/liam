export type ChatAgent<TVariables = unknown, TResponse = string> = {
  generate(variables: TVariables): Promise<TResponse>
}
