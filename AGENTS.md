# AGENTS.md

Machine-readable project context for LLM-based coding assistants. Keep this file small and factual.

## What this project is

`@johncodes/payments-latam` — a unified TypeScript SDK that wraps Latin American payment gateways behind a single, strongly-typed API. Server-side only. Currently targeting Colombia (ePayco, Wompi) for v0.1.

## Architectural rules (non-negotiable)

1. **Domain layer (`src/domain/**`) has zero runtime dependencies.** No HTTP libs, no provider SDKs, no framework code. Pure TypeScript only.
2. **Providers implement the `PaymentProvider` port** (`src/domain/ports/payment-provider.ts`) and never import each other.
3. **The public API is defined only in `src/index.ts`.** Everything else is internal.
4. **Predictable failures return `Result<T>`.** Unpredictable failures throw `ConfigurationError`, `NetworkError`, or `ProviderProtocolError`.
5. **Amounts are integer minor units** (`{ value: number, currency: string }`). Never use floats.
6. **Adapters normalize.** The application layer never sees raw provider JSON — mappers translate into domain entities.

## Layout

```
src/
  domain/          # Entities, value objects, errors, ports. Pure.
  application/     # Use cases. Orchestrate domain + port calls.
  providers/       # Concrete adapters. One folder per gateway.
  client/          # Public factory: createClient.
  index.ts         # Public exports only.
```

## Adding a provider

Follow the checklist in `CONTRIBUTING.md`. In short: implement the port, write mappers and an error translator, add unit + integration tests, and do not modify the public API.

## What NOT to do

- Do not add features outside the current roadmap phase without opening an issue.
- Do not introduce a runtime dependency in the domain layer.
- Do not throw on predictable failures (declines, invalid input) — use `Result`.
- Do not mutate the public API shape in a patch or minor release.
- Do not commit real sandbox or production credentials.
