export const IMAGE_TARGET = "shape.image";
export const BACKGROUND_TARGET = "appearance.background";

export type ShapeKind = "none" | "circle" | "daisy" | "diamond" | "metaballs" | "image";

export const SHAPE_CODES: Record<ShapeKind, number> = {
  none: 0, circle: 1, daisy: 2, diamond: 3, metaballs: 4, image: 5,
};

/** Seconds per loop at speed 1. Speed divides this, so playback stays one seamless loop. */
export const BASE_LOOP_SECONDS = 8;

export type MetalSettings = {
  shape: ShapeKind;
  scale: number;
  x: number;
  y: number;
  repetition: number;
  softness: number;
  distortion: number;
  angle: number;
  shiftRed: number;
  shiftBlue: number;
  bevel: number;
  highlight: number;
  edgeSoftness: number;
  tint: string;
  speed: number;
};

/** Paper's "Default" preset, used as the reset state. */
export const metalDefaults: MetalSettings & { background: string } = {
  shape: "diamond",
  scale: 0.6,
  x: 0,
  y: 0,
  repetition: 2,
  softness: 0.1,
  distortion: 0.07,
  angle: 70,
  shiftRed: 0.3,
  shiftBlue: 0.3,
  bevel: 0.04,
  highlight: 0.7,
  edgeSoftness: 0,
  tint: "#FFFFFF",
  speed: 1,
  background: "#AAAAAC",
};

export const shapeTargets = ["shape.kind", "shape.scale", "shape.x", "shape.y"] as const;
export const surfaceTargets = [
  "metal.repetition", "metal.softness", "metal.distortion", "metal.angle", "metal.tint",
] as const;
export const dispersionTargets = ["metal.shiftRed", "metal.shiftBlue"] as const;
export const edgeTargets = ["edge.bevel", "edge.highlight", "edge.softness"] as const;
export const motionTargets = ["motion.speed"] as const;

type PresetValues = Record<string, string | number>;

const preset = (s: Omit<MetalSettings, "speed" | "x" | "y">, background: string): PresetValues => ({
  "shape.kind": s.shape,
  "shape.scale": s.scale,
  "shape.x": 0,
  "shape.y": 0,
  "metal.repetition": s.repetition,
  "metal.softness": s.softness,
  "metal.distortion": s.distortion,
  "metal.angle": s.angle,
  "metal.shiftRed": s.shiftRed,
  "metal.shiftBlue": s.shiftBlue,
  "edge.bevel": s.bevel,
  "edge.highlight": s.highlight,
  "edge.softness": s.edgeSoftness,
  "metal.tint": s.tint,
  "motion.speed": 1,
  [BACKGROUND_TARGET]: background,
});

/** The four presets of the reference playground, values read from its panel. */
export const METAL_PRESETS: Record<string, { label: string; values: PresetValues }> = {
  "preset.default": { label: "Default", values: preset(metalDefaults, metalDefaults.background) },
  "preset.noir": {
    label: "Noir",
    values: preset({
      shape: "diamond", scale: 0.6, repetition: 1.5, softness: 0.45, distortion: 0,
      angle: 90, shiftRed: 0, shiftBlue: 0, bevel: 0.04, highlight: 0.7, edgeSoftness: 0, tint: "#606060",
    }, "#000000"),
  },
  "preset.backdrop": {
    label: "Backdrop",
    values: preset({
      shape: "none", scale: 1, repetition: 1.5, softness: 0.05, distortion: 0.1,
      angle: 90, shiftRed: 0.3, shiftBlue: 0.3, bevel: 0, highlight: 0, edgeSoftness: 0, tint: "#FFFFFF",
    }, "#AAAAAC"),
  },
  "preset.stripes": {
    label: "Stripes",
    values: preset({
      shape: "circle", scale: 0.6, repetition: 6, softness: 0.8, distortion: 0.4,
      angle: 0, shiftRed: 1, shiftBlue: -1, bevel: 0.03, highlight: 0.6, edgeSoftness: 0, tint: "#2C5D72",
    }, "#000000"),
  },
};

export function readMetalSettings(values: Readonly<Record<string, unknown>>): MetalSettings {
  const d = metalDefaults;
  const n = (target: string, fallback: number) => {
    const v = values[target];
    return typeof v === "number" && Number.isFinite(v) ? v : fallback;
  };
  const kind = values["shape.kind"];
  return {
    shape: typeof kind === "string" && kind in SHAPE_CODES ? (kind as ShapeKind) : d.shape,
    scale: n("shape.scale", d.scale),
    x: n("shape.x", d.x),
    y: n("shape.y", d.y),
    repetition: n("metal.repetition", d.repetition),
    softness: n("metal.softness", d.softness),
    distortion: n("metal.distortion", d.distortion),
    angle: n("metal.angle", d.angle),
    shiftRed: n("metal.shiftRed", d.shiftRed),
    shiftBlue: n("metal.shiftBlue", d.shiftBlue),
    bevel: n("edge.bevel", d.bevel),
    highlight: n("edge.highlight", d.highlight),
    edgeSoftness: n("edge.softness", d.edgeSoftness),
    tint: typeof values["metal.tint"] === "string" ? (values["metal.tint"] as string) : d.tint,
    speed: n("motion.speed", d.speed),
  };
}

/** Largest backing edge the preview allocates (GPU memory and fill cost). */
export const MAX_BACKING_EDGE = 4096;

/**
 * Preview pixels per scene pixel: exactly twice the on-screen density (zoom x
 * devicePixelRatio), because the browser's bilinear downscale averages a clean 2x2
 * block only at a 2:1 ratio. Capped so the longest edge stays within MAX_BACKING_EDGE.
 */
export function backingScale(width: number, height: number, zoom: number, dpr: number): number {
  const wanted = 2 * Math.max(zoom, 0.01) * Math.max(dpr, 1);
  const cap = MAX_BACKING_EDGE / Math.max(width, height, 1);
  return Math.max(0.05, Math.min(wanted, cap));
}

export const loopSecondsForSpeed = (speed: number) => (speed > 0 ? Math.min(60, Math.max(1, BASE_LOOP_SECONDS / speed)) : null);
