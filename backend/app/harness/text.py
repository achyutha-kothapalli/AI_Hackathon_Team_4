"""Deterministic text helpers: normalisation, numbers, German dates/amounts, IBANs."""

import contextlib
import re
import unicodedata
from datetime import date

_NUMBER_WORDS = {
    # German (cardinals as they appear in letters: "zwei Wochen", "einem Monat")
    "ein": 1,
    "eins": 1,
    "eine": 1,
    "einen": 1,
    "einem": 1,
    "einer": 1,
    "eines": 1,
    "zwei": 2,
    "drei": 3,
    "vier": 4,
    "fünf": 5,
    "sechs": 6,
    "sieben": 7,
    "acht": 8,
    "neun": 9,
    "zehn": 10,
    "elf": 11,
    "zwölf": 12,
    "vierzehn": 14,
    "fünfzehn": 15,
    "zwanzig": 20,
    "dreißig": 30,
    # English, for values the model wrote in the target language
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "twelve": 12,
    "fourteen": 14,
    "thirty": 30,
}

_MONTHS = {
    "januar": 1,
    "jänner": 1,
    "februar": 2,
    "märz": 3,
    "april": 4,
    "mai": 5,
    "juni": 6,
    "juli": 7,
    "august": 8,
    "september": 9,
    "oktober": 10,
    "november": 11,
    "dezember": 12,
    "january": 1,
    "february": 2,
    "march": 3,
    "may": 5,
    "june": 6,
    "july": 7,
    "october": 10,
    "december": 12,
}

# Expected IBAN lengths for common countries; others fall back to the raw match.
_IBAN_LENGTHS = {
    "DE": 22,
    "AT": 20,
    "CH": 21,
    "FR": 27,
    "NL": 18,
    "BE": 16,
    "ES": 24,
    "IT": 27,
    "PL": 28,
    "GB": 22,
    "LU": 20,
    "LT": 20,
    "BG": 22,
    "RO": 24,
    "TR": 26,
    "CY": 28,
    "CZ": 24,
    "DK": 18,
    "IE": 22,
    "PT": 25,
    "SE": 24,
    "HU": 28,
    "GR": 27,
    "MT": 31,
}


def norm(text: str) -> str:
    """Lowercase, Unicode-normalise and collapse whitespace."""
    text = unicodedata.normalize("NFKC", text or "").lower()
    text = re.sub(r"[‐-―]", "-", text)  # all dash variants
    return re.sub(r"\s+", " ", text).strip()


def alnum(text: str) -> str:
    """Only letters and digits; robust to spacing/punctuation differences."""
    return re.sub(r"[^\w]|_", "", norm(text))


def tokens(text: str) -> str:
    """Words and numbers separated by single spaces, padded: ' kassenzeichen 5 2026 48213 '.
    Lets callers test containment on whole tokens (so 'n10' does not match 'metformin1000')."""
    return " " + " ".join(re.findall(r"[^\W_]+", norm(text))) + " "


def words(text: str) -> list[str]:
    return re.findall(r"\w+", norm(text))


def numbers(text: str) -> set[int]:
    """All integers in the text, including number words and month names."""
    t = norm(text)
    out = {int(n) for n in re.findall(r"\d+", t)}
    for w in re.findall(r"[^\W\d_]+", t):
        if w in _NUMBER_WORDS:
            out.add(_NUMBER_WORDS[w])
        if w in _MONTHS:
            out.add(_MONTHS[w])
    return out


def amounts(text: str) -> set[float]:
    """Money-like numbers: German '1.234,56', '98,50' and plain '98.50'."""
    out: set[float] = set()
    for tok in re.findall(r"\d{1,3}(?:[.\s]\d{3})+,\d{1,2}|\d+,\d{1,2}|\d+\.\d{2}\b|\d+", text or ""):
        if "," in tok:
            tok = tok.replace(".", "").replace(" ", "").replace(",", ".")
        with contextlib.suppress(ValueError):
            out.add(round(float(tok), 2))
    return out


