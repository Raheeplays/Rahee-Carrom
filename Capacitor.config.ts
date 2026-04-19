import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.app',
  appName: 'MyCapacitorApp',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false // Humne manual code likha hai isliye false
    }
  }
};

export default config;

