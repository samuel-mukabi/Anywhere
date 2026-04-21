/**
 * Forgot Password screen — app/(auth)/forgot-password.tsx
 *
 * Sends POST /auth/forgot-password and shows a success state.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useForm, Controller, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { forgotPasswordSchema, ForgotPasswordFormData } from '@/lib/authSchemas';
import { authApi }   from '@/lib/apiClient';
import { TextInput } from '@/components/ui';
import { Colors }    from '@/theme/colors';
import { spacing }   from '@/theme/spacing';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, formState: { errors } } =
    useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) });

  const mutation = useMutation({
    mutationFn: (data: ForgotPasswordFormData) => authApi.forgotPassword(data.email),
    onSuccess:  () => setSent(true),
  });

  const onSubmit = useCallback(
    (data: ForgotPasswordFormData) => mutation.mutate(data),
    [mutation],
  );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.nearBlack} />
        </TouchableOpacity>

        <View style={styles.content}>
          {sent ? (
            /* ─── Success state ───────────────────────────────────────── */
            <View style={styles.successBox}>
              <Text style={styles.successEmoji}>📬</Text>
              <Text style={styles.successTitle}>Check your inbox</Text>
              <Text style={styles.successBody}>
                We've sent a password reset link. Check your spam folder if you don't see it within a minute.
              </Text>
              <TouchableOpacity
                style={styles.backToLogin}
                onPress={() => router.replace('/(auth)/login')}
              >
                <Text style={styles.backToLoginLabel}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ─── Form ────────────────────────────────────────────────── */
            <>
              <Text style={styles.title}>Reset password</Text>
              <Text style={styles.subtitle}>
                Enter your email and we'll send you a reset link.
              </Text>

              <View style={styles.form}>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, value, onBlur } }) => (
                    <TextInput
                      label="Email"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="you@example.com"
                      error={errors.email?.message}
                    />
                  )}
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, mutation.isPending && styles.primaryBtnDisabled]}
                  onPress={handleSubmit(onSubmit)}
                  disabled={mutation.isPending}
                  activeOpacity={0.85}
                >
                  {mutation.isPending ? (
                    <ActivityIndicator color={Colors.parchment} />
                  ) : (
                    <Text style={styles.primaryBtnLabel}>Send reset link</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.parchment },
  scroll:  { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  backBtn: { padding: spacing.xs, marginBottom: spacing.xl, alignSelf: 'flex-start' },
  content: { flex: 1 },

  title:    { fontFamily: 'Astoria',         fontSize: 34, color: Colors.nearBlack, marginBottom: spacing.sm },
  subtitle: { fontFamily: 'CeraPro-Regular', fontSize: 15, color: Colors.textSecondary, marginBottom: spacing.xl, lineHeight: 22 },

  form: { gap: spacing.sm },

  primaryBtn: {
    height:          54,
    backgroundColor: Colors.nearBlack,
    borderRadius:    12,
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       spacing.md,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnLabel: {
    fontFamily:    'CeraPro-Medium',
    fontSize:      17,
    color:         Colors.parchment,
    letterSpacing: 0.2,
  },

  successBox: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.lg },
  successEmoji: { fontSize: 48 },
  successTitle: { fontFamily: 'Astoria', fontSize: 30, color: Colors.nearBlack, textAlign: 'center' },
  successBody:  {
    fontFamily: 'CeraPro-Regular',
    fontSize:   15,
    color:      Colors.textSecondary,
    textAlign:  'center',
    lineHeight: 23,
    maxWidth:   280,
  },
  backToLogin:  {
    marginTop:  spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: 10,
    borderWidth:  1.5,
    borderColor:  Colors.border,
  },
  backToLoginLabel: { fontFamily: 'CeraPro-Medium', fontSize: 15, color: Colors.nearBlack },
});
