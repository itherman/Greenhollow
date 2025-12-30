import { advanceLine, choose, closeDialog, getNode, type DialogState } from "../../../core/dialog";
import { computeDialogLayout } from "../../../core/dialogLayout";
import { computeDialogTapAction } from "../../../core/dialogTap";
import { loadInventory, saveInventory } from "../../../services/game/inventoryStore";
import { getShopCoinsLabel } from "../../../ui/shopCoinsLabel";
import { attemptPurchase } from "../../../core/shopLogic";
import { paginateDialogChoices } from "../../../core/dialogPagination";
import type { getDialogScript } from "../../dialog/scripts";

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
    const isShop = script.id === "shopkeeper";

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
      if (isShop) {
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

    const header = node.kind === "end" ? (node.text ?? "") : node.text;
    this.dialogText!.setText(header);

    // Rebuild tappable choice lines each render (keeps handlers consistent).
    for (const t of this.dialogChoiceTexts) t.destroy();
    this.dialogChoiceTexts = [];
    for (const r of this.dialogChoiceBgs) r.destroy();
    this.dialogChoiceBgs = [];

    if (node.kind === "choice") {
      const baseX = layout.x - layout.w / 2 + layout.padding;
      // Reduce spacing: start choices just below the header text block.
      const headerH = Math.max(18, Math.ceil(this.dialogText!.getBounds().height));
      const baseY = layout.y - layout.h / 2 + 10 + headerH + 6;
      const lineH = 22;

      const MORE_ID = "__more_items__";
      const isShop = script.id === "shopkeeper";
      let choicesToRender = node.choices;
      let nextPage: number | null = null;
      if (isShop) {
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

          // Shopkeeper purchases: apply side effects before re-render.
          if (isShop && ch.id.startsWith("buy_")) {
            const itemId = ch.id.slice("buy_".length) as any;
            const inv = loadInventory();
            const res = attemptPurchase(inv, itemId);
            saveInventory(inv);
            if (this.inventoryOpen) this.renderInventoryPanel();
            const nodeId = res.ok ? "buyOk" : res.reason === "insufficient_coins" ? "buyNoCoins" : "buyNoSpace";
            this.shopDialogPage = 0;
            this.dialog = { open: true, scriptId: script.id, nodeId } as DialogState;
            this.renderDialog(script);
            return;
          }

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

      this.dialogChoicesText!.setText("Tap a choice • Tap dialog to close");
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
    for (const t of this.dialogChoiceTexts) t.destroy();
    this.dialogChoiceTexts = [];
    for (const r of this.dialogChoiceBgs) r.destroy();
    this.dialogChoiceBgs = [];
    this.dialogBox = undefined;
    this.dialogText = undefined;
    this.dialogChoicesText = undefined;
    this.shopCoinsText = undefined;
    this.shopDialogPage = 0;
  }).call(scene);
}

