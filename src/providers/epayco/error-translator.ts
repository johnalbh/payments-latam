import { paymentError } from '../../domain/errors/payment-error';
import type { PaymentError, PaymentErrorCode } from '../../domain/errors/payment-error';
import type { EpaycoChargeResponse, EpaycoErrorEnvelope } from './types';

// ePayco uses a mix of numeric `x_response_reason_code` values and free-text strings.
// We map the most common ones to our canonical PaymentErrorCode set. Unknowns fall
// through to `unknown_error` — the original provider message is always preserved on
// `providerCode`/`providerMessage` for debugging.
const REASON_CODE_MAP: Readonly<Record<string, PaymentErrorCode>> = {
  '02': 'card_declined',
  '03': 'invalid_card',
  '04': 'card_declined',
  '05': 'card_declined',
  '51': 'insufficient_funds',
  '54': 'invalid_card', // expired card
  '57': 'card_declined',
  '61': 'insufficient_funds',
  '62': 'card_declined',
  '65': 'card_declined',
  '96': 'provider_unavailable',
  '400': 'authentication_failed',
  '401': 'authentication_failed',
};

const RESPONSE_TEXT_KEYWORDS: ReadonlyArray<readonly [RegExp, PaymentErrorCode]> = [
  [/fondos insuficientes|insufficient/i, 'insufficient_funds'],
  [/tarjeta vencida|expired/i, 'invalid_card'],
  [/rechazad|declined/i, 'card_declined'],
  [/no autorizad|unauthorized/i, 'authentication_failed'],
  [/no disponible|unavailable|timeout/i, 'provider_unavailable'],
];

export function translateEpaycoFailure(response: EpaycoChargeResponse): PaymentError {
  const { data } = response;
  const reasonCode = data.x_response_reason_code?.trim();
  const reasonText = (data.x_response_reason_text ?? data.x_response ?? '').trim();

  const codeFromReason = reasonCode ? REASON_CODE_MAP[reasonCode] : undefined;
  const codeFromText = codeFromReason ?? matchByKeyword(reasonText);
  const code: PaymentErrorCode = codeFromText ?? 'unknown_error';

  return paymentError({
    code,
    message: reasonText || 'Charge failed at ePayco',
    ...(reasonCode ? { providerCode: reasonCode } : {}),
    ...(reasonText ? { providerMessage: reasonText } : {}),
  });
}

export function translateEpaycoEnvelopeError(envelope: EpaycoErrorEnvelope): PaymentError {
  const message =
    envelope.text_response ??
    envelope.message ??
    envelope.error ??
    envelope.title_response ??
    'ePayco request failed';
  const code = matchByKeyword(message) ?? 'unknown_error';
  return paymentError({ code, message, providerMessage: message });
}

function matchByKeyword(text: string): PaymentErrorCode | undefined {
  if (text.length === 0) return undefined;
  for (const [regex, code] of RESPONSE_TEXT_KEYWORDS) {
    if (regex.test(text)) return code;
  }
  return undefined;
}
