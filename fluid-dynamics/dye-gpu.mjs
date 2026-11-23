// WebGL2 dye compositor. The Navier-Stokes solver remains in fluid.mjs.
// Unlike enlarging the old Canvas2D bitmap, this shades and samples dye at
// actual display resolution, with optional 4-tap bicubic reconstruction.
const VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_position;
out vec2 v_uv;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = a_position * 0.5 + 0.5;
}`;
const FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_dye;
uniform vec2 u_grid;
uniform vec2 u_output;
uniform float u_exposure;
uniform float u_bloom;
uniform float u_detail;
uniform float u_grain;
uniform float u_obstacle;
uniform float u_radius;
uniform int u_palette;
uniform int u_bicubic;

vec4 weights(float f) {
  float f2 = f*f, f3 = f2*f;
  return vec4((1.0 - 3.0*f + 3.0*f2 - f3) / 6.0,
              (4.0 - 6.0*f2 + 3.0*f3) / 6.0,
              (1.0 + 3.0*f + 3.0*f2 - 3.0*f3) / 6.0,
              f3 / 6.0);
}
vec4 bicubic(vec2 uv) {
  vec2 p = uv * u_grid - 0.5;
  vec2 base = floor(p), fraction = fract(p);
  vec4 wx = weights(fraction.x), wy = weights(fraction.y);
  vec2 gx = vec2(wx.x + wx.y, wx.z + wx.w);
  vec2 gy = vec2(wy.x + wy.y, wy.z + wy.w);
  vec2 hx = vec2(base.x - 1.0 + wx.y / max(gx.x, 0.00001),
                 base.x + 1.0 + wx.w / max(gx.y, 0.00001));
  vec2 hy = vec2(base.y - 1.0 + wy.y / max(gy.x, 0.00001),
                 base.y + 1.0 + wy.w / max(gy.y, 0.00001));
  vec4 a = texture(u_dye, (vec2(hx.x, hy.x) + 0.5) / u_grid);
  vec4 b = texture(u_dye, (vec2(hx.y, hy.x) + 0.5) / u_grid);
  vec4 c = texture(u_dye, (vec2(hx.x, hy.y) + 0.5) / u_grid);
  vec4 d = texture(u_dye, (vec2(hx.y, hy.y) + 0.5) / u_grid);
  return mix(mix(a, b, gx.y), mix(c, d, gx.y), gy.y);
}
vec3 unpackDye(vec4 encoded) {
  return max(-log(max(vec3(0.0005), vec3(1.0) - encoded.rgb)) / 0.7, vec3(0.0));
}
vec3 sampleInk(vec2 uv) {
  vec2 flipped = vec2(uv.x, 1.0 - uv.y);
  return unpackDye(u_bicubic == 1 ? bicubic(flipped) : texture(u_dye, flipped));
}
// Lighting and bloom sample a softened field. Keep bicubic only for the
// visible surface reconstruction to avoid multiplying texture cost ~4×.
vec3 sampleSoft(vec2 uv) {
  return unpackDye(texture(u_dye, vec2(uv.x, 1.0 - uv.y)));
}
float density(vec3 c) { return max(max(c.r, c.g), c.b); }
float hash21(vec2 p) {
  return fract(43758.5453 * sin(dot(p, vec2(12.9898, 78.233))));
}
vec3 palette(vec3 c) {
  if (u_palette == 1) return vec3(c.r * 0.63 + c.b * 0.22, c.g * 1.14 + c.r * 0.12, c.b * 1.12);
  if (u_palette == 2) return vec3(c.r * 1.15 + c.g * 0.23, c.g * 0.73 + c.b * 0.10, c.b * 0.43);
  if (u_palette == 3) {
    float luma = dot(c, vec3(0.24, 0.58, 0.18));
    return luma * vec3(0.48, 1.02, 1.33);
  }
  return c;
}
void main() {
  vec2 uv = v_uv;
  vec3 ink = sampleInk(uv);
  float amount = density(ink);
  vec2 stepUV = 1.0 / u_grid;
  float dx = density(sampleSoft(uv - vec2(stepUV.x, 0.0))) - density(sampleSoft(uv + vec2(stepUV.x, 0.0)));
  float dy = density(sampleSoft(uv - vec2(0.0, stepUV.y))) - density(sampleSoft(uv + vec2(0.0, stepUV.y)));
  vec3 normal = normalize(vec3(dx * u_detail * 1.6, dy * u_detail * 1.6, 0.85));
  vec3 keyLight = normalize(vec3(-0.58, 0.42, 0.85));
  float lambert = max(dot(normal, keyLight), 0.0);
  float sheen = pow(max(dot(normal, normalize(vec3(-0.31, 0.17, 0.96))), 0.0), 22.0);
  float ridge = min(1.0, length(vec2(dx, dy)) * u_detail * 1.1);
  vec3 dyeColor = vec3(1.0) - exp(-palette(ink) * 1.12);
  vec3 lit = dyeColor * (0.36 + 0.86 * lambert) + vec3(0.44, 0.67, 1.0) * sheen * ridge * 0.23;
  lit += dyeColor * ridge * 0.23;
  float presence = smoothstep(0.002, 0.22, amount);
  lit *= presence;

  // Two-radius glow in linear color space. This doesn't alter fluid dynamics.
  if (u_bloom > 0.001) {
    vec3 spread = vec3(0.0);
    vec2 nearStep = vec2(2.0, 2.0) / u_grid;
    vec2 farStep = vec2(7.0, 7.0) / u_grid;
    spread += sampleSoft(uv + vec2(nearStep.x, 0.0));
    spread += sampleSoft(uv - vec2(nearStep.x, 0.0));
    spread += sampleSoft(uv + vec2(0.0, nearStep.y));
    spread += sampleSoft(uv - vec2(0.0, nearStep.y));
    spread += 0.5 * sampleSoft(uv + farStep);
    spread += 0.5 * sampleSoft(uv - farStep);
    spread += 0.5 * sampleSoft(uv + vec2(-farStep.x, farStep.y));
    spread += 0.5 * sampleSoft(uv + vec2(farStep.x, -farStep.y));
    spread /= 6.0;
    lit += (vec3(1.0) - exp(-palette(spread) * 0.95)) * u_bloom * 0.63;
  }

  vec2 center = uv - 0.5;
  float vignette = smoothstep(0.83, 0.08, dot(center * vec2(1.08, 1.3), center * vec2(1.08, 1.3)));
  vec3 background = mix(vec3(0.012, 0.020, 0.048), vec3(0.041, 0.072, 0.145), vignette);
  float lineX = 1.0 - smoothstep(0.0, 1.3 / u_output.x, abs(fract(uv.x * 18.0) - 0.5) / 18.0);
  float lineY = 1.0 - smoothstep(0.0, 1.3 / u_output.y, abs(fract(uv.y * 12.0) - 0.5) / 12.0);
  background += vec3(0.009, 0.017, 0.029) * (lineX + lineY);

  if (u_obstacle > 0.5) {
    vec2 p = (uv - vec2(0.55, 0.5)) * vec2(u_grid.x / u_grid.y, 1.0);
    float distanceToCenter = length(p);
    float shape = 1.0 - smoothstep(u_radius - 0.01, u_radius + 0.005, distanceToCenter);
    vec3 steel = vec3(0.055, 0.10, 0.19) + 0.055 * max(0.0, dot(normalize(p + 0.001), vec2(-0.6, 0.8)));
    steel += vec3(0.12, 0.21, 0.32) * exp(-abs(distanceToCenter - u_radius) * 650.0);
    lit *= 1.0 - shape;
    background = mix(background, steel, shape);
  }

  vec3 color = background + lit * u_exposure;
  color = color / (vec3(1.0) + color * 0.47); // soft highlight shoulder
  float noise = (hash21(gl_FragCoord.xy) - 0.5) * (u_grain * 0.038 + 1.5 / 255.0);
  fragColor = vec4(pow(clamp(color + noise, 0.0, 1.0), vec3(0.92)), 1.0);
}`;

