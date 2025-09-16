# Advanced Features

## Subgraphs
<!-- Subgraph creation and usage -->
<!-- State transformation -->
<!-- Input/output mapping -->

## Node Retries and Caching
<!-- Retry policies -->
<!-- Exponential backoff -->
<!-- Node result caching -->
<!-- Cache invalidation -->

## Runtime Configuration
<!-- Dynamic configuration -->
<!-- Environment-specific settings -->
<!-- Feature flags -->

## Structured Output
<!-- Enforcing output schemas -->
<!-- Response formatting -->
<!-- Validation patterns -->

## Production & Platform

### Application Structure

A LangGraph application must be configured with a LangGraph configuration file in order to be deployed to LangGraph Platform (or to be self-hosted). This how-to guide discusses the basic steps to setup a LangGraph application for deployment using `requirements.txt` to specify project dependencies.

#### Setup with pyproject.toml

If you prefer using poetry for dependency management, check out the how-to guide on using `pyproject.toml` for LangGraph Platform.

#### Setup with a Monorepo

If you are interested in deploying a graph located inside a monorepo, take a look at this repository for an example of how to do so.

The final repository structure will look something like this:

```
my-app/
├── my_agent # all project code lies within here
│   ├── utils # utilities for your graph
│   ├── __init__.py
│   ├── tools.py # tools for your graph
│   ├── prompts.py # prompts for your graph
│   └── state.py # state definition of your graph
├── requirements.txt # package dependencies
└── init.py
```

#### Specify Dependencies

Create a `requirements.txt` file in the root of your repository and specify the dependencies for your project:

```txt
langchain-openai
langgraph
```

#### Specify Environment Variables

Environment variables can be specified in the deployment settings. Sensitive values such as API keys (e.g., `OPENAI_API_KEY`) should be specified as secrets.

Additional non-secret environment variables can be specified as well.

#### Define Graphs

Create your graph definition in a Python file. For example, in `my_agent/state.py`:

```python
from typing import TypedDict
from langgraph import StateGraph

class State(TypedDict):
    messages: list

def my_node(state: State):
    return {"messages": state["messages"] + ["Hello from my_node"]}

graph = StateGraph(State)
graph.add_node("my_node", my_node)
graph.set_entry_point("my_node")
graph.set_finish_point("my_node")
```

#### Create LangGraph Configuration File

Create a `langgraph.json` configuration file in the root of your repository:

```json
{
  "dependencies": ["requirements.txt"],
  "graphs": {
    "my_graph": "./my_agent/state.py:graph"
  },
  "env": ".env"
}
```

### Deployment

#### Create New Deployment

To deploy your LangGraph application:

1. Navigate to the LangGraph Platform and create a new deployment
2. Authorize LangChain's hosted-langserve GitHub app to access the selected repositories
3. After installation is complete, return to the Create New Deployment panel and select the GitHub repository to deploy from the dropdown menu
4. Specify a name for the deployment
5. Specify the desired Git Branch. A deployment is linked to a branch. When a new revision is created, code for the linked branch will be deployed
6. Specify the full path to the LangGraph API config file including the file name. For example, if the file `langgraph.json` is in the root of the repository, simply specify `langgraph.json`
7. Check/uncheck checkbox to automatically update deployment on push to branch. If checked, the deployment will automatically be updated when changes are pushed to the specified Git Branch
8. Select the desired Deployment Type:
   - Development deployments are meant for non-production use cases and are provisioned with minimal resources
   - Production deployments can serve up to 500 requests/second and are provisioned with highly available storage with automatic backups
9. Determine if the deployment should be shareable through LangGraph Studio. If unchecked, the deployment will only be accessible with a valid LangSmith API key for the workspace. If checked, the deployment will be accessible through LangGraph Studio to any LangSmith user
10. Specify Environment Variables and secrets. Sensitive values such as API keys should be specified as secrets
11. A new LangSmith Tracing Project is automatically created with the same name as the deployment

#### Environment Variables

Environment variables and secrets can be configured for deployments:

- Sensitive values such as API keys (e.g., `OPENAI_API_KEY`) should be specified as secrets
- Additional non-secret environment variables can be specified as well

### Streaming API

LangGraph makes it easy to stream the state of the graph as it executes. Use the stream modes `updates` and `values` to stream the state of the graph as it executes.

#### Basic Usage

