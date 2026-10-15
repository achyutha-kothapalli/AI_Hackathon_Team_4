import type { HandoutSettings as Settings } from "../handout/model";

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  language: string;
  languages: string[];
  busy: boolean;
  onChangeLanguage: (language: string) => void;
}

const LANGUAGE_LABEL: Record<string, string> = {
  "Einfache Sprache (simple German)": "Einfache Sprache (Deutsch)",
  English: "Englisch",
};

/** Settings panel left of the A4 preview. Medicines and warning signs cannot be switched off. */
export function HandoutSettings({ settings, onChange, language, languages, busy, onChangeLanguage }: Props) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  return (
    <aside className="handout-settings" aria-label="Einstellungen für das Patientenblatt">
      <fieldset>
        <legend className="label">Schriftgröße</legend>
        <div className="segmented-row">
          <button
            type="button"
            className="btn btn-outline"
            aria-pressed={settings.size === "normal"}
            onClick={() => set({ size: "normal" })}
          >
            Normal · 12 pt
          </button>
          <button
            type="button"
            className="btn btn-outline"
            aria-pressed={settings.size === "large"}
            onClick={() => set({ size: "large" })}
          >
            Groß · 14 pt
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Abschnitte</legend>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.showActions}
            onChange={(e) => set({ showActions: e.target.checked })}
          />
          <span>Was jetzt zu tun ist</span>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.showCheckup}
            onChange={(e) => set({ showCheckup: e.target.checked })}
          />
          <span>Kontrolltermin</span>
        </label>
        <p className="hint">Medikamente und Warnzeichen werden immer gedruckt.</p>
      </fieldset>

      <fieldset>
        <legend className="label">Sprache</legend>
        <div className="segmented-row">
          {languages.map((l) => (
            <button
              key={l}
              type="button"
              className="btn btn-outline"
              aria-pressed={l === language}
              disabled={busy}
              onClick={() => {
                if (l === language) return;
                if (window.confirm("Dies startet eine neue Analyse (ca. 30 Sekunden). Fortfahren?")) onChangeLanguage(l);
              }}
            >
              {LANGUAGE_LABEL[l] ?? l}
            </button>
          ))}
        </div>
        <p className="hint">Ein Wechsel startet eine neue Analyse.</p>
      </fieldset>
    </aside>
  );
}
