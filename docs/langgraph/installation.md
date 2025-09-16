# Installation & Setup

## What is LangGraph.js
LangGraph.js is a low-level orchestration framework for building controllable agents. It provides:
- Reliability and controllability
- Extensible agent design
- First-class streaming support

## Installation
```bash
# Basic installation
npm install @langchain/langgraph @langchain/core

# Additional packages (as needed)
npm install @langchain/openai
npm install @langchain/anthropic
```

## Basic Setup
```js
// Basic StateGraph setup
import { StateGraph } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

// Define your state
interface AgentState {
  messages: BaseMessage[];
}

// Create a new graph
const workflow = new StateGraph<AgentState>({
  channels: {
    messages: {
      value: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
      default: () => [],
    },
  },
});
```