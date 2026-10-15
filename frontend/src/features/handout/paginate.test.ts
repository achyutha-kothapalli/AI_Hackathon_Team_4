import { describe, expect, it } from "vitest";
import { mmToPx, paginate } from "./paginate";

const b = (height: number, extra = {}) => ({ height, ...extra });

describe("paginate", () => {
  it("keeps everything on one sheet when it fits", () => {
    expect(paginate([b(100), b(100)], 300)).toEqual({ sheets: [[0, 1]], continued: [false], overflowing: [] });
  });
  it("starts a new sheet when the next block does not fit", () => {
    expect(paginate([b(200), b(200)], 300).sheets).toEqual([[0], [1]]);
  });
  it("honours breakBefore, except on an empty sheet", () => {
    expect(paginate([b(10, { breakBefore: true }), b(10, { breakBefore: true })], 300).sheets).toEqual([[0], [1]]);
  });
  it("moves a heading with the block after it", () => {
    expect(paginate([b(200), b(50, { keepWithNext: true }), b(100)], 300).sheets).toEqual([[0], [1, 2]]);
  });
  it("marks a resumed group and counts its continuation header", () => {
    const blocks = [b(250, { group: "meds" }), b(40, { group: "meds", continuationHeight: 30 }), b(240, { group: "meds", continuationHeight: 30 })];
    const p = paginate(blocks, 300);
    expect(p.sheets).toEqual([[0, 1], [2]]);
    expect(p.continued).toEqual([false, true]);
    expect(p.overflowing).toEqual([]);
  });
  it("puts an over-tall block alone and flags it (Review Focus 4)", () => {
    const p = paginate([b(100), b(900), b(100)], 300);
    expect(p.sheets).toEqual([[0], [1], [2]]);
    expect(p.overflowing).toEqual([1]);
  });
  it("converts millimetres at 96 dpi", () => expect(Math.round(mmToPx(25.4))).toBe(96));
});
