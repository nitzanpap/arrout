import type { ExpoConfig } from 'expo/config'

const { version } = require('./package.json')

const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number)
const versionCode = major * 10000 + minor * 100 + patch

const config: ExpoConfig = {
  name: 'Arrout',
  slug: 'arrout',
  version,
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
    buildNumber: String(versionCode),
  },
  android: {
    package: 'com.arrout.app',
    permissions: [],
    versionCode,
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
  plugins: ['expo-router', 'expo-audio', 'expo-asset'],
  experiments: {
    typedRoutes: true,
  },
}

export default config
