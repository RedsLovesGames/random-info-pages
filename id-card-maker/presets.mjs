export const layouts = {
  split: 'Classic split', banner: 'Header band', profile: 'Centered profile',
  ticket: 'Ticket stub', poster: 'Edge-to-edge photo', stamp: 'Framed stamp',
};

export const patterns = {
  solid: 'Solid', gradient: 'Gradient', grid: 'Grid', dots: 'Dots', stripes: 'Diagonal',
  rings: 'Orbit rings', rays: 'Sunburst', waves: 'Waves', checker: 'Checkerboard', sparkles: 'Stars',
};

export const fonts = {
  sans: 'Modern sans', serif: 'Editorial serif', mono: 'Monospace',
  condensed: 'Heavy display', classic: 'Classic serif', rounded: 'Rounded',
};

export const emblems = {
  none: 'None', star: 'Star', bolt: 'Lightning', heart: 'Heart', orbit: 'Orbit',
  diamond: 'Diamond', flower: 'Flower', crown: 'Crown', leaf: 'Leaf', spark: 'Spark',
};

export const palettes = {
  cobalt: ['#e5e9fc', '#1f2b68', '#3146d6'],
  evergreen: ['#e6f2ed', '#183f35', '#216951'],
  paprika: ['#fde8e3', '#54261e', '#9f3825'],
  terminal: ['#101d19', '#e0fce9', '#79f89f'],
  midnight: ['#171736', '#fbf0ff', '#be9afa'],
  citrus: ['#fff6cf', '#402a11', '#d1671b'],
  hotpink: ['#33112f', '#fff1fa', '#ff8bc5'],
  glacier: ['#d9f2ff', '#092b48', '#117291'],
  newsprint: ['#f5edde', '#352820', '#714939'],
  bubblegum: ['#ffe6ed', '#471c42', '#ac2b77'],
  graphite: ['#191f27', '#f1f5f9', '#f3a86d'],
  beach: ['#ecf7e5', '#163b32', '#347360'],
  violet: ['#efe7ff', '#382053', '#753bc5'],
  cherry: ['#fceada', '#51221b', '#b0333a'],
};

const preset = (title, category, palette, layout, pattern, font, emblem, shape = 'rounded', size = 'landscape') =>
  ({ title, category, palette, layout, pattern, font, emblem, shape, size });

export const templates = {
  club: preset('Club Badge', 'Everyday', 'cobalt', 'banner', 'gradient', 'serif', 'star'),
  conference: preset('Conference Crew', 'Events', 'graphite', 'profile', 'rays', 'condensed', 'bolt', 'circle', 'portrait'),
  arcade: preset('Arcade Pass', 'Gaming', 'midnight', 'ticket', 'checker', 'mono', 'bolt'),
  yapper: preset('Certified Yapper', 'Funny', 'paprika', 'stamp', 'dots', 'serif', 'heart', 'circle'),
  npc: preset('NPC License', 'Funny', 'evergreen', 'split', 'grid', 'mono', 'diamond'),
  creator: preset('Creator Pass', 'Events', 'hotpink', 'poster', 'sparkles', 'condensed', 'spark', 'square', 'portrait'),
  campus: preset('Campus Club', 'Everyday', 'newsprint', 'split', 'solid', 'classic', 'leaf', 'square'),
  studio: preset('Studio Member', 'Everyday', 'violet', 'profile', 'rings', 'serif', 'flower', 'circle'),
  volunteer: preset('Volunteer Badge', 'Everyday', 'beach', 'banner', 'waves', 'rounded', 'heart', 'circle'),
  press: preset('Press Pass', 'Events', 'glacier', 'ticket', 'stripes', 'condensed', 'bolt', 'square'),
  backstage: preset('Backstage Pass', 'Events', 'graphite', 'poster', 'gradient', 'condensed', 'star', 'square', 'portrait'),
  festival: preset('Festival Pass', 'Events', 'citrus', 'profile', 'waves', 'rounded', 'spark', 'arch', 'portrait'),
  tournament: preset('Tournament Pass', 'Gaming', 'terminal', 'split', 'grid', 'mono', 'bolt', 'square'),
  guild: preset('Guild Member', 'Gaming', 'newsprint', 'stamp', 'rings', 'classic', 'crown', 'arch'),
  quest: preset('Quest Permit', 'Gaming', 'cherry', 'banner', 'stripes', 'condensed', 'diamond'),
  cat: preset('Certified Cat', 'Funny', 'bubblegum', 'profile', 'sparkles', 'rounded', 'heart', 'circle', 'square'),
  snack: preset('Snack Inspector', 'Funny', 'citrus', 'stamp', 'checker', 'rounded', 'star', 'arch'),
  chaos: preset('Chaos Coordinator', 'Funny', 'hotpink', 'ticket', 'rays', 'condensed', 'bolt', 'square'),
  space: preset('Space Crew', 'Fictional', 'midnight', 'split', 'rings', 'mono', 'orbit', 'arch'),
  research: preset('Research Division', 'Fictional', 'glacier', 'banner', 'grid', 'sans', 'orbit', 'square'),
  botanical: preset('Botanical Society', 'Fictional', 'beach', 'stamp', 'waves', 'classic', 'leaf', 'arch'),
  afterhours: preset('After Hours', 'Fictional', 'hotpink', 'poster', 'rays', 'serif', 'spark', 'square', 'portrait'),
  library: preset('Midnight Library', 'Fictional', 'violet', 'profile', 'sparkles', 'classic', 'star', 'arch', 'portrait'),
  blank: preset('Blank Canvas', 'Everyday', 'graphite', 'split', 'solid', 'sans', 'none', 'square'),
};

