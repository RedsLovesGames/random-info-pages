# Toolbox Open-Source Audit

This file records third-party projects evaluated or incorporated by the Random Info Pages Toolbox. **Incorporated** means code patterns were adapted or a runtime dependency is loaded by Toolbox. **Reference only** means no implementation code should be copied under the current licensing strategy.

## Browser/platform APIs

### Web Platform APIs
- Source: browser standards implemented by the user's browser.
- Use: `Intl.DateTimeFormat`, Canvas 2D, `createImageBitmap`, `HTMLCanvasElement.toBlob`, `OffscreenCanvas`, Web Crypto, Web Audio, AudioContext, MediaRecorder, `getUserMedia`, `getDisplayMedia`, BarcodeDetector when available, localStorage, IndexedDB, Cache Storage, Clipboard, File/Blob/Object URL APIs, streams, `<audio>` and `<video>`.
- Status: **Primary implementation path.**
- User files/media/text stay on-device. Runtime/model/library downloads described below do not upload selected content.

## Time Workspace incorporated references

### zzjoey/ZoneMap
- Repository: https://github.com/zzjoey/ZoneMap
- Revision reviewed: `9ea97e6cd45ee47d100aed5af7bdf3421ac3e85e`
- License: MIT, copyright 2026 ZoneMap.live.
- Status: **Incorporated by visual/interaction adaptation; no React/Vite/Hono source was transplanted.**
- Local integration: `tools/time/index.html`, `tools/time/time.css`, `tools/time/time-app.js`.
- Modification: rewritten as framework-free static HTML/CSS/JavaScript for GitHub Pages.

### Manaiakalani/world-clock
- Repository: https://github.com/Manaiakalani/world-clock
- Revision reviewed: `3f35ed8c09e0b80cac42b86a3ddbb42708118b85`
- License: MIT, copyright 2026 World Clock Contributors.
- Status: **Incorporated by feature/interaction adaptation; no Next.js/React source was transplanted.**
- Local integration: `tools/time/index.html`, `tools/time/time.css`, `tools/time/time-app.js`, `tools/time/time.js`.
- Modification: Toolbox implements its own local person/location model, timezone grouping, availability planner, map markers, persistence, and Board view.

## Image Studio incorporated sources

### wendyliga/converter
- Repository: https://github.com/wendyliga/converter
- Revision reviewed: `b64905c2ac887879a3e8690161492f06abb1b9fa`
- License: MIT, copyright Wendy Liga.
- Status: **Incorporated by adaptation.**
- Local files: `tools/image/image-core.js`, `tools/image/image-engine.js`.
- Adapted behavior: image decode, Canvas export/resize fallbacks, JPEG background handling, MIME verification, output naming, and ZIP behavior. Rewritten as plain JavaScript.

### nodeca/pica
- Repository: https://github.com/nodeca/pica
- Revision reviewed: `f897666f18e9daeff540fe03d2708ba74214a046`
- Package/version: `pica@10.0.3`
- License: MIT, copyright Vitaly Puzrin.
- Status: **Incorporated as a lazy runtime dependency.**
- Local integration: `tools/image/image-engine.js`.
- Delivery: pinned jsDelivr browser build, loaded only for actual resizes; Canvas remains fallback.

### 101arrowz/fflate
- Repository: https://github.com/101arrowz/fflate
- Package/version: `fflate@0.8.3`
- License: MIT, copyright Arjun Barrett.
- Status: **Incorporated as a lazy runtime dependency.**
- Local integration: `tools/image/image-app.js`, `tools/image/image-engine.js`, `tools/files/files-app.js`.
- Delivery: pinned jsDelivr UMD build. Image Studio uses it for multi-result ZIPs; File & Archive Lab uses it for ZIP creation and ZIP extraction.

### nervtech/browser-image-compressor
- Repository: https://github.com/nervtech/browser-image-compressor
- Revision reviewed: `01940fdfbc3a8c96facb65f83f0336d05fbffec2`
- License: MIT.
- Status: **Incorporated by algorithmic adaptation.**
- Local integration: `tools/image/image-engine.js`.
- Adapted behavior: target-size compression searches quality first, then lowers resolution when required.

### fengyuanchen/cropperjs
- Repository: https://github.com/fengyuanchen/cropperjs
- Revision reviewed: `fb4b379b74c237b9366e83c09049a5db796b3f87`
- Package/version: `cropperjs@2.2.0`
- License: MIT, copyright Chen Fengyuan.
- Status: **Incorporated as a lazy runtime dependency.**
- Local integration: `tools/image/crop-editor.js`, `tools/image/crop.css`, `tools/image/index.html`.
- Delivery: pinned jsDelivr build, loaded only when Crop / rotate is opened.

