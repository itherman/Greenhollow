import { applyGreenhollowInput, getGreenhollowTheme } from "./greenhollowTheme";

export type TownChatInputHandle = {
  show: (rect: { x: number; y: number; w: number; h: number }) => void;
  hide: () => void;
  focus: () => void;
};

export function createTownChatInput(input: {
  onSend: (text: string) => void;
  onFocusChange?: (focused: boolean) => void;
}): TownChatInputHandle {
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.display = "none";
  root.style.zIndex = "40";
  root.style.pointerEvents = "auto";
  root.style.gap = "6px";
  root.style.alignItems = "center";
  root.style.justifyContent = "space-between";
  root.style.padding = "0";
  root.style.margin = "0";
  root.style.boxSizing = "border-box";
  root.style.background = "transparent";
  root.style.fontFamily = "system-ui, sans-serif";

  const field = document.createElement("input");
  field.type = "text";
  field.placeholder = "Type a message…";
  applyGreenhollowInput(field);
  field.style.flex = "1";
  field.style.height = "100%";
  field.style.padding = "6px 10px";
  field.style.fontSize = "13px";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Send";
  const theme = getGreenhollowTheme();
  button.style.height = "100%";
  button.style.padding = "0 12px";
  button.style.borderRadius = "8px";
  button.style.border = `2px solid ${theme.colors.wood1}`;
  button.style.background = theme.colors.wood0;
  button.style.color = theme.colors.ink;
  button.style.cursor = "pointer";
  button.style.fontSize = "12px";

  const send = () => {
    const text = field.value.trim();
    if (!text) return;
    input.onSend(text);
    field.value = "";
    field.focus();
  };

  field.addEventListener("focus", () => input.onFocusChange?.(true));
  field.addEventListener("blur", () => input.onFocusChange?.(false));
  field.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      send();
    }
  });
  button.addEventListener("click", () => send());

  root.append(field, button);
  document.body.append(root);

  return {
    show: (rect) => {
      root.style.display = "flex";
      root.style.left = `${rect.x}px`;
      root.style.top = `${rect.y}px`;
      root.style.width = `${rect.w}px`;
      root.style.height = `${rect.h}px`;
    },
    hide: () => {
      if (root.style.display !== "none") {
        root.style.display = "none";
        field.blur();
      }
    },
    focus: () => {
      field.focus();
    },
  };
}
