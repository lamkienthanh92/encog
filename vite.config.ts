import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' lets the built app run from any GitHub Pages sub-path or a local folder.
export default defineConfig({
  plugins: [react()],
  base: './',
});
