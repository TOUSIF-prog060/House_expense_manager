import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(userId: string, householdId?: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    if (token) {
      await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          household_id: householdId || null,
          endpoint: token,
          p256dh: 'expo-push-token',
          auth: 'expo',
          device_type: Platform.OS,
          is_active: true,
          expense_enabled: true,
          cat_enabled: true,
          reminder_enabled: true,
          payment_enabled: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );
    }

    return token;
  } catch (err) {
    console.warn('Failed to register for push notifications:', err);
    return null;
  }
}
