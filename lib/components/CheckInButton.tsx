import React, { useState } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { Button } from './Button';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface CheckInButtonProps {
  onCheckIn: (imageUri: string) => Promise<void>;
  disabled?: boolean;
}

export function CheckInButton({ onCheckIn, disabled = false }: CheckInButtonProps) {
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your camera and photos to upload workout proof.'
      );
      return false;
    }
    return true;
  };

  const handlePress = async () => {
    if (disabled || loading) return;

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    // Show options to choose between camera or library
    Alert.alert(
      'Add Workout Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: () => openCamera(),
        },
        {
          text: 'Choose from Library',
          onPress: () => openLibrary(),
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
        await onCheckIn(result.assets[0].uri);
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
        await onCheckIn(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      title="I Worked Out"
      onPress={handlePress}
      loading={loading}
      disabled={disabled}
      fullWidth
      variant="primary"
    />
  );
}

