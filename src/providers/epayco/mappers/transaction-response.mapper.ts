import type { CardBrand, CardInput, CardSummary } from '../../../domain/entities/card';
import { summarizeCard } from '../../../domain/entities/card';
import { createTransaction } from '../../../domain/entities/transaction';
import type { Transaction, TransactionStatus } from '../../../domain/entities/transaction';
import type { Currency } from '../../../domain/value-objects/money';
import { createMoney, isCurrency } from '../../../domain/value-objects/money';
import type { EpaycoChargeResponse } from '../types';

// ePayco's human-readable statuses in Spanish + English variants seen in the wild.
// Anything not explicitly mapped resolves to `error` — callers can still inspect the
// raw body on `Transaction.providerRaw`.
const STATUS_MAP: Readonly<Record<string, TransactionStatus>> = {
  Aceptada: 'approved',
  Approved: 'approved',
  Rechazada: 'declined',
  Declined: 'declined',
  Pendiente: 'pending',
  Pending: 'pending',
  'En proceso': 'pending',
  Anulada: 'voided',
  Voided: 'voided',
  Fallida: 'error',
  Failed: 'error',
};

// Used by `charge` (has the original CardInput) and `getTransaction` (no CardInput —
// we reconstruct the summary from the provider's masked pan and franchise strings).
export function fromEpaycoTransactionResponse(params: {
  response: EpaycoChargeResponse;
  reference: string;
  fallbackCard?: CardInput;
}): Transaction {
  const { response, reference, fallbackCard } = params;
  const data = response.data;

  const rawStatus = data.x_response?.trim() ?? '';
  const status: TransactionStatus = STATUS_MAP[rawStatus] ?? 'error';

  const currency = (data.x_currency_code ?? '').toUpperCase();
  if (!isCurrency(currency)) {
    throw new RangeError(`ePayco returned unsupported currency: ${data.x_currency_code}`);
  }
  const amount = createMoney(toIntegerMinorUnit(data.x_amount, currency), currency);

  const providerTransactionId = String(data.x_transaction_id ?? data.x_ref_payco ?? data.ref_payco);
  const createdAt = data.x_transaction_date
    ? normalizeDate(data.x_transaction_date)
    : new Date().toISOString();

  const paymentMethod = resolvePaymentMethod(data, fallbackCard);

  return createTransaction({
    id: providerTransactionId,
    reference,
    status,
    amount,
    provider: 'epayco',
    providerRaw: response,
    createdAt,
    paymentMethod,
  });
}

function resolvePaymentMethod(
  data: EpaycoChargeResponse['data'],
  fallbackCard: CardInput | undefined,
): CardSummary {
  const maskedPan = data.x_cardnumber;
  if (maskedPan) {
    const brand =
      normalizeBrand(data.x_franchise) ??
      (fallbackCard ? summarizeCard(fallbackCard).brand : 'unknown');
    return { type: 'card', lastFour: maskedPan.slice(-4), brand };
  }
  if (fallbackCard) {
    return summarizeCard(fallbackCard);
  }
  return { type: 'card', lastFour: '0000', brand: 'unknown' };
}

function normalizeBrand(franchise: string | undefined): CardBrand | undefined {
  if (!franchise) return undefined;
  const lc = franchise.toLowerCase();
  if (lc.includes('visa')) return 'visa';
  if (lc.includes('master')) return 'mastercard';
  if (lc.includes('amex') || lc.includes('american')) return 'amex';
  if (lc.includes('diners')) return 'diners';
  if (lc.includes('discover')) return 'discover';
  return undefined;
}

// Inverse of the request-side `toEpaycoAmount`: ePayco sends COP as whole pesos and
// USD as `12.34`-style decimals. We bring both back to ISO 4217 minor units so the
// domain `Money` invariant (integer value) holds.
function toIntegerMinorUnit(raw: string | number, currency: Currency): number {
  const asNumber = typeof raw === 'number' ? raw : Number.parseFloat(raw);
  if (!Number.isFinite(asNumber)) {
    throw new RangeError(`ePayco returned non-numeric amount: ${String(raw)}`);
  }
  switch (currency) {
    case 'COP':
      return Math.round(asNumber);
    case 'USD':
      return Math.round(asNumber * 100);
  }
}

function normalizeDate(raw: string): string {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}
