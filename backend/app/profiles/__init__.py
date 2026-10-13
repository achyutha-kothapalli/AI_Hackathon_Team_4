from .base import Profile
from .german_letter import GERMAN_LETTER

# Register new use cases here.
PROFILES: dict[str, Profile] = {p.id: p for p in (GERMAN_LETTER,)}


def get_profile(profile_id: str) -> Profile:
    try:
        return PROFILES[profile_id]
    except KeyError:
        raise KeyError(f"Unknown profile '{profile_id}'. Known: {', '.join(PROFILES)}") from None


__all__ = ["PROFILES", "Profile", "get_profile"]
