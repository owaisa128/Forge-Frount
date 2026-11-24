import { defineConfig } from 'vite';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const projectRoot = realpathSync(process.cwd());
const sourceRoot = fileURLToPath(new URL('./src', import.meta.url));
// Keep Vite and esbuild on the same physical root when client is a junction.
process.chdir(projectRoot);

// https://vite.dev/config/
export default defineConfig({
  root: projectRoot,
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': sourceRoot,
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
