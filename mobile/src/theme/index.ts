import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

import { COLORS } from './ThemeContext';
export { COLORS };

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  soft: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
};

export const LAYOUT = {
  window: {
    width,
    height,
  },
  isSmallDevice: width < 375,
};

export { ThemeProvider, useTheme, LIGHT_COLORS } from './ThemeContext';