### mattdesl/gifenc
- Repository: https://github.com/mattdesl/gifenc
- Revision reviewed: `27db5b982dba701ca440b55ea36fad3999040973`
- Package/version: `gifenc@1.0.3`
- License: MIT, copyright Matt DesLauriers.
- Status: **Incorporated as a lazy runtime dependency.**
- Local integration: `tools/image/gif-maker.js`, `tools/image/gif.css`, `tools/image/index.html`.
- Delivery: pinned jsDelivr ESM build. Toolbox supplies its own frame ordering, drawing, loop/FPS controls, cancellation, and browser-native video sampling.

### Suemura/client-side-image-converter
- Repository: https://github.com/Suemura/client-side-image-converter
- Revision reviewed/adapted: `4bde3a9b07af41585df18ce61dd493d58bfc7cf9`
- Project license: MIT, copyright Masato Suemura.
- Status: **Incorporated by adaptation for background removal.**
- Local integration: `tools/image/bg-remove-core.js`, `tools/image/bg-remove.js`, `tools/image/bg-remove.css`, `tools/image/index.html`.
- Adapted behavior: U²-Net preprocessing/postprocessing, runtime/model lazy loading, cache-first fetch, WebGPU attempt with WASM fallback, and progress staging.

### microsoft/onnxruntime / onnxruntime-web
- Repository: https://github.com/microsoft/onnxruntime
- Runtime/version: `onnxruntime-web@1.30.0`
- License: MIT, copyright Microsoft Corporation.
- Status: **Incorporated as a lazy runtime dependency for background removal.**
- Local integration: `tools/image/bg-remove.js`.
- Delivery: pinned jsDelivr WebGPU-capable build with WASM fallback.

### U²-Net small / `u2netp.onnx`
- Architecture source: https://github.com/xuebinqin/U-2-Net
- ONNX distribution: https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx
- Architecture/weights license: Apache-2.0.
- Upstream documented SHA-256: `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8`.
- Status: **Incorporated as the background-removal model.**
- Delivery: pinned jsDelivr mirror from the reviewed Suemura revision; cached when available.

## Text Tools incorporated sources

### markedjs/marked
- Repository: https://github.com/markedjs/marked
- Package/version: `marked@18.0.14`
- License: MIT.
- Status: **Incorporated as a lazy runtime dependency for Markdown parsing.**
- Local integration: `tools/text/text-app.js`.
- Delivery: pinned jsDelivr UMD build, loaded only in Markdown mode.

### cure53/DOMPurify
- Repository: https://github.com/cure53/DOMPurify
- Package/version: `dompurify@3.4.16`
- License: MPL-2.0 OR Apache-2.0; Toolbox relies on the Apache-2.0 option.
- Status: **Incorporated as a lazy runtime dependency for Markdown sanitization.**
- Local integration: `tools/text/text-app.js`.

## File & Archive Lab incorporated sources

### Daninet/hash-wasm
- Repository: https://github.com/Daninet/hash-wasm
- Package/version: `hash-wasm@4.12.0`
- License: MIT.
- Status: **Incorporated as a lazy runtime dependency for large streamed hashes.**
- Local integration: `tools/files/files-app.js`.
- Delivery: pinned jsDelivr UMD build. Files up to 64 MiB use native Web Crypto when available; larger files use hash-wasm incrementally from the browser file stream to avoid requiring one giant ArrayBuffer.
- Algorithms currently exposed by File Lab: SHA-256, with SHA-512 engine support available in the shared hashing helper.

### fflate reuse
- File & Archive Lab reuses the already-audited `fflate@0.8.3` runtime above for ZIP creation, inspection and extraction.
- Current Step 4 scope deliberately does not ship RAR/7z/TAR via a second archive engine yet; broader archive formats remain a later extension.

## Media Studio incorporated sources

