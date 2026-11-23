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
in vec2 v_uv;
in float v_height;
out vec4 fragColor;
void main() {
  if (u_wire > 0.5) {
    fragColor = vec4(0.40, 0.83, 1.0, 0.18);
    return;
  }
  vec3 rawInk = texture(u_dye, v_uv).rgb;
  vec2 texel = 1.0 / vec2(textureSize(u_dye, 0));
  float xl = length(texture(u_dye, v_uv - vec2(texel.x, 0.0)).rgb);
  float xr = length(texture(u_dye, v_uv + vec2(texel.x, 0.0)).rgb);
  float yt = length(texture(u_dye, v_uv - vec2(0.0, texel.y)).rgb);
  float yb = length(texture(u_dye, v_uv + vec2(0.0, texel.y)).rgb);
  vec3 normal = normalize(vec3((xl - xr) * 2.0 * u_height, (yt - yb) * 2.0 * u_height, 0.72));
  float diffuse = max(dot(normal, normalize(vec3(-0.45, -0.30, 0.85))), 0.0);
  float fresnel = pow(1.0 - max(normal.z, 0.0), 2.0);
  float density = max(max(rawInk.r, rawInk.g), rawInk.b);
  vec3 ink = pow(max(rawInk, 0.0), vec3(0.78));
  vec3 dark = vec3(0.047, 0.075, 0.14);
  vec3 colored = mix(dark, ink * (0.45 + diffuse * 1.55) + vec3(fresnel * 0.24), smoothstep(0.015, 0.4, density));
  colored += vec3(0.015, 0.05, 0.09) * (0.5 + 0.5 * sin(v_uv.x * 67.0) * sin(v_uv.y * 47.0));
  colored = vec3(1.0) - exp(-colored * u_exposure);
  fragColor = vec4(colored, 1.0);
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

export function createSurface3D(canvas, initialTank) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, preserveDrawingBuffer: true });
  if (!gl) return null;
  const drawProgram = program(gl, vertexShader, fragmentShader);
  const uniforms = Object.fromEntries(['u_dye', 'u_mvp', 'u_height', 'u_exposure', 'u_wire']
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
    const maxWidth = 2400;
    const targetWidth = Math.max(2, Math.min(maxWidth, Math.round(rect.width * scale)));
    const targetHeight = Math.max(2, Math.round(targetWidth * tank.height / tank.width));
    if (canvas.width === targetWidth && canvas.height === targetHeight) return false;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    gl.viewport(0, 0, targetWidth, targetHeight);
    return true;
  }

  function render() {
    if (gl.isContextLost()) return;
    resize();
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

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    canvas.setPointerCapture(event.pointerId);
    dragging = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging || dragging.id !== event.pointerId) return;
    azimuth += (event.clientX - dragging.x) * .008;
    elevation = Math.max(.08, Math.min(1.48, elevation + (event.clientY - dragging.y) * .008));
    dragging.x = event.clientX;
    dragging.y = event.clientY;
    render();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, event => {
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

  setTank(tank);
  makeMesh(mesh);
  return { configure, render, resize, resetCamera, setTank };
}
