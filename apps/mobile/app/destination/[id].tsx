import React, { useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Rect, Circle, G, Text as SvgText, Path } from 'react-native-svg';
import { Image } from 'expo-image';
import Toast from 'react-native-toast-message';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useSearchStore } from '@/stores/searchStore';
import { useTripsStore } from '@/stores/tripsStore';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 380;

export default function DestinationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  
  const results = useSearchStore((s) => s.results);
  const saveTrip = useTripsStore((s) => s.saveTrip);
  
  const destination = useMemo(() => results.find((r) => r.id === id) || null, [id, results]);

  const scrollY = useRef(new Animated.Value(0)).current;

  // Render Loader if somehow lost context
  if (!destination) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
      </View>
    );
  }

  // --- Parallax Calculations ---
  const imageTranslateY = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0, HERO_HEIGHT],
    outputRange: [-HERO_HEIGHT * 0.4, 0, HERO_HEIGHT * 0.4],
    extrapolate: 'clamp',
  });

  // --- Mocks if API empty ---
  const flightCost = destination.flightPrice || 0;
  const totalCost = destination.totalCost || 0; 
  const estHotel = Math.floor((totalCost - flightCost) * 0.75);
  const estFood = Math.floor((totalCost - flightCost) * 0.25);
  const isPro = destination.isPro || false;

  const mockWhyItFits = destination.whyItFits || ['Perfect weather', 'Great exchange rate', 'Safe area', 'Iconic beaches'];
  const mockClimate = destination.climateData || [
    { month: 'J', temp: 24, sunshine: 8, precip: 20 },
    { month: 'F', temp: 25, sunshine: 9, precip: 15 },
    { month: 'M', temp: 28, sunshine: 10, precip: 10 },
    { month: 'A', temp: 32, sunshine: 11, precip: 5 },
    { month: 'M', temp: 35, sunshine: 12, precip: 0 },
    { month: 'J', temp: 38, sunshine: 13, precip: 0 },
  ];

  const safetyScoreNum = destination.safetyScore || 85;
  const safetyColor = safetyScoreNum > 70 ? Colors.sage : (safetyScoreNum > 40 ? Colors.warning : Colors.terracotta);

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
      {/* ─── Parallax Animated Scroll ─── */}
      <Animated.ScrollView
        style={styles.scrollRoot}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* HERO IMAGE CONTAINER */}
        <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateY: imageTranslateY }] }]}>
            <Image 
              source={{ uri: destination.imageUrl || 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05' }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              placeholder={destination.blurhash || 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH'}
              transition={300}
              cachePolicy="memory-disk"
            />
          </Animated.View>
          
          <LinearGradient
            colors={['transparent', 'rgba(13,30,39,0.85)']}
            style={styles.heroGradient}
          />
          
          <TouchableOpacity style={[styles.backBtn, { top: insets.top + spacing.sm }]} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.shareBtn, { top: insets.top + spacing.sm }]} onPress={() => {}}>
            <Feather name="share" size={24} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.heroTextWrapper}>
            <Text style={styles.heroTitle}>{destination.city}</Text>
            <Text style={styles.heroSubtitle}>📍 {destination.country}</Text>
          </View>
        </View>

        {/* PRICE SUMMARY STRIP */}
        <View style={styles.priceStrip}>
          <Text style={styles.priceStripTotal}>${totalCost}</Text>
          <View style={styles.priceStripBreakRow}>
            <Text style={styles.priceStripSub}>✈️ ${flightCost}</Text>
            <View style={styles.priceStripDivider} />
            <Text style={styles.priceStripSub}>🏨 ${estHotel}</Text>
            <View style={styles.priceStripDivider} />
            <Text style={styles.priceStripSub}>🍽 ${estFood}</Text>
          </View>
        </View>

        <View style={styles.contentBody}>
          {/* WHY IT FITS ROW */}
          <Text style={styles.sectionTitle}>Why it fits</Text>
          <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.whyFitsScroll} contentContainerStyle={styles.whyFitsContainer}>
            {mockWhyItFits.map((item, idx) => (
              <View key={idx} style={styles.whyFitPill}>
                <Text style={styles.whyFitText}>{item}</Text>
              </View>
            ))}
          </Animated.ScrollView>

          {/* COST BREAKDOWN TABLE (PRO GATED) */}
          <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Cost breakdown</Text>
          <View style={styles.costTable}>
            <View style={styles.costRow}><Text style={styles.costLabel}>Flight</Text><Text style={styles.costVal}>${flightCost}</Text></View>
            
            {/* Blurry Matrix */}
            <View style={styles.proMaskContainer}>
              <View style={styles.costRow}><Text style={styles.costLabel}>Hotel per night</Text><Text style={styles.costVal}>${Math.floor(estHotel / 7)}</Text></View>
              <View style={styles.costRow}><Text style={styles.costLabel}>Food per day</Text><Text style={styles.costVal}>${Math.floor(estFood / 7)}</Text></View>
              <View style={styles.costRow}><Text style={styles.costLabel}>Transport</Text><Text style={styles.costVal}>$25</Text></View>
              
              {!isPro && (
                <View style={StyleSheet.absoluteFillObject}>
                  <BlurView intensity={80} style={StyleSheet.absoluteFillObject} tint="light" />
                  <LinearGradient colors={['rgba(238,235,217,0.4)', 'rgba(238,235,217,0.9)']} style={styles.proGradientMask}>
                    <Feather name="lock" size={24} color={Colors.terracotta} style={{ marginBottom: spacing.sm }} />
                    <Text style={styles.proUpgradeTitle}>Upgrade to Pro</Text>
                    <Text style={styles.proUpgradeSub}>Unlock absolute granular cost matrices</Text>
                  </LinearGradient>
                </View>
              )}
            </View>
          </View>

          {/* CLIMATE & SAFETY ROW (SVG METRICS) */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricCardTitle}>Climate (Est)</Text>
              <Svg width="120" height="90" viewBox="0 0 120 90">
                {mockClimate.map((c, i) => {
                  const h = (c.temp / 40) * 80; // Max 40C
                  return (
                    <G key={i}>
                      <Rect x={i * 20} y={80 - h} width="12" height={h} fill={Colors.terracotta} rx={3} opacity={0.8} />
                      <SvgText x={i * 20 + 6} y="90" fontSize="8" fill={Colors.textSecondary} textAnchor="middle">{c.month}</SvgText>
                    </G>
                  );
                })}
              </Svg>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricCardTitle}>Safety Index</Text>
              <View style={styles.safetyAlign}>
                <Svg width="90" height="90" viewBox="0 0 100 100">
                  <Circle cx="50" cy="50" r="40" stroke={Colors.border} strokeWidth="12" fill="none" />
                  <Circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    stroke={safetyColor} 
                    strokeWidth="12" 
                    fill="none" 
                    strokeDasharray={`${(safetyScoreNum / 100) * 251.2} 251.2`} 
                    strokeLinecap="round" 
                    rotation="-90" 
                    origin="50, 50" 
                  />
                  <SvgText x="50" y="55" fontSize="20" fontWeight="bold" fill={Colors.nearBlack} textAnchor="middle">
                    {safetyScoreNum}
                  </SvgText>
                </Svg>
              </View>
            </View>
          </View>

        </View>
      </Animated.ScrollView>

      {/* ─── STICKY CTA BOTTOM DOCK ─── */}
      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
         <TouchableOpacity 
           style={styles.bookBtn} 
           activeOpacity={0.85}
           onPress={() => router.push({ pathname: '/booking/confirm', params: { destId: id, city: destination.city, totalCost: String(destination.totalCost) } })}
         >
            <Text style={styles.bookBtnText}>Book this trip →</Text>
         </TouchableOpacity>
         <TouchableOpacity style={styles.saveDockBtn} onPress={handleSave} activeOpacity={0.7}>
            <Text style={styles.saveDockBtnText}>Save destination</Text>
         </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scrollRoot: { flex: 1 },
  heroContainer: { width: '100%', position: 'relative', overflow: 'hidden' },
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 },
  backBtn: {
    position: 'absolute', left: spacing.md, width: 44, height: 44,
    borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center'
  },
  shareBtn: {
    position: 'absolute', right: spacing.md, width: 44, height: 44,
    borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center'
  },
  heroTextWrapper: { position: 'absolute', bottom: spacing.lg, left: spacing.xl, right: spacing.xl },
  heroTitle: { fontFamily: 'Astoria', fontSize: 36, color: Colors.white, marginBottom: 4 },
  heroSubtitle: { fontFamily: 'CeraPro-Medium', fontSize: 15, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' },

  priceStrip: { backgroundColor: '#282427', paddingVertical: spacing.md, paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceStripTotal: { fontFamily: 'Astoria', fontSize: 28, color: Colors.white },
  priceStripBreakRow: { flexDirection: 'row', alignItems: 'center' },
  priceStripSub: { fontFamily: 'CeraPro-Medium', fontSize: 12, color: Colors.surface },
  priceStripDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },

  contentBody: { padding: spacing.xl },
  sectionTitle: { fontFamily: 'Astoria', fontSize: 24, color: Colors.nearBlack, marginBottom: spacing.md },
  
  whyFitsScroll: { marginHorizontal: -spacing.xl },
  whyFitsContainer: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  whyFitPill: { paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: Colors.sage, borderRadius: 20 },
  whyFitText: { fontFamily: 'CeraPro-Bold', fontSize: 13, color: Colors.white },

  costTable: { backgroundColor: Colors.parchment, borderRadius: 16, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: Colors.border },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  costLabel: { fontFamily: 'CeraPro-Regular', fontSize: 15, color: Colors.textSecondary },
  costVal: { fontFamily: 'CeraPro-Bold', fontSize: 15, color: Colors.nearBlack },
  proMaskContainer: { position: 'relative', overflow: 'hidden' },
  proGradientMask: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  proUpgradeTitle: { fontFamily: 'CeraPro-Bold', fontSize: 15, color: Colors.nearBlack },
  proUpgradeSub: { fontFamily: 'CeraPro-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 4 },

  metricsGrid: { flexDirection: 'row', marginTop: spacing.xxl, gap: spacing.md },
  metricCard: { flex: 1, backgroundColor: Colors.parchment, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  metricCardTitle: { fontFamily: 'CeraPro-Medium', fontSize: 13, color: Colors.textSecondary, marginBottom: spacing.lg, alignSelf: 'flex-start' },
  safetyAlign: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  bottomDock: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.parchment, borderTopWidth: 1, borderTopColor: Colors.border, padding: spacing.xl, paddingBottom: 0 },
  bookBtn: { height: 56, backgroundColor: Colors.terracotta, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  bookBtnText: { fontFamily: 'CeraPro-Medium', fontSize: 16, color: Colors.white },
  saveDockBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
  saveDockBtnText: { fontFamily: 'CeraPro-Bold', fontSize: 15, color: Colors.nearBlack },
});
