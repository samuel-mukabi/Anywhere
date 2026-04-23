import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

import { Colors } from '@/core/theme/colors';
import { spacing } from '@/core/theme/spacing';
import { socketManager } from '@/services/socket';

interface Member {
  id: string;
  name: string;
  budget: number;
}

export default function GroupRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([
    { id: 'u1', name: 'You', budget: 3500 },
    { id: 'u2', name: 'Alex', budget: 2800 },
    { id: 'u3', name: 'Jordan', budget: 4200 },
  ]);
  const [equalizedBudget, setEqualizedBudget] = useState<number>(2800);

  useEffect(() => {
    socketManager.connect();

    socketManager.on('BUDGET_UPDATED', (payload: any) => {
      setMembers(prev => prev.map(m => m.id === payload.id ? { ...m, budget: payload.budget } : m));
    });

    socketManager.on('RESULTS_READY', (payload: any) => {
      setEqualizedBudget(payload.equalizedBudget);
    });

    return () => {
      socketManager.off('BUDGET_UPDATED');
      socketManager.off('RESULTS_READY');
      socketManager.disconnect();
    };
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join my Anywhere Group Room! Link: anywhere://group/${roomId}`,
        url: `anywhere://group/${roomId}`,
      });
    } catch (error: any) {
      console.log('Share failed:', error.message);
    }
  };

  const handleMyBudgetChange = (val: number) => {
    setMembers(prev => prev.map(m => m.id === 'u1' ? { ...m, budget: val } : m));
    socketManager.emit('BUDGET_UPDATED', { id: 'u1', budget: val });
    
    // Local mock recalculation since there's no server mapping yet.
    const newMembers = members.map(m => m.id === 'u1' ? { ...m, budget: val } : m);
    const min = Math.min(...newMembers.map(m => m.budget));
    setEqualizedBudget(min);
    socketManager.emit('RESULTS_READY', { equalizedBudget: min });
  };

  const maxBudget = Math.max(...members.map(m => m.budget), 5000);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      
      {/* Top Protocol Row */}
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, spacing.xl) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={Colors.nearBlack} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Room {roomId?.toString().slice(0, 5)}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Feather name="share" size={20} color={Colors.nearBlack} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Equalizer Output Bounds */}
        <View style={styles.equalizerModule}>
          <Text style={styles.equalizerLabel}>EQUALIZED BUDGET</Text>
          <Text style={styles.equalizerAmount}>${Math.floor(equalizedBudget)}</Text>
          <Text style={styles.equalizerSub}>This is the tightest budget across your group. Anywhere will construct itineraries scaling dynamically downward towards this cap.</Text>
        </View>

        {/* Member Configuration Bounds */}
        <Text style={styles.sectionTitle}>MEMBER SETTINGS</Text>
        {members.map((member) => {
          const isTightest = member.budget === equalizedBudget;
          const barWidth = `${(member.budget / maxBudget) * 100}%`;
          
          return (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.memberInfoRow}>
                <View style={styles.memberNameWrap}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  {isTightest && <View style={styles.tightestBadge}><Text style={styles.tightestBadgeText}>Limiter</Text></View>}
                </View>
                <Text style={styles.memberBudgetText}>${Math.floor(member.budget)}</Text>
              </View>

              <View style={styles.barBackground}>
                <View style={[styles.barFill, { width: barWidth as any, backgroundColor: isTightest ? Colors.terracotta : Colors.textSecondary }]} />
              </View>

              {member.id === 'u1' && (
                <Slider
                  style={styles.slider}
                  minimumValue={500}
                  maximumValue={15000}
                  step={100}
                  value={member.budget}
                  onValueChange={handleMyBudgetChange}
                  minimumTrackTintColor={Colors.nearBlack}
                  maximumTrackTintColor={Colors.border}
                  thumbTintColor={Colors.terracotta}
                />
              )}
            </View>
          );
        })}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, backgroundColor: Colors.parchment, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontFamily: 'CeraPro-Bold', fontSize: 16, color: Colors.nearBlack, textTransform: 'uppercase', letterSpacing: 1 },
  backBtn: { padding: spacing.xs },
  shareBtn: { padding: spacing.xs, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },

  content: { padding: spacing.xl, paddingBottom: 100 },

  equalizerModule: { alignItems: 'center', backgroundColor: Colors.parchment, borderRadius: 16, padding: spacing.xl, borderWidth: 1, borderColor: Colors.border, marginBottom: spacing.xxl },
  equalizerLabel: { fontFamily: 'CeraPro-Bold', fontSize: 11, color: Colors.textSecondary, letterSpacing: 1.5, marginBottom: spacing.sm },
  equalizerAmount: { fontFamily: 'Astoria', fontSize: 48, color: Colors.nearBlack, marginBottom: spacing.sm },
  equalizerSub: { fontFamily: 'CeraPro-Medium', fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18, paddingHorizontal: spacing.md },

  sectionTitle: { fontFamily: 'CeraPro-Bold', fontSize: 12, color: Colors.textSecondary, letterSpacing: 1.2, marginBottom: spacing.lg },

  memberRow: { marginBottom: spacing.xl },
  memberInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  memberNameWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  memberName: { fontFamily: 'Astoria', fontSize: 20, color: Colors.nearBlack },
  tightestBadge: { backgroundColor: Colors.terracotta, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tightestBadgeText: { fontFamily: 'CeraPro-Bold', fontSize: 9, color: Colors.white, textTransform: 'uppercase', letterSpacing: 0.5 },
  memberBudgetText: { fontFamily: 'CeraPro-Bold', fontSize: 15, color: Colors.nearBlack },

  barBackground: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: spacing.md },
  barFill: { height: '100%', borderRadius: 4 },

  slider: { width: '100%', height: 40, marginTop: -10 },
});
