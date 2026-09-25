# Developer Lab Open-Source Disclosure

Developer Lab is a static, local-first Toolbox workspace. Text entered into format, encode, inspect, validate, compare, hash, regex, diff, and playground tools remains in the browser. The API Request tool is the explicit exception: when the user presses **Send request**, the configured request is sent directly from the browser to the URL the user entered, subject to that server's CORS policy. Toolbox does not proxy the request.

## js-yaml

- Project: https://github.com/nodeca/js-yaml
- Package/version: `js-yaml@5.4.2`
- License: MIT.
- Toolbox use: lazy JSON → YAML and YAML → JSON conversion.
- Local integration: `tools/developer/developer-app.js`.
- Delivery: pinned jsDelivr ESM build loaded only when the YAML tool is invoked.

## Ajv

- Project: https://github.com/ajv-validator/ajv
- Package/version: `ajv@8.17.1`
- License: MIT.
- Toolbox use: lazy JSON Schema validation.
- Local integration: `tools/developer/developer-app.js`.
- Delivery: pinned jsDelivr ESM build loaded only when JSON Schema validation is invoked.

## Existing shared dependencies

Text Studio continues to use the already-audited pinned `marked@18.0.14` and `dompurify@3.4.16` builds for sanitized Markdown preview. No additional library is required for Text Studio's cleanup, replacement, readability, frequency, list, or line-diff operations.

## Browser APIs

Developer Lab also uses native browser APIs where possible:

- `TextEncoder` / `TextDecoder` for UTF-8 transformations
- Web Crypto for SHA-256, SHA-384, and SHA-512
- `URL` / `URLSearchParams` for URL inspection
- `DOMParser` / `XMLSerializer` for XML parsing and formatting
- `fetch` for explicit user-requested API calls
- sandboxed `iframe[srcdoc]` with `sandbox="allow-scripts"` for the HTML/CSS/JS playground
- Clipboard, Blob, and download APIs for local output

JWT and PEM tools decode/inspect only. They do not claim cryptographic verification unless a future explicitly implemented verification path is added.
