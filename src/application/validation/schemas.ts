import { z } from 'zod';
import { DOCUMENT_TYPES } from '../../domain/value-objects/document';
import type { DocumentType } from '../../domain/value-objects/document';
import { SUPPORTED_CURRENCIES } from '../../domain/value-objects/money';
import type { Currency } from '../../domain/value-objects/money';

// zod expects a mutable non-empty tuple for enum. We cast once at this boundary
// so the canonical source of truth stays in the domain (SUPPORTED_CURRENCIES / DOCUMENT_TYPES).
const currencyTuple = SUPPORTED_CURRENCIES as unknown as readonly [Currency, ...Currency[]];
const documentTypeTuple = DOCUMENT_TYPES as unknown as readonly [DocumentType, ...DocumentType[]];

export const MoneySchema = z.object({
  value: z.number().int().nonnegative(),
  currency: z.enum(currencyTuple),
});

export const DocumentSchema = z.object({
  type: z.enum(documentTypeTuple),
  number: z.string().trim().min(1).max(20),
});

export const CustomerSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(1).max(150),
  document: DocumentSchema,
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]{7,20}$/, 'Phone must be 7–20 digits, optionally prefixed with +')
    .optional(),
});

// Luhn check — catches fat-finger errors before hitting the network.
// Duplicated logic with the domain's `card.ts` is intentional: the domain copy keeps
// the entities layer dependency-free, while this version lives inside a zod refinement.
function luhnValid(digits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number.parseInt(digits.charAt(i), 10);
    if (Number.isNaN(n)) return false;
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export const CardInputSchema = z.object({
  number: z
    .string()
    .transform((v) => v.replace(/\s/g, ''))
    .pipe(
      z
        .string()
        .regex(/^\d{12,19}$/, 'Card number must be 12–19 digits')
        .refine(luhnValid, 'Card number failed Luhn check'),
    ),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(1970).max(9999),
  cvc: z.string().regex(/^\d{3,4}$/, 'CVC must be 3 or 4 digits'),
  holderName: z.string().trim().min(1).max(150),
});

export const PaymentMethodSchema = z.object({
  type: z.literal('card'),
  card: CardInputSchema,
});

export const ChargeInputSchema = z.object({
  amount: MoneySchema,
  reference: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  customer: CustomerSchema,
  paymentMethod: PaymentMethodSchema,
  metadata: z.record(z.string(), z.string()).optional(),
});

export const TransactionIdSchema = z.string().trim().min(1).max(200);

// `input` = what the consumer passes in. `output` = what zod hands us after parsing/transforms.
// They differ when a transform runs (e.g. `paymentMethod.card.number` is normalized to digits only).
export type RawChargeInput = z.input<typeof ChargeInputSchema>;
export type ValidatedChargeInput = z.output<typeof ChargeInputSchema>;
