import { Annotation, END, MessagesAnnotation } from '@langchain/langgraph'

export const leadAgentStateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? END,
    default: () => END,
  }),
})

export type LeadAgentState = typeof leadAgentStateAnnotation.State
