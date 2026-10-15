import type { ReactNode } from "react";

export type Tone = "neutral" | "success" | "warning" | "danger";

/** Minimal / Mono status tag: dot + word, never colour alone. */
export function StatusTag({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`status-tag tone-${tone}`}>
      <span className="dot" aria-hidden="true" />
      {children}
    </span>
  );
}
