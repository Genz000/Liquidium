import { describe, expect, it } from "vitest";

import { dispersionControls, edgeControls, motionControls, shapeControls, surfaceControls } from "./metal-controls";
import { buildField, insideDistance } from "./metal-heightfield";
import { backingScale, loopSecondsForSpeed, METAL_PRESETS, metalDefaults, readMetalSettings } from "./metal-settings";

describe("liquid metal settings", () => {
  it("reads defaults when values are missing or invalid", () => {
    expect(readMetalSettings({})).toMatchObject({ shape: "diamond", repetition: 2, tint: "#FFFFFF" });
    expect(readMetalSettings({ "shape.kind": "hexagon", "metal.repetition": Number.NaN }).shape).toBe("diamond");
  });

  it("presets cover every product control and the background", () => {
    const targets = [shapeControls.kind, shapeControls.scale, shapeControls.x, shapeControls.y, ...Object.values(edgeControls), ...Object.values(surfaceControls),
      ...Object.values(dispersionControls), ...Object.values(motionControls)].map((c) => c.target);
    for (const preset of Object.values(METAL_PRESETS)) {
      expect(Object.keys(preset.values).sort()).toEqual([...targets, "appearance.background"].sort());
    }
    expect(METAL_PRESETS["preset.stripes"].values).toMatchObject({ "shape.kind": "circle", "metal.repetition": 6, "metal.shiftBlue": -1 });
  });

  it("the Default preset equals the reset defaults", () => {
    const defaults = METAL_PRESETS["preset.default"].values;
    expect(defaults["metal.angle"]).toBe(metalDefaults.angle);
    expect(defaults["appearance.background"]).toBe(metalDefaults.background);
  });

  it("speed sets one seamless loop length within the timeline's 1–60 s range", () => {
    expect(loopSecondsForSpeed(1)).toBe(8);
    expect(loopSecondsForSpeed(2)).toBe(4);
    expect(loopSecondsForSpeed(0.05)).toBe(60);
    expect(loopSecondsForSpeed(100)).toBe(1);
    expect(loopSecondsForSpeed(0)).toBeNull();
  });
});

describe("image height field", () => {
  it("measures exact distance to the nearest outside pixel", () => {
    const size = 9;
    const inside = new Uint8Array(size * size);
    for (let y = 1; y < 8; y++) for (let x = 1; x < 8; x++) inside[y * size + x] = 1;
    const dist = insideDistance(inside, size);
    expect(dist[0]).toBe(0);
    expect(dist[1 * size + 1]).toBe(1);
    expect(dist[4 * size + 4]).toBe(4);
  });

  it("encodes coverage in R and a dome that peaks inside the shape in G", () => {
    const size = 32;
    const alpha = new Uint8ClampedArray(size * size);
    for (let y = 4; y < 28; y++) for (let x = 4; x < 28; x++) alpha[y * size + x] = 255;
    const field = buildField(alpha, size, "square");
    const g = (x: number, y: number) => field.data[(y * size + x) * 4 + 1];
    expect(field.data[(16 * size + 16) * 4]).toBe(1);
    expect(field.data[0]).toBe(0);
    expect(g(16, 16)).toBeGreaterThan(g(5, 16));
    expect(g(5, 16)).toBeGreaterThan(g(1, 16));
  });
});

describe("preview supersampling", () => {
  it("renders at twice the on-screen density", () => {
    expect(backingScale(1200, 900, 1, 1)).toBe(2);
    expect(backingScale(1080, 1920, 0.25, 1)).toBe(0.5);
    expect(backingScale(1200, 900, 0.5, 2)).toBe(2);
  });
  it("caps the backing at 4096 px on the longest edge", () => {
    expect(backingScale(1080, 1920, 2, 2) * 1920).toBeCloseTo(4096);
  });
});

describe("image distance field", () => {
  it("stores the signed outline distance in B with sub-texel coverage", () => {
    const size = 16;
    const alpha = new Uint8ClampedArray(size * size);
    for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) alpha[y * size + x] = 255;
    alpha[8 * size + 3] = 128;
    const field = buildField(alpha, size, "sd");
    const b = (x: number, y: number) => field.data[(y * size + x) * 4 + 2];
    expect(b(8, 8)).toBeLessThan(-3);
    expect(b(4, 5)).toBe(-0.5);
    expect(b(1, 5)).toBe(2.5);
    expect(Math.abs(b(3, 8))).toBeLessThan(0.1);
  });
});
