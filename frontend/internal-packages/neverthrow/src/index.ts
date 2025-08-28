import { Result, ResultAsync } from 'neverthrow'

export const standardErrorTransformer = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error))

export const fromThrowable = <
  A extends readonly unknown[],
  T,
  E extends Error = Error,
>(
  fn: (...args: A) => T,
  errorTransformer?: (error: unknown) => E,
) =>
  Result.fromThrowable(
    fn,
    errorTransformer ?? (standardErrorTransformer as (error: unknown) => E),
  )

export const fromAsyncThrowable = <
  A extends readonly unknown[],
  T,
  E extends Error = Error,
>(
  fn: (...args: A) => Promise<T>,
  errorTransformer?: (error: unknown) => E,
) =>
  ResultAsync.fromThrowable(
    fn,
    errorTransformer ?? (standardErrorTransformer as (error: unknown) => E),
  )
