const coreAssets = [
  'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/',
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/',
];
const scriptIntegrity = 'sha384-sKfkiFtvUk+vexk+0EUhEh366190/4WpgUAsUvaxEfyg7+E1Zt5Y5hrsU808g8Q9';
const wasmIntegrity = 'sha384-U1VDhkPYrM3wTCT4/vjSpSsKqG/UjljYrYCI4hBSJ02svbCkxuCi6U6u/peg5vpW';

self.onmessage = async ({data}) => {
  try {
    const core = await loadDecoder();
    core.FS.writeFile('/input', new Uint8Array(data));
    core.exec('-nostdin', '-protocol_whitelist', 'file,pipe', '-i', '/input',
      '-map', '0:a:0', '-c:a', 'pcm_s16le', '-ac', '2', '-ar', '44100', '/decoded.wav');
    if (core.ret !== 0) throw new Error('No compatible audio stream was found in this file.');
    const wav = core.FS.readFile('/decoded.wav');
    self.postMessage({wav:wav.buffer}, [wav.buffer]);
  } catch (problem) {
    self.postMessage({error:problem.message || 'The audio decoder could not open this file.'});
  }
};

async function loadDecoder() {
  for (const directory of coreAssets) {
    try {
      const [script, wasm] = await Promise.all([
        fetch(directory + 'ffmpeg-core.js', {integrity:scriptIntegrity}),
        fetch(directory + 'ffmpeg-core.wasm', {integrity:wasmIntegrity}),
      ]);
      if (!script.ok || !wasm.ok) continue;
      const localScript = URL.createObjectURL(await script.blob());
      try {
        importScripts(localScript);
        const wasmBinary = new Uint8Array(await wasm.arrayBuffer());
        const wasmURL = directory + 'ffmpeg-core.wasm';
        const source = directory + 'ffmpeg-core.js';
        return await self.createFFmpegCore({
          wasmBinary, mainScriptUrlOrBlob: source + '#' + btoa(JSON.stringify({wasmURL})),
        });
      } finally {
        URL.revokeObjectURL(localScript);
      }
    } catch {
      // Try another host if the pinned decoder is unavailable.
    }
  }
  throw new Error('The extended decoder could not load. Check your connection or try WAV, MP3, or MIDI.');
}
