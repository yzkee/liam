// Simple Result type implementation to avoid throw new Error() statements
interface Ok<T> {
  readonly isOk: true
  readonly isErr: false
  readonly value: T

  match<U>(onOk: (value: T) => U, onErr: (error: Error) => U): U
}

interface Err<E> {
  readonly isOk: false
  readonly isErr: true
  readonly error: E

  match<U>(onOk: (value: never) => U, onErr: (error: E) => U): U
}

export type Result<T, E> = Ok<T> | Err<E>

export const ok = <T>(value: T): Ok<T> => ({
  isOk: true,
  isErr: false,
  value,
  match: (onOk, _) => onOk(value),
})

export const err = <E>(error: E): Err<E> => ({
  isOk: false,
  isErr: true,
  error,
  match: (_, onErr) => onErr(error),
})

export class ResultAsync<T, E> {
  constructor(private promise: Promise<Result<T, E>>) {}

  static fromPromise<T>(
    promise: Promise<T>,
    errorHandler: (error: unknown) => Error,
  ): ResultAsync<T, Error> {
    return new ResultAsync(
      promise
        .then((value) => ok(value))
        .catch((error) => err(errorHandler(error))),
    )
  }

  async match<U>(onOk: (value: T) => U, onErr: (error: E) => U): Promise<U> {
    const result = await this.promise
    return result.match(onOk, onErr)
  }

  map<U>(fn: (value: T) => U): ResultAsync<U, E> {
    return new ResultAsync(
      this.promise.then((result) =>
        result.isOk ? ok(fn(result.value)) : result,
      ),
    )
  }

  // Convert to Promise<Result<T, E>>
  async toResult(): Promise<Result<T, E>> {
    return this.promise
  }
}
