export type ChatAgent<TVariables = any, TResponse = string> = {
  generate(variables: TVariables): Promise<TResponse>
}
