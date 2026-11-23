// A real WebGL2 camera and 3D density-surface visualization of the 2D fluid grid.
// The solver itself remains two-dimensional; height depicts dye concentration.
const shader = (gl, type, source) => {
  const item = gl.createShader(type);
  gl.shaderSource(item, source);
  gl.compileShader(item);
  if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(item);
    gl.deleteShader(item);
    throw new Error(error);
  }
  return item;
};
const program = (gl, vertex, fragment) => {
  const item = gl.createProgram();
  const v = shader(gl, gl.VERTEX_SHADER, vertex);
  const f = shader(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(item, v);
  gl.attachShader(item, f);
  gl.linkProgram(item);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(item, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(item);
    gl.deleteProgram(item);
    throw new Error(error);
  }
  return item;
};

const vertexShader = String.raw`#version 300 es
precision highp float;
layout(location=0) in vec2 a_uv;
uniform sampler2D u_dye;
uniform mat4 u_mvp;
uniform float u_height;
out vec2 v_uv;
out float v_height;
void main() {
  v_uv = a_uv;
  vec3 density = texture(u_dye, a_uv).rgb;
  v_height = pow(max(max(density.r, density.g), density.b), 0.85) * u_height;
  vec3 position = vec3((a_uv.x - 0.5) * 3.35, (a_uv.y - 0.5) * 2.25, v_height - 0.13);
  gl_Position = u_mvp * vec4(position, 1.0);
}`;
const fragmentShader = String.raw`#version 300 es
precision highp float;
uniform sampler2D u_dye;
uniform float u_height;
uniform float u_exposure;
uniform float u_wire;
uniform float u_detail;
uniform float u_glow;
uniform int u_palette;
in vec2 v_uv;
in float v_height;
out vec4 fragColor;
vec3 grade(vec3 color) {
  if (u_palette == 1) return vec3(color.r*0.64+color.b*0.25, color.g*1.16+color.r*0.10, color.b*1.20);
  if (u_palette == 2) return vec3(color.r*1.18+color.g*0.2, color.g*0.72, color.b*0.46);
  if (u_palette == 3) {
    float l = dot(color, vec3(0.24, 0.58, 0.18));
    return l * vec3(0.48, 1.04, 1.35);
  }
  return color;
}
void main() {
  if (u_wire > 0.5) {
    fragColor = vec4(0.42, 0.78, 1.0, 0.24);
    return;
  }
  vec3 ink = texture(u_dye, v_uv).rgb;
  vec2 px = 1.0 / vec2(textureSize(u_dye, 0));
  float l = length(texture(u_dye, v_uv - vec2(px.x,0.0)).rgb);
  float r = length(texture(u_dye, v_uv + vec2(px.x,0.0)).rgb);
  float t = length(texture(u_dye, v_uv - vec2(0.0,px.y)).rgb);
  float b = length(texture(u_dye, v_uv + vec2(0.0,px.y)).rgb);
  vec3 normal = normalize(vec3((l-r)*2.7*u_height*u_detail, (t-b)*2.7*u_height*u_detail, 0.68));
  vec3 lightA = normalize(vec3(-0.57,0.32,0.78));
  vec3 lightB = normalize(vec3(0.45,-0.62,0.70));
  float diffuse = 0.24 + max(dot(normal,lightA),0.0)*0.85 + max(dot(normal,lightB),0.0)*0.32;
  float specular = pow(max(dot(normal, normalize(lightA + vec3(0.0,0.0,1.0))),0.0), 34.0);
  float rim = pow(1.0 - clamp(normal.z,0.0,1.0),2.4);
  float amount = max(max(ink.r,ink.g),ink.b);
  vec3 base = vec3(0.026,0.046,0.095);
  vec3 pigment = pow(max(grade(ink),0.0), vec3(0.84));
  vec3 reflected = pigment*diffuse + vec3(0.71,0.89,1.0)*specular*0.37;
  reflected += vec3(0.30,0.58,0.91)*rim*0.24;
  float coverage = smoothstep(0.006,0.31,amount);
  vec3 color = mix(base,reflected,coverage);
  color += grade(ink)*u_glow*0.16;
  float depthTint = 0.07 * clamp(v_height / max(u_height,0.0001),0.0,1.0);
  color += vec3(0.09,0.17,0.28)*depthTint;
  color = max(color*u_exposure,0.0);
  color = color / (vec3(1.0) + color*0.45);
  fragColor = vec4(pow(color,vec3(0.93)),1.0);
}`;

function multiply(a, b) {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1]
      + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return out;
}
const subtract = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
const normalize = v => {
  const n = Math.hypot(...v) || 1;
  return v.map(x => x / n);
};
function cameraMatrix(width, height, azimuth, elevation, zoom) {
  const eye = [
    zoom * Math.cos(elevation) * Math.sin(azimuth),
    zoom * Math.cos(elevation) * Math.cos(azimuth),
    zoom * Math.sin(elevation) + .17
  ];
  const center = [0, 0, .13];
  const z = normalize(subtract(eye, center));
  const x = normalize(cross([0, 0, 1], z));
  const y = cross(z, x);
  const view = new Float32Array([
    x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
  ]);
  const f = 1 / Math.tan(Math.PI * 50 / 360), aspect = width / height;
  const near = .1, far = 45;
  const perspective = new Float32Array([
    f / aspect, 0, 0, 0, 0, f, 0, 0,
    0, 0, -(far + near) / (far - near), -1,
    0, 0, -(2 * far * near) / (far - near), 0
  ]);
  return multiply(perspective, view);
}

