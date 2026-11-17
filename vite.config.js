import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,
  },
  // enGAN.AI: the inference worker lazy-loads onnxruntime-web, so it must be an ES worker.
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  plugins: [react()],
});
