import { describe, expect, it } from "vitest";
import type { DialogChoice } from "./dialog";
import { paginateDialogChoices } from "./dialogPagination";

function mkChoices(n: number): DialogChoice[] {
  return Array.from({ length: n }, (_v, i) => ({
    id: `c${i + 1}`,
    text: `Choice ${i + 1}`,
    next: "end",
  }));
}

describe("paginateDialogChoices", () => {
  it("returns all choices when length <= pageSize", () => {
    const choices = mkChoices(3);
    const r = paginateDialogChoices(choices, 0, 3);
    expect(r.visible.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
    expect(r.hasMore).toBe(false);
    expect(r.nextPage).toBe(null);
  });

  it('pages by 3 and indicates "more" when remaining choices exist', () => {
    const choices = mkChoices(4);
    const r0 = paginateDialogChoices(choices, 0, 3);
    expect(r0.visible.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
    expect(r0.hasMore).toBe(true);
    expect(r0.nextPage).toBe(1);

    const r1 = paginateDialogChoices(choices, 1, 3);
    expect(r1.visible.map((c) => c.id)).toEqual(["c4"]);
    expect(r1.hasMore).toBe(false);
    expect(r1.nextPage).toBe(null);
  });

  it("shows last page without more when exactly multiple of pageSize", () => {
    const choices = mkChoices(6);
    const r0 = paginateDialogChoices(choices, 0, 3);
    expect(r0.visible.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
    expect(r0.hasMore).toBe(true);
    expect(r0.nextPage).toBe(1);

    const r1 = paginateDialogChoices(choices, 1, 3);
    expect(r1.visible.map((c) => c.id)).toEqual(["c4", "c5", "c6"]);
    expect(r1.hasMore).toBe(false);
    expect(r1.nextPage).toBe(null);
  });

  it("clamps page to a valid range", () => {
    const choices = mkChoices(4);
    expect(paginateDialogChoices(choices, -123, 3).visible.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
    expect(paginateDialogChoices(choices, 999, 3).visible.map((c) => c.id)).toEqual(["c4"]);
  });
});


