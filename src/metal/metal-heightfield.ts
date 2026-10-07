/** Pure height-field math for uploaded images: no DOM, only typed arrays. */

/**
 * Square float RGBA texture (uploaded as half floats, so it filters smoothly and the
 * bevel normals taken from it are free of 8-bit banding).
 * R = coverage 0..1. G = distance into the shape in field widths (0 at the outline),
 * lightly blurred. B = signed distance to the outline in texels (negative inside,
 * clamped to 160 texels, beyond the widest feather):
 * interpolating a distance field keeps a magnified outline smooth where a coverage
 * mask stair-steps.
 */
export type MetalField = { size: number; data: Float32Array; key: string };

/** Exact 1-D squared distance transform (Felzenszwalb & Huttenlocher). */
function edt1d(f: number[], n: number, d: number[], v: number[], z: number[]) {
  // `hull` is the number of parabolas in the lower envelope; z[0] = -Infinity stops the pop loop at one.
  let hull = 1;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  const meet = (q: number, p: number) => (f[q] + q * q - (f[p] + p * p)) / (2 * q - 2 * p);
  for (let q = 1; q < n; q++) {
    let s = meet(q, v[hull - 1]);
    while (s <= z[hull - 1]) {
      hull -= 1;
      s = meet(q, v[hull - 1]);
    }
    v[hull] = q;
    z[hull] = s;
    z[hull + 1] = Infinity;
    hull += 1;
  }
  let k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}

/** Euclidean distance (pixels) from every inside pixel to the nearest outside pixel. */
export function insideDistance(inside: Uint8Array, size: number): Float64Array {
  const INF = 1e20;
  const grid = new Float64Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = inside[i] ? INF : 0;
  const line: number[] = new Array(size).fill(0);
  const out: number[] = new Array(size).fill(0);
  const hull: number[] = new Array(size).fill(0);
  const bounds: number[] = new Array(size + 1).fill(0);
  // Columns first (stride = size), then rows (stride = 1).
  for (const [step, stride] of [[1, size], [size, 1]] as const) {
    for (let i = 0; i < size; i++) {
      const start = i * step;
      for (let j = 0; j < size; j++) line[j] = grid[start + j * stride];
      edt1d(line, size, out, hull, bounds);
      for (let j = 0; j < size; j++) grid[start + j * stride] = out[j];
    }
  }
  for (let i = 0; i < grid.length; i++) grid[i] = Math.sqrt(grid[i]);
  return grid;
}

function blur(src: Float32Array, size: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const r = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += src[y * size + Math.min(size - 1, Math.max(0, x + k))];
      tmp[y * size + x] = s / (2 * r + 1);
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += tmp[Math.min(size - 1, Math.max(0, y + k)) * size + x];
      out[y * size + x] = s / (2 * r + 1);
    }
  }
  return out;
}

export function buildField(alpha: Uint8ClampedArray, size: number, key: string): MetalField {
  const inside = new Uint8Array(size * size);
  const outside = new Uint8Array(size * size);
  for (let i = 0; i < inside.length; i++) {
    inside[i] = alpha[i] >= 128 ? 1 : 0;
    outside[i] = 1 - inside[i];
  }
  const distIn = insideDistance(inside, size);
  const distOut = insideDistance(outside, size);
  const depth = new Float32Array(size * size);
  for (let i = 0; i < depth.length; i++) depth[i] = distIn[i] / size;
  const smooth = blur(blur(depth, size), size);
  const data = new Float32Array(size * size * 4);
  for (let i = 0; i < inside.length; i++) {
    // Pixel centres sit half a texel from the boundary; partly covered pixels use their
    // coverage for a sub-texel position, so the outline is not snapped to the grid.
    const a = alpha[i];
    const sd = a > 0 && a < 255 ? 0.5 - a / 255 : inside[i] ? -(distIn[i] - 0.5) : distOut[i] - 0.5;
    data[i * 4] = a / 255;
    data[i * 4 + 1] = smooth[i];
    data[i * 4 + 2] = Math.max(-160, Math.min(160, sd));
    data[i * 4 + 3] = 1;
  }
  return { size, data, key };
}
