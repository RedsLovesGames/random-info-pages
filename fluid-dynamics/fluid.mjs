// Staggered grid: pressure and dye at cell centers, velocity at cell faces.
// Distances are in cells and velocities in cells per simulation step.
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export class FluidTank {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.stride = width + 1;
    const size = this.stride * (height + 1);
    const field = () => new Float32Array(size);
    this.u = field();
    this.v = field();
    this.nextU = field();
    this.nextV = field();
    this.pressure = field();
    this.divergence = field();
    this.dye = [field(), field(), field()];
    this.nextDye = [field(), field(), field()];
    this.solid = new Uint8Array(size);
    this.neighbors = new Uint8Array(size);
    this.openU = new Uint8Array(size);
    this.openV = new Uint8Array(size);
    this.setObstacle(false);
  }

  setObstacle(enabled) {
    const { width, height, stride, solid, neighbors, openU, openV } = this;
    this.obstacle = enabled;
    this.radius = Math.min(width, height) * .115;
    solid.fill(0);
    neighbors.fill(0);
    openU.fill(0);
    openV.fill(0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = x + y * stride;
        if (enabled && Math.hypot(x + .5 - width * .55, y + .5 - height * .5) <= this.radius) solid[i] = 1;
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = x + y * stride;
        if (solid[i]) {
          for (const color of this.dye) color[i] = 0;
          continue;
        }
        if (x > 0 && !solid[i - 1]) openU[i] = 1;
        if (y > 0 && !solid[i - stride]) openV[i] = 1;
        neighbors[i] = openU[i] + openV[i]
          + Number(x + 1 < width && !solid[i + 1])
          + Number(y + 1 < height && !solid[i + stride]);
      }
    }
    for (let i = 0; i < this.u.length; i++) {
      if (!openU[i]) this.u[i] = 0;
      if (!openV[i]) this.v[i] = 0;
    }
    this.pressure.fill(0);
  }

  clear() {
    for (const field of [this.u, this.v, this.pressure, this.divergence, ...this.dye]) field.fill(0);
  }

  brush(x, y, radius, apply) {
    const { width, height, stride } = this;
    const centerX = x * width, centerY = y * height;
    const extent = Math.ceil(radius * 2);
    for (let row = Math.max(0, Math.floor(centerY - extent)); row < Math.min(height, centerY + extent); row++) {
      for (let col = Math.max(0, Math.floor(centerX - extent)); col < Math.min(width, centerX + extent); col++) {
        const dx = (col + .5 - centerX) / radius;
        const dy = (row + .5 - centerY) / radius;
        apply(col + row * stride, Math.exp(-1.4 * (dx * dx + dy * dy)), dx, dy);
      }
    }
  }

  addImpulse(x, y, dx, dy, radius, spin = 0) {
    this.brush(x, y, radius, (i, weight, ox, oy) => {
      if (this.openU[i]) this.u[i] = clamp(this.u[i] + (dx - oy * spin) * weight, -9, 9);
      if (this.openV[i]) this.v[i] = clamp(this.v[i] + (dy + ox * spin) * weight, -9, 9);
    });
  }

  addDye(x, y, radius, color, amount) {
    this.brush(x, y, radius, (i, weight) => {
      if (this.solid[i]) return;
      for (let channel = 0; channel < 3; channel++) {
        const field = this.dye[channel];
        field[i] = Math.min(4, field[i] + color[channel] * weight * amount);
      }
    });
  }

  measureDivergence() {
    const { width, height, stride, solid, u, v, divergence } = this;
    let squares = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = x + y * stride;
        const value = solid[i] ? 0 : u[i + 1] - u[i] + v[i + stride] - v[i];
        divergence[i] = value;
        squares += value * value;
      }
    }
    return Math.sqrt(squares / (width * height));
  }

  divergenceRms() {
    return this.measureDivergence();
  }

  project(iterations) {
    const { width, height, stride, u, v, pressure, divergence, neighbors, openU, openV } = this;
    this.measureDivergence();
    pressure.fill(0);
    // Solve the pressure Poisson equation with successive over-relaxation.
    for (let iteration = 0; iteration < iterations; iteration++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = x + y * stride;
          const count = neighbors[i];
          if (!count) continue;
          const sum = (openU[i] ? pressure[i - 1] : 0) + (openU[i + 1] ? pressure[i + 1] : 0)
            + (openV[i] ? pressure[i - stride] : 0) + (openV[i + stride] ? pressure[i + stride] : 0);
          pressure[i] += 1.72 * ((sum - divergence[i]) / count - pressure[i]);
        }
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = x + y * stride;
        if (openU[i]) u[i] -= pressure[i] - pressure[i - 1];
        if (openV[i]) v[i] -= pressure[i] - pressure[i - stride];
      }
    }
  }

  sample(field, x, y, xLimit, yLimit) {
    x = clamp(x, 0, xLimit);
    y = clamp(y, 0, yLimit);
    const col = Math.floor(x), row = Math.floor(y);
    const right = Math.min(col + 1, xLimit);
    const bottom = Math.min(row + 1, yLimit) * this.stride;
    const top = row * this.stride;
    const tx = x - col, ty = y - row;
    return (1 - ty) * ((1 - tx) * field[top + col] + tx * field[top + right])
      + ty * ((1 - tx) * field[bottom + col] + tx * field[bottom + right]);
  }

  blockedTrace(x, y, backX, backY) {
    if (!this.obstacle) return false;
    const dx = backX - x, dy = backY - y;
    const ox = x - this.width * .55, oy = y - this.height * .5;
    const travel = Math.max(.0001, dx * dx + dy * dy);
    const closest = clamp(-(ox * dx + oy * dy) / travel, 0, 1);
    const cx = ox + closest * dx, cy = oy + closest * dy;
    return cx * cx + cy * cy <= this.radius * this.radius;
  }

  advectVelocity(viscosity) {
    const { width, height, stride, u, v, nextU, nextV, openU, openV } = this;
    const diffusion = viscosity / (1 + 4 * viscosity);
    const uPrevious = nextU, vPrevious = nextV;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = x + y * stride;
        if (openU[i]) {
          const dy = .25 * (v[i - 1] + v[i] + v[i + stride - 1] + v[i + stride]);
          const backX = x - u[i], backY = y + .5 - dy;
          uPrevious[i] = this.blockedTrace(x, y + .5, backX, backY)
            ? u[i] : this.sample(u, backX, backY - .5, width, height - 1);
        } else uPrevious[i] = 0;
        if (openV[i]) {
          const dx = .25 * (u[i - stride] + u[i - stride + 1] + u[i] + u[i + 1]);
          const backX = x + .5 - dx, backY = y - v[i];
          vPrevious[i] = this.blockedTrace(x + .5, y, backX, backY)
            ? v[i] : this.sample(v, backX - .5, backY, width - 1, height);
        } else vPrevious[i] = 0;
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = x + y * stride;
        const diffuse = field => field[i] + diffusion * (
          (x ? field[i - 1] : 0) + field[i + 1] + (y ? field[i - stride] : 0) + field[i + stride] - 4 * field[i]
        );
        if (openU[i]) u[i] = .996 * diffuse(uPrevious);
        if (openV[i]) v[i] = .996 * diffuse(vPrevious);
      }
    }
  }

  step({ viscosity, retention, iterations }) {
    this.advectVelocity(viscosity);
    this.project(iterations);
    const { width, height, stride, u, v, solid, dye, nextDye } = this;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = x + y * stride;
        if (solid[i]) {
          for (const channel of nextDye) channel[i] = 0;
          continue;
        }
        const backX = x - .5 * (u[i] + u[i + 1]);
        const backY = y - .5 * (v[i] + v[i + stride]);
        const blocked = this.blockedTrace(x + .5, y + .5, backX + .5, backY + .5);
        for (let channel = 0; channel < 3; channel++) {
          nextDye[channel][i] = retention * (blocked ? dye[channel][i]
            : this.sample(dye[channel], backX, backY, width - 1, height - 1));
        }
      }
    }
    this.dye = nextDye;
    this.nextDye = dye;
  }

  curl(x, y) {
    const { width, height, stride, u, v } = this;
    const left = Math.max(0, x - 1), right = Math.min(width - 1, x + 1);
    const top = Math.max(0, y - 1) * stride, bottom = Math.min(height - 1, y + 1) * stride;
    const i = y * stride;
    // Canvas y points down, so positive curl is clockwise on screen.
    return .25 * (v[i + right] + v[i + right + stride] - v[i + left] - v[i + left + stride]
      - u[bottom + x] - u[bottom + x + 1] + u[top + x] + u[top + x + 1]);
  }
}
