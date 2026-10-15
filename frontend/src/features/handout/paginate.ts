export interface FlowBlock {
  height: number; // px, measured
  breakBefore?: boolean; // always start a new sheet (unless the current sheet is empty)
  keepWithNext?: boolean; // never leave this block last on a sheet (headings)
  group?: string; // blocks of one table share a group
  continuationHeight?: number; // px of the "(continued)" header drawn when a group resumes on a new sheet
}

export interface Pagination {
  sheets: number[][];
  continued: boolean[];
  overflowing: number[];
}

export const SHEET_MM = { width: 210, height: 297, marginX: 16, marginY: 14 } as const;
export const mmToPx = (mm: number) => (mm * 96) / 25.4;
export const SHEET_CONTENT_HEIGHT_PX = mmToPx(SHEET_MM.height - 2 * SHEET_MM.marginY);

export function paginate(blocks: FlowBlock[], pageHeight: number): Pagination {
  const sheets: number[][] = [[]];
  const continued = [false];
  const used = [0];
  blocks.forEach((block, i) => {
    const cur = sheets.length - 1;
    const next = blocks[i + 1];
    const need = block.height + (block.keepWithNext && next ? next.height : 0);
    if (sheets[cur].length > 0 && (block.breakBefore || used[cur] + need > pageHeight)) {
      const resumes = !block.breakBefore && !!block.group && blocks[i - 1]?.group === block.group;
      sheets.push([]);
      continued.push(resumes);
      used.push(resumes ? (block.continuationHeight ?? 0) : 0);
    }
    const s = sheets.length - 1;
    sheets[s].push(i);
    used[s] += block.height;
  });
  return { sheets, continued, overflowing: used.flatMap((u, i) => (u > pageHeight ? [i] : [])) };
}
