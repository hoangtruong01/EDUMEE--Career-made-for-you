import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const COLORS = {
  // Brand Colors
  primary: '#3B82F6', // HSL(205 90% 55%) - Blue
  secondary: '#8B5CF6', // HSL(260 60% 65%) - Purple
  accent: '#F97316', // HSL(25 95% 60%) - Orange
  
  // Gradients (Represented as start/end colors)
  gradientHeroStart: '#3B82F6',
  gradientHeroEnd: '#8B5CF6',
  gradientAccentStart: '#F97316',
  gradientAccentEnd: '#EC4899',
  
  // Backgrounds
  background: '#0F172A', // Darker slate
  card: '#1E293B',
  cardLight: 'rgba(30, 41, 59, 0.6)',
  
  // Text
  foreground: '#F1F5F9',
  muted: '#94A3B8',
  
  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  
  // Borders
  border: 'rgba(148, 163, 184, 0.1)',
  borderLight: 'rgba(148, 163, 184, 0.05)',
};

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
