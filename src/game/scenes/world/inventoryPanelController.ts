import { toggleEquipFromInventorySlot, type EquipmentState } from "../../../core/equipment";
import { loadInventory } from "../../../services/game/inventoryStore";
import { saveEquipment } from "../../../services/game/equipmentStore";
import { loadSession } from "../../../services/auth/session";
import { saveCloudPlayerState } from "../../../services/game/cloudPlayerState";
import { withLoadingOverlay } from "../../../ui/loadingOverlay";

/**
 * Inventory / “Pouch” modal controller extracted from `WorldScene`.
 *
 * This module intentionally avoids importing Phaser at runtime so it won't break Node unit tests.
 * The host scene passes Phaser objects which are structurally compatible with the `any` shapes here.
 *
 * Primary goals:
 * - Keep `WorldScene.ts` below “mega-file” size by moving UI plumbing out.
 * - Preserve existing behavior exactly (layout, click handlers, save/exit flows).
 */

export type InventoryPanelHost = {
  /** Scene-like object (WorldScene) that provides Phaser factories and cameras. */
  scene: any;

  /** Reads current equipment from the authoritative place (WorldScene field). */
  getEquipment: () => EquipmentState;
  /** Updates equipment in the authoritative place (WorldScene field). */
  setEquipment: (next: EquipmentState) => void;

  /** Whether dialog is currently open (prevents equip interactions while modal). */
  isDialogOpen: () => boolean;

  /** Updates derived stats (max HP) after equipment changes. */
  updateMaxHpFromArmor: () => void;

  /** Persists local progress (used before cloud save / exit). */
  writeProgress: (force: boolean) => void;

  /** Exits to title and clears local state. */
  exitToTitle: () => void;

  /** Closes the inventory modal in WorldScene. */
  setInventoryOpen: (open: boolean) => void;

  /** Clears tap-to-move target and intent in WorldScene. */
  clearTapIntent: () => void;

  /** Suppresses world pointer + exit triggers for N milliseconds. */
  suppressWorldPointerForMs: (ms: number) => void;
  suppressExitForMs: (ms: number) => void;
};

export class InventoryPanelController {
  private inventoryBackdrop?: any;
  private inventoryPanel?: any;
  private inventorySlotRects: any[] = [];
  private inventorySlotIndexText: any[] = [];
  private inventorySlotNameText: any[] = [];
  private inventorySlotQtyText: any[] = [];
  private host: InventoryPanelHost;

  constructor(host: InventoryPanelHost) {
    this.host = host;
  }

  /**
   * Clears cached refs. Call this during scene restart (`WorldScene.init`) to avoid stale
   * destroyed objects.
   */
  reset(): void {
    this.inventoryBackdrop = undefined;
    this.inventoryPanel = undefined;
    this.inventorySlotRects = [];
    this.inventorySlotIndexText = [];
    this.inventorySlotNameText = [];
    this.inventorySlotQtyText = [];
  }

