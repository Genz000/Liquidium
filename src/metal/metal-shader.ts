/**
 * Liquid-metal fragment shader. Output is premultiplied RGBA with a transparent
 * background; the runtime paints the Background below it.
 *
 * Shape space: the shape spans -0.5..0.5 on the shorter canvas edge times Scale.
 * Every shape yields a 1 px anti-aliased mask and a distance from its outline.
 * The surface is flat: the reflection bands depend only on position and time (they run
 * straight along Angle, warped by smooth simplex noise) and never on the shape, which
 * only cuts them out. The optional bevel is lighting on the lip, lit toward the
 * top-left and shaded toward the bottom-right, with a specular glint. A chrome profile (sharp edge,
 * thin stripe cluster, long light-to-dark gradient) is sampled along them, each
 * colour channel slightly shifted for the dispersion fringe. Band edges are
 * anti-aliased with fwidth so thin stripes stay smooth while they move.
 * All motion is a function of the loop phase, so the last frame meets the first.
 */
export const METAL_VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const METAL_FRAGMENT = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uPhase;
uniform int uShape;
uniform float uScale, uRep, uSoft, uDist, uAngle, uShiftR, uShiftB, uBevel, uHighlight;
// uSoftEdge: feather width across the outline in shape units. uFieldSize: image field texels per shape unit.
uniform float uSoftEdge, uFieldSize;
// uOffset: shape position in the same units as p (shorter canvas edge = 1).
uniform vec2 uOffset;
uniform vec3 uTint;
uniform sampler2D uField;
uniform float uHasField;
out vec4 outColor;

const float TAU = 6.28318530718;
// Band periods that pass a point per loop; an integer keeps the loop seamless.
const float BAND_CYCLES = 3.0;
// Radius of the circle the noise field travels along per loop (in noise units).
const float FLOW_RADIUS = 0.32;

// 2D simplex noise, -1..1, smooth first derivatives (no grid artefacts).
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }

// Chrome profile over one band period, returns lightness 0..1.
// A sharp dark-to-light edge, a narrow cluster of thin light/dark stripes, then one long
// smooth gradient from light back to dark that meets the next period's edge.
// w is the edge softness in band units (already widened to at least one pixel);
// bump (0..1) slightly widens the first stripe.
float chrome(float u, float w, float bump) {
  float f = fract(u);
  float a = 0.022 * (1.0 + 0.5 * bump);
  float b = 0.03 * (1.0 - 0.4 * bump);
  float l = smoothstep(0.0, 2.0 * w, f);
  l = mix(l, 0.0, smoothstep(a, a + 2.0 * w, f));
  l = mix(l, 1.0, smoothstep(a + 0.4 * b, a + 0.4 * b + 2.0 * w, f));
  l = mix(l, 0.0, smoothstep(a + 0.6 * b, a + 0.6 * b + 2.0 * w, f));
  float start = a + b;
  l = mix(l, 1.0, smoothstep(start, start + 2.0 * w, f));
  float g = 1.0 - pow(smoothstep(0.0, 1.0, (f - start) / (1.0 - start)), 2.6);
  return mix(l, g, smoothstep(start + 2.0 * w, start + 4.0 * w, f));
}

// Linear across the 1 px anti-aliasing ramp; an S-curve once the edge is feathered,
// so a soft edge fades in smoothly instead of as a hard-ended linear band.
float featherRamp(float a) {
  return uSoftEdge > 0.0 ? a * a * (3.0 - 2.0 * a) : a;
}

// Signed distance of the built-in shapes in shape space (negative inside).
float shapeSd(vec2 s, float t) {
  if (uShape == 1) return length(s) - 0.5;
  if (uShape == 2) {
    float th = atan(s.y, s.x);
    float r = 0.37 + 0.08 * cos(6.0 * th - TAU * t);
    return (length(s) - r) * 0.8;
  }
  if (uShape == 3) return sdBox(rot(0.78539816) * s, vec2(0.35));
  float d = 1e3;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float dir = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0;
    float a = TAU * (dir * t + fi / 5.0);
    vec2 c = vec2(cos(a), sin(2.0 * a + fi)) * vec2(0.2, 0.14);
    d = smin(d, length(s - c) - (0.12 + 0.02 * mod(fi, 3.0)), 0.14);
  }
  return d;
}

