import { languageCode } from "../lib/languages";
import { Icon } from "./Icon";

interface Props {
  language: string;
  onLanguage: () => void;
  languageDisabled?: boolean;
  /** With `onBack`, shows a back button and `title` instead of the brand. */
  onBack?: () => void;
  title?: string;
}

export function Topbar({ language, onLanguage, languageDisabled, onBack, title }: Props) {
  return (
    <header className="topbar">
      {onBack ? (
        <>
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Back">
            <Icon name="back" className="flip-rtl" />
          </button>
          <div className="topbar-title">{title}</div>
        </>
      ) : (
        <div className="brand">
          <span className="brand-mark">
            <Icon name="logo" />
          </span>
          <span className="brand-name">BriefVerstehen</span>
        </div>
      )}
      <button
        type="button"
        className="lang-btn"
        onClick={onLanguage}
        disabled={languageDisabled}
        aria-label={`Translation language: ${language}`}
      >
        <Icon name="globe" />
        <span>{languageCode(language)}</span>
      </button>
    </header>
  );
}
