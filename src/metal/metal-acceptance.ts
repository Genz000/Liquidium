import type { ToolcraftComponentAcceptance } from "../app/acceptance/types";
import { appSchema } from "../app/app-schema";

import { dispersionControls, edgeControls, motionControls, presetControls, shapeControls, surfaceControls } from "./metal-controls";
import { IMAGE_TARGET } from "./metal-settings";

type Budget = "standard" | "extended-io";
type Row = ToolcraftComponentAcceptance;

const browser = (file: string, testName: string, budget: Budget = "standard") =>
  ({ file: `e2e/${file}.spec.ts` as `e2e/${string}.spec.ts`, testName, budget });

const optionsOf = (control: { options?: readonly { value: string }[] }) => control.options?.map((o) => o.value);

const { image: _image, ...shapeValueControls } = shapeControls;
const productControls = { ...shapeValueControls, ...edgeControls, ...surfaceControls, ...dispersionControls, ...motionControls };

const controlRows: Row[] = Object.values(productControls).map((control) => {
  const options = "options" in control ? optionsOf(control) : undefined;
  const target = control.target;
  return {
    id: target, target, kind: "control", componentType: control.type, interactionId: `${target}-property`,
    automated: true, automatedTestName: `metal parameter ${target}`,
    browser: browser("product-metal-controls", `browser: metal parameter ${target}`),
    evidence: "product-output",
    fixture: "Default preset, playback paused at a fixed time so the shader output is deterministic.",
    userAction: `Change ${control.label} through the real control.`,
    expectedObservable: "The liquid-metal canvas pixels change according to the setting.",
    ...(options ? { optionCoverage: options } : {}),
  } satisfies Row;
});

const exportSettingRow = (target: string, options: readonly string[], kind: "image" | "video" = "image"): Row => ({
  id: target, target, kind: "control", componentType: "select",
  automated: true, automatedTestName: `metal contract ${target}`,
  browser: kind === "image"
    ? browser("product-metal-export", "browser: metal image export delivers all formats and sizes", "extended-io")
    : browser("product-metal-video", "browser: metal video export delivers formats and sizes", "extended-io"),
  evidence: "exported-bytes", optionCoverage: options,
  fixture: "Default preset.", userAction: `Select each ${target} option and export.`,
  expectedObservable: "The downloaded file has the selected format and dimensions.",
});

const runtimeRow = (id: string, target: string, evidence: Row["evidence"], file: string, testName: string, extra: Partial<Row>, budget: Budget = "standard"): Row => ({
  id, target, kind: "runtime", componentType: id, automated: true, automatedTestName: `metal contract ${id}`,
  browser: browser(file, testName, budget), evidence,
  fixture: "Default preset and real Toolcraft controls.",
  userAction: `Exercise ${id} through the visible UI.`,
  expectedObservable: `The liquid-metal output and runtime workspace implement ${id}.`,
  ...extra,
});

export const metalAcceptance: readonly Row[] = [
  {
    id: "preset.actions", target: "preset.actions", kind: "control", componentType: "actions", interactionId: "presets-command",
    automated: true, automatedTestName: "metal contract preset.actions",
    browser: browser("product-metal-presets", "browser: metal presets apply every value"),
    evidence: "product-output", actionCoverage: presetControls.presets.actions.map((a) => a.value),
    fixture: "Default state.", userAction: "Press Default, Noir, Backdrop and Stripes.",
    expectedObservable: "Each preset sets its shape, surface, dispersion, speed and background values and the canvas changes.",
  },
  {
    id: IMAGE_TARGET, target: IMAGE_TARGET, kind: "control", componentType: "fileDrop", interactionId: "shape.image-collection",
    automated: true, automatedTestName: "metal contract shape.image",
    browser: browser("product-metal-image", "browser: metal image upload, clear and reset", "extended-io"),
    evidence: "media-lifecycle", mediaLifecycleCoverage: ["upload", "remove", "reset"],
    fixture: "Shape set to Image and an SVG logo with transparency.",
    userAction: "Upload an SVG, then remove it and use section Reset.",
    expectedObservable: "The logo outline renders as metal after upload and disappears after removal.",
  },
  ...controlRows,
  {
    ...controlRows[0], id: "appearance.background", target: "appearance.background", componentType: "color", interactionId: undefined,
    automatedTestName: "metal contract appearance.background",
    browser: browser("product-metal-background", "browser: metal background color changes output"),
    userAction: "Change Background color.", optionCoverage: undefined,
  },
  runtimeRow("background.output", "export.includeBackground", "product-output", "product-metal-background",
    "browser: metal background output follows runtime semantics",
    { kind: "control", componentType: "switch", backgroundOutputCoverage: "all-required-background-output" }),
  exportSettingRow("export.image.format", ["png", "jpg"]),
  exportSettingRow("export.image.resolution", ["2k", "4k", "8k"]),
  exportSettingRow("export.video.format", ["mp4", "webm"], "video"),
  exportSettingRow("export.video.resolution", ["current", "4k"], "video"),
  runtimeRow("export.video", "actions.output", "exported-bytes", "product-metal-video",
    "browser: metal video export delivers formats and sizes",
    { componentType: "panelActions", actionCoverage: ["export.video"], exportArtifactCoverage: "all-required-video-export-behavior", infinityCanvasCoverage: "scene-bounds-video-export" }, "extended-io"),
  runtimeRow("export.image", "actions.output", "exported-bytes", "product-metal-export",
    "browser: metal image export delivers all formats and sizes",
    { componentType: "panelActions", actionCoverage: ["export.png"], exportArtifactCoverage: "all-required-image-export-behavior", infinityCanvasCoverage: "scene-bounds-image-export" }, "extended-io"),
  runtimeRow("export.actions", "actions.output", "exported-bytes", "product-metal-export",
    "browser: metal footer exports PNG and video",
    { kind: "control", componentType: "panelActions", actionCoverage: ["export.png", "export.video"], exportArtifactCoverage: ["all-required-image-export-behavior", "all-required-video-export-behavior"] }, "extended-io"),
  runtimeRow("timeline.playback", "timeline", "timeline-output", "product-metal-timeline",
    "browser: metal timeline plays, scrubs, follows speed and loops",
    {
      timelineCoverage: "playback", timelinePlaybackCoverage: "all-playback-behavior",
      timelineLoopProof: { direction: "forward-only", reversePlayback: "forbidden", seam: "first-last-match", durationChange: "reproved-after-edit" },
    }),
  runtimeRow("canvas.size", "canvas.size.width", "product-output", "product-metal-workspace",
    "browser: metal canvas sizing changes output", {}),
  runtimeRow("canvas.infinity", "canvas.infinity", "viewport-side-effect", "product-metal-workspace",
    "browser: metal infinity preserves scene and viewport", { infinityCanvasCoverage: "mode-continuity-and-restoration" }),
  runtimeRow("persistence.reload", "canvas.size.width", "persistence-state", "product-metal-persistence",
    "browser: metal restores values and workspace after reload",
    { persistenceCoverage: "reload", persistenceSlices: appSchema.persistence.storage === "localStorage" ? appSchema.persistence.include : [] }, "extended-io"),
];
