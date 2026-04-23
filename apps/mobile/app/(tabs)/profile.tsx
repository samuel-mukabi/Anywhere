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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Auth Context
  const user = useAuthStore(selectUser);
  const tier = useAuthStore(selectTier);
  const isPro = useAuthStore(selectIsPro);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Search/Global Data Context
  const currency = useSearchStore((s) => s.currency);
  const departureIATA = useSearchStore((s) => s.departureIATA);
  const setParams = useSearchStore((s) => s.setParams);

  // Sheets
  const currencySheetRef = useRef<BottomSheet>(null);
  const departureSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '80%'], []);
  const [sheetTarget, setSheetTarget] = useState<'none' | 'currency' | 'departure'>('none');

  const handleOpenCurrency = () => {
    setSheetTarget('currency');
    currencySheetRef.current?.expand();
  };

  const handleOpenDeparture = () => {
    setSheetTarget('departure');
    departureSheetRef.current?.expand();
  };

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
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action is completely irreversible.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
             // Mock DELETE /account
             await handleSignOut();
          } 
        }
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.contentParams, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
        
        {/* --- Header & Avatar --- */}
        <View style={styles.headerBlock}>
          <Image 
            source={{ uri: user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80' }} 
            style={styles.avatar}
          />
          <Text style={styles.nameText}>{user?.name || 'Guest Explorer'}</Text>
          <Text style={styles.emailText}>{user?.email || 'guest@anywhere.com'}</Text>
          
          <View style={[styles.tierBadge, { backgroundColor: isPro ? 'rgba(74,140,92,0.15)' : 'rgba(13,30,39,0.06)' }]}>
            <Text style={[styles.tierText, { color: isPro ? Colors.sage : Colors.textSecondary }]}>
              {isPro ? 'Pro — The Architect' : 'Free — The Scout'}
            </Text>
          </View>
        </View>

        {/* --- Pro Upsell Card --- */}
        {!isPro && (
          <View style={styles.upsellCard}>
            <Text style={styles.upsellTitle}>Ready to unlock the world?</Text>
            <Text style={styles.upsellSub}>Upgrade to Pro to access our exclusive Cost breakdowns, unlimited global routing matrices, and priority cache tiers.</Text>
            <TouchableOpacity style={styles.upsellBtn} activeOpacity={0.85}>
              <Text style={styles.upsellBtnText}>Start free trial</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- Settings Matrix --- */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={handleOpenDeparture}>
            <View style={styles.settingRowLeft}>
              <Feather name="map-pin" size={18} color={Colors.nearBlack} />
              <Text style={styles.settingLabel}>Departure city</Text>
            </View>
            <View style={styles.settingRowRight}>
              <Text style={styles.settingValue}>{departureIATA}</Text>
              <Feather name="chevron-right" size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={handleOpenCurrency}>
            <View style={styles.settingRowLeft}>
              <Feather name="dollar-sign" size={18} color={Colors.nearBlack} />
              <Text style={styles.settingLabel}>Currency</Text>
            </View>
            <View style={styles.settingRowRight}>
              <Text style={styles.settingValue}>{currency}</Text>
              <Feather name="chevron-right" size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => router.push('/alerts')}>
            <View style={styles.settingRowLeft}>
              <Feather name="activity" size={18} color={Colors.nearBlack} />
              <Text style={styles.settingLabel}>Price alerts</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />
          
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingRowLeft}>
              <Feather name="bell" size={18} color={Colors.nearBlack} />
              <Text style={styles.settingLabel}>Notification preferences</Text>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* --- Legal Matrix --- */}
        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingRowLeft}>
              <Feather name="shield" size={18} color={Colors.nearBlack} />
              <Text style={styles.settingLabel}>Privacy policy</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingRowLeft}>
              <Feather name="file-text" size={18} color={Colors.nearBlack} />
              <Text style={styles.settingLabel}>Terms of service</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* --- Destructive Modals --- */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutBtnText}>Sign out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteAccountWrapper} onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccountText}>Delete account</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* --- Global Sheets Overlay --- */}
      <BottomSheet
        ref={currencySheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitleText}>Select Currency</Text>
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
              {currency === item && <Feather name="check" size={20} color={Colors.nearBlack} />}
            </TouchableOpacity>
          )}
        />
      </BottomSheet>

      <BottomSheet
        ref={departureSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitleText}>Origin Airport (IATA)</Text>
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
              {departureIATA === item && <Feather name="check" size={20} color={Colors.nearBlack} />}
            </TouchableOpacity>
          )}
        />
      </BottomSheet>
      
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  contentParams: { paddingHorizontal: spacing.xl },
  headerBlock: { alignItems: 'center', marginBottom: spacing.xxl },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.border, marginBottom: spacing.md },
  nameText: { fontFamily: 'Astoria', fontSize: 24, color: Colors.nearBlack, marginBottom: 4 },
  emailText: { fontFamily: 'CeraPro-Medium', fontSize: 13, color: Colors.textSecondary },
  tierBadge: { marginTop: spacing.md, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tierText: { fontFamily: 'CeraPro-Bold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },

  upsellCard: { backgroundColor: Colors.parchment, borderRadius: 16, padding: spacing.lg, borderWidth: 2, borderColor: Colors.terracotta, marginBottom: spacing.xxl },
  upsellTitle: { fontFamily: 'Astoria', fontSize: 22, color: Colors.nearBlack, marginBottom: 6 },
  upsellSub: { fontFamily: 'CeraPro-Regular', fontSize: 14, color: Colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
  upsellBtn: { backgroundColor: Colors.terracotta, borderRadius: 12, alignItems: 'center', paddingVertical: 14 },
  upsellBtnText: { fontFamily: 'CeraPro-Bold', fontSize: 15, color: Colors.white },

  sectionTitle: { fontFamily: 'CeraPro-Medium', fontSize: 12, textTransform: 'uppercase', color: Colors.textSecondary, letterSpacing: 0.8, marginBottom: spacing.sm, marginLeft: spacing.sm },
  settingsGroup: { backgroundColor: Colors.parchment, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, marginBottom: spacing.xxl, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingLabel: { fontFamily: 'CeraPro-Medium', fontSize: 15, color: Colors.nearBlack },
  settingRowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  settingValue: { fontFamily: 'CeraPro-Regular', fontSize: 14, color: Colors.textSecondary },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 46 }, // Offset by icon width

  signOutBtn: { paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.xl },
  signOutBtnText: { fontFamily: 'CeraPro-Bold', fontSize: 16, color: Colors.nearBlack },
  deleteAccountWrapper: { paddingVertical: spacing.md, alignItems: 'center' },
  deleteAccountText: { fontFamily: 'CeraPro-Medium', fontSize: 14, color: '#D15858', textDecorationLine: 'underline' },

  sheetBackground: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { backgroundColor: Colors.textSecondary, width: 40, height: 4 },
  sheetHeader: { padding: spacing.xl, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetTitleText: { fontFamily: 'Astoria', fontSize: 24, color: Colors.nearBlack },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetRowText: { fontFamily: 'CeraPro-Regular', fontSize: 16, color: Colors.textSecondary },
  sheetRowTextActive: { fontFamily: 'CeraPro-Bold', color: Colors.nearBlack },
});
