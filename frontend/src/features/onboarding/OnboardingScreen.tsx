import { useState } from "react";
import { Icon } from "../../ui/Icon";
import { LanguageList } from "../../ui/LanguageList";

interface Props {
  languages: string[];
  initial: string;
  onConfirm: (language: string) => void;
}

export function OnboardingScreen({ languages, initial, onConfirm }: Props) {
  const [selected, setSelected] = useState(initial);
  return (
    <main className="screen onboarding">
      <div className="onb-hero">
        <span className="eyebrow">Official letters. In plain language.</span>
        <h1 className="welcome-title">
          Feel at home.
          <br />
          Even in the <em>paperwork.</em>
        </h1>
        <p className="muted">
          A clearer way through German letters.
          <br />
          In a language that feels like yours.
        </p>
      </div>
      <section className="onb-selection" aria-labelledby="language-heading">
        <h2 className="h2" id="language-heading">
          Which language feels like you?
        </h2>
        <p className="muted small">Choose the language for your explanations.</p>
        <LanguageList languages={languages} selected={selected} onPick={setSelected} />
        <div className="bottom-cta">
          <button type="button" className="btn btn-primary btn-block" onClick={() => onConfirm(selected)}>
            Continue <Icon name="next" className="flip-rtl" />
          </button>
          <p className="selection-note">You can change this anytime.</p>
        </div>
      </section>
    </main>
  );
}
