import { Icon } from "../../ui/Icon";
import { Sheet } from "../../ui/Sheet";
import { SAMPLES } from "../analysis/useAnalysis";

const HINT_TONE: Record<string, string> = {
  Genuine: "u-green",
  Scam: "u-red",
  "Hidden AI instructions": "u-amber",
};

interface Props {
  onPick: (id: string) => void;
  onClose: () => void;
}

export function SamplesSheet({ onPick, onClose }: Props) {
  return (
    <Sheet title="Sample letters" onClose={onClose}>
      <p className="muted small sheet-intro">
        Pick one to see how BriefVerstehen explains it — including how it spots scams and manipulated letters.
      </p>
      <div className="sample-list">
        {SAMPLES.map((s) => (
          <button key={s.id} type="button" className="sample" onClick={() => onPick(s.id)}>
            <span className="avatar">
              <Icon name={s.icon} />
            </span>
            <span className="sample-body">
              <span className="sample-title">{s.title}</span>
              <span className="sample-sender">{s.sender}</span>
            </span>
            <span className={`pill ${HINT_TONE[s.hint]}`}>
              <span className="dot" />
              {s.hint}
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
