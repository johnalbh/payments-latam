export const PAYMENT_ERROR_CODES = [
  'card_declined',
  'insufficient_funds',
  'invalid_card',
  'invalid_document',
  'invalid_amount',
  'invalid_currency',
  'provider_unavailable',
  'authentication_failed',
  'unknown_error',
] as const;

export type PaymentErrorCode = (typeof PAYMENT_ERROR_CODES)[number];

export type PaymentError = {
  readonly code: PaymentErrorCode;
  readonly message: string;
  readonly providerCode?: string;
  readonly providerMessage?: string;
};

export function paymentError(params: {
  code: PaymentErrorCode;
  message: string;
  providerCode?: string;
  providerMessage?: string;
}): PaymentError {
  const base = { code: params.code, message: params.message };
  const withCode =
    params.providerCode !== undefined ? { ...base, providerCode: params.providerCode } : base;
  return params.providerMessage !== undefined
    ? { ...withCode, providerMessage: params.providerMessage }
    : withCode;
}
