// Places the numbered markers on the original so that close lines do not stack them on top of each other.

export interface MarkerSpot {
  id: string;
  x: number; // px, top-left corner of the highlight
  y: number;
}

const STEPS = [0, -1, 1, -2, 2, -3, 3];

/**
 * Greedy, top to bottom: each marker stays at its highlight's corner unless it would cover one already placed;
 * then it moves sideways by whole marker widths (left first, into the margin). Returns the step per id.
 */
export function placeMarkers(spots: MarkerSpot[], size: number, gap = 2): Map<string, number> {
  const pitch = size + gap;
  const placed: { x: number; y: number }[] = [];
  const out = new Map<string, number>();
  const ordered = [...spots].sort((a, b) => a.y - b.y || a.x - b.x);
  for (const s of ordered) {
    const free = (step: number) =>
      placed.every((p) => Math.abs(p.x - (s.x + step * pitch)) >= size || Math.abs(p.y - s.y) >= size);
    const step = STEPS.find(free) ?? 0;
    placed.push({ x: s.x + step * pitch, y: s.y });
    out.set(s.id, step);
  }
  return new Map(spots.map((s) => [s.id, out.get(s.id)!]));
}
