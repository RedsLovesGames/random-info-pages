# Data Studio Open-Source Disclosure

Data Studio is a static, local-first Toolbox workspace. User-selected datasets are processed in the browser. The dependencies below are downloaded only when the corresponding feature is used; selecting a local file does not upload that file to those package hosts.

## Papa Parse

- Project: https://github.com/mholt/PapaParse
- Package/version: `papaparse@5.7.0`
- License: MIT.
- Toolbox use: lazy CSV/TSV parsing with header rows, dynamic primitive typing, empty-row skipping, and delimiter handling.
- Local integration: `tools/data/data-io.js`, `tools/data/data-engines.js`.
- Delivery: pinned jsDelivr browser build.

## SheetJS Community Edition

- Project: https://sheetjs.com/
- Version: `SheetJS CE 0.20.3`
- License: Apache-2.0.
- Toolbox use: lazy XLSX/XLS/ODS import and XLSX export.
- Local integration: `tools/data/data-io.js`, `tools/data/data-engines.js`.
- Delivery: official `cdn.sheetjs.com` standalone browser build.
- Required upstream attribution: SheetJS Community Edition -- https://sheetjs.com/ — Copyright (C) 2012-present SheetJS LLC — Licensed under the Apache License, Version 2.0.

## DuckDB-Wasm

- Project: https://github.com/duckdb/duckdb-wasm
- Package/version: `@duckdb/duckdb-wasm@1.33.0`
- License: MIT, copyright Stichting DuckDB Foundation.
- Toolbox use: lazy local SQL, Parquet import/export, and SQLite import where the official SQLite scanner extension is available.
- Local integration: `tools/data/data-engines.js`, `tools/data/data-io.js`, `tools/data/data-app.js`.
- Delivery: pinned jsDelivr ESM package plus the browser bundle/worker selected by DuckDB-Wasm.
- SQLite note: SQLite import loads DuckDB's `sqlite_scanner` extension through DuckDB's extension mechanism. This can require an additional first-use network download; the selected SQLite database remains local.

## Observable Plot

- Project: https://github.com/observablehq/plot
- Package/version: `@observablehq/plot@0.6.17`
- License: ISC, copyright Observable, Inc.
- Toolbox use: one lazy exploratory chart at a time: bar, line, scatter, histogram, box plot, and heatmap.
- Local integration: `tools/data/data-charts.js`, `tools/data/data-engines.js`.
- Delivery: pinned jsDelivr ESM package.

## Browser APIs

Data Studio also uses native File/Blob/Object URL, Web Worker, localStorage, DOM, and download APIs. JSON and JSONL parsing/export are native JavaScript paths and require no third-party parser.
