import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Card } from './Card';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface StepCounterProps {
  steps?: number;
  goal?: number;
  isHealthKitAvailable?: boolean;
  isHealthKitAuthorized?: boolean;
}

export function StepCounter({ 
  steps = 0, 
  goal = 10000,
  isHealthKitAvailable = false,
  isHealthKitAuthorized = false,
}: StepCounterProps) {
  const progress = Math.min(steps / goal, 1);
  const percentage = Math.round(progress * 100);
  
  // Show message if HealthKit is not available or not authorized
  const showMessage = Platform.OS === 'ios' && (!isHealthKitAvailable || !isHealthKitAuthorized);
  
  // Pie chart dimensions
  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Card style={styles.card}>
      <View style={styles.content}>
        <View style={styles.textSection}>
          <Text style={styles.label}>Steps Today</Text>
          {showMessage ? (
            <>
              <Text style={styles.message}>
                {!isHealthKitAvailable 
                  ? 'HealthKit not available' 
                  : 'Enable Health access in Settings'}
              </Text>
              <Text style={styles.messageDetail}>
                {!isHealthKitAvailable 
                  ? 'Steps tracking requires iOS device' 
                  : 'Allow Kin to read step count data'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.steps}>{steps.toLocaleString()}</Text>
              <Text style={styles.goal}>Goal: {goal.toLocaleString()} steps</Text>
            </>
          )}
        </View>
        
        <View style={styles.chartSection}>
          <Svg width={size} height={size}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={Colors.accent + '30'}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={Colors.accent}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <View style={styles.percentageContainer}>
            <Text style={styles.percentage}>{percentage}%</Text>
          </View>
        </View>
      </View>
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
  label: {
    fontSize: Typography.bodySmall,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  steps: {
    fontSize: Typography.h2,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.xs,
  },
  goal: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  message: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    fontWeight: Typography.semibold,
    marginBottom: Spacing.xs,
  },
  messageDetail: {
    fontSize: Typography.caption,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
  },
  chartSection: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  percentageContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.accent,
    fontWeight: Typography.bold,
  },
});

