/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  GENERAL: 'Sorry, an error occurred. Please try again.',
  FETCH_FAILED: 'Failed to get response',
  RESPONSE_NOT_READABLE: 'Response body is not readable',
} as const

/**
 * Navigation confirmation messages
 */
export const NAVIGATION_MESSAGES = {
  SESSION_CANCEL_CONFIRM:
    // eslint-disable-next-line no-non-english/no-non-english-characters
    'セッションが進行中です。ページを離れるとセッションがキャンセルされます。続行しますか？',
} as const
