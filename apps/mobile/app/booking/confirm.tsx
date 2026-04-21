import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { z } from 'zod';
import { useForm, Controller, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const passengerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  passportNumber: z.string().min(6, 'Passport must be at least 6 characters'),
});
type PassengerForm = z.infer<typeof passengerSchema>;

export default function BookingConfirmScreen() {
  const { destId, city, totalCost } = useLocalSearchParams<{ destId: string, city: string, totalCost: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [timer, setTimer] = useState(900); // 15 mins
  const [priceChanged, setPriceChanged] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);

  const { control, handleSubmit, formState: { errors, isValid } } = useForm<PassengerForm>({
    resolver: zodResolver(passengerSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    // Mock POST /booking/confirm-price
    setPriceChanged(Math.random() > 0.8);

    const int = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(int);
  }, []);

  const formatTimer = (t: number) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCheckout = async (data: PassengerForm) => {
    setLoadingPayment(true);
    // Mock POST /booking/create-order -> obtaining clientSecret
    await new Promise(res => setTimeout(res, 1000));
    
    // In strict environments, we initialize standard Payment sheets
    const { error: initError } = await initPaymentSheet({
      merchantDisplayName: 'Anywhere Travel',
      paymentIntentClientSecret: 'mock_secret_intention_123', // Will throw soft warnings natively due to mock
      allowsDelayedPaymentMethods: true,
      defaultBillingDetails: {
        name: `${data.firstName} ${data.lastName}`,
      }
    });

    if (initError && initError.code !== 'Failed') {
      console.warn("Stripe Init Mock Warning:", initError);
    }

    // Since it's a mock, presentPaymentSheet will immediately return Failed in development without legit test secrets.
    // We will simulate a successful intent.
    try {
       // const { error } = await presentPaymentSheet();
       setTimeout(() => {
         setLoadingPayment(false);
         router.replace({ pathname: '/booking/confirmation', params: { orderId: 'ORD-DF-7729', city } });
       }, 1500);
    } catch {
       setLoadingPayment(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, spacing.md), paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color={Colors.nearBlack} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review & Pay</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.priceLabel}>TOTAL TRIP COST</Text>
          <Text style={styles.priceTotal}>${totalCost}</Text>
          <Text style={styles.destName}>{city}</Text>

          {priceChanged && (
            <View style={styles.warnBadge}>
              <Feather name="alert-circle" size={14} color={Colors.white} />
              <Text style={styles.warnBadgeText}>Price updated securely dynamically</Text>
            </View>
          )}

          <View style={styles.timerRow}>
            <Feather name="clock" size={16} color={Colors.terracotta} />
            <Text style={styles.timerText}>Price locked for {formatTimer(timer)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>PASSENGER DETAILS</Text>
        <View style={styles.formCard}>
          
          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value} placeholder="e.g. John" />
                {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="lastName"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value} placeholder="e.g. Doe" />
                {errors.lastName && <Text style={styles.errorText}>{errors.lastName.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="dob"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <TextInput style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value} placeholder="YYYY-MM-DD" />
                {errors.dob && <Text style={styles.errorText}>{errors.dob.message}</Text>}
              </View>
            )}
          />

          <Controller
            control={control}
            name="passportNumber"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[styles.inputWrap, { borderBottomWidth: 0 }]}>
                <Text style={styles.inputLabel}>Passport Number</Text>
                <TextInput style={styles.input} onBlur={onBlur} onChangeText={onChange} value={value} placeholder="Document ID" autoCapitalize="characters" />
                {errors.passportNumber && <Text style={styles.errorText}>{errors.passportNumber.message}</Text>}
              </View>
            )}
          />

        </View>

      </ScrollView>

      {/* STICKY BOTTOM */}
      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
         <TouchableOpacity 
           style={[styles.checkoutBtn, (!isValid || loadingPayment) && { opacity: 0.5 }]} 
           activeOpacity={0.85}
           disabled={!isValid || loadingPayment}
           onPress={handleSubmit(handleCheckout)}
         >
            {loadingPayment ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.checkoutBtnText}>Checkout securely • ${totalCost}</Text>}
         </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  content: { paddingHorizontal: spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { fontFamily: 'Astoria', fontSize: 24, color: Colors.nearBlack },

  priceCard: { backgroundColor: Colors.parchment, borderRadius: 16, padding: spacing.xl, borderWidth: 1, borderColor: Colors.border, marginBottom: spacing.xxl },
  priceLabel: { fontFamily: 'CeraPro-Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 1.5 },
  priceTotal: { fontFamily: 'Astoria', fontSize: 48, color: Colors.nearBlack, marginVertical: 4 },
  destName: { fontFamily: 'Astoria', fontSize: 24, color: Colors.textSecondary, marginBottom: spacing.lg },
  
  warnBadge: { backgroundColor: Colors.terracotta, flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: 8, gap: 6, marginBottom: spacing.md },
  warnBadgeText: { fontFamily: 'CeraPro-Medium', fontSize: 12, color: Colors.white },
  
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(196,113,58,0.1)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, alignSelf: 'flex-start' },
  timerText: { fontFamily: 'CeraPro-Bold', fontSize: 13, color: Colors.terracotta },

  sectionTitle: { fontFamily: 'CeraPro-Bold', fontSize: 12, color: Colors.textSecondary, letterSpacing: 1.2, marginBottom: spacing.sm },
  formCard: { backgroundColor: Colors.parchment, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: spacing.lg },
  inputWrap: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  inputLabel: { fontFamily: 'CeraPro-Medium', fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  input: { fontFamily: 'CeraPro-Medium', fontSize: 16, color: Colors.nearBlack },
  errorText: { fontFamily: 'CeraPro-Medium', fontSize: 12, color: '#D15858', marginTop: 4 },

  bottomDock: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: spacing.md, paddingHorizontal: spacing.xl },
  checkoutBtn: { height: 56, backgroundColor: Colors.nearBlack, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkoutBtnText: { fontFamily: 'CeraPro-Bold', fontSize: 16, color: Colors.white },
});