  /**
   * Renders (and lazily creates) the inventory modal.
   *
   * This was extracted nearly verbatim from `WorldScene.renderInventoryPanel()` to avoid
   * behavior changes.
   */
  render(open: boolean): void {
    const { scene } = this.host;
    const inv = loadInventory();
    const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

    // Lazily create modal elements
    if (!this.inventoryBackdrop) {
      this.inventoryBackdrop = scene.add
        .rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.45)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2400)
        .setInteractive();
      this.inventoryBackdrop.on("pointerdown", (_pointer: any, _x: number, _y: number, event: any) => {
        // Prevent this click from also becoming a world tap-to-move.
        event?.stopPropagation?.();
        this.host.suppressWorldPointerForMs(250);
        this.host.clearTapIntent();
        this.host.setInventoryOpen(false);
        this.render(false);
      });
      scene.cameras.main.ignore(this.inventoryBackdrop);
    }

    if (!this.inventoryPanel) {
      const bg = scene.add.rectangle(0, 0, 10, 10, 0x0d1a12, 0.97).setStrokeStyle(2, 0x3a2a1a, 0.9);
      const header = scene.add.rectangle(0, 0, 10, 32, 0x1c2b1f, 0.94).setOrigin(0, 0.5).setStrokeStyle(1, 0x3d4a3a, 0.9);
      const title = scene.add.text(0, 0, "Pouch", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#f5d76e",
      });
      const hint = scene.add.text(0, 0, "Tap pouch / I / Esc to close • 1-9 to hold item", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#cbd5df",
      });

      this.inventoryPanel = scene.add.container(0, 0, [bg, header, title, hint]);
      (bg as any).invRole = "bg";
      (header as any).invRole = "header";
      (title as any).invRole = "title";
      (hint as any).invRole = "hint";
      this.inventoryPanel.setDepth(2500).setScrollFactor(0);
      scene.cameras.main.ignore(this.inventoryPanel);

      // Build 20 slots (5x4 grid)
      for (let i = 0; i < 20; i++) {
        const r = scene.add.rectangle(0, 0, 10, 10, 0x14251a, 1).setStrokeStyle(1, 0x2f3b32, 1);
        r.setInteractive({ useHandCursor: true });
        r.on("pointerdown", () => {
          // Allow tap-to-equip on mobile (and click on desktop) while inventory is open.
          if (!this.inventoryPanel?.visible) return;
          if (this.host.isDialogOpen()) return;
          const invNow = loadInventory();
          const equipNow = this.host.getEquipment();
          const res = toggleEquipFromInventorySlot(equipNow, invNow, i);
          if (!res.ok) return;
          this.host.setEquipment(res.next);
          saveEquipment(res.next);
          this.host.updateMaxHpFromArmor();
          this.render(true);
        });
        const idx = scene.add.text(0, 0, "", {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "11px",
          color: "#9fb5c4",
        });
        const name = scene.add.text(0, 0, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          color: "#e8f0e6",
        });
        const qty = scene.add.text(0, 0, "", {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "12px",
          color: "#f5d76e",
        });
        this.inventorySlotRects.push(r);
        this.inventorySlotIndexText.push(idx);
        this.inventorySlotNameText.push(name);
        this.inventorySlotQtyText.push(qty);
        this.inventoryPanel.add([r, idx, name, qty]);
      }

      // Cloud save + Exit buttons (bottom center row)
      const saveBg = scene.add.rectangle(0, 0, 10, 10, 0x1a2b20, 1).setStrokeStyle(1, 0x3b6b88, 1);
      const saveText = scene.add
        .text(0, 0, "Save", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "20px",
          color: "#ffffff",
        })
        .setOrigin(0, 0.5);
      const exitBg = scene.add.rectangle(0, 0, 10, 10, 0x2a1b1b, 1).setStrokeStyle(1, 0x8b3a3a, 1);
      const exitText = scene.add
        .text(0, 0, "Save and Exit to Title", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "22px",
          color: "#ffffff",
        })
        .setOrigin(0.5, 0.5);
      const saveMsg = scene.add
        .text(0, 0, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          color: "#cbd5df",
        })
        .setOrigin(0.5, 0.5);
      const versionText = scene.add
        .text(0, 0, "v0.1.2", {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "11px",
          color: "#9fb5c4",
        })
        .setOrigin(1, 0.5);
      (saveBg as any).invRole = "saveBg";
      (saveText as any).invRole = "saveText";
      (saveMsg as any).invRole = "saveMsg";
      (exitBg as any).invRole = "exitBg";
      (exitText as any).invRole = "exitText";
      (versionText as any).invRole = "version";
      // Set initial label depending on auth state.
      const initialSession = loadSession();
      const initialIsFirebase = initialSession?.mode === "firebase";
      exitText.setText(initialIsFirebase ? "Save and Exit to Title" : "Exit to Title");
      saveBg.setInteractive({ useHandCursor: true });
      saveBg.on("pointerdown", async () => {
        const session = loadSession();
        if (!session || session.mode !== "firebase") return;
        // Always ensure local progress is up to date before saving.
        this.host.writeProgress(true);
        const res = await saveCloudPlayerState(session);
        if (res.ok) {
          saveMsg.setText("Saved.");
          scene.time.delayedCall(1200, () => saveMsg.setText(""));
        } else {
          saveMsg.setText(res.reason === "firebase_not_configured" ? "Firebase not configured." : "Save failed.");
          scene.time.delayedCall(2000, () => saveMsg.setText(""));
        }
      });
      exitBg.setInteractive({ useHandCursor: true });
      exitBg.on("pointerdown", async () => {
        const session = loadSession();
        const isFirebase = session?.mode === "firebase";
        // Update label based on auth state before closing so text stays accurate.
        exitText.setText(isFirebase ? "Save and Exit to Title" : "Exit to Title");
        this.host.setInventoryOpen(false);
        this.render(false);

        await withLoadingOverlay(
          async () => {
            if (isFirebase) {
              // Save before exiting
              this.host.writeProgress(true);
              await saveCloudPlayerState(session);
            }
            this.host.exitToTitle();
          },
          {
            message: isFirebase ? "Saving and Exiting to title..." : "Exiting to title",
            minDurationMs: 2000,
          },
        );
      });
      this.inventoryPanel.add([saveBg, saveText, saveMsg, exitBg, exitText, versionText]);
    }

    // Layout (responsive)
    const W = scene.scale.width;
    const H = scene.scale.height;
    const panelW = Math.min(520, W - 40);
    const panelH = Math.min(360, H - 40);
    const panelX = W / 2;
    const panelY = H / 2;
    const pad = 14;
    const topBarH = 34;
    const cols = 5;
    const rows = 4;
    const gap = 10;

    this.inventoryBackdrop.setSize(W, H).setPosition(0, 0);
    this.inventoryPanel.setPosition(panelX, panelY);

    const bg = this.inventoryPanel.list.find((o: any) => (o as any).invRole === "bg");
    const header = this.inventoryPanel.list.find((o: any) => (o as any).invRole === "header");
    const title = this.inventoryPanel.list.find((o: any) => (o as any).invRole === "title");
    const hint = this.inventoryPanel.list.find((o: any) => (o as any).invRole === "hint");
    const saveBg = this.inventoryPanel.list.find((o: any) => (o as any).invRole === "saveBg");
    const saveText = this.inventoryPanel.list.find((o: any) => (o as any).invRole === "saveText");
    const saveMsg = this.inventoryPanel.list.find((o: any) => (o as any).invRole === "saveMsg");
    const exitBg = this.inventoryPanel.list.find((o: any) => (o as any).invRole === "exitBg");
    const exitText = this.inventoryPanel.list.find((o: any) => (o as any).invRole === "exitText");
    const versionText = this.inventoryPanel.list.find((o: any) => (o as any).invRole === "version");

    bg.setSize(panelW, panelH);
    header.setSize(panelW, topBarH).setPosition(-panelW / 2, -panelH / 2 + topBarH / 2);
    title.setPosition(-panelW / 2 + pad, -panelH / 2 + 8).setText("Pouch (20)");
    hint.setPosition(panelW / 2 - pad - hint.width, -panelH / 2 + 10);

    // Save + Exit row (bottom center, slightly overlapping for a "tab" look)
    const saveW = 140;
    const saveH = 44;
    const exitW = 240;
    const exitH = 44;
    const buttonsGap = 16;
    const canSave = (() => {
      const s = loadSession();
      return !!s && s.mode === "firebase";
    })();
    const rowW = (canSave ? saveW + buttonsGap : 0) + exitW;
    const buttonsStartX = -rowW / 2;
    const buttonY = panelH / 2 - saveH / 2 + 38;

    if (canSave) {
      saveBg.setSize(saveW, saveH).setPosition(buttonsStartX, buttonY).setOrigin(0, 0.5).setVisible(true);
      saveText.setPosition(buttonsStartX + saveW / 2, buttonY).setOrigin(0.5, 0.5).setVisible(true);
    } else {
      saveBg.setVisible(false);
      saveText.setVisible(false);
    }
    saveMsg.setPosition(0, buttonY - saveH / 2 - 8);

    exitBg.setSize(exitW, exitH).setPosition(buttonsStartX + (canSave ? saveW + buttonsGap : 0), buttonY).setOrigin(0, 0.5);
    exitText.setPosition(exitBg.x + exitW / 2, buttonY);
    // saveMsg remains visible only when text is set; still hide when not logged in
    if (!canSave) saveMsg.setText("");
    saveMsg.setVisible(canSave);

    // Version tag at bottom-right of the panel
    versionText.setPosition(panelW / 2 - pad, panelH / 2 - pad / 2).setVisible(true);

    const gridW = panelW - pad * 2;
    const gridH = panelH - pad * 2 - topBarH;
    const slotW = Math.floor((gridW - gap * (cols - 1)) / cols);
    const slotH = Math.floor((gridH - gap * (rows - 1)) / rows);
    const gridStartX = -panelW / 2 + pad;
    const startY = -panelH / 2 + pad + topBarH;

    const equipment = this.host.getEquipment();
    for (let i = 0; i < 20; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = gridStartX + c * (slotW + gap);
      const y = startY + r * (slotH + gap);

      const rect = this.inventorySlotRects[i]!;
      const idx = this.inventorySlotIndexText[i]!;
      const name = this.inventorySlotNameText[i]!;
      const qty = this.inventorySlotQtyText[i]!;

      rect.setPosition(x + slotW / 2, y + slotH / 2).setSize(slotW, slotH);
      idx.setPosition(x + 6, y + 4).setText(String(i + 1));
      name.setPosition(x + 6, y + 18);
      qty.setPosition(x + slotW - 6, y + slotH - 18).setOrigin(1, 0);

      const s = inv.slots[i];
      if (!s) {
        rect.setFillStyle(0x16281d, 1).setStrokeStyle(1, 0x2f3b32, 1);
        name.setText("").setColor("#9fb5c4");
        qty.setText("");
      } else {
        const held = equipment.heldItemId === s.id;
        rect.setFillStyle(0x1c2c22, 1).setStrokeStyle(held ? 2 : 1, held ? 0xf5d76e : 0x4f7a6b, 1);
        name.setText(truncate(s.name, 10)).setColor("#e8f0e6");
        qty.setText(String(s.qty));
      }
    }

    this.inventoryBackdrop.setVisible(open);
    this.inventoryPanel.setVisible(open);
  }
}

