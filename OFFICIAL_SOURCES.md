# Official sources behind the ontology and rules

The knowledge graph (`backend/app/domains/<domain>/ontology.json` and
`rules.json`) was **curated by hand** from the official German and EU sources
below. They are **cited, not queried live**: the app does not call these
sources at run time, and the content has **not yet been reviewed by a medical or
legal professional**. Each rule carries its `legal_basis`, which the app shows
to the user next to the finding.

*Last reviewed: 2026-10-15. Please double-check links and paragraph numbers
before any production use.*

## Medical documents (`medical_document`)

### Law and patient rights

| Source (official) | What we take from it | Used in |
|---|---|---|
| **§ 630e BGB**, duty to inform patients *understandably* — [gesetze-im-internet.de/bgb/__630e.html](https://www.gesetze-im-internet.de/bgb/__630e.html) | The right to an explanation you can understand | Escalation *E-UNDERSTAND-YOUR-LETTER* |
| **§ 630g BGB**, access to the patient record — [gesetze-im-internet.de/bgb/__630g.html](https://www.gesetze-im-internet.de/bgb/__630g.html) | The right to see your records | Same escalation text |
| **§ 31a SGB V**, right to a medication plan (≥ 3 long-term medicines) — [gesetze-im-internet.de/sgb_5/__31a.html](https://www.gesetze-im-internet.de/sgb_5/__31a.html) | Medication plans must list every medicine | *C-PLAN-MEDICATION*, *E-MEDICATION-QUESTIONS* |
| **§ 39 (1a) SGB V**, discharge management — [gesetze-im-internet.de/sgb_5/__39.html](https://www.gesetze-im-internet.de/sgb_5/__39.html) | A discharge letter must say how care continues (medicines, follow-up) | *C-DISCHARGE-MEDICATION*, *C-DISCHARGE-FOLLOWUP* |
| **DSGVO / GDPR** Art. 5 (data minimisation) and Art. 9 (health data) — [Regulation (EU) 2016/679, EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) | Explicit consent for health data; hide personal details before upload; store nothing | Consent gate (backend), browser redaction, `PRIVACY.md` |

### Standards and classifications

| Source (official) | What we take from it | Used in |
|---|---|---|
| **Bundeseinheitlicher Medikationsplan (BMP)**, specification by the KBV ([kbv.de](https://www.kbv.de)) | Dose columns *morgens / mittags / abends / zur Nacht*, *Hinweise*, *Grund* | `medications[]` contract, class `medication_plan`, daily plan UI |
| **ICD-10-GM** diagnosis classification by the BfArM ([bfarm.de](https://www.bfarm.de) → Kodiersysteme → ICD-10-GM) | Code format (e.g. `I10.90`) | *C-MISSED-DIAGNOSIS-CODE* (format only; codes are **not yet validated** against the catalogue) |

### Medication safety

| Source (official) | What we take from it | Used in |
|---|---|---|
| **EMA** (PRAC review of methotrexate dosing errors, 2019) and **BfArM** safety information | Methotrexate for inflammatory diseases is usually taken **once a week**; daily intake by mistake is dangerous | *M-METHOTREXATE-WEEKLY* |
| General guidance from official package leaflets (*Gebrauchsinformation*) | Blood thinners: don't stop on your own, tell every doctor; insulin: follow doses exactly, know signs of low blood sugar | *M-BLOOD-THINNER*, *M-INSULIN* (to be reviewed by a pharmacist) |

### Where to get help (resources shown to the user)

| Resource | Status |
|---|---|
| **112**, EU emergency number | Official |
| **116117**, medical on-call service of the KBV and the regional associations of statutory-health-insurance physicians — [116117.de](https://www.116117.de) | Official |
| **gesund.bund.de**, health portal of the Federal Ministry of Health — [gesund.bund.de](https://gesund.bund.de) | Official |
| **Unabhängige Patientenberatung Deutschland (UPD)**, a foundation under § 65b SGB V — [patientenberatung.de](https://www.patientenberatung.de) | Statutory mandate |
| **Was hab' ich?**, a non-profit service translating medical findings — [washabich.de](https://washabich.de) | Not official; recognised non-profit |
| Your family doctor and pharmacy | — |

## German official letters (`german_letter`)

| Source (official) | What we take from it | Used in |
|---|---|---|
| **§ 67 OWiG** — [gesetze-im-internet.de/owig_1968/__67.html](https://www.gesetze-im-internet.de/owig_1968/__67.html) | Two weeks to object to a fine notice | *L-PERIOD-OWIG* |
| **§ 355 AO** — [gesetze-im-internet.de/ao_1977/__355.html](https://www.gesetze-im-internet.de/ao_1977/__355.html) | One month to object to a tax assessment | *L-PERIOD-AO* |
| **§ 84 SGG** — [gesetze-im-internet.de/sgg/__84.html](https://www.gesetze-im-internet.de/sgg/__84.html) | One month to object to a benefits decision | *L-PERIOD-SGG* |
| **§ 70 VwGO** — [gesetze-im-internet.de/vwgo/__70.html](https://www.gesetze-im-internet.de/vwgo/__70.html) | One month for objections to administrative decisions | Ontology legal basis |
| **§ 692 ZPO** — [gesetze-im-internet.de/zpo/__692.html](https://www.gesetze-im-internet.de/zpo/__692.html) | Two weeks to object to a court payment order | *L-PERIOD-MAHNBESCHEID*, *C-MAHNBESCHEID-OBJECTION* |
| **ISO 13616** (IBAN) | Checksum validation | *S-IBAN-CHECKSUM* |
| Consumer-protection guidance of the **Verbraucherzentralen** and the **police crime-prevention service** ([polizei-beratung.de](https://www.polizei-beratung.de)) | Typical signs of fake demands: voucher or crypto payment, extreme threats, foreign accounts | *S-UNUSUAL-PAYMENT-METHOD*, *S-EXTREME-URGENCY*, *S-FOREIGN-IBAN-AUTHORITY* (patterns curated from this guidance) |
| **Beratungshilfegesetz (BerHG)** | Legal aid for low-income people at the local district court | Help resource *beratungshilfe* |

## Not from an official source

- **Readability scores** use the Flesch Reading Ease (1948) and the German Amstad
  formula (1978). These are established research methods, not official standards.
  The target of 60 is our choice for low health literacy.
- **Accessibility** (read aloud, text size, contrast) follows the intent of
  **BITV 2.0 / WCAG 2.1** but has not been audited.
- **Explanations** of diagnoses and medicines are written by the AI model from its
  general knowledge. The harness verifies facts against the document, not the
  medical correctness of explanations.

## Planned: using official sources live

1. Validate diagnosis codes against the **ICD-10-GM** files (BfArM) and show the official name.
2. Link each diagnosis to a plain-language explanation on **gesund.bund.de** or
   **gesundheitsinformation.de** (IQWiG, § 139a SGB V).
3. Link each medicine to its official package leaflet via **PharmNet.Bund** (BfArM) or the **EMA**.
4. Have a pharmacist and a lawyer review `rules.json`.
