import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  server: { port: 5186 },
  build: { outDir: 'dist', target: 'es2020' }
})
