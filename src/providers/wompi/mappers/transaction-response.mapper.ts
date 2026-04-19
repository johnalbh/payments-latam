import type { CardBrand, CardInput, CardSummary } from '../../../domain/entities/card';
import { summarizeCard } from '../../../domain/entities/card';
import { createTransaction } from '../../../domain/entities/transaction';
import type { Transaction, TransactionStatus } from '../../../domain/entities/transaction';
import type { Currency } from '../../../domain/value-objects/money';
import { createMoney, isCurrency } from '../../../domain/value-objects/money';
import type { WompiTransactionData, WompiTransactionStatus } from '../types';

const STATUS_MAP: Readonly<Record<WompiTransactionStatus, TransactionStatus>> = {
  APPROVED: 'approved',
  DECLINED: 'declined',
  PENDING: 'pending',
  VOIDED: 'voided',
  ERROR: 'error',
};

export function fromWompiTransactionData(params: {
  data: WompiTransactionData;
  fallbackCard?: CardInput;
}): Transaction {
  const { data, fallbackCard } = params;

  const currency = data.currency.toUpperCase();
  if (!isCurrency(currency)) {
    throw new RangeError(`Wompi returned unsupported currency: ${data.currency}`);
  }
  const amount = createMoney(fromWompiCents(data.amount_in_cents, currency), currency);

  const paymentMethod = resolvePaymentMethod(data, fallbackCard);

  return createTransaction({
    id: data.id,
    reference: data.reference,
    status: STATUS_MAP[data.status],
    amount,
    provider: 'wompi',
    providerRaw: data,
    createdAt: normalizeIsoDate(data.created_at),
    paymentMethod,
  });
}

function resolvePaymentMethod(
  data: WompiTransactionData,
  fallbackCard: CardInput | undefined,
): CardSummary {
  const extra = data.payment_method?.extra;
  if (extra?.last_four) {
    const brand =
      normalizeBrand(extra.brand) ?? (fallbackCard ? summarizeCard(fallbackCard).brand : 'unknown');
    return { type: 'card', lastFour: extra.last_four, brand };
  }
  if (fallbackCard) {
    return summarizeCard(fallbackCard);
  }
  return { type: 'card', lastFour: '0000', brand: 'unknown' };
}

function normalizeBrand(brand: string | undefined): CardBrand | undefined {
  if (!brand) return undefined;
  const lc = brand.toLowerCase();
  if (lc.includes('visa')) return 'visa';
  if (lc.includes('master')) return 'mastercard';
  if (lc.includes('amex') || lc.includes('american')) return 'amex';
  if (lc.includes('diners')) return 'diners';
  if (lc.includes('discover')) return 'discover';
  return undefined;
}

function fromWompiCents(cents: number, currency: Currency): number {
  switch (currency) {
    case 'COP':
      return Math.round(cents / 100);
    case 'USD':
      return Math.round(cents);
  }
}

function normalizeIsoDate(raw: string): string {
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
}
