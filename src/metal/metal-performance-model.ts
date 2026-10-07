import type { ToolcraftEnvelopePerformanceConfig, ToolcraftPerformanceFixtureAdapter } from "@/toolcraft/runtime";

import { FIELD_SIZE } from "./metal-field";
import { metalPipeline } from "./metal-pipeline";

const numeric = (dimensionId: string): ToolcraftPerformanceFixtureAdapter => ({ dimensionId, apply: (value) => value, observe: (value) => Number(value) });
const resolutionValues: Record<string, number> = { "2k": 2048, "4k": 4096, "8k": 8192 };

export const metalPerformanceModel = {
  usesCustomRenderer: true,
  rendererStrategy: "webgl",
  rendererPipeline: metalPipeline,
  scenarios: [],
  rendererTechnique: {
    sourceRepresentation: "procedural-data",
    productRepresentation: "pixel",
    previewRenderer: "webgl",
    exportRenderer: "webgl",
    rendererStrategy: "webgl",
    gpu: {
      preview: { backend: "webgl", provider: "native", exception: { kind: "browser-compatibility", evidence: "WebGL2 runs in every current desktop browser, including those without WebGPU; one full-screen fragment pass needs no compute or storage." } },
      export: { backend: "webgl", provider: "native", exception: { kind: "browser-compatibility", evidence: "Export reuses the same WebGL2 program on an OffscreenCanvas so stills match the preview." } },
    },
    whyNotAlternativeStrategies: [
      "Canvas 2D cannot evaluate per-pixel noise, dome shading and three-channel bands at interactive rates.",
      "WebGPU would exclude browsers without it for a single stateless fragment pass.",
    ],
    fidelityRisks: [
      "Image shapes use a 512 px height field, so very fine logo detail is softened at large scales.",
    ],
    performanceRisks: [
      "Cost is one fragment pass per backing pixel per frame; the image height field is computed once per upload.",
    ],
    layers: [
      { id: "metal", kind: "product-foreground", content: ["shader", "noise"], renderer: "webgl", primitiveCount: "low", exportMode: "included", uiSelector: '[data-testid="metal-output"]' },
    ],
  },
  workloadEnvelope: {
    dimensions: [
      { id: "fieldPixels", unit: "height-field pixels", source: { kind: "schema-target", target: "shape.image" }, mapping: "area", defaultValue: FIELD_SIZE * FIELD_SIZE, interactiveMax: FIELD_SIZE * FIELD_SIZE, batchMax: FIELD_SIZE * FIELD_SIZE },
      { id: "pixels", unit: "backing pixels", source: { kind: "external-input", id: "canvas-backing" }, mapping: "area", defaultValue: 2400 * 1800, interactiveMax: 2400 * 1800, batchMax: 2400 * 1800 },
      { id: "resolution", unit: "long-edge pixels", source: { kind: "schema-target", target: "export.image.resolution" }, mapping: "area", defaultValue: 4096, batchMax: 8192 },
    ],
  },
  fixtureAdapters: {
    dimensions: {
      fieldPixels: numeric("fieldPixels"),
      pixels: numeric("pixels"),
      resolution: {
        dimensionId: "resolution", kind: "exhaustive-discrete",
        domain: { kind: "schema-options", target: "export.image.resolution", optionValues: ["2k", "4k", "8k"] },
        entries: Object.entries(resolutionValues).map(([appliedValue, value]) => ({ appliedValue, value })),
        apply: (value) => Object.keys(resolutionValues).find((key) => resolutionValues[key] === value)!,
        observe: (value) => resolutionValues[String(value)]!,
      },
    },
  },
} as const satisfies ToolcraftEnvelopePerformanceConfig;
