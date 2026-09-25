# Toolbox Open-Source Audit

This file records third-party projects evaluated or incorporated by the Random Info Pages Toolbox. **Incorporated** means code patterns were adapted or a runtime dependency is loaded by Toolbox. **Reference only** means no implementation code should be copied under the current licensing strategy.

## Browser/platform APIs

### Web Platform APIs
- Source: browser standards implemented by the user's browser.
- Use: `Intl.DateTimeFormat`, Canvas 2D, `createImageBitmap`, `HTMLCanvasElement.toBlob`, `OffscreenCanvas`, `localStorage`, Cache Storage, Clipboard API, File/Blob/Object URL APIs, `<video>` frame sampling.
- Status: **Primary implementation path.**
- User image/video/text bytes stay on-device. Runtime/model downloads described below do not upload selected media or text.

## Image Studio incorporated sources

### wendyliga/converter
- Repository: https://github.com/wendyliga/converter
- Revision reviewed: `b64905c2ac887879a3e8690161492f06abb1b9fa`
- License: MIT, copyright Wendy Liga.
- Status: **Incorporated by adaptation.**
- Local files: `tools/image/image-core.js`, `tools/image/image-engine.js`.
- Upstream areas studied/adapted: `src/core/decodeImage.ts`, `src/core/canvasExport.ts`, `src/core/resize.ts`, `src/core/zip.ts`.
- Adapted behavior: `createImageBitmap` decode with image-element fallback, defensive dimensions/no-upscale behavior, OffscreenCanvas/DOM Canvas fallback, explicit JPEG white background, high-quality smoothing, output MIME verification, duplicate-safe output naming, and store-mode ZIP behavior.
- Modification: rewritten as dependency-light plain JavaScript for the repository's static architecture. The React/Vite shell and worker implementation were not imported.

### nodeca/pica
- Repository: https://github.com/nodeca/pica
- Revision reviewed: `f897666f18e9daeff540fe03d2708ba74214a046`
- Package/version: `pica@10.0.3`
- License: MIT, copyright Vitaly Puzrin.
- Status: **Incorporated as a lazy runtime dependency.**
- Local integration: `tools/image/image-engine.js`.
- Delivery: pinned jsDelivr browser build. Loaded only when dimensions actually change. Native Canvas remains the fallback if the library cannot load or resize.

### 101arrowz/fflate
- Repository: https://github.com/101arrowz/fflate
- Package/version: `fflate@0.8.3`
- License: MIT, copyright Arjun Barrett.
- Status: **Incorporated as a lazy runtime dependency.**
- Local integration: `tools/image/image-app.js`, `tools/image/image-engine.js`.
- Delivery: pinned jsDelivr UMD build, loaded only when multiple processed results are downloaded as a ZIP.
- Modification: image entries use ZIP store level 0 because the image payloads are already compressed.

### nervtech/browser-image-compressor
- Repository: https://github.com/nervtech/browser-image-compressor
- Revision reviewed: `01940fdfbc3a8c96facb65f83f0336d05fbffec2`
- License: MIT, copyright nervtech.
- Status: **Incorporated by algorithmic adaptation.**
- Local integration: `tools/image/image-engine.js`.
- Adapted behavior: target-size compression searches lossy quality first, then progressively lowers resolution only when quality alone cannot meet the requested byte target.
- Modification: Toolbox uses its own bounds helper, iteration count, resolution scale sequence, batch integration, progress reporting, and explicit JPEG/WebP-only guard.

### fengyuanchen/cropperjs
- Repository: https://github.com/fengyuanchen/cropperjs
- Revision reviewed: `fb4b379b74c237b9366e83c09049a5db796b3f87`
- Package/version: `cropperjs@2.2.0`
- License: MIT, copyright Chen Fengyuan.
- Status: **Incorporated as a lazy runtime dependency.**
- Local integration: `tools/image/crop-editor.js`, `tools/image/crop.css`, `tools/image/index.html`.
- Delivery: pinned jsDelivr build, requested only after the user opens Crop / rotate.
- Upstream APIs used: `new Cropper`, `getCropperSelection`, selection `$toCanvas`, `getCropperImage`, `$rotate`, `$scale`, and `destroy`.
- Modification: the crop result becomes a local PNG working source inside Image Studio; the original selected file remains available through Reset edit.

