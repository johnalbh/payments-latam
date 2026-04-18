export type NetworkErrorCause = 'timeout' | 'dns' | 'connection_refused' | 'aborted' | 'unknown';

export class NetworkError extends Error {
  readonly cause: NetworkErrorCause;
  readonly underlying?: unknown;

  constructor(message: string, cause: NetworkErrorCause, underlying?: unknown) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
    if (underlying !== undefined) {
      this.underlying = underlying;
    }
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}