```python
from langgraph_sdk import get_client

client = get_client(url=DEPLOYMENT_URL)

# Using the graph deployed with the name "agent"
assistant_id = "agent"
# create a thread
thread = client.threads.create()
thread_id = thread.thread_id

# If you don't need to persist the outputs of a run, you can pass None instead of thread_id when streaming.
```

#### Stream Graph State

Use this to stream only the state updates returned by the nodes after each step. The streamed outputs include the name of the node as well as the update.

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "ice cream"},
    stream_mode="updates"
):
    print(chunk.data)
```

#### Stream Multiple Modes

You can stream multiple modes at once by passing a list of modes:

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "ice cream"},
    stream_mode=["updates", "values"]
):
    print(chunk.data)
```

#### Stream Values

Use this to stream the full value of the state after each step. The streamed outputs include the name of the node as well as the update.

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "ice cream"},
    stream_mode="values"
):
    print(chunk.data)
```

#### Stream Debug Information

Use the `debug` stream mode to get debug information about the graph execution:

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "ice cream"},
    stream_mode="debug"
):
    print(chunk.data)
```

#### Stream LLM Tokens

Use the `messages-tuple` stream mode to stream LLM tokens as they are generated:

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "ice cream"},
    stream_mode="messages-tuple"
):
    print(chunk.data)
```

#### Stream Custom Data

Use the `custom` stream mode to stream custom data from your nodes:

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "ice cream"},
    stream_mode="custom"
):
    print(chunk.data)
```

#### Stream Events

Use the `events` stream mode to stream events from the graph execution:

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "ice cream"},
    stream_mode="events"
):
    print(chunk.data)
```

#### Stateful vs Stateless Runs

Examples above assume that you want to persist the outputs of a streaming run in the checkpointer DB and have created a thread. To create a thread:

```python
thread = client.threads.create()
thread_id = thread.thread_id
```

If you don't need to persist the outputs of a run, you can pass `None` instead of `thread_id` when streaming.

#### Subgraphs

Subgraphs can also be streamed. The streaming behavior is the same as for regular graphs, but you can specify which subgraph to stream from using the subgraph parameter.

### Authentication & Access Control

#### Client Authentication

To authenticate with the LangGraph Platform, you need to configure your client with the appropriate credentials:

```python
from langgraph_sdk import get_client

# Using API key authentication
client = get_client(
    url="https://your-deployment-url.com",
    api_key="your-api-key"
)
```

#### Deployment URL Setup

Each deployment has a unique URL that can be used to access the deployed graph:

```python
# Example deployment URL
DEPLOYMENT_URL = "https://your-deployment-id.us.langgraph.app"

client = get_client(url=DEPLOYMENT_URL)
```

#### API Key Configuration

API keys should be configured as environment variables or secrets in your deployment settings. For local development, you can set them in your environment:

```bash
export LANGGRAPH_API_KEY="your-api-key"
export OPENAI_API_KEY="your-openai-key"
```

### Debugging & Monitoring

#### Debug Stream Mode

Use the debug stream mode to get comprehensive information about graph execution:

```python
async for chunk in client.runs.stream(
    thread_id,
    assistant_id,
    input={"topic": "debugging"},
    stream_mode="debug"
):
    # Debug information includes:
    # - Node execution details
    # - State transitions
    # - Error information
    # - Performance metrics
    print(f"Debug info: {chunk.data}")
```

#### Comprehensive Logging

Enable comprehensive logging in your graph nodes for better debugging:

```python
import logging

logger = logging.getLogger(__name__)

def my_node(state):
    logger.info(f"Processing state: {state}")
    try:
        # Your node logic here
        result = process_data(state)
        logger.info(f"Node completed successfully: {result}")
        return result
    except Exception as e:
        logger.error(f"Node failed with error: {e}")
        raise
```

#### Troubleshooting

Common troubleshooting patterns:

1. **Check deployment status**: Verify your deployment is running and accessible
2. **Validate configuration**: Ensure your `langgraph.json` file is correctly configured
3. **Monitor environment variables**: Check that all required environment variables and secrets are set
4. **Review logs**: Use debug stream mode to get detailed execution information
5. **Test locally**: Test your graph locally before deploying to catch issues early

#### Performance Monitoring

Monitor your deployment performance using the built-in metrics:

- Request latency
- Throughput (requests per second)
- Error rates
- Resource utilization

Access these metrics through the LangGraph Platform dashboard or via the monitoring API.