### mattdesl/gifenc
- Repository: https://github.com/mattdesl/gifenc
- Revision reviewed: `27db5b982dba701ca440b55ea36fad3999040973`
- Package/version: `gifenc@1.0.3`
- License: MIT, copyright Matt DesLauriers.
- Status: **Incorporated as a lazy runtime dependency.**
- Local integration: `tools/image/gif-maker.js`, `tools/image/gif.css`, `tools/image/index.html`.
- Delivery: pinned jsDelivr ESM build, requested only when a GIF is actually encoded.
- Upstream APIs used: `GIFEncoder`, `quantize`, `applyPalette`.
- Modification: Toolbox supplies its own still-frame ordering, contain-fit drawing, loop/FPS controls, cancellation between frames, and browser-native `<video>` seek/canvas sampling. Video conversion is capped at 300 sampled frames across the selected clip, so FFmpeg is not required for the normal path.

### Suemura/client-side-image-converter
- Repository: https://github.com/Suemura/client-side-image-converter
- Revision reviewed/adapted: `4bde3a9b07af41585df18ce61dd493d58bfc7cf9`
- Project license: MIT, copyright Masato Suemura.
- Status: **Incorporated by adaptation for v1 background removal.**
- Local integration: `tools/image/bg-remove-core.js`, `tools/image/bg-remove.js`, `tools/image/bg-remove.css`, `tools/image/index.html`.
- Upstream areas adapted: `src/utils/removeBgCore.ts`, `src/utils/imageBackgroundRemover.ts`, `src/utils/onnxSession.ts`, `src/utils/modelLoader.ts`.
- Adapted behavior: 320×320 U²-Net preprocessing, ImageNet normalization, saliency min/max normalization, bilinear mask upscale, alpha composition, runtime/model lazy loading, cache-first model fetch, WebGPU warmup with WASM fallback, and progress staging.
- Modification: rewritten as plain browser JavaScript, integrated with Image Studio working-file state, and sized for static GitHub Pages delivery.

### microsoft/onnxruntime / onnxruntime-web
- Repository: https://github.com/microsoft/onnxruntime
- Runtime/version: `onnxruntime-web@1.30.0`
- License: MIT, copyright Microsoft Corporation.
- Status: **Incorporated as a lazy runtime dependency for background removal.**
- Local integration: `tools/image/bg-remove.js`.
- Delivery: pinned jsDelivr `ort.webgpu.min.js` with WASM-capable fallback; runtime assets are fetched only when background removal is used.
- Runtime policy: WebGPU is attempted on compatible non-iOS clients and verified with a warmup inference. U²-Net operator incompatibility or GPU failure falls back to single-threaded WASM, which does not require COOP/COEP on GitHub Pages.

### U²-Net small / `u2netp.onnx`
- Architecture source: https://github.com/xuebinqin/U-2-Net
- ONNX distribution: https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx
- Architecture/weights license: Apache-2.0.
- Upstream documented SHA-256: `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`.
- Status: **Incorporated as the v1 background-removal model.**
- Delivery used by Toolbox: pinned jsDelivr mirror of `Suemura/client-side-image-converter@4bde3a9b.../public/models/u2netp.onnx`, approximately 4.6 MB.
- The model is downloaded only when the user invokes background removal and is placed in Cache Storage when available. Selected image bytes are never sent with that request.

## Text Tools incorporated sources

### markedjs/marked
- Repository: https://github.com/markedjs/marked
- Package/version: `marked@18.0.14`
- License: MIT.
- Status: **Incorporated as a lazy runtime dependency for Markdown parsing.**
- Local integration: `tools/text/text-app.js`.
- Delivery: pinned jsDelivr UMD build, loaded only when Markdown mode is opened.
- Security note: Marked output is never inserted directly into the preview; it is passed through DOMPurify first.

### cure53/DOMPurify
- Repository: https://github.com/cure53/DOMPurify
- Package/version: `dompurify@3.4.16`
- License: MPL-2.0 OR Apache-2.0. Toolbox relies on the Apache-2.0 option.
- Status: **Incorporated as a lazy runtime dependency for Markdown sanitization.**
- Local integration: `tools/text/text-app.js`.
- Delivery: pinned jsDelivr browser build, loaded only when Markdown mode is opened.

