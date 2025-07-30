/**
 * Retry configuration for workflow operations
 */
export const WORKFLOW_RETRY_CONFIG = {
  /**
   * Maximum number of retries for DDL execution failures
   * When DDL execution fails, the workflow will retry up to this many times
   * by going back to the designSchema node with the error information
   */
  MAX_DDL_EXECUTION_RETRIES: 1,
} as const
