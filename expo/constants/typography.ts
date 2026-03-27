import { Platform } from 'react-native';

const system = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: 'System',
  default: 'System',
});

const systemStrong = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  web: 'System',
  default: 'System',
});

export const Typography = {
  // Clean, professional native typography (SF Pro on iOS, Roboto-ish on Android)
  title: systemStrong,
  titleAlt: system,
  body: system,
  bodyStrong: systemStrong,
};


