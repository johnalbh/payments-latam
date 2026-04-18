import type { Money } from '../value-objects/money';
import type { CardSummary } from './card';

export const TRANSACTION_STATUSES = ['approved', 'declined', 'pending', 'voided', 'error'] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const PROVIDER_NAMES = ['epayco', 'wompi'] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];

export type Transaction = {
  readonly id: string;
  readonly reference: string;
  readonly status: TransactionStatus;
  readonly amount: Money;
  readonly provider: ProviderName;
  readonly providerRaw: unknown;
  readonly createdAt: string;
  readonly paymentMethod: CardSummary;
};

export function isTransactionStatus(value: string): value is TransactionStatus {
  return (TRANSACTION_STATUSES as readonly string[]).includes(value);
}

export function isProviderName(value: string): value is ProviderName {
  return (PROVIDER_NAMES as readonly string[]).includes(value);
}

// Invariants enforced here are the guarantee adapters give the application layer.
// A Transaction cannot be constructed in an invalid state; if a mapper tries to,
// we throw — that's a bug in the adapter, not a payment failure.
export function createTransaction(params: {
  id: string;
  reference: string;
  status: TransactionStatus;
  amount: Money;
  provider: ProviderName;
  providerRaw: unknown;
  createdAt: string;
  paymentMethod: CardSummary;
}): Transaction {
  if (params.id.trim().length === 0) {
    throw new RangeError('Transaction.id cannot be empty');
  }
  if (params.reference.trim().length === 0) {
    throw new RangeError('Transaction.reference cannot be empty');
  }
  if (!isTransactionStatus(params.status)) {
    throw new RangeError(`Invalid Transaction.status: ${String(params.status)}`);
  }
  if (!isProviderName(params.provider)) {
    throw new RangeError(`Invalid Transaction.provider: ${String(params.provider)}`);
  }
  // Cheap ISO-8601 sanity check. Providers send strings; we don't want a Date round-trip here.
  if (Number.isNaN(Date.parse(params.createdAt))) {
    throw new RangeError(
      `Transaction.createdAt is not a valid ISO 8601 string: ${params.createdAt}`,
    );
  }
  return {
    id: params.id,
    reference: params.reference,
    status: params.status,
    amount: params.amount,
    provider: params.provider,
    providerRaw: params.providerRaw,
    createdAt: params.createdAt,
    paymentMethod: params.paymentMethod,
  };
}
