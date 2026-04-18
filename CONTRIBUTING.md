# Contributing

Thanks for your interest in contributing to `@johncodes/payments-latam`.

## Ground rules

- **Public API is sacred.** Changes to `src/index.ts` or the shapes re-exported from it must be deliberate, tested, and documented in `CHANGELOG.md`.
- **Domain has no dependencies.** Anything under `src/domain/**` must not import from providers, HTTP libraries, or frameworks.
- **Providers never see each other.** Adding a provider must not touch another provider's code.
- **No silent failures.** Predictable failures return `Result<T>`; unpredictable ones throw typed errors (`ConfigurationError`, `NetworkError`, `ProviderProtocolError`).

## Adapter checklist

When adding a new provider, every PR must include:

1. A provider folder under `src/providers/<name>/` with:
   - `<name>-provider.ts` implementing the `PaymentProvider` port.
   - `<name>-http-client.ts` isolating all HTTP concerns.
   - `mappers/` translating between provider DTOs and domain entities.
   - `error-translator.ts` mapping provider error codes to `PaymentErrorCode`.
2. Unit tests in `tests/unit/providers/<name>/` with mocked HTTP.
3. Integration tests in `tests/integration/<name>.test.ts` hitting sandbox.
4. A docs page at `docs/providers/<name>.md`.
5. A changeset (`pnpm changeset`).
6. No changes to the public API surface (`src/index.ts`) unless the domain genuinely needs a new concept — open an issue first.

## Local workflow

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

Integration tests need sandbox credentials in `.env`. Copy `.env.example` and fill them in. Never commit real credentials.

## Commit style

Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`). Keep the subject under 70 chars and describe the *why* in the body when the change isn't obvious.

## Release

Releases are automated via Changesets. Create a changeset describing user-facing impact:

```bash
pnpm changeset
```

Pre-1.0 bumps use `alpha`/`beta` tags.
