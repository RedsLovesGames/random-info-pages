# Toolbox Open-Source Audit

This file records third-party projects evaluated or incorporated by the Random Info Pages Toolbox. **Selected** means approved as an implementation source but not necessarily copied yet. **Reference only** means no source code should be copied into Toolbox under the current licensing strategy.

## Browser/platform APIs

### Web Platform APIs
- Source: browser standards implemented by the user's browser.
- Use: `Intl.DateTimeFormat`, Canvas 2D, `createImageBitmap` where supported, `HTMLCanvasElement.toBlob`, `OffscreenCanvas` where supported, `localStorage`, Cache Storage, Clipboard API, File/Blob/Object URL APIs, `<video>` frame sampling.
- Status: **Primary implementation path** for time-zone formatting, basic image conversion, persistence, clipboard, local files, and browser-native media decode.
- Reason: keeps the core Toolbox local-first, static-host compatible, and dependency-light.

## Image Studio selected sources

### wendyliga/converter
- Repository: https://github.com/wendyliga/converter
- Revision reviewed: `b64905c2ac887879a3e8690161492f06abb1b9fa`
- License: MIT, copyright Wendy Liga.
- Status: **Selected as primary Image Studio core source; no code incorporated yet at the time of this entry.**
- Planned adapted areas:
  - `src/core/decodeImage.ts`: `createImageBitmap` decode with image-element fallback.
  - `src/core/canvasExport.ts`: OffscreenCanvas/DOM Canvas fallback, output-MIME verification, JPEG background fill, smoothing.
  - `src/core/convertImage.ts`: worker-backed encode/resize pattern with main-thread fallback.
  - `src/core/resize.ts`: defensive dimension/no-upscale behavior.
  - `src/core/zip.ts`: unique ZIP filenames and store-mode archive pattern.
- Local adaptation: port only reusable processing logic to the Toolbox's plain static JavaScript architecture; do not import its React/Vite application shell.

### dannycranmer/imagetoolkit (PicBrew)
- Repository: https://github.com/dannycranmer/imagetoolkit
- Revision reviewed: `5678c0df06ebbc843eee75de9d48e96ca06e710c`
- License: MIT, copyright Danny Cranmer.
- Status: **Selected as secondary static/GitHub-Pages implementation and UX reference; no code incorporated yet at the time of this entry.**
- Useful areas: pure HTML/CSS/JS architecture, Convert All flow, progress, per-file results, ZIP download, crop/resize UI patterns.
- Decision: prefer Wendy Liga's more defensive processing logic; adapt PicBrew only where its static implementation is simpler and useful.

### nodeca/pica
- Repository: https://github.com/nodeca/pica
- Revision reviewed: `f897666f18e9daeff540fe03d2708ba74214a046` (10.0.3)
- License: MIT, copyright Vitaly Puzrin.
- Status: **Selected for high-quality resize; not yet incorporated.**
- Planned use: resize only when dimensions change; native Canvas remains fallback.

### fengyuanchen/cropperjs
- Repository: https://github.com/fengyuanchen/cropperjs
- Revision reviewed: `fb4b379b74c237b9366e83c09049a5db796b3f87`
- License: MIT, copyright Chen Fengyuan.
- Status: **Selected for optional Crop mode; not yet incorporated.**
- Planned use: touch/mouse crop selection and transform UI, lazy-loaded only when Crop is activated.

### fflate
- Repository: https://github.com/101arrowz/fflate
- Package version reviewed: `0.8.3`
- License: MIT.
- Status: **Selected for ZIP export; not yet incorporated.**
- Planned use: create batch-download ZIPs. Images are already compressed, so use store/no-second-compression behavior where practical.

### nervtech/browser-image-compressor
- Repository: https://github.com/nervtech/browser-image-compressor
- Revision reviewed: `01940fdfbc3a8c96facb65f83f0336d05fbffec2`
- License: MIT.
- Status: **Selected for one focused algorithm; not yet incorporated.**
- Planned adapted area: target-size compression strategy using binary-search quality and progressive dimension reduction when quality alone cannot reach the requested byte target.

### mattdesl/gifenc
- Repository: https://github.com/mattdesl/gifenc
- Revision reviewed: `27db5b982dba701ca440b55ea36fad3999040973`
- Package version: 1.0.3.
- License: MIT, copyright Matt DesLauriers.
- Status: **Selected for GIF encoding; not yet incorporated.**
- Planned use: encode still-image frames and Canvas-sampled frames from browser-decodable video.
- Decision: this avoids requiring FFmpeg for the normal GIF-maker path.

