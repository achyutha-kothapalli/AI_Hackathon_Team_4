"""Registry of domain packs. Register new use cases here."""

from .base import Domain, DomainPrivacy, DomainUI, SampleDocument
from .german_letter import GERMAN_LETTER
from .medical_document import MEDICAL_DOCUMENT

DOMAINS: dict[str, Domain] = {d.id: d for d in (MEDICAL_DOCUMENT, GERMAN_LETTER)}


def get_domain(domain_id: str) -> Domain:
    try:
        return DOMAINS[domain_id]
    except KeyError:
        raise KeyError(f"Unknown profile '{domain_id}'. Known: {', '.join(DOMAINS)}") from None


__all__ = ["DOMAINS", "Domain", "DomainPrivacy", "DomainUI", "SampleDocument", "get_domain"]
