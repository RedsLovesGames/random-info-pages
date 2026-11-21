import { sizes, templates } from './presets.mjs';

const type = {
  sans: 'Arial, sans-serif',
  serif: '"Instrument Serif", Georgia, serif',
  mono: '"Courier New", monospace',
  condensed: '"Arial Black", "DejaVu Sans", sans-serif',
  classic: 'Georgia, "Times New Roman", serif',
  rounded: '"Trebuchet MS", Arial, sans-serif',
};

function box(ctx, x, y, w, h, radius, color) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(radius, w / 2, h / 2));
  if (color) {
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function shade(hex, alpha) {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, '0');
}

function onColor(hex) {
  const rgb = hex.slice(1).match(/../g).map(value => {
    const n = parseInt(value, 16) / 255;
    return n < .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
  });
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .179 ? '#111222' : '#ffffff';
}

function write(ctx, label, x, y, width, size, color, { font = type.sans, weight = 700, align = 'left' } = {}) {
  const text = String(label).trim();
  if (!text || width <= 0) return;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.font = `${weight} ${size}px ${font}`;
  const fit = Math.max(size * .48, Math.min(size, size * width * .985 / Math.max(1, ctx.measureText(text).width)));
  ctx.font = `${weight} ${fit}px ${font}`;
  const letters = Array.from(text);
  const length = letters.length;
  while (letters.length > 1 && ctx.measureText(letters.join('') + (letters.length < length ? '…' : '')).width > width) {
    letters.pop();
  }
  ctx.fillText(letters.join('') + (letters.join('') === text ? '' : '…'), x, y, width);
}

function wrapped(ctx, text, x, y, w, maxHeight, color) {
  const size = 28;
  const lineHeight = 35;
  const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
  ctx.font = `400 ${size}px ${type.sans}`;
  const lines = text.trim().split('\n').flatMap(paragraph => {
    const rows = [];
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = [line, word].filter(Boolean).join(' ');
      if (line && ctx.measureText(next).width > w) {
        rows.push(line);
        line = word;
      } else line = next;
    }
    return [...rows, line];
  });
  lines.slice(0, maxLines).forEach((line, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? '…' : '';
    write(ctx, line + suffix, x, y + lineHeight * index, w, size, color, { weight: 400 });
  });
}

