const action = (id, title, group, aliases = [], extra = {}) => ({ id, title, group, aliases, ...extra });

export const TOOLBOX_REGISTRY = [
  {
    id: 'time', title: 'Time & Scheduling', route: './time/', description: 'World time, availability, date math, timestamps, and scheduling.',
    type: 'scenario', privacy: 'Local', available: true, keywords: ['time zone', 'clock', 'date', 'schedule', 'availability'],
    actions: [
      action('world-time', 'World Time', 'time', ['timezone', 'clock', 'world clock'], { available: true }),
      action('availability', 'Availability', 'time', ['overlap', 'working hours'], { available: true }),
      action('date-math', 'Date Math', 'date', ['days between', 'age', 'business days']),
      action('timestamp', 'Timestamp', 'date', ['unix', 'iso 8601', 'utc']),
      action('calendar', 'Calendar Event', 'schedule', ['ics', 'rrule', 'recurring event']),
      action('cron', 'Cron Builder', 'schedule', ['cron expression']),
    ],
  },
  {
    id: 'image', title: 'Image Studio', route: './image/', description: 'Edit, convert, compress, inspect, and create images locally.',
    type: 'asset', privacy: 'On device', available: true, keywords: ['image', 'photo', 'png', 'jpeg', 'webp', 'gif'],
    actions: [
      action('resize', 'Resize', 'transform', ['image resize'], { available: true, accepts: ['image'] }),
      action('crop', 'Crop / Rotate', 'transform', ['crop image', 'rotate image'], { available: true, accepts: ['image'] }),
      action('compress', 'Compress', 'output', ['compress image', 'target size'], { available: true, accepts: ['image'] }),
      action('convert', 'Convert', 'output', ['png jpeg webp', 'image converter'], { available: true, accepts: ['image'] }),
      action('background-remove', 'Remove Background', 'edit', ['background remover', 'transparent'], { available: true, accepts: ['image'] }),
      action('gif', 'GIF Maker', 'create', ['make gif', 'video to gif'], { available: true }),
      action('annotate', 'Annotate / Redact', 'edit', ['blur', 'redact', 'draw'], { accepts: ['image'] }),
      action('metadata', 'Image Metadata', 'inspect', ['exif', 'image info'], { accepts: ['image'] }),
    ],
  },
  {
    id: 'money', title: 'Money & Finance', route: './money/', description: 'Purchasing power, FX, growth, savings, loans, and income.',
    type: 'scenario', privacy: 'Mostly local', available: true, keywords: ['money', 'finance', 'inflation', 'currency', 'loan'],
    actions: [
      action('purchasing-power', 'Purchasing Power', 'money', ['inflation', 'cpi'], { available: true }),
      action('currency', 'Currency Conversion', 'money', ['fx', 'exchange rate'], { available: true }),
      action('growth', 'Growth', 'finance', ['compound interest', 'cagr', 'investment']),
      action('savings', 'Savings', 'finance', ['savings goal', 'monthly contribution']),
      action('loans', 'Loans', 'finance', ['amortization', 'monthly payment']),
      action('income', 'Income', 'finance', ['salary hourly', 'overtime', 'raise']),
    ],
  },
  {
    id: 'text', title: 'Text Studio', route: './text/', description: 'Clean, transform, analyze, compare, and preview human text.',
    type: 'input', privacy: 'Local', available: true, keywords: ['text', 'words', 'list', 'markdown'],
    actions: [
      action('clean', 'Clean Text', 'text', ['whitespace', 'blank lines'], { available: true, accepts: ['text'] }),
      action('case', 'Change Case', 'text', ['uppercase', 'lowercase', 'title case'], { available: true, accepts: ['text'] }),
      action('lists', 'List Tools', 'text', ['dedupe lines', 'sort list'], { available: true, accepts: ['text'] }),
      action('markdown', 'Markdown', 'text', ['markdown preview', 'html'], { available: true, accepts: ['text'] }),
      action('find-replace', 'Find / Replace', 'text', ['regex replace'], { accepts: ['text'] }),
      action('analyze', 'Analyze Text', 'text', ['readability', 'reading time', 'word frequency'], { accepts: ['text'] }),
      action('diff', 'Compare Text', 'text', ['text diff'], { accepts: ['text'] }),
    ],
  },
  {
    id: 'pdf', title: 'PDF & Documents', route: './pdf/', description: 'Load once, then organize, edit, extract, OCR, compress, and export PDFs.',
    type: 'asset', privacy: 'On device', available: true, keywords: ['pdf', 'document', 'ocr', 'merge', 'split', 'pages'],
    actions: [
      action('merge', 'Merge PDFs', 'organize', ['merge pdf', 'combine pdf'], { accepts: ['pdf'] }),
      action('split', 'Split PDF', 'organize', ['split pdf', 'page ranges'], { accepts: ['pdf'] }),
      action('reorder', 'Reorder Pages', 'organize', ['reorder pdf pages', 'move pages'], { accepts: ['pdf'] }),
      action('rotate', 'Rotate Pages', 'organize', ['rotate pdf', 'turn pages'], { accepts: ['pdf'] }),
      action('delete', 'Delete Pages', 'organize', ['delete pdf pages', 'remove pages'], { accepts: ['pdf'], requiresSelection: true }),
      action('duplicate', 'Duplicate Pages', 'organize', ['copy pdf pages'], { accepts: ['pdf'], requiresSelection: true }),
      action('extract', 'Extract Pages', 'organize', ['extract pdf pages'], { accepts: ['pdf'], requiresSelection: true }),
      action('blank', 'Blank Page', 'organize', ['insert blank page'], { accepts: ['pdf'] }),
      action('watermark', 'Watermark', 'edit', ['pdf watermark'], { accepts: ['pdf'] }),
      action('page-numbers', 'Page Numbers', 'edit', ['number pdf pages'], { accepts: ['pdf'] }),
      action('pdf-images', 'PDF to Images', 'convert', ['pdf to png', 'pdf to images'], { accepts: ['pdf'] }),
      action('extract-text', 'Extract Text', 'convert', ['pdf to text', 'copy pdf text'], { accepts: ['pdf'] }),
      action('ocr', 'OCR', 'process', ['ocr pdf', 'recognize text'], { accepts: ['pdf'] }),
      action('compress', 'Compress Copy', 'process', ['compress pdf', 'reduce pdf size'], { accepts: ['pdf'] }),
      action('metadata', 'PDF Metadata', 'inspect', ['pdf info'], { accepts: ['pdf'] }),
    ],
  },
  {
    id: 'files', title: 'File & Archive Lab', route: './files/', description: 'Rename, inspect, verify, archive, and find files.',
    type: 'asset', privacy: 'On device', available: false, keywords: ['files', 'archive', 'zip', 'hash', 'rename'],
    actions: [
      action('rename', 'Bulk Rename', 'names', ['rename files', 'batch rename']),
      action('hash', 'Checksums', 'verify', ['sha256 file', 'sha-256', 'checksum']),
      action('duplicates', 'Find Duplicates', 'find', ['duplicate files']),
      action('archive', 'Archive', 'archive', ['zip', '7z', 'tar', 'extract archive']),
      action('inspect', 'Inspect File', 'inspect', ['mime', 'magic bytes', 'file info']),
    ],
  },
  {
    id: 'media', title: 'Media Studio', route: './media/', description: 'Edit audio/video, record, generate audio, and inspect media.',
    type: 'asset', privacy: 'On device', available: false, keywords: ['audio', 'video', 'record', 'media'],
    actions: [
      action('trim', 'Trim', 'edit', ['trim audio', 'trim video']),
      action('convert', 'Convert Media', 'output', ['audio converter', 'video converter']),
      action('extract-audio', 'Extract Audio', 'video', ['video to audio']),
      action('record', 'Record', 'record', ['screen recorder', 'microphone recorder', 'webcam recorder']),
      action('tone', 'Tone Generator', 'generate', ['frequency generator', 'metronome']),
      action('inspect', 'Media Info', 'inspect', ['codec', 'bitrate', 'fps']),
    ],
  },
  {
    id: 'data', title: 'Data Studio', route: './data/', description: 'Inspect, clean, transform, query, analyze, and visualize structured data.',
    type: 'asset', privacy: 'On device', available: false, keywords: ['csv', 'json', 'xlsx', 'parquet', 'sql', 'table'],
    actions: [
      action('table', 'Table', 'data', ['csv viewer', 'spreadsheet']),
      action('clean', 'Clean Data', 'data', ['dedupe rows', 'missing values']),
      action('transform', 'Transform', 'data', ['pivot', 'join', 'transpose']),
      action('statistics', 'Statistics', 'analyze', ['mean median', 'correlation', 'outliers']),
      action('sql', 'SQL Query', 'query', ['duckdb', 'query csv']),
      action('chart', 'Charts', 'visualize', ['histogram', 'scatter', 'heatmap']),
      action('convert', 'Convert Data', 'output', ['csv to json', 'xlsx to csv', 'json to csv']),
    ],
  },
  {
    id: 'developer', title: 'Developer Lab', route: './developer/', description: 'Format, encode, inspect, validate, compare, and test developer data.',
    type: 'input', privacy: 'Local', available: false, keywords: ['developer', 'json', 'regex', 'jwt', 'base64', 'api'],
    actions: [
      action('json', 'JSON Tools', 'format', ['json pretty', 'json minify', 'json validate']),
      action('base64', 'Base64', 'encode', ['base64', 'base64 encode', 'base64 decode']),
      action('url', 'URL Tools', 'encode', ['url encode', 'url decode', 'query parameters']),
      action('jwt', 'JWT Inspector', 'inspect', ['jwt decode', 'json web token']),
      action('regex', 'Regex Tester', 'test', ['regular expression', 'regex replace']),
      action('hash', 'Hash', 'encode', ['sha256 text', 'hash text']),
      action('diff', 'Diff', 'compare', ['json diff', 'text diff']),
      action('api', 'API Request', 'web', ['http request', 'rest client']),
    ],
  },
  {
    id: 'math', title: 'Math & Science Lab', route: './math/', description: 'Calculate, convert, graph, and solve common math/science problems.',
    type: 'input', privacy: 'Local', available: false, keywords: ['math', 'calculator', 'physics', 'chemistry', 'units'],
    actions: [
      action('calculator', 'Calculator', 'math', ['scientific calculator']),
      action('units', 'Unit Converter', 'math', ['convert units']),
      action('graph', 'Graph', 'math', ['graph equation', 'function plot']),
      action('physics', 'Physics', 'science', ['kinematics', 'vectors', 'energy']),
      action('chemistry', 'Chemistry', 'science', ['molar mass', 'dilution', 'moles']),
      action('electronics', 'Electronics', 'science', ['ohms law', 'resistor']),
      action('grades', 'Grade Calculator', 'school', ['weighted grade', 'final grade']),
    ],
  },
  {
    id: 'random', title: 'Random & Decision Lab', route: './random/', description: 'Pick, shuffle, sample, make teams, and generate reproducible randomness.',
    type: 'input', privacy: 'Local', available: false, keywords: ['random', 'picker', 'teams', 'dice', 'shuffle'],
    actions: [
      action('pick', 'Random Pick', 'random', ['random picker', 'choose one']),
      action('shuffle', 'Shuffle', 'random', ['shuffle list']),
      action('teams', 'Make Teams', 'random', ['random teams', 'groups']),
      action('numbers', 'Random Numbers', 'random', ['number generator']),
      action('chance', 'Chance', 'random', ['coin flip', 'dice', 'percentage chance']),
      action('seed', 'Seeded Random', 'random', ['seed rng', 'reproducible random']),
    ],
  },
  {
    id: 'codes', title: 'Codes & Generator Lab', route: './codes/', description: 'Generate and scan QR/barcodes, passwords, tokens, and IDs.',
    type: 'input', privacy: 'Local', available: false, keywords: ['qr', 'barcode', 'password', 'uuid', 'token'],
    actions: [
      action('qr', 'QR Code', 'codes', ['qr generator', 'wifi qr', 'vcard qr']),
      action('barcode', 'Barcode', 'codes', ['barcode generator', 'code 128', 'ean', 'upc']),
      action('scan', 'Scan Code', 'codes', ['qr scanner', 'barcode scanner']),
      action('password', 'Password', 'generate', ['password generator', 'passphrase']),
      action('uuid', 'UUID / Token', 'generate', ['uuid generator', 'guid', 'secure token']),
    ],
  },
  {
    id: 'network', title: 'Network & System Lab', route: './network/', description: 'Subnet, storage, transfer, display, and device calculations.',
    type: 'input', privacy: 'Local', available: false, keywords: ['network', 'subnet', 'cidr', 'bandwidth', 'storage', 'ppi'],
    actions: [
      action('subnet', 'IP / Subnet', 'network', ['cidr', 'subnet calculator', 'ipv4', 'ipv6']),
      action('storage', 'Storage Units', 'data', ['kb mb gb tb', 'bits bytes']),
      action('transfer', 'Transfer Time', 'data', ['download time', 'bandwidth calculator']),
      action('media-size', 'Media Size', 'data', ['bitrate file size']),
      action('display', 'Display', 'system', ['aspect ratio', 'ppi', 'resolution']),
      action('device', 'Device Capabilities', 'system', ['browser info', 'webgpu', 'codecs']),
    ],
  },
];

