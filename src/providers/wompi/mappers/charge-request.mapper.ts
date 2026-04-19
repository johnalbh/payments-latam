import type { ChargeInput } from '../../../domain/ports/payment-provider';
import type { Currency } from '../../../domain/value-objects/money';
import type { WompiCreateTransactionRequest, WompiTokenizeCardRequest } from '../types';

export function toTokenizeCardRequest(input: ChargeInput): WompiTokenizeCardRequest {
  const card = input.paymentMethod.card;
  return {
    number: card.number,
    cvc: card.cvc,
    exp_month: String(card.expMonth).padStart(2, '0'),
    exp_year: String(card.expYear).slice(-2),
    card_holder: card.holderName,
  };
}

export function toCreateTransactionRequest(params: {
  input: ChargeInput;
  cardToken: string;
  acceptanceToken: string;
}): WompiCreateTransactionRequest {
  const { input, cardToken, acceptanceToken } = params;
  const base: WompiCreateTransactionRequest = {
    acceptance_token: acceptanceToken,
    amount_in_cents: toWompiCents(input.amount.value, input.amount.currency),
    currency: input.amount.currency,
    customer_email: input.customer.email,
    payment_method: {
      type: 'CARD',
      token: cardToken,
      installments: 1,
    },
    reference: input.reference,
  };

  const customerData = buildCustomerData(input);
  return customerData !== undefined ? { ...base, customer_data: customerData } : base;
}

function buildCustomerData(
  input: ChargeInput,
): WompiCreateTransactionRequest['customer_data'] | undefined {
  const phone = input.customer.phone;
  const fullName = input.customer.fullName;
  const { document } = input.customer;

  const data: NonNullable<WompiCreateTransactionRequest['customer_data']> = {
    full_name: fullName,
    legal_id: document.number,
    legal_id_type: document.type,
  };
  return phone !== undefined ? { ...data, phone_number: phone } : data;
}

// Wompi always expects `amount_in_cents`, regardless of the currency's ISO 4217
// minor-unit convention. For COP (0-decimal currency) we multiply by 100; for USD
// (2-decimal currency) the domain value is already in cents.
function toWompiCents(value: number, currency: Currency): number {
  switch (currency) {
    case 'COP':
      return value * 100;
    case 'USD':
      return value;
  }
}
