import base from './electron.vite.config'

// 本机 5173 被系统保留（bind 报 EACCES），临时换端口启动，验证完即删。
export default {
  ...base,
  renderer: {
    ...(base as any).renderer,
    server: { host: '127.0.0.1', port: 8905, strictPort: true }
  }
}
