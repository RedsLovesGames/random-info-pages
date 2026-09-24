# Toolbox Open-Source Audit

This file records third-party projects evaluated or incorporated by the Random Info Pages Toolbox. **Incorporated** means code patterns were adapted or a runtime dependency is loaded by Toolbox. **Reference only** means no implementation code should be copied under the current licensing strategy.

## Browser/platform APIs

### Web Platform APIs
- Source: browser standards implemented by the user's browser.
- Use: `Intl.DateTimeFormat`, Canvas 2D, `createImageBitmap`, `HTMLCanvasElement.toBlob`, `OffscreenCanvas`, `localStorage`, Clipboard API, File/Blob/Object URL APIs, `<video>` frame sampling.
- Status: **Primary implementation path.**
- User image bytes stay on-device. Runtime library downloads described below do not upload the selected images.

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

## Image Studio selected but not yet incorporated

### mattdesl/gifenc
- Repository: https://github.com/mattdesl/gifenc
- Revision reviewed: `27db5b982dba701ca440b55ea36fad3999040973`
- Package version reviewed: `1.0.3`
- License: MIT, copyright Matt DesLauriers.
- Planned use: still-image GIF encoding and Canvas-sampled frames from browser-decodable video.

### Suemura/client-side-image-converter
- Repository: https://github.com/Suemura/client-side-image-converter
- Revision reviewed: `4bde3a9b07af41585df18ce61dd493d58bfc7cf9`
- Project license: MIT, copyright Masato Suemura.
- Planned use: primary v1 browser-local background-removal implementation.
- Candidate adapted areas: `removeBgCore.ts`, `imageBackgroundRemover.ts`, `onnxSession.ts`, and model-loading/cache/progress patterns.
- Model: `u2netp.onnx`; upstream documents U²-Net small architecture/weights under Apache-2.0 and the ONNX export through the `danielgatis/rembg` release.

### microsoft/onnxruntime / onnxruntime-web
- Repository: https://github.com/microsoft/onnxruntime
- License: MIT, copyright Microsoft Corporation.
- Planned use: browser-local U²-Net inference with WebGPU when workable and WASM fallback.

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
- Status: **Deferred.** Normal GIF creation should use `gifenc` and browser-native video decoding first.

## Runtime dependency note

The current static deployment lazy-loads Pica, fflate, and Cropper.js from pinned jsDelivr package URLs. Only the library code is requested from the CDN; selected image bytes remain local. A later packaging pass may vendor these permissively licensed builds to eliminate runtime CDN dependence.

See `tools/IMAGE_UPSTREAM_REVIEW.md` for the technical comparison and implementation rationale.