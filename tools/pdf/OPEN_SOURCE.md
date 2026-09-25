# PDF & Documents Open-Source Sources

All user PDF/image bytes stay in the browser. The libraries below are fetched lazily only when the relevant PDF feature is used.

## pdf-lib
- Repository: https://github.com/Hopding/pdf-lib
- Package/version: `pdf-lib@1.17.1`
- License: MIT
- Runtime: pinned jsDelivr ES module
- Used for: loading and creating PDFs, copying/reordering pages, rotation, blank/image pages, overlays, page numbers, form flattening, and final PDF export.
- Integration: `pdf-engine.js` wraps the upstream public API. No framework/UI code is copied.

## Mozilla PDF.js
- Repository: https://github.com/mozilla/pdf.js
- Package/version: `pdfjs-dist@6.3.289`
- License: Apache-2.0
- Runtime: pinned jsDelivr module and worker
- Used for: page parsing/rendering, thumbnails/previews, metadata, and text extraction.
- Integration: `pdf-engine.js` uses the standard `getDocument`, `getPage`, viewport, render, metadata, and text-content APIs.

## fflate
- Repository: https://github.com/101arrowz/fflate
- Package/version: `fflate@0.8.3`
- License: MIT
- Runtime: pinned jsDelivr ES module
- Used for: packaging PDF-to-image output into a ZIP. Image payloads are stored at ZIP level 0 because PNG/JPEG data is already compressed.

## Tesseract.js
- Repository: https://github.com/naptha/tesseract.js
- Package/version: `tesseract.js@7.0.0`
- License: Apache-2.0
- Runtime: pinned jsDelivr ESM build, loaded only when OCR is invoked
- Used for: on-device OCR of rendered PDF pages.
- Important limitation: this workspace currently returns OCR text/TXT. It does not claim to create a searchable-text PDF layer.

## Browser platform APIs
Canvas, File/Blob, Object URLs, drag/drop, Indexed browser primitives, and native download behavior are used directly where possible.

## Compression behavior
The current `Compress copy` mode intentionally rasterizes each page to JPEG before rebuilding a PDF. The UI discloses that this can remove selectable text, forms, links, and vector content. It produces a separate copy and does not mutate the working document.
