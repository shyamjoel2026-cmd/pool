import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The git commit this copy was built from, shown in the app so anyone can tell which version is running.
const build = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'local';
  }
})();

// `--mode single` inlines everything into one HTML file for the shareable demo link.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  define: { __POOL_BUILD__: JSON.stringify(build) },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
}));
