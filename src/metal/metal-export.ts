import type { ToolcraftProductExportRenderer } from "@/toolcraft/runtime";

import { cachedField, imageSource } from "./metal-field";
import { MetalRenderer } from "./metal-gl";
import { exportPass } from "./metal-pipeline";
import { loopSecondsForSpeed, readMetalSettings } from "./metal-settings";

let exportRenderer: MetalRenderer | null = null;
/** Largest edge the export supersampling pass renders before averaging down. */
const MAX_SUPERSAMPLED_EDGE = 8192;

/** Renders the same shader at export resolution and paints it into the runtime's 2D frame. */
export const metalExport: ToolcraftProductExportRenderer = {
  baseFileName: "liquidium",
  async renderFrame({ context, frame, pixelRatio, state, rendererPipeline, signal, timelineProgress }) {
    const render = () => {
      signal.throwIfAborted();
      const settings = readMetalSettings(state.values);
      const field = settings.shape === "image" ? cachedField(imageSource(state.mediaAssets)) : null;
      if (settings.shape === "image" && imageSource(state.mediaAssets) && !field) {
        throw new Error("The image is still being prepared. Try the export again in a moment.");
      }
      exportRenderer ??= new MetalRenderer(new OffscreenCanvas(1, 1), true);
      exportRenderer.setField(field);
      const phase = loopSecondsForSpeed(settings.speed) === null ? 0 : timelineProgress;
      // Render at up to 2x the output size and let the 2D context average it down,
      // so outlines and the bevel come out anti-aliased like the preview.
      const outW = frame.width * pixelRatio;
      const outH = frame.height * pixelRatio;
      const ss = Math.max(1, Math.min(2, MAX_SUPERSAMPLED_EDGE / Math.max(outW, outH)));
      exportRenderer.render(settings, phase, outW * ss, outH * ss);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(exportRenderer.surface, frame.x, frame.y, frame.width, frame.height);
      signal.throwIfAborted();
    };
    if (rendererPipeline) await rendererPipeline.runPass(exportPass, undefined, render);
    else render();
  },
};
