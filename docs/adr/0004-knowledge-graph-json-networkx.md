# 0004 — Knowledge graph as JSON files loaded into networkx

**Status:** Accepted

## Context

Accuracy rules depend on the document type, and types form a hierarchy: a
fine notice is both an administrative decision and a payment demand. Rules
should be readable and editable by non-developers and reviewable in a pull
request. No historical usage data exists yet to mine rules from.

## Decision

- Ontology (classes with multiple parents, legal bases, item kinds, help
  resources) and rules are stored as JSON in each domain pack.
- `knowledge/graph.py` loads them into a networkx `DiGraph` with typed nodes
  and edges (`is_a`, `applies_to`, `based_on`, `concerns`, `refers_to`).
  A rule attached to a class applies to all its descendants.
- `knowledge/models.py` validates the files with Pydantic; unknown references,
  duplicate ids, invalid regexes and cycles fail at start-up and in CI.
- Rules are curated from statute (e.g. § 67 OWiG) and known scam patterns,
  with their legal basis attached and shown to the user.

## Consequences

- Adding a rule is a JSON change; inheritance keeps rules short.
- The graph is exposed at `GET /api/knowledge/{profile}` for inspection.
- Mined rules can be added later in the same format and measured with the
  evaluation tools.

## Alternatives considered

- **A graph database (Neo4j and similar):** operational overhead for about 60
  nodes, and incompatible with a stateless serverless deploy.
- **Rules in Python code:** less reviewable by domain experts; mixes data and engine.
- **LangGraph:** an agent-orchestration framework, not a knowledge store.
