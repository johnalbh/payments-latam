import { paymentError } from '../../domain/errors/payment-error';
import type { PaymentProvider, TransactionResult } from '../../domain/ports/payment-provider';
import { err } from '../../domain/result/result';
import { TransactionIdSchema } from '../validation/schemas';

export async function getTransaction(
  provider: PaymentProvider,
  rawId: unknown,
): Promise<TransactionResult> {
  const parsed = TransactionIdSchema.safeParse(rawId);
  if (!parsed.success) {
    return err(
      paymentError({
        code: 'unknown_error',
        message: 'Transaction id must be a non-empty string (max 200 chars)',
      }),
    );
  }
  return provider.getTransaction(parsed.data);
}
