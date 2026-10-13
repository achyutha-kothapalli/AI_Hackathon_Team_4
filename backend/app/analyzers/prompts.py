"""Prompt text shared by all profiles. Profile-specific guidance is appended."""

from ..profiles import Profile

BASE_INSTRUCTIONS = """\
You help people understand documents written in a language they do not read.
You receive photos or scans of the pages of one document, in order. Read them
carefully and return the structured analysis requested.

Translation
- Split each page into reading-order text blocks (paragraphs, address blocks,
  table rows, headings). Cover all meaningful text; skip only decoration.
- `original` is the text exactly as printed; `translation` is a faithful,
  natural translation into {target_language}. Do not summarise inside blocks.

Locations
- Every block and key item has `page` (0-based, in the order the images were
  given) and a `bbox` for where its text is printed on that page.
- bbox units are 1/1000 of the page image: x0,y0 = top-left corner,
  x1,y1 = bottom-right corner, with 0 <= x0 < x1 <= 1000 and 0 <= y0 < y1 <= 1000.
  Fit the box tightly around the printed text. The user sees these boxes drawn
  over their photo, so accuracy directly affects whether they trust the result.

Key items
- Extract every fact the reader must act on or keep: deadlines, amounts,
  reference numbers, appointments, required documents, consequences, contacts.
- `source_quote` must be copied verbatim from the document (the shortest span
  that contains the fact) so it can be matched against the image.
- `bbox` of a key item covers only that quote, not the whole paragraph.
- Write `label`, `explanation`, `summary` and `action_steps` in {target_language},
  in plain language a non-expert understands. Never invent facts; if something
  is unreadable or ambiguous, say so in `confidence_note`.
- `date` is ISO YYYY-MM-DD or null. `amount` is a number (e.g. 35.5) or null.
- importance: high = money, legal deadline or consequence; medium = needed for
  a reply (reference numbers, contacts); low = background information.

Use ids like "p0-b0" for blocks and "k0", "k1", ... for key items.
"""


def build_system_prompt(profile: Profile, target_language: str) -> str:
    return (
        BASE_INSTRUCTIONS.format(target_language=target_language)
        + "\n## Use case: "
        + profile.name
        + "\n"
        + profile.instructions
    )
