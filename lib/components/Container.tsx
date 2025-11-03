import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing } from '@/constants/theme';

interface ContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  withGradient?: boolean;
}

export function Container({ children, style, withGradient = true }: ContainerProps) {
  if (withGradient) {
    return (
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd]}
        style={[styles.container, style]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
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

