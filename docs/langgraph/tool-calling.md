# Tool Calling

This guide covers how to use LangGraph's prebuilt ToolNode for tool calling.

ToolNode is a LangChain Runnable that takes graph state (with a list of messages) as input and outputs state update with the result of tool calls. It is designed to work well out-of-box with LangGraph's prebuilt ReAct agent, but can also work with any StateGraph as long as its state has a messages key with an appropriate reducer.

## ToolNode Usage

### How to call tools using ToolNode

This guide covers how to use LangGraph's prebuilt ToolNode for tool calling.

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const getWeather = tool((input) => {
  if (["sf", "san francisco"].includes(input.location.toLowerCase())) {
    return "It's 60 degrees and foggy.";
  } else {
    return "It's 90 degrees and sunny.";
  }
}, {
  name: "get_weather",
  description: "Call to get the current weather.",
  schema: z.object({
    location: z.string().describe("Location to get the weather for."),
  }),
});
```

```typescript
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseMessage, isAIMessage } from "@langchain/core/messages";

const toolNode = new ToolNode([getWeather]);

const modelWithTools = new ChatAnthropic({
  model: "claude-3-haiku-20240307",
  temperature: 0,
}).bindTools([getWeather]);

const shouldContinue = async (state: typeof MessagesAnnotation.State) => {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  if (isAIMessage(lastMessage) && lastMessage.tool_calls?.length) {
    return "tools";
  }
  return "__end__";
};

const callModel = async (state: typeof MessagesAnnotation.State) => {
  const response = await modelWithTools.invoke(state.messages);
  return { messages: [response] };
};

const app = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent")
  .compile();
```

### Manually call ToolNode

```typescript
import { AIMessage } from "@langchain/core/messages";

const toolResult = await toolNode.invoke({
  messages: [
    new AIMessage({
      content: "",
      tool_calls: [
        {
          name: "get_weather",
          args: { location: "sf" },
          id: "tool_call_id",
        },
      ],
    }),
  ],
});

console.log(toolResult);
```

### ReAct Agent

```typescript
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const agent = createReactAgent({
  llm: modelWithTools,
  tools: [getWeather],
});

const finalState = await agent.invoke({
  messages: [{ role: "user", content: "what is the weather in sf" }],
});

console.log(finalState.messages[finalState.messages.length - 1].content);
```

## Tool Calling Patterns

### How to force an agent to call a tool

In this example we will build a ReAct agent that **always** calls a certain tool first, before making any plans. In this example, we will create an agent with a search tool. However, at the start we will force the agent to call the search tool (and then let it do whatever it wants after). This is useful when you know you want to execute specific actions in your application but also want the flexibility of letting the LLM follow up on the user's query after going through that fixed sequence.

```typescript
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const searchTool = new DynamicStructuredTool({
  name: "search",
  description:
    "Use to surf the web, fetch current information, check the weather, and retrieve other information.",
  schema: z.object({
    query: z.string().describe("The query to use in your search."),
  }),
  func: async ({ }: { query: string }) => {
    // This is a placeholder for the actual implementation
    return "Cold, with a low of 13 ℃";
  },
});

const tools = [searchTool];
```

```typescript
import { ToolNode } from "@langchain/langgraph/prebuilt";

const toolNode = new ToolNode(tools);
```

```typescript
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  temperature: 0,
  model: "gpt-4o",
});

const boundModel = model.bindTools(tools);
```

```typescript
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
});
```

```typescript
import { AIMessage, AIMessageChunk } from "@langchain/core/messages";
import { RunnableConfig } from "@langchain/core/runnables";
import { concat } from "@langchain/core/utils/stream";

// Define logic that will be used to determine which conditional edge to go down
const shouldContinue = (state: typeof AgentState.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  // If there is no function call, then we finish
  if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
    return "end";
  }
  // Otherwise if there is, we continue
  return "continue";
};

// Define the function that calls the model
const callModel = async (
  state: typeof AgentState.State,
  config?: RunnableConfig,
) => {
  const { messages } = state;
  let response: AIMessageChunk | undefined;
  for await (const message of await boundModel.stream(messages, config)) {
    if (!response) {
      response = message;
    } else {
      response = concat(response, message);
    }
  }
  // We return an object, because this will get added to the existing list
  return {
    messages: response ? [response as AIMessage] : [],
  };
};

