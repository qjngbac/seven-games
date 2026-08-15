import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 800
  },
  server: {
    host: '127.0.0.1',
    port: 5188
  }
})
