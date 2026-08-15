import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  server: { port: 5187 },
  build: {
    target: 'es2020',
    outDir: 'dist',
    chunkSizeWarningLimit: 800
  }
})
