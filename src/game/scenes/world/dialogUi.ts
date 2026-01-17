import Phaser from "phaser";
import { advanceLine, choose, closeDialog, getNode, type DialogState } from "../../../core/dialog";
import { computeDialogLayout } from "../../../core/dialogLayout";
import { computeDialogTapAction } from "../../../core/dialogTap";
import { ITEMS, type ItemId } from "../../../core/inventory";
import { loadInventory, saveInventory } from "../../../services/game/inventoryStore";
import { getShopCoinsLabel } from "../../../ui/shopCoinsLabel";
import { attemptPurchase } from "../../../core/shopLogic";
import { getShopEntry } from "../../../core/shopCatalog";
import { paginateDialogChoices } from "../../../core/dialogPagination";
import type { getDialogScript } from "../../dialog/scripts";
import { filterTravelChoices } from "../../dialog/travelChoices";

/**
 * Dialog UI rendering extracted from `WorldScene`.
 *
 * The code is still Phaser-driven and uses `this` heavily, so we keep it as a thin wrapper
 * that executes with `scene` bound as `this`.
 *
 * This keeps `WorldScene.ts` smaller without forcing a risky rewrite of UI code.
 */

export function renderDialogInWorldScene(scene: any, script: NonNullable<ReturnType<typeof getDialogScript>>): void {
  (function (this: any, script: NonNullable<ReturnType<typeof getDialogScript>>) {
    const node = getNode(script, this.dialog);
    if (!node) {
      this.closeDialogUi();
      this.dialog = closeDialog();
      return;
    }

    const layout = computeDialogLayout(this.scale.width, this.scale.height);
    const isShop = script.id === "shopkeeper" || script.id === "rareShopkeeper";
    const isBuyer = script.id === "buyerNpc";
    const isTravel = script.id === "riverSailor";
    const isTownPlayer = script.id === "townPlayer";
    const showShopHud = isShop || isBuyer;

    const needsDialogUi =
      !this.dialogBox ||
      !this.dialogBox.active ||
      !this.dialogText ||
      !this.dialogText.active ||
      !this.dialogChoicesText ||
      !this.dialogChoicesText.active;
    if (needsDialogUi && typeof this.closeDialogUi === "function") {
      this.closeDialogUi();
    }

    if (!this.dialogBox) {
      this.dialogBox = this.add
        .rectangle(layout.x, layout.y, layout.w, layout.h, 0x0f1418, 0.92)
        .setStrokeStyle(2, 0x2a3a44, 1)
        .setScrollFactor(0)
        .setDepth(2000);
      this.dialogBox.setInteractive();
      this.dialogBox.on("pointerdown", () => {
        this.suppressWorldPointerUntilTs = Date.now() + 250;
        this.suppressExitUntilTs = Date.now() + 250;
        if (!this.dialog.open) return;
        const nodeNow = getNode(script, this.dialog);
        if (!nodeNow) return;

        // If a choice line was tapped, its own handler will run (it's above the box).
        const action = computeDialogTapAction(nodeNow);
        if (action === "advance") {
          this.dialog = advanceLine(script, this.dialog);
          if (!this.dialog.open) {
            this.closeDialogUi();
            return;
          }
          this.renderDialog(script);
        } else if (action === "close") {
          this.dialog = closeDialog();
          this.closeDialogUi();
        }
      });

      this.dialogText = this.add
        .text(layout.x - layout.w / 2 + layout.padding, layout.y - layout.h / 2 + 10, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          color: "#ffffff",
          wordWrap: { width: layout.w - layout.padding * 2 },
        })
        .setScrollFactor(0)
        .setDepth(2001);

      this.dialogChoicesText = this.add
        .text(layout.x - layout.w / 2 + layout.padding, layout.y - layout.h / 2 + 70, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "13px",
          color: "#b7c3cc",
          wordWrap: { width: layout.w - layout.padding * 2 },
        })
        .setScrollFactor(0)
        .setDepth(2001);

      // Shop HUD: coin count in the dialog header area.
      if (showShopHud) {
        this.shopCoinsText = this.add
          .text(0, 0, "", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "13px",
            color: "#f5d76e",
          })
          .setOrigin(1, 0)
          .setScrollFactor(0)
          .setDepth(2003);
      }

      // Render dialog via UI camera only (prevents zoom-based clipping).
      this.cameras.main.ignore([this.dialogBox, this.dialogText, this.dialogChoicesText]);
      if (this.shopCoinsText) this.cameras.main.ignore(this.shopCoinsText);
    }

    // Always re-position + re-wrap in case the canvas size changed.
    this.dialogBox!.setPosition(layout.x, layout.y).setSize(layout.w, layout.h);
    this.dialogText!
      .setPosition(layout.x - layout.w / 2 + layout.padding, layout.y - layout.h / 2 + 10)
      .setWordWrapWidth(layout.w - layout.padding * 2);
    this.dialogChoicesText!
      // Footer/instructions live at the bottom of the panel to avoid overlapping choices.
      .setPosition(layout.x - layout.w / 2 + layout.padding, layout.y + layout.h / 2 - 28)
      .setWordWrapWidth(layout.w - layout.padding * 2);

    // Shop-only coin HUD.
    if (isShop) {
      if (!this.shopCoinsText) {
        this.shopCoinsText = this.add
          .text(0, 0, "", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "13px",
            color: "#f5d76e",
          })
          .setOrigin(1, 0)
          .setScrollFactor(0)
          .setDepth(2003);
        this.cameras.main.ignore(this.shopCoinsText);
      }
      const inv = loadInventory();
      this.shopCoinsText
        .setText(getShopCoinsLabel(inv))
        .setPosition(layout.x + layout.w / 2 - layout.padding, layout.y - layout.h / 2 + 10);
    } else {
      this.shopCoinsText?.destroy();
      this.shopCoinsText = undefined;
    }

    const isTradeOffer = isTownPlayer && node.id === "tradeOffer";
    let header = node.kind === "end" ? (node.text ?? "") : node.text;
    if (isBuyer && node.id === "offer" && this.buyerOffer) {
      header = `I can pay ${this.buyerOffer.coins}c for ${this.buyerOffer.itemName} x${this.buyerOffer.qty}.`;
    } else if (isBuyer && node.id === "waitPick") {
      header = "Open your pouch and pick an item to sell.";
      if (!this.buyerSelectionActive) this.startBuyerSelection(script);
    } else if (isTownPlayer && node.id === "tradeWaitPick") {
      header = "Open your pouch and pick an item to offer.";
      if (!this.tradeSelectionActive) this.startTradeSelection();
    } else if (isTradeOffer && this.tradeOffer) {
      header = `Offer ${this.tradeOffer.itemName} x${this.tradeOffer.qty} for ${this.tradeOffer.coins}c?`;
    } else if (isShop && node.id === "confirm" && this.pendingPurchaseItemId) {
      const pendingItemId = this.pendingPurchaseItemId as ItemId | null;
      const entry = pendingItemId ? getShopEntry(pendingItemId) : null;
      const label = pendingItemId ? ITEMS[pendingItemId]?.name ?? pendingItemId : "that item";
      if (entry) {
        const qty = this.pendingPurchaseQty ?? 1;
        const totalQty = entry.grantQty * qty;
        const totalPrice = entry.priceCoins * qty;
        header = `Buy ${label} x${totalQty} for ${totalPrice}c?`;
      } else {
        header = `Buy ${label}?`;
      }
    }
    this.dialogText!.setText(header);

    const isChatNode = isTownPlayer && node.id === "chat";
    if (!isChatNode) {
      this.dialogChatText?.destroy();
      this.dialogChatMaskRect?.destroy();
      this.dialogChatText = undefined;
      this.dialogChatMaskRect = undefined;
      this.dialogChatMask = undefined;
      this.townChatScrollMax = 0;
      this.townChatInputRect = null;
    } else {
      const baseX = layout.x - layout.w / 2 + layout.padding;
      const headerH = Math.max(18, Math.ceil(this.dialogText!.getBounds().height));
      const lineH = 20;
      const minLines = 4;
      const maxLines = 8;
      const inputHeight = 26;
      const inputGap = 6;
      const choicesCount = node.kind === "choice" ? node.choices.length : 0;
      const choicesHeight = choicesCount * lineH + 8;
      const chatTop = layout.y - layout.h / 2 + 10 + headerH + 6;
      const availableBottom = layout.y + layout.h / 2 - 34 - choicesHeight - inputHeight - inputGap;
      const chatBottom = Math.max(chatTop + minLines * lineH, availableBottom);
      const maxChatHeight = Math.min(maxLines * lineH, Math.max(minLines * lineH, chatBottom - chatTop));
      const chatHeight = Math.max(minLines * lineH, Math.min(maxChatHeight, chatBottom - chatTop));

      if (!this.dialogChatText) {
        this.dialogChatText = this.add
          .text(baseX, chatTop, "", {
            fontFamily: "system-ui, sans-serif",
            fontSize: "13px",
            color: "#d2dde6",
            wordWrap: { width: layout.w - layout.padding * 2 },
          })
          .setScrollFactor(0)
          .setDepth(2001);
        this.dialogChatMaskRect = this.add
          .rectangle(layout.x, chatTop + chatHeight / 2, layout.w - layout.padding * 2, chatHeight, 0x000000, 0)
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0);
        this.dialogChatMask = this.dialogChatMaskRect.createGeometryMask();
        this.dialogChatText.setMask(this.dialogChatMask);
        this.cameras.main.ignore([this.dialogChatText, this.dialogChatMaskRect]);
      }

      const lines =
        this.townChatMessages && this.townChatMessages.length
          ? this.townChatMessages.map((m: any) => `${m.username}: ${m.text}`)
          : ["No messages yet."];
      this.dialogChatText!
        .setText(lines.join("\n"))
        .setWordWrapWidth(layout.w - layout.padding * 2);

      const bounds = this.dialogChatText!.getBounds();
      const maxScroll = Math.max(0, bounds.height - chatHeight);
      this.townChatScrollMax = maxScroll;
      if (this.townChatAutoScroll) this.townChatScrollOffset = maxScroll;
      this.townChatScrollOffset = Math.max(0, Math.min(maxScroll, this.townChatScrollOffset));
      this.dialogChatText!.setPosition(baseX, chatTop - this.townChatScrollOffset);
      this.dialogChatMaskRect!
        .setPosition(layout.x, chatTop + chatHeight / 2)
        .setSize(layout.w - layout.padding * 2, chatHeight);

      this.townChatInputRect = {
        x: baseX,
        y: chatTop + chatHeight + inputGap,
        w: layout.w - layout.padding * 2,
        h: inputHeight,
      };
    }

    // Rebuild tappable choice lines each render (keeps handlers consistent).
    for (const t of this.dialogChoiceTexts) t.destroy();
    this.dialogChoiceTexts = [];
    for (const r of this.dialogChoiceBgs) r.destroy();
    this.dialogChoiceBgs = [];
    for (const o of this.dialogQtyControls ?? []) o.destroy();
    this.dialogQtyControls = [];
    for (const ev of this.dialogQtyRepeatEvents ?? []) ev.remove();
    this.dialogQtyRepeatEvents = [];

    if (node.kind === "choice") {
      const baseX = layout.x - layout.w / 2 + layout.padding;
      // Reduce spacing: start choices just below the header text block.
      const headerH = Math.max(18, Math.ceil(this.dialogText!.getBounds().height));
      let baseY = layout.y - layout.h / 2 + 10 + headerH + 6;
      const lineH = 22;

      const MORE_ID = "__more_items__";
      const isShop = script.id === "shopkeeper" || script.id === "rareShopkeeper";
      const isBuyer = script.id === "buyerNpc";
      const isTradeOffer = isTownPlayer && node.id === "tradeOffer";
      let choicesToRender = node.choices;
      let nextPage: number | null = null;
      if (isTravel) {
        choicesToRender = filterTravelChoices(choicesToRender, this.area?.id);
      }
      if (isShop && node.id === "menu") {
        const page = paginateDialogChoices(node.choices, this.shopDialogPage, 3);
        choicesToRender = page.visible;
        nextPage = page.nextPage;
        if (page.hasMore) {
          choicesToRender = [
            ...choicesToRender,
            // Synthetic; handled locally and does not advance the dialog node.
            { id: MORE_ID, text: "More items...", next: node.id },
          ];
        }
      }
      if (isChatNode) {
        const choicesCount = choicesToRender.length;
        const choicesHeight = choicesCount * lineH + 8;
        const chatTop = layout.y - layout.h / 2 + 10 + headerH + 6;
        const inputHeight = 26;
        const inputGap = 6;
        const chatBottom = Math.max(chatTop + 24, layout.y + layout.h / 2 - 34 - choicesHeight - inputHeight - inputGap);
        baseY = chatBottom + inputHeight + inputGap;
      }

      const wantsQtyControl =
        (isShop && node.id === "confirm" && this.pendingPurchaseItemId) ||
        (isBuyer && node.id === "offer" && this.buyerOffer) ||
        (isTradeOffer && this.tradeOffer);
      if (wantsQtyControl) {
        const qty =
          isShop && node.id === "confirm"
            ? this.pendingPurchaseQty ?? 1
            : isBuyer && node.id === "offer" && this.buyerOffer
              ? this.buyerOffer.qty
              : isTradeOffer && this.tradeOffer
                ? this.tradeOffer.qty
              : 1;
        const rightEdge = layout.x + layout.w / 2 - layout.padding;
        const btnSize = 18;
        const minusX = rightEdge - btnSize * 2 - 10;
        const plusX = rightEdge - btnSize;
        const controlY = baseY + 2;

        const label = this.add
          .text(baseX + 10, baseY, `Qty: ${qty}`, {
            fontFamily: "monospace",
            fontSize: "13px",
            color: "#f5d76e",
          })
          .setScrollFactor(0)
          .setDepth(2002);
        const minusBg = this.add
          .rectangle(minusX, controlY + 8, btnSize, btnSize, 0x0b1116, 0.9)
          .setStrokeStyle(1, 0x2a3a44, 1)
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0)
          .setDepth(2001);
        const minusText = this.add
          .text(minusX, controlY + 8, "-", {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#e2e8f0",
          })
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0)
          .setDepth(2002);
        const plusBg = this.add
          .rectangle(plusX, controlY + 8, btnSize, btnSize, 0x0b1116, 0.9)
          .setStrokeStyle(1, 0x2a3a44, 1)
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0)
          .setDepth(2001);
        const plusText = this.add
          .text(plusX, controlY + 8, "+", {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#e2e8f0",
          })
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0)
          .setDepth(2002);

        const adjustQty = (delta: number) => {
          const changed =
            isShop && node.id === "confirm"
              ? this.adjustPurchaseQuantity(delta)
              : isBuyer && node.id === "offer"
                ? this.adjustBuyerOfferQuantity(delta)
                : this.adjustTradeOfferQuantity(delta);
          if (changed) this.renderDialog(script);
        };
        const attachRepeater = (obj: Phaser.GameObjects.GameObject, delta: number) => {
          obj.setInteractive({ useHandCursor: true });
          obj.on("pointerdown", () => {
            adjustQty(delta);
            const event = this.time.addEvent({
              delay: 140,
              loop: true,
              callback: () => adjustQty(delta),
            });
            this.dialogQtyRepeatEvents.push(event);
            obj.once("pointerup", () => event.remove());
            obj.once("pointerout", () => event.remove());
          });
        };

        attachRepeater(minusBg, -1);
        attachRepeater(minusText, -1);
        attachRepeater(plusBg, 1);
        attachRepeater(plusText, 1);

        for (const obj of [label, minusBg, minusText, plusBg, plusText] as const) {
          this.cameras.main.ignore(obj);
          this.dialogQtyControls.push(obj);
        }

        baseY += lineH + 4;
      }

      if (isTradeOffer && this.tradeOffer) {
        const rightEdge = layout.x + layout.w / 2 - layout.padding;
        const btnSize = 18;
        const minusX = rightEdge - btnSize * 2 - 10;
        const plusX = rightEdge - btnSize;
        const controlY = baseY + 2;
        const label = this.add
          .text(baseX + 10, baseY, `Price: ${this.tradeOffer.coins}c`, {
            fontFamily: "monospace",
            fontSize: "13px",
            color: "#f5d76e",
          })
          .setScrollFactor(0)
          .setDepth(2002);
        const minusBg = this.add
          .rectangle(minusX, controlY + 8, btnSize, btnSize, 0x0b1116, 0.9)
          .setStrokeStyle(1, 0x2a3a44, 1)
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0)
          .setDepth(2001);
        const minusText = this.add
          .text(minusX, controlY + 8, "-", {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#e2e8f0",
          })
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0)
          .setDepth(2002);
        const plusBg = this.add
          .rectangle(plusX, controlY + 8, btnSize, btnSize, 0x0b1116, 0.9)
          .setStrokeStyle(1, 0x2a3a44, 1)
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0)
          .setDepth(2001);
        const plusText = this.add
          .text(plusX, controlY + 8, "+", {
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#e2e8f0",
          })
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0)
          .setDepth(2002);

        const adjustPrice = (delta: number) => {
          const changed = this.adjustTradeOfferPrice(delta);
          if (changed) this.renderDialog(script);
        };
        const attachRepeater = (obj: Phaser.GameObjects.GameObject, delta: number) => {
          obj.setInteractive({ useHandCursor: true });
          obj.on("pointerdown", () => {
            adjustPrice(delta);
            const event = this.time.addEvent({
              delay: 140,
              loop: true,
              callback: () => adjustPrice(delta),
            });
            this.dialogQtyRepeatEvents.push(event);
            obj.once("pointerup", () => event.remove());
            obj.once("pointerout", () => event.remove());
          });
        };

        attachRepeater(minusBg, -1);
        attachRepeater(minusText, -1);
        attachRepeater(plusBg, 1);
        attachRepeater(plusText, 1);

        for (const obj of [label, minusBg, minusText, plusBg, plusText] as const) {
          this.cameras.main.ignore(obj);
          this.dialogQtyControls.push(obj);
        }

        baseY += lineH + 4;
      }

      for (let i = 0; i < choicesToRender.length; i++) {
        const ch = choicesToRender[i]!;
        const y = baseY + i * lineH;
        const bg = this.add
          .rectangle(baseX, y + 2, layout.w - layout.padding * 2, lineH - 2, 0x000000, 0.14)
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(2001);
        const t = this.add
          .text(baseX + 10, y, `${i + 1}) ${ch.text}`, {
            fontFamily: "system-ui, sans-serif",
            fontSize: "13px",
            color: "#e2e8f0",
            wordWrap: { width: layout.w - layout.padding * 2 },
          })
          .setScrollFactor(0)
          .setDepth(2002);
        bg.setInteractive({ useHandCursor: true });
        t.setInteractive({ useHandCursor: true });
        const setHot = (hot: boolean) => {
          bg.setFillStyle(0x000000, hot ? 0.22 : 0.14);
          t.setColor(hot ? "#ffffff" : "#e2e8f0");
        };
        setHot(false);
        const onDown = () => {
          this.suppressWorldPointerUntilTs = Date.now() + 250;
          this.suppressExitUntilTs = Date.now() + 250;
          if (!this.dialog.open) return;
          const n = getNode(script, this.dialog);
          if (!n || n.kind !== "choice") return;

          // Shop paging: keep choices within the dialog box by paging in chunks of 3.
          if (isShop && ch.id === MORE_ID) {
            this.shopDialogPage = nextPage ?? 0;
            this.renderDialog(script);
            return;
          }
          if (isShop && node.id === "menu" && ch.id.startsWith("buy_")) {
            this.pendingPurchaseItemId = ch.id.slice("buy_".length) as ItemId;
            this.pendingPurchaseQty = 1;
            this.shopDialogPage = 0;
            this.dialog = { open: true, scriptId: script.id, nodeId: "confirm" } as DialogState;
            this.renderDialog(script);
            return;
          }

          if (isShop && node.id === "confirm") {
            if (ch.id === "confirm_no") {
              this.pendingPurchaseItemId = null;
              this.pendingPurchaseQty = 1;
              this.shopDialogPage = 0;
              this.dialog = { open: true, scriptId: script.id, nodeId: "menu" } as DialogState;
              this.renderDialog(script);
              return;
            }
            if (ch.id === "confirm_yes") {
              const itemId = this.pendingPurchaseItemId;
              this.pendingPurchaseItemId = null;
              const inv = loadInventory();
              const res = itemId
                ? attemptPurchase(inv, itemId, this.pendingPurchaseQty)
                : { ok: false, reason: "unknown_item" as const };
              this.pendingPurchaseQty = 1;
              saveInventory(inv);
              if (this.inventoryOpen) this.renderInventoryPanel();
              const nodeId =
                res.ok === true
                  ? "buyOk"
                  : res.reason === "insufficient_coins"
                    ? "buyNoCoins"
                    : "buyNoSpace";
              this.dialog = { open: true, scriptId: script.id, nodeId } as DialogState;
              this.renderDialog(script);
              return;
            }
          }

          if (isBuyer && this.handleBuyerChoice(ch.id, script)) return;
          if (isTownPlayer && this.handleTownPlayerChoice(ch.id, script)) return;
          if (isTravel && this.handleTravelChoice(ch.id)) return;

          // Shopkeeper purchases: apply side effects before re-render.
          this.dialog = choose(script, this.dialog, ch.id);
          if (isShop) this.shopDialogPage = 0;
          this.renderDialog(script);
        };
        for (const obj of [bg, t] as const) {
          obj.on("pointerover", () => setHot(true));
          obj.on("pointerout", () => setHot(false));
          obj.on("pointerdown", onDown);
        }
        this.cameras.main.ignore([bg, t]);
        this.dialogChoiceTexts.push(t);
        this.dialogChoiceBgs.push(bg);
      }

      const tradeHint =
        isTradeOffer && this.tradeOffer
          ? "Tap a choice • +/- or ↑/↓ for qty • ←/→ for price"
          : wantsQtyControl
            ? "Tap a choice • Tap +/- or use ↑/↓ for qty"
            : "Tap a choice • Tap dialog to close";
      this.dialogChoicesText!.setText(
        isChatNode ? "Type a message • Enter to send • Scroll for history" : tradeHint,
      );
    } else if (node.kind === "line") {
      this.dialogChoicesText!.setText("Tap dialog to continue");
    } else {
      this.dialogChoicesText!.setText("Tap dialog to close");
    }
  }).call(scene, script);
}

export function closeDialogUiInWorldScene(scene: any): void {
  (function (this: any) {
    this.dialogBox?.destroy();
    this.dialogText?.destroy();
    this.dialogChoicesText?.destroy();
    this.shopCoinsText?.destroy();
    this.dialogChatText?.destroy();
    this.dialogChatMaskRect?.destroy();
    this.dialogChatMask = undefined;
    for (const t of this.dialogChoiceTexts) t.destroy();
    this.dialogChoiceTexts = [];
    for (const r of this.dialogChoiceBgs) r.destroy();
    this.dialogChoiceBgs = [];
    for (const o of this.dialogQtyControls ?? []) o.destroy();
    this.dialogQtyControls = [];
    for (const ev of this.dialogQtyRepeatEvents ?? []) ev.remove();
    this.dialogQtyRepeatEvents = [];
    this.dialogBox = undefined;
    this.dialogText = undefined;
    this.dialogChoicesText = undefined;
    this.shopCoinsText = undefined;
    this.dialogChatText = undefined;
    this.dialogChatMaskRect = undefined;
    this.shopDialogPage = 0;
  }).call(scene);
}
