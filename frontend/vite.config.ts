import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

declare const process: { env: { VITE_BASE_PATH?: string } }

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['./src/tests/setup.ts'],
  },
})
