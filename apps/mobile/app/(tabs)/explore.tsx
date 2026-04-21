/**
 * Explore Screen — app/(tabs)/explore.tsx
 *
 * Core interactive map interface over Mapbox GL.
 * Features a full-screen base map and a dynamic BottomSheet for search parameters.
 */

import React, { useRef, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { useSearchStore, DestinationResult, SortMethod } from '@/stores/searchStore';
import { BudgetSlider } from '@/components/ui/BudgetSlider';
import { PillGroup } from '@/components/ui/PillTag';
import { useSearch } from '@/hooks/useSearch';
import { AnywhereMap } from '@/components/map/AnywhereMap';
import { DestinationPreviewCard } from '@/components/destination/DestinationPreviewCard';
import { DestinationResultCard, RESULT_CARD_HEIGHT } from '@/components/destination/DestinationResultCard';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useMapStore } from '@/stores/mapStore';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { RefreshControl } from 'react-native';

const VIBE_OPTIONS = ['Tropical', 'Snowy', 'Beach', 'City', 'Balkans', 'Desert', 'Mountains', 'Cultural'];
const DURATION_OPTIONS = ['Weekend', '5–7 nights', '1–2 weeks', '2+ weeks'];

function parseDurationTextToNights(text: string): number {
  switch (text) {
    case 'Weekend': return 2;
    case '5–7 nights': return 6;
    case '1–2 weeks': return 10;
    case '2+ weeks': return 14;
    default: return 7;
  }
}

