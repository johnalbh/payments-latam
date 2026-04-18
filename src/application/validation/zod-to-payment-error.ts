import type { ZodError } from 'zod';
import { paymentError } from '../../domain/errors/payment-error';
import type { PaymentError, PaymentErrorCode } from '../../domain/errors/payment-error';

// Map the first zod issue to a `PaymentError`. We only surface the first issue — zod
// stops at the first validation failure per path by default, and piling multiple issues
// into a single `PaymentError` would dilute the error code. Callers that need full
// diagnostic detail can inspect the zod `ZodError` directly upstream if we ever expose it.
export function zodErrorToPaymentError(error: ZodError): PaymentError {
  const first = error.issues[0];
  if (!first) {
    return paymentError({ code: 'unknown_error', message: 'Validation failed' });
  }

  const path = first.path.join('.');
  const message = path ? `Invalid input at "${path}": ${first.message}` : first.message;
  const code = classifyPath(first.path);

  return paymentError({ code, message });
}

function classifyPath(path: readonly (string | number)[]): PaymentErrorCode {
  const head = path[0];
  const second = path[1];

  if (head === 'amount') {
    return second === 'currency' ? 'invalid_currency' : 'invalid_amount';
  }
  if (head === 'customer' && second === 'document') {
    return 'invalid_document';
  }
  if (head === 'paymentMethod') {
    return 'invalid_card';
  }
  return 'unknown_error';
}
