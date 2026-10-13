"""Generate the sample German letter and the matching mock analysis.

Outputs:
  frontend/public/sample/bussgeldbescheid.png (shown by "Try a sample letter")
  backend/app/fixtures/sample_letter.png      (used by backend tests)
  backend/app/fixtures/sample_result.json     (returned by the mock analyzer)

Because we draw the letter ourselves, every bbox in the fixture is exact. Run:
  python scripts/make_sample.py   (from the backend/ folder)
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BACKEND = Path(__file__).resolve().parent.parent
FRONTEND = BACKEND.parent / "frontend"
W, H = 1240, 1754  # A4 at 150 dpi
MARGIN_L, MARGIN_R = 130, 130


def font(bold: bool = False, size: int = 26) -> ImageFont.FreeTypeFont:
    candidates = (
        ["arialbd.ttf", "DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf"]
        if bold
        else ["arial.ttf", "DejaVuSans.ttf", "LiberationSans-Regular.ttf"]
    )
    for name in candidates:
        for base in ("C:/Windows/Fonts/", "/usr/share/fonts/truetype/dejavu/", ""):
            try:
                return ImageFont.truetype(base + name, size)
            except OSError:
                continue
    sys.exit("No TrueType font found; install DejaVu or run on Windows.")


img = Image.new("RGB", (W, H), (252, 251, 247))
draw = ImageDraw.Draw(img)

blocks: list[dict] = []
# Each laid-out word: (paragraph_id, char_start, char_end, box)
words: list[tuple[str, int, int, tuple[int, int, int, int]]] = []
texts: dict[str, str] = {}


def norm(b: tuple[int, int, int, int]) -> dict:
    x0, y0, x1, y1 = b
    return {
        "x0": round(x0 * 1000 / W),
        "y0": round(y0 * 1000 / H),
        "x1": round(x1 * 1000 / W),
        "y1": round(y1 * 1000 / H),
    }


def union(boxes):
    return (
        min(b[0] for b in boxes),
        min(b[1] for b in boxes),
        max(b[2] for b in boxes),
        max(b[3] for b in boxes),
    )


def paragraph(pid, text, translation, x, y, width, f=None, line_gap=10):
    """Draw word-wrapped text, remember word boxes, return the y after it."""
    f = f or font()
    space = draw.textlength(" ", font=f)
    asc, desc = f.getmetrics()
    line_h = asc + desc
    cx, cy = x, y
    pos = 0
    boxes = []
    for line_no, raw_line in enumerate(text.split("\n")):
        if line_no:
            cx, cy = x, cy + line_h + line_gap
        for word in raw_line.split(" "):
            wlen = draw.textlength(word, font=f)
            if cx > x and cx + wlen > x + width:
                cx, cy = x, cy + line_h + line_gap
            draw.text((cx, cy), word, font=f, fill=(25, 25, 30))
            box = (int(cx), int(cy), int(cx + wlen), int(cy + line_h))
            start = text.index(word, pos)
            words.append((pid, start, start + len(word), box))
            boxes.append(box)
            pos = start + len(word)
            cx += wlen + space
    texts[pid] = text
    blocks.append(
        {"id": pid, "page": 0, "bbox": norm(union(boxes)), "original": text, "translation": translation}
    )
    return cy + line_h


def quote_box(pid, quote):
    text = texts[pid]
    start = text.index(quote)
    end = start + len(quote)
    hits = [b for p, s, e, b in words if p == pid and s < end and e > start]
    pad = 4
    x0, y0, x1, y1 = union(hits)
    return norm((x0 - pad, y0 - pad, x1 + pad, y1 + pad))


# ---------------------------------------------------------------- the letter
body_w = W - MARGIN_L - MARGIN_R
small = font(size=21)

paragraph(
    "p0-b0",
    "Stadt Musterstadt\nOrdnungsamt – Bußgeldstelle\nRathausplatz 1, 12345 Musterstadt",
    "City of Musterstadt\nPublic Order Office – Fines Department\nRathausplatz 1, 12345 Musterstadt",
    MARGIN_L, 110, 520, font(bold=True, size=26),
)
paragraph(
    "p0-b1",
    "Sachbearbeiterin: Frau Weber\nTelefon: 0123 456-789\nDatum: 05.10.2026\nAktenzeichen: OWi 2026/48213",
    "Case officer: Ms Weber\nPhone: 0123 456-789\nDate: 5 October 2026\nFile number: OWi 2026/48213",
    760, 110, 360, small,
)
draw.line((MARGIN_L, 300, MARGIN_L + 420, 300), fill=(150, 150, 150), width=1)
paragraph(
    "p0-b2",
    "Herrn\nMax Mustermann\nBeispielweg 12\n12345 Musterstadt",
    "Mr\nMax Mustermann\nBeispielweg 12\n12345 Musterstadt",
    MARGIN_L, 330, 500,
)
y = paragraph("p0-b3", "Bußgeldbescheid", "Fine notice (Bußgeldbescheid)", MARGIN_L, 560, body_w, font(bold=True, size=34))
y = paragraph("p0-b4", "Sehr geehrter Herr Mustermann,", "Dear Mr Mustermann,", MARGIN_L, y + 40, body_w)
y = paragraph(
    "p0-b5",
    "Ihnen wird vorgeworfen, am 12.09.2026 um 08:42 Uhr in Musterstadt, Hauptstraße 40, die zulässige "
    "Höchstgeschwindigkeit innerhalb geschlossener Ortschaften um 18 km/h überschritten zu haben "
    "(§ 41 Abs. 1 i.V.m. § 49 StVO, § 24 StVG).",
    "You are accused of having exceeded the speed limit in a built-up area by 18 km/h on 12 September 2026 "
    "at 08:42 in Musterstadt, Hauptstraße 40 (Section 41(1) in conjunction with Section 49 of the Road "
    "Traffic Regulations, Section 24 of the Road Traffic Act).",
    MARGIN_L, y + 28, body_w,
)
y = paragraph(
    "p0-b6",
    "Gegen Sie wird deshalb eine Geldbuße in Höhe von 70,00 EUR festgesetzt. Zusätzlich sind Gebühren "
    "und Auslagen in Höhe von 28,50 EUR zu zahlen. Gesamtbetrag: 98,50 EUR.",
    "A fine (Geldbuße) of EUR 70.00 is therefore imposed on you. In addition, fees and expenses of "
    "EUR 28.50 must be paid. Total amount: EUR 98.50.",
    MARGIN_L, y + 28, body_w,
)
y = paragraph(
    "p0-b7",
    "Bitte überweisen Sie den Gesamtbetrag bis spätestens 02.11.2026 auf folgendes Konto: Stadtkasse "
    "Musterstadt, IBAN DE12 3456 7890 1234 5678 90, Verwendungszweck: Kassenzeichen 5.2026.48213.",
    "Please transfer the total amount by 2 November 2026 at the latest to the following account: Stadtkasse "
    "Musterstadt (city treasury), IBAN DE12 3456 7890 1234 5678 90, payment reference: "
    "Kassenzeichen 5.2026.48213.",
    MARGIN_L, y + 28, body_w,
)
y = paragraph(
    "p0-b8",
    "Wird nicht fristgerecht gezahlt, kann die Vollstreckung eingeleitet und Erzwingungshaft angeordnet werden.",
    "If payment is not made on time, enforcement proceedings can be started and coercive detention "
    "(Erzwingungshaft) can be ordered.",
    MARGIN_L, y + 28, body_w,
)
y = paragraph(
    "p0-b9",
    "Rechtsbehelfsbelehrung: Gegen diesen Bescheid können Sie innerhalb von zwei Wochen nach Zustellung "
    "schriftlich oder zur Niederschrift Einspruch bei der Stadt Musterstadt, Ordnungsamt, Rathausplatz 1, "
    "12345 Musterstadt, einlegen.",
    "Information on legal remedies: You can lodge an objection (Einspruch) against this notice within two "
    "weeks of delivery, in writing or in person for the record, with the City of Musterstadt, Public Order "
    "Office, Rathausplatz 1, 12345 Musterstadt.",
    MARGIN_L, y + 28, body_w, font(size=23),
)
paragraph(
    "p0-b10",
    "Mit freundlichen Grüßen\nIm Auftrag\nWeber",
    "Kind regards\nOn behalf of the city\nWeber",
    MARGIN_L, y + 50, body_w,
)

# ------------------------------------------------------------ the analysis
def item(i, kind, importance, label, value, explanation, pid, quote, date=None, amount=None, currency=None):
    return {
        "id": f"k{i}", "kind": kind, "importance": importance, "label": label, "value": value,
        "explanation": explanation, "date": date, "amount": amount, "currency": currency,
        "page": 0, "bbox": quote_box(pid, quote), "source_quote": quote,
    }


key_items = [
    item(0, "payment", "high", "Total amount to pay", "98,50 EUR",
         "A EUR 70.00 fine for speeding plus EUR 28.50 in fees.", "p0-b6", "Gesamtbetrag: 98,50 EUR.",
         amount=98.5, currency="EUR"),
    item(1, "deadline", "high", "Payment deadline", "02.11.2026",
         "The money must reach the city's account by this date.", "p0-b7", "bis spätestens 02.11.2026",
         date="2026-11-02"),
    item(2, "reference", "high", "Payment reference (Kassenzeichen)", "5.2026.48213",
         "Write this exactly in the bank transfer's reference field, otherwise the payment may not be matched.",
         "p0-b7", "Kassenzeichen 5.2026.48213."),
    item(3, "payment", "medium", "Bank account (IBAN)", "DE12 3456 7890 1234 5678 90",
         "Account of the city treasury (Stadtkasse Musterstadt) to transfer the money to.",
         "p0-b7", "IBAN DE12 3456 7890 1234 5678 90"),
    item(4, "deadline", "high", "Deadline to object (Einspruch)", "2 weeks after delivery",
         "If you think the fine is wrong, you must object in writing within two weeks of receiving the "
         "letter. Afterwards the fine becomes final.", "p0-b9", "innerhalb von zwei Wochen nach Zustellung"),
    item(5, "consequence", "high", "If you don't pay", "Enforcement, possible detention",
         "Unpaid fines are collected by force, and a court can order coercive detention until you pay.",
         "p0-b8", "Vollstreckung eingeleitet und Erzwingungshaft angeordnet werden."),
    item(6, "reference", "medium", "File number (Aktenzeichen)", "OWi 2026/48213",
         "Quote this number in any letter or call about this case.", "p0-b1", "OWi 2026/48213"),
    item(7, "contact", "low", "Case officer", "Frau Weber, 0123 456-789",
         "The person handling your case at the fines department.", "p0-b1", "Telefon: 0123 456-789"),
]

result = {
    "document_type": "Fine notice for speeding (Bußgeldbescheid)",
    "sender": "City of Musterstadt, Public Order Office – Fines Department",
    "source_language": "German",
    "target_language": "English",
    "summary": "The city says you drove 18 km/h too fast on 12 September 2026 and fines you EUR 98.50 "
    "(EUR 70 fine + EUR 28.50 fees). Pay by 2 November 2026 using the Kassenzeichen as reference, "
    "or object within two weeks of receiving the letter if you disagree.",
    "action_steps": [
        "Check the date, time and place. If you were not driving or disagree, send a written objection "
        "(Einspruch) to the Ordnungsamt within 2 weeks of receiving this letter.",
        "Otherwise, transfer EUR 98.50 to IBAN DE12 3456 7890 1234 5678 90 by 02.11.2026.",
        "Use 'Kassenzeichen 5.2026.48213' as the payment reference.",
        "Keep the letter and your bank receipt.",
    ],
    "key_items": key_items,
    "blocks": blocks,
    "confidence_note": None,
}

fixtures = BACKEND / "app" / "fixtures"
fixtures.mkdir(parents=True, exist_ok=True)
img.save(fixtures / "sample_letter.png", optimize=True)
(fixtures / "sample_result.json").write_text(
    json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
)
public = FRONTEND / "public" / "sample"
if public.parent.exists():
    public.mkdir(exist_ok=True)
    img.save(public / "bussgeldbescheid.png", optimize=True)
print(f"wrote sample letter + fixture to {fixtures}")
