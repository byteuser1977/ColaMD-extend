export interface ElectronAPI {
    openFile: () => Promise<{
        path: string;
        content: string;
    } | null>;
    openFilePath: (path: string) => Promise<{
        path: string;
        content: string;
    } | null>;
    saveFile: (content: string) => Promise<boolean>;
    saveFileAs: (content: string) => Promise<boolean>;
    exportPDF: () => Promise<boolean>;
    exportHTML: (html: string) => Promise<boolean>;
    newSlides: () => Promise<string | null>;
    openAsSlides: (content: string) => Promise<boolean>;
    loadCustomTheme: () => Promise<{
        name: string;
        css: string;
    } | null>;
    loadThemeCSS: (fileName: string) => Promise<string | null>;
    getPathForFile: (file: File) => string;
    openExternal: (url: string) => void;
    onFileChanged: (callback: (content: string) => void) => void;
    onNewFile: (callback: () => void) => void;
    onFileOpened: (callback: (data: {
        path: string;
        content: string;
    }) => void) => void;
    onMenuOpen: (callback: () => void) => void;
    onMenuSave: (callback: () => void) => void;
    onMenuSaveAs: (callback: () => void) => void;
    onMenuExportPDF: (callback: () => void) => void;
    onMenuExportHTML: (callback: () => void) => void;
    onMenuNewSlides: (callback: () => void) => void;
    onMenuOpenAsSlides: (callback: () => void) => void;
    onNewSlidesContent: (callback: (content: string) => void) => void;
    onSetTheme: (callback: (theme: string) => void) => void;
    onSetCustomCSS: (callback: (css: string) => void) => void;
    exportSlides: (content: string) => Promise<boolean>;
    onMenuExportSlides: (callback: () => void) => void;
    onAgentActivity: (callback: (state: string) => void) => void;
    registerPlugins: (plugins: Array<{
        id: string;
        name: string;
        enabled: boolean;
    }>) => Promise<boolean>;
    syncPluginState: (id: string, enabled: boolean) => Promise<void>;
    onMenuTogglePlugin: (callback: (id: string) => void) => void;
    onMenuImportTheme: (callback: () => void) => void;
    exportFile: (dataUrl: string, defaultName: string) => Promise<boolean>;
}