function line(ctx, x, y, toX, toY, color, width = 2) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(toX, toY);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function symbol(ctx, emblem, x, y, size, color) {
  if (emblem === 'none') return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 48, size / 48);
  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.7;
  if (emblem === 'orbit') {
    ctx.ellipse(0, 0, 25, 10, -.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
  } else if (emblem === 'flower') {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * i / 3;
      ctx.ellipse(Math.cos(a) * 12, Math.sin(a) * 12, 12, 6.5, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
    }
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
  } else if (emblem === 'heart') {
    ctx.moveTo(0, 20);
    ctx.bezierCurveTo(-44, -6, -15, -31, 0, -13);
    ctx.bezierCurveTo(15, -31, 44, -6, 0, 20);
  } else if (emblem === 'leaf') {
    ctx.moveTo(-19, 20);
    ctx.quadraticCurveTo(-22, -19, 22, -22);
    ctx.quadraticCurveTo(23, 17, -19, 20);
  } else {
    const paths = {
      bolt: [[6,-24],[-20,4],[-3,4],[-8,24],[20,-6],[3,-6]],
      crown: [[-23,-12],[-11,-3],[0,-18],[11,-3],[23,-12],[17,18],[-17,18]],
      diamond: [[0,-23],[17,0],[0,23],[-17,0]],
      spark: [[0,-24],[6,-6],[24,0],[6,6],[0,24],[-6,6],[-24,0],[-6,-6]],
      star: Array.from({ length: 10 }, (_, i) => {
        const angle = i * Math.PI / 5 - Math.PI / 2;
        const radius = i % 2 ? 10 : 24;
        return [Math.cos(angle) * radius, Math.sin(angle) * radius];
      }),
    };
    paths[emblem].forEach(([px, py], index) => index ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function cover(ctx, image, x, y, w, h, zoom = 1, panX = 50, panY = 50) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight) * zoom;
  const sourceW = w / scale;
  const sourceH = h / scale;
  ctx.drawImage(image, (image.naturalWidth - sourceW) * panX / 100, (image.naturalHeight - sourceH) * panY / 100, sourceW, sourceH, x, y, w, h);
}

function pattern(ctx, w, h, style) {
  const { accent, paper, intensity } = style;
  const power = intensity / 100;
  if (style.pattern === 'solid' || !power) return;
  const color = shade(accent, .55 * power);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  switch (style.pattern) {
    case 'gradient': {
      const gradient = ctx.createLinearGradient(0, h, w, 0);
      gradient.addColorStop(0, shade(paper, 0));
      gradient.addColorStop(1, shade(accent, .86 * power));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case 'grid':
      for (let x = 0; x < w; x += 48) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0; y < h; y += 48) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();
      break;
    case 'dots':
    case 'checker':
    case 'sparkles':
      for (let i = 0; i * 48 < w + 20; i++) {
        for (let j = 0; j * 48 < h + 20; j++) {
          const x = i * 48;
          const y = j * 48;
          if (style.pattern === 'checker') {
            if ((i + j) % 2 === 0) ctx.fillRect(x, y, 48, 48);
          } else if (style.pattern === 'sparkles') {
            if ((i * 2 + j) % 3 === 0) symbol(ctx, 'spark', x, y, 19, color);
          } else {
            ctx.moveTo(x + 4, y);
            ctx.arc(x, y, 4, 0, Math.PI * 2);
          }
        }
      }
      if (style.pattern === 'dots') ctx.fill();
      break;
    case 'stripes':
      ctx.lineWidth = 12;
      for (let x = -h; x < w; x += 45) { ctx.moveTo(x, h); ctx.lineTo(x + h, 0); }
      ctx.stroke();
      break;
    case 'rings':
      ctx.lineWidth = 4;
      for (let r = 45; r < Math.hypot(w, h); r += 44) {
        ctx.moveTo(w * .84 + r, h * .32);
        ctx.arc(w * .84, h * .32, r, 0, Math.PI * 2);
      }
      ctx.stroke();
      break;
    case 'rays':
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8;
        const r = Math.hypot(w, h);
        ctx.moveTo(w * .64, h * .35);
        ctx.arc(w * .64, h * .35, r, a, a + Math.PI / 19);
        ctx.closePath();
      }
      ctx.fill();
      break;
    case 'waves':
      ctx.lineWidth = 3.5;
      for (let y = -32; y < h + 32; y += 41) {
        ctx.moveTo(0, y);
        for (let x = 0; x < w; x += 120) ctx.bezierCurveTo(x + 40, y - 36, x + 80, y + 36, x + 120, y);
      }
      ctx.stroke();
      break;
  }
}

function drawPhoto(ctx, image, area, style, name) {
  const { x, y, w, h } = area;
  const { shape, accent, paper, photoZoom, photoX, photoY } = style;
  ctx.save();
  if (shape === 'circle') {
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
  } else if (shape === 'arch') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, [w / 2, w / 2, 12, 12]);
  } else box(ctx, x, y, w, h, shape === 'square' ? 0 : 22);
  ctx.clip();
  if (image) {
    cover(ctx, image, x, y, w, h, photoZoom, photoX, photoY);
  } else {
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(1, shade(paper, .4));
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
    const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join('').toUpperCase();
    if (initials) {
      write(ctx, initials, x + w / 2, y + h / 2 + 4, w * .85, h * .37, onColor(accent), { font: type[style.font], align: 'center' });
    } else symbol(ctx, style.emblem === 'none' ? 'spark' : style.emblem, x + w / 2, y + h / 2, Math.min(w, h) * .42, onColor(accent));
  }
  ctx.restore();
}

