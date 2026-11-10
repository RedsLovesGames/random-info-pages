import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import {nodePolyfills} from 'vite-plugin-node-polyfills';

// Ketcher includes mixed ESM/CommonJS (notably Raphael).
// Vite's default transform can leave browser-invalid require() calls.
export default defineConfig({
  plugins:[react(),commonjs(),nodePolyfills({include:['events','buffer','process','util','stream','path']})],
  define:{'process.env':{},global:'window'},
  base:'./',
  build:{outDir:'dist',assetsInlineLimit:0,chunkSizeWarningLimit:5500,commonjsOptions:{transformMixedEsModules:true}}
});
