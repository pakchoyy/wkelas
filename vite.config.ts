import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist/renderer',
    rollupOptions: {
      // Halaman aktivasi tersembunyi (tujuan redirect Lynk) dibangun terpisah dari aplikasi.
      input: { main: resolve(__dirname, 'index.html'), aktivasi: resolve(__dirname, 'aktvs-wk.html') },
    },
  },
})
