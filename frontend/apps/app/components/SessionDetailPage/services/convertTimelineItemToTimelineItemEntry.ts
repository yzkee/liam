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
        query_results: P.array(),
      },
      (item): QueryResultTimelineItemEntry => {
        let results = item.query_results

        // Parse the results if they are an array
        if (Array.isArray(results)) {
          results = results.map(parseQueryResult)
        }

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
