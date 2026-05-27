import { defineConfig } from 'vite'
import { resolve } from 'path'

/**
 * Library build config for @bytechain.cn/colamd/renderer.
 * Produces a single ESM bundle containing Milkdown + ProseMirror + KaTeX + Mermaid
 * for consumption by external applications (e.g., VSCode extension WebViews).
 */
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/renderer/editor/lib.ts'),
      formats: ['es'],
      fileName: () => 'colamd-renderer.js',
    },
    outDir: 'dist/lib',
    rollupOptions: {
      external: [],
      output: {
        // Single chunk — VSCode WebView cannot resolve dynamic imports
        inlineDynamicImports: true,
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: false,
  },
  resolve: {
    alias: {
      '@milkdown/kit': '@milkdown/kit',
    },
  },
})
