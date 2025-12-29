export type Theme = {
  colors: {
    night: string;
    forest0: string;
    forest1: string;
    grass0: string;
    grass1: string;
    parchment: string;
    ink: string;
    wood0: string;
    wood1: string;
    gold: string;
    danger: string;
    muted: string;
  };
};

export function getGreenhollowTheme(): Theme {
  return {
    colors: {
      night: "#0b1220",
      forest0: "#0f2a1c",
      forest1: "#143a26",
      grass0: "#184a2b",
      grass1: "#1f5b35",
      parchment: "#f1e3c6",
      ink: "#1b1a17",
      wood0: "#6b4f2a",
      wood1: "#5b4122",
      gold: "#f5d76e",
      danger: "#b91c1c",
      muted: "#4b5563",
    },
  };
}

export function applyGreenhollowButton(btn: HTMLButtonElement, variant: "primary" | "secondary" = "primary") {
  const t = getGreenhollowTheme();
  btn.style.padding = "10px 14px";
  btn.style.borderRadius = "12px";
  btn.style.border = `2px solid ${variant === "primary" ? t.colors.wood1 : "#2a3a44"}`;
  btn.style.background =
    variant === "primary"
      ? `linear-gradient(180deg, ${t.colors.wood0}, ${t.colors.wood1})`
      : `linear-gradient(180deg, #0f1418, #0b1220)`;
  btn.style.color = variant === "primary" ? "#ffffff" : "#e2e8f0";
  btn.style.cursor = "pointer";
  btn.style.fontFamily = 'ui-serif, Georgia, "Times New Roman", serif';
  btn.style.fontSize = "14px";
  btn.style.letterSpacing = "0.5px";
  btn.style.boxShadow = "0 8px 20px rgba(0,0,0,0.35)";
}

export function applyGreenhollowCard(card: HTMLDivElement) {
  const t = getGreenhollowTheme();
  card.style.background = t.colors.parchment;
  card.style.border = `2px solid ${t.colors.wood1}`;
  card.style.borderRadius = "14px";
  card.style.boxShadow = "0 18px 70px rgba(0,0,0,0.55)";
  card.style.padding = "16px";
  card.style.color = t.colors.ink;
  card.style.fontFamily = 'ui-serif, Georgia, "Times New Roman", serif';
  card.style.boxSizing = "border-box";
}

export function applyGreenhollowInput(input: HTMLInputElement) {
  const t = getGreenhollowTheme();
  input.style.width = "100%";
  input.style.boxSizing = "border-box";
  input.style.padding = "10px";
  input.style.textAlign = "center";
  input.style.borderRadius = "10px";
  input.style.border = `2px solid ${t.colors.wood1}`;
  input.style.background = "#fff7e6";
  input.style.color = t.colors.ink;
  input.style.outline = "none";
}


