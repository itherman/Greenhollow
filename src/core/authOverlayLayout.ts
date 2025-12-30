export type AuthOverlayVariant = "compact" | "regular";

export type AuthOverlayLayout = {
  variant: AuthOverlayVariant;

  rootPaddingPx: number;
  cardMaxWidthPx: number;
  cardPaddingPx: number;

  titleFontPx: number;
  subtitleFontPx: number;
  messageFontPx: number;
  titleMarginBottomPx: number;
  subtitleMarginBottomPx: number;
  messageMarginBottomPx: number;

  fieldFontPx: number;
  fieldPaddingYpx: number;
  fieldPaddingXpx: number;
  fieldWidthPct: number;
  fieldGapPx: number;

  rowDirection: "column" | "row";
  rowGapPx: number;
  buttonLayout: "stacked" | "twoPlusOne";

  buttonFontPx: number;
  buttonPaddingYpx: number;
  buttonPaddingXpx: number;
  buttonMinWidthPx: number;
  noteFontPx: number;
  noteMarginTopPx: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Produces responsive sizing decisions for the Auth overlay.
 * Pure so we can unit-test and prevent mobile regressions.
 */
export function computeAuthOverlayLayout(viewportWpx: number, viewportHpx: number): AuthOverlayLayout {
  const vw = Math.max(0, viewportWpx || 0);
  const vh = Math.max(0, viewportHpx || 0);

  // Compact mode: phones and short viewports (e.g. landscape with browser UI bars).
  const variant: AuthOverlayVariant = vw < 520 || vh < 520 ? "compact" : "regular";
  const isLandscape = vw > vh;
  const isVeryShort = vh > 0 && vh < 420;

  const rootPaddingPx = variant === "compact" ? (isVeryShort ? 8 : 12) : 18;
  const usableW = Math.max(280, vw - rootPaddingPx * 2);

  const cardMaxWidthPx =
    variant === "compact"
      ? Math.floor(clamp(usableW, 280, 520))
      : Math.floor(clamp(Math.min(900, vw * 0.6), 640, Math.min(900, usableW)));

  const cardPaddingPx = variant === "compact" ? (isVeryShort ? 12 : 16) : 16;

  const titleFontPx = variant === "compact" ? (isVeryShort ? 28 : 34) : 48;
  const subtitleFontPx = variant === "compact" ? (isVeryShort ? 16 : 20) : 28;
  const messageFontPx = variant === "compact" ? (isVeryShort ? 14 : 16) : 20;
  const titleMarginBottomPx = variant === "compact" ? (isVeryShort ? 8 : 12) : 14;
  const subtitleMarginBottomPx = variant === "compact" ? (isVeryShort ? 12 : 18) : 24;
  const messageMarginBottomPx = variant === "compact" ? (isVeryShort ? 10 : 14) : 18;

  const fieldFontPx = variant === "compact" ? (isVeryShort ? 16 : 18) : 22;
  const fieldPaddingYpx = variant === "compact" ? (isVeryShort ? 10 : 14) : 18;
  const fieldPaddingXpx = variant === "compact" ? (isVeryShort ? 14 : 16) : 20;
  const fieldWidthPct = variant === "compact" ? 100 : 60;
  const fieldGapPx = variant === "compact" ? (isVeryShort ? 10 : 14) : 18;

  const buttonLayout: AuthOverlayLayout["buttonLayout"] =
    variant === "compact" && isLandscape && isVeryShort ? "twoPlusOne" : "stacked";
  const rowDirection = variant === "compact" ? (buttonLayout === "twoPlusOne" ? "row" : "column") : "row";
  const rowGapPx = variant === "compact" ? (isVeryShort ? 10 : 12) : 16;

  const buttonFontPx = variant === "compact" ? (isVeryShort ? 18 : 20) : 24;
  const buttonPaddingYpx = variant === "compact" ? (isVeryShort ? 10 : 14) : 18;
  const buttonPaddingXpx = variant === "compact" ? (isVeryShort ? 14 : 18) : 24;
  const buttonMinWidthPx = variant === "compact" ? 0 : 190;
  const noteFontPx = variant === "compact" ? (isVeryShort ? 12 : 14) : 20;
  const noteMarginTopPx = variant === "compact" ? (isVeryShort ? 12 : 18) : 20;

  return {
    variant,
    rootPaddingPx,
    cardMaxWidthPx,
    cardPaddingPx,
    titleFontPx,
    subtitleFontPx,
    messageFontPx,
    titleMarginBottomPx,
    subtitleMarginBottomPx,
    messageMarginBottomPx,
    fieldFontPx,
    fieldPaddingYpx,
    fieldPaddingXpx,
    fieldWidthPct,
    fieldGapPx,
    rowDirection,
    rowGapPx,
    buttonLayout,
    buttonFontPx,
    buttonPaddingYpx,
    buttonPaddingXpx,
    buttonMinWidthPx,
    noteFontPx,
    noteMarginTopPx,
  };
}


