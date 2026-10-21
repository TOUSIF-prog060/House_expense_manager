import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, typography } from '../constants/theme';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // If running in browser/PWA web container
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        You’re offline. Reconnect before saving household changes.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#991b1b',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...typography.bodySm,
    color: '#fee2e2',
    fontWeight: '500',
    textAlign: 'center',
  },
});
