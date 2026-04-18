import { createCustomer } from '../../domain/entities/customer';
import type { ChargeInput } from '../../domain/ports/payment-provider';
import { createDocument } from '../../domain/value-objects/document';
import { createMoney } from '../../domain/value-objects/money';
import type { ValidatedChargeInput } from './schemas';

// Zod has validated shape. Here we run domain factories so the value objects enforce
// their own invariants (currency allowed, email normalized, etc.) before anything
// reaches the provider. Any throw from this function is a real domain-invariant
// violation — zod already caught shape issues.
export function toDomainChargeInput(raw: ValidatedChargeInput): ChargeInput {
  const amount = createMoney(raw.amount.value, raw.amount.currency);
  const document = createDocument(raw.customer.document.type, raw.customer.document.number);
  const customer = createCustomer({
    email: raw.customer.email,
    fullName: raw.customer.fullName,
    document,
    phone: raw.customer.phone,
  });

  const base: ChargeInput = {
    amount,
    reference: raw.reference.trim(),
    description: raw.description.trim(),
    customer,
    paymentMethod: raw.paymentMethod,
  };

  // Respect `exactOptionalPropertyTypes`: omit `metadata` entirely when not provided,
  // rather than setting it to `undefined`.
  if (raw.metadata !== undefined) {
    return { ...base, metadata: raw.metadata };
  }
  return base;
}
