export default function useInitialWindowSize({ margin }: { margin?: number }) {
    const m = margin || 0;
    const root = document.documentElement;
    const winW = root.clientWidth || window.innerWidth;
    const winH = root.clientHeight || window.innerHeight;

    const initWidth = Math.max(240, winW - m);
    const initHeight = Math.max(220, winH - m);

    return { initWidth, initHeight };
}
