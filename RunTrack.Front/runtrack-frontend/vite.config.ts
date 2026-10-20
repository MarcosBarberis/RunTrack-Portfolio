import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE permite publicar la app en un subdirectorio (por ejemplo, GitHub Pages).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5053',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
