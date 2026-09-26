export default function useInitialWindowSize({ margin }: { margin?: number }) {
    const m = margin || 0;
    const visualViewport = window.visualViewport;
    const root = document.documentElement;
    const winW = visualViewport?.width || root.clientWidth || window.innerWidth;
    const winH = visualViewport?.height || root.clientHeight || window.innerHeight;

    const initWidth = Math.max(240, winW - m);
    const initHeight = Math.max(220, winH - m);

    return { initWidth, initHeight };
}
