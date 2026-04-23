import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors } from '@/core/theme/colors';
import { spacing } from '@/core/theme/spacing';

interface BudgetSliderProps {
  min:         number;
  max:         number;
  value:       number;
  onChange:    (value: number) => void;
  currency?:   string;
  step?:       number;
  testID?:     string;
}

export function BudgetSlider({
  min,
  max,
  value,
  onChange,
  currency = '$',
  step     = 100,
  testID   = 'budget-slider',
}: BudgetSliderProps) {
  // Use state to track current sliding value synchronously for the text label interpolation.
  const [currentValue, setCurrentValue] = useState(value);
  const animatedValue = useRef(new Animated.Value(value)).current;

  // React to prop changes from external (e.g. Surprise Me randomizer)
  useEffect(() => {
    setCurrentValue(value);
    animatedValue.setValue(value);
  }, [value, animatedValue]);

  // Handle slide end commit to the state store
  const handleSlidingComplete = (v: number) => {
    const rounded = Math.round(v / step) * step;
    onChange(rounded);
  };

  // Immediate visual feedback while dragging
  const handleValueChange = (v: number) => {
    const rounded = Math.round(v / step) * step;
    setCurrentValue(rounded);
    
    // Smooth JS animation bump (useNativeDriver cannot animate text layout intrinsically in pure RN without heavy re-render hacks, 
    // so we utilize state interpolation locally, but you can leverage the Animated.Value if wrapping custom elements).
    Animated.timing(animatedValue, {
      toValue: rounded,
      duration: 30,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.label}>TOTAL BUDGET PER PERSON</Text>
        <Text style={styles.valueLabel}>
          {currency}{currentValue.toLocaleString()}
        </Text>
      </View>

      <Slider
        testID={testID}
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        value={value}
        step={step}
        onValueChange={handleValueChange}
        onSlidingComplete={handleSlidingComplete}
        minimumTrackTintColor={Colors.nearBlack}
        maximumTrackTintColor={Colors.border}
        thumbTintColor={Colors.terracotta}
      />

      <View style={styles.rangeRow}>
        <Text style={styles.rangeLabel}>{currency}{min.toLocaleString()}</Text>
        <Text style={styles.rangeLabel}>{currency}{max.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingVertical: spacing.sm,
  },
  header: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  label: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  valueLabel: {
    fontFamily: 'Astoria',
    fontSize: 32,
    color: Colors.nearBlack,
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: spacing.md,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  rangeLabel: {
    fontFamily: 'CeraPro-Regular',
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
