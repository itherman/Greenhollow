import { describe, expect, it } from "vitest";
import { partitionTradeRequestsForTarget } from "./tradeRequests";

describe("partitionTradeRequestsForTarget", () => {
  it("splits incoming and outgoing requests for a target", () => {
    const requests = [
      { id: "r1", senderUid: "alice", recipientUid: "bob", status: "pending" as const },
      { id: "r2", senderUid: "bob", recipientUid: "alice", status: "pending" as const },
      { id: "r3", senderUid: "carol", recipientUid: "bob", status: "pending" as const },
    ];

    const result = partitionTradeRequestsForTarget({
      requests,
      sessionUid: "bob",
      targetUid: "alice",
    });

    expect(result.incoming.map((r) => r.id)).toEqual(["r1"]);
    expect(result.outgoing.map((r) => r.id)).toEqual(["r2"]);
  });

  it("returns empty lists without a session or target", () => {
    const result = partitionTradeRequestsForTarget({
      requests: [{ id: "r1", senderUid: "alice", recipientUid: "bob", status: "pending" }],
      sessionUid: null,
      targetUid: "alice",
    });

    expect(result).toEqual({ incoming: [], outgoing: [] });
  });
});
