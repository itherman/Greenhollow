export type TradeRequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export type TradeRequestLike = {
  id: string;
  senderUid: string;
  recipientUid: string;
  status: TradeRequestStatus;
};

export function partitionTradeRequestsForTarget(input: {
  requests: TradeRequestLike[];
  sessionUid: string | null | undefined;
  targetUid: string | null | undefined;
}) {
  const { requests, sessionUid, targetUid } = input;
  if (!sessionUid || !targetUid) return { incoming: [], outgoing: [] };

  const relevant = requests.filter(
    (request) =>
      (request.senderUid === targetUid && request.recipientUid === sessionUid) ||
      (request.senderUid === sessionUid && request.recipientUid === targetUid),
  );
  const incoming = relevant.filter((request) => request.recipientUid === sessionUid);
  const outgoing = relevant.filter((request) => request.senderUid === sessionUid);
  return { incoming, outgoing };
}