// This is the new first - the first call of the model we want to explicitly hard-code some action
const firstModel = async (state: typeof AgentState.State) => {
  const humanInput = state.messages[state.messages.length - 1].content || "";
  return {
    messages: [
      new AIMessage({
        content: "",
        tool_calls: [
          {
            name: "search",
            args: {
              query: humanInput,
            },
            id: "tool_abcd123",
          },
        ],
      }),
    ],
  };
};
```

```typescript
import { END, START, StateGraph } from "@langchain/langgraph";

// Define a new graph
const workflow = new StateGraph(AgentState)
  // Define the new entrypoint
  .addNode("first_agent", firstModel)
  // Define the two nodes we will cycle between
  .addNode("agent", callModel)
  .addNode("action", toolNode)
  // Set the entrypoint as `first_agent`
  // by creating an edge from the virtual __start__ node to `first_agent`
  .addEdge(START, "first_agent")
  // We now add a conditional edge
  .addConditionalEdges(
    // First, we define the start node. We use `agent`.
    // This means these are the edges taken after the `agent` node is called.
    "agent",
    // Next, we pass in the function that will determine which node is called next.
    shouldContinue,
    // Finally we pass in a mapping.
    // The keys are strings, and the values are other nodes.
    // END is a special node marking that the graph should finish.
    // What will happen is we will call `should_continue`, and then the output of that
    // will be matched against the keys in this mapping.
    // Based on which one it matches, that node will then be called.
    {
      // If `tools`, then we call the tool node.
      continue: "action",
      // Otherwise we finish.
      end: END,
    },
  )
  // We now add a normal edge from `tools` to `agent`.
  // This means that after `tools` is called, `agent` node is called next.
  .addEdge("action", "agent")
  // After we call the first agent, we know we want to go to action
  .addEdge("first_agent", "action");

// Finally, we compile it!
// This compiles it into a LangChain Runnable,
// meaning you can use it as you would any other runnable
const app = workflow.compile();
```

### How to handle tool calling errors

LLMs aren't perfect at calling tools. The model may try to call a tool that doesn't exist or fail to return arguments that match the requested schema. Strategies like keeping schemas simple, reducing the number of tools you pass at once, and having good names and descriptions can help mitigate this risk, but aren't foolproof.

This guide covers some ways to build error handling into your graphs to mitigate these failure modes.

#### Using the prebuilt ToolNode

To start, define a mock weather tool that has some hidden restrictions on input queries. The intent here is to simulate a real-world case where a model fails to call a tool correctly:

```typescript
import { z } from "zod";
import { tool } from "@langchain/core/tools";

const getWeather = tool(async ({ location }) => {
  if (location === "SAN FRANCISCO") {
    return "It's 60 degrees and foggy";
  } else if (location.toLowerCase() === "san francisco") {
    throw new Error("Input queries must be all capitals");
  } else {
    throw new Error("Invalid input.");
  }
}, {
  name: "get_weather",
  description: "Call to get the current weather",
  schema: z.object({
    location: z.string(),
  }),
});
```

Next, set up a graph implementation of the ReAct agent. This agent takes some query as input, then repeatedly call tools until it has enough information to resolve the query. We'll use the prebuilt ToolNode to execute called tools, and a small, fast model powered by Anthropic:

```typescript
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseMessage, isAIMessage } from "@langchain/core/messages";

const toolNode = new ToolNode([getWeather]);

const modelWithTools = new ChatAnthropic({
  model: "claude-3-haiku-20240307",
  temperature: 0,
}).bindTools([getWeather]);

const shouldContinue = async (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if (isAIMessage(lastMessage) && lastMessage.tool_calls?.length) {
    return "tools";
  }
  return "__end__";
};

const callModel = async (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const response = await modelWithTools.invoke(messages);
  return { messages: [response] };
};

const app = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue, {
    // Explicitly list possible destinations so that
    // we can automatically draw the graph below.
    tools: "tools",
    __end__: "__end__",
  })
  .compile();
```

When you try to call the tool, you can see that the model calls the tool with a bad input, causing the tool to throw an error. The prebuilt ToolNode that executes the tool has some built-in error handling that captures the error and passes it back to the model so that it can try again.

#### Custom strategies

This is a fine default in many cases, but there are cases where custom fallbacks may be better.

For example, the below tool requires as input a list of elements of a specific length - tricky for a small model! We'll also intentionally avoid pluralizing `topic` to trick the model into thinking it should pass a string:

```typescript
import { StringOutputParser } from "@langchain/core/output_parsers";

const haikuRequestSchema = z.object({
  topic: z.array(z.string()).length(3),
});

