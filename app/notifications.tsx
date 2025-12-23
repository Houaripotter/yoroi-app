import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ChevronLeft,
  Bell,
  BellOff,
  Dumbbell,
  Droplets,
  Scale,
  Flame,
  Clock,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { notificationService, NotificationSettings } from '@/lib/notificationService';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    await notificationService.initialize();
    setSettings(notificationService.getSettings());
    setIsLoading(false);
  };

  const updateSetting = async (key: string, value: any) => {
    if (!settings) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const newSettings = { ...settings };
    
    if (key === 'enabled') {
      newSettings.enabled = value;
    } else if (key.includes('.')) {
      const [parent, child] = key.split('.');
      (newSettings as any)[parent][child] = value;
    }
    
    setSettings(newSettings);
    await notificationService.updateSettings(newSettings);
  };

  const testNotification = async (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    switch (type) {
      case 'training':
        await notificationService.sendTrainingReminder();
        break;
      case 'hydration':
        await notificationService.sendHydrationReminder();
        break;
      case 'streak':
        await notificationService.sendStreakWarning(5);
        break;
    }
    
    Alert.alert('✅ Notification envoyée !', 'Tu devrais la recevoir dans quelques secondes.');
  };

  if (isLoading || !settings) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 50 }}>
          Chargement...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Notifications
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* Master toggle */}
        <View style={[styles.masterCard, { backgroundColor: settings.enabled ? `${colors.accent}15` : colors.backgroundCard }]}>
          <View style={styles.masterLeft}>
            {settings.enabled ? (
              <Bell size={28} color={colors.accent} />
            ) : (
              <BellOff size={28} color={colors.textMuted} />
            )}
            <View>
              <Text style={[styles.masterTitle, { color: colors.textPrimary }]}>
                Notifications
              </Text>
              <Text style={[styles.masterStatus, { color: settings.enabled ? colors.accent : colors.textMuted }]}>
                {settings.enabled ? 'Activées' : 'Désactivées'}
              </Text>
            </View>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={(v) => updateSetting('enabled', v)}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        {settings.enabled && (
          <>
            {/* Rappels entraînement */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              RAPPELS ENTRAÎNEMENT
            </Text>
            
            <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBg, { backgroundColor: '#8B5CF615' }]}>
                    <Dumbbell size={18} color="#8B5CF6" />
                  </View>
                  <View>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                      Rappel quotidien
                    </Text>
                    <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                      {settings.training.time} • Lun-Ven
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.training.enabled}
                  onValueChange={(v) => updateSetting('training.enabled', v)}
                  trackColor={{ false: colors.border, true: '#8B5CF6' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.testBtn, { borderColor: colors.border }]}
                onPress={() => testNotification('training')}
              >
                <Text style={[styles.testBtnText, { color: colors.textMuted }]}>
                  Tester cette notification
                </Text>
              </TouchableOpacity>
            </View>

            {/* Rappels hydratation */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              RAPPELS HYDRATATION
            </Text>
            
            <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBg, { backgroundColor: '#06B6D415' }]}>
                    <Droplets size={18} color="#06B6D4" />
                  </View>
                  <View>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                      Rappels eau
                    </Text>
                    <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                      Toutes les {settings.hydration.interval}h • {settings.hydration.startTime}-{settings.hydration.endTime}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.hydration.enabled}
                  onValueChange={(v) => updateSetting('hydration.enabled', v)}
                  trackColor={{ false: colors.border, true: '#06B6D4' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.testBtn, { borderColor: colors.border }]}
                onPress={() => testNotification('hydration')}
              >
                <Text style={[styles.testBtnText, { color: colors.textMuted }]}>
                  Tester cette notification
                </Text>
              </TouchableOpacity>
            </View>

            {/* Rappels pesée */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              RAPPELS PESÉE
            </Text>
            
            <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBg, { backgroundColor: '#10B98115' }]}>
                    <Scale size={18} color="#10B981" />
                  </View>
                  <View>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                      Rappel pesée
                    </Text>
                    <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                      {settings.weighing.time} • Lun, Mer, Ven
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.weighing.enabled}
                  onValueChange={(v) => updateSetting('weighing.enabled', v)}
                  trackColor={{ false: colors.border, true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Protection streak */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              PROTECTION STREAK
            </Text>
            
            <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBg, { backgroundColor: '#F9731615' }]}>
                    <Flame size={18} color="#F97316" />
                  </View>
                  <View>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                      Alerte streak
                    </Text>
                    <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                      {settings.streak.time} • Si pas entraîné
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.streak.enabled}
                  onValueChange={(v) => updateSetting('streak.enabled', v)}
                  trackColor={{ false: colors.border, true: '#F97316' }}
                  thumbColor="#FFFFFF"
                />
              </View>
              
              <TouchableOpacity 
                style={[styles.testBtn, { borderColor: colors.border }]}
                onPress={() => testNotification('streak')}
              >
                <Text style={[styles.testBtnText, { color: colors.textMuted }]}>
                  Tester cette notification
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Note */}
        <Text style={[styles.note, { color: colors.textMuted }]}>
          💡 Les notifications t'aident à rester régulier et à ne pas oublier de t'hydrater ou de t'entraîner.
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  
  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  masterLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  masterTitle: { fontSize: 18, fontWeight: '700' },
  masterStatus: { fontSize: 13, marginTop: 2 },
  
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  
  card: { borderRadius: 14, padding: 16, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSubtitle: { fontSize: 12, marginTop: 2 },
  
  testBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  testBtnText: { fontSize: 13, fontWeight: '500' },
  
  note: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: 8,
  },
});

