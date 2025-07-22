import { err, ok, type Result } from 'neverthrow'
import { match, P } from 'ts-pattern'
import type {
  AssistantLogTimelineItemEntry,
  AssistantTimelineItemEntry,
  ErrorTimelineItemEntry,
  QueryResultTimelineItemEntry,
  SchemaVersionTimelineItemEntry,
  TimelineItem,
  TimelineItemEntry,
  UserTimelineItemEntry,
} from '../types'

const safeJsonParse = (text: string): Result<unknown, Error> => {
  try {
    return ok(JSON.parse(text))
  } catch (error) {
    return err(
      new Error(
        `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ),
    )
  }
}

const parseQueryResult = (r: unknown) => {
  if (typeof r !== 'object' || r === null || !('result' in r)) {
    return r
  }

  if (typeof r.result === 'string') {
    const parseResult = safeJsonParse(r.result)
    if (parseResult.isOk()) {
      return {
        ...r,
        result: parseResult.value,
      }
    }
    // If parsing fails, keep the original string
    console.error('Failed to parse query result:', parseResult.error)
    return r
  }

  return {
    ...r,
    result: r.result,
  }
}

export const convertTimelineItemToTimelineItemEntry = (
  timelineItem: TimelineItem,
): TimelineItemEntry => {
  const baseItem = {
    id: timelineItem.id,
    content: timelineItem.content,
    timestamp: new Date(timelineItem.created_at),
  }

  return match(timelineItem)
    .with(
      { type: 'schema_version', building_schema_version_id: P.string },
      (item): SchemaVersionTimelineItemEntry => ({
        ...baseItem,
        type: 'schema_version',
        buildingSchemaVersionId: item.building_schema_version_id,
      }),
    )
    .with(
      { type: 'user' },
      (): UserTimelineItemEntry => ({
        ...baseItem,
        type: 'user',
      }),
    )
    .with(
      { type: 'assistant' },
      (): AssistantTimelineItemEntry => ({
        ...baseItem,
        type: 'assistant',
      }),
    )
    .with(
      { type: 'error' },
      (): ErrorTimelineItemEntry => ({
        ...baseItem,
        type: 'error',
      }),
    )
    .with(
      { type: 'assistant_log' },
      (): AssistantLogTimelineItemEntry => ({
        ...baseItem,
        type: 'assistant_log',
      }),
    )
    .with(
      {
        type: 'query_result',
        query_result_id: P.string,
        validation_queries: P.not(P.nullish),
      },
      (item): QueryResultTimelineItemEntry => {
        // Extract and format query results from validation data
        const validationResults =
          item.validation_queries?.validation_results || []
        const results = validationResults.flatMap((vr) =>
          (vr.result_set || []).map((result, index) => ({
            id: `${vr.id}-${index}`,
            sql: item.validation_queries?.query_string || '',
            success: vr.status === 'success',
            result: result,
            metadata: {
              executionTime: 0, // Not available in validation_results
              timestamp: vr.executed_at,
              affectedRows: null,
            },
          })),
        )

        return {
          ...baseItem,
          type: 'query_result',
          queryResultId: item.query_result_id,
          results,
        }
      },
    )
    .otherwise((item) => {
      console.warn(`Unknown timeline item type: ${item.type}`)
      return {
        ...baseItem,
        type: 'user' as const,
      }
    })
}