const masterHaikuGenerator = tool(async ({ topic }) => {
  const model = new ChatAnthropic({
    model: "claude-3-haiku-20240307",
    temperature: 0,
  });
  const chain = model.pipe(new StringOutputParser());
  const topics = topic.join(", ");
  const haiku = await chain.invoke(`Write a haiku about ${topics}`);
  return haiku;
}, {
  name: "master_haiku_generator",
  description: "Generates a haiku based on the provided topics.",
  schema: haikuRequestSchema,
});
```

A better strategy might be to trim the failed attempt to reduce distraction, then fall back to a more advanced model. Here's an example - note the custom-built tool calling node instead of the prebuilt `ToolNode`:

```typescript
import { AIMessage, ToolMessage, RemoveMessage } from "@langchain/core/messages";

const callTool = async (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const toolsByName = { master_haiku_generator: masterHaikuGenerator };
  const lastMessage = messages[messages.length - 1] as AIMessage;
  const outputMessages: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls) {
    try {
      const toolResult = await toolsByName[toolCall.name].invoke(toolCall);
      outputMessages.push(toolResult);
    } catch (error: any) {
      // Return the error if the tool call fails
      outputMessages.push(
        new ToolMessage({
          content: error.message,
          name: toolCall.name,
          tool_call_id: toolCall.id!,
          additional_kwargs: { error }
        })
      );
    }
  }
  return { messages: outputMessages };
};

const model = new ChatAnthropic({
  model: "claude-3-haiku-20240307",
  temperature: 0,
});

const modelWithTools = model.bindTools([masterHaikuGenerator]);

const betterModel = new ChatAnthropic({
  model: "claude-3-5-sonnet-20240620",
  temperature: 0,
});

const betterModelWithTools = betterModel.bindTools([masterHaikuGenerator]);

const shouldContinue = async (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if (isAIMessage(lastMessage) && lastMessage.tool_calls?.length) {
    return "tools";
  }
  return "__end__";
};

const shouldFallback = async (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const failedToolMessages = messages.find((message) => {
    return message._getType() === "tool" && message.additional_kwargs.error !== undefined;
  });
  if (failedToolMessages) {
    return "remove_failed_tool_call_attempt";
  }
  return "agent";
};

const callModel = async (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const response = await modelWithTools.invoke(messages);
  return { messages: [response] };
};

const removeFailedToolCallAttempt = async (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  // Remove all messages from the most recent
  // instance of AIMessage onwards.
  const lastAIMessageIndex = messages
    .map((msg, index) => ({ msg, index }))
    .reverse()
    .findIndex(({ msg }) => isAIMessage(msg));
  const messagesToRemove = messages.slice(lastAIMessageIndex);
  return { messages: messagesToRemove.map(m => new RemoveMessage({ id: m.id })) };
};

const callFallbackModel = async (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const response = await betterModelWithTools.invoke(messages);
  return { messages: [response] };
};

const app = new StateGraph(MessagesAnnotation)
  .addNode("tools", callTool)
  .addNode("agent", callModel)
  .addNode("remove_failed_tool_call_attempt", removeFailedToolCallAttempt)
  .addNode("fallback_agent", callFallbackModel)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue, {
    // Explicitly list possible destinations so that
    // we can automatically draw the graph below.
    tools: "tools",
    __end__: "__end__",
  })
  .addConditionalEdges("tools", shouldFallback, {
    remove_failed_tool_call_attempt: "remove_failed_tool_call_attempt",
    agent: "agent",
  })
  .addEdge("remove_failed_tool_call_attempt", "fallback_agent")
  .addEdge("fallback_agent", "tools")
  .compile();
```

The `tools` node will now return `ToolMessage`s with an `error` field in `additional_kwargs` if a tool call fails. If that happens, it will go to another node that removes the failed tool messages, and has a better model retry the tool call generation. We also add a trimming step via returning the special message modifier `RemoveMessage` to remove previous messages from the state.

### How to pass runtime values to tools

This guide shows how to define tools that depend on dynamically defined variables. These values are provided by your program, not by the LLM.

Tools can access the config.configurable field for values like user IDs that are known when a graph is initially executed, as well as managed values from the store for persistence across threads.

However, it can be convenient to access intermediate runtime values which are not known ahead of time, but are progressively generated as a graph executes, such as the current graph state. This guide will cover two techniques for this: The getCurrentTaskInput utility function, and closures.

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const model = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
});
```

#### The getCurrentTaskInput Utility Function

