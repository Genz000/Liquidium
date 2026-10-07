import type { ToolcraftControlSchema } from "@/toolcraft/runtime";

import { BACKGROUND_TARGET, IMAGE_TARGET, METAL_PRESETS, metalDefaults as d } from "./metal-settings";

const always = { applicability: { mode: "always" } } as const;
const live = {
  ...always, performanceRole: "responsiveness",
  performanceReason: "Changes one shader uniform; the next frame redraws a single full-screen pass.",
} as const;
const slider = { sliderValueKind: "continuous" } as const;
// None fills the whole canvas, so position applies only to an actual shape.
const positioned = { applicability: { mode: "conditional", all: [{ target: "shape.kind", notEquals: "none" }] } } as const;

export const backgroundControls = {
  include: { ...live, type: "switch", target: "export.includeBackground", label: "Background", defaultValue: true },
  color: { ...live, type: "color", target: BACKGROUND_TARGET, label: "Background color", defaultValue: d.background },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const presetControls = {
  presets: {
    ...always, type: "actions", target: "preset.actions", label: "Look", defaultValue: null, orderRole: "action",
    performanceRole: "responsiveness",
    performanceReason: "Sets about twelve uniforms at once; the next frame is one shader pass, or one height-field build if an image is waiting.",
    description: "Applies every shape, surface, dispersion and speed value of the preset, plus its background color.",
    actions: Object.entries(METAL_PRESETS).map(([value, p]) => ({ label: p.label, value })),
  },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const shapeControls = {
  kind: {
    ...live, type: "select", target: "shape.kind", label: "Type", defaultValue: d.shape,
    description: "None fills the whole canvas. Image uses the outline of an uploaded logo or picture.",
    options: [
      { label: "None", value: "none" },
      { label: "Circle", value: "circle" },
      { label: "Daisy", value: "daisy" },
      { label: "Diamond", value: "diamond" },
      { label: "Metaballs", value: "metaballs" },
      { label: "Image", value: "image" },
    ],
  },
  image: {
    applicability: { mode: "conditional", all: [{ target: "shape.kind", equals: "image" }] },
    type: "fileDrop", target: IMAGE_TARGET, label: "Image", assetKind: "file", multiple: false,
    accept: ".svg,.png,.webp,.jpg,.jpeg,image/svg+xml,image/png,image/webp,image/jpeg", defaultValue: [],
    description: "SVG or PNG with transparency works best: the transparent area stays empty and edges get the metal rim.",
    performanceRole: "workload",
    performanceReason: "A new image is rasterised once and turned into a height field; frames reuse the texture.",
  },
  scale: {
    ...live, ...slider, type: "slider", target: "shape.scale", label: "Scale", defaultValue: d.scale,
    min: 0.1, max: 2, step: 0.01, editableRange: { hardMin: 0.01 },
    description: "Size of the shape relative to the shorter canvas edge.",
  },
  x: {
    ...live, ...positioned, ...slider, type: "slider", target: "shape.x", label: "X", defaultValue: d.x,
    min: -50, max: 50, step: 0.5, unit: "%", editableRange: { hardMin: -100, hardMax: 100 },
    description: "Horizontal position of the shape, as a percentage of the canvas width. 0 is centred; the reflection stays in place.",
  },
  y: {
    ...live, ...positioned, ...slider, type: "slider", target: "shape.y", label: "Y", defaultValue: d.y,
    min: -50, max: 50, step: 0.5, unit: "%", editableRange: { hardMin: -100, hardMax: 100 },
    description: "Vertical position of the shape, as a percentage of the canvas height; positive moves it up.",
  },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const surfaceControls = {
  repetition: {
    ...live, ...slider, type: "slider", target: "metal.repetition", label: "Repetition", defaultValue: d.repetition,
    min: 1, max: 10, step: 0.1, editableRange: { hardMin: 0.1 },
    description: "Number of reflection bands across the shape.",
  },
  softness: {
    ...live, ...slider, type: "slider", target: "metal.softness", label: "Softness", defaultValue: d.softness,
    min: 0, max: 1, step: 0.01, editableRange: { hardMin: 0, hardMax: 1 },
    description: "Blur between the dark and bright bands.",
  },
  distortion: {
    ...live, ...slider, type: "slider", target: "metal.distortion", label: "Distortion", defaultValue: d.distortion,
    min: 0, max: 1, step: 0.01, editableRange: { hardMin: 0 },
    description: "Liquid noise that warps the bands.",
  },
  angle: {
    ...live, ...slider, type: "slider", target: "metal.angle", label: "Angle", defaultValue: d.angle,
    min: 0, max: 360, step: 1, unit: "°", editableRange: {},
    description: "Direction the bands run in.",
  },
  tint: { ...live, type: "color", target: "metal.tint", label: "Tint", defaultValue: d.tint },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const dispersionControls = {
  shiftRed: {
    ...live, ...slider, type: "slider", target: "metal.shiftRed", label: "Red shift", defaultValue: d.shiftRed,
    min: -1, max: 1, step: 0.01, editableRange: {},
    description: "Offsets the red channel of the bands; strongest near the edge.",
  },
  shiftBlue: {
    ...live, ...slider, type: "slider", target: "metal.shiftBlue", label: "Blue shift", defaultValue: d.shiftBlue,
    min: -1, max: 1, step: 0.01, editableRange: {},
    description: "Offsets the blue channel of the bands; strongest near the edge.",
  },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const edgeControls = {
  bevel: {
    ...live, ...slider, type: "slider", target: "edge.bevel", label: "Bevel", defaultValue: d.bevel,
    min: 0, max: 0.15, step: 0.001, editableRange: { hardMin: 0 },
    description: "Width of the rounded, polished lip along the outline, as a share of the shape size. 0 keeps a flat cut edge.",
  },
  highlight: {
    ...live, ...slider, type: "slider", target: "edge.highlight", label: "Highlight", defaultValue: d.highlight,
    min: 0, max: 1, step: 0.01, editableRange: { hardMin: 0 },
    description: "Strength of the light glint and edge shading on the bevel.",
  },
  edgeSoftness: {
    ...live, ...slider, type: "slider", target: "edge.softness", label: "Softness", defaultValue: d.edgeSoftness,
    min: 0, max: 0.1, step: 0.001, editableRange: { hardMin: 0, hardMax: 0.12 },
    description: "Feathers the outline into the background, as a share of the shape size. 0 is a crisp cut.",
  },
} as const satisfies Record<string, ToolcraftControlSchema>;

export const motionControls = {
  speed: {
    ...live, ...slider, type: "slider", target: "motion.speed", label: "Speed", defaultValue: d.speed,
    min: 0, max: 4, step: 0.05, editableRange: { hardMin: 0 },
    description: "Flow speed. The timeline loop length follows it (8 s at speed 1); 0 stops the flow.",
  },
} as const satisfies Record<string, ToolcraftControlSchema>;