function drawMark(ctx, logo, emblem, x, y, size, color) {
  if (logo) {
    const scale = Math.min(size / logo.naturalWidth, size / logo.naturalHeight);
    const w = logo.naturalWidth * scale;
    const h = logo.naturalHeight * scale;
    ctx.drawImage(logo, x - w / 2, y - h / 2, w, h);
  } else symbol(ctx, emblem, x, y, size, color);
}

function trimmedFields(project, side) {
  return project.fields.filter(field => field.value.trim() && (field.side === side || field.side === 'both'));
}

function drawFields(ctx, fields, area, style, center = false, maxColumns = 2) {
  if (!fields.length) return;
  const { x, y, w, h } = area;
  const cols = fields.length === 1 ? 1 : maxColumns;
  const rows = Math.ceil(fields.length / cols);
  const step = Math.min(74, h / rows);
  const gap = cols > 1 ? 20 : 0;
  const cell = (w - gap) / cols;
  fields.forEach(({ label, value }, i) => {
    const posX = x + (i % cols) * (cell + gap) + (center ? cell / 2 : 0);
    const posY = y + Math.floor(i / cols) * step;
    const align = center ? 'center' : 'left';
    write(ctx, (label.trim() || 'Other').toUpperCase(), posX, posY + step * .22, cell, Math.min(18, step * .32), style.ink, { font: type.mono, align });
    write(ctx, value, posX, posY + step * .62, cell, Math.min(30, step * .49), style.ink, { align });
  });
}