## Money Through Time data/API sources

### Federal Reserve Bank of Minneapolis annual CPI series
- Source: https://www.minneapolisfed.org/about-us/monetary-policy/inflation-calculator/consumer-price-index-1800-
- Status: **Incorporated as versioned static public data.**
- Local file: `tools/money/data/us-cpi.json`.
- Frozen coverage: 1800–2025, retrieved 2026-09-24. The source's 2026 estimate is deliberately excluded from the frozen completed-year series.
- Methodology disclosure: pre-1913 observations are historical estimates; the source identifies 1913 onward with modern CPI/CPI-U source series.

### Frankfurter FX API
- Site/API: https://frankfurter.dev/
- Runtime endpoint: `https://api.frankfurter.dev/v2/rates?base=...`
- Status: **Incorporated as a runtime data source.**
- Local integration: `tools/money/money-app.js`, `tools/money/fx-core.js`.
- Behavior: no user API key, current rate/effective date shown, 12-hour local cache, and dated stale-cache fallback on network failure.
- Historical inflation and current FX remain separate calculations; Toolbox does not imply historical FX conversion.

## Image Studio selected but not yet incorporated

### jamsinclair/jSquash
- Repository: https://github.com/jamsinclair/jSquash
- Revision reviewed: `da47a2be3b302beb5a5ae164a2ab7aa21a041d90`
- License: Apache-2.0.
- Planned use: later lazy advanced-codec support such as AVIF/JPEG XL/Oxipng where justified.

### lightScout/light-converter
- Repository: https://github.com/lightScout/light-converter
- Revision reviewed: `1d72b59254ac05b7ab98ee7945d10fda009eb14c`
- Code license: MIT, copyright Juan Muller Da Costa E Silva.
- Model licenses documented upstream: BiRefNet MIT; IS-Net/DIS Apache-2.0.
- Status: later high-quality background-removal reference/optional mode only. Its generated model set is roughly 160 MB, so it is not the v1 default.

## Reference-only sources

### dannycranmer/imagetoolkit (PicBrew)
- Repository: https://github.com/dannycranmer/imagetoolkit
- Revision reviewed: `5678c0df06ebbc843eee75de9d48e96ca06e710c`
- License: MIT, copyright Danny Cranmer.
- Status: **Reference only so far.**
- Studied for its static GitHub-Pages workflow, batch UX, progress, ZIP download, crop and resize organization. Current Toolbox UI/implementation was written separately rather than copied from PicBrew.

### getalatify/AlatifyWeb
- Repository: https://github.com/getalatify/AlatifyWeb
- Revision reviewed: `5d2fde2372aa02a6821e48f9309b01bfe8a36569`
- License: GNU AGPL-3.0.
- Status: **Reference only. Do not copy implementation code under the current licensing strategy.**

### IMG.LY background-removal-js
- Repository: https://github.com/imgly/background-removal-js
- License: AGPL-family/current upstream terms require copyleft review.
- Status: **Reference only.**

### IT-Tools
- Repository family: https://github.com/CorentinTh/it-tools and maintained forks where applicable.
- License: GPL-family.
- Status: **Reference only.** Text transforms are implemented independently.

### ffmpeg.wasm
- Repository: https://github.com/ffmpegwasm/ffmpeg.wasm
- Wrapper license: MIT; distributed FFmpeg core builds can have LGPL/GPL obligations depending on the exact build.
- Status: **Deferred.** Normal GIF creation uses `gifenc` and browser-native video decoding first.

## Runtime dependency note

The current static deployment lazy-loads Pica, fflate, Cropper.js, gifenc, ONNX Runtime, Marked, and DOMPurify from pinned jsDelivr package URLs. Background removal additionally downloads the pinned U²-Net-small model on first use. Only library/model assets are requested from those hosts; selected image/video/text content remains local. The model is cached with Cache Storage when available. A later packaging pass may vendor permissively licensed builds to eliminate runtime CDN dependence.

See `tools/IMAGE_UPSTREAM_REVIEW.md` for the technical comparison and implementation rationale.