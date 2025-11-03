import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Typography, BorderRadius, Shadows } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
}: ButtonProps) {
  const getButtonStyle = () => {
    if (disabled || loading) {
      return [styles.button, styles.buttonDisabled, fullWidth && styles.fullWidth];
    }
    switch (variant) {
      case 'primary':
        return [styles.button, styles.buttonPrimary, fullWidth && styles.fullWidth];
      case 'secondary':
        return [styles.button, styles.buttonSecondary, fullWidth && styles.fullWidth];
      case 'outline':
        return [styles.button, styles.buttonOutline, fullWidth && styles.fullWidth];
      default:
        return [styles.button, styles.buttonPrimary, fullWidth && styles.fullWidth];
    }
  };

  const getTextStyle = () => {
    if (disabled || loading) {
      return [styles.text, styles.textDisabled];
    }
    switch (variant) {
      case 'primary':
        return [styles.text, styles.textPrimary];
      case 'secondary':
        return [styles.text, styles.textSecondary];
      case 'outline':
        return [styles.text, styles.textOutline];
      default:
        return [styles.text, styles.textPrimary];
    }
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? Colors.accent : Colors.beige} />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...Shadows.small,
  },
  buttonPrimary: {
    backgroundColor: Colors.accent,
  },
  buttonSecondary: {
    backgroundColor: Colors.surfaceElevated,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  buttonDisabled: {
    backgroundColor: Colors.textSecondary + '40',
    ...Shadows.small,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    fontFamily: Typography.bodyFont,
  },
  textPrimary: {
    color: Colors.beige,
  },
  textSecondary: {
    color: Colors.beige,
  },
  textOutline: {
    color: Colors.accent,
  },
  textDisabled: {
    color: Colors.textSecondary,
  },
});

