# Streaming

LangGraph provides multiple streaming modes to handle real-time data flow and provide responsive user experiences. This guide covers the different streaming approaches available in LangGraph.js based on the official documentation.

## Stream Modes

### How to stream the full state of your graph

Stream the complete state of the graph after each node execution. This mode provides full state snapshots at each step.

```typescript
import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";

// Define the state
const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

// Create the graph
const workflow = new StateGraph(StateAnnotation)
  .addNode("agent", callModel)
  .addNode("action", callTool)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("action", "agent");

const app = workflow.compile();

// Stream values - get full state after each node
for await (const chunk of await app.stream(
  { messages: [new HumanMessage("what is the weather in sf")] },
  { streamMode: "values" }
)) {
  console.log("Full state:", chunk);
}
```

### How to stream state updates of your graph

Stream only the updates/changes made by each node, providing incremental state changes.

```typescript
// Stream updates - get only the changes from each node
for await (const chunk of await app.stream(
  { messages: [new HumanMessage("what is the weather in sf")] },
  { streamMode: "updates" }
)) {
  console.log("Node updates:", chunk);
}
```

### How to configure multiple streaming modes

You can combine multiple streaming modes to get different perspectives on the execution.

```typescript
// Combine multiple stream modes
for await (const chunk of await app.stream(
  { messages: [new HumanMessage("what is the weather in sf")] },
  { streamMode: ["values", "updates"] }
)) {
  console.log("Combined stream:", chunk);
}
```

## Token-level Streaming

### How to stream LLM tokens

Stream individual tokens from language model responses for real-time text generation.

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, Annotation, START } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});

const model = new ChatAnthropic({
  model: "claude-3-5-sonnet-20240620",
  temperature: 0,
}).bindTools(tools);

const callModel = async (state: typeof StateAnnotation.State) => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const workflow = new StateGraph(StateAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", new ToolNode(tools))
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

const app = workflow.compile();

// Stream tokens using streamEvents
for await (const chunk of app.streamEvents(
  { messages: [new HumanMessage("what is the weather in sf")] },
  { version: "v2" }
)) {
  if (chunk.event === "on_chat_model_stream") {
    console.log(chunk.data.chunk.content);
  }
}
```

### How to stream LLM tokens (without LangChain models)

Handle streaming from custom or non-LangChain language models using OpenAI client directly.

```typescript
import OpenAI from "openai";
import { StateGraph, Annotation, START } from "@langchain/langgraph";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";

const openaiClient = new OpenAI();

const callModel = async (state: typeof StateAnnotation.State, config: RunnableConfig) => {
  const messages = state.messages.map((m) => ({
    role: m.getType() === "human" ? "user" : "assistant",
    content: m.content as string,
  }));

  const stream = await openaiClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    stream: true,
  });

  let content = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || "";
    content += delta;
    
    // Dispatch custom streaming event
    await dispatchCustomEvent("custom_event", { content: delta }, config);
  }

  return { messages: [new AIMessage(content)] };
};

// Stream custom events
for await (const chunk of app.streamEvents(
  { messages: [new HumanMessage("tell me a joke")] },
  { version: "v2" }
)) {
  if (chunk.event === "on_custom_event") {
    console.log(chunk.data.content);
  }
}
```

## Custom Data Streaming

### How to stream custom data

Stream custom data and progress information during graph execution.

```typescript
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";

// Method 1: Using streamMode: "custom"
const customNode = async (state: typeof StateAnnotation.State, config: RunnableConfig) => {
  // Stream custom data using config.writer
  config.writer?.({
    type: "progress",
    step: "processing",
    progress: 0.5,
  });

  // Perform work
  const result = await processData(state);
  
  config.writer?.({
    type: "complete",
    result: result.summary,
  });
  
  return result;
};

// Stream custom content
for await (const chunk of await app.stream(
  { messages: [new HumanMessage("process this")] },
  { streamMode: "custom" }
)) {
  console.log("Custom data:", chunk);
}

// Method 2: Using dispatchCustomEvent with streamEvents
const eventNode = async (state: typeof StateAnnotation.State, config: RunnableConfig) => {
  await dispatchCustomEvent("progress_update", {
    step: "processing",
    progress: 0.5,
  }, config);
  
  const result = await processData(state);
  
  await dispatchCustomEvent("step_complete", {
    step: "processing",
    result: result.summary,
  }, config);
  
  return result;
};

// Stream custom events
for await (const chunk of app.streamEvents(
  { messages: [new HumanMessage("process this")] },
  { version: "v2" }
)) {
  if (chunk.event === "on_custom_event") {
    console.log("Custom event:", chunk.data);
  }
}
```

## Streaming from Tools and Nodes

### How to stream events from within a tool

Stream progress and results from tool executions within nodes using custom tags.

```typescript
import { tool } from "@langchain/core/tools";
import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";

const getItems = tool(
  async (input, config) => {
    const template = ChatPromptTemplate.fromMessages([
      ["human", "{input}"]
    ]);
    
    const model = new ChatAnthropic({
      model: "claude-3-5-sonnet-20240620",
      temperature: 0,
    });

    const chain = template.pipe(model);
    
    // Add custom tags for filtering
    const response = await chain.invoke(
      { input: input.input },
      { ...config, tags: ["my_tool"] }
    );
    
    return response.content;
  },
  {
    name: "get_items",
    description: "Get items from the database",
    schema: z.object({
      input: z.string(),
    }),
  }
);

// Stream events from tools with tag filtering
for await (const chunk of app.streamEvents(
  { messages: [new HumanMessage("get some items")] },
  { 
    version: "v2",
    includeTags: ["my_tool"]
  }
)) {
  if (chunk.event === "on_chat_model_stream") {
    console.log("Tool streaming:", chunk.data.chunk.content);
  }
}
```

### How to stream from the final node

Stream results specifically from the final node in your graph execution.

```typescript
const finalNode = async (state: typeof StateAnnotation.State, config: RunnableConfig) => {
  // Process final results
  const finalResult = await processFinalResults(state);
  
  // Stream final node events
  await dispatchCustomEvent("final_result", {
    result: finalResult,
    timestamp: new Date().toISOString(),
  }, config);
  
  return { messages: [new AIMessage(finalResult)] };
};

// Add final node to workflow
const workflow = new StateGraph(StateAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", new ToolNode(tools))
  .addNode("final", finalNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent")
  .addEdge("agent", "final");

// Stream events from final node
for await (const chunk of app.streamEvents(
  { messages: [new HumanMessage("complete the task")] },
  { version: "v2" }
)) {
  if (chunk.event === "on_custom_event" && chunk.name === "final_result") {
    console.log("Final result:", chunk.data);
  }
}
```
