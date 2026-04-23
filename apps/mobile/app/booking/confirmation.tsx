import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import { Colors } from '@/core/theme/colors';
import { spacing } from '@/core/theme/spacing';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function BookingConfirmationScreen() {
  const { orderId, city } = useLocalSearchParams<{ orderId: string, city: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pathAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(pathAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handleReturn = () => {
    router.replace('/(tabs)/trips');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        <Animated.View style={[styles.checkContainer, { transform: [{ scale: scaleAnim }] }]}>
           <Svg width="120" height="120" viewBox="0 0 120 120">
             <Circle cx="60" cy="60" r="54" fill="rgba(74,140,92,0.15)" stroke={Colors.sage} strokeWidth="4" />
             {/* Note: In a real setup, strokeDasharray/offset animates drawing the line smoothly, here we mock it by animating opacity or just scaling */}
             <AnimatedPath
                d="M 38 60 L 52 74 L 82 46"
                fill="none"
                stroke={Colors.sage}
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={pathAnim}
             />
           </Svg>
        </Animated.View>

        <Text style={styles.title}>You're going to {city}!</Text>
        <Text style={styles.subtitle}>Your trip has been successfully processed.</Text>

        <View style={styles.receiptCard}>
          <Text style={styles.receiptLabel}>BOOKING REFERENCE</Text>
          <Text style={styles.receiptOrderId}>{orderId}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.receiptLabel}>TRAVEL DATES</Text>
          <Text style={styles.receiptSub}>Coming soon (See Itinerary array)</Text>
        </View>
      </View>

      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
         <TouchableOpacity style={styles.tripsBtn} onPress={handleReturn} activeOpacity={0.8}>
            <Text style={styles.tripsBtnText}>View in Trips</Text>
         </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1C2B36' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  
  checkContainer: { marginBottom: spacing.xxl },
  title: { fontFamily: 'Astoria', fontSize: 32, color: Colors.white, marginBottom: spacing.md, textAlign: 'center' },
  subtitle: { fontFamily: 'CeraPro-Regular', fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 40 },

  receiptCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: spacing.xl, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  receiptLabel: { fontFamily: 'CeraPro-Bold', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, marginBottom: 8 },
  receiptOrderId: { fontFamily: 'Astoria', fontSize: 24, color: Colors.white },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: spacing.lg },
  receiptSub: { fontFamily: 'CeraPro-Medium', fontSize: 16, color: Colors.white },

  bottomDock: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.xl },
  tripsBtn: { height: 56, backgroundColor: Colors.terracotta, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tripsBtnText: { fontFamily: 'CeraPro-Bold', fontSize: 16, color: Colors.white },
});
