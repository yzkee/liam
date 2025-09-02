---
description: Execute schema benchmark for specified model (LiamDB or OpenAI)
---

# Benchmark Command

Execute schema benchmark comparison between LiamDB and OpenAI models.

## Arguments
- `model`: Target model to benchmark (LiamDB or OpenAI, case-insensitive)

## Usage
```
/benchmark-execute LiamDB
/benchmark-execute openai
```

## Execution

**Important**: Benchmark operations are time-intensive. The system now supports:
- Parallel dataset processing for faster execution
- Automatic input format standardization
- Improved error handling and progress reporting

First, I'll clean up any existing workspace and set up a fresh benchmark environment with multiple datasets:

```bash
rm -rf benchmark-workspace && pnpm --filter @liam-hq/schema-bench setupWorkspace
```

This will set up two benchmark datasets:
- **default**: Standard schema generation benchmark (3 complex cases)
- **entity-extraction**: Tests if specified table/column names appear in output (5 cases)

The system features:
- **Parallel Processing**: Datasets are processed simultaneously for faster execution
- **Smart Concurrency**: Each dataset uses MAX_CONCURRENT=2 for stability
- **Input Standardization**: Entity-extraction inputs are automatically wrapped in `{"input": "..."}` format

Next, I'll execute the specified model on all datasets:

{{#if (eq (lower model) "liamdb")}}
```bash
pnpm --filter @liam-hq/schema-bench executeLiamDBMulti
```
{{else if (eq (lower model) "openai")}}
```bash
pnpm --filter @liam-hq/schema-bench executeOpenai
```
{{else}}
**Error**: Invalid model specified. Please use 'LiamDB' or 'OpenAI'.
{{/if}}

If execution succeeds, I'll run the evaluation on all datasets:

```bash
pnpm --filter @liam-hq/schema-bench evaluateSchemaMulti
```

The evaluation will display results for each dataset with focused metrics:

**Default Dataset Metrics:**
- Table F1 Score & Recall
- Column F1 Score & Recall  
- Primary Key Accuracy
- Foreign Key F1 Score & Recall
- Overall Schema Accuracy

**Entity-extraction Dataset Metrics (Recall-focused):**
- **Table Recall**: % of required tables that were generated
- **Column Recall**: % of required columns that were generated
- **Perfect Extraction Rate**: Whether all mentioned entities were found

### Expected Performance:
- **Default dataset**: ~60-80% overall accuracy for complex schemas
- **Entity-extraction dataset**: ~100% recall for mentioned entities

### Execution Time:
- Setup: ~5 seconds
- LiamDB execution: ~20-30 minutes for all 8 cases
- Evaluation: ~10 seconds