// Distance into an uploaded image's shape in shape units (the field spans one unit).
float imageEdge(vec2 s) {
  vec2 uv = vec2(s.x + 0.5, 0.5 - s.y);
  if (uHasField < 0.5 || any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
  return texture(uField, uv).g;
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float unit = min(uRes.x, uRes.y);
  vec2 p = (frag - 0.5 * uRes) / unit;
  p.y = -p.y;
  // s: band space (the flat reflection; not moved by Position). q: the shape's own space,
  // shifted by Position, so moving the shape slides it like a window over the reflection.
  vec2 s = p / max(uScale, 1e-3);
  vec2 q = (p - uOffset) / max(uScale, 1e-3);
  float t = uPhase;

  // edge: distance from the outline into the shape, in shape units (0 at the edge).
  // inward: unit vector pointing away from the nearest outline, for the bevel normal.
  float alpha;
  float edge;
  vec2 inward = vec2(0.0);
  bool frameFill = uShape == 0;
  if (uShape == 5) {
    vec2 uv = vec2(q.x + 0.5, 0.5 - q.y);
    // Signed distance to the outline in texels, from the B channel. Interpolated distance
    // stays smooth when magnified, so the outline is cut with one clean pixel of ramp.
    // Outside the image area counts as far outside (beyond any feather), so neither the
    // area's border nor a wide feather can leave partial alpha there.
    float sdTex = (uHasField > 0.5 && all(greaterThanEqual(uv, vec2(0.0))) && all(lessThanEqual(uv, vec2(1.0))))
      ? texture(uField, uv).b : 1e4;
    // Texels per screen pixel from the uv mapping itself: smooth everywhere, unlike the
    // derivative of the stored distance, which spikes where that distance is clamped.
    float texelsPerPixel = length(vec2(dFdx(uv.x), dFdy(uv.x))) * uFieldSize;
    // One pixel of ramp, widened by the feather.
    float aa = max(texelsPerPixel, 1e-4) + uSoftEdge * uFieldSize;
    alpha = featherRamp(clamp(0.5 - sdTex / aa, 0.0, 1.0));
    edge = imageEdge(q);
    const float E = 1.5 / 1024.0;
    inward = vec2(imageEdge(q + vec2(E, 0.0)) - imageEdge(q - vec2(E, 0.0)),
                  imageEdge(q + vec2(0.0, E)) - imageEdge(q - vec2(0.0, E)));
  } else if (frameFill) {
    float d = sdBox(p, 0.5 * uRes / unit);
    float aa = max(fwidth(d), 1e-5);
    // None fills the canvas: the frame edge stays crisp, feathering applies to shapes only.
    alpha = clamp(0.5 - d / aa, 0.0, 1.0);
    edge = max(-d, 0.0);
  } else {
    float d = shapeSd(q, t);
    // Exactly one pixel of anti-aliasing: a clean cut, no glow.
    // One pixel of ramp, widened by the feather and centred on the outline.
    float aa = max(length(vec2(dFdx(d), dFdy(d))), 1e-5) + uSoftEdge;
    alpha = featherRamp(clamp(0.5 - d / aa, 0.0, 1.0));
    edge = max(-d, 0.0);
    const float E = 0.0015;
    inward = -vec2(shapeSd(q + vec2(E, 0.0), t) - shapeSd(q - vec2(E, 0.0), t),
                   shapeSd(q + vec2(0.0, E), t) - shapeSd(q - vec2(0.0, E), t));
  }
  if (alpha <= 0.0) { outColor = vec4(0.0); return; }
  inward = dot(inward, inward) > 1e-12 ? normalize(inward) : vec2(0.0);

  // Bevel: a rounded lip of width uBevel. Its normal eases from flat (inside) to
  // about 75 degrees (at the outline) with no crease where it starts, so the edge
  // reads as softly rounded polished metal; the reflection and highlight follow it.
  float bx = (uBevel > 0.0 && !frameFill) ? clamp(edge / uBevel, 0.0, 1.0) : 1.0;
  float theta = 1.3 * (1.0 - bx) * (1.0 - bx);
  vec3 normal = vec3(-inward * sin(theta), cos(theta));

  // One octave of low-frequency noise travelling around a circle: broad, slow, liquid warps.
  vec2 flow = FLOW_RADIUS * vec2(cos(TAU * t), sin(TAU * t));
  float n = snoise(s * 1.1 + flow);
  float n2 = snoise(s * 0.6 - 0.7 * flow + 3.7);

  vec2 v = rot(radians(uAngle - 90.0)) * s;
  // A gentle, shape-independent curvature so straight bands still read as a curved mirror.
  float dir = 0.45 * (v.y + 0.22 * v.x * v.x);
  dir += uDist * (0.8 * n + 0.45 * n2);

  float u = dir * uRep - BAND_CYCLES * t;
  float px = fwidth(u);
  float w = max(mix(0.0008, 0.07, clamp(uSoft, 0.0, 1.0)), 0.6 * px);

  // Dispersion: channels sample the profile slightly apart, evenly across the surface.
  float spread = 0.01;
  float r = chrome(u + uShiftR * spread, w, 0.0);
  float g = chrome(u, w, 0.0);
  float b = chrome(u - uShiftB * spread, w, 0.0);
  vec3 l = vec3(r, g, b);

  vec3 dark = vec3(0.05, 0.05, 0.11);
  vec3 light = vec3(0.98, 0.98, 1.0);
  vec3 col = mix(dark, light, l);
  // Mid greys lean cool, as polished metal reflecting a sky does.
  col += vec3(-0.03, -0.01, 0.04) * (1.0 - abs(2.0 * l - 1.0));
  // Soft lilac-grey smudges drifting over the bright areas, independent of the outline.
  float smudge = 0.5 + 0.5 * snoise(s * 1.3 - 0.5 * flow + 7.1);
  col *= mix(vec3(1.0), mix(vec3(0.8, 0.8, 0.88), vec3(1.0), smudge), l.g);

  // Bevel lighting (does not move the bands): the lip brightens where it faces the
  // top-left light and darkens where it faces away, the steepest part dims slightly,
  // and a sharp specular glint plus a soft sheen sit on the lit side.
  float steep = sin(theta);
  vec3 lightDir = normalize(vec3(-0.55, 0.6, 0.58));
  float side = dot(normalize(normal.xy + 1e-6), normalize(lightDir.xy)) * steep;
  col = mix(col, light, uHighlight * 0.45 * max(side, 0.0));
  col *= 1.0 - uHighlight * 0.45 * max(-side, 0.0);
  col *= mix(1.0, 0.8, uHighlight * smoothstep(0.75, 1.0, steep));
  float facing = max(dot(normal, lightDir), 0.0);
  float glint = pow(facing, 70.0) + 0.35 * pow(facing, 12.0) * step(0.02, steep);
  col += uHighlight * glint * vec3(1.0, 0.99, 0.97);

  float maxc = max(max(uTint.r, uTint.g), uTint.b);
  col = maxc > 1e-3 ? col * (uTint / maxc) * pow(maxc, 0.35) : vec3(0.0);

  outColor = vec4(clamp(col, 0.0, 1.0) * alpha, alpha);
}
`;
