import { Result, ResultAsync } from 'neverthrow'

export const standardErrorTransformer = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error))

export const fromThrowable = <T, E extends Error = Error>(
  fn: () => T,
  errorTransformer?: (error: unknown) => E,
) =>
  Result.fromThrowable(
    fn,
    errorTransformer ?? (standardErrorTransformer as (error: unknown) => E),
  )

export const fromAsyncThrowable = <T, E extends Error = Error>(
  fn: () => Promise<T>,
  errorTransformer?: (error: unknown) => E,
) =>
  ResultAsync.fromThrowable(
    fn,
    errorTransformer ?? (standardErrorTransformer as (error: unknown) => E),
  )

export const withContext =
  (context: string) =>
  (error: unknown): Error => {
    const baseError = standardErrorTransformer(error)
    return new Error(`${context}: ${baseError.message}`)
  }
