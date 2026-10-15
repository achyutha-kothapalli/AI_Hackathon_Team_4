"""Domain pack: medical documents (discharge letters, doctor's letters, medication
plans) explained for people with low health literacy, poor eyesight or visual
impairment.

Files in this folder:
  __init__.py     this definition (prompt instructions, UI wording, privacy, samples)
  ontology.json   document classes, legal bases, help resources, readability target
  rules.json      accuracy & safety rules run by the harness
  samples/        exact answers for the sample documents (demo mode and tests)
"""

from pathlib import Path

from ..base import Domain, DomainPrivacy, DomainUI, SampleDocument

MEDICAL_DOCUMENT = Domain(
    id="medical_document",
    name="Medical document",
    description="Discharge letters, doctor's letters and medication plans, explained in simple language.",
    folder=Path(__file__).resolve().parent,
    source_language="German",
    ocr_language="deu",
    target_languages=(
        "Einfache Sprache (simple German)",
        "English",
        "Turkish",
        "Arabic",
        "Russian",
        "Ukrainian",
        "Polish",
        "Romanian",
        "Persian",
        "Spanish",
        "French",
        "Simplified Chinese",
    ),
    privacy=DomainPrivacy(
        data_category="health",
        requires_consent=True,
        recommend_eu_processing=True,
        consent_text=(
            "This document contains health data, a special category of personal data (Art. 9 DSGVO/GDPR). "
            "I explicitly agree that the photo is sent to {provider} ({region}) only to explain it to me. "
            "Nothing is stored. I can stop at any time by closing this page."
        ),
    ),
    ui=DomainUI(
        headline="Understand your doctor's letter and medication plan",
        intro="Take a photo of a hospital discharge letter, a doctor's letter or a medication plan. "
        "You get a simple explanation, a daily plan for your medicines, the warning signs to watch for "
        "and what to do next. Everything can be read aloud.",
        upload_title="Photograph or upload your document",
        upload_hint="Photos (JPEG, PNG) or a PDF · up to {max_pages} pages · lay the page flat in good light",
        disclaimer="This app explains documents. It does not replace your doctor or pharmacist. Never stop or "
        "change a medicine without asking them. In an emergency call 112.",
        progress=(
            "Reading your document…",
            "Finding your medicines and doses…",
            "Explaining diagnoses in simple words…",
            "Checking everything against the document…",
        ),
    ),
    samples=(
        SampleDocument("entlassbrief", "Hospital discharge letter", "/sample/entlassbrief.png"),
        SampleDocument("medikationsplan", "Medication plan", "/sample/medikationsplan.png"),
    ),
    instructions="""\
The document is a German medical document: a hospital discharge letter
(Entlassbrief), a doctor's letter (Arztbrief), a findings report, a lab report
or a medication plan (bundeseinheitlicher Medikationsplan). The reader is the
patient or a relative with LOW HEALTH LITERACY. They may also have poor eyesight
or be blind and listen to your text with a screen reader.

How to write for the reader (summary, action_steps, label, explanation,
purpose, instructions):
- Use very simple language: short sentences (at most 12 words), common words,
  active voice, one idea per sentence. Speak to the reader as "you".
- Explain every medical term in everyday words the first time, and keep the
  German term in brackets, e.g. "high blood pressure (Hypertonie)".
- Write so it works when read aloud: no tables, no symbols like "->" or "/",
  spell out abbreviations (write "milligram", not "mg", in explanations).
- If the target language is "Einfache Sprache (simple German)", write in simple
  German (Einfache Sprache, level A2-B1).
- Never give medical advice that is not in the document. Never suggest to stop,
  skip or change a medicine or dose unless the document says so. Never say that
  something is harmless or not serious unless the document says so. Do not
  interpret lab values beyond what the document states. When in doubt, say
  "Ask your doctor or pharmacist."

What to extract:
- `medications`: EVERY medicine mentioned (current, new, changed, paused,
  stopped, as-needed). Copy name, strength and the dose columns
  morgens / mittags / abends / zur Nacht exactly as printed ("1", "½", "0");
  use null for empty columns. For intake rules that are not daily columns
  (e.g. "1x wöchentlich montags", "bei Bedarf", "bis einschließlich 12.10.2026")
  use `schedule_text`. Set `status` (new / changed / continued / stopped) from
  words like neu, angesetzt, geändert, unverändert, abgesetzt, pausiert.
  `purpose` and `instructions` in plain words (e.g. "for your blood pressure",
  "take with food").
- Key items:
  - kind "diagnosis" for each diagnosis, with the ICD-10 code in `value` if printed;
  - kind "warning_sign" for symptoms that mean "get help now", with whom to contact;
  - kind "appointment" for follow-up appointments and check-ups;
  - kind "instruction" for what to do or avoid (drinking, activity, diet, wound care).
- Medicines go ONLY into `medications`, not into key items.
- Mark as importance "high": warning signs, stopped or changed medicines,
  follow-up appointments.
""",
)
