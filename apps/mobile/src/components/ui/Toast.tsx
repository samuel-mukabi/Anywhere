/**
 * Toast configuration for react-native-toast-message
 *
 * Usage (show):
 *   Toast.show({ type: 'success', text1: 'Saved!', text2: 'Your trip was saved.' });
 *   Toast.show({ type: 'error',   text1: 'Error',  text2: 'Something went wrong.' });
 *
 * Wrap your root component:
 *   <Toast config={toastConfig} />
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseToast, ErrorToast, ToastConfig } from 'react-native-toast-message';
import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';

function ToastBase({
  text1,
  text2,
  accentColor,
}: {
  text1?: string;
  text2?: string;
  accentColor: string;
}) {
  return (
    <View style={[styles.container, { borderLeftColor: accentColor }]}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.textWrapper}>
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
      </View>
    </View>
  );
}

export const toastConfig: ToastConfig = {
  success: ({ text1, text2 }) => (
    <ToastBase text1={text1} text2={text2} accentColor={Colors.sage} />
  ),
  error: ({ text1, text2 }) => (
    <ToastBase text1={text1} text2={text2} accentColor={Colors.terracotta} />
  ),
  info: ({ text1, text2 }) => (
    <ToastBase text1={text1} text2={text2} accentColor={Colors.ocean} />
  ),
};

const styles = StyleSheet.create({
  container: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   Colors.parchment,
    borderRadius:      radii.md,
    borderLeftWidth:   4,
    marginHorizontal:  spacing.md,
    paddingRight:      spacing.md,
    paddingVertical:   spacing.sm,
    shadowColor:       Colors.nearBlack,
    shadowOffset:      { width: 0, height: 4 },
    shadowOpacity:     0.10,
    shadowRadius:      12,
    elevation:         6,
    minWidth:          '90%',
  },
  accent: {
    width:        4,
    alignSelf:    'stretch',
    borderRadius: radii.sm,
    marginRight:  spacing.md,
  },
  textWrapper: {
    flex: 1,
  },
  title: {
    fontFamily:  'CeraPro-Bold',
    fontSize:    14,
    color:       Colors.text,
  },
  message: {
    fontFamily:  'CeraPro-Regular',
    fontSize:    13,
    color:       Colors.textSecondary,
    marginTop:   2,
  },
});
