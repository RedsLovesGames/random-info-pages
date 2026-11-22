import { makeRng } from './generator.mjs';

function fragment(context, size, rng) {
  let x = rng.f(-0.1, 0.88);
  let y = rng.f(0, 0.95);
  context.beginPath();
  context.moveTo(x * size, y * size);
  for (let step = 0; step < 3; step++) {
    x += rng.f(0.06, 0.19);
    y += rng.f(-0.15, 0.15);
    context.lineTo(x * size, y * size);
  }
  context.stroke();
}

function stone(context, size, palette, rng, wall) {
  const bevel = context.createLinearGradient(0, 0, size, size);
  bevel.addColorStop(0, wall ? palette.cap : rng.pick(palette.floor));
  bevel.addColorStop(1, wall ? palette.wall : rng.pick(palette.floor));
  context.fillStyle = bevel;
  context.fillRect(0, 0, size, size);
  const grout = Math.max(0.45, size * 0.038);
  context.fillStyle = wall ? '#111a216b' : '#1f282535';
  context.fillRect(0, size - grout, size, grout);
  context.fillRect(size - grout, 0, grout, size);
  context.fillStyle = '#ffffff20';
  context.fillRect(0, 0, size - grout, grout);
  context.fillRect(0, 0, grout, size - grout);

  context.lineWidth = Math.max(0.4, size * 0.022);
  context.strokeStyle = wall ? '#ffffff25' : palette.vein;
  for (let seam = 0; seam < (wall ? 3 : 2); seam++) fragment(context, size, rng);
  for (let i = 0; i < 27; i++) {
    context.fillStyle = i % 2 ? '#ffffff16' : '#11172328';
    const diameter = rng.f(0.025, 0.065) * size;
    context.fillRect(rng.f(0.06, 0.9) * size, rng.f(0.06, 0.9) * size, diameter, diameter * rng.f(0.4, 1));
  }
}

function liquid(context, size, palette, rng, frozen) {
  const fill = context.createLinearGradient(0, 0, size, size);
  fill.addColorStop(0, frozen ? '#8aadb7' : palette.pool);
  fill.addColorStop(1, frozen ? '#426b80' : palette.poolLow);
  context.fillStyle = fill;
  context.fillRect(0, 0, size, size);
  context.strokeStyle = frozen ? '#d9f3ff90' : palette.ripple;
  context.lineWidth = Math.max(0.55, size * 0.035);
  if (frozen) {
    for (let seam = 0; seam < 3; seam++) fragment(context, size, rng);
    return;
  }
  for (let row = 0; row < 3; row++) {
    const y = (row + rng.f(0.15, 0.7)) * size / 3;
    context.beginPath();
    context.moveTo(0, y);
    context.bezierCurveTo(size * 0.26, y - size * 0.22, size * 0.6, y + size * 0.18, size, y);
    context.stroke();
  }
}

export function textureAtlas(palette, pixels, canvasDocument) {
  const create = (offset, paint) => Array.from({ length: 8 }, (_, variant) => {
    const tile = canvasDocument.createElement('canvas');
    tile.width = tile.height = pixels;
    paint(tile.getContext('2d'), pixels, palette, makeRng(offset + variant));
    return tile;
  });
  return {
    floor: create(4813, stone),
    wall: create(911, (ctx, size, colors, rng) => stone(ctx, size, colors, rng, true)),
    pool: create(401, liquid),
    ice: create(517, (ctx, size, colors, rng) => liquid(ctx, size, colors, rng, true))
  };
}
