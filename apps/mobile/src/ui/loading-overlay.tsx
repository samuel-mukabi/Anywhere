/**
 * LoadingOverlay — src/components/LoadingOverlay.tsx
 *
 * Semi-transparent parchment overlay with an Animated spinning
 * terracotta ring. Covers the full screen — used during auth
 * hydration checks and initial data loads.
 *
 * Usage:
 *   <LoadingOverlay visible={!hydrated} />
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  Easing,
} from 'react-native';
import { Colors } from '@/core/theme/colors';
import { spacing } from '@/core/theme/spacing';

const { width, height } = Dimensions.get('window');

const RING_SIZE = 48;
const RING_THICKNESS = 3;

interface LoadingOverlayProps {
  visible: boolean;
}

export function LoadingOverlay({ visible }: LoadingOverlayProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const opacity  = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const scale    = useRef(new Animated.Value(0.95)).current;

  // Continuous spin for indicator
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(rotation, {
        toValue:         1,
        duration:        1200,
        easing:          Easing.linear,
        useNativeDriver: true,
      }),
    );
    spin.start();
    return () => spin.stop();
  }, [rotation]);

  // Entrance / Exit transitions
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue:         1,
          duration:        400,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue:         1,
          duration:        800,
          easing:          Easing.out(Easing.back(1)),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.timing(opacity, {
        toValue:         0,
        duration:        300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, opacity, scale]);

  const spin = rotation.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="auto">
      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        {/* Wordmark logo */}
        <Text style={styles.logoText}>Anywhere.</Text>
        
        {/* Subtle loading ring */}
        <View style={styles.indicatorContainer}>
          <Animated.View
            style={[
              styles.ring,
              { transform: [{ rotate: spin }] },
            ]}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position:        'absolute',
    top:             0,
    left:            0,
    width,
    height,
    backgroundColor: Colors.parchment, // Solid background for splash feel
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          9999,
  },
  content: {
    alignItems: 'center',
    gap:        spacing.xl,
  },
  logoText: {
    fontFamily:  'Astoria',
    fontSize:    52,
    color:       Colors.nearBlack,
    letterSpacing: -0.5,
  },
  indicatorContainer: {
    height: 40,
    justifyContent: 'center',
  },
  ring: {
    width:        24,
    height:       24,
    borderRadius: 12,
    borderWidth:  2,
    borderTopColor:    Colors.terracotta,
    borderRightColor:  'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor:   'transparent',
  },
});
