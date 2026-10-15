// Read-aloud with the browser's built-in speech synthesis (Web Speech API).
// Runs on the device: no text is sent to any additional service.

const VOICE_LANG: Record<string, string> = {
  english: "en-GB",
  "einfache sprache": "de-DE",
  german: "de-DE",
  deutsch: "de-DE",
  turkish: "tr-TR",
  arabic: "ar-SA",
  russian: "ru-RU",
  ukrainian: "uk-UA",
  polish: "pl-PL",
  romanian: "ro-RO",
  persian: "fa-IR",
  spanish: "es-ES",
  french: "fr-FR",
  "simplified chinese": "zh-CN",
  hindi: "hi-IN",
  telugu: "te-IN",
};

export function speechLang(targetLanguage: string): string {
  const t = targetLanguage.toLowerCase();
  const key = Object.keys(VOICE_LANG).find((k) => t.includes(k));
  return key ? VOICE_LANG[key] : "en-GB";
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speak `text`; resolves when finished or stopped. Cancels anything already speaking. */
export function speak(text: string, lang: string, rate = 0.9): Promise<void> {
  return new Promise((resolve) => {
    if (!canSpeak()) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate; // a little slower than default: easier to follow
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith(lang.slice(0, 2)));
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}
