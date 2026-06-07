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
  const flattenedStyle = StyleSheet.flatten(style) || {};

  // Separate layout/padding styles for the inner content container from the outer container
  const {
    // Layout and Flexbox properties
    flexDirection,
    alignItems,
    justifyContent,
    flexWrap,
    alignContent,
    gap,
    rowGap,
    columnGap,

    // Padding properties
    padding,
    paddingHorizontal,
    paddingVertical,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,

    // Dimensions/Margins/Borders/etc stay on the outer container
    ...containerStyle
  } = flattenedStyle as any;

  const shouldFillContent = flattenedStyle.height != null || flattenedStyle.minHeight != null;

  const contentStyle = {
    ...(shouldFillContent ? { flex: 1 } : null),
    flexDirection,
    alignItems,
    justifyContent,
    flexWrap,
    alignContent,
    gap,
    rowGap,
    columnGap,
    padding,
    paddingHorizontal,
    paddingVertical,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
  };

  return (
    <View style={[styles.container, { borderRadius }, containerStyle]} {...props}>
      <BlurView
        intensity={intensity}
        tint={tint}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      <View style={[styles.content, { borderRadius }, contentStyle]}>{children}</View>
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
  content: {},
});
