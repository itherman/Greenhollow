import { beforeEach, describe, expect, it, vi } from "vitest";
import { InventoryPanelController, type InventoryPanelHost } from "./inventoryPanelController";
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
    setInteractive: () => obj,
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
});