export function getWorkspace(id) {
  return TOOLBOX_REGISTRY.find(workspace => workspace.id === id) || null;
}

export function getVisibleWorkspaces() {
  return TOOLBOX_REGISTRY.filter(workspace => workspace.available);
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function scoreText(query, text) {
  if (!query || !text) return 0;
  if (text === query) return 120;
  if (text.startsWith(query)) return 80;
  if (text.includes(query)) return 50;
  const words = query.split(' ').filter(Boolean);
  return words.length && words.every(word => text.includes(word)) ? 30 : 0;
}

export function findToolboxMatches(query, { includeUnavailable = true, limit = 12 } = {}) {
  const q = normalize(query);
  if (!q) return [];
  const matches = [];

  for (const workspace of TOOLBOX_REGISTRY) {
    if (!includeUnavailable && !workspace.available) continue;
    const workspaceText = normalize([workspace.title, workspace.description, ...(workspace.keywords || [])].join(' '));
    const workspaceScore = Math.max(scoreText(q, normalize(workspace.title)), scoreText(q, workspaceText));
    if (workspaceScore) {
      matches.push({
        kind: 'workspace', workspaceId: workspace.id, workspaceTitle: workspace.title, actionId: null,
        title: workspace.title, route: workspace.route, available: workspace.available, score: workspaceScore,
      });
    }

    for (const item of workspace.actions || []) {
      const aliasScores = [item.title, ...(item.aliases || [])].map(value => scoreText(q, normalize(value)));
      const actionScore = Math.max(...aliasScores, 0);
      if (!actionScore) continue;
      matches.push({
        kind: 'action', workspaceId: workspace.id, workspaceTitle: workspace.title, actionId: item.id,
        title: item.title, route: `${workspace.route}?action=${encodeURIComponent(item.id)}`,
        available: Boolean(workspace.available && item.available !== false), score: actionScore + 10,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}
