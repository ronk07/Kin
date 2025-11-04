import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Card } from './Card';
import { Button } from './Button';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { X } from 'lucide-react-native';

interface TaskDetailsFormProps {
  visible: boolean;
  taskName: 'workout' | 'bible_reading';
  onSubmit: (details: { caloriesBurned?: number; durationMinutes?: number; bibleChapter?: string }) => void;
  onCancel: () => void;
  initialValues?: {
    caloriesBurned?: number | null;
    durationMinutes?: number | null;
    bibleChapter?: string | null;
  };
}

export function TaskDetailsForm({
  visible,
  taskName,
  onSubmit,
  onCancel,
  initialValues,
}: TaskDetailsFormProps) {
  const [caloriesBurned, setCaloriesBurned] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [bibleChapter, setBibleChapter] = useState<string>('');

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      if (initialValues) {
        setCaloriesBurned(initialValues.caloriesBurned?.toString() || '');
        setDurationMinutes(initialValues.durationMinutes?.toString() || '');
        setBibleChapter(initialValues.bibleChapter || '');
      } else {
        setCaloriesBurned('');
        setDurationMinutes('');
        setBibleChapter('');
      }
    }
  }, [visible, initialValues]);

  const handleSubmit = () => {
    if (taskName === 'workout') {
      onSubmit({
        caloriesBurned: caloriesBurned ? parseInt(caloriesBurned, 10) : undefined,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : undefined,
      });
    } else {
      onSubmit({
        bibleChapter: bibleChapter.trim() || undefined,
      });
    }
  };

  const isWorkout = taskName === 'workout';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.backdropWrapper}>
          <TouchableOpacity 
            style={styles.backdropTouch}
            activeOpacity={1}
            onPress={onCancel}
          />

          <View style={styles.modalContainer}>
            <Card style={styles.modal}>
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>
                  {isWorkout ? 'Workout Details' : 'Bible Reading Details'}
                </Text>
                <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                  <X size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>
                {isWorkout
                  ? 'Add details about your workout (optional)'
                  : 'Add the chapter you read (optional)'}
              </Text>

              {/* Form Fields */}
              {isWorkout ? (
                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Calories Burned</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter calories burned"
                      placeholderTextColor={Colors.textSecondary}
                      value={caloriesBurned}
                      onChangeText={setCaloriesBurned}
                      keyboardType="number-pad"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Duration (minutes)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter duration (minutes)"
                      placeholderTextColor={Colors.textSecondary}
                      value={durationMinutes}
                      onChangeText={setDurationMinutes}
                      keyboardType="number-pad"
                      returnKeyType="done"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.form}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Book and Chapter</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter book and chapter"
                      placeholderTextColor={Colors.textSecondary}
                      value={bibleChapter}
                      onChangeText={setBibleChapter}
                      autoCapitalize="words"
                      returnKeyType="done"
                    />
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.submitButton]}
                  onPress={handleSubmit}
                >
                  <Text style={styles.submitButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </Card>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: 'transparent',
  },
  backdropWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  backdropTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    alignSelf: 'center',
  },
  modal: {
    width: '100%',
  },
  scrollContent: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.h3,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    flex: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    fontWeight: Typography.medium,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.textSecondary + '30',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.textSecondary + '50',
  },
  cancelButtonText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    fontWeight: Typography.semibold,
  },
  submitButton: {
    backgroundColor: Colors.accent,
  },
  submitButtonText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.beige,
    fontWeight: Typography.semibold,
  },
});