function parseNightsToDurationText(nights: number): string {
  if (nights <= 3) return 'Weekend';
  if (nights <= 7) return '5–7 nights';
  if (nights <= 13) return '1–2 weeks';
  return '2+ weeks';
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Global hook integrations
  const { triggerSearch, isPolling } = useSearch();
  const selectedDestinationId = useMapStore((s) => s.selectedDestinationId);

  // ─── Notification Permission & Token Handling ──────────────────────────────
  React.useEffect(() => {
    async function setupPushNotifications() {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('[Push] Failed to get push token for push notification!');
        return;
      }
      
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
           projectId: Constants.expoConfig?.extra?.eas?.projectId || 'mock-proj-123'
        });
        const token = tokenData.data;
        console.log('[Push] Expo push token retrieved:', token);
        
        // Mock POST /users/push-token
        await new Promise(r => setTimeout(r, 500));
        console.log('[Push] Successfully registered hook via POST /users/push-token');
      } catch (err) {
        console.warn('[Push] Error getting push token:', err);
      }
    }

    setupPushNotifications();
  }, []);

  // Search Store Hook Bindings
  const params = useSearchStore((s) => ({
    budget: s.budget,
    vibes: s.vibes,
    durationNights: s.durationNights,
    dateFrom: s.dateFrom,
    dateTo: s.dateTo,
  }));
  const setParams = useSearchStore((s) => s.setParams);
  const status = useSearchStore((s) => s.status);
  const results = useSearchStore((s) => s.results);
  const sortBy = useSearchStore((s) => s.sortBy);
  const setSortBy = useSearchStore((s) => s.setSortBy);

  const [sheetIndex, setSheetIndex] = useState(1);
  const snapPoints = useMemo(() => ['30%', '45%', '70%', '95%'], []);

  const surpriseScale = useSharedValue(1);

  // Derive active selection dynamically
  const activeDestination = useMemo(() => {
    if (!selectedDestinationId) return null;
    return results.find((r) => r.id === selectedDestinationId) || null;
  }, [selectedDestinationId, results]);

  // Synchronize bottom sheet snap to 70% explicitly on map selection
  React.useEffect(() => {
    if (selectedDestinationId) {
      bottomSheetRef.current?.snapToIndex(2); // Snaps to '70%'
    }
  }, [selectedDestinationId]);

  const handleSheetChanges = useCallback((index: number) => {
    setSheetIndex(index);
  }, []);

  const handleFABPress = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(1);
  }, []);

  const handleSurpriseMe = useCallback(() => {
    surpriseScale.value = withSequence(
      withSpring(0.9, { damping: 10, stiffness: 400 }),
      withSpring(1.05, { damping: 12, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 200 })
    );

    const randomVibesCount = Math.floor(Math.random() * 3) + 1;
    const shuffledVibes = [...VIBE_OPTIONS].sort(() => 0.5 - Math.random());
    const randomVibes = shuffledVibes.slice(0, randomVibesCount);

    const randomDurationIdx = Math.floor(Math.random() * DURATION_OPTIONS.length);
    const randomBudget = Math.floor(Math.random() * 8) * 500 + 1000;

    const payloadParams = {
      budget: randomBudget,
      durationNights: parseDurationTextToNights(DURATION_OPTIONS[randomDurationIdx]),
      vibes: randomVibes,
      dateFrom: null,
      dateTo: null,
    };

    setParams(payloadParams);
    handleSearchSubmit(payloadParams);
  }, [setParams]);

  const handleSearchSubmit = useCallback((explicitParams?: typeof params) => {
    const payload = explicitParams || params;
    
    // Collapse to row 0 immediately to unveil the ghost pins map layer
    bottomSheetRef.current?.snapToIndex(0);
    
    // Trigger real TanStack hook
    triggerSearch({
      budget: payload.budget,
      duration: payload.durationNights,
      tags: payload.vibes,
      dates: (payload.dateFrom && payload.dateTo) 
        ? { start: payload.dateFrom, end: payload.dateTo } 
        : null,
    });
  }, [params, triggerSearch]);

  const surpriseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: surpriseScale.value }],
  }));

  const hasDates = params.dateFrom && params.dateTo;

  return (
    <View style={styles.container}>
      {/* Decoupled Map Component Execution Layer */}
      <AnywhereMap status={status} results={results} />

      {sheetIndex === 0 && (
        <TouchableOpacity
          style={[styles.fab, { top: insets.top + spacing.md }]}
          onPress={handleFABPress}
          activeOpacity={0.8}
        >
          <Feather name="search" size={24} color={Colors.white} />
        </TouchableOpacity>
      )}

      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        {(status === 'ready' || status === 'pending') ? (
          <BottomSheetFlatList
            data={status === 'pending' ? (Array.from({ length: 5 }) as undefined[]) : results}
            keyExtractor={(item, index) => status === 'pending' ? `skel-${index}` : (item as DestinationResult).id}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            maxToRenderPerBatch={8}
            windowSize={5}
            initialNumToRender={5}
            getItemLayout={(_, index) => ({
              length: RESULT_CARD_HEIGHT + 8, // card + marginBottom
              offset: (RESULT_CARD_HEIGHT + 8) * index,
              index,
            })}
            refreshControl={
              <RefreshControl refreshing={status === 'pending' || isPolling} onRefresh={() => handleSearchSubmit()} tintColor={Colors.terracotta} />
            }
            ListHeaderComponent={() => (
              <View style={{ marginBottom: spacing.md }}>
                {activeDestination && <DestinationPreviewCard destination={activeDestination} />}
                
                <Text style={styles.swipeHintText}>Swipe up for list, swipe down for map</Text>
                
                <View style={styles.sortRow}>
                  <Text style={styles.sortLabel}>Sort by</Text>
                  <BottomSheetScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
                    {['match', 'price', 'safety', 'climate'].map((method) => {
                       const labels: Record<string, string> = { match: 'Best match', price: 'Price ↑', safety: 'Safety', climate: 'Climate' };
                       const isActive = sortBy === method;
                       return (
                         <TouchableOpacity 
                           key={method} 
                           activeOpacity={0.7} 
                           style={[styles.sortPill, isActive && styles.sortPillActive]}
                           onPress={() => setSortBy(method as SortMethod)}
                         >
                           <Text style={[styles.sortPillText, isActive && styles.sortPillTextActive]}>{labels[method]}</Text>
                         </TouchableOpacity>
                       );
                    })}
                  </BottomSheetScrollView>
                </View>
              </View>
            )}
            renderItem={({ item, index }) => 
              status === 'pending' ? (
                <SkeletonCard />
              ) : (
                <DestinationResultCard destination={item as DestinationResult} rank={index + 1} />
              )
            }
            ListFooterComponent={() => (
              <TouchableOpacity onPress={() => useSearchStore.getState().reset()} style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>Start completely new search</Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          <BottomSheetScrollView
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            {activeDestination && (
              <DestinationPreviewCard destination={activeDestination} />
            )}

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Where to next?</Text>
              <Text style={styles.sheetSubtitle}>Adjust your preferences to explore personalized destinations.</Text>
            </View>

            <View style={styles.formContainer}>
              {/* 1. Budget Slider */}
              <BudgetSlider
                min={500}
                max={15000}
                step={100}
                value={params.budget}
                onChange={(v) => setParams({ budget: v })}
              />

              {/* 2. Date Trigger */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>DATES</Text>
                <TouchableOpacity style={styles.datePickerTrigger} activeOpacity={0.7}>
                  <Feather name="calendar" size={18} color={hasDates ? Colors.nearBlack : Colors.textSecondary} />
                  <Text style={[styles.datePickerText, hasDates && styles.datePickerTextActive]}>
                    {hasDates ? `${params.dateFrom} - ${params.dateTo}` : 'Select travel window'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 3. Duration Line */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>HOW LONG?</Text>
                <PillGroup
                  options={DURATION_OPTIONS}
                  selected={parseNightsToDurationText(params.durationNights)}
                  multiSelect={false}
                  onChange={(val) => setParams({ durationNights: parseDurationTextToNights(val as string) })}
                  activeColor={Colors.terracotta}
                />
              </View>

              {/* 4. Vibe Tags */}
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>VIBES</Text>
                <PillGroup
                  options={VIBE_OPTIONS}
                  selected={params.vibes}
                  multiSelect={true}
                  onChange={(val) => setParams({ vibes: val as string[] })}
                  activeColor={Colors.sage}
                />
              </View>

              {/* Surprise Me Anchor */}
              <Animated.View style={[styles.surpriseWrapper, surpriseAnimatedStyle]}>
                <TouchableOpacity onPress={handleSurpriseMe} activeOpacity={0.7} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <Text style={styles.surpriseText}>Surprise me 🎲</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => handleSearchSubmit()}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnLabel}>Find my destination →</Text>
            </TouchableOpacity>
            
            <View style={{ height: insets.bottom + spacing.sm }} />
          </BottomSheetScrollView>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.nearBlack,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.nearBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  sheetBackground: {
    backgroundColor: Colors.parchment,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheetHandle: {
    backgroundColor: 'rgba(40, 36, 39, 0.2)',
    width: 48,
    height: 5,
    marginTop: 8,
  },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sheetHeader: {
    marginBottom: spacing.xl,
  },
  sheetTitle: {
    fontFamily: 'Astoria',
    fontSize: 32,
    color: Colors.nearBlack,
    marginBottom: spacing.xs,
  },
  sheetSubtitle: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  formContainer: {
    gap: spacing.xl,
    marginBottom: spacing.xxl,
  },
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: spacing.sm,
  },
  datePickerText: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  datePickerTextActive: {
    color: Colors.nearBlack,
    fontFamily: 'CeraPro-Medium',
  },
  surpriseWrapper: {
    alignSelf: 'center',
    marginTop: -spacing.sm,
  },
  surpriseText: {
    fontFamily: 'CeraPro-Medium',
    fontSize: 15,
    color: Colors.terracotta,
    textDecorationLine: 'underline',
  },
  primaryBtn: {
    height: 54,
    backgroundColor: Colors.nearBlack,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnLoading: {
    backgroundColor: Colors.textSecondary,
  },
  primaryBtnLabel: { fontFamily: 'CeraPro-Bold', fontSize: 16, color: Colors.white },
  swipeHintText: { fontFamily: 'CeraPro-Medium', fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginVertical: spacing.md },
  sortRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, paddingHorizontal: spacing.sm },
  sortLabel: { fontFamily: 'CeraPro-Medium', fontSize: 13, color: Colors.textSecondary, marginRight: spacing.md },
  sortPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  sortPillActive: { backgroundColor: Colors.nearBlack, borderColor: Colors.nearBlack },
  sortPillText: { fontFamily: 'CeraPro-Medium', fontSize: 13, color: Colors.textSecondary },
  sortPillTextActive: { color: Colors.white },
  resetBtn: { marginTop: spacing.xl, padding: spacing.md, alignItems: 'center' },
  resetBtnText: { fontFamily: 'CeraPro-Bold', fontSize: 14, color: Colors.terracotta, textDecorationLine: 'underline' },
});
