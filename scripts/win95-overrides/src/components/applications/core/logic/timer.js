export function formatDuration(milliseconds) {
    const safe = Math.max(0, Math.floor(Number(milliseconds) || 0));
    const tenths = Math.floor((safe % 1000) / 100);
    const totalSeconds = Math.floor(safe / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);
    const pad = (value) => String(value).padStart(2, '0');
    if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}.${tenths}`;
    return `${pad(totalMinutes)}:${pad(seconds)}.${tenths}`;
}
