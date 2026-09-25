# Image Studio Upstream Review

Date: 2026-09-24
Branch: `toolbox`

This review decides which existing open-source projects should supply implementation ideas or directly adapted code for Image Studio. The goal is to reuse mature work while keeping Random Info Pages static, GitHub-Pages-compatible, local-first, and license-clean.

## Decision summary

Use a **composed implementation**, not a fork of one large app:

1. **Core conversion / decode / batch robustness:** adapt selected MIT-licensed logic from `wendyliga/converter`.
2. **Static no-build UX patterns:** use `dannycranmer/imagetoolkit` (PicBrew) as a secondary reference and adapt small MIT-licensed patterns only where useful.
3. **High-quality resize:** use `nodeca/pica` as the preferred resize engine when dimensions change.
4. **Crop UI:** use `fengyuanchen/cropperjs` instead of maintaining a custom touch cropper.
5. **ZIP export:** use `fflate` rather than a heavy archive dependency.
6. **GIF creation:** use `mattdesl/gifenc`; sample browser-decodable video frames with `<video>` + Canvas rather than pulling FFmpeg into the initial build.
7. **Background removal:** adapt the small U²-Net/ONNX pipeline from `Suemura/client-side-image-converter`, using `onnxruntime-web` and the permissively licensed `u2netp` model.
8. **Advanced formats/optimizers:** use `jamsinclair/jSquash` lazily when AVIF/JPEG XL or codec-specific optimization is added.
9. **High-quality background removal:** keep `lightScout/light-converter` as a later optional quality-mode source, not the default v1 path because its generated model set is roughly 160 MB.
10. **Do not copy AlatifyWeb:** its current repository license is AGPL-3.0. It remains feature/UX reference only.

## Candidate comparison

| Project | Revision reviewed | License | Strongest value | Fit for this repo | Decision |
| --- | --- | --- | --- | --- | --- |
| `wendyliga/converter` | `b64905c2ac887879a3e8690161492f06abb1b9fa` | MIT | Defensive browser decode, OffscreenCanvas/worker pipeline, MIME verification, JPEG alpha handling, batch/ZIP/metadata patterns | Excellent logic source; framework code itself is not needed | **Primary core source** |
| `dannycranmer/imagetoolkit` / PicBrew | `5678c0df06ebbc843eee75de9d48e96ca06e710c` | MIT | Pure HTML/CSS/JS, GitHub Pages, simple batch conversion/ZIP/crop UX | Extremely compatible with Random Info Pages architecture | **Secondary source / static UX reference** |
| `nodeca/pica` | `f897666f18e9daeff540fe03d2708ba74214a046` (10.0.3) | MIT | Predictable high-quality browser resizing with worker/WASM assistance where available | Strong focused dependency, mature and current | **Use for resizing** |
| `fengyuanchen/cropperjs` | `fb4b379b74c237b9366e83c09049a5db796b3f87` | MIT | Mature mouse/touch crop selection and transforms | Avoids reinventing a difficult mobile interaction | **Use for crop UI** |
| `mattdesl/gifenc` | `27db5b982dba701ca440b55ea36fad3999040973` | MIT | Small fast JavaScript GIF encoder | Better fit than FFmpeg for image/video-frame-to-GIF | **Use for GIF encoding** |
| `Suemura/client-side-image-converter` | `4bde3a9b07af41585df18ce61dd493d58bfc7cf9` | MIT | Tested local U²-Net background removal, ONNX Runtime Web, WebGPU/WASM fallback, model caching patterns | Small model and static-friendly fallback make it a strong v1 fit | **Primary background-removal source** |
| `lightScout/light-converter` | `1d72b59254ac05b7ab98ee7945d10fda009eb14c` | MIT; BiRefNet MIT; IS-Net Apache-2.0 | Higher-quality local segmentation, guided edge refinement, batch editor | Excellent quality, but its prepared models are ~160 MB and threaded WASM wants headers GitHub Pages cannot set | **Later quality mode/reference** |
| `jamsinclair/jSquash` | `da47a2be3b302beb5a5ae164a2ab7aa21a041d90` | Apache-2.0 | Browser/Web Worker WASM codecs: AVIF, WebP, JPEG, JXL, Oxipng, resize | Best path for advanced formats without server processing, but increases asset/runtime complexity | **Lazy advanced-codec layer** |
| `nervtech/browser-image-compressor` | `01940fdfbc3a8c96facb65f83f0336d05fbffec2` | MIT | Target-size compression algorithm and batch error handling | Useful focused algorithm, not a better overall foundation than Wendy Liga's converter | **Adapt target-size algorithm only** |
| `getalatify/AlatifyWeb` | `5d2fde2372aa02a6821e48f9309b01bfe8a36569` | AGPL-3.0 | Broad feature set and privacy-first product ideas | Direct code reuse would introduce AGPL obligations | **Reference only** |

## Why `wendyliga/converter` is the core source

Its core is unusually close to the hardening work Image Studio currently needs:

- `src/core/decodeImage.ts` uses `createImageBitmap` first and falls back through an `HTMLImageElement`, so a missing/buggy bitmap decode path does not break the entire converter.
- `src/core/canvasExport.ts` supports OffscreenCanvas when available and DOM Canvas as fallback.
- It explicitly verifies the returned blob MIME, avoiding silent browser fallback when an encoder is unsupported.
- JPEG export paints an explicit background before drawing transparent input.
- It sets high-quality image smoothing.
- `src/core/convertImage.ts` moves resize/encode work to a worker when OffscreenCanvas is available and falls back cleanly to the main thread.
- Its ZIP path uses `fflate` and stores already-compressed image bytes without wasting CPU recompressing them.
- Its codebase contains focused tests for resize, file detection, metadata, and filename behavior.

