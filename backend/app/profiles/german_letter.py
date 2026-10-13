from .base import Profile

GERMAN_LETTER = Profile(
    id="german_letter",
    name="German official letter",
    description="Letters from German authorities, landlords, insurers, banks and courts.",
    source_language="German",
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
