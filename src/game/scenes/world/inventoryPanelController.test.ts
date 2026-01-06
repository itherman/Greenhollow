import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryPanelController } from "./inventoryPanelController";
import { createInventory } from "../../../core/inventory";
import * as inventoryStore from "../../../services/game/inventoryStore";
import * as sessionModule from "../../../services/auth/session";

function createMockDisplayObject() {
  const handlers: Record<string, Array<(...args: any[]) => void>> = {};
  const obj: any = {
    x: 0,
    y: 0,
    width: 0,
    visible: true,
    text: "",
    on: (event: string, cb: (...args: any[]) => void) => {
      handlers[event] ??= [];
      handlers[event]!.push(cb);
      return obj;
    },
    emit: (event: string, ...args: any[]) => {
      handlers[event]?.forEach((cb) => cb(...args));
      return obj;
    },
    add: (items: any[]) => {
      obj.list.push(...items);
      return obj;
    },
    setOrigin: () => obj,
    setScrollFactor: () => obj,
    setDepth: () => obj,
    setInteractive: (options?: any) => {
      obj.dropZone = !!options?.dropZone;
      return obj;
    },
    setStrokeStyle: () => obj,
    setSize: () => obj,
    setPosition: (x?: number, y?: number) => {
      if (typeof x === "number") obj.x = x;
      if (typeof y === "number") obj.y = y;
      return obj;
    },
    setVisible: (v?: boolean) => {
      if (typeof v === "boolean") obj.visible = v;
      return obj;
    },
    setTexture: () => obj,
    setDisplaySize: () => obj,
    setText: (t?: string) => {
      obj.text = t ?? "";
      return obj;
    },
    setAlpha: () => obj,
    setFillStyle: () => obj,
    setWordWrapWidth: () => obj,
    setStyle: () => obj,
    setColor: () => obj,
    setScale: () => obj,
    list: [] as any[],
  };
  return obj;
}

function createMockScene() {
  const inputHandlers: Record<string, Array<(...args: any[]) => void>> = {};
  const input = {
    setDraggable: vi.fn(),
    on: (event: string, cb: (...args: any[]) => void) => {
      inputHandlers[event] ??= [];
      inputHandlers[event]!.push(cb);
      return input;
    },
    emit: (event: string, ...args: any[]) => {
      inputHandlers[event]?.forEach((cb) => cb(...args));
    },
  };
  return {
    scale: { width: 800, height: 600 },
    time: {
      now: 0,
      delayedCall: (_delay: number, cb: () => void) => {
        return { remove: vi.fn(), callback: cb };
      },
    },
    cameras: { main: { ignore: vi.fn() } },
    textures: { exists: () => true },
    add: {
      rectangle: () => createMockDisplayObject(),
      text: () => createMockDisplayObject(),
      image: () => createMockDisplayObject(),
      container: (_x: number, _y: number, list: any[]) => {
        const obj = createMockDisplayObject();
        obj.list = [...list];
        return obj;
      },
    },
    input,
    inputHandlers,
  };
}

const emptyEquipment = { headArmorItemId: null, bodyArmorItemId: null, legArmorItemId: null, heldItemId: null };

