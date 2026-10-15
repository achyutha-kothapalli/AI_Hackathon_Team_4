# 0001 — Generic engine with pluggable domain packs

**Status:** Accepted

## Context

The prototype solves one use case (German official letters), but the real
hackathon problem is only known on the day. Before this decision, use-case
knowledge was spread over about eight places: prompt profile, knowledge folder,
sample fixtures, language list, hard-coded UI text, frontend sample list and
OCR language map. Adapting it would have meant touching all of them and easily
missing one.

## Decision

Everything specific to a use case lives in one folder, a *domain pack*
(`backend/app/domains/<id>/`):

- `__init__.py`: a `Domain` with prompt instructions, UI wording, target
  languages, OCR language and sample documents
- `ontology.json` and `rules.json`: the knowledge graph used by the harness
- `samples/`: exact answers for the sample documents (demo mode, tests)

The engine (analyzers, harness, API, frontend) contains no use-case knowledge.
The frontend receives the wording and samples via `GET /api/meta`.

## Consequences

- A new problem is "copy the folder, edit it, register it", with no engine
  changes. `tests/test_domains.py` checks that every registered pack is complete.
- The API keeps the field name `profile` for compatibility; internally it is a domain.
- The domain pack's UI wording is in English; translating the UI itself is out of scope.

## Alternatives considered

- **Configuration in environment variables:** too much structured content (ontology, rules, prompts).
- **One generic, domain-free prompt:** measurably worse extraction; domain cues matter.
