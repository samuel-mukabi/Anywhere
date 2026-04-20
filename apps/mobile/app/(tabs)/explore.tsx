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
import Mapbox from '@rnmapbox/maps';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Constants from 'expo-constants';

import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

// Initialize mapbox early
Mapbox.setAccessToken(Constants.expoConfig?.extra?.mapboxToken || '');

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Track the actual index of the bottom sheet (0: 30%, 1: 45%, 2: 95%)
  const [sheetIndex, setSheetIndex] = useState(1);

  // Snap points for the sheet based on app states
  const snapPoints = useMemo(() => ['30%', '45%', '95%'], []);

  // When sheet changes index natively via drag
  const handleSheetChanges = useCallback((index: number) => {
    setSheetIndex(index);
  }, []);

  // Open full sheet when FAB is pressed
  const handleFABPress = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(1); // Back to 45% default search
  }, []);

  return (
    <View style={styles.container}>
      {/* ─── Mapbox Base Layer ──────────────────────────────────────────────── */}
      <View style={StyleSheet.absoluteFillObject}>
        <Mapbox.MapView
          style={StyleSheet.absoluteFillObject}
          styleURL={Mapbox.StyleURL.Dark}
          projection="globe"
          zoomEnabled
          scrollEnabled
          pitchEnabled
          logoEnabled={false}
          attributionEnabled={false}
        >
          <Mapbox.Camera
            defaultSettings={{
              centerCoordinate: [0, 20],
              zoomLevel: 1.5,
              pitch: 0,
            }}
          />
        </Mapbox.MapView>
      </View>

      {/* ─── Floating Search FAB ───────────────────────────────────────────── */}
      {/* Only show when the sheet is completely collapsed to row 0 (30%) */}
      {sheetIndex === 0 && (
        <TouchableOpacity
          style={[styles.fab, { top: insets.top + spacing.md }]}
          onPress={handleFABPress}
          activeOpacity={0.8}
        >
          <Feather name="search" size={24} color={Colors.white} />
        </TouchableOpacity>
      )}

      {/* ─── Bottom Sheet Search Form ───────────────────────────────────────── */}
      <BottomSheet
        ref={bottomSheetRef}
        index={1} // Start at 45%
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Where to next?</Text>
            <Text style={styles.sheetSubtitle}>Adjust your preferences to explore personalized destinations.</Text>
          </View>

          {/* Placeholder for Form Elements */}
          <View style={styles.formPlaceholder}>
            <View style={styles.placeholderBlock}>
              <Text style={styles.placeholderLabel}>Budget Slider</Text>
            </View>
            <View style={styles.placeholderBlock}>
              <Text style={styles.placeholderLabel}>Date Picker & Duration Pills</Text>
            </View>
            <View style={styles.placeholderBlock}>
              <Text style={styles.placeholderLabel}>Vibe Tags</Text>
            </View>
          </View>

          {/* Primary CTA */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => bottomSheetRef.current?.snapToIndex(0)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnLabel}>Find my destination</Text>
          </TouchableOpacity>
          
          {/* Safe area padding adapter */}
          <View style={{ height: insets.bottom + spacing.sm }} />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.nearBlack, // Dark ocean fallback before map load
  },

  /* FAB */
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

  /* Bottom Sheet Styling */
  sheetBackground: {
    backgroundColor: Colors.parchment,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHandle: {
    backgroundColor: 'rgba(40, 36, 39, 0.2)', // nearBlack at 20%
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

  /* Placholders for actual components */
  formPlaceholder: {
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  placeholderBlock: {
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(40, 36, 39, 0.03)',
  },
  placeholderLabel: {
    fontFamily: 'CeraPro-Medium',
    fontSize: 14,
    color: Colors.textSecondary,
  },

  /* CTA Button */
  primaryBtn: {
    height: 54,
    backgroundColor: Colors.nearBlack,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnLabel: {
    fontFamily: 'CeraPro-Medium',
    fontSize: 17,
    color: Colors.parchment,
    letterSpacing: 0.2,
  },
});
