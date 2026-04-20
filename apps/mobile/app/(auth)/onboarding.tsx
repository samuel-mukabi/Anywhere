/**
 * Onboarding — app/(auth)/onboarding.tsx
 *
 * Three-card horizontal swipe flow that introduces the app before
 * pushing the user to register.
 *
 *  Slide 1 (dark): animated budget counter + tagline
 *  Slide 2 (parchment): globe illustration + headline
 *  Slide 3 (dark): Pro feature highlights + CTA
 *
 * On completion writes `onboardingComplete=true` to AsyncStorage
 * so the root layout skips this screen on subsequent launches.
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  StatusBar as RNStatusBar,
  ListRenderItemInfo,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors }  from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const { width, height } = Dimensions.get('window');
export const ONBOARDING_KEY = 'onboardingComplete';

// ─── Slide definitions ────────────────────────────────────────────────────────
const SLIDES = ['budget', 'globe', 'pro'] as const;
type Slide = typeof SLIDES[number];

// ─── Pro features list ───────────────────────────────────────────────────────
const PRO_FEATURES = [
  { icon: '✂️',  label: 'Split the bill',       desc: 'Auto-calculate costs across your group.' },
  { icon: '🌍',  label: 'Group rooms',           desc: 'Vote on destinations together in real-time.' },
  { icon: '🌤️', label: 'Climate filters',        desc: 'Find perfect weather windows for your dates.' },
];

// ─── Dot indicator ───────────────────────────────────────────────────────────
function Dots({ activeIndex, dark }: { activeIndex: number; dark: boolean }) {
  return (
    <View style={styles.dots}>
      {SLIDES.map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === activeIndex
              ? styles.dotActive
              : { backgroundColor: dark ? 'rgba(238,235,217,0.25)' : 'rgba(40,36,39,0.2)' },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Animated budget counter ──────────────────────────────────────────────────
function BudgetCounter() {
  const animVal = useRef(new Animated.Value(0)).current;
  const [displayAmount, setDisplayAmount] = useState(0);

  useEffect(() => {
    const id = animVal.addListener(({ value }) => {
      setDisplayAmount(Math.round(value));
    });

    Animated.timing(animVal, {
      toValue:         800,
      duration:        1600,
      easing:          Easing.out(Easing.cubic),
      useNativeDriver: false,   // must be false for JS-driven updates
    }).start();

    return () => animVal.removeListener(id);
  }, [animVal]);

  return (
    <Text style={styles.budgetCounter}>
      ${displayAmount.toLocaleString()}
    </Text>
  );
}

// ─── Globe SVG (inline, no external dep) ─────────────────────────────────────
function GlobeSVG() {
  // We use a minimal SVG-style view rendered with React Native primitives
  // (no react-native-svg needed) — a large circle with decorative arc lines.
  return (
    <View style={styles.globeContainer}>
      {/* Outer ring */}
      <View style={styles.globeOuter}>
        {/* Latitude band 1 */}
        <View style={[styles.globeArc, { top: '22%', height: 2, width: '80%', alignSelf: 'center' }]} />
        {/* Latitude band 2 */}
        <View style={[styles.globeArc, { top: '50%', height: 2, width: '100%' }]} />
        {/* Latitude band 3 */}
        <View style={[styles.globeArc, { top: '76%', height: 2, width: '80%', alignSelf: 'center' }]} />
        {/* Vertical meridian */}
        <View style={[styles.globeMeridian, { left: '30%' }]} />
        <View style={[styles.globeMeridian, { left: '50%' }]} />
        <View style={[styles.globeMeridian, { left: '70%' }]} />
        {/* Location pin */}
        <View style={styles.globePin}>
          <View style={styles.globePinDot} />
          <View style={styles.globePinLine} />
        </View>
      </View>
    </View>
  );
}

