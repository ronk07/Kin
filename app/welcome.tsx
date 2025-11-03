import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '@/lib/components/Button';
import { Colors, Typography, Spacing } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={[Colors.gradientStart, Colors.gradientEnd]}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Logo/App Name */}
          <View style={styles.header}>
            <Text style={styles.appName}>Kin</Text>
            <Text style={styles.tagline}>Faith, Family, Fitness</Text>
          </View>

          {/* Call to Action */}
          <View style={styles.footer}>
            <Text style={styles.welcomeText}>
              Welcome to your family's fitness and faith journey
            </Text>
            <Button
              title="Get Started"
              onPress={() => router.push('/auth')}
              variant="primary"
              fullWidth
            />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-between',
    paddingVertical: Spacing.xxl,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 64,
    fontFamily: Typography.headingFont,
    color: Colors.text,
    fontWeight: Typography.bold,
    marginBottom: Spacing.md,
  },
  tagline: {
    fontSize: Typography.h3,
    fontFamily: Typography.bodyFont,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    gap: Spacing.lg,
  },
  welcomeText: {
    fontSize: Typography.body,
    fontFamily: Typography.bodyFont,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
});

