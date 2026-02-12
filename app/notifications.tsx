import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import {
  ChevronLeft,
  Bell,
  BellOff,
  Dumbbell,
  Droplets,
  Scale,
  Flame,
  Share2,
  Sun,
  Brain,
  TrendingDown,
  BedDouble,
  AlertCircle,
  Quote,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';
import { notificationService, NotificationSettings } from '@/lib/notificationService';
import {
  getCitationNotifSettings,
  setCitationNotifSettings,
  CitationNotifSettings
} from '@/lib/citations';
import {
  getHealthTipSettings,
  saveHealthTipSettings,
  HealthTipSettings
} from '@/lib/eveningHealthTipsService';
import { Moon } from 'lucide-react-native';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [citationSettings, setCitationSettings] = useState<CitationNotifSettings | null>(null);
  const [healthTipSettings, setHealthTipSettings] = useState<HealthTipSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    await notificationService.initialize();
    setSettings(notificationService.getSettings());

    const citationSett = await getCitationNotifSettings();
    setCitationSettings(citationSett);

    const healthSett = await getHealthTipSettings();
    setHealthTipSettings(healthSett);

    setIsLoading(false);
  };

  const updateSetting = async (key: string, value: any) => {
    if (!settings) return;

    impactAsync(ImpactFeedbackStyle.Light);

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

  const updateCitationSetting = async (key: keyof CitationNotifSettings, value: any) => {
    if (!citationSettings) return;

    impactAsync(ImpactFeedbackStyle.Light);

    // TOUJOURS forcer frequency à 1 (1x matin uniquement)
    const newSettings = { ...citationSettings, [key]: value, frequency: 1 };
    setCitationSettings(newSettings);
    await setCitationNotifSettings(newSettings);
  };

  const updateHealthTipSetting = async (key: keyof HealthTipSettings, value: any) => {
    if (!healthTipSettings) return;

    impactAsync(ImpactFeedbackStyle.Light);

    const newSettings = { ...healthTipSettings, [key]: value };
    setHealthTipSettings(newSettings);
    await saveHealthTipSettings(newSettings);
  };

  const testNotification = async (type: string) => {
    impactAsync(ImpactFeedbackStyle.Medium);

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
      case 'social_weekly':
        await notificationService.sendWeeklyCardReminder();
        break;
      case 'social_monthly':
        await notificationService.sendMonthlyCardReminder();
        break;
      case 'briefing':
        await notificationService.sendBriefing();
        break;
      case 'smart':
        await notificationService.sendSmartReminderTest();
        break;
    }

    showPopup('Notification envoyée', 'Tu devrais la recevoir dans quelques secondes.', [{ text: 'OK', style: 'primary' }]);
  };

  if (isLoading || !settings || !citationSettings || !healthTipSettings) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 50 }}>
          Chargement...
        </Text>
      </View>
    );
  }

  const getFrequencyText = (_freq: number) => {
    return '1× par jour (8h00)';
  };

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

        {/* CITATIONS - ACTIVÉ PAR DÉFAUT */}
        <View style={styles.recommendedBadge}>
          <Sparkles size={14} color={colors.accentText} />
          <Text style={[styles.recommendedText, { color: colors.accentText }]}>
            RECOMMANDÉ
          </Text>
        </View>

        <LinearGradient
          colors={citationSettings.enabled
            ? [isDark ? '#D4AF3720' : '#D4AF3710', isDark ? '#D4AF3710' : '#D4AF3705']
            : [colors.backgroundCard, colors.backgroundCard]
          }
          style={[styles.featuredCard, { borderColor: citationSettings.enabled ? colors.accent : colors.border }]}
        >
          <View style={styles.featuredHeader}>
            <View style={styles.featuredLeft}>
              <View style={[styles.featuredIconBg, { backgroundColor: `${colors.accent}20` }]}>
                <Quote size={24} color={colors.accentText} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.featuredTitle, { color: colors.textPrimary }]}>
                    Citations motivantes
                  </Text>
                  <View style={[styles.activeBadge, { backgroundColor: citationSettings.enabled ? '#10B98120' : colors.border }]}>
                    <Text style={[styles.activeBadgeText, { color: citationSettings.enabled ? '#10B981' : colors.textMuted }]}>
                      {citationSettings.enabled ? 'Activé' : 'Désactivé'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.featuredSubtitle, { color: colors.textSecondary }]}>
                  {getFrequencyText(citationSettings.frequency)}
                </Text>
              </View>
            </View>
            <Switch
              value={citationSettings.enabled}
              onValueChange={(v) => updateCitationSetting('enabled', v)}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Fréquence forcée à 1x matin - pas de sélecteur */}

          <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
            <Sparkles size={14} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              1 citation motivante chaque matin à 8h pour bien démarrer ta journée
            </Text>
          </View>
        </LinearGradient>

        {/* AUTRES NOTIFICATIONS */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>Autres notifications</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* Master toggle pour autres notifications */}
        <View style={[styles.masterCard, { backgroundColor: settings.enabled ? `${colors.accent}08` : colors.backgroundCard, borderColor: colors.border }]}>
          <View style={styles.masterLeft}>
            {settings.enabled ? (
              <Bell size={24} color={colors.accentText} />
            ) : (
              <BellOff size={24} color={colors.textMuted} />
            )}
            <View>
              <Text style={[styles.masterTitle, { color: colors.textPrimary }]}>
                Rappels optionnels
              </Text>
              <Text style={[styles.masterStatus, { color: settings.enabled ? colors.textSecondary : colors.textMuted }]}>
                {settings.enabled ? 'Activés - Choisis ce que tu veux' : 'Tout est désactivé'}
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
            {/* Entraînement */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              ENTRAÎNEMENT
            </Text>

            <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBg, { backgroundColor: '#8B5CF615' }]}>
                    <Dumbbell size={18} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
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

              {settings.training.enabled && (
                <TouchableOpacity
                  style={[styles.testBtn, { borderColor: colors.border }]}
                  onPress={() => testNotification('training')}
                >
                  <Text style={[styles.testBtnText, { color: colors.textMuted }]}>
                    Tester cette notification
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Hydratation */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              SANTÉ
            </Text>

            <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBg, { backgroundColor: '#06B6D415' }]}>
                    <Droplets size={18} color="#06B6D4" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                      Rappels hydratation
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

              {settings.hydration.enabled && (
                <TouchableOpacity
                  style={[styles.testBtn, { borderColor: colors.border }]}
                  onPress={() => testNotification('hydration')}
                >
                  <Text style={[styles.testBtnText, { color: colors.textMuted }]}>
                    Tester cette notification
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBg, { backgroundColor: '#10B98115' }]}>
                    <Scale size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
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

            <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBg, { backgroundColor: '#6366F115' }]}>
                    <Moon size={18} color="#6366F1" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                      Dormir moins bête
                    </Text>
                    <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                      {healthTipSettings.time} • Conseils santé du soir
                    </Text>
                  </View>
                </View>
                <Switch
                  value={healthTipSettings.enabled}
                  onValueChange={(v) => updateHealthTipSetting('enabled', v)}
                  trackColor={{ false: colors.border, true: '#6366F1' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Motivation */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              MOTIVATION
            </Text>

            <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBg, { backgroundColor: '#F9731615' }]}>
                    <Flame size={18} color="#F97316" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                      Protection série
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

              {settings.streak.enabled && (
                <TouchableOpacity
                  style={[styles.testBtn, { borderColor: colors.border }]}
                  onPress={() => testNotification('streak')}
                >
                  <Text style={[styles.testBtnText, { color: colors.textMuted }]}>
                    Tester cette notification
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBg, { backgroundColor: '#F5920015' }]}>
                    <Sun size={18} color="#F59200" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                      Briefing matinal
                    </Text>
                    <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                      {settings.briefing?.time || '07:30'} • Résumé quotidien
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.briefing?.enabled ?? false}
                  onValueChange={(v) => updateSetting('briefing.enabled', v)}
                  trackColor={{ false: colors.border, true: '#F59200' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {settings.briefing?.enabled && (
                <>
                  <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                    <Sun size={14} color={colors.textMuted} />
                    <Text style={[styles.infoText, { color: colors.textMuted }]}>
                      Chaque matin : série, poids, entraînements prévus + message motivant
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.testBtn, { borderColor: colors.border }]}
                    onPress={() => testNotification('briefing')}
                  >
                    <Text style={[styles.testBtnText, { color: colors.textMuted }]}>
                      Tester le briefing
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Partage */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              PARTAGE
            </Text>

            <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBg, { backgroundColor: '#EC489915' }]}>
                    <Share2 size={18} color="#EC4899" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                      Rappels cartes sociales
                    </Text>
                    <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                      Dimanche + 1er du mois
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.socialCards?.enabled ?? false}
                  onValueChange={(v) => updateSetting('socialCards.enabled', v)}
                  trackColor={{ false: colors.border, true: '#EC4899' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {settings.socialCards?.enabled && (
                <>
                  <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                    <Share2 size={14} color={colors.textMuted} />
                    <Text style={[styles.infoText, { color: colors.textMuted }]}>
                      Te rappelle de partager tes progrès hebdo et mensuels
                    </Text>
                  </View>

                  <View style={styles.testBtnRow}>
                    <TouchableOpacity
                      style={[styles.testBtnSmall, { borderColor: colors.border }]}
                      onPress={() => testNotification('social_weekly')}
                    >
                      <Text style={[styles.testBtnText, { color: colors.textMuted }]}>
                        Test hebdo
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.testBtnSmall, { borderColor: colors.border }]}
                      onPress={() => testNotification('social_monthly')}
                    >
                      <Text style={[styles.testBtnText, { color: colors.textMuted }]}>
                        Test mensuel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* Avancé */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              AVANCÉ
            </Text>

            <View style={[styles.card, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconBg, { backgroundColor: '#8B5CF615' }]}>
                    <Brain size={18} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                      Rappels intelligents
                    </Text>
                    <Text style={[styles.rowSubtitle, { color: colors.textMuted }]}>
                      S'adaptent à tes habitudes
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.smartReminders?.enabled ?? false}
                  onValueChange={(v) => updateSetting('smartReminders.enabled', v)}
                  trackColor={{ false: colors.border, true: '#8B5CF6' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {settings.smartReminders?.enabled && (
                <>
                  <View style={[styles.subOptions, { borderTopColor: colors.border }]}>
                    <View style={styles.subOption}>
                      <View style={styles.subOptionLeft}>
                        <AlertCircle size={16} color={colors.textMuted} />
                        <Text style={[styles.subOptionText, { color: colors.textSecondary }]}>
                          Jour habituel manqué
                        </Text>
                      </View>
                      <Switch
                        value={settings.smartReminders?.missedTrainingAlert ?? false}
                        onValueChange={(v) => updateSetting('smartReminders.missedTrainingAlert', v)}
                        trackColor={{ false: colors.border, true: '#8B5CF6' }}
                        thumbColor="#FFFFFF"
                        style={{ transform: [{ scale: 0.8 }] }}
                      />
                    </View>

                    <View style={styles.subOption}>
                      <View style={styles.subOptionLeft}>
                        <BedDouble size={16} color={colors.textMuted} />
                        <Text style={[styles.subOptionText, { color: colors.textSecondary }]}>
                          Suggestion de repos
                        </Text>
                      </View>
                      <Switch
                        value={settings.smartReminders?.restDaySuggestion ?? false}
                        onValueChange={(v) => updateSetting('smartReminders.restDaySuggestion', v)}
                        trackColor={{ false: colors.border, true: '#8B5CF6' }}
                        thumbColor="#FFFFFF"
                        style={{ transform: [{ scale: 0.8 }] }}
                      />
                    </View>

                    <View style={styles.subOption}>
                      <View style={styles.subOptionLeft}>
                        <TrendingDown size={16} color={colors.textMuted} />
                        <Text style={[styles.subOptionText, { color: colors.textSecondary }]}>
                          Fréquence en baisse
                        </Text>
                      </View>
                      <Switch
                        value={settings.smartReminders?.frequencyAlert ?? false}
                        onValueChange={(v) => updateSetting('smartReminders.frequencyAlert', v)}
                        trackColor={{ false: colors.border, true: '#8B5CF6' }}
                        thumbColor="#FFFFFF"
                        style={{ transform: [{ scale: 0.8 }] }}
                      />
                    </View>
                  </View>

                  <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                    <Brain size={14} color={colors.textMuted} />
                    <Text style={[styles.infoText, { color: colors.textMuted }]}>
                      Analyse tes 60 derniers jours pour t'envoyer des rappels personnalisés
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.testBtn, { borderColor: colors.border }]}
                    onPress={() => testNotification('smart')}
                  >
                    <Text style={[styles.testBtnText, { color: colors.textMuted }]}>
                      Voir mon analyse
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}

        {/* Note finale */}
        <View style={[styles.finalNote, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
          <Text style={[styles.finalNoteText, { color: colors.textMuted }]}>
            💡 Active uniquement les notifications qui t'aident vraiment. Moins c'est souvent mieux !
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      <PopupComponent />
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

  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  featuredCard: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 24,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  featuredIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  featuredSubtitle: {
    fontSize: 13,
    marginTop: 3,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  featuredOptions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  optionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  frequencyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  frequencyBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  masterLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  masterTitle: { fontSize: 16, fontWeight: '700' },
  masterStatus: { fontSize: 12, marginTop: 2 },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },

  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  testBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  testBtnSmall: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  subOptions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 2,
  },
  subOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  subOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  subOptionText: {
    fontSize: 14,
  },

  finalNote: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  finalNoteText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
