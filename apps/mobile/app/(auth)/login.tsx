/**
 * Login screen — app/(auth)/login.tsx
 *
 * - react-hook-form + zod validation
 * - Show/hide password toggle
 * - Google + Apple OAuth buttons
 * - Forgot password link
 * - TanStack Query mutation → POST /auth/login
 * - On success: writes JWT + refresh token to SecureStore, updates authStore
 * - On error: inline field-level errors from API response
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
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';

import { loginSchema, LoginFormData } from '@/lib/authSchemas';
import { authApi }                     from '@/lib/apiClient';
import { secureStorage }               from '@/lib/secureStorage';
import { useAuthStore }                from '@/stores/authStore';
import { useGoogleAuth }               from '@/hooks/useGoogleAuth';
import { useAppleAuth }                from '@/hooks/useAppleAuth';
import { TextInput }                   from '@/components/ui';
import { Colors }                      from '@/theme/colors';
import { spacing }                     from '@/theme/spacing';

export default function LoginScreen() {
  const insets    = useSafeAreaInsets();
  const setAuth   = useAuthStore((s) => s.setAuth);
  const [showPwd, setShowPwd] = useState(false);
  const [appleAvailable, setAppleAvailable] = React.useState(false);

  // Check Apple availability on mount
  React.useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
  }, []);

  const { control, handleSubmit, setError, formState: { errors } } =
    useForm<LoginFormData>({ resolver: zodResolver(loginSchema as any) });

  const { signIn: googleSignIn, request: googleRequest } = useGoogleAuth();
  const { signIn: appleSignIn } = useAppleAuth();

  // ─── Login mutation ─────────────────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: (data: LoginFormData) => authApi.login(data),
    onSuccess: async ({ data }) => {
      await Promise.all([
        secureStorage.setJwt(data.token),
        secureStorage.setRefreshToken(data.refreshToken),
        secureStorage.setUserId(data.user.id),
        secureStorage.setUserTier(data.user.tier),
      ]);
      setAuth(
        { id: data.user.id, name: data.user.name, email: data.user.email },
        data.token,
        data.user.tier as any,
      );
      router.replace('/(tabs)/explore');
    },
    onError: (err: any) => {
      const apiErrors = err?.response?.data?.errors as
        | Record<string, string>
        | undefined;
      if (apiErrors?.email)    setError('email',    { message: apiErrors.email });
      if (apiErrors?.password) setError('password', { message: apiErrors.password });
    },
  });

  const onSubmit = useCallback(
    (data: LoginFormData) => loginMutation.mutate(data),
    [loginMutation],
  );

  const handleGoogleSignIn = useCallback(async () => {
    try {
      await googleSignIn();
      router.replace('/(tabs)/explore');
    } catch (e) {
      console.error('[Login] Google auth failed:', e);
    }
  }, [googleSignIn]);

  const handleAppleSignIn = useCallback(async () => {
    try {
      await appleSignIn();
      router.replace('/(tabs)/explore');
    } catch (e) {
      console.error('[Login] Apple auth failed:', e);
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
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>
        </View>

        {/* Form */}
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
                autoComplete="email"
                placeholder="you@example.com"
                error={errors.email?.message}
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
                  placeholder="• • • • • • • •"
                  error={errors.password?.message}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPwd((s) => !s)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name={showPwd ? 'eye-off' : 'eye'} size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  }
                />
                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => router.push('/(auth)/forgot-password')}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
            )}
          />

          {/* Sign In button */}
          <TouchableOpacity
            style={[styles.primaryBtn, loginMutation.isPending && styles.primaryBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={loginMutation.isPending}
            activeOpacity={0.85}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color={Colors.parchment} />
            ) : (
              <Text style={styles.primaryBtnLabel}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
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
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}>
              Don't have an account?{' '}
              <Text style={styles.footerLinkAccent}>Sign up</Text>
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

  form:       { gap: spacing.sm },
  forgotLink: { alignSelf: 'flex-end', marginTop: spacing.xs },
  forgotText: { fontFamily: 'CeraPro-Medium', fontSize: 13, color: Colors.terracotta },

  primaryBtn: {
    height:         54,
    backgroundColor: Colors.nearBlack,
    borderRadius:    12,
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      spacing.md,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnLabel: {
    fontFamily:    'CeraPro-Medium',
    fontSize:      17,
    color:         Colors.parchment,
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

  footer:          { marginTop: spacing.xxl, alignItems: 'center' },
  footerLink:      { fontFamily: 'CeraPro-Regular', fontSize: 14, color: Colors.textSecondary },
  footerLinkAccent:{ fontFamily: 'CeraPro-Medium', color: Colors.terracotta },
});
