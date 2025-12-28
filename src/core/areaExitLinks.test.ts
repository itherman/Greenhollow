import { describe, expect, it } from "vitest";
import { getArea } from "./areas";

describe("area exits", () => {
  it("all exits point to a valid area + entry spawn", () => {
    for (const id of ["village", "woods", "cave", "house", "hallway"] as const) {
      const a = getArea(id);
      for (const ex of a.exits) {
        const to = getArea(ex.toArea);
        expect(to).toBeTruthy();
        // Entry must exist on the destination area.
        expect(Object.keys(to.spawns)).toContain(ex.toEntry);
      }
    }
  });
});


