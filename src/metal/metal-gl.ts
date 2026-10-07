import { METAL_FRAGMENT, METAL_VERTEX } from "./metal-shader";
import { SHAPE_CODES, type MetalSettings } from "./metal-settings";
import type { MetalField } from "./metal-field";

type Surface = HTMLCanvasElement | OffscreenCanvas;

const UNIFORMS = [
  "uRes", "uPhase", "uShape", "uScale", "uRep", "uSoft", "uDist",
  "uAngle", "uShiftR", "uShiftB", "uBevel", "uHighlight", "uSoftEdge", "uFieldSize", "uOffset", "uTint", "uField", "uHasField",
] as const;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader compile failed: ${gl.getShaderInfoLog(shader) ?? "unknown error"}`);
  }
  return shader;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const v = m ? parseInt(m[1], 16) : 0xffffff;
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

/** One WebGL2 program drawing a full-screen triangle into the given surface. */
export class MetalRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly texture: WebGLTexture;
  private readonly loc: Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;
  private field: MetalField | null = null;

  constructor(readonly surface: Surface, preserveDrawingBuffer = false) {
    const gl = surface.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer }) as WebGL2RenderingContext | null;
    if (!gl) throw new Error("WebGL2 is not available in this browser.");
    this.gl = gl;
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, METAL_VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, METAL_FRAGMENT));
    gl.bindAttribLocation(program, 0, "aPos");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Shader link failed: ${gl.getProgramInfoLog(program) ?? "unknown error"}`);
    }
    this.program = program;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.loc = Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)])) as MetalRenderer["loc"];
    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  }

  setField(field: MetalField | null) {
    if (field === this.field) return;
    this.field = field;
    if (!field) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, field.size, field.size, 0, gl.RGBA, gl.FLOAT, field.data);
  }

  render(settings: MetalSettings, phase: number, width: number, height: number) {
    const gl = this.gl;
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    if (this.surface.width !== w) this.surface.width = w;
    if (this.surface.height !== h) this.surface.height = h;
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    const l = this.loc;
    gl.uniform2f(l.uRes, w, h);
    gl.uniform1f(l.uPhase, phase);
    gl.uniform1i(l.uShape, SHAPE_CODES[settings.shape]);
    gl.uniform1f(l.uScale, settings.scale);
    // Position is a percentage of the canvas width/height; convert to shorter-edge units.
    const unit = Math.min(w, h);
    gl.uniform2f(l.uOffset, (settings.x / 100) * (w / unit), (settings.y / 100) * (h / unit));
    gl.uniform1f(l.uRep, settings.repetition);
    gl.uniform1f(l.uSoft, settings.softness);
    gl.uniform1f(l.uDist, settings.distortion);
    gl.uniform1f(l.uAngle, settings.angle);
    gl.uniform1f(l.uShiftR, settings.shiftRed);
    gl.uniform1f(l.uShiftB, settings.shiftBlue);
    gl.uniform1f(l.uBevel, settings.bevel);
    gl.uniform1f(l.uHighlight, settings.highlight);
    gl.uniform1f(l.uSoftEdge, settings.edgeSoftness);
    gl.uniform1f(l.uFieldSize, this.field?.size ?? 1);
    gl.uniform3f(l.uTint, ...hexToRgb(settings.tint));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(l.uField, 0);
    gl.uniform1f(l.uHasField, this.field ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Frees GPU objects but keeps the context: React may mount the same canvas again. */
  dispose() {
    this.gl.deleteTexture(this.texture);
    this.gl.deleteProgram(this.program);
  }
}
