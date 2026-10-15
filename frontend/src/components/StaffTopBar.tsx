import { FilePlus } from "lucide-react";
import { APP_NAME } from "../config/app";

interface Props {
  /** When given, shows a "Neuer Brief" button that starts over. */
  onNewLetter?: () => void;
}

/** 56px staff header: logo and app name left, optional "Neuer Brief" right. Hairline bottom rule. */
export function StaffTopBar({ onNewLetter }: Props) {
  return (
    <header style={{ borderBottom: "1px solid var(--border)", background: "var(--background)" }}>
      <div className="container" style={{ height: 56, display: "flex", alignItems: "center", gap: 12 }}>
        <img src="/favicon.svg" alt="" width={24} height={24} />
        <span style={{ fontWeight: 600, fontSize: 16 }}>{APP_NAME}</span>
        {onNewLetter && (
          <button type="button" className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={onNewLetter}>
            <FilePlus size={18} aria-hidden="true" />
            Neuer Brief
          </button>
        )}
      </div>
    </header>
  );
}