def dates(text: str) -> set[date]:
    """Dates written as 02.11.2026, 2.11.26, 2. November 2026 or 2026-11-02."""
    t = norm(text)
    found: set[date] = set()

    def add(y: int, m: int, d: int) -> None:
        if y < 100:
            y += 2000
        with contextlib.suppress(ValueError):
            found.add(date(y, m, d))

    for d, m, y in re.findall(r"\b(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4}|\d{2})\b", t):
        add(int(y), int(m), int(d))
    for d, mon, y in re.findall(r"\b(\d{1,2})\.?\s+([^\W\d_]+)\s+(\d{4})\b", t):
        if mon in _MONTHS:
            add(int(y), _MONTHS[mon], int(d))
    for y, m, d in re.findall(r"\b(\d{4})-(\d{2})-(\d{2})\b", t):
        add(int(y), int(m), int(d))
    return found


def find_ibans(text: str) -> list[str]:
    """IBAN candidates (compact, upper-case) printed in the text."""
    out: list[str] = []
    for m in re.finditer(
        r"\b([A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,32})", unicodedata.normalize("NFKC", text or "")
    ):
        compact = m.group(1).replace(" ", "")
        expected = _IBAN_LENGTHS.get(compact[:2])
        if expected:
            if len(compact) < expected:
                continue
            compact = compact[:expected]
        if compact not in out:
            out.append(compact)
    return out


def iban_valid(iban: str) -> bool:
    """ISO 13616 mod-97 checksum."""
    s = iban[4:] + iban[:4]
    digits = "".join(str(int(c, 36)) for c in s)
    return int(digits) % 97 == 1


def format_iban(iban: str) -> str:
    return " ".join(iban[i : i + 4] for i in range(0, len(iban), 4))


def context(doc: str, match: re.Match, width: int = 50) -> str:
    """The match with some surrounding text, cut at word boundaries."""
    start, end = max(match.start() - width, 0), min(match.end() + width, len(doc))
    while start > 0 and not doc[start - 1].isspace():
        start -= 1
    while end < len(doc) and not doc[end].isspace():
        end += 1
    snippet = re.sub(r"\s+", " ", doc[start:end]).strip()
    return ("… " if start > 0 else "") + snippet + (" …" if end < len(doc) else "")


# ---------------------------------------------------------------- medication doses
_FRACTIONS = {"½": 0.5, "¼": 0.25, "¾": 0.75, "1/2": 0.5, "1/4": 0.25, "3/4": 0.75}
_DOSE = r"(?:\d+(?:[.,]\d+)?|½|¼|¾|1/2|1/4|3/4)"
_SCHEDULE = re.compile(
    rf"(?<![\d.,/])({_DOSE})\s*-\s*({_DOSE})\s*-\s*({_DOSE})(?:\s*-\s*({_DOSE}))?(?![\d.,/])"
)


def dose_value(token: str | None) -> float:
    """'1' -> 1.0, '½' -> 0.5, '1,5' -> 1.5; empty/None -> 0.0; unparseable -> -1."""
    if token is None or not token.strip():
        return 0.0
    t = token.strip()
    if t in _FRACTIONS:
        return _FRACTIONS[t]
    try:
        return float(t.replace(",", "."))
    except ValueError:
        return -1.0


def schedules(text: str) -> list[tuple[float, float, float, float]]:
    """Intake schedules printed as morning-noon-evening(-night), e.g. '1-0-1-0' or '½-0-½'."""
    out = []
    for m in _SCHEDULE.finditer(text or ""):
        out.append(tuple(dose_value(g) for g in m.groups()))  # missing 4th slot -> 0.0
    return out


def generated_text(result) -> str:
    """Everything the AI wrote for the reader (not copied from the document)."""
    parts = [result.summary, *result.action_steps]
    parts += [f"{i.label}. {i.explanation}" for i in result.key_items]
    for m in getattr(result, "medications", []):
        parts += [m.purpose or "", m.instructions or ""]
    return "\n".join(p for p in parts if p)
