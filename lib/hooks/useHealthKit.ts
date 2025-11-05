import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Conditional import for HealthKit (only works with native builds)
let AppleHealthKit: any = null;
let HealthKitConstants: any = null;

try {
  const HealthKit = require('react-native-health');
  AppleHealthKit = HealthKit.default;
  HealthKitConstants = HealthKit.default?.Constants || HealthKit.Constants;
} catch (e) {
  console.error('HealthKit native module not found:', e);
}

// Check if we're in a development build (not Expo Go)
// In development builds, executionEnvironment is 'standalone' and appOwnership is 'expo' or null
// In Expo Go, executionEnvironment is 'storeClient' and appOwnership is 'expo'
const isDevelopmentBuild = Constants.executionEnvironment !== 'storeClient';

interface HealthKitData {
  steps: number;
  isAuthorized: boolean;
  isAvailable: boolean;
  loading: boolean;
  error: string | null;
}

const getPermissions = () => {
  if (!AppleHealthKit || !HealthKitConstants) return null;
  return {
    permissions: {
      read: [HealthKitConstants.Permissions.StepCount],
      write: [],
    },
  };
};

export function useHealthKit(options?: { autoRequest?: boolean }): HealthKitData & {
  requestAuthorization: () => Promise<void>;
  fetchTodaySteps: () => Promise<void>;
} {
  const { autoRequest = true } = options || {};
  const [steps, setSteps] = useState(0);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuthorizationStatus = useCallback(() => {
    if (!AppleHealthKit || !HealthKitConstants || !isAvailable) return;
    
    AppleHealthKit.getAuthStatus(
      HealthKitConstants.Permissions.StepCount,
      (err: any, status: any) => {
        if (!err && status === HealthKitConstants.AuthorizationStatus.Authorized) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      }
    );
  }, [isAvailable]);

  const fetchTodaySteps = useCallback(async () => {
    if (Platform.OS !== 'ios' || !isAvailable || !AppleHealthKit) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const options = {
        date: today.toISOString(),
        includeManuallyAdded: true,
      };

      AppleHealthKit.getStepCount(options, (err: any, results: any) => {
        if (err) {
          console.error('Error fetching step count:', err);
          setError('Failed to fetch step count');
          setLoading(false);
          return;
        }

        console.log('Step count fetched:', results.value);
        setSteps(results.value || 0);
        setError(null);
        setLoading(false);
      });
    } catch (err) {
      console.error('Error in fetchTodaySteps:', err);
      setError('Failed to fetch steps');
      setLoading(false);
    }
  }, [isAvailable]);

  const requestAuthorization = useCallback(async () => {
    if (!AppleHealthKit) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const permissions = getPermissions();
      if (!permissions) {
        setLoading(false);
        return;
      }

      AppleHealthKit.initHealthKit(permissions, (err: any) => {
        if (err) {
          console.error('Error requesting HealthKit authorization:', err);
          setError('Failed to authorize HealthKit access');
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        console.log('HealthKit authorization requested');
        // Check if actually authorized
        checkAuthorizationStatus();
        setError(null);
        
        // Fetch today's steps after authorization
        fetchTodaySteps();
      });
    } catch (err) {
      console.error('Error in requestAuthorization:', err);
      setError('Failed to request authorization');
      setLoading(false);
    }
  }, [checkAuthorizationStatus, fetchTodaySteps]);

  useEffect(() => {
    initializeHealthKit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRequest]);

  const initializeHealthKit = async () => {
    // HealthKit is only available on iOS with native builds
    if (Platform.OS !== 'ios') {
      setIsAvailable(false);
      setLoading(false);
      return;
    }

    // Check if native module is loaded first
    if (!AppleHealthKit || !HealthKitConstants) {
      console.error('HealthKit native module not available.', {
        AppleHealthKit: !!AppleHealthKit,
        HealthKitConstants: !!HealthKitConstants,
        executionEnvironment: Constants.executionEnvironment,
        appOwnership: Constants.appOwnership,
        isDevelopmentBuild
      });
      setIsAvailable(false);
      setError('HealthKit native module not found. Please rebuild the app with EAS Build.');
      setLoading(false);
      return;
    }

    // Check if we're in a development build (not Expo Go)
    if (!isDevelopmentBuild) {
      console.warn('Not in a development build. HealthKit may not work.');
    }

    try {
      // Check if HealthKit is available on this device
      AppleHealthKit.isAvailable((err: any, available: boolean) => {
        if (err) {
          console.error('Error checking HealthKit availability:', err);
          setError('HealthKit is not available on this device');
          setIsAvailable(false);
          setLoading(false);
          return;
        }

        setIsAvailable(available);

        if (available) {
          // Check existing authorization status
          setTimeout(() => {
            checkAuthorizationStatus();
            
            if (autoRequest) {
              // Only auto-request if option is enabled
              // Use setTimeout to ensure checkAuthorizationStatus completes first
              setTimeout(() => {
                if (!isAuthorized) {
                  requestAuthorization();
                } else {
                  fetchTodaySteps();
                }
              }, 100);
            } else {
              setLoading(false);
            }
          }, 100);
        } else {
          setLoading(false);
        }
      });
    } catch (err) {
      console.error('Error initializing HealthKit:', err);
      setError('Failed to initialize HealthKit');
      setLoading(false);
    }
  };

  return {
    steps,
    isAuthorized,
    isAvailable,
    loading,
    error,
    requestAuthorization,
    fetchTodaySteps,
  };
}

