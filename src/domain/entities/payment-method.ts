import type { CardInput } from './card';

// v0.1 only supports card. Extending this union (PSE, Nequi, etc.) is a v0.4 scope item.
export type PaymentMethod = {
  readonly type: 'card';
  readonly card: CardInput;
};
