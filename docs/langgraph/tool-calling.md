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

In this example we will build a ReAct agent that always calls a certain tool first, before making any plans. In this example, we will create an agent with a search tool. However, at the start we will force the agent to call the search tool (and then let it do whatever it wants after). This is useful when you know you want to execute specific actions in your application but also want the flexibility of letting the LLM follow up on the user's query after going through that fixed sequence.

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const search = tool(
  async (input) => {
    return "Cold, with a low of 3℃";
  },
  {
    name: "search",
    description: "Use to surf the web, fetch current information, check the weather, and retrieve other information.",
    schema: z.object({
      query: z.string().describe("The query to use in your search."),
    }),
  }
);

const model = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
});

const firstModel = model.bindTools([search], {
  tool_choice: "search",
});

const regularModel = model.bindTools([search]);
```

```typescript
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { isAIMessage } from "@langchain/core/messages";

const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  if (isAIMessage(lastMessage) && lastMessage.tool_calls?.length) {
    return "tools";
  }
  return "__end__";
};

const callFirstModel = async (state: typeof MessagesAnnotation.State) => {
  const response = await firstModel.invoke(state.messages);
  return { messages: [response] };
};

const callModel = async (state: typeof MessagesAnnotation.State) => {
  const response = await regularModel.invoke(state.messages);
  return { messages: [response] };
};

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("first_agent", callFirstModel)
  .addNode("agent", callModel)
  .addNode("tools", new ToolNode([search]))
  .addEdge("__start__", "first_agent")
  .addEdge("first_agent", "tools")
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

const app = workflow.compile();
```

### How to handle tool calling errors

LLMs aren't perfect at calling tools. The model may try to call a tool that doesn't exist or fail to return arguments that match the requested schema. Strategies like keeping schemas simple, reducing the number of tools you pass at once, and having good names and descriptions can help mitigate this risk, but aren't foolproof.

This guide covers some ways to build error handling into your graphs to mitigate these failure modes.

```typescript
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseMessage, isAIMessage } from "@langchain/core/messages";

const getWeather = tool((input) => {
  if (["sf", "san francisco"].includes(input.location.toLowerCase())) {
    return "It's 60 degrees and foggy.";
  } else if (input.location.toLowerCase() === "san francisco") {
    throw new Error("Input queries must be all capitals");
  } else {
    throw new Error("Invalid input.");
  }
}, {
  name: "get_weather",
  description: "Call to get the current weather.",
  schema: z.object({
    location: z.string().describe("Location to get the weather for."),
  }),
});

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
