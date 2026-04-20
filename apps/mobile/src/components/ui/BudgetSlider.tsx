import React, { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

interface BudgetSliderProps {
  min:         number;
  max:         number;
  value:       number;
  onChange:    (value: number) => void;
  currency?:   string;
  label?:      string;
  step?:       number;
}

export function BudgetSlider({
  min,
  max,
  value,
  onChange,
  currency = '$',
  label    = 'Budget',
  step     = 50,
}: BudgetSliderProps) {
  const animatedValue = useRef(new Animated.Value(value)).current;
  const displayValue  = useRef(value);

  const handleValueChange = useCallback(
    (v: number) => {
      const rounded = Math.round(v / step) * step;
      displayValue.current = rounded;
      Animated.timing(animatedValue, {
        toValue:         rounded,
        duration:        60,
        useNativeDriver: false,
      }).start();
      onChange(rounded);
    },
    [animatedValue, onChange, step],
  );

  // Format current value with currency symbols and thousands separators
  const formattedLabel = `${currency}${value.toLocaleString()}`;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.valueLabel}>{formattedLabel}</Text>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        value={value}
        step={step}
        onValueChange={handleValueChange}
        minimumTrackTintColor={Colors.terracotta}
        maximumTrackTintColor={Colors.grey200}
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
    width:           '100%',
    paddingVertical:  spacing.sm,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   spacing.xs,
  },
  label: {
    fontFamily:    'CeraPro-Medium',
    fontSize:      12,
    color:         Colors.text,
    letterSpacing:  0.4,
    textTransform: 'uppercase',
  },
  valueLabel: {
    fontFamily: 'Astoria',
    fontSize:   22,
    color:      Colors.terracotta,
  },
  slider: {
    width:  '100%',
    height:  40,
  },
  rangeRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginTop:      spacing.xs,
  },
  rangeLabel: {
    fontFamily: 'CeraPro-Regular',
    fontSize:   11,
    color:      Colors.textSecondary,
  },
});
