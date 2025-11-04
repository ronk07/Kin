import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Card } from './Card';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { VerificationResponse } from '@/lib/api/openai';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react-native';

interface VerificationModalProps {
  visible: boolean;
  imageUri?: string | null;
  taskName: string;
  verificationResult: VerificationResponse | null;
  loading: boolean;
  onAccept: () => void;
  onReject?: () => void;
  primaryButtonLabel?: string;
  secondaryButtonLabel?: string;
  caloriesBurned?: number | null;
  durationMinutes?: number | null;
  bibleChapter?: string | null;
  onEditDetails?: () => void;
}

export function VerificationModal({
  visible,
  imageUri,
  taskName,
  verificationResult,
  loading,
  onAccept,
  onReject,
  primaryButtonLabel = 'Accept',
  secondaryButtonLabel = 'Reject',
  caloriesBurned,
  durationMinutes,
  bibleChapter,
  onEditDetails,
}: VerificationModalProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return Colors.accent; // High confidence - green
    if (confidence >= 0.5) return '#FFA500'; // Medium confidence - orange
    return '#FF4444'; // Low confidence - red
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return 'High Confidence';
    if (confidence >= 0.5) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onReject}
    >
      <View style={styles.overlay}>
        <Card style={styles.modal}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.loadingText}>Verifying image...</Text>
              <Text style={styles.loadingSubtext}>Analyzing with AI</Text>
            </View>
          ) : verificationResult ? (
            <>
              {/* Image Preview */}
              {imageUri ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.image} />
                </View>
              ) : (
                <View style={[styles.imageContainer, styles.placeholderContainer]}>
                  <Text style={styles.placeholderText}>No image available</Text>
                </View>
              )}

              {/* Task Name */}
              <Text style={styles.taskName}>Verifying: {taskName}</Text>

              {/* Verification Result */}
              <View style={styles.resultContainer}>
                <View style={styles.resultHeader}>
                  {verificationResult.isVerified ? (
                    <CheckCircle2 size={24} color={Colors.accent} />
                  ) : (
                    <XCircle size={24} color="#FF4444" />
                  )}
                  <Text style={[
                    styles.verificationStatus,
                    { color: verificationResult.isVerified ? Colors.accent : '#FF4444' }
                  ]}>
                    {verificationResult.isVerified ? 'Verified' : 'Not Verified'}
                  </Text>
                </View>

                {/* Confidence Score */}
                <View style={styles.confidenceContainer}>
                  <View style={styles.confidenceBar}>
                    <View
                      style={[
                        styles.confidenceFill,
                        {
                          width: `${verificationResult.confidence * 100}%`,
                          backgroundColor: getConfidenceColor(verificationResult.confidence),
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.confidenceInfo}>
                    <Text style={styles.confidenceLabel}>
                      {getConfidenceText(verificationResult.confidence)}
                    </Text>
                    <Text style={[
                      styles.confidenceValue,
                      { color: getConfidenceColor(verificationResult.confidence) }
                    ]}>
                      {(verificationResult.confidence * 100).toFixed(0)}%
                    </Text>
                  </View>
                </View>

                {/* Reasoning */}
                <View style={styles.reasonContainer}>
                  <View style={styles.reasonHeader}>
                    <AlertCircle size={16} color={Colors.textSecondary} />
                    <Text style={styles.reasonLabel}>AI Reasoning:</Text>
                  </View>
                  <Text style={styles.reasonText}>{verificationResult.reason}</Text>
                </View>

                {/* Task Details */}
                {(caloriesBurned !== null || durationMinutes !== null || bibleChapter) && (
                  <View style={styles.detailsContainer}>
                    <View style={styles.detailsHeader}>
                      <Text style={styles.detailsLabel}>Task Details:</Text>
                      {onEditDetails && (
                        <TouchableOpacity onPress={onEditDetails} style={styles.editButton}>
                          <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {taskName.toLowerCase().includes('workout') ? (
                      <View style={styles.detailsContent}>
                        {caloriesBurned !== null && (
                          <Text style={styles.detailsText}>{caloriesBurned} calories</Text>
                        )}
                        {durationMinutes !== null && (
                          <Text style={styles.detailsText}>
                            {caloriesBurned !== null ? ' • ' : ''}
                            {durationMinutes} minutes
                          </Text>
                        )}
                        {caloriesBurned === null && durationMinutes === null && (
                          <Text style={styles.detailsTextPlaceholder}>No details added yet</Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.detailsContent}>
                        {bibleChapter ? (
                          <Text style={styles.detailsText}>{bibleChapter}</Text>
                        ) : (
                          <Text style={styles.detailsTextPlaceholder}>No chapter added yet</Text>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Add Details Button (if no details exist) */}
                {caloriesBurned === null && durationMinutes === null && !bibleChapter && onEditDetails && (
                  <TouchableOpacity onPress={onEditDetails} style={styles.addDetailsButton}>
                    <Text style={styles.addDetailsButtonText}>Add Details</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                {onReject && (
                  <TouchableOpacity
                    style={[styles.button, styles.rejectButton]}
                    onPress={onReject}
                  >
                    <Text style={styles.rejectButtonText}>{secondaryButtonLabel}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.button, styles.acceptButton]}
                  onPress={onAccept}
                >
                  <Text style={styles.acceptButtonText}>{primaryButtonLabel}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>No verification data available.</Text>
              <Text style={styles.loadingSubtext}>This task was completed without AI verification.</Text>
            </View>
          )}
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    padding: Spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    fontSize: Typography.h4,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    marginTop: Spacing.md,
    fontWeight: Typography.semibold,
  },
  loadingSubtext: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  taskName: {
    fontSize: Typography.h4,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  resultContainer: {
    marginBottom: Spacing.lg,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  verificationStatus: {
    fontSize: Typography.h4,
    fontFamily: Typography.headingFont,
    fontWeight: Typography.bold,
  },
  confidenceContainer: {
    marginBottom: Spacing.md,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: Colors.textSecondary + '30',
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  confidenceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  confidenceValue: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    fontWeight: Typography.bold,
  },
  reasonContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  reasonLabel: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    fontWeight: Typography.semibold,
  },
  reasonText: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: '#FF4444',
  },
  rejectButtonText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: '#FF4444',
    fontWeight: Typography.semibold,
  },
  acceptButton: {
    backgroundColor: Colors.accent,
  },
  acceptButtonText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.beige,
    fontWeight: Typography.semibold,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.textSecondary + '10',
  },
  placeholderText: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  detailsContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  detailsLabel: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    fontWeight: Typography.semibold,
  },
  editButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  editButtonText: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
  detailsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  detailsText: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
  },
  detailsTextPlaceholder: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  addDetailsButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  addDetailsButtonText: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.semibold,
  },
});