```typescript
import { getCurrentTaskInput } from "@langchain/langgraph";

const getCurrentTaskInputTool = tool(
  async (input) => {
    const currentTaskInput = getCurrentTaskInput();
    return `The current task input is: ${JSON.stringify(currentTaskInput)}`;
  },
  {
    name: "get_current_task_input",
    description: "Get the current task input",
    schema: z.object({}),
  }
);
```

#### Closures

```typescript
const createUserInfoTool = (userInfo: { name: string; age: number }) => {
  return tool(
    async (input) => {
      return `User info: ${userInfo.name} is ${userInfo.age} years old`;
    },
    {
      name: "get_user_info",
      description: "Get user information",
      schema: z.object({}),
    }
  );
};

const userInfo = { name: "Alice", age: 30 };
const userInfoTool = createUserInfoTool(userInfo);
```

## State Updates from Tools

### How to update graph state from tools

A common use case is updating graph state from inside a tool. For example, in a customer support application you might want to look up customer account number or ID in the beginning of the conversation. To update the graph state from the tool, you can return a Command object from the tool:

```typescript
import { tool } from "@langchain/core/tools";

const lookupUserInfo = tool(async (input, config) => {
  const userInfo = getUserInfo(config);
  return new Command({
    // update state keys
    update: {
      user_info: userInfo,
      messages: [
        new ToolMessage({
          content: "Successfully looked up user information",
          tool_call_id: config.toolCall.id,
        }),
      ],
    },
  });
}, {
  name: "lookup_user_info",
  description: "Use this to look up user information to better assist them with their questions.",
  schema: z.object(...),
});
```

This guide shows how you can do this using LangGraph's prebuilt components (createReactAgent and ToolNode).

```typescript
import { Annotation, Command, MessagesAnnotation } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const StateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  // user provided
  lastName: Annotation<string>,
  // updated by the tool
  userInfo: Annotation<Record<string, any>>,
});

const USER_ID_TO_USER_INFO = {
  abc123: {
    user_id: "abc123",
    name: "Bob Dylan",
    location: "New York, NY",
  },
  zyx987: {
    user_id: "zyx987",
    name: "Taylor Swift",
    location: "Beverly Hills, CA",
  },
};

const lookupUserInfo = tool(async (_, config) => {
  const userId = config.configurable?.user_id;
  if (userId === undefined) {
    throw new Error("Please provide a user id in config.configurable");
  }
  if (USER_ID_TO_USER_INFO[userId] === undefined) {
    throw new Error(`User "${userId}" not found`);
  }
  // Populated when a tool is called with a tool call from a model as input
  const toolCallId = config.toolCall.id;
  return new Command({
    update: {
      // update the state keys
      userInfo: USER_ID_TO_USER_INFO[userId],
      // update the message history
      messages: [
        {
          role: "tool",
          content: "Successfully looked up user information",
          tool_call_id: toolCallId,
        },
      ],
    },
  });
}, {
  name: "lookup_user_info",
  description: "Always use this to look up information about the user to better assist them with their questions.",
  schema: z.object({}),
});
```

```typescript
const stateModifier = (state: typeof StateAnnotation.State) => {
  const userInfo = state.userInfo;
  if (userInfo == null) {
    return state.messages;
  }
  const systemMessage = `User name is ${userInfo.name}. User lives in ${userInfo.location}`;
  return [
    {
      role: "system",
      content: systemMessage,
    },
    ...state.messages,
  ];
};
```

```typescript
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: "gpt-4o",
});

const agent = createReactAgent({
  llm: model,
  tools: [lookupUserInfo],
  stateSchema: StateAnnotation,
  stateModifier: stateModifier,
});
```

## Related Links

For more detailed information, refer to the official LangGraph.js documentation:

### ToolNode Usage
- [How to call tools using ToolNode](https://langchain-ai.github.io/langgraphjs/how-tos/tool-calling/)

### Tool Calling Patterns
- [How to force an agent to call a tool](https://langchain-ai.github.io/langgraphjs/how-tos/force-calling-a-tool-first/)
- [How to handle tool calling errors](https://langchain-ai.github.io/langgraphjs/how-tos/tool-calling-errors/)
- [How to pass runtime values to tools](https://langchain-ai.github.io/langgraphjs/how-tos/pass-run-time-values-to-tools/)

### State Updates from Tools
- [How to update graph state from tools](https://langchain-ai.github.io/langgraphjs/how-tos/update-state-from-tools/)

### Additional Tool-related Features
- [How to stream events from within a tool](https://langchain-ai.github.io/langgraphjs/how-tos/streaming-events-from-within-tools/)
