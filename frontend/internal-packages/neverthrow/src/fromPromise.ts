import { ResultAsync } from 'neverthrow'

const defaultErrorFn = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error))

export function fromPromise<T>(promise: Promise<T>): ResultAsync<T, Error>
export function fromPromise<T, E extends Error>(
  promise: Promise<T>,
  errorFn: (error: unknown) => E,
): ResultAsync<T, E>
export function fromPromise<T, E extends Error>(
  promise: Promise<T>,
  errorFn?: (error: unknown) => E,
) {
  return ResultAsync.fromPromise(promise, errorFn ?? defaultErrorFn)
}
