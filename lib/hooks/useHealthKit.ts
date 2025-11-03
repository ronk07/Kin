import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

// Conditional import for HealthKit (only works with native builds)
let AppleHealthKit: any = null;
try {
  AppleHealthKit = require('react-native-health').default;
} catch (e) {
  console.log('HealthKit not available - native module not found');
}

interface HealthKitData {
  steps: number;
  isAuthorized: boolean;
  isAvailable: boolean;
  loading: boolean;
  error: string | null;
}

const getPermissions = () => {
  if (!AppleHealthKit) return null;
  return {
    permissions: {
      read: [AppleHealthKit.Constants.Permissions.StepCount],
      write: [],
    },
  };
};

export function useHealthKit(): HealthKitData & {
  requestAuthorization: () => Promise<void>;
  fetchTodaySteps: () => Promise<void>;
} {
  const [steps, setSteps] = useState(0);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeHealthKit();
  }, []);

  const initializeHealthKit = async () => {
    // HealthKit is only available on iOS with native builds
    if (Platform.OS !== 'ios') {
      setIsAvailable(false);
      setLoading(false);
      return;
    }

    // Check if native module is loaded
    if (!AppleHealthKit) {
      console.log('HealthKit native module not available - requires development build');
      setIsAvailable(false);
      setError('HealthKit requires a development build');
      setLoading(false);
      return;
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
          // Request authorization
          requestAuthorization();
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

  const requestAuthorization = async () => {
    if (!AppleHealthKit) {
      setLoading(false);
      return;
    }

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

        console.log('HealthKit authorized successfully');
        setIsAuthorized(true);
        setError(null);
        
        // Fetch today's steps after authorization
        fetchTodaySteps();
      });
    } catch (err) {
      console.error('Error in requestAuthorization:', err);
      setError('Failed to request authorization');
      setLoading(false);
    }
  };

  const fetchTodaySteps = async () => {
    if (Platform.OS !== 'ios' || !isAvailable || !AppleHealthKit) {
      setLoading(false);
      return;
    }

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

