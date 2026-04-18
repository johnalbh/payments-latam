# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project scaffolding: TypeScript, tsup, vitest, Biome, changesets.
- Clean-architecture layout: `domain`, `application`, `providers`, `client`.
- Initial domain model: `Money`, `Document`, `Customer`, `Card`, `Transaction`.
- Public `PaymentProvider` port and `Result<T>` discriminated union.
- ePayco and Wompi adapter skeletons (Colombia, single-charge card flow).
- Public `createClient` factory.
