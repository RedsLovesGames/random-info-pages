# Toolbox Open-Source Audit

This file records third-party projects evaluated or incorporated by the Random Info Pages Toolbox. An entry marked **Reference only** means no source code from that project has been copied into Toolbox.

## Browser/platform APIs

### Web Platform APIs
- Source: browser standards implemented by the user's browser.
- Use: `Intl.DateTimeFormat`, Canvas 2D, `createImageBitmap` where supported, `HTMLCanvasElement.toBlob`, `localStorage`, Clipboard API, File/Blob/Object URL APIs.
- Status: **Primary implementation path** for time-zone formatting, basic image conversion/resizing, persistence, clipboard, and local files.
- Reason: keeps the core Toolbox small, local-first, static-host compatible, and dependency-light.

## Evaluated projects

### ffmpeg.wasm
- Repository: https://github.com/ffmpegwasm/ffmpeg.wasm
- Status: **Candidate for lazy-loaded advanced media operations; not yet incorporated.**
- Wrapper license: MIT.
- Important core-license note: the current `@ffmpeg/core` package declares `GPL-2.0-or-later`, while FFmpeg-derived core code can have LGPL/GPL obligations depending on the build and enabled components. Do not describe the complete runtime as simply MIT.
- Planned use if incorporated: operations that native Canvas/browser codecs do not reasonably cover, such as selected animated/video conversions.
- Integration rule: pin the exact package/core versions and document the distributed core's applicable license before shipping it.

### IMG.LY background-removal-js
- Repository: https://github.com/imgly/background-removal-js
- License: AGPL according to upstream README.
- Status: **Reference only / not approved for direct incorporation into the current permissive, low-obligation path.**
- Useful behavior: browser-local ML background removal and privacy-preserving UX.
- Decision: seek a permissively licensed alternative or implement a clearly separated optional path only if its licensing obligations are deliberately accepted.

### IT-Tools
- Repository family: https://github.com/CorentinTh/it-tools (and maintained forks where applicable)
- License: GPL-family releases/forks require copyleft review; the currently surfaced maintained container/fork is GPL-3.0.
- Status: **Reference only.**
- Useful behavior: compact utility organization and transformation-tool UX.
- Decision: implement Toolbox text transformations independently with small pure JavaScript functions rather than copying IT-Tools code.

## Not yet verified / not incorporated
The earlier design discussion mentioned ZoneMap, Alatify, PicBrew/ImageToolkit, and Light Converter. No code from those names is incorporated at this stage. Exact repository identity, revision, maintenance state, and license must be verified before any future reuse.

## Incorporation ledger
At the end of Phase 0, Toolbox contains no copied third-party implementation code. Core Phase 1 and Time Zone work should therefore begin with native browser APIs. Any later incorporation must add the exact revision/tag, license, reused files/logic, modifications, and required notices here before the dependency is committed.