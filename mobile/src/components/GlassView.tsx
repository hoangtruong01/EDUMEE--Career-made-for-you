import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, RADIUS } from '../theme';

interface GlassViewProps extends ViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderRadius?: number;
}

export const GlassView: React.FC<GlassViewProps> = ({ 
  children, 
  intensity = 40, 
  tint = 'dark', 
  borderRadius = RADIUS.lg,
  style,
  ...props 
}) => {
  return (
    <View style={[styles.container, { borderRadius }, style]} {...props}>
      <BlurView 
        intensity={intensity} 
        tint={tint} 
        style={[StyleSheet.absoluteFill, { borderRadius }]} 
      />
      <View style={[styles.content, { borderRadius }]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
  },
});
