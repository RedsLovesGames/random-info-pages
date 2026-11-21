const field = id => document.getElementById(id);
const form = field('card-form');
const card = field('card');
const ctx = card.getContext('2d');
const photoInput = field('photo');
const photoStatus = field('photo-status');
const photoActions = field('photo-actions');
const saveButton = field('save');
const saveStatus = field('save-status');
const templates = {
  club: { title: 'Club Badge', paper: '#e5e9fc', ink: '#1f2b68', accent: '#3146d6' },
  npc: { title: 'NPC License', paper: '#e6f2ed', ink: '#183f35', accent: '#216951' },
  yapper: { title: 'Certified Yapper', paper: '#fde8e3', ink: '#54261e', accent: '#9f3825' },
};
let photo = null;
let photoRequest = 0;

function fillBox(x, y, width, height, radius, color) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = color;
  ctx.fill();
}

function write(text, x, y, maxWidth, size, color, family = 'Arial', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = weight + ' ' + size + 'px ' + family;
  while (size > 21 && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = weight + ' ' + size + 'px ' + family;
  }
  if (ctx.measureText(text).width > maxWidth) {
    const chars = Array.from(text);
    while (chars.length && ctx.measureText(chars.join('') + '…').width > maxWidth) chars.pop();
    text = chars.join('') + '…';
  }
  ctx.fillText(text, x, y);
}

function drawPhoto(template) {
  const x = 52, y = 228, width = 246, height = 314;
  fillBox(x, y, width, height, 14, '#ffffff');
  if (photo) {
    const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight);
    const visibleWidth = width / scale;
    const visibleHeight = height / scale;
    ctx.save();
    ctx.clip();
    ctx.drawImage(photo, (photo.naturalWidth - visibleWidth) / 2, (photo.naturalHeight - visibleHeight) / 2, visibleWidth, visibleHeight, x, y, width, height);
    ctx.restore();
  } else {
    ctx.fillStyle = template.accent;
    ctx.beginPath();
    ctx.arc(x + width / 2, y + 118, 43, 0, Math.PI * 2);
    ctx.fill();
    fillBox(x + 53, y + 177, 140, 76, 37, template.accent);
  }
}

function render() {
  if (!ctx) return;
  const template = templates[field('template').value];
  const title = field('title').value.trim() || template.title;
  const name = field('name').value.trim() || 'Your name';
  const role = field('role').value.trim();
  const customLabel = field('field-label').value.trim() || 'Other';
  const customValue = field('field-value').value.trim();

  ctx.clearRect(0, 0, card.width, card.height);
  fillBox(0, 0, card.width, card.height, 34, template.paper);
  fillBox(18, 18, 1044, 166, 24, template.accent);
  write(title, 52, 132, 974, 83, '#ffffff', 'Georgia', '400');
  drawPhoto(template);
  write('NAME', 345, 280, 680, 27, template.accent);
  write(name, 345, 353, 680, 69, template.ink);
  if (role) write(role, 345, 418, 680, 42, template.ink, 'Arial', '400');
  if (customValue) {
    write(customLabel.toUpperCase(), 345, 478, 680, 26, template.accent);
    write(customValue, 345, 530, 680, 37, template.ink);
  }
  fillBox(52, 575, 976, 2, 1, template.accent);
  write('NOVELTY ID', 52, 627, 280, 26, template.accent);
  card.setAttribute('aria-label', [title, 'Novelty ID', name, role, customValue && customLabel + ': ' + customValue].filter(Boolean).join(', '));
}

photoInput.addEventListener('change', async () => {
  const file = photoInput.files[0];
  if (!file) return;
  const request = ++photoRequest;
  const url = URL.createObjectURL(file);
  const image = new Image();
  photoStatus.textContent = 'Loading photo…';
  photoActions.hidden = false;
  saveButton.disabled = true;
  try {
    image.src = url;
    await image.decode();
    if (request !== photoRequest) return;
    photo = image;
    photoStatus.textContent = '';
    render();
  } catch {
    if (request !== photoRequest) return;
    photoInput.value = '';
    photoStatus.textContent = 'This photo could not be opened. Try a JPEG, PNG, or WebP.';
    photoActions.hidden = !photo;
  } finally {
    URL.revokeObjectURL(url);
    if (request === photoRequest) saveButton.disabled = !ctx;
  }
});

field('remove-photo').addEventListener('click', () => {
  photoRequest += 1;
  photo = null;
  photoInput.value = '';
  photoStatus.textContent = '';
  photoActions.hidden = true;
  saveButton.disabled = !ctx;
  render();
  photoInput.focus();
});

form.addEventListener('input', render);
form.addEventListener('submit', event => event.preventDefault());

saveButton.addEventListener('click', () => {
  saveStatus.textContent = '';
  card.toBlob(blob => {
    if (!blob) {
      saveStatus.textContent = 'Could not create a PNG. Try downloading again.';
      return;
    }
    const url = URL.createObjectURL(blob);
    const download = document.createElement('a');
    download.href = url;
    download.download = 'novelty-id-card.png';
    document.body.append(download);
    download.click();
    download.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    saveStatus.textContent = 'PNG ready.';
  }, 'image/png');
});

if (ctx) {
  render();
  saveButton.disabled = false;
} else {
  saveStatus.textContent = 'This browser cannot draw or export the card.';
}
