import { getToolcraftFiniteArtboardRect } from "@/toolcraft/runtime";
import { composeToolcraftApp } from "@/toolcraft/runtime/react";

import { MetalCanvas } from "../metal/MetalCanvas";
import { metalExport } from "../metal/metal-export";
import { metalPipeline } from "../metal/metal-pipeline";
import { METAL_PRESETS } from "../metal/metal-settings";
import { appSchema } from "./app-schema";

export const appComposition = composeToolcraftApp(appSchema, {
  scene: {
    canvasContent: <MetalCanvas />,
    renderDefaultCanvasMedia: false,
    sceneBoundsProvider: ({ state }) => [getToolcraftFiniteArtboardRect(state.canvas.size)],
    rasterFrameRenderer: metalExport,
  },
  actions: {
    onPanelAction: ({ action, dispatch }) => {
      const preset = METAL_PRESETS[action.value];
      if (preset) dispatch({ type: "controls.apply", values: preset.values });
    },
  },
  renderer: { pipelineRegistration: metalPipeline },
});
