import type { ChargeInput } from '../../../domain/ports/payment-provider';
import type { Currency } from '../../../domain/value-objects/money';
import type { EpaycoChargeRequest, EpaycoTokenizeCardRequest } from '../types';

// Domain → ePayco request. The provider expects amounts as strings and splits
// name/last_name out of our single `fullName`. We do a best-effort split on the
// last space: anything before is `name`, the final word is `last_name`. If the
// name is a single word, `last_name` mirrors it (ePayco rejects empty last_name).
export function toTokenizeCardRequest(input: ChargeInput): EpaycoTokenizeCardRequest {
  const card = input.paymentMethod.card;
  return {
    'card[number]': card.number,
    'card[exp_year]': String(card.expYear),
    'card[exp_month]': String(card.expMonth).padStart(2, '0'),
    'card[cvc]': card.cvc,
  };
}

export function toChargeRequest(params: {
  input: ChargeInput;
  cardToken: string;
  clientIp: string;
}): EpaycoChargeRequest {
  const { input, cardToken, clientIp } = params;
  const [firstName, lastName] = splitFullName(input.customer.fullName);

  const wireAmount = toEpaycoAmount(input.amount.value, input.amount.currency);
  const request: EpaycoChargeRequest = {
    token_card: cardToken,
    doc_type: input.customer.document.type,
    doc_number: input.customer.document.number,
    name: firstName,
    last_name: lastName,
    email: input.customer.email,
    bill: input.reference,
    description: input.description,
    value: wireAmount,
    tax: '0',
    tax_base: wireAmount,
    currency: input.amount.currency,
    dues: '1',
    ip: clientIp,
  };

  return input.customer.phone !== undefined
    ? { ...request, cell_phone: input.customer.phone, phone: input.customer.phone }
    : request;
}

// Domain `Money.value` is always an integer in the currency's ISO 4217 minor unit:
// COP has zero decimals → value IS the amount in pesos.
// USD has two decimals → value is in cents.
// ePayco accepts COP as whole pesos (string) and USD as major units with two decimals.
function toEpaycoAmount(value: number, currency: Currency): string {
  switch (currency) {
    case 'COP':
      return String(value);
    case 'USD':
      return (value / 100).toFixed(2);
  }
}

function splitFullName(fullName: string): readonly [string, string] {
  const trimmed = fullName.trim();
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace === -1) {
    return [trimmed, trimmed];
  }
  const first = trimmed.slice(0, lastSpace).trim();
  const last = trimmed.slice(lastSpace + 1).trim();
  return [first.length > 0 ? first : last, last.length > 0 ? last : first];
}
