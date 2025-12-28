import { describe, expect, it } from "vitest";
import {
  advanceLine,
  choose,
  closeDialog,
  getNode,
  openDialog,
  validateScript,
  type DialogScript,
} from "./dialog";

const script: DialogScript = {
  id: "elderIntro",
  start: "n1",
  nodes: {
    n1: { id: "n1", kind: "line", text: "Welcome, traveler.", next: "n2" },
    n2: {
      id: "n2",
      kind: "choice",
      text: "What do you ask?",
      choices: [
        { id: "where", text: "Where am I?", next: "n3" },
        { id: "bye", text: "Goodbye.", next: "end" },
      ],
    },
    n3: { id: "n3", kind: "line", text: "This is our village.", next: "end" },
    end: { id: "end", kind: "end", text: "Farewell." },
  },
};

describe("dialog", () => {
  it("validates a correct script", () => {
    expect(validateScript(script)).toEqual({ ok: true });
  });

  it("openDialog starts at script.start", () => {
    const st = openDialog(script);
    expect(st).toEqual({ open: true, scriptId: "elderIntro", nodeId: "n1" });
  });

  it("getNode returns null when closed or mismatched script", () => {
    expect(getNode(script, closeDialog())).toBeNull();
    expect(getNode(script, { open: true, scriptId: "other", nodeId: "n1" })).toBeNull();
  });

  it("advanceLine moves to next node, then closes if no next", () => {
    let st = openDialog(script);
    st = advanceLine(script, st);
    expect(st).toEqual({ open: true, scriptId: "elderIntro", nodeId: "n2" });
    // advancing on a choice does nothing
    const st2 = advanceLine(script, st);
    expect(st2).toEqual(st);
  });

  it("choose transitions to choice next, invalid choice is ignored", () => {
    let st = openDialog(script);
    st = advanceLine(script, st); // to n2 choice
    const bad = choose(script, st, "nope");
    expect(bad).toEqual(st);
    const good = choose(script, st, "where");
    expect(good).toEqual({ open: true, scriptId: "elderIntro", nodeId: "n3" });
  });

  it("end node closes when you attempt to advance from a line with no next", () => {
    // Use a line with no next to ensure close behavior
    const s2: DialogScript = {
      id: "oneLine",
      start: "a",
      nodes: { a: { id: "a", kind: "line", text: "hi" } },
    };
    let st = openDialog(s2);
    st = advanceLine(s2, st);
    expect(st).toEqual({ open: false });
  });
});


