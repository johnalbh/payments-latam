export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'diners' | 'discover' | 'unknown';

// Input accepted from callers. Contains sensitive PAN; do not log or persist this shape.
export type CardInput = {
  readonly number: string;
  readonly expMonth: number;
  readonly expYear: number;
  readonly cvc: string;
  readonly holderName: string;
};

// Safe-to-store projection attached to a Transaction. Never contains the PAN or CVC.
export type CardSummary = {
  readonly type: 'card';
  readonly lastFour: string;
  readonly brand: CardBrand;
};

// Prefix-based brand detection. Good enough for UX labels; providers do the authoritative
// bin lookup server-side.
export function detectBrand(cardNumber: string): CardBrand {
  const digits = cardNumber.replace(/\D/g, '');
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^3(0[0-5]|[68])/.test(digits)) return 'diners';
  if (/^6(011|5)/.test(digits)) return 'discover';
  return 'unknown';
}

export function lastFour(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  return digits.slice(-4);
}

// Luhn check — catches the most common fat-finger errors before we hit the network.
// Providers still run their own validation; this is a cheap UX guardrail.
function luhnValid(digits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    const ch = digits.charAt(i);
    let n = Number.parseInt(ch, 10);
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

export function validateCardInput(input: CardInput): void {
  const digits = input.number.replace(/\s/g, '');
  if (!/^\d{12,19}$/.test(digits)) {
    throw new RangeError('CardInput.number must be 12–19 digits');
  }
  if (!luhnValid(digits)) {
    throw new RangeError('CardInput.number failed Luhn check');
  }
  if (!Number.isInteger(input.expMonth) || input.expMonth < 1 || input.expMonth > 12) {
    throw new RangeError(`CardInput.expMonth must be 1–12. Received: ${input.expMonth}`);
  }
  if (!Number.isInteger(input.expYear) || input.expYear < 1970 || input.expYear > 9999) {
    throw new RangeError(`CardInput.expYear must be a 4-digit year. Received: ${input.expYear}`);
  }
  if (!/^\d{3,4}$/.test(input.cvc)) {
    throw new RangeError('CardInput.cvc must be 3 or 4 digits');
  }
  const holder = input.holderName.trim();
  if (holder.length === 0) {
    throw new RangeError('CardInput.holderName cannot be empty');
  }
  if (holder.length > 150) {
    throw new RangeError(`CardInput.holderName too long (max 150): ${holder.length}`);
  }
}

export function summarizeCard(input: CardInput): CardSummary {
  return {
    type: 'card',
    lastFour: lastFour(input.number),
    brand: detectBrand(input.number),
  };
}
