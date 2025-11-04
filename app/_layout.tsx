import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { View, ActivityIndicator, Image } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/lib/context/AuthContext';
import { UserProvider } from '@/lib/context/UserContext';
import { FamilyProvider } from '@/lib/context/FamilyContext';
import { Colors } from '@/constants/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <Image 
          source={require('../assets/images/KinLogo.png')} 
          style={{ width: 200, height: 200, marginBottom: 24 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <AuthProvider>
      <FamilyProvider>
        <UserProvider>
          <RootLayoutNav />
        </UserProvider>
      </FamilyProvider>
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, loading, onboardingCompleted } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Don't route until we know the auth and onboarding status
    if (loading) return;
    
    // If user exists but onboarding status is still unknown, wait
    if (user && onboardingCompleted === null) return;

    const currentSegment = segments[0];
    const inAuthGroup = currentSegment === 'auth' || currentSegment === 'welcome';
    const inOnboardingGroup = currentSegment === 'onboarding';
    const inTabsGroup = currentSegment === '(tabs)';

    // If no user, always go to welcome
    if (!user) {
      if (!inAuthGroup && currentSegment !== 'welcome') {
        router.replace('/welcome');
      }
      return;
    }

    // User is authenticated - check onboarding status
    if (onboardingCompleted === false) {
      // User needs to complete onboarding
      if (!inOnboardingGroup) {
        router.replace('/onboarding/profile');
      }
    } else if (onboardingCompleted === true) {
      // User has completed onboarding - go to main app
      if (!inTabsGroup) {
        router.replace('/(tabs)');
      }
    }
    // If onboardingCompleted is still null but user exists, wait (handled above)
  }, [user, loading, onboardingCompleted, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <Image 
          source={require('../assets/images/KinLogo.png')} 
          style={{ width: 200, height: 200, marginBottom: 24 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="welcome" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
