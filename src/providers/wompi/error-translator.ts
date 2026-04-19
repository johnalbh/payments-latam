import { paymentError } from '../../domain/errors/payment-error';
import type { PaymentError, PaymentErrorCode } from '../../domain/errors/payment-error';
import type { WompiErrorEnvelope, WompiTransactionData } from './types';

// Wompi's `status_message` is usually English and human-readable (e.g. "Insufficient funds").
// We keep a keyword table small and predictable; unknowns fall through to `unknown_error`.
const STATUS_MESSAGE_KEYWORDS: ReadonlyArray<readonly [RegExp, PaymentErrorCode]> = [
  [/insufficient\s*funds?/i, 'insufficient_funds'],
  [/expired|expir(ed|e date)/i, 'invalid_card'],
  [/stolen|lost/i, 'card_declined'],
  [/restricted|blocked/i, 'card_declined'],
  [/declined|rejected|no autorizad/i, 'card_declined'],
  [/invalid\s*card|card\s*number/i, 'invalid_card'],
  [/invalid\s*cvc|security\s*code/i, 'invalid_card'],
  [/auth|credent/i, 'authentication_failed'],
  [/timeout|unavailable/i, 'provider_unavailable'],
];

export function translateWompiFailure(data: WompiTransactionData): PaymentError {
  const rawMessage = (data.status_message ?? data.status ?? '').trim();
  const code = matchByKeyword(rawMessage) ?? 'unknown_error';
  return paymentError({
    code,
    message: rawMessage || 'Transaction failed at Wompi',
    providerCode: data.status,
    providerMessage: rawMessage || data.status,
  });
}

export function translateWompiEnvelopeError(envelope: WompiErrorEnvelope): PaymentError {
  const error = envelope.error;
  const reason = error?.reason;
  const firstValidationMessage = firstMessageFromValidation(error?.messages);
  const message = reason ?? firstValidationMessage ?? 'Wompi request failed';
  const code = matchByKeyword(message) ?? 'unknown_error';
  return paymentError({
    code,
    message,
    ...(error?.type ? { providerCode: error.type } : {}),
    providerMessage: message,
  });
}

function matchByKeyword(text: string): PaymentErrorCode | undefined {
  if (text.length === 0) return undefined;
  for (const [regex, code] of STATUS_MESSAGE_KEYWORDS) {
    if (regex.test(text)) return code;
  }
  return undefined;
}

function firstMessageFromValidation(
  messages: Readonly<Record<string, readonly string[]>> | undefined,
): string | undefined {
  if (!messages) return undefined;
  for (const key of Object.keys(messages)) {
    const list = messages[key];
    if (list && list.length > 0 && list[0]) return `${key}: ${list[0]}`;
  }
  return undefined;
}
