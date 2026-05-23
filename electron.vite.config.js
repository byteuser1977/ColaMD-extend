"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_vite_1 = require("electron-vite");
var path_1 = require("path");
exports.default = (0, electron_vite_1.defineConfig)({
    main: {
        build: {
            outDir: 'dist/main',
            rollupOptions: {
                input: (0, path_1.resolve)(__dirname, 'src/main/index.ts')
            }
        }
    },
    preload: {
        build: {
            outDir: 'dist/preload',
            rollupOptions: {
                input: (0, path_1.resolve)(__dirname, 'src/preload/index.ts')
            }
        }
    },
    renderer: {
        root: (0, path_1.resolve)(__dirname, 'src/renderer'),
        build: {
            outDir: (0, path_1.resolve)(__dirname, 'dist/renderer'),
            rollupOptions: {
                input: (0, path_1.resolve)(__dirname, 'src/renderer/index.html')
            }
        }
    }
});
