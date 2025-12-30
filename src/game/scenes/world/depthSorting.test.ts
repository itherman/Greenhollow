import { describe, expect, it, vi } from "vitest";
import { depthSortByY, depthSortManyByFeet, depthSortManyByY } from "./depthSorting";

describe("depthSorting helpers", () => {
  it("depthSortByY does nothing for null/undefined", () => {
    expect(() => depthSortByY(undefined)).not.toThrow();
    expect(() => depthSortByY(null)).not.toThrow();
  });

  it("depthSortByY sets depth to y", () => {
    const obj = { y: 123, setDepth: vi.fn() };
    depthSortByY(obj);
    expect(obj.setDepth).toHaveBeenCalledWith(123);
  });

  it("depthSortManyByY sorts all objects by y", () => {
    const a = { y: 1, setDepth: vi.fn() };
    const b = { y: 9, setDepth: vi.fn() };
    depthSortManyByY([a, undefined, b]);
    expect(a.setDepth).toHaveBeenCalledWith(1);
    expect(b.setDepth).toHaveBeenCalledWith(9);
  });

  it("depthSortManyByFeet uses getFeetDepth return value", () => {
    const a = { y: 10, body: { bottom: 99 }, setDepth: vi.fn() };
    const b = { y: 20, setDepth: vi.fn() };
    const getFeetDepth = (s: { y: number; body?: { bottom: number } }) => s.body?.bottom ?? s.y;

    depthSortManyByFeet([a, null, b], getFeetDepth);
    expect(a.setDepth).toHaveBeenCalledWith(99);
    expect(b.setDepth).toHaveBeenCalledWith(20);
  });
});

