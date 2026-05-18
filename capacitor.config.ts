import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cn.bytechain.colamd',
  appName: 'ColaMD',
  webDir: 'dist/renderer',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
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

export default config;
