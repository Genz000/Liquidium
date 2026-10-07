import { registerToolcraftRendererPipeline, type ToolcraftRendererPipelinePassContract } from "@/toolcraft/runtime";

import type { MetalField } from "./metal-field";
import { dispersionTargets, edgeTargets, IMAGE_TARGET, motionTargets, shapeTargets, surfaceTargets } from "./metal-settings";

const STAGE = {
  kind: "intrinsic",
  reason: "The shader fills exactly the canvas frame: the shape is centred in it and None fills it edge to edge, so nothing is drawn outside.",
} as const;

const canvasTargets = ["canvas.size.width", "canvas.size.height"];
const timelineTargets = ["timeline.currentTimeSeconds", "timeline.durationSeconds"];
const uniformTargets = [...shapeTargets, ...edgeTargets, ...surfaceTargets, ...dispersionTargets, ...motionTargets];
const frameInputs = [...uniformTargets, ...canvasTargets, ...timelineTargets];

export const metalPipeline = registerToolcraftRendererPipeline<{
  field: ToolcraftRendererPipelinePassContract<MetalField | null>;
  frame: ToolcraftRendererPipelinePassContract<string>;
  export: ToolcraftRendererPipelinePassContract<void>;
}>()({
  runtimeId: "liquidium-v1",
  passes: [
    {
      id: "field", kind: "preprocess", inputs: [IMAGE_TARGET], invalidatedBy: [IMAGE_TARGET], cacheKey: ["resources"],
      runsOn: "main", output: "intermediate", quality: "full", sceneBounds: STAGE,
      cost: { dimensions: ["fieldPixels"], relationship: "linear", frequency: "discrete" },
      lifecycle: { cache: "memoized", resourceScope: "source" },
    },
    {
      id: "frame", kind: "composite", inputs: frameInputs, invalidatedBy: frameInputs, cacheKey: ["frame"],
      runsOn: "main", output: "preview", quality: "full", sceneBounds: STAGE,
      cost: { dimensions: ["pixels"], relationship: "linear", frequency: "frame" },
      lifecycle: { cache: "memoized", resourceScope: "renderer" },
    },
    {
      id: "export", kind: "export", inputs: [IMAGE_TARGET, ...frameInputs, "export.image.resolution", "export.video.resolution"],
      invalidatedBy: ["export.image", "export.video"], runsOn: "export-only", output: "export", quality: "export",
      cost: { dimensions: ["resolution"], relationship: "linear", frequency: "batch" },
      lifecycle: { cache: "none", resourceScope: "call" },
    },
  ],
  interactionInvalidation: [
    { interaction: "initial-render", targets: ["canvas"], invalidates: ["field", "frame"] },
    { interaction: "media-import", targets: [IMAGE_TARGET], invalidates: ["field", "frame"], mustNotInvalidate: [] },
    { interaction: "timeline-playback", targets: ["timeline"], invalidates: ["frame"], mustNotInvalidate: ["field"] },
    { interaction: "timeline-scrub", targets: ["timeline"], invalidates: ["frame"], mustNotInvalidate: ["field"] },
    { interaction: "control-drag", targets: uniformTargets.filter((t) => t !== "shape.kind"), invalidates: ["frame"], mustNotInvalidate: ["field"] },
    { interaction: "control-change", targets: [...uniformTargets, ...canvasTargets], invalidates: ["frame"], mustNotInvalidate: ["field"] },
    {
      interaction: "control-change",
      targets: ["appearance.background", "export.includeBackground", "canvas.infinity", "canvas.workspaceBackground",
        "export.image.format", "export.image.resolution", "export.video.format", "export.video.resolution"],
      invalidates: [], mustNotInvalidate: ["field", "frame"],
    },
    { interaction: "viewport-drag", targets: ["canvas"], invalidates: [], mustNotInvalidate: ["field", "frame"] },
    // Zoom changes the supersampled backing resolution (in power-of-two steps) once the gesture ends.
    { interaction: "viewport-zoom", targets: ["canvas"], invalidates: ["frame"], mustNotInvalidate: ["field"] },
    { interaction: "export", targets: ["export.image", "export.video"], invalidates: ["export"], mustNotInvalidate: ["field", "frame"] },
  ],
});

export const fieldPass = metalPipeline.getPass("field");
export const framePass = metalPipeline.getPass("frame");
export const exportPass = metalPipeline.getPass("export");
