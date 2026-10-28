import { defineConfig } from 'vite'

export default defineConfig({
  root: 'ui',
  server: {
    port: 5199,
    strictPort: true,
    host: '127.0.0.1',
  },
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
  build: {
    outDir: '../.ui-dist',
    emptyOutDir: true,
  },
})
