import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { getToolcraftTimelineLoopProgress } from "@/toolcraft/runtime";
import {
  useToolcraftDispatch, useToolcraftMediaPresentationUrls, useToolcraftPipelinePass,
  useToolcraftProductSceneFrame, useToolcraftSelector, useToolcraftViewportInteractionActive,
} from "@/toolcraft/runtime/react";

import { imageSource, loadField } from "./metal-field";
import { MetalRenderer } from "./metal-gl";
import { fieldPass, framePass } from "./metal-pipeline";
import { backingScale, loopSecondsForSpeed, readMetalSettings } from "./metal-settings";
import styles from "./metal.module.css";

export function MetalCanvas() {
  const frame = useToolcraftProductSceneFrame();
  const values = useToolcraftSelector((state) => state.values);
  const media = useToolcraftSelector((state) => state.mediaAssets);
  const currentTimeSeconds = useToolcraftSelector((state) => state.timeline.currentTimeSeconds);
  const durationSeconds = useToolcraftSelector((state) => state.timeline.durationSeconds);
  const zoom = useToolcraftSelector((state) => state.canvas.zoom);
  const viewportActive = useToolcraftViewportInteractionActive();
  const dispatch = useToolcraftDispatch();
  const settings = useMemo(() => readMetalSettings(values), [values]);

  const source = useMemo(() => imageSource(media), [media]);
  const urls = useToolcraftMediaPresentationUrls(media);
  const url = source ? urls.get(source.id) : undefined;
  const fieldKey = source && url ? source.resourceRef : "none";
  const field = useToolcraftPipelinePass(fieldPass, { resources: fieldKey }, () =>
    source && url ? loadField(source, url) : null);
  const fieldResult = field.status === "success" ? field.result : null;

  // Speed owns the loop length: one loop always moves the bands exactly one period.
  const loopSeconds = loopSecondsForSpeed(settings.speed);
  useEffect(() => {
    if (loopSeconds !== null && Math.abs(loopSeconds - durationSeconds) > 0.001) {
      dispatch({ type: "timeline.setDuration", durationSeconds: loopSeconds } as never);
    }
  }, [dispatch, loopSeconds, durationSeconds]);

  // Pan/zoom holds the last phase instead of advancing shader work.
  const heldPhase = useRef(0);
  const livePhase = loopSeconds === null ? 0 : getToolcraftTimelineLoopProgress({ currentTimeSeconds, durationSeconds });
  if (!viewportActive) heldPhase.current = livePhase;
  const phase = heldPhase.current;

  const rect = frame.kind === "ready" ? frame.rect : null;
  // Backing follows the on-screen size (zoom x devicePixelRatio) at 2x, so the browser
  // averages 2x2 samples per screen pixel: smooth outline and bevel at every zoom level.
  // During a pan/zoom gesture the previous resolution is kept to avoid reallocating.
  const heldScale = useRef(0);
  const liveScale = rect ? backingScale(rect.width, rect.height, zoom / 100, globalThis.devicePixelRatio || 1) : 0;
  if (!viewportActive || !heldScale.current) heldScale.current = liveScale;
  const scale = heldScale.current;
  const backingW = rect ? Math.round(rect.width * scale) : 0;
  const backingH = rect ? Math.round(rect.height * scale) : 0;
  const frameKey = `${phase}#${backingW}x${backingH}#${fieldResult?.key ?? ""}#${JSON.stringify(settings)}`;
  const drawn = useToolcraftPipelinePass(framePass, { frame: frameKey }, () => frameKey);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MetalRenderer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !backingW) return;
    try {
      rendererRef.current ??= new MetalRenderer(canvas);
      const renderer = rendererRef.current;
      renderer.setField(settings.shape === "image" ? fieldResult : null);
      renderer.render(settings, phase, backingW, backingH);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "WebGL failed to start.");
    }
  }, [settings, phase, backingW, backingH, fieldResult]);

  useEffect(() => () => {
    rendererRef.current?.dispose();
    rendererRef.current = null;
  }, []);

  if (!rect) return null;
  const imageMissing = settings.shape === "image" && !fieldResult;
  return (
    <canvas
      ref={canvasRef}
      className={styles.output}
      data-testid="metal-output"
      data-toolcraft-product-output=""
      data-frame-ready={drawn.status === "success" && !error ? "true" : "false"}
      data-shape={settings.shape}
      data-image-ready={imageMissing ? "false" : "true"}
      data-loop-progress={phase.toFixed(4)}
      data-error={error ?? undefined}
      aria-label={error ? `Liquid metal preview unavailable: ${error}` : "Liquid metal preview"}
    />
  );
}