// ─── Slide components ─────────────────────────────────────────────────────────
function SlideBudget({ isActive }: { isActive: boolean }) {
  return (
    <View style={[styles.slide, { backgroundColor: '#1C2B36' }]}>
      <View style={styles.slideContent}>
        <Text style={[styles.eyebrow, { color: Colors.terracotta }]}>Anywhere</Text>
        <Text style={styles.headlineDark}>
          Travel starts with{'\n'}a number.
        </Text>
        {isActive && <BudgetCounter />}
        <Text style={styles.bodyDark}>
          Your average trip budget. We use this to surface destinations that actually fit.
        </Text>
      </View>
    </View>
  );
}

function SlideGlobe() {
  return (
    <View style={[styles.slide, { backgroundColor: Colors.parchment }]}>
      <View style={styles.slideContent}>
        <GlobeSVG />
        <Text style={styles.headlineLight}>
          Pick a pin.{'\n'}Not a price wall.
        </Text>
        <Text style={styles.bodyLight}>
          Browse the world by what you can actually afford — no hidden upsells.
        </Text>
      </View>
    </View>
  );
}

function SlidePro() {
  return (
    <View style={[styles.slide, { backgroundColor: '#1C2B36' }]}>
      <View style={styles.slideContent}>
        <Text style={[styles.eyebrow, { color: Colors.terracotta }]}>Anywhere Pro</Text>
        <Text style={styles.headlineDark}>Everything you need{'\n'}to travel together.</Text>
        <View style={styles.featureList}>
          {PRO_FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const insets       = useSafeAreaInsets();
  const flatListRef  = useRef<FlatList<Slide>>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const goToSlide = useCallback((idx: number) => {
    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
    setActiveIdx(idx);
  }, []);

  const handleSkip = useCallback(() => {
    router.replace('/(auth)/login');
  }, []);

  const handleGetStarted = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/register');
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems[0]?.index != null) {
        setActiveIdx(viewableItems[0].index);
      }
    },
  ).current;

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Slide>) => {
      switch (item) {
        case 'budget': return <SlideBudget isActive={index === activeIdx} />;
        case 'globe':  return <SlideGlobe />;
        case 'pro':    return <SlidePro />;
        default:       return null;
      }
    },
    [activeIdx],
  );

  const isDark = activeIdx === 0 || activeIdx === 2;

  return (
    <View style={styles.root}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Skip button — only on slides 0 and 1 */}
      {activeIdx < 2 && (
        <TouchableOpacity
          onPress={handleSkip}
          style={[styles.skipBtn, { top: insets.top + 16 }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.skipLabel, { color: isDark ? Colors.parchment : Colors.nearBlack }]}>
            Skip
          </Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES as unknown as Slide[]}
        keyExtractor={(s) => s}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        renderItem={renderItem}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        getItemLayout={(_, idx) => ({ length: width, offset: width * idx, index: idx })}
      />

      {/* Bottom controls */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 32 }]}>
        <Dots activeIndex={activeIdx} dark={isDark} />

        {activeIdx < 2 ? (
          /* Prev/Next row */
          <View style={styles.navRow}>
            {activeIdx > 0 ? (
              <TouchableOpacity onPress={() => goToSlide(activeIdx - 1)}>
                <Text style={[styles.navGhost, { color: isDark ? Colors.parchment : Colors.nearBlack }]}>← Back</Text>
              </TouchableOpacity>
            ) : <View style={{ width: 64 }} />}
            <TouchableOpacity
              onPress={() => goToSlide(activeIdx + 1)}
              style={[styles.nextBtn, { backgroundColor: Colors.terracotta }]}
            >
              <Text style={styles.nextLabel}>Next</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Get started CTA */
          <TouchableOpacity onPress={handleGetStarted} style={[styles.ctaBtn, { backgroundColor: Colors.terracotta }]}>
            <Text style={styles.ctaLabel}>Get started</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: '#1C2B36',
  },
  skipBtn: {
    position: 'absolute',
    right:    spacing.xl,
    zIndex:   10,
  },
  skipLabel: {
    fontFamily: 'CeraPro-Medium',
    fontSize:   15,
  },

  // ─ Slides ─
  slide: {
    width,
    minHeight: height * 0.75,
    paddingTop: 100,
  },
  slideContent: {
    flex:              1,
    paddingHorizontal: spacing.xl,
    paddingTop:        spacing.xl,
  },
  eyebrow: {
    fontFamily:    'CeraPro-Medium',
    fontSize:      12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom:  spacing.sm,
  },
  headlineDark: {
    fontFamily:   'Astoria',
    fontSize:     40,
    lineHeight:   48,
    color:        Colors.parchment,
    marginBottom: spacing.lg,
  },
  headlineLight: {
    fontFamily:   'Astoria',
    fontSize:     40,
    lineHeight:   48,
    color:        Colors.nearBlack,
    marginBottom: spacing.lg,
    marginTop:    spacing.xl,
  },
  bodyDark: {
    fontFamily: 'CeraPro-Regular',
    fontSize:   16,
    lineHeight: 24,
    color:      'rgba(238,235,217,0.72)',
  },
  bodyLight: {
    fontFamily: 'CeraPro-Regular',
    fontSize:   16,
    lineHeight: 24,
    color:      Colors.textSecondary,
  },

  // ─ Budget counter ─
  budgetCounter: {
    fontFamily:    'Astoria',
    fontSize:      72,
    color:         Colors.terracotta,
    marginBottom:  spacing.lg,
    letterSpacing: -1,
  },

  // ─ Globe ─
  globeContainer: {
    alignSelf:   'center',
    marginTop:   spacing.md,
    marginBottom: spacing.lg,
  },
  globeOuter: {
    width:        200,
    height:       200,
    borderRadius: 100,
    borderWidth:  2,
    borderColor:  Colors.terracotta,
    overflow:     'hidden',
    position:     'relative',
  },
  globeArc: {
    position:        'absolute',
    backgroundColor: 'rgba(196,113,58,0.35)',
  },
  globeMeridian: {
    position:        'absolute',
    top:             0,
    bottom:          0,
    width:           2,
    backgroundColor: 'rgba(196,113,58,0.25)',
  },
  globePin: {
    position:   'absolute',
    top:        '28%',
    left:       '54%',
    alignItems: 'center',
  },
  globePinDot: {
    width:           12,
    height:          12,
    borderRadius:    6,
    backgroundColor: Colors.terracotta,
  },
  globePinLine: {
    width:           2,
    height:          14,
    backgroundColor: Colors.terracotta,
  },

  // ─ Pro features ─
  featureList: {
    marginTop: spacing.lg,
    gap:       spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.md,
  },
  featureIcon: {
    fontSize:  24,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
  },
  featureLabel: {
    fontFamily:    'CeraPro-Medium',
    fontSize:      16,
    color:         Colors.parchment,
    marginBottom:  2,
  },
  featureDesc: {
    fontFamily: 'CeraPro-Regular',
    fontSize:   13,
    color:      'rgba(238,235,217,0.6)',
    lineHeight: 19,
  },

  // ─ Footer ─
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop:        spacing.lg,
    gap:               spacing.lg,
    backgroundColor:   'transparent',
  },
  dots: {
    flexDirection:  'row',
    justifyContent: 'center',
    gap:            8,
  },
  dot: {
    height:       6,
    width:        6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: Colors.terracotta,
    width:           22,
    borderRadius:    3,
  },
  navRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
  navGhost: {
    fontFamily: 'CeraPro-Medium',
    fontSize:   15,
    width:      64,
  },
  nextBtn: {
    height:       48,
    paddingHorizontal: spacing.xl,
    borderRadius: 24,
    alignItems:   'center',
    justifyContent: 'center',
  },
  nextLabel: {
    fontFamily: 'CeraPro-Medium',
    fontSize:   16,
    color:      Colors.white,
  },
  ctaBtn: {
    height:         56,
    borderRadius:   28,
    alignItems:     'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontFamily: 'CeraPro-Medium',
    fontSize:   17,
    color:      Colors.white,
    letterSpacing: 0.3,
  },
});
