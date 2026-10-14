# Privacy and data flow

Official letters contain personal data. BriefVerstehen is designed to process
as little as possible, for as short a time as possible.

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