function compile(gl, kind, src) {
  const s = gl.createShader(kind);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const reason = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error('Dye shader compilation failed: ' + reason);
  }
  return s;
}
function link(gl) {
  const p = gl.createProgram();
  const v = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const f = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const reason = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error('Dye shader linking failed: ' + reason);
  }
  return p;
}

export function createDyeGPU(canvas, initialTank, mobile = false) {
  let gl;
  try { gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true }); }
  catch { return null; }
  if (!gl) return null;
  const shaderProgram = link(gl);
  gl.useProgram(shaderProgram);
  const locations = Object.fromEntries(
    ['dye','grid','output','exposure','bloom','detail','grain','obstacle','radius','palette','bicubic']
    .map(name => [name, gl.getUniformLocation(shaderProgram, 'u_' + name)])
  );
  const vertex = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.uniform1i(locations.dye, 0);
  gl.disable(gl.DEPTH_TEST);
  let tank = initialTank;
  let pixels = null;
  let options = { scale: 1, exposure: 1, glow: 0.6, detail: 1, grain: 0.05,
    bicubic: false, palette: 'spectrum' };
  const paletteIds = { spectrum: 0, aurora: 1, ember: 2, ice: 3 };

  function setTank(next) {
    tank = next;
    pixels = new Uint8Array(tank.width * tank.height * 4);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tank.width, tank.height,
      0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  }
  function configure(next) {
    options = { ...options, ...next };
    resize();
  }
  function renderSize(width, height) {
    if (gl.isContextLost()) throw new Error('WebGL context was lost');
    const limits = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    const maxBuffer = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    if (width > limits[0] || height > limits[1] || width > maxBuffer || height > maxBuffer) {
      throw new Error('Requested output exceeds your GPU maximum framebuffer size');
    }
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  }
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width) return false;
    const dpr = Math.min(devicePixelRatio || 1, mobile ? 2 : 2.5);
    const maxWidth = mobile ? 3072 : 5120;
    const width = Math.max(2, Math.min(maxWidth, Math.round(bounds.width * dpr * options.scale)));
    const height = Math.max(2, Math.round(width * tank.height / tank.width));
    if (width === canvas.width && height === canvas.height) return false;
    renderSize(width, height);
    return true;
  }
  function upload() {
    const { width, height, stride, dye: [r, g, b] } = tank;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = x + y * stride, offset = (x + y * width) * 4;
      pixels[offset] = Math.round(255 * (1 - Math.exp(-r[i] * .7)));
      pixels[offset + 1] = Math.round(255 * (1 - Math.exp(-g[i] * .7)));
      pixels[offset + 2] = Math.round(255 * (1 - Math.exp(-b[i] * .7)));
      pixels[offset + 3] = 255;
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  }
  function draw(skipResize = false) {
    if (!skipResize) resize();
    if (!canvas.width || !canvas.height) return;
    upload();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(shaderProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(locations.grid, tank.width, tank.height);
    gl.uniform2f(locations.output, canvas.width, canvas.height);
    gl.uniform1f(locations.exposure, options.exposure);
    gl.uniform1f(locations.bloom, options.glow);
    gl.uniform1f(locations.detail, options.detail);
    gl.uniform1f(locations.grain, options.grain);
    gl.uniform1f(locations.obstacle, tank.obstacle ? 1 : 0);
    gl.uniform1f(locations.radius, tank.radius / tank.height);
    gl.uniform1i(locations.palette, paletteIds[options.palette] ?? 0);
    gl.uniform1i(locations.bicubic, options.bicubic ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function render() { draw(false); }
  function size() { return { width: canvas.width, height: canvas.height }; }
  async function capture(targetWidth) {
    const previous = size();
    const w = targetWidth || previous.width;
    const h = Math.round(w * tank.height / tank.width);
    try {
      renderSize(w, h);
      draw(true);
      const png = await new Promise((resolve, reject) =>
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
      return png;
    } finally {
      if (previous.width && previous.height) {
        renderSize(previous.width, previous.height);
        draw(true);
      } else resize();
    }
  }
  setTank(tank);
  resize();
  return { setTank, configure, resize, render, size, capture };
}
