export interface PageLayout {
  pages: number;
  overflowing: number[]; // sheet indices
}

export interface PageStatus {
  text: string;
  tone: "neutral" | "warning" | "danger";
}

/** Page counter shown above the handout preview. */
export function pageStatus({ pages, overflowing }: PageLayout): PageStatus {
  if (overflowing.length) return { text: `Seite ${overflowing[0] + 1} ist zu voll`, tone: "danger" };
  const count = pages === 1 ? "1 Seite" : `${pages} Seiten`;
  if (pages > 2) return { text: `${count} — wählen Sie 12 pt oder blenden Sie Abschnitte aus`, tone: "warning" };
  return { text: count, tone: "neutral" };
}
