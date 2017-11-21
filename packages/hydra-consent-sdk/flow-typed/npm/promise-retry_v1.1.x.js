// flow-typed signature: 05b43606f0a6abe93f08cb9bf9bce1a5
// flow-typed version: 4e4da7b521/promise-retry_v1.1.x/flow_>=v0.45.x

type RetryFn = (err: Error) => void;
type Options = {|
  retries?: number,
  factor?: number,
  minTimeout?: number,
  maxTimeout?: number,
  randomize?: boolean,
|};

declare module 'promise-retry' {
  declare module.exports: <T>(
    handler: (retry: RetryFn, retryNumber: Number) => Promise<T>,
    options?: Options
  ) => Promise<T>;
}
