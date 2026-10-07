import { describe, expect, it } from "vitest";

import { appAcceptance, validateProductAcceptanceCoverage } from "./app-acceptance";
import { appPerformance } from "./app-performance";
import { appSchema } from "./app-schema";

describe("appSchema", () => {
  it("assembles the Liquidium product on the Toolcraft runtime", () => {
    expect(appSchema.canvas.enabled).toBe(true);
    expect(appSchema.canvas.sizing).toMatchObject({ mode: "editable-output" });
    expect(appSchema.toolbar).toEqual({ history: true, radar: true, theme: true, zoom: true });
    expect(appSchema.panels.layers).toBeUndefined();
    expect(appSchema.modulePlan.modules.map(({ id }) => id)).toEqual(
      expect.arrayContaining(["media-source", "timeline", "image-export", "video-export"]),
    );
    expect(appSchema.assembly.capabilities).toContain("timeline.playback");
    expect(appSchema.assembly.capabilities).not.toContain("timeline.keyframes");
  });

  it("orders product sections after runtime Settings", () => {
    const productSections = appSchema.panels.controls?.sections
      .map((section) => section.id)
      .filter((id) => !id.startsWith("runtime."));
    expect(productSections).toEqual(["presets", "shape", "edge", "surface", "dispersion", "motion"]);
  });

  it("derives performance scenarios from the renderer pipeline", () => {
    expect(appPerformance.scenarios.length).toBeGreaterThan(0);
    expect(appPerformance.workloadEnvelope.dimensions.map((d) => d.id)).toEqual(["fieldPixels", "pixels", "resolution"]);
  });

  it("declares production reload coverage", () => {
    expect(appSchema.persistence.storage).toBe("localStorage");
    if (appSchema.persistence.storage !== "localStorage") throw new Error("Liquidium persists settings in localStorage.");
    expect(appSchema.persistence.include).toContain("canvas");
    expect(appAcceptance.find((entry) => entry.id === "persistence.reload")).toMatchObject({
      evidence: "persistence-state",
      persistenceCoverage: "reload",
      persistenceSlices: appSchema.persistence.include,
    });
    expect(validateProductAcceptanceCoverage()).toEqual([]);
  });
});