### Suemura/client-side-image-converter
- Repository: https://github.com/Suemura/client-side-image-converter
- Revision reviewed: `4bde3a9b07af41585df18ce61dd493d58bfc7cf9`
- Project license: MIT, copyright Masato Suemura.
- Status: **Selected as the primary v1 background-removal source; not yet incorporated.**
- Planned adapted areas:
  - `src/utils/removeBgCore.ts`: U²-Net pre/post-processing and alpha composition.
  - `src/utils/imageBackgroundRemover.ts`: ONNX inference orchestration.
  - `src/utils/onnxSession.ts`: WebGPU-first / single-threaded WASM fallback behavior.
  - model loading/cache/progress patterns as needed.
- Model: `u2netp.onnx`, approximately 4.6 MB.
- Model source/license: U²-Net small architecture/weights, Apache-2.0; ONNX export sourced through `danielgatis/rembg` release as documented upstream.
- Runtime: `onnxruntime-web`, MIT.
- GitHub Pages note: single-threaded WASM fallback works without COOP/COEP; WebGPU remains preferred where compatible.

### microsoft/onnxruntime / onnxruntime-web
- Repository: https://github.com/microsoft/onnxruntime
- License: MIT, copyright Microsoft Corporation.
- Status: **Selected runtime dependency for local background-removal inference; not yet incorporated.**

### jamsinclair/jSquash
- Repository: https://github.com/jamsinclair/jSquash
- Revision reviewed: `da47a2be3b302beb5a5ae164a2ab7aa21a041d90`
- License: Apache-2.0.
- Status: **Selected as a later lazy advanced-codec layer; not yet incorporated.**
- Potential use: AVIF, JPEG/WebP codec paths, JPEG XL, Oxipng, and codec-specific optimizers.
- Decision: do not load these WASM codecs on the normal PNG/JPEG/WebP path.

### lightScout/light-converter
- Repository: https://github.com/lightScout/light-converter
- Revision reviewed: `1d72b59254ac05b7ab98ee7945d10fda009eb14c`
- Code license: MIT, copyright Juan Muller Da Costa E Silva.
- Model licenses documented upstream: BiRefNet MIT; IS-Net/DIS Apache-2.0.
- Status: **Selected as later high-quality background-removal reference/optional mode; no code incorporated yet.**
- Useful behavior: WebGPU/WASM batch removal, second-look contrast pass, guided-filter edge refinement, hole filling, speckle cleanup, editor brushes, IndexedDB/cache patterns.
- Reason not to make it the v1 default: its generated model set is roughly 160 MB, while the selected U²-Net-small path is much lighter.

## Reference-only / excluded sources

### getalatify/AlatifyWeb
- Repository: https://github.com/getalatify/AlatifyWeb
- Revision reviewed: `5d2fde2372aa02a6821e48f9309b01bfe8a36569`
- License: GNU Affero General Public License v3.0.
- Status: **Reference only. Do not copy implementation code under the current Toolbox licensing strategy.**
- Useful behavior: broad image-tool feature coverage and privacy-first product patterns.

### IMG.LY background-removal-js
- Repository: https://github.com/imgly/background-removal-js
- License: AGPL-family/current upstream terms require copyleft review.
- Status: **Reference only / not approved for direct incorporation into the current low-obligation path.**
- Useful behavior: browser-local ML background removal and privacy-preserving UX.

### IT-Tools
- Repository family: https://github.com/CorentinTh/it-tools and maintained forks where applicable.
- License: GPL-family releases/forks require copyleft review.
- Status: **Reference only.**
- Useful behavior: compact utility organization and transformation-tool UX.
- Decision: implement Toolbox text transformations independently with small pure JavaScript functions.

### ffmpeg.wasm
- Repository: https://github.com/ffmpegwasm/ffmpeg.wasm
- Wrapper license: MIT.
- Core note: distributed FFmpeg core builds can carry LGPL/GPL obligations depending on the exact package/build; the current core previously reviewed declares GPL-2.0-or-later.
- Status: **Deferred / not needed for the primary GIF path.**
- Decision: use `gifenc` plus browser-native video decode for normal GIF creation. Revisit FFmpeg only if unsupported input formats become important and pin/document the exact core license before shipping.

## Incorporation ledger

As of this audit update, the existing Toolbox Time Zone and Image Studio core were written against browser APIs and had **not yet copied third-party implementation code**. The sources above are now verified and selected for the hardening/advanced phases.

When production code is actually adapted or vendored, update this section with:
- local file(s) changed;
- exact upstream file(s);
- exact upstream revision/tag/package version;
- whether code was copied, ported, or linked as a dependency;
- meaningful modifications;
- required MIT/Apache notices.

See `tools/IMAGE_UPSTREAM_REVIEW.md` for the technical comparison and implementation rationale.