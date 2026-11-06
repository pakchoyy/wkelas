import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { resolve } from 'path'
import postcss from 'postcss'
import cascadeLayers from '@csstools/postcss-cascade-layers'
import oklab from '@csstools/postcss-oklab-function'
import colorMix from '@csstools/postcss-color-mix-function'
import type { Plugin } from 'vite'

// Browser dalam aplikasi (WebView Android lama, dibuka dari WA/Kreacy) tidak mengenal @layer dan oklch(),
// sehingga seluruh CSS Tailwind v4 diabaikan. Ratakan @layer dan beri warna cadangan setelah build.
function legacyCss(): Plugin {
  return {
    name: 'legacy-css',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type !== 'asset' || !file.fileName.endsWith('.css')) continue
        const result = await postcss([cascadeLayers(), oklab({ preserve: true }), colorMix({ preserve: true })]).process(String(file.source), { from: undefined })
        file.source = result.css
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), legacyCss()],
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
