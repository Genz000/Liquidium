import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";

import { buildField, type MetalField } from "./metal-heightfield";
import { IMAGE_TARGET } from "./metal-settings";

export type { MetalField } from "./metal-heightfield";


export const FIELD_SIZE = 1024;
/** The image is fitted inside the field with this margin so the rim never touches the texture edge. */
const MARGIN = 0.06;

export type ImageSource = { id: string; fileName: string; resourceRef: string };

export function imageSource(media: readonly ToolcraftMediaAsset[]): ImageSource | null {
  const asset = media.find((a) => a.sourceTarget === IMAGE_TARGET && a.lifecycle === "ready");
  if (!asset) return null;
  return { id: asset.id, fileName: asset.fileName, resourceRef: (asset as { resourceRef: string }).resourceRef };
}

const cache = new Map<string, Promise<MetalField>>();
const done = new Map<string, MetalField>();

/** Decodes and converts each resource once; later calls reuse the field. */
export function loadField(source: ImageSource, url: string): Promise<MetalField> {
  let pending = cache.get(source.resourceRef);
  if (!pending) {
    pending = rasterizeAlpha(url, FIELD_SIZE).then((alpha) => {
      const field = buildField(alpha, FIELD_SIZE, source.resourceRef);
      done.set(source.resourceRef, field);
      return field;
    });
    pending.catch(() => cache.delete(source.resourceRef));
    cache.set(source.resourceRef, pending);
  }
  return pending;
}

export const cachedField = (source: ImageSource | null) => (source ? done.get(source.resourceRef) ?? null : null);

/** Decodes through an image element so SVG files rasterise too, then keeps only the alpha channel. */
async function rasterizeAlpha(url: string, size: number): Promise<Uint8ClampedArray> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const iw = image.naturalWidth || size;
  const ih = image.naturalHeight || size;
  const box = size * (1 - 2 * MARGIN);
  const k = Math.min(box / iw, box / ih);
  const w = iw * k;
  const h = ih * k;
  ctx.drawImage(image, (size - w) / 2, (size - h) / 2, w, h);
  const rgba = ctx.getImageData(0, 0, size, size).data;
  const alpha = new Uint8ClampedArray(size * size);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
  return alpha;
}
