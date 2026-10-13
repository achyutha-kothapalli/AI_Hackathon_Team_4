"""A profile describes one use case: what kind of document, what to look for.

The analyzer (Claude, mock, ...) is generic; the profile carries the domain
knowledge. For the main hackathon problem, add a new profile file rather than
editing the analyzer.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Profile:
    id: str
    name: str
    description: str
    # Domain instructions appended to the shared extraction prompt.
    instructions: str
    # Shown in the UI as the expected source language; the model still detects it.
    source_language: str = "German"
