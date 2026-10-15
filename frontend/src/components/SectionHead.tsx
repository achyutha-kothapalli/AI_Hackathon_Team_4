import type { ReactNode } from "react";

interface Props {
  marker?: string; // "01", "02", …
  id?: string;
  level?: 2 | 3;
  aside?: ReactNode; // e.g. a read-aloud button, right-aligned
  children: ReactNode;
}

/** Signature motif: hairline rule, mono number in the gutter, title beside it. */
export function SectionHead({ marker, id, level = 2, aside, children }: Props) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <div className="section-head">
      <span className="section-marker" aria-hidden="true">{marker ?? ""}</span>
      <H id={id} tabIndex={-1}>{children}</H>
      {aside ?? <span />}
    </div>
  );
}
