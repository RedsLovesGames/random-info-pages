import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {nodePolyfills} from 'vite-plugin-node-polyfills';
export default defineConfig({plugins:[react(),nodePolyfills({include:['events','buffer','process','util','stream','path']})],base:'./',build:{outDir:'dist',assetsInlineLimit:0,chunkSizeWarningLimit:5500}});
