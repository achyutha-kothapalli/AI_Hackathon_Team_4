// Fixed text on the patient handout and guide. Needs native-speaker and clinical review before real use.
// Every entry of LANGUAGES must be one of the backend's medical target_languages
// (backend/app/domains/medical_document/__init__.py). Other result languages fall back to English.

export const LANGUAGES = ["Einfache Sprache (simple German)", "English"] as const;
export type HandoutLanguage = (typeof LANGUAGES)[number];

export interface HandoutStrings {
  title1: string;
  title2: string;
  madeWith: string;
  name: string;
  admitted: string;
  discharged: string;
  why: string;
  diagnoses: string;
  actions: string;
  medicines: string;
  medicine: string;
  purpose: string;
  morning: string;
  noon: string;
  evening: string;
  night: string;
  boxName: string;
  tagNew: string;
  tagChanged: string;
  stopTaking: string;
  help: string;
  emergencyTitle: string;
  emergencyText: string;
  generalAdvice: string;
  noWarningSigns: string;
  checkup: string;
  instructions: string;
  contacts: string;
  discussedWith: string;
  date: string;
  disclaimer: string;
  continued: string;
  overview: string;
  details: string;
  myDay: string;
  otherTimes: string;
  readAloud: string;
  stopReading: string;
  textSize: string;
  sizeStandard: string;
  sizeLarge: string;
  sizeXL: string;
  allWarningSigns: string;
}

const STRINGS: Record<HandoutLanguage, HandoutStrings> = {
  "Einfache Sprache (simple German)": {
    title1: "Ihr Aufenthalt im Krankenhaus und was Sie jetzt tun",
    title2: "Hilfe, Kontrolle und Kontakte",
    madeWith: "Erstellt mit BefundVerstehen",
    name: "Name",
    admitted: "Aufnahme",
    discharged: "Entlassung",
    why: "Warum Sie im Krankenhaus waren",
    diagnoses: "Ihre Diagnosen",
    actions: "Was Sie jetzt tun",
    medicines: "Ihre Medikamente",
    medicine: "Medikament",
    purpose: "Wofür es ist",
    morning: "Morgens",
    noon: "Mittags",
    evening: "Abends",
    night: "Nachts",
    boxName: "Name auf der Packung",
    tagNew: "Neu",
    tagChanged: "Geändert",
    stopTaking: "Diese Medikamente nicht mehr nehmen",
    help: "Wann Sie Hilfe holen",
    emergencyTitle: "Notfall: 112 anrufen",
    emergencyText:
      "Rufen Sie sofort die 112 an bei: Schmerzen oder Druck in der Brust. Plötzlicher starker Atemnot. Zeichen für einen Schlaganfall. Ohnmacht.",
    generalAdvice: "Allgemeiner Rat — nicht aus Ihrem Brief",
    noWarningSigns:
      "In Ihrem Brief stehen keine Warnzeichen. Fragen Sie Ihre Ärztin oder Ihren Arzt, worauf Sie achten sollen.",
    checkup: "Kontrolle",
    instructions: "Weitere Hinweise",
    contacts: "Kontakte",
    discussedWith: "Besprochen mit",
    date: "Datum",
    disclaimer: "Dieses Blatt ersetzt nicht die Anweisungen Ihres Behandlungsteams.",
    continued: "Fortsetzung",
    overview: "Überblick",
    details: "Details",
    myDay: "Mein Tag",
    otherTimes: "Nicht jeden Tag",
    readAloud: "Vorlesen",
    stopReading: "Vorlesen stoppen",
    textSize: "Schriftgröße",
    sizeStandard: "Normal",
    sizeLarge: "Groß",
    sizeXL: "Sehr groß",
    allWarningSigns: "Alle Warnzeichen und Kontakte ansehen",
  },
  English: {
    title1: "Your hospital stay and what to do now",
    title2: "Help, check-up and contacts",
    madeWith: "Made with BefundVerstehen",
    name: "Name",
    admitted: "Admitted",
    discharged: "Discharged",
    why: "Why you were in hospital",
    diagnoses: "Your diagnoses",
    actions: "What to do now",
    medicines: "Your medicines",
    medicine: "Medicine",
    purpose: "What it is for",
    morning: "Morning",
    noon: "Noon",
    evening: "Evening",
    night: "Night",
    boxName: "Name on the box",
    tagNew: "New",
    tagChanged: "Changed",
    stopTaking: "Stop taking these medicines",
    help: "When to get help",
    emergencyTitle: "Emergency: call 112",
    emergencyText:
      "Call 112 at once if you have chest pain or pressure, sudden severe shortness of breath, signs of a stroke, or if you faint.",
    generalAdvice: "General advice — not from your letter",
    noWarningSigns: "Your letter does not list warning signs. Ask your doctor which signs to watch for.",
    checkup: "Check-up",
    instructions: "Other instructions",
    contacts: "Contacts",
    discussedWith: "Discussed with",
    date: "Date",
    disclaimer: "This handout does not replace instructions from your care team.",
    continued: "continued",
    overview: "Overview",
    details: "Details",
    myDay: "My day",
    otherTimes: "Not every day",
    readAloud: "Read aloud",
    stopReading: "Stop reading",
    textSize: "Text size",
    sizeStandard: "Standard",
    sizeLarge: "Large",
    sizeXL: "Extra large",
    allWarningSigns: "See all warning signs and contacts",
  },
};

const HTML_LANG: Record<HandoutLanguage, string> = {
  "Einfache Sprache (simple German)": "de",
  English: "en",
};

const isKnown = (l: string): l is HandoutLanguage => (LANGUAGES as readonly string[]).includes(l);
export const stringsFor = (l: string): HandoutStrings => STRINGS[isKnown(l) ? l : "English"];
// Both supported languages are left-to-right; kept as a function so callers stay unchanged if RTL returns.
export const dirFor = (_l: string): "ltr" | "rtl" => "ltr";
export const htmlLangFor = (l: string): string => (isKnown(l) ? HTML_LANG[l] : "en");
