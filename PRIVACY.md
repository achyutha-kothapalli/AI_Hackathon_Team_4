# Privacy and data flow

Medical documents contain **health data**, a special category of personal data
(Art. 9 DSGVO/GDPR); official letters contain personal data. BriefVerstehen is
designed to process as little as possible, for as short a time as possible, and
only with the user's explicit consent for health data.

## Consent for health data

- Before a medical document is analysed, the user must tick an explicit consent
  (Art. 9(2)(a) GDPR). The text names who processes the data and where.
- The **backend enforces it**: without `consent=true` it refuses medical documents
  (HTTP 428), so no client can skip it.
- Consent is per session and use case; closing the page ends it. Nothing is stored,
  so there is nothing to delete (Art. 17).
- If the configured AI provider processes data outside the EU, the UI says so and
  recommends the EU provider.

## Personal details are hidden before upload

For health documents (and optionally for letters), the browser recognises the text
itself and blacks out the patient's name, date of birth, postal address and
insurance or case numbers on a **copy** of each page before anything is sent
(data minimisation, Art. 5(1)(c) GDPR). Only that copy is uploaded; the original
photo stays on the device. The user can check exactly what was sent ("Show what
was sent"). If the text cannot be recognised, nothing is sent unless the user
switches the option off.

## What happens to a letter

| Step | Where | Data | Kept? |
|---|---|---|---|
| Photo / PDF is resized and compressed | User's browser | Page images | Only in the open tab |
| OCR verification | User's browser (Tesseract) | Page images | Only in the open tab |
| OCR language data is downloaded | jsDelivr CDN | No personal data | – |
| Analysis request | BriefVerstehen backend (Vercel) | Page images, target language | **No.** In memory for the duration of the request only |
| AI analysis | Chosen AI provider: Anthropic (Claude) or TrustedTokens (models hosted in Germany) | Page images, prompt | Per the provider's terms (see below) |
| Result | User's browser | Translation, facts, checks | Only in the open tab; gone when it is closed |

- **No database, no file storage, no accounts, no tracking.**
- **Logs** contain only request ids, paths, status codes and durations. Never images or letter text.
- **Calendar export** is generated in the browser; nothing is sent anywhere.
- **Read aloud** uses the browser's built-in speech synthesis on the device; no text is sent to a speech service.
- **Display settings** (text size, contrast) are stored only in the browser.

## Choosing where data is processed

The AI provider is a configuration choice (`ANALYZER` in `backend/.env`):

- `trustedtokens`: open-source models run by TNG Technology Consulting in Germany;
  data stays in the EU.
- `claude`: Anthropic's API. Commercial API data is not used to train models by
  default; retention follows Anthropic's API terms.
- `mock`: demo mode; nothing leaves the backend.

## Limits

- BriefVerstehen explains letters; it does not give legal advice. High-stakes
  letters (court, immigration, eviction, debt collection, suspected scams) show
  links to human advice services.
- A production deployment would additionally need a privacy notice, a data
  processing agreement with the AI provider, and a DPIA for special categories of data.
