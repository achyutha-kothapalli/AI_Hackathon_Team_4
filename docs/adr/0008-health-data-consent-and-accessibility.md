# 0008 — Health data: explicit consent, transparency, no advice; accessibility first

**Status:** Accepted

## Context

The hackathon problem is to make medical documents (discharge letters, diagnoses,
medication plans) understandable and actionable for people with low health
literacy, visual impairment or poor eyesight. These documents are health data, a
special category under Art. 9 GDPR, and misunderstanding a dose can cause harm.

## Decision

- **A second domain pack** (`medical_document`) on the existing engine, with its
  own prompt, ontology, rules, samples and privacy settings ([ADR 0001](0001-domain-packs.md)).
- **Explicit consent, enforced server-side.** Domains declare
  `privacy.requires_consent`; the backend answers HTTP 428 without `consent=true`,
  the UI shows the consent text with the actual processor and region.
- **Redaction before upload (data minimisation).** The browser OCRs each page and
  blacks out personal identifiers on a copy; only the copy is uploaded. Default on
  for health data, controlled by `privacy.redact_personal_data`.
- **Transparency about processing.** Each analyzer declares `processing`
  (provider, region, EU or not). The UI warns when health data would leave the EU.
- **No advice beyond the document.** A new rule type checks the AI's own wording
  (stop / change / reassure) and is medication-aware.
- **Structured medications** with dose columns copied exactly as printed, so they
  can be verified slot by slot and turned into a daily plan and calendar reminders.
- **Accessibility as a feature, not a setting:** read aloud (on-device speech
  synthesis), text size, high contrast, screen-reader announcements; readability
  of the explanation is measured.

## Consequences

- Medical documents cannot be analysed without explicit consent, even via the API.
- With the default Claude provider, data is processed in the USA; this is shown to
  the user. Production use for health data should use the EU provider or a
  provider with an appropriate data processing agreement.
- The no-advice guard is pattern-based; unusual phrasings may slip through, so the
  disclaimer and escalation to professionals remain essential.
- WhatsApp integration is deferred: it adds Meta as a processor and requires
  business verification.

## Alternatives considered

- **Consent only in the UI:** easy to bypass; rejected.
- **Free-text medication list:** cannot be verified dose by dose or turned into reminders.
- **Text-to-speech via a cloud API:** better voices, but sends health data to yet
  another processor; the browser's built-in speech runs on the device.
