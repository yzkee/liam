// Simple Result type implementation to avoid throw new Error() statements
export type Result<T, E> = Ok<T> | Err<E>

interface Ok<T> {
  isOk(): this is Ok<T>
  isErr(): this is Err<never>
  readonly value: T
  match<U>(onOk: (value: T) => U, onErr: (error: unknown) => U): U
}

interface Err<E> {
  isOk(): this is Ok<never>
  isErr(): this is Err<E>
  readonly error: E
  match<U>(onOk: (value: never) => U, onErr: (error: E) => U): U
}

export const ok = <T>(value: T): Ok<T> => ({
  value,
  isOk: () => true as const,
  isErr: () => false as const,
  match: <U>(onOk: (value: T) => U, _onErr: (error: unknown) => U): U =>
    onOk(value),
})

export const err = <E>(error: E): Err<E> => ({
  error,
  isOk: () => false as const,
  isErr: () => true as const,
  match: <U>(_onOk: (value: never) => U, onErr: (error: E) => U): U =>
    onErr(error),
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
        result.isOk() ? ok(fn(result.value)) : result,
      ),
    )
  }

  // Convert to Promise<Result<T, E>>
  async toResult(): Promise<Result<T, E>> {
    return this.promise
  }
}
