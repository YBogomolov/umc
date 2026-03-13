import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  base: '/umc/',
  plugins: [react(), topLevelAwait()],
  worker: { format: 'es' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
