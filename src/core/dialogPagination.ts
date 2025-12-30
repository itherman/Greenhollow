import type { DialogChoice } from "./dialog";

export type PaginatedChoicesResult = {
  visible: DialogChoice[];
  hasMore: boolean;
  nextPage: number | null;
};

/**
 * Paginate dialog choices so the UI can render a bounded number of lines.
 * Intended for shop dialogs: show up to `pageSize` real choices plus an optional
 * synthetic "More items..." choice handled by UI code.
 */
export function paginateDialogChoices(
  choices: DialogChoice[],
  page: number,
  pageSize = 3,
): PaginatedChoicesResult {
  const safeSize = Math.max(1, Math.floor(pageSize || 0));
  const maxPage = Math.max(0, Math.ceil(choices.length / safeSize) - 1);
  const p = Math.max(0, Math.min(maxPage, Math.floor(page || 0)));

  const start = p * safeSize;
  const end = Math.min(choices.length, start + safeSize);
  const visible = choices.slice(start, end);
  const hasMore = end < choices.length;
  const nextPage = hasMore ? p + 1 : null;
  return { visible, hasMore, nextPage };
}


