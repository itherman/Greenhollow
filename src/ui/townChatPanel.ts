/**
 * townChatPanel.ts
 *
 * Standalone DOM panel for the town hub chat feature. Replaces the old
 * dialog-embedded chat node so that town chat is always accessible as a
 * floating overlay rather than being tied to the Phaser dialog lifecycle.
 *
 * The panel is positioned fixed to the bottom-right of the viewport and
 * is toggled visible/hidden via the Chat button in the WorldScene HUD.
 *
 * Dependencies:
 *   - greenhollowTheme.ts — visual design tokens
 *   - townChat.ts — TownChatMessage type (display only; IO stays in WorldScene)
 */

import { applyGreenhollowButton, applyGreenhollowInput, getGreenhollowTheme } from "./greenhollowTheme";
import type { TownChatMessage } from "../services/game/townChat";

/**
 * @description Handle returned by createTownChatPanel. Allows the caller to
 * show, hide, update messages, and destroy the panel without retaining a
 * reference to its DOM internals.
 */
export type TownChatPanelHandle = {
  show(): void;
  hide(): void;
  isVisible(): boolean;
  setMessages(messages: TownChatMessage[]): void;
  destroy(): void;
};

/**
 * @description Creates and mounts a fixed-position town chat panel onto
 * document.body. The panel is initially hidden and must be shown by calling
 * handle.show().
 *
 * The caller is responsible for destroying the panel when leaving the town
 * area by calling handle.destroy().
 *
 * @param opts - Configuration options for the panel.
 * @param opts.onSend - Callback invoked when the player submits a message.
 *   The text is already trimmed; the callback should forward it to the
 *   backend chat service.
 * @param opts.onFocusChange - Optional callback invoked when the text input
 *   gains or loses focus. Use it to pause game keyboard input so that chat
 *   keystrokes are not interpreted as movement or dialog commands.
 * @returns A TownChatPanelHandle for controlling the panel.
 *
 * @example
 * const panel = createTownChatPanel({
 *   onSend: (text) => void townChat.sendMessage(text),
 *   onFocusChange: (focused) => setGameKeyboardEnabled(game, !focused),
 * });
 * panel.show();
 * panel.setMessages(currentMessages);
 * // Later, on area exit:
 * panel.destroy();
 */
export function createTownChatPanel(opts: {
  onSend: (text: string) => void;
  onFocusChange?: (focused: boolean) => void;
}): TownChatPanelHandle {
  const theme = getGreenhollowTheme();

  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.right = "16px";
  root.style.bottom = "60px";
  root.style.width = "300px";
  root.style.display = "none";
  root.style.flexDirection = "column";
  root.style.zIndex = "50";
  root.style.pointerEvents = "auto";
  root.style.boxSizing = "border-box";
  root.style.background = "rgba(11,18,32,0.93)";
  root.style.border = `2px solid ${theme.colors.wood1}`;
  root.style.borderRadius = "12px";
  root.style.overflow = "hidden";
  root.style.fontFamily = "system-ui, sans-serif";
  root.style.boxShadow = "0 8px 24px rgba(0,0,0,0.5)";

  const header = document.createElement("div");
  header.style.padding = "8px 12px";
  header.style.borderBottom = `1px solid ${theme.colors.wood1}`;
  header.style.fontSize = "13px";
  header.style.color = theme.colors.gold;
  header.style.fontWeight = "bold";
  header.textContent = "Town Chat";
  root.appendChild(header);

  const messageList = document.createElement("div");
  messageList.style.overflowY = "auto";
  messageList.style.padding = "8px 12px";
  messageList.style.minHeight = "160px";
  messageList.style.maxHeight = "220px";
  messageList.style.fontSize = "13px";
  messageList.style.color = "#d2dde6";
  messageList.style.lineHeight = "1.5";
  root.appendChild(messageList);

  const inputRow = document.createElement("div");
  inputRow.style.display = "flex";
  inputRow.style.gap = "6px";
  inputRow.style.padding = "8px 12px";
  inputRow.style.borderTop = `1px solid ${theme.colors.wood1}`;
  root.appendChild(inputRow);

  const field = document.createElement("input");
  field.type = "text";
  field.placeholder = "Type a message\u2026";
  applyGreenhollowInput(field);
  field.style.flex = "1";
  field.style.padding = "6px 10px";
  field.style.fontSize = "13px";
  field.style.textAlign = "left";
  inputRow.appendChild(field);

  const sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.textContent = "Send";
  applyGreenhollowButton(sendBtn, "primary");
  sendBtn.style.padding = "6px 12px";
  sendBtn.style.fontSize = "12px";
  inputRow.appendChild(sendBtn);

  document.body.appendChild(root);

  /**
   * @description Scrolls the message list to the bottom.
   * Called whenever messages are updated or the panel becomes visible.
   */
  const scrollToBottom = () => {
    messageList.scrollTop = messageList.scrollHeight;
  };

  /**
   * @description Reads the current input, dispatches onSend if non-empty,
   * then clears the field and restores focus.
   */
  const send = () => {
    const text = field.value.trim();
    if (!text) return;
    opts.onSend(text);
    field.value = "";
    field.focus();
  };

  field.addEventListener("focus", () => opts.onFocusChange?.(true));
  field.addEventListener("blur", () => opts.onFocusChange?.(false));
  field.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  });
  sendBtn.addEventListener("click", () => send());

  let visible = false;

  return {
    /**
     * @description Makes the panel visible and focuses the input field.
     * No-op if the panel is already visible.
     */
    show() {
      if (!visible) {
        visible = true;
        root.style.display = "flex";
        scrollToBottom();
        field.focus();
      }
    },
    /**
     * @description Hides the panel and blurs the input field.
     * No-op if the panel is already hidden.
     */
    hide() {
      if (visible) {
        visible = false;
        root.style.display = "none";
        field.blur();
        opts.onFocusChange?.(false);
      }
    },
    /**
     * @description Returns true if the panel is currently visible.
     * @returns {boolean} The current visibility state.
     */
    isVisible() {
      return visible;
    },
    /**
     * @description Replaces the rendered message list with the given messages.
     * Preserves scroll position when the player has scrolled up; auto-scrolls
     * to the bottom when the panel is visible or when already at the bottom.
     *
     * @param messages - The full ordered list of chat messages to render.
     */
    setMessages(messages: TownChatMessage[]) {
      const wasAtBottom =
        messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 10;
      messageList.textContent = "";
      if (messages.length === 0) {
        const empty = document.createElement("div");
        empty.style.color = theme.colors.muted;
        empty.textContent = "No messages yet.";
        messageList.appendChild(empty);
        return;
      }
      for (const msg of messages) {
        const line = document.createElement("div");
        line.style.wordBreak = "break-word";
        const name = document.createElement("span");
        name.style.color = theme.colors.gold;
        name.style.fontWeight = "bold";
        name.textContent = `${msg.username}: `;
        const text = document.createTextNode(msg.text);
        line.appendChild(name);
        line.appendChild(text);
        messageList.appendChild(line);
      }
      if (wasAtBottom || visible) scrollToBottom();
    },
    /**
     * @description Removes the panel's root element from the DOM and
     * notifies the focus callback that focus has been released.
     * The handle is unusable after this call.
     */
    destroy() {
      root.remove();
    },
  };
}
