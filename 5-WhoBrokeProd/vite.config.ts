import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020'
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts']
  }
} as any)
