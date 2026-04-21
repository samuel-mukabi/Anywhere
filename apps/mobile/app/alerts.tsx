import React, { useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet';
import { Swipeable } from 'react-native-gesture-handler';

import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useAuthStore, selectIsPro } from '@/stores/authStore';
import { BudgetSlider } from '@/components/ui/BudgetSlider';

type AlertStatus = 'active' | 'triggered' | 'paused';
interface PriceAlert {
  id: string;
  flag: string;
  destination: string;
  ceiling: number;
  status: AlertStatus;
  lastTriggered: string | null;
  destId: string;
}

const INITIAL_ALERTS: PriceAlert[] = [
  { id: 'a1', flag: '🇯🇵', destination: 'Tokyo, Japan', ceiling: 3000, status: 'triggered', lastTriggered: 'Today, 08:30 AM', destId: 'tokyo-jp' },
  { id: 'a2', flag: '🇵🇹', destination: 'Lisbon, Portugal', ceiling: 1500, status: 'active', lastTriggered: null, destId: 'lisbon-pt' },
];

export default function PriceAlertsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isPro = useAuthStore(selectIsPro);

  const [alerts, setAlerts] = useState<PriceAlert[]>(INITIAL_ALERTS);
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%'], []);
  
  const [newDest, setNewDest] = useState('');
  const [newBudget, setNewBudget] = useState(2000);

  // Pro restriction
  const allowedAlerts = isPro ? alerts : alerts.slice(0, 1);
  const reachedLimit = !isPro && allowedAlerts.length >= 1;

  const handleDelete = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleCreate = () => {
    if (!newDest.trim()) return;
    setAlerts([{
      id: Math.random().toString(),
      flag: '🗺️',
      destination: newDest,
      ceiling: newBudget,
      status: 'active',
      lastTriggered: null,
      destId: 'mock-id'
    }, ...alerts]);
    sheetRef.current?.close();
    setNewDest('');
  };

  const simulatePushTrigger = (destId: string) => {
    // Mimicking a native Push Notification deep link resolution
    router.push(`/destination/${destId}`);
  };

  const renderBadge = (status: AlertStatus) => {
    switch (status) {
      case 'triggered':
        return <View style={[styles.badge, styles.badgeTriggered]}><Text style={[styles.badgeText, styles.badgeTextTriggered]}>Triggered today</Text></View>;
      case 'active':
        return <View style={[styles.badge, styles.badgeActive]}><Text style={[styles.badgeText, styles.badgeTextActive]}>Active</Text></View>;
      case 'paused':
        return <View style={[styles.badge, styles.badgePaused]}><Text style={[styles.badgeText, styles.badgeTextPaused]}>Paused</Text></View>;
    }
  };

  const renderRightActions = (progress: any, dragX: any, id: string) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(id)} activeOpacity={0.8}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Feather name="trash-2" size={24} color={Colors.white} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, spacing.xl) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={Colors.nearBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Price alerts</Text>
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => {
            if (reachedLimit) {
              // Trigger Upsell logic manually or highlight
              alert("Upgrade to Pro to create more than 1 active alert!");
            } else {
              sheetRef.current?.expand();
            }
          }}
        >
          <Feather name="plus" size={24} color={reachedLimit ? Colors.textSecondary : Colors.terracotta} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={allowedAlerts}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Swipeable renderRightActions={(p, d) => renderRightActions(p, d, item.id)} overshootRight={false}>
            <TouchableOpacity 
              style={styles.card} 
              activeOpacity={item.status === 'triggered' ? 0.7 : 1}
              onPress={() => {
                if (item.status === 'triggered') { simulatePushTrigger(item.destId); }
              }}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.cardFlag}>{item.flag}</Text>
                  <Text style={styles.cardDest}>{item.destination}</Text>
                </View>
                {renderBadge(item.status)}
              </View>
              
              <View style={styles.cardBottom}>
                <View>
                  <Text style={styles.cardLabel}>BUDGET CEILING</Text>
                  <Text style={styles.cardCeiling}>${item.ceiling}</Text>
                </View>
                {item.lastTriggered && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cardLabel}>LAST TRIGGERED</Text>
                    <Text style={styles.cardDate}>{item.lastTriggered}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Swipeable>
        )}
      />

      {reachedLimit && (
        <View style={[styles.upsellWrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={styles.upsellCard}>
            <Text style={styles.upsellTitle}>Unlock unlimited alerts</Text>
            <Text style={styles.upsellSub}>Free users are limited to 1 active price alert. Upgrade to The Architect to track the whole world simultaneously.</Text>
            <TouchableOpacity style={styles.upsellBtn}>
              <Text style={styles.upsellBtnText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>New Price Alert</Text>
          
          <Text style={styles.sheetLabel}>DESTINATION</Text>
          <View style={styles.inputWrap}>
            <Feather name="search" size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="Search a city or country..."
              placeholderTextColor={Colors.textSecondary}
              value={newDest}
              onChangeText={setNewDest}
            />
          </View>
          
          <Text style={[styles.sheetLabel, { marginTop: spacing.xl }]}>BUDGET CEILING</Text>
          <View style={{ marginBottom: spacing.xl }}>
            <BudgetSlider
              min={500}
              max={15000}
              step={100}
              value={newBudget}
              onChange={setNewBudget}
            />
            <Text style={styles.helperText}>We'll notify you specifically when total trip costs (Flight + Hotel) safely breach beneath this number!</Text>
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
            <Text style={styles.createBtnText}>Create hook</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, backgroundColor: Colors.parchment, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontFamily: 'Astoria', fontSize: 24, color: Colors.nearBlack },
  backBtn: { padding: spacing.xs },
  addBtn: { padding: spacing.xs },

  listContent: { padding: spacing.xl, paddingBottom: 120 },
  card: { backgroundColor: Colors.parchment, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  cardTitleWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.sm, marginRight: spacing.md },
  cardFlag: { fontSize: 24 },
  cardDest: { fontFamily: 'Astoria', fontSize: 22, color: Colors.nearBlack },
  
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontFamily: 'CeraPro-Bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeActive: { backgroundColor: 'rgba(74,140,92,0.15)' },
  badgeTextActive: { color: Colors.sage },
  badgeTriggered: { backgroundColor: Colors.terracotta },
  badgeTextTriggered: { color: Colors.white },
  badgePaused: { backgroundColor: 'rgba(13,30,39,0.08)' },
  badgeTextPaused: { color: Colors.textSecondary },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  cardLabel: { fontFamily: 'CeraPro-Bold', fontSize: 10, color: Colors.textSecondary, letterSpacing: 1, marginBottom: 4 },
  cardCeiling: { fontFamily: 'Astoria', fontSize: 28, color: Colors.nearBlack },
  cardDate: { fontFamily: 'CeraPro-Medium', fontSize: 13, color: Colors.nearBlack },

  deleteAction: { backgroundColor: '#D15858', justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 16, marginBottom: spacing.md },

  upsellWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.xl, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: spacing.xl },
  upsellCard: { backgroundColor: Colors.parchment, borderRadius: 16, padding: spacing.lg, borderWidth: 2, borderColor: Colors.terracotta },
  upsellTitle: { fontFamily: 'Astoria', fontSize: 24, color: Colors.nearBlack, marginBottom: 6 },
  upsellSub: { fontFamily: 'CeraPro-Regular', fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },
  upsellBtn: { backgroundColor: Colors.terracotta, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  upsellBtnText: { fontFamily: 'CeraPro-Bold', fontSize: 15, color: Colors.white },

  sheetBackground: { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHandle: { backgroundColor: Colors.textSecondary, width: 40, height: 4 },
  sheetContent: { padding: spacing.xl },
  sheetTitle: { fontFamily: 'Astoria', fontSize: 28, color: Colors.nearBlack, marginBottom: spacing.xl },
  sheetLabel: { fontFamily: 'CeraPro-Bold', fontSize: 12, color: Colors.textSecondary, letterSpacing: 1, marginBottom: spacing.sm },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.parchment, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: spacing.md },
  input: { flex: 1, height: 50, fontFamily: 'CeraPro-Medium', fontSize: 16, color: Colors.nearBlack, marginLeft: spacing.sm },
  helperText: { fontFamily: 'CeraPro-Regular', fontSize: 13, color: Colors.textSecondary, marginTop: spacing.md, lineHeight: 18 },
  createBtn: { backgroundColor: Colors.terracotta, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: spacing.xl },
  createBtnText: { fontFamily: 'CeraPro-Bold', fontSize: 16, color: Colors.white },
});
