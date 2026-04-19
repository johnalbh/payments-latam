import type { Environment } from '../../domain/value-objects/environment';

// Wompi splits sandbox and production across two hosts.
const SANDBOX_BASE = 'https://sandbox.wompi.co/v1';
const PRODUCTION_BASE = 'https://production.wompi.co/v1';

export const WOMPI_ENDPOINTS = {
  tokenizeCard: '/tokens/cards',
  createTransaction: '/transactions',
  getTransaction: (id: string) => `/transactions/${encodeURIComponent(id)}`,
  merchant: (publicKey: string) => `/merchants/${encodeURIComponent(publicKey)}`,
} as const;

export function wompiBaseUrl(environment: Environment): string {
  return environment === 'production' ? PRODUCTION_BASE : SANDBOX_BASE;
}
