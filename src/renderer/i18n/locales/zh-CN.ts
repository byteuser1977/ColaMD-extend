/**
 * 中文语言资源（简体）
 */

export const zhCN = {
  app: {
    name: 'ColaMD',
    title: 'ColaMD',
  },
  menu: {
    file: '文件',
    edit: '编辑',
    view: '视图',
    theme: '主题',
    help: '帮助',
    plugins: '插件',
    about: '关于',
  },
  fileMenu: {
    new: '新建',
    newSlides: '新建幻灯片...',
    open: '打开...',
    save: '保存',
    saveAs: '另存为...',
    exportPDF: '导出 PDF...',
    exportHTML: '导出 HTML...',
    exportSlides: '导出幻灯片...',
    openAsSlides: '打开为幻灯片',
    close: '关闭',
    quit: '退出',
  },
  editMenu: {
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
  },
  viewMenu: {
    resetZoom: '实际大小',
    zoomIn: '放大',
    zoomOut: '缩小',
    toggleFullscreen: '切换全屏',
  },
  themeMenu: {
    light: '浅色',
    dark: '深色',
    elegant: '优雅',
    newsprint: '新闻纸',
    importTheme: '导入主题...',
  },
  helpMenu: {
    about: '关于 ColaMD',
  },
  export: {
    export: '导出',
    exportPDF: '导出 PDF',
    exportHTML: '导出 HTML',
    exportSlides: '导出幻灯片',
  },
  slides: {
    slides: '幻灯片',
    newSlides: '新建幻灯片',
    openAsSlides: '打开为幻灯片',
  },
  about: {
    about: '关于',
    aboutApp: '关于 ColaMD',
    exit: '退出',
  },
  toast: {
    saved: '已保存',
    saveFailed: '保存失败',
    saveCancelled: '已取消或保存失败',
  },
  mobile: {
    menuTitle: 'ColaMD',
    close: '关闭',
  },
} as const

export type LocaleKeys = typeof zhCN
