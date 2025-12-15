import AppleHealthKit, { HealthKitPermissions } from 'react-native-health';
import { Platform } from 'react-native';

const permissions: HealthKitPermissions = {
  permissions: {
    read: [AppleHealthKit.Constants.Permissions.Weight],
    write: [AppleHealthKit.Constants.Permissions.Weight],
  },
} as any;

const isAvailable = () => {
    // Sécurité anti-crash
    if (Platform.OS !== 'ios') return false;
    if (typeof AppleHealthKit === 'undefined' || !AppleHealthKit.initHealthKit) return false;
    return true;
};

export const initializeAppleHealth = async (): Promise<boolean> => {
  if (!isAvailable()) return false;
  
  return new Promise((resolve) => {
    try {
        AppleHealthKit.initHealthKit(permissions, (error: string) => {
            if (error) {
                console.log('[HealthKit] Error:', error);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    } catch (e) { resolve(false); }
  });
};

export const checkHealthPermissions = async () => isAvailable();