The Random Info Pages implementation should port only the useful core behavior to plain static JavaScript rather than importing React/Vite.

## Why PicBrew is not the primary source

PicBrew is a particularly good architecture match because it is pure HTML/CSS/JavaScript and already deploys on GitHub Pages. Its converter demonstrates a concise `Convert All` loop, progress UI, file-result list, JPEG white background, and ZIP download.

However, its conversion code is intentionally simpler than `wendyliga/converter`: it does not have the same worker fallback, decode fallback, output MIME validation, typed error model, or defensive processing pipeline. Use PicBrew for compact UI/flow patterns rather than as the sole processing engine.

## Resize choice: Pica

The current Image Studio uses raw `drawImage()` when resizing. That is acceptable as a fallback but browser scaling quality differs. Pica exists specifically to provide predictable high-quality browser resize behavior and can use workers/WASM where supported without requiring them.

Plan:

- preserve native Canvas as fallback;
- lazy-load or vendor Pica when an actual resize is requested;
- skip Pica for format-only conversion at unchanged dimensions;
- avoid upscaling by default unless the user explicitly requests it.

## Crop choice: Cropper.js

A responsive cropper is deceptively complex on touch devices. Cropper.js is current, MIT-licensed, and already handles the selection/transformation interaction. Use it only when Crop mode is activated so it does not affect initial tool load.

## Batch and ZIP

Batch processing should use the processing state model demonstrated by the reviewed MIT projects:

- each item has pending / processing / complete / error state;
- one failed image does not cancel the rest of the batch;
- the user can download individual successful outputs;
- `Download all` creates a ZIP from successful outputs only;
- duplicate output filenames are made unique;
- already-compressed image bytes should be ZIP-stored without an unnecessary second compression pass.

Use `fflate` for the archive layer. It is small, browser-focused, and MIT-licensed.

## Compression improvements

Add two modes:

1. **Quality**: direct JPEG/WebP quality percentage.
2. **Target size**: adapt the MIT-licensed algorithm from `nervtech/browser-image-compressor`:
   - binary-search encoder quality;
   - if quality alone cannot hit the requested byte target and resolution is not locked, progressively lower dimensions;
   - return the closest successful result rather than failing the entire job.

PNG remains lossless in the browser-native path; codec-specific PNG optimization can later use jSquash/Oxipng.

## GIF strategy

Do not make FFmpeg the default GIF engine.

Use `gifenc` for encoding because it is small, focused, and MIT-licensed. Inputs:

- still images: decode to Canvas frames;
- browser-decodable video: seek a `<video>` element to selected timestamps, draw frames to Canvas, and encode them with `gifenc`;
- unsupported video codecs: explain the limitation rather than shipping a very large media runtime for every user.

This covers the main GIF-maker use case without the download/performance/license complexity of `ffmpeg.wasm` + an FFmpeg core. FFmpeg remains a later optional path only if support for formats the browser cannot decode becomes important.

## Background-removal strategy

### Default v1 path

Use the approach from `Suemura/client-side-image-converter`:

- project code is MIT;
- `u2netp.onnx` is about 4.6 MB;
- upstream U²-Net model/weights are Apache-2.0;
- `onnxruntime-web` is MIT;
- input is resized to 320×320, normalized, inferred locally, mask-resized back to the source, and multiplied into source alpha;
- WebGPU is attempted first with a WASM fallback;
- WASM can run single-threaded without COOP/COEP, which matters for GitHub Pages.

Port the pure preprocessing/postprocessing functions and the minimal inference/session loader into plain JavaScript. Keep the model and ONNX runtime lazy-loaded and cached.

### Later high-quality mode

`lightScout/light-converter` has a much more sophisticated pipeline: BiRefNet/IS-Net, second-pass contrast enhancement, guided filtering, hole filling, speckle cleanup, and manual edge editing. It is the stronger quality reference, but its generated model set is roughly 160 MB. That is too expensive as the mandatory first background-removal experience.

A later `Quality` model can borrow/adapt this pipeline if the additional download is clearly opt-in.

## Advanced format strategy

Keep PNG/JPEG/WebP fast with native browser APIs. Add jSquash modules lazily for formats or optimizers that need real codecs, especially:

- AVIF encode/decode;
- JPEG-specific compression where useful;
- WebP codec fallback/advanced settings;
- JPEG XL if there is user demand;
- Oxipng for PNG size optimization.

Do not make every visitor download these WASM codecs up front.

## Explicit exclusions

### AlatifyWeb

Alatify is now verified as AGPL-3.0, not a permissive source. Its broad feature set can inform product decisions, but no Alatify implementation code should be copied into the current Toolbox unless the entire licensing strategy is deliberately reconsidered.

### IMG.LY background-removal-js

Also copyleft/AGPL-oriented for this use case. Keep as a behavioral reference only.

### IT-Tools

GPL-family. Keep as a utility UX reference only.

## Implementation order after this review

1. Replace the fragile current Image Studio decode/export path with the robust MIT patterns from `wendyliga/converter`.
2. Add MIME verification, JPEG background control, decode fallback, clear per-file errors, cleanup, and no-upscale controls.
3. Add real batch processing and `fflate` ZIP export.
4. Add Pica-backed resize and target-size compression.
5. Add Cropper.js crop mode.
6. Add `gifenc` GIF maker.
7. Add U²-Net background removal with ONNX Runtime Web.
8. Add jSquash advanced codecs only after the core is stable.
9. Consider Light Converter-style high-quality background removal only as an opt-in enhancement.

## Licensing rule

Before code from any selected source is adapted into production files, add the exact source revision and affected local file(s) to `tools/OPEN_SOURCE.md`. Preserve MIT/Apache notices as required. Do not copy from entries marked reference-only.