/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: 'PaiShare',
  slug: 'paishare',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: 'paishare',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.paishare.app',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#1A2421',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    package: 'com.paishare.app',
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
    // SPA：動態 trip/[id] 路由靠客戶端；適合 GitHub Pages
    output: 'single',
  },
  plugins: ['expo-router', 'expo-font'],
  // GitHub Pages 子路徑：https://<user>.github.io/PaiShare/
  // 本機 npm run web 不設，避免路徑錯亂；CI / deploy 設 GITHUB_PAGES=true
  experiments: {
    ...(process.env.GITHUB_PAGES === 'true' ? { baseUrl: '/PaiShare' } : {}),
  },
};

module.exports = { expo: config };