export const sizes = {
  landscape: { width: 1080, height: 680, mmWidth: 85.6, mmHeight: 53.98, label: 'Landscape' },
  portrait: { width: 680, height: 1080, mmWidth: 53.98, mmHeight: 85.6, label: 'Portrait' },
  square: { width: 850, height: 850, mmWidth: 70, mmHeight: 70, label: 'Square' },
};

export const backStyles = { standard: 'Match the front', inverse: 'Reverse the colors', minimal: 'Minimal header' };

export const shapes = { rounded: 'Rounded', square: 'Rectangle', circle: 'Circle', arch: 'Arch', none: 'Hidden' };

export function presetStyle(key) {
  const { title, category, palette, ...style } = templates[key];
  const [paper, ink, accent] = palettes[palette];
  return { ...style, paper, ink, accent, palette, corners: 28, intensity: 32, photoZoom: 1, photoX: 50, photoY: 50, backgroundOpacity: 55 };
}

export function newProject() {
  return {
    version: 1, template: 'club', title: '', name: '', role: '', organization: '', serial: '',
    style: presetStyle('club'), fields: [{ label: '', value: '', side: 'front' }],
    back: { title: '', note: '', design: 'standard', code: 'none', payload: '', useSerial: false },
    images: { photo: '', logo: '', background: '' },
  };
}

export const limits = {
  title: 56, name: 70, role: 56, organization: 56, serial: 24,
  fieldLabel: 20, fieldValue: 48, backTitle: 52, backNote: 320, payload: 240,
};

const MAX_IMAGE_LENGTH = 2100000;
const allowed = (values, input, fallback) => Object.hasOwn(values, input) ? input : fallback;
const string = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';
const number = (input, fallback, min, max) => typeof input === 'number' && Number.isFinite(input)
  ? Math.max(min, Math.min(max, input)) : fallback;

export function validateProject(input) {
  if (!input || input.version !== 1 || !input.style || !input.back || !input.images || !Array.isArray(input.fields)) {
    throw new Error('Choose a project JSON file saved from this editor.');
  }
  const template = allowed(templates, input.template, 'club');
  const baseline = presetStyle(template);
  const style = input.style;
  for (const [key, choices] of Object.entries({ layout: layouts, pattern: patterns, font: fonts, emblem: emblems, shape: shapes, size: sizes })) {
    baseline[key] = allowed(choices, style[key], baseline[key]);
  }
  for (const key of ['paper', 'ink', 'accent']) {
    if (typeof style[key] === 'string' && /^#[0-9a-f]{6}$/i.test(style[key])) baseline[key] = style[key];
  }
  baseline.palette = Object.keys(palettes).find(key =>
    palettes[key].every((color, i) => color === baseline[['paper', 'ink', 'accent'][i]])) || 'custom';
  for (const [key, min, max] of [
    ['corners', 0, 48], ['intensity', 0, 100], ['photoZoom', 1, 3],
    ['photoX', 0, 100], ['photoY', 0, 100], ['backgroundOpacity', 0, 100],
  ]) baseline[key] = number(style[key], baseline[key], min, max);
  return {
    version: 1, template, style: baseline,
    ...Object.fromEntries(['title', 'name', 'role', 'organization', 'serial'].map(key => [key, string(input[key], limits[key])])),
    fields: input.fields.slice(0, 6).map(item => ({
      label: string(item?.label, limits.fieldLabel), value: string(item?.value, limits.fieldValue),
      side: ['front', 'back', 'both'].includes(item?.side) ? item.side : 'front',
    })),
    back: {
      title: string(input.back.title, limits.backTitle), note: string(input.back.note, limits.backNote),
      design: allowed(backStyles, input.back.design, 'standard'),
      code: ['qr', 'code128'].includes(input.back.code) ? input.back.code : 'none',
      payload: string(input.back.payload, limits.payload), useSerial: input.back.useSerial === true,
    },
    images: Object.fromEntries(['photo', 'logo', 'background'].map(key => {
      const image = input.images[key];
      return [key, typeof image === 'string' && image.length <= MAX_IMAGE_LENGTH &&
        /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image) ? image : ''];
    })),
  };
}
