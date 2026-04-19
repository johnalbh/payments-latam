import { NetworkError } from '../../domain/errors/network-error';
import type { NetworkErrorCause } from '../../domain/errors/network-error';
import { ProviderProtocolError } from '../../domain/errors/provider-protocol-error';
import type { WompiErrorEnvelope } from './types';

// Wompi uses different keys for different endpoints: public key for read/tokenize,
// private key for writes. The adapter picks the right one per call via `keyKind`.
export type WompiKeyKind = 'public' | 'private';

export interface WompiHttp {
  post<T>(path: string, body: unknown, keyKind: WompiKeyKind): Promise<T>;
  get<T>(path: string, keyKind: WompiKeyKind): Promise<T>;
}

export type WompiHttpConfig = {
  readonly publicKey: string;
  readonly privateKey: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly fetch?: typeof globalThis.fetch;
};

// Concrete implementation using fetch. Wompi uses bearer-token auth with the raw key
// (no login step), so there's no JWT caching to worry about.
export class WompiHttpClient implements WompiHttp {
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(private readonly config: WompiHttpConfig) {
    this.fetchImpl = config.fetch ?? globalThis.fetch.bind(globalThis);
  }

  post<T>(path: string, body: unknown, keyKind: WompiKeyKind): Promise<T> {
    return this.request<T>('POST', path, body, keyKind);
  }

  get<T>(path: string, keyKind: WompiKeyKind): Promise<T> {
    return this.request<T>('GET', path, undefined, keyKind);
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    keyKind: WompiKeyKind,
  ): Promise<T> {
    const key = keyKind === 'public' ? this.config.publicKey : this.config.privateKey;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const url = `${this.config.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };

    let res: Response;
    try {
      res = await this.fetchImpl(url, init);
    } catch (cause: unknown) {
      const isAbort = cause instanceof Error && cause.name === 'AbortError';
      throw new NetworkError(
        isAbort
          ? `Wompi request timed out after ${this.config.timeoutMs}ms`
          : cause instanceof Error
            ? cause.message
            : 'Unknown network failure',
        isAbort ? 'timeout' : classifyNetworkCause(cause),
        cause,
      );
    } finally {
      clearTimeout(timer);
    }

    return this.parseJson<T>(res);
  }

  private async parseJson<T>(res: Response): Promise<T> {
    let body: unknown;
    try {
      body = await res.json();
    } catch (_cause: unknown) {
      throw new ProviderProtocolError({
        provider: 'wompi',
        message: `Failed to parse Wompi JSON (HTTP ${res.status})`,
        status: res.status,
      });
    }
    if (!res.ok) {
      throw new ProviderProtocolError({
        provider: 'wompi',
        message: extractEnvelopeMessage(body) ?? `Wompi returned HTTP ${res.status}`,
        status: res.status,
        rawBody: body,
      });
    }
    return body as T;
  }
}

function classifyNetworkCause(cause: unknown): NetworkErrorCause {
  if (!(cause instanceof Error)) return 'unknown';
  const lc = cause.message.toLowerCase();
  if (lc.includes('timeout')) return 'timeout';
  if (lc.includes('enotfound') || lc.includes('dns')) return 'dns';
  if (lc.includes('econnrefused') || lc.includes('refused')) return 'connection_refused';
  if (cause.name === 'AbortError') return 'aborted';
  return 'unknown';
}

function extractEnvelopeMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const env = body as WompiErrorEnvelope;
  return env.error?.reason;
}
