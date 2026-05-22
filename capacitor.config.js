"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config = {
    appId: 'cn.bytechain.colamd',
    appName: 'ColaMD',
    webDir: 'dist/renderer',
    server: {
        androidScheme: 'https'
    },
    android: {
        allowMixedContent: true,
        captureInput: false, // Must be false — true replaces WebView InputConnection with BaseInputConnection, breaking CJK IME
        useLegacyBridge: false,
        webContentsDebuggingEnabled: false,
    },
    plugins: {
        Filesystem: {
            requestLegacyExternalStorage: true
        },
        StatusBar: {
            style: 'DARK',
            backgroundColor: '#ffffff'
        },
        CapacitorHttp: {
            enabled: true
        }
    }
};
exports.default = config;
