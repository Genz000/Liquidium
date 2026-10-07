import { defineToolcraft, imageExportModule, mediaSourceModule, timelineModule, videoExportModule } from "@/toolcraft/runtime";

import {
  backgroundControls, dispersionControls, edgeControls, motionControls, presetControls, shapeControls, surfaceControls,
} from "../metal/metal-controls";
import { BASE_LOOP_SECONDS } from "../metal/metal-settings";
import appDefaults from "./app-defaults.json" with { type: "json" };
import { appIdentity } from "./app-identity";

export const appSchema = defineToolcraft({
  defaults: appDefaults,
  base: {
    canvas: {
      enabled: true,
      upload: true,
      size: { width: 1200, height: 900, unit: "px" },
      sizing: { mode: "editable-output" },
    },
    identity: appIdentity,
    panels: {
      controls: {
        sections: [
          { id: "runtime.setup", title: "Settings", controls: backgroundControls },
          { id: "presets", title: "Presets", controls: presetControls },
          { id: "shape", title: "Shape", controls: shapeControls },
          { id: "edge", title: "Edge", controls: edgeControls },
          { id: "surface", title: "Surface", controls: surfaceControls },
          { id: "dispersion", title: "Dispersion", controls: dispersionControls },
          { id: "motion", title: "Motion", controls: motionControls },
        ],
        title: "Controls",
      },
    },
    toolbar: {
      history: true,
      radar: true,
      theme: true,
      zoom: true,
    },
  },
  modules: [
    mediaSourceModule(),
    timelineModule({ mode: "playback", defaultDurationSeconds: BASE_LOOP_SECONDS }),
    imageExportModule(),
    videoExportModule(),
  ],
});
