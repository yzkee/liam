import * as v from 'valibot'

// TODO: Make sure to use it when storing data and as an inferential type
export const timelineItemSchema = v.object({
  id: v.string(),
  design_session_id: v.pipe(v.string(), v.uuid()),
  content: v.string(),
  type: v.picklist([
    'user',
    'assistant',
    'schema_version',
    'error',
    'assistant_log',
    'query_result',
  ]),
  user_id: v.nullable(v.pipe(v.string(), v.uuid())),
  created_at: v.string(),
  organization_id: v.pipe(v.string(), v.uuid()),
  building_schema_version_id: v.nullable(v.pipe(v.string(), v.uuid())),
  query_result_id: v.nullable(v.pipe(v.string(), v.uuid())),
  validation_queries: v.nullable(
    v.object({
      id: v.pipe(v.string(), v.uuid()),
      query_string: v.string(),
      validation_results: v.array(
        v.object({
          id: v.pipe(v.string(), v.uuid()),
          result_set: v.nullable(v.array(v.unknown())),
          status: v.string(),
          error_message: v.nullable(v.string()),
          executed_at: v.string(),
        }),
      ),
    }),
  ),
})
