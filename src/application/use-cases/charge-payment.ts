import { paymentError } from '../../domain/errors/payment-error';
import type { ChargeResult, PaymentProvider } from '../../domain/ports/payment-provider';
import { err } from '../../domain/result/result';
import { ChargeInputSchema } from '../validation/schemas';
import { toDomainChargeInput } from '../validation/to-domain';
import { zodErrorToPaymentError } from '../validation/zod-to-payment-error';

// Public use case. Takes `unknown` because the input crosses a trust boundary:
// the caller is external code, not another internal module. Zod does the shape
// check, domain factories enforce invariants, and any predictable failure becomes
// a `Result.err(PaymentError)` instead of a throw.
export async function chargePayment(
  provider: PaymentProvider,
  rawInput: unknown,
): Promise<ChargeResult> {
  const parsed = ChargeInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(zodErrorToPaymentError(parsed.error));
  }

  try {
    const domainInput = toDomainChargeInput(parsed.data);
    return await provider.charge(domainInput);
  } catch (unknownError) {
    // Factories only throw when their domain invariants fail. Zod covers the common
    // cases upstream, so a throw here usually means a gap in the schemas. We fall
    // back to `unknown_error` so consumers still get a Result rather than a surprise
    // exception, and we keep the original message for debugging.
    const message = unknownError instanceof Error ? unknownError.message : String(unknownError);
    return err(paymentError({ code: 'unknown_error', message }));
  }
}