### Vanilagy/Mediabunny
- Repository: https://github.com/Vanilagy/mediabunny
- Package/version: `mediabunny@1.59.1`
- License: MPL-2.0.
- Status: **Incorporated unmodified as a lazy runtime dependency.**
- Local integration: `tools/media/media-app.js`.
- Delivery: pinned jsDelivr browser bundle, requested only for media conversion, trimming, transform/export, extraction, or detailed track inspection.
- APIs used: `Input`, `BlobSource`, `ALL_FORMATS`, `Output`, `BufferTarget`, `Conversion`, `Mp4OutputFormat`, `WebMOutputFormat`, `WavOutputFormat`, track metadata APIs, conversion progress, trim and video transform options.
- Toolbox-specific code remains separate framework-free JavaScript. Media files are read from local `Blob` objects and conversion output remains local.
- Browser-native Web Audio and MediaRecorder are used directly for source-audio editing, tone generation, microphone/camera/screen recording, and metronome behavior rather than routing those tasks through Mediabunny.

## PDF & Documents incorporated sources

### Hopding/pdf-lib
- Repository: https://github.com/Hopding/pdf-lib
- Package/version: `pdf-lib@1.17.1`
- License: MIT.
- Status: **Incorporated as a lazy runtime dependency for PDF mutation/export.**
- Local integration: `tools/pdf/pdf-engine.js`, `tools/pdf/pdf-app.js`.

### Mozilla PDF.js
- Repository: https://github.com/mozilla/pdf.js
- Package/version used by Toolbox: `pdfjs-dist@6.3.289`
- License: Apache-2.0.
- Status: **Incorporated as a lazy runtime dependency for PDF rendering/text extraction.**
- Local integration: `tools/pdf/pdf-engine.js`.

### naptha/tesseract.js
- Repository: https://github.com/naptha/tesseract.js
- Status: **Incorporated as a lazy runtime dependency for local PDF OCR.**
- Local integration: `tools/pdf/pdf-app.js`.

## Codes & Generator Lab incorporated sources

### metafloor/bwip-js
- Repository: https://github.com/metafloor/bwip-js
- Package/version: `bwip-js@4.11.4`
- License: MIT.
- Status: **Incorporated unmodified as a lazy runtime dependency.**
- Local integration: `tools/codes/codes-app.js`.
- Delivery: pinned jsDelivr browser build, loaded only when a QR or barcode is actually rendered.
- Use: local Canvas rendering for QR Code, Data Matrix, Code 128, EAN-13, and UPC-A. User payload text remains in-browser; the CDN request fetches library code only.
- Scanning uses the browser-native `BarcodeDetector` API when available and does not upload selected images.

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

## Selected but not yet incorporated

### jamsinclair/jSquash
- Repository: https://github.com/jamsinclair/jSquash
- Revision reviewed: `da47a2be3b302beb5a5ae164a2ab7aa21a041d90`
- License: Apache-2.0.
- Planned use: later lazy advanced-codec support such as AVIF/JPEG XL/Oxipng where justified.

### lightScout/light-converter
- Repository: https://github.com/lightScout/light-converter
- Revision reviewed: `1d72b59254ac05b7ab98ee7945d10fda009eb14c`
- Code license: MIT.
- Model licenses documented upstream: BiRefNet MIT; IS-Net/DIS Apache-2.0.
- Status: later high-quality background-removal reference/optional mode only.

### nibble-gnarl/libarchivejs
- Repository: https://github.com/nibble-gnarl/libarchivejs
- License: MIT.
- Status: **Selected for later evaluation, not currently loaded by Toolbox.**
- Possible future use: browser-side RAR/7z/TAR/GZIP and broader archive extraction after bundle/performance validation.

## Reference-only sources

### dannycranmer/imagetoolkit (PicBrew)
- Repository: https://github.com/dannycranmer/imagetoolkit
- Revision reviewed: `5678c0df06ebbc843eee75de9d48e96ca06e710c`
- License: MIT.
- Status: **Reference only so far.**

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
- Status: **Reference only.**

### ffmpeg.wasm
- Repository: https://github.com/ffmpegwasm/ffmpeg.wasm
- Wrapper license: MIT; distributed FFmpeg core builds can have LGPL/GPL obligations depending on exact build.
- Status: **Deferred.** Image GIF and Step 4 Media Studio use browser-native APIs plus focused libraries instead of making FFmpeg the default path.

## Runtime dependency note

The static deployment lazy-loads focused dependencies only when their feature is invoked. Current pinned runtime dependencies include Pica, fflate, Cropper.js, gifenc, ONNX Runtime, Marked, DOMPurify, hash-wasm, Mediabunny, bwip-js, pdf-lib, PDF.js, and Tesseract.js. Background removal additionally downloads the pinned U²-Net-small model on first use. User-selected files are not uploaded to those package/model hosts; requests are for library/model assets only.

See `tools/IMAGE_UPSTREAM_REVIEW.md` for the earlier Image Studio technical comparison and rationale.