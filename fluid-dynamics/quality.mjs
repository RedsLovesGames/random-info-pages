// Quality levels affect the solver grid and the display, not merely CSS magnification.
export const QUALITY = Object.freeze({
  eco: { width: 96, height: 64, iterations: 12, tracers: 400, renderScale: .75, mesh: 56 },
  balanced: { width: 156, height: 104, iterations: 19, tracers: 1700, renderScale: 1, mesh: 88 },
  high: { width: 216, height: 144, iterations: 24, tracers: 2900, renderScale: 1.25, mesh: 116 },
  ultra: { width: 288, height: 192, iterations: 30, tracers: 4500, renderScale: 1.6, mesh: 148 },
  cinematic: { width: 336, height: 224, iterations: 38, tracers: 6500, renderScale: 2, mesh: 180 }
});
export function qualityProfile(name, mobile) {
  const key = Object.hasOwn(QUALITY, name) ? name : 'balanced';
  const value = QUALITY[key];
  if (!mobile) return { ...value };
  const factor = { eco: .84, balanced: .70, high: .70, ultra: .65, cinematic: .64 }[key];
  const width = Math.max(64, Math.round(value.width * factor / 6) * 6);
  return {
    ...value, width, height: Math.round(width * 2 / 3),
    iterations: Math.max(11, Math.round(value.iterations * .8)),
    tracers: Math.round(value.tracers * .6),
    renderScale: Math.min(value.renderScale, 1.5),
    mesh: Math.min(value.mesh, 132)
  };
}
// Move an existing simulation to a new grid without throwing away the user's artwork.
export function transferFluidState(oldTank, newTank) {
  newTank.setObstacle(oldTank.obstacle);
  const sx = oldTank.width / newTank.width;
  const sy = oldTank.height / newTank.height;
  const w = newTank.width, h = newTank.height, s = newTank.stride;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = x + y * s;
    if (newTank.solid[i]) continue;
    const ox = (x + .5) * sx - .5, oy = (y + .5) * sy - .5;
    for (let c = 0; c < 3; c++) {
      newTank.dye[c][i] = oldTank.sample(oldTank.dye[c], ox, oy, oldTank.width - 1, oldTank.height - 1);
    }
    if (newTank.openU[i]) {
      newTank.u[i] = oldTank.sample(oldTank.u, x * sx, oy, oldTank.width, oldTank.height - 1) / sx;
    }
    if (newTank.openV[i]) {
      newTank.v[i] = oldTank.sample(oldTank.v, ox, y * sy, oldTank.width - 1, oldTank.height) / sy;
    }
  }
  newTank.project(Math.min(40, Math.max(16, Math.round(Math.sqrt(w * h) / 5))));
}
