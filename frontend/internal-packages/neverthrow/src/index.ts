import { err, ok, Result, ResultAsync } from 'neverthrow'
import type * as v from 'valibot'

const defaultErrorFn = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error))

export function fromThrowable<A extends readonly unknown[], T>(
  fn: (...args: A) => T,
): (...args: A) => Result<T, Error>
export function fromThrowable<A extends readonly unknown[], T, E extends Error>(
  fn: (...args: A) => T,
  errorFn: (error: unknown) => E,
): (...args: A) => Result<T, E>
export function fromThrowable<A extends readonly unknown[], T, E extends Error>(
  fn: (...args: A) => T,
  errorFn?: (error: unknown) => E,
) {
  return Result.fromThrowable(fn, errorFn ?? defaultErrorFn)
}

export function fromAsyncThrowable<A extends readonly unknown[], T>(
  fn: (...args: A) => Promise<T>,
): (...args: A) => ResultAsync<T, Error>
export function fromAsyncThrowable<
  A extends readonly unknown[],
  T,
  E extends Error,
>(
  fn: (...args: A) => Promise<T>,
  errorFn: (error: unknown) => E,
): (...args: A) => ResultAsync<T, E>
export function fromAsyncThrowable<
  A extends readonly unknown[],
  T,
  E extends Error,
>(fn: (...args: A) => Promise<T>, errorFn?: (error: unknown) => E) {
  return ResultAsync.fromThrowable(fn, errorFn ?? defaultErrorFn)
}

export function fromSafeParse<
  TSchema extends v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>,
>(result: v.SafeParseResult<TSchema>): Result<v.InferOutput<TSchema>, Error> {
  if (result.success) {
    return ok(result.output)
  }

  const errorMessage = result.issues.map((issue) => issue.message).join(', ')
  return err(new Error(errorMessage))
}
