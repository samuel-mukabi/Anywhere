/**
 * Destination detail — app/destination/[id].tsx
 * Full-screen modal pushed from Explore when a card/pin is tapped.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { Button, Card, Skeleton } from '@/components/ui';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';

export default function DestinationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cityName = String(id).charAt(0).toUpperCase() + String(id).slice(1);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Hero image placeholder */}
      <View style={styles.hero}>
        <Skeleton width="100%" height="100%" style={styles.heroSkeleton} />
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Feather name="x" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* City header */}
        <Text style={styles.city}>{cityName}</Text>
        <View style={styles.tagRow}>
          <Feather name="map-pin" size={13} color={Colors.textSecondary} />
          <Text style={styles.country}>Portugal · Southern Europe</Text>
        </View>

        {/* Score chips */}
        <View style={styles.chips}>
          {[['🌤', 'Climate', '8.4'], ['💰', 'Cost', '7.1'], ['🛡', 'Safety', '9.0']].map(([emoji, label, score]) => (
            <View key={label} style={styles.chip}>
              <Text style={styles.chipEmoji}>{emoji}</Text>
              <Text style={styles.chipLabel}>{label}</Text>
              <Text style={styles.chipScore}>{score}</Text>
            </View>
          ))}
        </View>

        {/* Flight estimate */}
        <Card style={styles.flightCard}>
          <Text style={styles.sectionLabel}>Estimated Flights</Text>
          <Text style={styles.flightPrice}>From $620 return</Text>
          <Text style={styles.flightSub}>Based on your travel window · Economy</Text>
        </Card>

        {/* CTA */}
        <Button
          label="Save to Trips"
          variant="terracotta"
          size="lg"
          fullWidth
          onPress={() => router.back()}
          style={styles.cta}
        />
        <Button
          label="View on Map"
          variant="ghost"
          size="lg"
          fullWidth
          onPress={() => {}}
          style={styles.ctaGhost}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.parchment },
  hero:         { height: 280, backgroundColor: Colors.grey200, position: 'relative' },
  heroSkeleton: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  closeBtn:     { position: 'absolute', top: 52, right: spacing.xl, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  content:      { flex: 1 },
  contentInner: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 60 },
  city:         { fontFamily: 'Astoria', fontSize: 34, color: Colors.nearBlack },
  tagRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs, marginBottom: spacing.lg },
  country:      { fontFamily: 'CeraPro-Regular', fontSize: 13, color: Colors.textSecondary },
  chips:        { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chip:         { flex: 1, alignItems: 'center', backgroundColor: Colors.grey100, borderRadius: radii.md, paddingVertical: spacing.sm },
  chipEmoji:    { fontSize: 18, marginBottom: 2 },
  chipLabel:    { fontFamily: 'CeraPro-Regular', fontSize: 11, color: Colors.textSecondary },
  chipScore:    { fontFamily: 'CeraPro-Bold', fontSize: 16, color: Colors.nearBlack },
  flightCard:   { marginBottom: spacing.xl },
  sectionLabel: { fontFamily: 'CeraPro-Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.xs },
  flightPrice:  { fontFamily: 'Astoria', fontSize: 24, color: Colors.nearBlack },
  flightSub:    { fontFamily: 'CeraPro-Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  cta:          { marginBottom: spacing.sm },
  ctaGhost:     {},
});
