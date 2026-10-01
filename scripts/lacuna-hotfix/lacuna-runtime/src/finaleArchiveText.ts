import { CHUNK_01 } from './finaleArchiveChunk01.js';
import { CHUNK_02 } from './finaleArchiveChunk02.js';
import { CHUNK_03 } from './finaleArchiveChunk03.js';
import { CHUNK_04 } from './finaleArchiveChunk04.js';

export const ARCHIVE_FILE_NAME = 'MISSING_INTERVAL.arc';
export const MISSING_INTERVAL_SHA256 = 'b8b837f0161c8bb264f63f82693c2f12c1fdf24ad5864f463fe86794a5dfbf89';
export const MISSING_INTERVAL_GZIP_BASE64 = CHUNK_01 + CHUNK_02 + CHUNK_03 + CHUNK_04;

export async function loadMissingIntervalArc(): Promise<string> {
  const binary = atob(MISSING_INTERVAL_GZIP_BASE64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  if (typeof DecompressionStream !== 'function') {
    throw new Error('This browser cannot decompress the recovered archive.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}
