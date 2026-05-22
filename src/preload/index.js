import { contextBridge, ipcRenderer, webUtils } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    openFile: () => ipcRenderer.invoke('open-file'),
    openFilePath: (path) => ipcRenderer.invoke('open-file-path', path),
    saveFile: (content) => ipcRenderer.invoke('save-file', content),
    saveFileAs: (content) => ipcRenderer.invoke('save-file-as', content),
    exportPDF: () => ipcRenderer.invoke('export-pdf'),
    exportHTML: (html) => ipcRenderer.invoke('export-html', html),
    exportSlides: (content) => ipcRenderer.invoke('export-slides', content),
    newSlides: () => ipcRenderer.invoke('new-slides'),
    openAsSlides: (content) => ipcRenderer.invoke('open-as-slides', content),
    loadCustomTheme: () => ipcRenderer.invoke('load-custom-theme'),
    loadThemeCSS: (fileName) => ipcRenderer.invoke('load-theme-css', fileName),
    getPathForFile: (file) => webUtils.getPathForFile(file),
    openExternal: (url) => ipcRenderer.send('open-external', url),
    onFileChanged: (callback) => {
        ipcRenderer.on('file-changed', (_event, content) => callback(content));
    },
    onNewFile: (callback) => {
        ipcRenderer.on('new-file', () => callback());
    },
    onFileOpened: (callback) => {
        ipcRenderer.on('file-opened', (_event, data) => callback(data));
    },
    onMenuOpen: (callback) => {
        ipcRenderer.on('menu-open', () => callback());
    },
    onMenuSave: (callback) => {
        ipcRenderer.on('menu-save', () => callback());
    },
    onMenuSaveAs: (callback) => {
        ipcRenderer.on('menu-save-as', () => callback());
    },
    onMenuExportPDF: (callback) => {
        ipcRenderer.on('menu-export-pdf', () => callback());
    },
    onMenuExportHTML: (callback) => {
        ipcRenderer.on('menu-export-html', () => callback());
    },
    onMenuNewSlides: (callback) => {
        ipcRenderer.on('menu-new-slides', () => callback());
    },
    onMenuOpenAsSlides: (callback) => {
        ipcRenderer.on('menu-open-as-slides', () => callback());
    },
    onNewSlidesContent: (callback) => {
        ipcRenderer.on('new-slides-content', (_event, content) => callback(content));
    },
    onSetTheme: (callback) => {
        ipcRenderer.on('set-theme', (_event, theme) => callback(theme));
    },
    onSetCustomCSS: (callback) => {
        ipcRenderer.on('set-custom-css', (_event, css) => callback(css));
    },
    onMenuImportTheme: (callback) => {
        ipcRenderer.on('menu-import-theme', () => callback());
    },
    onMenuExportSlides: (callback) => {
        ipcRenderer.on('menu-export-slides', () => callback());
    },
    onAgentActivity: (callback) => {
        ipcRenderer.on('agent-activity', (_event, state) => callback(state));
    },
    registerPlugins: (plugins) => ipcRenderer.invoke('register-plugins', plugins),
    syncPluginState: (id, enabled) => ipcRenderer.invoke('sync-plugin-state', id, enabled),
    onMenuTogglePlugin: (callback) => {
        ipcRenderer.on('menu-toggle-plugin', (_event, id) => callback(id));
    },
    exportFile: (dataUrl, defaultName) => ipcRenderer.invoke('save-export-file', dataUrl, defaultName),
});
