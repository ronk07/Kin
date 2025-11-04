import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
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
}: TaskCardProps) {
  const [loading, setLoading] = useState(false);

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
            {(caloriesBurned !== null || durationMinutes !== null) && (
              <Text style={styles.detailsText}>
                {caloriesBurned !== null && `${caloriesBurned} cal`}
                {caloriesBurned !== null && durationMinutes !== null && ' • '}
                {durationMinutes !== null && `${durationMinutes} min`}
              </Text>
            )}
            {bibleChapter && (
              <Text style={styles.detailsText}>{bibleChapter}</Text>
            )}
          </>
        )}
      </View>

      {verified ? (
        <TouchableOpacity 
          style={styles.verifiedBadge}
          onPress={onViewDetails}
          disabled={loading}
        >
          <Check size={16} color={Colors.beige} />
          <Text style={styles.verifiedText}>Verified</Text>
        </TouchableOpacity>
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