describe("inventoryPanelController", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates slot taps to host while dialog is open (selling flow)", () => {
    const inventory = createInventory();
    inventory.slots[0] = { id: "bread", name: "Bread", qty: 1, maxStack: 10 };
    vi.spyOn(inventoryStore, "loadInventory").mockReturnValue(inventory);
    vi.spyOn(sessionModule, "loadSession").mockReturnValue(null);

    const scene = createMockScene();
    const handleSlot = vi.fn().mockReturnValue(true);
    const isDialogOpen = vi.fn(() => true);

    const controller = new InventoryPanelController({
      scene,
      getEquipment: () => emptyEquipment,
      setEquipment: vi.fn(),
      isDialogOpen,
      updateMaxHpFromArmor: vi.fn(),
      getHp: () => 10,
      getMaxHp: () => 10,
      setHp: vi.fn(),
      writeProgress: vi.fn(),
      exitToTitle: vi.fn(),
      setInventoryOpen: vi.fn(),
      clearTapIntent: vi.fn(),
      suppressWorldPointerForMs: vi.fn(),
      suppressExitForMs: vi.fn(),
      handleInventorySlotClick: handleSlot,
    });

    controller.render(true);

    const slotRect = (controller as any).inventorySlotRects[0];
    expect(slotRect).toBeDefined();

    const pointer = { pointerType: "mouse" };
    slotRect.emit("pointerdown", pointer);

    expect(handleSlot).toHaveBeenCalledWith(0, pointer);
    expect(isDialogOpen).not.toHaveBeenCalled();
  });

  it("long-press opens delete dialog and confirms deletion", () => {
    const inventory = createInventory();
    inventory.slots[0] = { id: "bread", name: "Bread", qty: 1, maxStack: 10 };
    vi.spyOn(inventoryStore, "loadInventory").mockReturnValue(inventory);
    const saveSpy = vi.spyOn(inventoryStore, "saveInventory").mockReturnValue();
    vi.spyOn(sessionModule, "loadSession").mockReturnValue(null);

    const scene = createMockScene();

    const controller = new InventoryPanelController({
      scene,
      getEquipment: () => emptyEquipment,
      setEquipment: vi.fn(),
      isDialogOpen: () => false,
      updateMaxHpFromArmor: vi.fn(),
      getHp: () => 10,
      getMaxHp: () => 10,
      setHp: vi.fn(),
      writeProgress: vi.fn(),
      exitToTitle: vi.fn(),
      setInventoryOpen: vi.fn(),
      clearTapIntent: vi.fn(),
      suppressWorldPointerForMs: vi.fn(),
      suppressExitForMs: vi.fn(),
    });

    controller.render(true);

    const slotRect = (controller as any).inventorySlotRects[0];
    const pointer = { pointerType: "touch" };
    slotRect.emit("pointerdown", pointer);

    // Fire the delayed long-press callback manually.
    const holdTimer = (controller as any).deleteHoldTimer;
    expect(holdTimer?.callback).toBeDefined();
    holdTimer.callback();

    expect((controller as any).deleteDialogVisible).toBe(true);
    const deleteDialog = (controller as any).deleteDialog;
    // Confirm button is the third element in the container list.
    const confirmBtn = deleteDialog.list[2];
    confirmBtn.emit("pointerdown");

    expect(inventory.slots[0]).toBeNull();
    expect(saveSpy).toHaveBeenCalled();
    expect((controller as any).deleteDialogVisible).toBe(false);
  });

  it("drags and swaps items between slots", () => {
    const inventory = createInventory();
    inventory.slots[0] = { id: "bread", name: "Bread", qty: 1, maxStack: 10 };
    inventory.slots[1] = { id: "stew", name: "Stew", qty: 2, maxStack: 10 };
    vi.spyOn(inventoryStore, "loadInventory").mockReturnValue(inventory);
    const saveSpy = vi.spyOn(inventoryStore, "saveInventory").mockReturnValue();
    vi.spyOn(sessionModule, "loadSession").mockReturnValue(null);

    const scene = createMockScene();

    const controller = new InventoryPanelController({
      scene,
      getEquipment: () => emptyEquipment,
      setEquipment: vi.fn(),
      isDialogOpen: () => false,
      updateMaxHpFromArmor: vi.fn(),
      getHp: () => 10,
      getMaxHp: () => 10,
      setHp: vi.fn(),
      writeProgress: vi.fn(),
      exitToTitle: vi.fn(),
      setInventoryOpen: vi.fn(),
      clearTapIntent: vi.fn(),
      suppressWorldPointerForMs: vi.fn(),
      suppressExitForMs: vi.fn(),
    });

    controller.render(true);

    const slot0 = (controller as any).inventorySlotRects[0];
    const slot1 = (controller as any).inventorySlotRects[1];
    expect(slot0.invSlotIndex).toBe(0);
    expect(slot1.invSlotIndex).toBe(1);

    // Simulate dropping slot0 onto slot1
    scene.input.emit("drop", null, slot0, slot1);

    expect(inventory.slots[0]?.id).toBe("stew");
    expect(inventory.slots[1]?.id).toBe("bread");
    expect(saveSpy).toHaveBeenCalled();
  });

  it("drops items onto the trash zone to delete them", () => {
    const inventory = createInventory();
    inventory.slots[0] = { id: "bread", name: "Bread", qty: 1, maxStack: 10 };
    vi.spyOn(inventoryStore, "loadInventory").mockReturnValue(inventory);
    const saveSpy = vi.spyOn(inventoryStore, "saveInventory").mockReturnValue();
    vi.spyOn(sessionModule, "loadSession").mockReturnValue(null);

    const scene = createMockScene();

    const controller = new InventoryPanelController({
      scene,
      getEquipment: () => emptyEquipment,
      setEquipment: vi.fn(),
      isDialogOpen: () => false,
      updateMaxHpFromArmor: vi.fn(),
      getHp: () => 10,
      getMaxHp: () => 10,
      setHp: vi.fn(),
      writeProgress: vi.fn(),
      exitToTitle: vi.fn(),
      setInventoryOpen: vi.fn(),
      clearTapIntent: vi.fn(),
      suppressWorldPointerForMs: vi.fn(),
      suppressExitForMs: vi.fn(),
    });

    controller.render(true);

    const slot0 = (controller as any).inventorySlotRects[0];
    const trash = (controller as any).inventoryPanel.list.find((o: any) => (o as any).invRole === "trash");

    scene.input.emit("drop", null, slot0, trash);

    expect(inventory.slots[0]).toBeNull();
    expect(saveSpy).toHaveBeenCalled();
  });
});
