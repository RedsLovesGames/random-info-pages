import './style.css';

import Application from './Application/Application';

function showComputerFallback(error?: unknown) {
    if (error) console.error('Random Info Computer failed to start:', error);
    const fallback = document.getElementById('computer-fallback');
    if (fallback) fallback.hidden = false;
}

function supportsWebGL() {
    try {
        if (typeof WebGLRenderingContext === 'undefined') return false;
        const canvas = document.createElement('canvas');
        return Boolean(
            canvas.getContext('webgl2') || canvas.getContext('webgl')
        );
    } catch (_error) {
        return false;
    }
}

try {
    if (!supportsWebGL()) {
        throw new Error('WebGL is unavailable in this browser.');
    }
    new Application();
} catch (error) {
    showComputerFallback(error);
}