function drawFront(ctx, project, w, h, assets, style) {
  const { paper, ink, accent, emblem, font, layout, shape } = style;
  const title = project.title.trim() || templates[project.template].title;
  const name = project.name.trim() || 'Your name';
  const m = w < 760 ? 38 : 48;
  const narrow = h > w * 1.1;
  const centered = layout === 'profile' || narrow;
  const isPoster = layout === 'poster' && shape !== 'none';
  const band = layout === 'banner';
  const ticket = layout === 'ticket';
  const stamp = layout === 'stamp';
  const fw = w - 2 * m;
  const headY = band ? 116 : 100;
  const contentTop = band ? 204 : 180;
  const bottom = h - 79;
  const fields = trimmedFields(project, 'front');
  const hasLogo = Boolean(assets.logo) || emblem !== 'none';

  if (isPoster) {
    if (assets.photo) {
      cover(ctx, assets.photo, 0, 0, w, h, style.photoZoom, style.photoX, style.photoY);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, accent);
      gradient.addColorStop(.6, paper);
      gradient.addColorStop(1, accent);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
      pattern(ctx, w, h, style);
      if (assets.background) drawBackgroundImage(ctx, assets.background, w, h, style);
      symbol(ctx, emblem === 'none' ? 'spark' : emblem, w * .7, h * .41, Math.min(w, h) * .31, shade(onColor(paper), .56));
    }
    const overlay = ctx.createLinearGradient(0, 0, 0, h);
    overlay.addColorStop(0, '#0b0c17ed');
    overlay.addColorStop(.34, '#0b0c1730');
    overlay.addColorStop(.45, '#0b0c1750');
    overlay.addColorStop(.74, '#0b0c17e8');
    overlay.addColorStop(1, '#0b0c17fa');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, w, h);
    const white = '#ffffff';
    drawMark(ctx, assets.logo, emblem, w - m - 25, headY - 11, 48, white);
    write(ctx, project.organization, m, 52, fw - 64, 22, white, { font: type.mono });
    write(ctx, title, m, headY, fw - (hasLogo ? 64 : 0), 57, white, { font: type[font] });
    const fieldHeight = Math.ceil(fields.length / 2) * 62;
    const nameY = bottom - 52 - (project.role.trim() ? 44 : 0) - fieldHeight;
    write(ctx, name, m, nameY, fw, 86, white, { font: type[font] });
    write(ctx, project.role, m, nameY + 59, fw, 32, white, { weight: 400 });
    drawFields(ctx, fields, { x: m, y: bottom - fieldHeight, w: fw, h: fieldHeight }, { ink: white });
    drawFooter(ctx, w, h, m, white, project.serial);
    return;
  }

  if (stamp) {
    box(ctx, 19, 19, w - 38, h - 38, 18);
    ctx.lineWidth = 4;
    ctx.strokeStyle = accent;
    ctx.stroke();
    box(ctx, 29, 29, w - 58, h - 58, 13);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const headInk = band ? onColor(accent) : ink;
  if (band) box(ctx, 18, 18, w - 36, 153, 19, accent);
  if (ticket && !narrow) {
    ctx.save();
    ctx.setLineDash([12, 10]);
    line(ctx, w - m - 88, 31, w - m - 88, bottom - 12, shade(ink, .55), 2);
    ctx.restore();
    ctx.save();
    ctx.translate(w - m - 43, (bottom + 29) / 2);
    ctx.rotate(Math.PI / 2);
    write(ctx, 'ADMIT ONE', 0, 0, 250, 27, ink, { align: 'center', font: type.mono });
    ctx.restore();
  }

  const availableW = fw - (ticket && !narrow ? 117 : 0);
  drawMark(ctx, assets.logo, emblem, m + availableW - 26, headY - 9, 56, headInk);
  write(ctx, project.organization, m, band ? 65 : 55, availableW - (hasLogo ? 78 : 0), 23, headInk, { font: type.mono });
  write(ctx, title, m, headY, availableW - (hasLogo ? 76 : 0), band ? 75 : 62, headInk, { font: type[font] });
  if (!band) line(ctx, m, 141, m + availableW, 141, shade(ink, .36));

  const contentHeight = bottom - contentTop;
  let textX = m;
  let textW = availableW;
  let textTop = contentTop;
  if (shape !== 'none') {
    if (centered) {
      const imageH = Math.min(335, Math.max(136, contentHeight - (145 + Math.ceil(fields.length / 2) * 54)) * (narrow ? .86 : .75));
      const imageW = shape === 'circle' ? imageH : imageH * (shape === 'arch' ? .85 : 1.08);
      drawPhoto(ctx, assets.photo, { x: m + (availableW - imageW) / 2, y: contentTop, w: imageW, h: imageH }, style, project.name);
      textTop += imageH + (narrow ? 31 : 18);
    } else {
      const imageW = Math.min(305, availableW * (ticket ? .27 : .32));
      const imageH = shape === 'circle' ? imageW : Math.min(contentHeight - 12, imageW * 1.33);
      const photoRight = stamp;
      const x = photoRight ? m + availableW - imageW : m;
      drawPhoto(ctx, assets.photo, { x, y: contentTop + (contentHeight - imageH) / 2, w: imageW, h: imageH }, style, project.name);
      textX += photoRight ? 0 : imageW + 36;
      textW -= imageW + 36;
    }
  }
  if (!centered) textTop += fields.length ? 30 : contentHeight * .23;
  const align = centered ? 'center' : 'left';
  const anchor = centered ? textX + textW / 2 : textX;
  const nameSize = narrow ? 82 : centered ? 66 : 83;
  write(ctx, name, anchor, textTop + 37, textW, nameSize, ink, { font: type[font], align });
  const hasRole = Boolean(project.role.trim());
  write(ctx, project.role, anchor, textTop + 91, textW, 33, ink, { weight: 400, align });
  const fieldTop = textTop + (hasRole ? 120 : 82);
  drawFields(ctx, fields, { x: textX, y: fieldTop, w: textW, h: Math.max(1, bottom - fieldTop) }, style, centered);
  drawFooter(ctx, w, h, m, ink, project.serial);
}

function drawFooter(ctx, w, h, m, ink, serial) {
  line(ctx, m, h - 70, w - m, h - 70, shade(ink, .48));
  write(ctx, 'NOVELTY ID', m, h - 44, (w - 2 * m) / 2, 24, ink, { font: type.mono });
  write(ctx, serial, w - m, h - 44, (w - 2 * m) / 2 - 12, 25, ink, { font: type.mono, align: 'right' });
}

