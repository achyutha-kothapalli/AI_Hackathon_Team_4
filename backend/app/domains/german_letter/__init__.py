"""Domain pack: German official letters received by post.

Files in this folder:
  __init__.py     this definition (prompt instructions, UI wording, samples)
  ontology.json   document classes, legal bases, item kinds, help resources
  rules.json      accuracy & safety rules run by the harness
  samples/        exact answers for the sample letters (demo mode and tests)
"""

from pathlib import Path

from ..base import Domain, DomainUI, SampleDocument

GERMAN_LETTER = Domain(
    id="german_letter",
    name="German official letter",
    description="Letters from German authorities, landlords, insurers, banks and courts.",
    folder=Path(__file__).resolve().parent,
    source_language="German",
    ocr_language="deu",
    target_languages=(
        "English",
        "Arabic",
        "Turkish",
        "Ukrainian",
        "Russian",
        "Spanish",
        "French",
        "Hindi",
        "Telugu",
        "Persian",
        "Polish",
        "Simplified Chinese",
    ),
    ui=DomainUI(
        headline="Understand official letters in your language",
        intro="Take a photo of a German letter. You get a translation, the deadlines and amounts that matter, "
        "and exactly where each one is written on the page.",
        upload_title="Photograph or upload your letter",
        upload_hint="Photos (JPEG, PNG) or a PDF · up to {max_pages} pages · lay the page flat in good light",
        disclaimer="AI translations can contain mistakes. For legal decisions, check with the sender or an "
        "advice centre (e.g. Verbraucherzentrale, Migrationsberatung).",
        progress=(
            "Reading your document…",
            "Translating every paragraph…",
            "Looking for deadlines and amounts…",
            "Writing a plain-language summary…",
        ),
    ),
    samples=(
        SampleDocument("bussgeldbescheid", "Genuine fine notice", "/sample/bussgeldbescheid.png"),
        SampleDocument("scam_inkasso", "Fake debt collection (scam)", "/sample/scam_inkasso.png"),
        SampleDocument(
            "injection_hundesteuer", "Letter with hidden AI instructions", "/sample/injection_hundesteuer.png"
        ),
    ),
    instructions="""\
The document is a letter received by post in Germany, typically from an authority
(Behörde), court, tax office (Finanzamt), job centre, health insurer, landlord,
bank or debt collector. The reader is a newcomer who does not speak German.

Pay special attention to, and always extract as key items when present:
- Deadlines and periods ("Frist", "bis zum", "innerhalb von ... Tagen/Wochen",
  "spätestens"). If the deadline is relative (e.g. "within 2 weeks of delivery"),
  say so in the explanation, compute a date only if the start date is printed,
  and mention the letter date you used.
- Amounts to pay: fines (Bußgeld, Verwarnungsgeld), fees (Gebühren, Auslagen),
  arrears (Rückstand), with the bank details (IBAN, Verwendungszweck) needed to pay.
- File / reference numbers (Aktenzeichen, Kassenzeichen, Steuernummer,
  Kundennummer) that must be quoted in any reply or payment.
- Consequences of not acting (Mahnung, Vollstreckung, Säumniszuschlag,
  loss of benefits, court proceedings) — mark these high importance.
- Right to object (Einspruch, Widerspruch, Rechtsbehelfsbelehrung) and its period.
- Appointments (Termin), documents to submit (Unterlagen, Nachweise), and
  contact details of the responsible office or person (Sachbearbeiter).

Translate German legal terms naturally and add the German term in parentheses
the first time, e.g. "objection (Einspruch)".
""",
)
