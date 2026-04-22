/**
 * Register screen — app/(auth)/register.tsx
 *
 * - react-hook-form + zod validation
 * - Password strength indicator (coloured underline bar)
 * - TanStack Query mutation → POST /auth/register
 * - On success: writes JWT + refresh token to SecureStore, routes to onboarding
 * - On error: inline field-level API errors via setError
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';

import {
  registerSchema,
  RegisterFormData,
  getPasswordStrength,
  getStrengthColor,
  getStrengthLabel,
}                     from '@/lib/authSchemas';
import { authApi }    from '@/lib/apiClient';
import { secureStorage } from '@/lib/secureStorage';
import { useAuthStore, SubscriptionTier } from '@/stores/authStore';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useAppleAuth }  from '@/hooks/useAppleAuth';
import { TextInput }     from '@/components/ui';
import { Colors }        from '@/theme/colors';
import { spacing }       from '@/theme/spacing';

// ─── Password strength bar component ──────────────────────────────────────────
function StrengthBar({ password }: { password: string }) {
  const score = getPasswordStrength(password);
  const color = getStrengthColor(score);
  const label = getStrengthLabel(score);

  if (!password) return null;

  return (
    <View style={barStyles.wrapper}>
      <View style={barStyles.track}>
        {[1, 2, 3, 4].map((seg) => (
          <View
            key={seg}
            style={[
              barStyles.segment,
              { backgroundColor: seg <= score ? color : Colors.grey200 },
            ]}
          />
        ))}
      </View>
      <Text style={[barStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const barStyles = StyleSheet.create({
  wrapper: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track:   { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 3, borderRadius: 2 },
  label:   { fontFamily: 'CeraPro-Medium', fontSize: 11, width: 46, textAlign: 'right' },
});

// ─── Register screen ──────────────────────────────────────────────────────────
export default function RegisterScreen() {
  const insets  = useSafeAreaInsets();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPwd, setShowPwd] = useState(false);
  const [pwdValue, setPwdValue] = useState('');

  const { control, handleSubmit, setError, watch, formState: { errors } } =
    useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const [appleAvailable, setAppleAvailable] = React.useState(false);

  React.useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
  }, []);

  const { signIn: googleSignIn, request: googleRequest } = useGoogleAuth();
  const { signIn: appleSignIn } = useAppleAuth();

  // Watch password for strength bar
  const passwordField = watch('password', '');
  React.useEffect(() => { setPwdValue(passwordField); }, [passwordField]);

  // ─── Register mutation ────────────────────────────────────────────────────
  const registerMutation = useMutation({
    mutationFn: (data: RegisterFormData) => authApi.register(data),
    onSuccess: async ({ data }) => {
      await Promise.all([
        secureStorage.setJwt(data.token),
        secureStorage.setRefreshToken(data.refreshToken),
        secureStorage.setUserId(data.user.id),
        secureStorage.setUserTier(data.user.tier),
      ]);
      setAuth(
        { id: data.user.id, email: data.user.email, name: data.user.name, tier: data.user.tier as SubscriptionTier },
        data.token,
      );
      // After register → onboarding preferences flow
      router.replace('/(auth)/onboarding');
    },
    onError: (err: AxiosError<{ errors?: Record<string, string> }>) => {
      const apiErrors = err?.response?.data?.errors as
        | Record<string, string>
        | undefined;
      if (apiErrors?.email)    setError('email',    { message: apiErrors.email });
      if (apiErrors?.password) setError('password', { message: apiErrors.password });
    },
  });

  const onSubmit = useCallback(
    (data: RegisterFormData) => registerMutation.mutate(data),
    [registerMutation],
  );

  const handleGoogleSignIn = useCallback(async () => {
    try {
      await googleSignIn();
      router.replace('/(tabs)/explore');
    } catch (e) {
      console.error('[Register] Google auth failed:', e);
    }
  }, [googleSignIn]);

  const handleAppleSignIn = useCallback(async () => {
    try {
      await appleSignIn();
      router.replace('/(tabs)/explore');
    } catch (e) {
      console.error('[Register] Apple auth failed:', e);
    }
  }, [appleSignIn]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Wordmark */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>Anywhere.</Text>
          <Text style={styles.subtitle}>Create your free account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value, onBlur } }) => (
              <TextInput
                label="Full Name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="words"
                autoComplete="name"
                placeholder="Samuel Mukabi"
                error={errors.name?.message}
                testID="input-name"
              />
            )}
          />

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
                autoComplete="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                testID="input-email"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value, onBlur } }) => (
              <View>
                <TextInput
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPwd}
                  placeholder="Min. 8 characters"
                  error={errors.password?.message}
                  testID="input-password"
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPwd((s) => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name={showPwd ? 'eye-off' : 'eye'} size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  }
                />
                <StrengthBar password={pwdValue} />
              </View>
            )}
          />

          {/* CTA */}
          <TouchableOpacity
            style={[styles.primaryBtn, registerMutation.isPending && styles.primaryBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={registerMutation.isPending}
            activeOpacity={0.85}
          >
            {registerMutation.isPending ? (
              <ActivityIndicator color={Colors.parchment} />
            ) : (
              <Text style={styles.primaryBtnLabel}>Create account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or register with</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social buttons */}
        <View style={styles.socialRow}>
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={handleGoogleSignIn}
            disabled={!googleRequest}
          >
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialLabel}>Google</Text>
          </TouchableOpacity>

          {appleAvailable && Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialBtn, styles.appleSocialBtn]}
              onPress={handleAppleSignIn}
            >
              <Feather name="command" size={16} color={Colors.parchment} />
              <Text style={[styles.socialLabel, { color: Colors.parchment }]}>Apple</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.footerLink}>
              Already have an account?{' '}
              <Text style={styles.footerLinkAccent}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.parchment },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },

  header:   { marginBottom: spacing.xxl },
  wordmark: { fontFamily: 'Astoria', fontSize: 44, color: Colors.nearBlack, textAlign: 'center' },
  subtitle: { fontFamily: 'CeraPro-Regular', fontSize: 15, color: Colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },

  form: { gap: spacing.sm },

  primaryBtn: {
    height:          54,
    backgroundColor: Colors.terracotta,
    borderRadius:    12,
    alignItems:      'center',
    justifyContent:  'center',
    marginTop:       spacing.lg,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnLabel: {
    fontFamily:    'CeraPro-Medium',
    fontSize:      17,
    color:         Colors.white,
    letterSpacing: 0.2,
  },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xl },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontFamily: 'CeraPro-Regular', fontSize: 13, color: Colors.textSecondary },

  socialRow: { flexDirection: 'row', gap: spacing.sm },
  socialBtn: {
    flex:            1,
    height:          48,
    borderRadius:    10,
    borderWidth:     1.5,
    borderColor:     Colors.border,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.xs,
    backgroundColor: Colors.white,
  },
  appleSocialBtn: { backgroundColor: Colors.nearBlack, borderColor: Colors.nearBlack },
  socialIcon:  { fontFamily: 'CeraPro-Medium', fontSize: 16, color: Colors.nearBlack },
  socialLabel: { fontFamily: 'CeraPro-Medium', fontSize: 15, color: Colors.nearBlack },

  footer:           { marginTop: spacing.xxl, alignItems: 'center' },
  footerLink:       { fontFamily: 'CeraPro-Regular', fontSize: 14, color: Colors.textSecondary },
  footerLinkAccent: { fontFamily: 'CeraPro-Medium', color: Colors.terracotta },
});
