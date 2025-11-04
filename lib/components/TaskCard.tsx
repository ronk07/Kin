import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { Card } from './Card';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface TaskCardProps {
  title: string;
  subtitle?: string;
  verified: boolean;
  onVerify: (imageUri?: string) => Promise<void>;
  onViewDetails?: () => void;
  caloriesBurned?: number | null;
  durationMinutes?: number | null;
  bibleChapter?: string | null;
  metrics?: Record<string, any>; // New flexible metrics prop
}

export function TaskCard({ 
  title, 
  subtitle, 
  verified, 
  onVerify, 
  onViewDetails,
  caloriesBurned,
  durationMinutes,
  bibleChapter,
  metrics,
}: TaskCardProps) {
  const [loading, setLoading] = useState(false);
  
  // Animation values
  const opacity = useSharedValue(0);
  const scale = useSharedValue(verified ? 1 : 0.95);
  const verifiedScale = useSharedValue(1);

  // Fade in on mount
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value = withSpring(1, { damping: 12 });
  }, []);

  // Animate when verified status changes
  useEffect(() => {
    if (verified) {
      verifiedScale.value = withSpring(1.05, { damping: 8 }, () => {
        verifiedScale.value = withSpring(1, { damping: 8 });
      });
    }
  }, [verified]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const verifiedBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: verifiedScale.value }],
  }));

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your camera and photos to upload proof.'
      );
      return false;
    }
    return true;
  };

  const handleVerifyPress = async () => {
    if (loading || verified) return;

    Alert.alert(
      'Verify Completion',
      'How would you like to verify?',
      [
        {
          text: 'Mark Complete',
          onPress: () => onVerify(),
          style: 'default',
        },
        {
          text: 'Take Photo',
          onPress: async () => {
            const hasPermission = await requestPermissions();
            if (hasPermission) {
              openCamera();
            }
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const hasPermission = await requestPermissions();
            if (hasPermission) {
              openLibrary();
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const openCamera = async () => {
    setLoading(true);

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await onVerify(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openLibrary = async () => {
    setLoading(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await onVerify(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => (
    <>
      <View style={styles.textSection}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        {verified && (
          <>
            {/* Display new metrics if available, otherwise fall back to legacy */}
            {metrics && Object.keys(metrics).length > 0 ? (
              <Text style={styles.detailsText}>
                {Object.entries(metrics)
                  .filter(([_, value]) => value !== null && value !== undefined && value !== '')
                  .map(([key, value]) => {
                    // Format metric display with units
                    if (key === 'calories') return `${value} cal`;
                    if (key === 'duration') return `${value} min`;
                    if (key === 'distance') return `${value} km`;
                    if (key === 'chapter') return `${value}`;
                    // Default formatting
                    const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
                    return `${formattedKey}: ${value}`;
                  })
                  .join(' • ')}
              </Text>
            ) : (
              <>
                {/* Legacy props for backward compatibility */}
                {(caloriesBurned !== null && caloriesBurned !== undefined || 
                  durationMinutes !== null && durationMinutes !== undefined) && (
                  <Text style={styles.detailsText}>
                    {caloriesBurned !== null && caloriesBurned !== undefined && `${caloriesBurned} cal`}
                    {caloriesBurned !== null && caloriesBurned !== undefined && 
                     durationMinutes !== null && durationMinutes !== undefined && ' • '}
                    {durationMinutes !== null && durationMinutes !== undefined && `${durationMinutes} min`}
                  </Text>
                )}
                {bibleChapter && (
                  <Text style={styles.detailsText}>{bibleChapter}</Text>
                )}
              </>
            )}
          </>
        )}
      </View>

      {verified ? (
        <Animated.View style={verifiedBadgeStyle}>
          <TouchableOpacity 
            style={styles.verifiedBadge}
            onPress={onViewDetails}
            disabled={loading}
          >
            <Check size={16} color={Colors.beige} />
            <Text style={styles.verifiedText}>Verified</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <TouchableOpacity 
          style={styles.verifyButton}
          onPress={handleVerifyPress}
          disabled={loading}
        >
          <Text style={styles.verifyText}>Complete</Text>
        </TouchableOpacity>
      )}
    </>
  );

  return (
    <Animated.View style={animatedStyle}>
      <Card style={styles.card}>
        {verified && onViewDetails ? (
          <TouchableOpacity
            style={styles.content}
            onPress={onViewDetails}
            activeOpacity={0.85}
            disabled={loading}
          >
            {renderContent()}
          </TouchableOpacity>
        ) : (
          <View style={styles.content}>
            {renderContent()}
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    marginBottom: Spacing.lg,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textSection: {
    flex: 1,
  },
  title: {
    fontSize: Typography.h4,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  verifyText: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  verifiedText: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.beige,
    fontWeight: Typography.semibold,
  },
  detailsText: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontWeight: Typography.medium,
  },
});

