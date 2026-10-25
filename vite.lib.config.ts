import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// 2.x 库渲染器：给下游导出工具链（ColaMD-themes）使用的浏览器 ESM。
//
// 产物固定为 dist/lib/colamd-renderer.js 与 dist/lib/colamd.css 两个文件：下游的本机
// HTTP 服务只暴露这两个路径。因此：
//   - inlineDynamicImports 把 pele/lazy 等动态 import 收进单文件；
//   - assetsInlineLimit 抬高，让 KaTeX 的字体以 data URL 内联进 CSS，离线导出不依赖
//     相对路径；
//   - sourcemap 关闭，避免多出额外文件。
export default defineConfig({
  build: {
    outDir: resolve(__dirname, 'dist/lib'),
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    assetsInlineLimit: 10 * 1024 * 1024,
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      formats: ['es'],
      fileName: () => 'colamd-renderer.js',
      cssFileName: 'colamd'
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true
      }
    }
  }
})
