import type {
  ToolcraftControlSectionInventoryEntry, ToolcraftProductReadiness, ToolcraftTransferMode,
} from "../app/acceptance/types";

import { BASE_LOOP_SECONDS, dispersionTargets, edgeTargets, IMAGE_TARGET, motionTargets, shapeTargets, surfaceTargets } from "./metal-settings";

/** The user's request in this session, verbatim. */
export const ORIGINAL_REQUEST_TEXT =
  "i want you to do me a web app that does same effect as this https://app.paper.design/playground/liquid-metal\nuse crafttool to build it  this liquid metal";

/** The user's video-export request in this session, verbatim. */
export const VIDEO_REQUEST_TEXT =
  "I want to have export options like we did in the Morphium app. And here I mean the video export. with the same features of the video export that we have in Morphium.";
const SESSION_REF = "C:/Users/pc/.claude/projects/C--Users-pc-Desktop-Claudio/974fc983-33d8-42cb-8da9-cc0c0a4b5e2f.jsonl";

export const metalTransferMode: ToolcraftTransferMode = {
  mode: "new-toolcraft-app",
  referenceInputs: [],
  animationIntent: {
    mode: "timeline-playback",
    loopDuration: {
      seconds: BASE_LOOP_SECONDS, source: "product-derived",
      evidence: "One loop moves the bands exactly one period and closes the noise and shape cycles; Speed divides the 8 s base length.",
    },
  },
};

export const metalSectionInventory = [
  {
    id: "runtime.setup", title: "Settings", entityId: "background", entity: "Output background",
    targets: ["export.includeBackground", "appearance.background"],
    groupingReason: "One output background; runtime relocates this source pair into Settings.",
    finiteSelectors: [{ target: "export.includeBackground", role: "parameter", reason: "Controls background visibility and PNG alpha; the colour stays editable in both states." }],
  },
  {
    id: "presets", title: "Presets", entityId: "presets", entity: "Look presets", targets: ["preset.actions"],
    groupingReason: "The reference playground's four looks; each applies shape, surface, dispersion, speed and background together.",
    finiteSelectors: [],
  },
  {
    id: "shape", title: "Shape", entityId: "shape", entity: "Metal shape", targets: [...shapeTargets, IMAGE_TARGET],
    groupingReason: "What is cast in metal and how large it is: a built-in shape or an uploaded image outline.",
    finiteSelectors: [{ target: "shape.kind", role: "branch", affectedTargets: ["shape.scale"], reason: "Image reveals the uploader; every shape changes the outline Scale sizes." }],
  },
  {
    id: "edge", title: "Edge", entityId: "edge", entity: "Edge bevel", targets: [...edgeTargets],
    groupingReason: "The rounded polished lip along the outline and the light glint on it.",
    finiteSelectors: [],
  },
  {
    id: "surface", title: "Surface", entityId: "surface", entity: "Metal reflections", targets: [...surfaceTargets],
    groupingReason: "The reflection bands: how many, how soft, how they bend and warp, their direction and colour.",
    finiteSelectors: [],
  },
  {
    id: "dispersion", title: "Dispersion", entityId: "dispersion", entity: "Colour fringes", targets: [...dispersionTargets],
    groupingReason: "The red and blue channel offsets that form the rainbow fringe on band edges.",
    finiteSelectors: [],
  },
  {
    id: "motion", title: "Motion", entityId: "motion", entity: "Flow", targets: [...motionTargets],
    groupingReason: "Flow speed; the timeline owns transport and its loop length follows speed.",
    finiteSelectors: [],
  },
  {
    id: "runtime.image-export", title: "Image Export", entityId: "image-export", entity: "Raster image output",
    targets: ["export.image.format", "export.image.resolution"], groupingReason: "Runtime-owned image format and resolution govern one exported artifact.",
    finiteSelectors: [
      { target: "export.image.format", role: "parameter", reason: "Selects PNG alpha support or opaque JPEG encoding." },
      { target: "export.image.resolution", role: "parameter", reason: "Selects the output long-edge pixel size." },
    ],
  },
  {
    id: "runtime.video-export", title: "Video Export", entityId: "video-export", entity: "Video output",
    targets: ["export.video.format", "export.video.resolution"], groupingReason: "Runtime-owned container and size for one exported video.",
    finiteSelectors: [
      { target: "export.video.format", role: "parameter", reason: "Selects MP4 or WebM container." },
      { target: "export.video.resolution", role: "parameter", reason: "Selects canvas size or 4K output." },
    ],
  },
] as const satisfies readonly ToolcraftControlSectionInventoryEntry[];

const panelProperty = (target: string) => ({
  id: `${target}-property`, target, capability: "property-edit" as const, surface: "panel" as const,
  selectionScope: { mode: "global" as const },
  evidence: { source: "reference" as const, detail: "The Paper playground edits every liquid-metal parameter in its right-hand panel." },
  reason: "A global shader parameter of the whole output with no selected entity.",
  alternative: { surface: "canvas" as const, reason: "Canvas handles would cover the effect being judged and have no spatial meaning for these values." },
});

export const metalReadiness: ToolcraftProductReadiness = {
  mode: "product",
  productName: "Liquidium",
  productSummary: "Animated liquid-metal shader: built-in shapes or an uploaded logo rendered as flowing chrome with chromatic fringes.",
  requestedBehavior: ORIGINAL_REQUEST_TEXT,
  exportIntent: {
    image: { mode: "toolcraft-default" },
    svg: { mode: "not-requested" },
    video: {
      mode: "user-requested",
      evidence: { source: "user-message", messageRef: SESSION_REF, messageText: VIDEO_REQUEST_TEXT, quote: "And here I mean the video export." },
    },
  },
  viewInteraction: { mode: "non-spatial", reason: "The output is a flat full-frame shader image; the dome is shading only, with no camera or 3D scene." },
  interactionOwnership: [
    {
      id: "presets-command", target: "preset.actions", capability: "command", surface: "panel",
      evidence: { source: "reference", detail: "The playground lists its presets as panel buttons." },
      reason: "Applying a preset is a one-shot command over many parameters.",
      alternative: { surface: "canvas", reason: "Preset buttons on the canvas would cover the output." },
    },
    {
      id: "shape.image-collection", target: IMAGE_TARGET, capability: "collection-edit", surface: "panel",
      evidence: { source: "reference", detail: "The playground's Choose file button sits in the panel's Shape row." },
      reason: "Uploading and removing the source image is file management, not spatial editing.",
      alternative: { surface: "canvas", reason: "Upload chrome on the canvas would cover the effect." },
    },
    ...[...shapeTargets, ...edgeTargets, ...surfaceTargets, ...dispersionTargets, ...motionTargets].map(panelProperty),
  ],
};
