import { describe, expect, it } from "vitest";
import { placeMarkers } from "./markers";

const SIZE = 20;

describe("placeMarkers", () => {
  it("leaves markers that do not touch at their highlight's corner", () => {
    const out = placeMarkers([{ id: "a", x: 0, y: 0 }, { id: "b", x: 0, y: 100 }], SIZE);
    expect(out).toEqual(new Map([["a", 0], ["b", 0]]));
  });
  it("staggers markers of lines that sit closer together than a marker is tall", () => {
    const lines = ["a", "b", "c", "d"].map((id, i) => ({ id, x: 50, y: i * 12 }));
    const out = placeMarkers(lines, SIZE);
    expect([...out.values()]).toEqual([0, -1, 0, -1]);
  });
  it("never lets two markers overlap", () => {
    const spots = Array.from({ length: 6 }, (_, i) => ({ id: String(i), x: 40 + (i % 2) * 5, y: i * 4 }));
    const out = placeMarkers(spots, SIZE);
    const boxes = spots.map((s) => ({ x: s.x + out.get(s.id)! * (SIZE + 2), y: s.y }));
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++)
        expect(Math.abs(boxes[i].x - boxes[j].x) >= SIZE || Math.abs(boxes[i].y - boxes[j].y) >= SIZE).toBe(true);
  });
});
