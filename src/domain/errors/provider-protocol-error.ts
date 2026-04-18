export class ProviderProtocolError extends Error {
  readonly provider: string;
  readonly status?: number;
  readonly rawBody?: unknown;

  constructor(params: { provider: string; message: string; status?: number; rawBody?: unknown }) {
    super(params.message);
    this.name = 'ProviderProtocolError';
    this.provider = params.provider;
    if (params.status !== undefined) {
      this.status = params.status;
    }
    if (params.rawBody !== undefined) {
      this.rawBody = params.rawBody;
    }
    Object.setPrototypeOf(this, ProviderProtocolError.prototype);
  }
}
