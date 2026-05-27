/**
 * 英文语言资源
 */

export const en = {
  app: {
    name: 'ColaMD',
    title: 'ColaMD',
  },
  menu: {
    file: 'File',
    edit: 'Edit',
    view: 'View',
    theme: 'Theme',
    help: 'Help',
    plugins: 'Plugins',
    about: 'About',
  },
  fileMenu: {
    new: 'New',
    newSlides: 'New Slides...',
    open: 'Open...',
    save: 'Save',
    saveAs: 'Save As...',
    exportPDF: 'Export PDF...',
    exportHTML: 'Export HTML...',
    exportSlides: 'Export Slides...',
    openAsSlides: 'Open as Slides',
    close: 'Close',
    quit: 'Quit',
  },
  editMenu: {
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
  },
  viewMenu: {
    resetZoom: 'Actual Size',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    toggleFullscreen: 'Toggle Fullscreen',
  },
  themeMenu: {
    light: 'Light',
    dark: 'Dark',
    elegant: 'Elegant',
    newsprint: 'Newsprint',
    importTheme: 'Import Theme...',
  },
  helpMenu: {
    about: 'About ColaMD',
  },
  export: {
    export: 'Export',
    exportPDF: 'Export PDF',
    exportHTML: 'Export HTML',
    exportSlides: 'Export Slides',
  },
  slides: {
    slides: 'Slides',
    newSlides: 'New Slides',
    openAsSlides: 'Open as Slides',
  },
  about: {
    about: 'About',
    aboutApp: 'About ColaMD',
    exit: 'Exit',
  },
  toast: {
    saved: 'Saved',
    saveFailed: 'Save failed',
    saveCancelled: 'Save cancelled or failed',
  },
  mobile: {
    menuTitle: 'ColaMD',
    close: 'Close',
  },
} as const

export type LocaleKeys = typeof en
