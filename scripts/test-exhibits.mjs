import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const files=['tests/home-index.test.mjs','tests/cryptography-museum.test.mjs','tests/one-million.test.mjs','tests/algorithm-arena.test.mjs','tests/music-microscope.test.mjs','tests/exhibits-integration.test.mjs'];
const result=spawnSync(process.execPath,['--test',...files],{cwd:fileURLToPath(new URL('../',import.meta.url)),stdio:'inherit'});
process.exitCode=result.status ?? 1;
