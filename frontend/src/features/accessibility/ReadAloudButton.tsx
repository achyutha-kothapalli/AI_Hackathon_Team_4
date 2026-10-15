import { useEffect, useState } from "react";
import { canSpeak, speak, speechLang, stopSpeaking } from "./speech";

interface Props {
  /** Text to read; a function so it is built only when pressed. */
  text: string | (() => string);
  targetLanguage: string;
  label?: string;
}

/** "Read aloud" toggle for people with low vision or difficulty reading. */
export function ReadAloudButton({ text, targetLanguage, label = "Read aloud" }: Props) {
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  if (!canSpeak()) return null;

  const toggle = async () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    await speak(typeof text === "function" ? text() : text, speechLang(targetLanguage));
    setSpeaking(false);
  };

  return (
    <button
      type="button"
      className={`btn read-aloud ${speaking ? "is-speaking" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        void toggle();
      }}
      aria-pressed={speaking}
    >
      {speaking ? "■ Stop reading" : `🔊 ${label}`}
    </button>
  );
}
