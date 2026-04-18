export const SUPPORTED_CURRENCIES = ['COP', 'USD'] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export type Money = {
  readonly value: number;
  readonly currency: Currency;
};

export function isCurrency(value: string): value is Currency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

// Invariant: `value` is a non-negative integer expressed in the currency's minor unit.
// We reject floats because gateways differ on rounding and a float amount is a code
// smell at this layer — callers should convert to minor units before reaching the domain.
export function createMoney(value: number, currency: Currency): Money {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Money.value must be finite. Received: ${value}`);
  }
  if (!Number.isInteger(value)) {
    throw new RangeError(`Money.value must be an integer minor unit. Received: ${value}`);
  }
  if (value < 0) {
    throw new RangeError(`Money.value must be non-negative. Received: ${value}`);
  }
  if (!isCurrency(currency)) {
    throw new RangeError(`Unsupported currency: ${String(currency)}`);
  }
  return { value, currency };
}