function drawCode(ctx, code, area) {
  const { x, y, w, h } = area;
  const scale = Math.min(w / code.width, h / code.height);
  const outW = Math.floor(code.width * scale);
  const outH = Math.floor(code.height * scale);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(code, Math.round(x + (w - outW) / 2), Math.round(y + (h - outH) / 2), outW, outH);
  ctx.restore();
}

function drawBackgroundImage(ctx, image, w, h, style) {
  ctx.save();
  ctx.globalAlpha = style.backgroundOpacity / 100;
  cover(ctx, image, 0, 0, w, h);
  ctx.restore();
}

function drawBack(ctx, project, w, h, assets, style) {
  const { accent, ink, emblem, font } = style;
  const title = project.back.title.trim() || project.title.trim() || templates[project.template].title;
  const fields = trimmedFields(project, 'back');
  const m = w < 760 ? 38 : 48;
  const fw = w - 2 * m;
  const wide = w > h;
  const code = assets.code;
  const qr = project.back.code === 'qr';
  const minimal = project.back.design === 'minimal';
  const headInk = minimal ? ink : onColor(accent);
  if (minimal) line(ctx, m, 164, w - m, 164, shade(ink, .45));
  else box(ctx, 18, 18, w - 36, 146, 17, accent);
  drawMark(ctx, assets.logo, emblem, w - m - 28, 99, 56, headInk);
  write(ctx, project.organization, m, 62, fw - 74, 21, headInk, { font: type.mono });
  write(ctx, title, m, 111, fw - (assets.logo || emblem !== 'none' ? 74 : 0), 67, headInk, { font: type[font] });

  const contentTop = 197;
  const bottom = h - 84;
  const codeW = qr ? 284 : wide ? 375 : 470;
  const codeH = qr ? 284 : 114;
  const textW = code && wide ? fw - codeW - 35 : fw;
  const textBottom = code && !wide ? bottom - codeH - 12 : bottom;
  const fieldHeight = Math.min((textBottom - contentTop) * .68, Math.ceil(fields.length / 2) * 65);
  const notesHeight = textBottom - contentTop - fieldHeight - 18;
  if (project.back.note.trim()) wrapped(ctx, project.back.note, m, contentTop + 18, textW, notesHeight, ink);
  const fieldsTop = project.back.note.trim() ? textBottom - fieldHeight : contentTop;
  drawFields(ctx, fields, { x: m, y: fieldsTop, w: textW, h: fieldHeight }, style);
  if (code) drawCode(ctx, code, {
    x: wide ? w - m - codeW : (w - codeW) / 2,
    y: wide ? contentTop + (bottom - contentTop - codeH) / 2 : bottom - codeH,
    w: codeW, h: codeH,
  });
  drawFooter(ctx, w, h, m, ink, project.serial);
}

export function drawCard(canvas, project, side = 'front', assets = {}, scale = 1) {
  const base = project.style;
  const style = side === 'back' && project.back.design === 'inverse'
    ? { ...base, ink: base.paper, paper: base.ink } : base;
  const { width: w, height: h } = sizes[style.size];
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  box(ctx, 0, 0, w, h, style.corners, style.paper);
  ctx.clip();
  pattern(ctx, w, h, style);
  const edgeToEdge = side === 'front' && style.layout === 'poster' && style.shape !== 'none';
  if (assets.background && !edgeToEdge) drawBackgroundImage(ctx, assets.background, w, h, style);
  if (side === 'back') drawBack(ctx, project, w, h, assets, style);
  else drawFront(ctx, project, w, h, assets, style);
  ctx.restore();
  return true;
}

export function cardDescription(project, side) {
  const title = project.title.trim() || templates[project.template].title;
  const body = side === 'front' ? [project.name || 'Your name', project.role] : [project.back.note];
  const fields = trimmedFields(project, side).map(({ label, value }) => (label.trim() || 'Other') + ': ' + value);
  return [side === 'front' ? 'Front' : 'Back', 'Novelty ID', side === 'front' ? title : project.back.title || title,
    project.organization, ...body, ...fields, project.serial].filter(Boolean).join(', ');
}
