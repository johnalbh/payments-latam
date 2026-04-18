# @johnalbh/payments-latam

Unified TypeScript SDK for Latin American payment gateways. One API, multiple providers, strongly typed.

> **Status**: early development — `v0.1.0-alpha`. Colombia only (ePayco, Wompi), single-charge card flow, sandbox + production.

## Install

```bash
pnpm add @johnalbh/payments-latam
```

Requires Node.js 18+. Server-side only.

## Quick start

```ts
import { createClient } from '@johnalbh/payments-latam';

const payments = createClient({
  provider: 'epayco',
  credentials: {
    publicKey: process.env.EPAYCO_PUBLIC_KEY!,
    privateKey: process.env.EPAYCO_PRIVATE_KEY!,
  },
  environment: 'sandbox',
});

const result = await payments.charge({
  amount: { value: 50_000, currency: 'COP' },
  reference: 'order-1234',
  description: 'Test purchase',
  customer: {
    email: 'buyer@example.com',
    fullName: 'Ada Lovelace',
    document: { type: 'CC', number: '1234567890' },
    phone: '+573001234567',
  },
  paymentMethod: {
    type: 'card',
    card: {
      number: '4575623182290326',
      expMonth: 12,
      expYear: 2028,
      cvc: '123',
      holderName: 'Ada Lovelace',
    },
  },
});

if (result.ok) {
  console.log('Approved:', result.data.id);
} else {
  console.error('Failed:', result.error.code, result.error.message);
}
```

Switching providers is a one-line change — the `charge` call and response shape are identical.

## Docs

- [docs/architecture.md](docs/architecture.md)
- [docs/providers/epayco.md](docs/providers/epayco.md)
- [docs/providers/wompi.md](docs/providers/wompi.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [AGENTS.md](AGENTS.md)

## License

MIT © johnalbh
