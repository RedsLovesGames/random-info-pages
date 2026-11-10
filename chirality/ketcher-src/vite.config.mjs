import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
export default defineConfig({
 plugins:[react()],
 base:'./',
 resolve:{alias:{events:resolve(process.cwd(),'node_modules/events/events.js')}},
 build:{outDir:'dist',assetsInlineLimit:0,chunkSizeWarningLimit:5500}
});
