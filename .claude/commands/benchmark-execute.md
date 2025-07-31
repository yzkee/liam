---
description: Execute schema benchmark for specified model (LiamDB or OpenAI)
---

# Benchmark Command

Execute schema benchmark comparison between LiamDB and OpenAI models.

## Arguments
- `model`: Target model to benchmark (LiamDB or OpenAI, case-insensitive)

## Usage
```
/benchmark LiamDB
/benchmark openai
```

## Execution

First, I'll clean up any existing workspace and set up a fresh benchmark environment:

```bash
rm -rf benchmark-workspace && pnpm --filter @liam-hq/schema-bench setupWorkspace
```

Next, I'll execute the specified model:

{{#if (eq (lower model) "liamdb")}}
```bash
pnpm --filter @liam-hq/schema-bench executeLiamDB
```
{{else if (eq (lower model) "openai")}}
```bash
pnpm --filter @liam-hq/schema-bench executeOpenai
```
{{else}}
**Error**: Invalid model specified. Please use 'LiamDB' or 'OpenAI'.
{{/if}}

If execution succeeds, I'll run the evaluation:

```bash
pnpm --filter @liam-hq/schema-bench evaluateSchema
```

Finally, I'll read the latest summary results from `benchmark-workspace/evaluation/` and display the metrics in a formatted table.

The results will show average metrics including:
- Table F1 Score
- Table All Correct Rate
- Column F1 Score Average
- Column All Correct Rate Average
- Primary Key Accuracy Average
- Constraint Accuracy
- Foreign Key F1 Score
- Foreign Key All Correct Rate
- Overall Schema Accuracy
