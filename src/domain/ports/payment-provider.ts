import type { Customer } from '../entities/customer';
import type { PaymentMethod } from '../entities/payment-method';
import type { ProviderName, Transaction } from '../entities/transaction';
import type { Result } from '../result/result';
import type { Money } from '../value-objects/money';

export type ChargeInput = {
  readonly amount: Money;
  readonly reference: string;
  readonly description: string;
  readonly customer: Customer;
  readonly paymentMethod: PaymentMethod;
  readonly metadata?: Record<string, string>;
};

export type ChargeResult = Result<Transaction>;
export type TransactionResult = Result<Transaction>;

// The port every provider adapter must implement. The application layer depends on this
// interface, never on a concrete adapter. Adding a provider means implementing this —
// nothing else in the codebase has to change.
export interface PaymentProvider {
  readonly name: ProviderName;
  charge(input: ChargeInput): Promise<ChargeResult>;
  getTransaction(id: string): Promise<TransactionResult>;
}
