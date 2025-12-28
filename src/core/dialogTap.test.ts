import { describe, expect, it } from "vitest";
import { computeDialogTapAction } from "./dialogTap";

describe("dialogTap", () => {
  it("advances on line nodes", () => {
    expect(computeDialogTapAction({ id: "a", kind: "line", text: "hi" })).toBe("advance");
  });

  it("closes on end nodes", () => {
    expect(computeDialogTapAction({ id: "a", kind: "end", text: "bye" })).toBe("close");
    expect(computeDialogTapAction({ id: "a", kind: "end" })).toBe("close");
  });

  it("closes on choice nodes (choices should be tapped directly)", () => {
    expect(
      computeDialogTapAction({
        id: "a",
        kind: "choice",
        text: "pick",
        choices: [{ id: "c1", text: "one", next: "n1" }],
      }),
    ).toBe("close");
  });
});


