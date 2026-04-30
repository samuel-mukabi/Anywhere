import React, { useRef, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';

import { Colors } from '@/core/theme/colors';
import { spacing } from '@/core/theme/spacing';
import { useAuthStore, selectUser, selectTier, selectIsPro } from '@/features/auth/auth-store';
import { useSearchStore } from '@/features/search/search-store';

const MOCK_CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'];
const MOCK_AIRPORTS = ['LHR', 'JFK', 'CDG', 'SYD', 'DXB', 'SIN', 'HKG', 'FRA'];

function SettingRow({
  icon,
  label,
  value,
  onPress,
  last = false,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.settingRow, !last && styles.settingRowBorder]}
      activeOpacity={onPress ? 0.6 : 1}
      onPress={onPress}
    >
      <View style={styles.settingLeft}>
        <Feather name={icon} size={17} color={Colors.nearBlack} />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value ? <Text style={styles.settingValue}>{value}</Text> : null}
        {onPress && <Feather name="chevron-right" size={16} color={Colors.grey300} />}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const user = useAuthStore(selectUser);
  const isPro = useAuthStore(selectIsPro);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const currency = useSearchStore((s) => s.currency);
  const departureIATA = useSearchStore((s) => s.departureIATA);
  const setParams = useSearchStore((s) => s.setParams);

  const currencySheetRef = useRef<BottomSheet>(null);
  const departureSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '80%'], []);

  const handleSignOut = async () => {
    try {
      await SecureStore.deleteItemAsync('jwt');
      await SecureStore.deleteItemAsync('refresh');
    } catch {}
    clearAuth();
    router.replace('/login');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action is completely irreversible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await handleSignOut();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name */}
        <View style={styles.avatarBlock}>
          <Image
            source={{ uri: user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80' }}
            style={styles.avatar}
          />
          <Text style={styles.nameText}>{user?.name || 'Guest Explorer'}</Text>
          <Text style={styles.emailText}>{user?.email || 'guest@anywhere.com'}</Text>
          <Text style={[styles.tierLabel, { color: isPro ? Colors.sage : Colors.textSecondary }]}>
            {isPro ? 'Pro · The Architect' : 'Free · The Scout'}
          </Text>
        </View>

        {/* Pro upsell — accent strip, no card */}
        {!isPro && (
          <View style={styles.upsellBanner}>
            <View style={styles.upsellAccent} />
            <View style={styles.upsellBody}>
              <Text style={styles.upsellTitle}>Unlock the world</Text>
              <Text style={styles.upsellSub}>
                Pro gives you full cost breakdowns, unlimited routing, and priority results.
              </Text>
              <TouchableOpacity activeOpacity={0.85}>
                <Text style={styles.upsellCta}>Start free trial →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Preferences */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.section}>
          <SettingRow
            icon="map-pin"
            label="Departure city"
            value={departureIATA}
            onPress={() => departureSheetRef.current?.expand()}
          />
          <SettingRow
            icon="dollar-sign"
            label="Currency"
            value={currency}
            onPress={() => currencySheetRef.current?.expand()}
          />
          <SettingRow
            icon="activity"
            label="Price alerts"
            onPress={() => router.push('/alerts')}
          />
          <SettingRow
            icon="bell"
            label="Notification preferences"
            onPress={() => {}}
            last
          />
        </View>

        {/* Legal */}
        <Text style={styles.sectionLabel}>LEGAL</Text>
        <View style={styles.section}>
          <SettingRow icon="shield" label="Privacy policy" onPress={() => {}} />
          <SettingRow icon="file-text" label="Terms of service" onPress={() => {}} last />
        </View>

        {/* Destructive actions */}
        <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut} activeOpacity={0.6}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteRow} onPress={handleDeleteAccount} activeOpacity={0.6}>
          <Text style={styles.deleteText}>Delete account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Currency sheet */}
      <BottomSheet
        ref={currencySheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Currency</Text>
        </View>
        <BottomSheetFlatList
          data={MOCK_CURRENCIES}
          keyExtractor={(i) => i}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => { setParams({ currency: item }); currencySheetRef.current?.close(); }}
            >
              <Text style={[styles.sheetRowText, currency === item && styles.sheetRowTextActive]}>{item}</Text>
              {currency === item && <Feather name="check" size={18} color={Colors.nearBlack} />}
            </TouchableOpacity>
          )}
        />
      </BottomSheet>

      {/* Departure sheet */}
      <BottomSheet
        ref={departureSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Departure airport</Text>
        </View>
        <BottomSheetFlatList
          data={MOCK_AIRPORTS}
          keyExtractor={(i) => i}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => { setParams({ departureIATA: item }); departureSheetRef.current?.close(); }}
            >
              <Text style={[styles.sheetRowText, departureIATA === item && styles.sheetRowTextActive]}>{item}</Text>
              {departureIATA === item && <Feather name="check" size={18} color={Colors.nearBlack} />}
            </TouchableOpacity>
          )}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.parchment },
  scroll: { paddingHorizontal: spacing.xl },

  // Avatar
  avatarBlock: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.border,
    marginBottom: spacing.md,
  },
  nameText: {
    fontFamily: 'Astoria',
    fontSize: 26,
    color: Colors.nearBlack,
    marginBottom: 2,
  },
  emailText: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: spacing.sm,
  },
  tierLabel: {
    fontFamily: 'CeraPro-Medium',
    fontSize: 12,
    letterSpacing: 0.3,
  },

  // Upsell banner — left accent strip, no card box
  upsellBanner: {
    flexDirection: 'row',
    marginBottom: spacing.xxl,
  },
  upsellAccent: {
    width: 3,
    backgroundColor: Colors.terracotta,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  upsellBody: {
    flex: 1,
    gap: 6,
  },
  upsellTitle: {
    fontFamily: 'Astoria',
    fontSize: 20,
    color: Colors.nearBlack,
  },
  upsellSub: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  upsellCta: {
    fontFamily: 'CeraPro-Medium',
    fontSize: 14,
    color: Colors.terracotta,
    marginTop: 2,
  },

  // Section label
  sectionLabel: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },

  // Settings — flat rows, no card box
  section: {
    marginBottom: spacing.xxl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  settingRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingLabel: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 15,
    color: Colors.nearBlack,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingValue: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Destructive
  signOutRow: {
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    marginTop: spacing.md,
  },
  signOutText: {
    fontFamily: 'CeraPro-Medium',
    fontSize: 16,
    color: Colors.nearBlack,
  },
  deleteRow: {
    paddingVertical: spacing.md,
  },
  deleteText: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 14,
    color: '#D15858',
  },

  // Bottom sheets
  sheetBg: {
    backgroundColor: Colors.parchment,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetHandle: {
    backgroundColor: Colors.border,
    width: 36,
    height: 4,
  },
  sheetHeader: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontFamily: 'Astoria',
    fontSize: 22,
    color: Colors.nearBlack,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  sheetRowText: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 16,
    color: Colors.textSecondary,
  },
  sheetRowTextActive: {
    fontFamily: 'CeraPro-Bold',
    color: Colors.nearBlack,
  },
});
