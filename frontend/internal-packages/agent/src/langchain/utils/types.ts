export interface BasePromptVariables {
  chat_history: string
  user_message: string
}

export interface SchemaAwareChatVariables extends BasePromptVariables {
  schema_text: string
}

export interface ChatAgent<
  TVariables = BasePromptVariables,
  TResponse = string,
> {
  generate(variables: TVariables): Promise<TResponse>
}
