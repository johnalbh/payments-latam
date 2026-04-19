import { ConfigurationError } from '../../domain/errors/configuration-error';
import { NetworkError } from '../../domain/errors/network-error';
import type { NetworkErrorCause } from '../../domain/errors/network-error';
import { ProviderProtocolError } from '../../domain/errors/provider-protocol-error';
import type { EpaycoCredentials, EpaycoErrorEnvelope, EpaycoLoginResponse } from './types';

// Minimal HTTP surface the provider depends on. A narrow port keeps mocking
// in tests trivial (just a plain object with `post` + `get`).
export interface EpaycoHttp {
  post<T>(path: string, body: unknown): Promise<T>;
  get<T>(path: string, query?: Record<string, string>): Promise<T>;
}

export type EpaycoHttpConfig = {
  readonly credentials: EpaycoCredentials;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly fetch?: typeof globalThis.fetch;
};

// Concrete implementation using `fetch`. Caches the JWT per instance and retries
// once on 401 (token may have expired mid-session). A second 401 is surfaced as
// `ConfigurationError` — the credentials are wrong, not a transient failure.
export class EpaycoHttpClient implements EpaycoHttp {
  private token: string | null = null;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(private readonly config: EpaycoHttpConfig) {
    this.fetchImpl = config.fetch ?? globalThis.fetch.bind(globalThis);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.authenticatedRequest<T>('POST', path, body, false);
  }

  get<T>(path: string, query?: Record<string, string>): Promise<T> {
    const full = query ? `${path}?${new URLSearchParams(query).toString()}` : path;
    return this.authenticatedRequest<T>('GET', full, undefined, false);
  }

  private async authenticatedRequest<T>(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    retried: boolean,
  ): Promise<T> {
    await this.ensureAuthenticated();
    const res = await this.rawRequest(method, path, body, {
      Authorization: `Bearer ${this.token ?? ''}`,
    });

    if (res.status === 401) {
      if (!retried) {
        this.token = null;
        return this.authenticatedRequest<T>(method, path, body, true);
      }
      throw new ConfigurationError(
        'ePayco rejected authenticated request (HTTP 401). Check publicKey/privateKey.',
      );
    }

    return this.parseJson<T>(res);
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.token !== null) return;
    const basic = toBasicAuth(
      this.config.credentials.publicKey,
      this.config.credentials.privateKey,
    );
    const res = await this.rawRequest('POST', '/login', undefined, {
      Authorization: `Basic ${basic}`,
    });

    if (res.status === 401 || res.status === 403) {
      throw new ConfigurationError(
        `ePayco rejected credentials on login (HTTP ${res.status}). Check publicKey/privateKey.`,
      );
    }
    const payload = await this.parseJson<EpaycoLoginResponse>(res);
    if (!payload.token) {
      throw new ProviderProtocolError({
        provider: 'epayco',
        message: 'ePayco login response missing `token`',
        status: res.status,
        rawBody: payload,
      });
    }
    this.token = payload.token;
  }

  private async rawRequest(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    extraHeaders: Record<string, string>,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const url = `${this.config.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...extraHeaders,
      },
      signal: controller.signal,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };

    try {
      return await this.fetchImpl(url, init);
    } catch (cause: unknown) {
      const isAbort = cause instanceof Error && cause.name === 'AbortError';
      const networkCause: NetworkErrorCause = isAbort ? 'timeout' : classifyNetworkCause(cause);
      const message = isAbort
        ? `ePayco request timed out after ${this.config.timeoutMs}ms`
        : cause instanceof Error
          ? cause.message
          : 'Unknown network failure';
      throw new NetworkError(message, networkCause, cause);
    } finally {
      clearTimeout(timer);
    }
  }

  private async parseJson<T>(res: Response): Promise<T> {
    let body: unknown;
    try {
      body = await res.json();
    } catch (_cause: unknown) {
      throw new ProviderProtocolError({
        provider: 'epayco',
        message: `Failed to parse ePayco JSON (HTTP ${res.status})`,
        status: res.status,
      });
    }
    if (!res.ok) {
      throw new ProviderProtocolError({
        provider: 'epayco',
        message: extractEnvelopeMessage(body) ?? `ePayco returned HTTP ${res.status}`,
        status: res.status,
        rawBody: body,
      });
    }
    return body as T;
  }
}

function toBasicAuth(publicKey: string, privateKey: string): string {
  const combined = `${publicKey}:${privateKey}`;
  if (typeof btoa === 'function') return btoa(combined);
  return Buffer.from(combined, 'utf8').toString('base64');
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
  const env = body as EpaycoErrorEnvelope;
  return env.text_response ?? env.message ?? env.error ?? env.title_response;
}
