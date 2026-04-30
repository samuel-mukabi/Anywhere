import React, { useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Animated, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Toast from 'react-native-toast-message';
import { Colors } from '@/core/theme/colors';
import { spacing } from '@/core/theme/spacing';
import { useSearchStore } from '@/features/search/search-store';
import { useTripsStore } from '@/features/trips/trips-store';

const HERO_HEIGHT = 340;


export default function DestinationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const results = useSearchStore((s) => s.results);
  const durationNights = useSearchStore((s) => s.durationNights) || 7;
  const saveTrip = useTripsStore((s) => s.saveTrip);
  const savedTrips = useTripsStore((s) => s.savedTrips);

  const destination = useMemo(() => results.find((r) => r.id === id) || null, [id, results]);
  const isSaved = useMemo(() => savedTrips.some((t) => t.id === id), [savedTrips, id]);

  const scrollY = useRef(new Animated.Value(0)).current;

  if (!destination) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  const flightCost = destination.flightPrice || 0;
  const totalCost = destination.totalCost || 0;
  const staysCost = Math.max(0, totalCost - flightCost);

  // Derive daily costs from totals
  const dailyTotal = staysCost > 0 ? Math.round(staysCost / durationNights) : 0;
  const dailyAccom = Math.round(dailyTotal * 0.6);
  const dailyDining = Math.round(dailyTotal * 0.25);
  const dailyTransport = Math.round(dailyTotal * 0.15);

  const safetyScore = destination.safetyScore || 0;
  const whyItFits = destination.whyItFits || [];

  // Determine tier label from total cost vs daily
  const tierLabel = dailyTotal > 250 ? 'PREMIUM' : dailyTotal > 100 ? 'MID-RANGE' : 'BUDGET';
  const tierColor = dailyTotal > 250 ? Colors.warning : dailyTotal > 100 ? Colors.ocean : Colors.sage;

  // Safety bar color
  const safetyBarColor = safetyScore >= 70 ? Colors.sage : safetyScore >= 40 ? Colors.warning : Colors.terracotta;
  const safetyLabel = safetyScore >= 70 ? 'Safe' : safetyScore >= 40 ? 'Exercise caution' : 'High caution';

  // Parallax
  const imageTranslateY = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0, HERO_HEIGHT],
    outputRange: [-HERO_HEIGHT * 0.4, 0, HERO_HEIGHT * 0.4],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 120, HERO_HEIGHT - 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handleSave = () => {
    saveTrip(destination);
    Toast.show({
      type: 'success',
      text1: 'Destination Saved',
      text2: `${destination.city} added to your trips.`,
      visibilityTime: 3000,
    });
  };

  return (
    <View style={styles.container}>

      {/* ── Floating opaque header (appears as user scrolls past hero) ── */}
      <Animated.View
        style={[
          styles.floatingHeader,
          { paddingTop: insets.top + 8, opacity: headerOpacity },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.floatingHeaderTitle}>{destination.city}</Text>
      </Animated.View>

      {/* ── Fixed transparent top bar (always visible) ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={20} color={Colors.white} />
          <Text style={styles.topBarBackLabel}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.topBarWordmark}>Anywhere.</Text>

        <TouchableOpacity style={styles.topBarBtn} onPress={() => {}} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="share" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* ── Scrollable content ── */}
      <Animated.ScrollView
        style={styles.scrollRoot}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
      >
        {/* HERO */}
        <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: imageTranslateY }] }]}>
            <Image
              source={{ uri: destination.imageUrl || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1' }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              placeholder={destination.blurhash || 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH'}
              transition={300}
              cachePolicy="memory-disk"
            />
          </Animated.View>
          <LinearGradient
            colors={['transparent', 'rgba(13,30,39,0.7)']}
            style={styles.heroGradient}
          />
          {/* Country chip at bottom of hero */}
          <View style={styles.heroBottom}>
            <View style={styles.countryChip}>
              <Text style={styles.countryChipText}>{destination.country.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* ── WHITE CONTENT CARD ── */}
        <View style={styles.contentCard}>

          {/* Destination name */}
          <Text style={styles.destName}>{destination.city}</Text>

          {/* Vibe / tag chips derived from whyItFits */}
          {whyItFits.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsScroll}
              contentContainerStyle={styles.tagsContainer}
            >
              {whyItFits.slice(0, 4).map((tag, i) => (
                <View key={i} style={styles.vibeTag}>
                  <Text style={styles.vibeTagText}>{tag}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* ── DARK COST SUMMARY CARD ── */}
          <View style={styles.costCard}>
            <View style={styles.costCardTop}>
              <Text style={styles.costCardLabel}>ESTIMATED TOTAL</Text>
              <Text style={styles.costCardTotal}>${totalCost.toLocaleString()}</Text>
            </View>
            <View style={styles.costCardDivider} />
            <View style={styles.costCardBreakRow}>
              <View style={styles.costCardItem}>
                <Feather name="send" size={12} color="rgba(255,255,255,0.5)" style={{ transform: [{ rotate: '45deg' }] }} />
                <View>
                  <Text style={styles.costCardItemLabel}>FLIGHT</Text>
                  <Text style={styles.costCardItemValue}>≈${flightCost.toLocaleString()}</Text>
                </View>
              </View>
              <View style={styles.costCardSeparator} />
              <View style={styles.costCardItem}>
                <Feather name="home" size={12} color="rgba(255,255,255,0.5)" />
                <View>
                  <Text style={styles.costCardItemLabel}>STAYS</Text>
                  <Text style={styles.costCardItemValue}>≈${staysCost.toLocaleString()}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── INFO GRID: Best Time + Nearest Hub ── */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Feather name="sun" size={16} color={Colors.warning} />
              <Text style={styles.infoCardLabel}>BEST TIME</Text>
              <Text style={styles.infoCardValue}>May – Sept</Text>
            </View>
            <View style={styles.infoCardGap} />
            <View style={styles.infoCard}>
              <Feather name="navigation" size={16} color={Colors.ocean} />
              <Text style={styles.infoCardLabel}>NEAREST HUB</Text>
              <Text style={styles.infoCardValue}>{destination.iataCode || '—'}</Text>
            </View>
          </View>

          {/* ── ABOUT SECTION ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this destination</Text>
            <Text style={styles.bodyText}>
              {`${destination.city} offers a unique blend of culture, climate, and value that makes it a standout choice for your travel style. Its character has drawn travellers for generations — and with your budget, you're positioned to experience it properly.`}
            </Text>
          </View>

          {/* ── AVERAGE DAILY BUDGET ── */}
          {dailyTotal > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Average Daily Budget</Text>
              <View style={styles.dailyBudgetCard}>
                <View style={styles.dailyBudgetHeader}>
                  <Text style={styles.dailyBudgetAmount}>${dailyTotal}<Text style={styles.dailyBudgetUnit}> / day</Text></Text>
                  <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
                    <Text style={styles.tierBadgeText}>{tierLabel}</Text>
                  </View>
                </View>
                <View style={styles.dailyBudgetDivider} />
                <View style={styles.dailyLineItem}>
                  <View style={styles.dailyLineLeft}>
                    <Feather name="home" size={14} color={Colors.textSecondary} />
                    <View>
                      <Text style={styles.dailyLineTitle}>Accommodation</Text>
                      <Text style={styles.dailyLineSubtitle}>Hotel / Apartment</Text>
                    </View>
                  </View>
                  <Text style={styles.dailyLineAmount}>${dailyAccom}</Text>
                </View>
                <View style={styles.dailyLineItem}>
                  <View style={styles.dailyLineLeft}>
                    <Feather name="coffee" size={14} color={Colors.textSecondary} />
                    <View>
                      <Text style={styles.dailyLineTitle}>Dining</Text>
                      <Text style={styles.dailyLineSubtitle}>Restaurants & cafés</Text>
                    </View>
                  </View>
                  <Text style={styles.dailyLineAmount}>${dailyDining}</Text>
                </View>
                <View style={styles.dailyLineItem}>
                  <View style={styles.dailyLineLeft}>
                    <Feather name="map" size={14} color={Colors.textSecondary} />
                    <View>
                      <Text style={styles.dailyLineTitle}>Transport</Text>
                      <Text style={styles.dailyLineSubtitle}>Local transit</Text>
                    </View>
                  </View>
                  <Text style={styles.dailyLineAmount}>${dailyTransport}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── SAFETY ── */}
          <View style={styles.section}>
            <View style={styles.safetySectionHeader}>
              <Text style={styles.sectionTitle}>Safety</Text>
              <Text style={[styles.safetyLabel, { color: safetyBarColor }]}>{safetyLabel}</Text>
            </View>
            <View style={styles.safetyBarTrack}>
              <View style={[styles.safetyBarFill, { width: `${safetyScore}%`, backgroundColor: safetyBarColor }]} />
            </View>
            <Text style={styles.safetyScore}>{safetyScore}/100</Text>
          </View>

        </View>
      </Animated.ScrollView>

      {/* ── STICKY BOTTOM DOCK ── */}
      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TouchableOpacity
          style={styles.bookBtn}
          activeOpacity={0.85}
          onPress={() => router.push({
            pathname: '/booking/confirm',
            params: { destId: id, city: destination.city, totalCost: String(destination.totalCost) },
          })}
        >
          <Text style={styles.bookBtnText}>Book this trip</Text>
          <Feather name="arrow-right" size={18} color={Colors.white} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveDockBtn} onPress={handleSave} activeOpacity={0.7}>
          <Feather
            name={isSaved ? 'bookmark' : 'bookmark'}
            size={16}
            color={isSaved ? Colors.terracotta : Colors.nearBlack}
          />
          <Text style={[styles.saveDockBtnText, isSaved && { color: Colors.terracotta }]}>
            {isSaved ? 'Saved' : 'Save destination'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.parchment },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollRoot: { flex: 1 },

  // ── Top bars ──────────────────────────────────────────────────────────────
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  topBarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topBarBackLabel: { fontFamily: 'CeraPro-Medium', fontSize: 13, color: Colors.white, letterSpacing: 0.3 },
  topBarWordmark: { fontFamily: 'Astoria', fontSize: 18, color: Colors.white },
  floatingHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: Colors.nearBlack,
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  floatingHeaderTitle: { fontFamily: 'Astoria', fontSize: 18, color: Colors.white },

  // ── Hero ─────────────────────────────────────────────────────────────────
  heroContainer: { width: '100%', overflow: 'hidden' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 },
  heroBottom: { position: 'absolute', bottom: spacing.md, left: spacing.md },
  countryChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  countryChipText: {
    fontFamily: 'CeraPro-Bold', fontSize: 10, color: Colors.white,
    letterSpacing: 1.5,
  },

  // ── Content card ─────────────────────────────────────────────────────────
  contentCard: {
    backgroundColor: Colors.parchment,
    borderTopLeftRadius: 0, borderTopRightRadius: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  destName: {
    fontFamily: 'Astoria', fontSize: 38, color: Colors.nearBlack,
    lineHeight: 44, marginBottom: spacing.sm,
  },

  // ── Tags ─────────────────────────────────────────────────────────────────
  tagsScroll: { marginHorizontal: -spacing.md, marginBottom: spacing.md },
  tagsContainer: { paddingHorizontal: spacing.md, gap: spacing.xs, flexDirection: 'row' },
  vibeTag: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.nearBlack, borderRadius: 4,
  },
  vibeTagText: { fontFamily: 'CeraPro-Bold', fontSize: 10, color: Colors.white, letterSpacing: 1 },

  // ── Cost card ─────────────────────────────────────────────────────────────
  costCard: {
    backgroundColor: Colors.nearBlack, borderRadius: 16,
    padding: spacing.md, marginBottom: spacing.md,
  },
  costCardTop: { marginBottom: spacing.sm },
  costCardLabel: { fontFamily: 'CeraPro-Medium', fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5 },
  costCardTotal: { fontFamily: 'Astoria', fontSize: 36, color: Colors.white, marginTop: 2 },
  costCardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: spacing.sm },
  costCardBreakRow: { flexDirection: 'row', alignItems: 'center' },
  costCardItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  costCardItemLabel: { fontFamily: 'CeraPro-Medium', fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5 },
  costCardItemValue: { fontFamily: 'CeraPro-Bold', fontSize: 15, color: Colors.white, marginTop: 1 },
  costCardSeparator: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: spacing.md },

  // ── Info grid ─────────────────────────────────────────────────────────────
  infoGrid: { flexDirection: 'row', marginBottom: spacing.lg },
  infoCard: {
    flex: 1, backgroundColor: Colors.surfaceElevated,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    padding: spacing.md, gap: 4,
  },
  infoCardGap: { width: spacing.sm },
  infoCardLabel: { fontFamily: 'CeraPro-Medium', fontSize: 9, color: Colors.textSecondary, letterSpacing: 1.5, marginTop: 4 },
  infoCardValue: { fontFamily: 'CeraPro-Bold', fontSize: 15, color: Colors.nearBlack },

  // ── Sections ─────────────────────────────────────────────────────────────
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontFamily: 'Astoria', fontSize: 22, color: Colors.nearBlack,
    marginBottom: spacing.md,
  },
  bodyText: {
    fontFamily: 'CeraPro-Regular', fontSize: 15, color: Colors.textSecondary,
    lineHeight: 24,
  },

  // ── Daily budget ─────────────────────────────────────────────────────────
  dailyBudgetCard: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: spacing.md,
  },
  dailyBudgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  dailyBudgetAmount: { fontFamily: 'Astoria', fontSize: 30, color: Colors.nearBlack },
  dailyBudgetUnit: { fontFamily: 'CeraPro-Regular', fontSize: 14, color: Colors.textSecondary },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  tierBadgeText: { fontFamily: 'CeraPro-Bold', fontSize: 9, color: Colors.white, letterSpacing: 1 },
  dailyBudgetDivider: { height: 1, backgroundColor: Colors.border, marginBottom: spacing.md },
  dailyLineItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dailyLineLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dailyLineTitle: { fontFamily: 'CeraPro-Medium', fontSize: 14, color: Colors.nearBlack },
  dailyLineSubtitle: { fontFamily: 'CeraPro-Regular', fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  dailyLineAmount: { fontFamily: 'CeraPro-Bold', fontSize: 15, color: Colors.nearBlack },

  // ── Safety ───────────────────────────────────────────────────────────────
  safetySectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.md },
  safetyLabel: { fontFamily: 'CeraPro-Medium', fontSize: 13 },
  safetyBarTrack: {
    height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden',
  },
  safetyBarFill: { height: '100%', borderRadius: 4 },
  safetyScore: {
    fontFamily: 'CeraPro-Regular', fontSize: 12, color: Colors.textSecondary,
    marginTop: spacing.xs,
  },

  // ── Bottom dock ───────────────────────────────────────────────────────────
  bottomDock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.parchment, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: spacing.md, paddingTop: spacing.md,
  },
  bookBtn: {
    height: 56, backgroundColor: Colors.terracotta, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  bookBtnText: { fontFamily: 'CeraPro-Bold', fontSize: 16, color: Colors.white },
  saveDockBtn: {
    height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  saveDockBtnText: { fontFamily: 'CeraPro-Medium', fontSize: 14, color: Colors.nearBlack },
});
