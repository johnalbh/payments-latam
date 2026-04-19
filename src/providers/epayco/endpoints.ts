import type { Environment } from '../../domain/value-objects/environment';

// Per ePayco's REST API docs (https://docs.epayco.co/payments/api/rest-api),
// both sandbox and production share the same host; the environment is inferred
// from which API keys you use. We still expose an Environment to normalize the
// client config shape across providers and to let us plug in a sandbox-only host
// later without a breaking change.

const BASE_URL = 'https://apify.epayco.co';

export const EPAYCO_ENDPOINTS = {
  login: '/login',
  tokenizeCard: '/v1/tokens/card',
  charge: '/payment/process',
  getTransaction: '/transaction',
} as const;

export function epaycoBaseUrl(_environment: Environment): string {
  // Reserved parameter: once ePayco exposes a distinct sandbox host we switch on it here.
  return BASE_URL;
}
