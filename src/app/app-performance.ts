import { defineToolcraftPerformance, deriveToolcraftPerformancePaths, type ToolcraftPerformanceScenario } from "@/toolcraft/runtime";

import { metalPerformanceModel } from "../metal/metal-performance-model";
import { appSchema } from "./app-schema";

export const metalPerformancePaths = deriveToolcraftPerformancePaths(appSchema, metalPerformanceModel);

export const appPerformance = defineToolcraftPerformance({
  ...metalPerformanceModel,
  scenarios: metalPerformancePaths.map((path, index): ToolcraftPerformanceScenario => ({
    id: `metal-path-${index}`, pathId: path.id, coversTargets: path.targets, interaction: path.interaction,
    automated: true, automatedTestName: "metal render plan has valid derived paths and fixtures",
    browser: true, browserTestName: `browser perf: toolcraft path ${path.id}`,
    expectedObservable: "The liquid-metal preview, viewport or decoded artifact reflects the exact applied operation.",
    fixture: "Compiled reachable liquid-metal workload", uiSelector: '[data-testid="metal-output"]',
    ...(path.interaction === "export" ? { actionValue: "export.png", controlLabel: "Export PNG", completionEvidence: "download" as const } : {}),
  } as ToolcraftPerformanceScenario)),
});
