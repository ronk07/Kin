import { Colors, Spacing } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface ContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  withGradient?: boolean;
}

export function Container({ children, style, withGradient = true }: ContainerProps) {
  if (withGradient) {
    return (
      <LinearGradient
        colors={[
          '#251B1B',                   // Deepest dark brown (slightly darker than gradientStart)
          Colors.gradientStart,        // #2A1F1F - Darkest at top
          '#2D2222',                   // Rich dark brown with subtle warmth
          '#322727',                   // Transitioning brown
          Colors.darkBrown,            // #3B2F2F - Main dark brown
          '#3E3232',                   // Warm mid-brown
          '#453939',                   // Lighter warm brown
          '#4A3D3D',                   // Main lighter brown
          Colors.darkBrownLighter,     // #4A3D3D - Lighter dark brown
          '#504343',                   // Light warm brown
          '#554949',                   // Even lighter with warmth
          '#5A4E4E',                   // Lightest brown at bottom
        ]}
        style={[styles.container, style]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.08, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.92, 1]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors.background }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
});

