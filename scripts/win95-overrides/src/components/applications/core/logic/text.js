export function countWords(text) {
    const trimmed = String(text || '').trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
}
