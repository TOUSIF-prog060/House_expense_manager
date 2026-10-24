import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { useHouseholdRealtime } from '../../hooks/use-realtime';

export default function TabLayout() {
  const router = useRouter();
  const { household, profile } = useAuth();
  const { colors, isDark } = useTheme();

  // Enable Realtime updates across the app
  useHouseholdRealtime(household?.id);

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? colors.surface : '#FAF8F3',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? colors.border : '#E7E6E0',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
          letterSpacing: -0.3,
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: isDark ? colors.surface : '#FAF8F3',
          borderTopWidth: 1,
          borderTopColor: isDark ? colors.border : '#E7E6E0',
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: isDark ? '#32826C' : '#103F32',
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 12 }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/settings')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.iconCircle}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/profile')}
              style={[
                styles.avatarBtn,
                {
                  backgroundColor: isDark ? colors.surfaceElevated : '#E2EBE3',
                  borderColor: isDark ? colors.border : '#103F32',
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: isDark ? colors.text : '#103F32' }]}>
                {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: household?.name || 'OurHome',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size - 1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={size - 1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settle"
        options={{
          title: 'Settle',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'scale' : 'scale-outline'} size={size - 1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="supplies"
        options={{
          title: 'Supplies',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} size={size - 1} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pets"
        options={{
          title: 'Pets',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'paw' : 'paw-outline'} size={size - 1} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 14,
  },
});