export function createSurface3D(canvas, initialTank, mobile = false) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, preserveDrawingBuffer: true });
  if (!gl) return null;
  const drawProgram = program(gl, vertexShader, fragmentShader);
  const uniforms = Object.fromEntries(['u_dye', 'u_mvp', 'u_height', 'u_exposure', 'u_wire', 'u_detail', 'u_glow', 'u_palette']
    .map(key => [key, gl.getUniformLocation(drawProgram, key)]));
  const vao = gl.createVertexArray();
  const vertices = gl.createBuffer();
  const triangles = gl.createBuffer();
  const lines = gl.createBuffer();
  const texture = gl.createTexture();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.enable(gl.DEPTH_TEST);
  let tank = initialTank, textureData = null, countTriangles = 0, countLines = 0;
  let azimuth = -.67, elevation = .66, zoom = 4.4;
  let mesh = 96, height = .85, exposure = 1.2, wireframe = false, resolution = 1;
  let detail = 1.1, glow = .6, palette = 'spectrum';
  const paletteIds = { spectrum: 0, aurora: 1, ember: 2, ice: 3 };
  let dragging = null;

  function setTank(nextTank) {
    tank = nextTank;
    textureData = new Uint8Array(tank.width * tank.height * 4);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, tank.width, tank.height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, textureData);
  }

  function makeMesh(density) {
    const cols = density, rows = Math.round(density * 2 / 3);
    const uv = new Float32Array((cols + 1) * (rows + 1) * 2);
    const tri = [], line = [];
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= cols; x++) {
      const i = (y * (cols + 1) + x) * 2;
      uv[i] = x / cols;
      uv[i + 1] = y / rows;
      if (x === cols || y === rows) continue;
      const a = y * (cols + 1) + x;
      const b = a + 1, c = a + cols + 1, d = c + 1;
      tri.push(a, b, c, b, d, c);
      line.push(a, b, a, c);
    }
    countTriangles = tri.length;
    countLines = line.length;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangles);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(tri), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lines);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(line), gl.STATIC_DRAW);
  }

  function configure(opts) {
    height = opts.height ?? height;
    exposure = opts.exposure ?? exposure;
    wireframe = opts.wireframe ?? wireframe;
    resolution = opts.scale ?? resolution;
    detail = opts.detail ?? detail;
    glow = opts.glow ?? glow;
    palette = opts.palette ?? palette;
    if (opts.mesh && opts.mesh !== mesh) {
      mesh = opts.mesh;
      makeMesh(mesh);
    }
    resize();
  }

  function resetCamera() {
    azimuth = -.67;
    elevation = .66;
    zoom = 4.4;
    render();
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(devicePixelRatio || 1, 2) * resolution;
    const maxWidth = mobile ? 3072 : 5120;
    const limit = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0]);
    const targetWidth = Math.max(2, Math.min(maxWidth, limit, Math.round(rect.width * scale)));
    const targetHeight = Math.max(2, Math.round(targetWidth * tank.height / tank.width));
    if (canvas.width === targetWidth && canvas.height === targetHeight) return false;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    gl.viewport(0, 0, targetWidth, targetHeight);
    return true;
  }

  function render(skipResize = false) {
    if (gl.isContextLost()) return;
    if (!skipResize) resize();
    const { dye: [r, g, b], stride, width, height: rows } = tank;
    for (let y = 0; y < rows; y++) for (let x = 0; x < width; x++) {
      const i = x + y * stride, o = (x + y * width) * 4;
      textureData[o] = 255 * (1 - Math.exp(-r[i] * .88));
      textureData[o + 1] = 255 * (1 - Math.exp(-g[i] * .88));
      textureData[o + 2] = 255 * (1 - Math.exp(-b[i] * .88));
      textureData[o + 3] = 255;
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, rows, gl.RGBA, gl.UNSIGNED_BYTE, textureData);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(.012, .022, .051, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(drawProgram);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(uniforms.u_dye, 0);
    gl.uniformMatrix4fv(uniforms.u_mvp, false, cameraMatrix(canvas.width, canvas.height, azimuth, elevation, zoom));
    gl.uniform1f(uniforms.u_height, height);
    gl.uniform1f(uniforms.u_exposure, exposure);
    gl.uniform1f(uniforms.u_wire, 0);
    gl.uniform1f(uniforms.u_detail, detail);
    gl.uniform1f(uniforms.u_glow, glow);
    gl.uniform1i(uniforms.u_palette, paletteIds[palette] ?? 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangles);
    gl.drawElements(gl.TRIANGLES, countTriangles, gl.UNSIGNED_INT, 0);
    if (wireframe) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.uniform1f(uniforms.u_wire, 1);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lines);
      gl.drawElements(gl.LINES, countLines, gl.UNSIGNED_INT, 0);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
  }

  const touchPoints = new Map();
  let lastPinchDistance = 0;
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    canvas.setPointerCapture(event.pointerId);
    touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
    if (touchPoints.size > 1) lastPinchDistance = 0;
  });
  canvas.addEventListener('pointermove', event => {
    const previous = touchPoints.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
    touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touchPoints.size > 1) {
      const points = [...touchPoints.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (lastPinchDistance > 1) zoom = Math.max(2.8, Math.min(8.5, zoom * lastPinchDistance / Math.max(1, distance)));
      lastPinchDistance = distance;
    } else {
      azimuth += dx * .008;
      elevation = Math.max(.08, Math.min(1.48, elevation + dy * .008));
    }
    render();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, event => {
      touchPoints.delete(event.pointerId);
      lastPinchDistance = 0;
      if (dragging?.id === event.pointerId) dragging = null;
    });
  }
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    zoom = Math.max(2.8, Math.min(8.5, zoom * Math.exp(event.deltaY * .001)));
    render();
  }, { passive: false });
  canvas.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') azimuth -= .13;
    else if (event.key === 'ArrowRight') azimuth += .13;
    else if (event.key === 'ArrowUp') elevation = Math.min(1.48, elevation + .1);
    else if (event.key === 'ArrowDown') elevation = Math.max(.08, elevation - .1);
    else if (event.key === '+' || event.key === '=') zoom = Math.max(2.8, zoom * .89);
    else if (event.key === '-') zoom = Math.min(8.5, zoom * 1.12);
    else return;
    event.preventDefault();
    render();
  });

  async function capture(targetWidth) {
    const originalWidth = canvas.width, originalHeight = canvas.height;
    const target = targetWidth || originalWidth;
    const rows = Math.round(target * tank.height / tank.width);
    const limit = Math.min(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0], gl.getParameter(gl.MAX_VIEWPORT_DIMS)[1]);
    if (target > limit || rows > limit) throw new Error('3D export exceeds your GPU maximum framebuffer size');
    try {
      canvas.width = target;
      canvas.height = rows;
      render(true);
      return await new Promise((resolve, reject) => canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
    } finally {
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      render(true);
    }
  }
  setTank(tank);
  makeMesh(mesh);
  return { configure, render, resize, resetCamera, setTank, capture };
}
