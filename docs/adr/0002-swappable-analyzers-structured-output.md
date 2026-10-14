# 0002 — Swappable AI analyzers with schema-enforced output

**Status:** Accepted

## Context

We need a strong vision model (Claude) for quality, an EU-hosted alternative
(TrustedTokens) for data residency, and a way to develop and demo without API
keys or costs. Free-text model output is fragile to parse.

## Decision

- An `Analyzer` interface (`analyzers/base.py`): page images in, `AnalysisResult` out.
  Implementations: `claude.py`, `trustedtokens.py`, `mock.py`; chosen by `ANALYZER`
  or automatically from which API key is set.
- The output contract is a Pydantic model (`schemas/analysis.py`). It is sent to
  the model as a JSON Schema via structured outputs, so the reply is guaranteed
  to parse. TrustedTokens falls back to JSON mode with the schema in the prompt
  when a model lacks schema support; every reply is validated with Pydantic.
- Provider errors are mapped to user-facing messages with sensible HTTP codes
  (refusal 422, truncation 413, rate limit 429, timeouts 504).

## Consequences

- Switching provider is a configuration change, and adding one is a single file.
- Tests exercise the real request code against a fake HTTP transport: no keys,
  no network, deterministic.
- The mock analyzer makes the whole UI, including the safety checks, demoable offline.

## Alternatives considered

- **An LLM framework (LangChain, LangGraph):** adds a large dependency and
  abstraction for one model call per request; the official SDKs are enough.
- **OCR, then a translation API, then an LLM:** more moving parts and weaker on
  layout; kept as a possible future analyzer.
