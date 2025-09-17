import type { Result } from 'neverthrow'

/**
 * Configuration for retry operations
 */
type RetryConfig = {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

/**
 * Default retry configuration for Supabase operations
 */
const DEFAULT_SUPABASE_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
}

/**
 * Determines if an error is retryable based on common network/fetch failures
 */
function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const errorMessage =
    'message' in error ? String(error.message).toLowerCase() : ''
  const errorName = 'name' in error ? String(error.name).toLowerCase() : ''

  const retryablePatterns = [
    'fetch failed',
    'network error',
    'timeout',
    'connection refused',
    'connection reset',
    'socket hang up',
    'enotfound',
    'econnreset',
    'etimedout',
  ]

  return retryablePatterns.some(
    (pattern) => errorMessage.includes(pattern) || errorName.includes(pattern),
  )
}

/**
 * Retry a function with exponential backoff using Result types
 */
export async function retryWithExponentialBackoff<T, E>(
  fn: () => Promise<Result<T, E>>,
  config: RetryConfig = DEFAULT_SUPABASE_RETRY_CONFIG,
): Promise<Result<T, E>> {
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const result = await fn()

    if (result.isOk()) {
      return result
    }

    if (attempt === config.maxAttempts || !isRetryableError(result.error)) {
      return result
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      config.baseDelayMs * config.backoffMultiplier ** (attempt - 1),
      config.maxDelayMs,
    )

    console.warn(
      `Supabase operation failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${delay}ms:`,
      result.error,
    )

    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  return await fn()
}
