import { languageInfo } from "../lib/languages";
import { Icon } from "./Icon";

interface Props {
  languages: string[];
  selected: string | null;
  onPick: (name: string) => void;
}

export function LanguageList({ languages, selected, onPick }: Props) {
  return (
    <div className="lang-list" role="radiogroup">
      {languages.map((name) => {
        const info = languageInfo(name);
        const isSelected = name === selected;
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`lang-option ${isSelected ? "is-selected" : ""}`}
            onClick={() => onPick(name)}
          >
            <span className="lang-native" lang={info.tag} dir={info.rtl ? "rtl" : undefined}>
              {info.native}
            </span>
            <span className="lang-en">{info.native === name ? "" : name}</span>
            <span className="radio">
              <Icon name="check" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
