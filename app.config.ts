import type { ExpoConfig } from 'expo/config'

const config: ExpoConfig = {
  name: 'Arrout',
  slug: 'arrout',
  version: '1.0.0',
  scheme: 'arrout',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0F1120',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.arrout.app',
  },
  android: {
    package: 'com.arrout.app',
    adaptiveIcon: {
      backgroundColor: '#0F1120',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  extra: {
    eas: {
      projectId: '74f4c978-7c3a-4233-b1ea-0fc75b5d1514',
    },
  },
  plugins: ['expo-router', 'expo-audio'],
  experiments: {
    typedRoutes: true,
  },
}

export default config
