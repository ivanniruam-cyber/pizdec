import { defineConfig } from 'vite'
export default defineConfig({
  base: './',
  root: 'client',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
