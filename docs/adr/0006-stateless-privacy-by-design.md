# 0006 — Stateless, no storage, EU processing option

**Status:** Accepted

## Context

Official letters contain personal data: names, addresses, file numbers,
financial and sometimes health or residence information. Users are often in a
vulnerable position.

## Decision

- No database, no file storage, no user accounts. Images and results exist
  only in memory during one request and in the user's browser tab.
- Images and letter text are never written to logs; logs contain request ids,
  durations and status codes only.
- An EU-only processing path is available via TrustedTokens (models hosted in
  Germany) by configuration.
- The UI states what is sent where, and the app explains rather than gives
  legal advice; high-stakes letters link to human advice services.

## Consequences

- Minimal attack surface and no data-retention obligations for the app itself.
- No history or "my letters" feature; a future version would need explicit
  consent and encryption at rest.
- Data processing by the chosen AI provider is governed by that provider's terms.
  See [PRIVACY.md](../../PRIVACY.md).
