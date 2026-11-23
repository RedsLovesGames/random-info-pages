const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const depth = (r, g, b, i) => Math.max(r[i], g[i], b[i]);

export function createTankRenderer(canvas, context, tank, mobile) {
  let options = { renderScale: 1, exposure: 1, glow: .6, palette: 'spectrum', tracerCount: mobile ? 950 : 2350 };
  function setOptions(next) {
    options = { ...options, ...next };
    resize();
  }
  const { width, height, stride } = tank;
  const field = document.createElement('canvas');
  field.width = width;
  field.height = height;
  const fieldContext = field.getContext('2d', { alpha: false });
  const frame = fieldContext.createImageData(width, height);
  const pixels = frame.data;
  const bloom = document.createElement('canvas');
  bloom.width = width;
  bloom.height = height;
  const bloomContext = bloom.getContext('2d');
  bloomContext.filter = 'blur(1.65px)';
  const backdrop = document.createElement('canvas');
  const background = backdrop.getContext('2d', { alpha: false });
  const tracerCount = mobile ? 4200 : 7000;
  const traces = new Float32Array(tracerCount * 2);
  let seed = 1;

  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function replant(i) {
    traces[i] = random() * (width - 2) + 1;
    traces[i + 1] = random() * (height - 2) + 1;
  }

  function reset() {
    seed = 6827;
    for (let i = 0; i < traces.length; i += 2) replant(i);
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const target = Math.min(mobile ? 2000 : 3200, Math.max(width, Math.round(bounds.width * Math.min(devicePixelRatio || 1, 2) * options.renderScale)));
    if (target === canvas.width && backdrop.width === target) return false;
    canvas.width = backdrop.width = target;
    canvas.height = backdrop.height = Math.round(target * height / width);
    paintBackdrop();
    return true;
  }

  function paintBackdrop() {
    const w = backdrop.width, h = backdrop.height;
    const light = background.createRadialGradient(w * .52, h * .46, 0, w * .52, h * .46, w * .62);
    light.addColorStop(0, '#101932');
    light.addColorStop(.58, '#0b1126');
    light.addColorStop(1, '#050914');
    background.fillStyle = light;
    background.fillRect(0, 0, w, h);

    // Cache the grid and fine reference ticks at display resolution.
    const spacing = w / 18;
    background.lineWidth = 1;
    for (let axis = 0; axis < 2; axis++) {
      const limit = axis === 0 ? w : h;
      for (let index = 1; index * spacing < limit - 1; index++) {
        const position = Math.round(index * spacing) + .5;
        background.strokeStyle = index % 3 ? 'rgba(139, 164, 215, .075)' : 'rgba(139, 164, 215, .15)';
        background.beginPath();
        if (axis === 0) {
          background.moveTo(position, 0);
          background.lineTo(position, h);
        } else {
          background.moveTo(0, position);
          background.lineTo(w, position);
        }
        background.stroke();
      }
    }
    background.fillStyle = 'rgba(157, 182, 227, .27)';
    for (let i = 1; i < 36; i++) {
      const tick = i % 2 === 0 ? 5 : 2;
      const x = Math.round(i * spacing / 2);
      background.fillRect(x, 0, 1, tick);
      background.fillRect(x, h - tick, 1, tick);
    }
  }

  function advanceTracers() {
    const { u, v, solid } = tank;
    for (let i = 0; i < Math.min(traces.length, options.tracerCount * 2); i += 2) {
      const x = traces[i], y = traces[i + 1];
      const dx = tank.sample(u, x, y - .5, width, height - 1);
      const dy = tank.sample(v, x - .5, y, width - 1, height);
      const nextX = x + dx, nextY = y + dy;
      if (nextX < .5 || nextY < .5 || nextX >= width - .5 || nextY >= height - .5
          || solid[Math.floor(nextX) + Math.floor(nextY) * stride]
          || tank.blockedTrace(x, y, nextX, nextY) || random() < .009) {
        replant(i);
      } else {
        traces[i] = nextX;
        traces[i + 1] = nextY;
      }
    }
  }

  function paintField(view, scale) {
    const { u, v, pressure, dye: [red, green, blue], solid } = tank;
    const isDye = view === 'dye', isVelocity = view === 'velocity', isCurl = view === 'vorticity';
    const cool = isCurl ? [56, 133, 249] : [132, 79, 232];
    const warm = isCurl ? [255, 126, 70] : [251, 196, 75];

    for (let y = 0, pixel = 0; y < height; y++) {
      for (let x = 0; x < width; x++, pixel += 4) {
        const i = y * stride + x;
        let r = 0, g = 0, b = 0;
        if (!solid[i]) {
          if (isDye) {
            const density = depth(red, green, blue, i);
            if (density > .001) {
              const left = x ? i - 1 : i;
              const right = x + 1 < width ? i + 1 : i;
              const top = y ? i - stride : i;
              const bottom = y + 1 < height ? i + stride : i;
              const dx = depth(red, green, blue, left) - depth(red, green, blue, right);
              const dy = depth(red, green, blue, top) - depth(red, green, blue, bottom);
              // Light the density gradients to give the dye folds and illuminated edges.
              const normalLight = (.85 * dx + .65 * dy) / (.15 + .35 * density + .55 * Math.hypot(dx, dy));
              const intensity = Math.tanh(1.05 * Math.sqrt(density));
              const exposure = 225 * intensity * clamp(1 + .48 * normalLight, .38, 1.5) / density;
              const highlight = 48 * intensity ** 4 * Math.max(0, normalLight);
              r = (red[i] * exposure + highlight) * options.exposure;
              g = (green[i] * exposure + highlight) * options.exposure;
              b = (blue[i] * exposure + highlight) * options.exposure;
              if (options.palette === 'aurora') {
                const nr = r * .63 + b * .22, ng = g * 1.14 + r * .12;
                r = nr; g = ng; b = b * 1.12;
              } else if (options.palette === 'ember') {
                const nr = r * 1.16 + g * .23, ng = g * .72 + b * .12;
                r = nr; g = ng; b *= .42;
              } else if (options.palette === 'ice') {
                const shine = .24 * r + .58 * g + .18 * b;
                r = shine * .48; g = shine * 1.02; b = shine * 1.33;
              }
            }
          } else if (isVelocity) {
            const magnitude = .5 * Math.hypot(u[i] + u[i + 1], v[i] + v[i + stride]);
            const intensity = Math.tanh(magnitude * .62 / scale);
            const band = 1 + .13 * Math.cos(intensity * 48);
            const bright = intensity ** 4;
            r = 32 * intensity * band + 181 * bright;
            g = 182 * intensity * band + 36 * bright;
            b = 224 * intensity * band;
          } else {
            const value = isCurl ? tank.curl(x, y) : pressure[i];
            const strength = Math.tanh(Math.abs(value) * (isCurl ? 3.8 : 3.2));
            const contour = 1 + .12 * Math.cos(strength * 48);
            const tint = value < 0 ? cool : warm;
            r = tint[0] * strength * contour;
            g = tint[1] * strength * contour;
            b = tint[2] * strength * contour;
          }
        }
        pixels[pixel] = r;
        pixels[pixel + 1] = g;
        pixels[pixel + 2] = b;
        pixels[pixel + 3] = 255;
      }
    }
    fieldContext.putImageData(frame, 0, 0);
  }

  function paintTracers() {
    const { u, v, dye: [red, green, blue], solid } = tank;
    const pixel = canvas.width / width;
    const highlights = new Path2D();
    const filaments = new Path2D();
    for (let i = 0; i < Math.min(traces.length, options.tracerCount * 2); i += 2) {
      const x = traces[i], y = traces[i + 1];
      const cell = Math.floor(x) + Math.floor(y) * stride;
      const concentration = depth(red, green, blue, cell);
      if (solid[cell] || concentration < .05) continue;
      const dx = .5 * (u[cell] + u[cell + 1]);
      const dy = .5 * (v[cell] + v[cell + stride]);
      if (dx * dx + dy * dy < .005) continue;
      const trace = concentration > .45 ? highlights : filaments;
      const length = .7 + (i % 7) * .09;
      trace.moveTo(x * pixel, y * pixel);
      trace.lineTo((x - dx * length) * pixel, (y - dy * length) * pixel);
    }
    context.lineWidth = Math.max(.75, canvas.width / 1350);
    context.strokeStyle = 'rgba(203, 233, 255, .23)';
    context.stroke(filaments);
    context.strokeStyle = 'rgba(231, 247, 255, .42)';
    context.stroke(highlights);
  }

  function paintVelocityArrows() {
    const { u, v, solid } = tank;
    const pixel = canvas.width / width;
    const spacing = Math.round(width / 23);
    context.beginPath();
    for (let y = spacing; y < height; y += spacing) {
      for (let x = spacing; x < width; x += spacing) {
        const i = x + y * stride;
        if (solid[i]) continue;
        const dx = .5 * (u[i] + u[i + 1]);
        const dy = .5 * (v[i] + v[i + stride]);
        const speed = Math.hypot(dx, dy);
        if (speed < .055) continue;
        const length = Math.min(spacing * .9, 1.25 + speed * 2) * pixel;
        const horizontal = dx / speed, vertical = dy / speed;
        const tipX = (x + .5) * pixel + horizontal * length * .5;
        const tipY = (y + .5) * pixel + vertical * length * .5;
        const head = Math.min(length * .37, pixel * .8);
        context.moveTo(tipX - horizontal * length, tipY - vertical * length);
        context.lineTo(tipX, tipY);
        context.moveTo(tipX - head * (horizontal - vertical * .55), tipY - head * (vertical + horizontal * .55));
        context.lineTo(tipX, tipY);
        context.lineTo(tipX - head * (horizontal + vertical * .55), tipY - head * (vertical - horizontal * .55));
      }
    }
    context.strokeStyle = 'rgba(195, 249, 255, .57)';
    context.lineWidth = Math.max(1, canvas.width / 850);
    context.stroke();
  }

  function paintCylinder() {
    const w = canvas.width, h = canvas.height;
    const x = w * .55, y = h * .5, radius = tank.radius * w / width;
    const gradient = context.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    gradient.addColorStop(0, '#283959');
    gradient.addColorStop(.5, '#111a31');
    gradient.addColorStop(1, '#080d1f');
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = gradient;
    context.fill();
    context.strokeStyle = '#829cc2';
    context.lineWidth = Math.max(1.2, w / 850);
    context.stroke();
    context.beginPath();
    context.arc(x, y, radius * .83, 0, Math.PI * 2);
    context.moveTo(x - radius * .16, y);
    context.lineTo(x + radius * .16, y);
    context.moveTo(x, y - radius * .16);
    context.lineTo(x, y + radius * .16);
    context.strokeStyle = 'rgba(153, 180, 220, .35)';
    context.stroke();
  }

  function render(view, scale, showTracers) {
    const w = canvas.width, h = canvas.height;
    paintField(view, scale);
    context.drawImage(backdrop, 0, 0);
    context.save();
    context.globalCompositeOperation = 'screen';
    if (view === 'dye' && options.glow > 0) {
      // Two light scales: a sharp small halo and a wide soft atmospheric bloom.
      bloomContext.clearRect(0, 0, width, height);
      bloomContext.filter = 'blur(1.5px)';
      bloomContext.drawImage(field, 0, 0);
      context.globalAlpha = options.glow * .38;
      context.filter = 'blur(' + Math.round(w / 90) + 'px)';
      context.drawImage(bloom, 0, 0, w, h);
      context.filter = 'none';
      context.globalAlpha = options.glow * .5;
      context.drawImage(bloom, 0, 0, w, h);
    }
    context.globalAlpha = 1;
    context.drawImage(field, 0, 0, w, h);
    context.restore();
    if (showTracers && view === 'dye') paintTracers();
    if (view === 'velocity') paintVelocityArrows();
    if (tank.obstacle) paintCylinder();
  }

  return { advanceTracers, render, reset, resize, setOptions };
}
