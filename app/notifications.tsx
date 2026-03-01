import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import {
  ChevronLeft,
  ChevronDown,
  Dumbbell,
  Droplets,
  Scale,
  Flame,
  Share2,
  Sun,
  Brain,
  BedDouble,
  Quote,
  Moon,
  Timer,
  Swords,
  Trophy,
  type LucideIcon,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/lib/ThemeContext';
import { notificationService, NotificationSettings } from '@/lib/notificationService';
import {
  getCitationNotifSettings,
  setCitationNotifSettings,
  CitationNotifSettings,
} from '@/lib/citations';
import {
  getHealthTipSettings,
  saveHealthTipSettings,
  HealthTipSettings,
} from '@/lib/eveningHealthTipsService';
import { timerNotifications, TimerNotifSettings } from '@/lib/timerNotifications';

const FREQ_STORAGE_KEY = '@yoroi_notif_frequencies';

// Activer LayoutAnimation sur Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ============================================
// TYPES
// ============================================

interface NotifCardConfig {
  id: string;
  icon: LucideIcon;
  iconColor: string;
  title: string;
  subtitle: string;
  description: string;
  isEnabled: boolean;
  onToggle: (value: boolean) => void;
  onTest?: () => void;
  testLabel?: string;
  details?: string[];
  // Frequence optionnelle
  frequency?: number; // valeur actuelle (1, 2, 3...)
  frequencyOptions?: number[]; // options disponibles
  frequencyUnit?: string; // 'jour' | 'semaine'
  onFrequencyChange?: (value: number) => void;
}

// ============================================
// COMPOSANT CARTE EXPANDABLE
// ============================================

function NotifCard({
  config,
  colors,
  isDark,
}: {
  config: NotifCardConfig;
  colors: any;
  isDark: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = config.icon;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    impactAsync(ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={toggleExpand}
      style={[
        styles.card,
        {
          backgroundColor: config.isEnabled
            ? isDark ? `${config.iconColor}10` : `${config.iconColor}08`
            : colors.backgroundCard,
          borderColor: config.isEnabled ? `${config.iconColor}40` : colors.border,
        },
      ]}
    >
      {/* Ligne principale */}
      <View style={styles.cardRow}>
        <View style={[styles.iconBg, { backgroundColor: `${config.iconColor}15` }]}>
          <Icon size={20} color={config.iconColor} />
        </View>

        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {config.title}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {config.subtitle}
          </Text>
        </View>

        <View style={styles.cardRight}>
          <Switch
            value={config.isEnabled}
            onValueChange={(v) => {
              impactAsync(ImpactFeedbackStyle.Light);
              config.onToggle(v);
            }}
            trackColor={{ false: colors.border, true: config.iconColor }}
            thumbColor="#FFFFFF"
          />
          <ChevronDown
            size={16}
            color={colors.textMuted}
            style={{
              transform: [{ rotate: expanded ? '180deg' : '0deg' }],
              marginTop: 4,
            }}
          />
        </View>
      </View>

      {/* Contenu expandable */}
      {expanded && (
        <View style={[styles.expandedContent, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {config.description}
          </Text>

          {/* Selecteur de frequence */}
          {config.frequencyOptions && config.onFrequencyChange && (
            <View style={styles.frequencySection}>
              <Text style={[styles.frequencyLabel, { color: colors.textSecondary }]}>
                Frequence ({config.frequencyUnit === 'semaine' ? 'par semaine' : 'par jour'})
              </Text>
              <View style={styles.frequencyRow}>
                {config.frequencyOptions.map(val => {
                  const isActive = config.frequency === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => {
                        impactAsync(ImpactFeedbackStyle.Light);
                        config.onFrequencyChange!(val);
                      }}
                      style={[
                        styles.frequencyPill,
                        {
                          backgroundColor: isActive ? config.iconColor : `${config.iconColor}12`,
                          borderColor: isActive ? config.iconColor : `${config.iconColor}30`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.frequencyPillText,
                          { color: isActive ? '#FFFFFF' : config.iconColor },
                        ]}
                      >
                        {val}x
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {config.details && config.details.length > 0 && (
            <View style={styles.detailsList}>
              {config.details.map((detail, i) => (
                <View key={i} style={styles.detailRow}>
                  <View style={[styles.detailDot, { backgroundColor: config.iconColor }]} />
                  <Text style={[styles.detailText, { color: colors.textSecondary }]}>{detail}</Text>
                </View>
              ))}
            </View>
          )}

          {config.onTest && (
            <TouchableOpacity
              style={[styles.testBtn, { borderColor: `${config.iconColor}40` }]}
              onPress={config.onTest}
            >
              <Text style={[styles.testBtnText, { color: config.iconColor }]}>
                {config.testLabel || 'Tester'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ============================================
// ECRAN PRINCIPAL
// ============================================

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [citationSettings, setCitationSettingsState] = useState<CitationNotifSettings | null>(null);
  const [healthTipSettings, setHealthTipSettingsState] = useState<HealthTipSettings | null>(null);
  const [timerSettings, setTimerSettingsState] = useState<TimerNotifSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Frequences par type de notification
  const [frequencies, setFrequencies] = useState<Record<string, number>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Charger les frequences sauvegardees
    try {
      const savedFreqs = await AsyncStorage.getItem(FREQ_STORAGE_KEY);
      if (savedFreqs) setFrequencies(JSON.parse(savedFreqs));
    } catch {}

    await notificationService.initialize();
    setSettings(notificationService.getSettings());

    const citSett = await getCitationNotifSettings();
    setCitationSettingsState(citSett);

    const healthSett = await getHealthTipSettings();
    setHealthTipSettingsState(healthSett);

    const timerSett = await timerNotifications.loadSettings();
    setTimerSettingsState(timerSett);

    setIsLoading(false);
  };

  // ============================================
  // UPDATE HANDLERS
  // ============================================

  const updateMainSetting = useCallback(async (key: string, value: any) => {
    if (!settings) return;
    const newSettings = { ...settings };
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      (newSettings as any)[parent][child] = value;
    } else {
      (newSettings as any)[key] = value;
    }
    // Si on active un sous-setting, activer aussi le master
    if (key.includes('.enabled') && value === true) {
      newSettings.enabled = true;
    }
    setSettings(newSettings);
    await notificationService.updateSettings(newSettings);
  }, [settings]);

  const updateCitation = useCallback(async (key: keyof CitationNotifSettings, value: any) => {
    if (!citationSettings) return;
    const newSettings = { ...citationSettings, [key]: value };
    setCitationSettingsState(newSettings);
    await setCitationNotifSettings(newSettings);
  }, [citationSettings]);

  const updateHealthTip = useCallback(async (key: keyof HealthTipSettings, value: any) => {
    if (!healthTipSettings) return;
    const newSettings = { ...healthTipSettings, [key]: value };
    setHealthTipSettingsState(newSettings);
    await saveHealthTipSettings(newSettings);
  }, [healthTipSettings]);

  const updateTimer = useCallback(async (key: keyof TimerNotifSettings, value: boolean) => {
    if (!timerSettings) return;
    const newSettings = { ...timerSettings, [key]: value };
    setTimerSettingsState(newSettings);
    await timerNotifications.saveSettings(newSettings);
  }, [timerSettings]);

  const updateFrequency = useCallback(async (id: string, value: number) => {
    const updated = { ...frequencies, [id]: value };
    setFrequencies(updated);
    try {
      await AsyncStorage.setItem(FREQ_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }, [frequencies]);

  const sendTest = useCallback(async (type: string) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    switch (type) {
      case 'training': await notificationService.sendTrainingReminder(); break;
      case 'hydration': await notificationService.sendHydrationReminder(); break;
      case 'streak': await notificationService.sendStreakWarning(5); break;
      case 'social_weekly': await notificationService.sendWeeklyCardReminder(); break;
      case 'briefing': await notificationService.sendBriefing(); break;
      case 'smart': await notificationService.sendSmartReminderTest(); break;
    }
    showPopup('Notification envoyee', 'Tu devrais la recevoir dans quelques secondes.', [{ text: 'OK', style: 'primary' }]);
  }, [showPopup]);

  // ============================================
  // LOADING
  // ============================================

  if (isLoading || !settings || !citationSettings || !healthTipSettings || !timerSettings) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 50 }}>
          Chargement...
        </Text>
      </View>
    );
  }

  // ============================================
  // BUILD CARDS CONFIG
  // ============================================

  const cards: NotifCardConfig[] = [
    // 1. Citations motivantes
    {
      id: 'citations',
      icon: Quote,
      iconColor: '#D4AF37',
      title: 'Citations motivantes',
      subtitle: citationSettings.enabled ? `${frequencies.citations || 1}x par jour a 8h00` : 'Desactive',
      description: 'Recois une citation motivante chaque matin a 8h pour bien demarrer ta journee. Les citations sont variees et choisies pour booster ta motivation.',
      isEnabled: citationSettings.enabled,
      onToggle: (v) => updateCitation('enabled', v),
      frequency: frequencies.citations || 1,
      frequencyOptions: [1, 2, 3],
      frequencyUnit: 'jour',
      onFrequencyChange: (v) => updateFrequency('citations', v),
      details: [
        'Envoyee chaque matin a 8h00',
        'Categories : motivation, discipline, mental, warrior',
      ],
    },

    // 2. Repos termine (timer muscu)
    {
      id: 'timer_rest',
      icon: Timer,
      iconColor: '#EF4444',
      title: 'Repos termine',
      subtitle: timerSettings.restFinished ? 'Actif pendant les seances' : 'Desactive',
      description: 'Notification quand ton temps de repos est termine pendant un entrainement de musculation. Te previent de reprendre ta serie.',
      isEnabled: timerSettings.restFinished,
      onToggle: (v) => updateTimer('restFinished', v),
      details: [
        '"Go go go ! Prochaine serie !"',
        'Se declenche a la fin du repos muscu',
        'Fonctionne en arriere-plan',
      ],
    },

    // 3. Round termine (timer combat)
    {
      id: 'timer_round',
      icon: Swords,
      iconColor: '#F97316',
      title: 'Round termine',
      subtitle: timerSettings.roundFinished ? 'Actif pendant les seances' : 'Desactive',
      description: 'Notification a chaque fin de round en mode combat, tabata, EMOM ou autres modes intervalles.',
      isEnabled: timerSettings.roundFinished,
      onToggle: (v) => updateTimer('roundFinished', v),
      details: [
        'Combat, Tabata, EMOM, AMRAP, For Time',
        'Indique le numero du round',
        'Fonctionne en arriere-plan',
      ],
    },

    // 4. Entrainement termine
    {
      id: 'timer_workout',
      icon: Trophy,
      iconColor: '#10B981',
      title: 'Entrainement termine',
      subtitle: timerSettings.workoutFinished ? 'Actif' : 'Desactive',
      description: 'Notification de fin de seance complete. Te felicite et confirme que l\'entrainement est enregistre.',
      isEnabled: timerSettings.workoutFinished,
      onToggle: (v) => updateTimer('workoutFinished', v),
      details: [
        'Se declenche a la toute fin de seance',
        'Adapte au type d\'entrainement',
        'Muscu, combat, tabata, EMOM, AMRAP...',
      ],
    },

    // 5. Rappel entrainement quotidien
    {
      id: 'training',
      icon: Dumbbell,
      iconColor: '#8B5CF6',
      title: 'Rappel entrainement',
      subtitle: settings.training.enabled ? `${frequencies.training || 1}x/sem - ${settings.training.time}` : 'Desactive',
      description: 'Rappel pour ne pas oublier de t\'entrainer. Choisis combien de fois par semaine tu veux etre rappele.',
      isEnabled: settings.training.enabled,
      onToggle: (v) => updateMainSetting('training.enabled', v),
      onTest: () => sendTest('training'),
      testLabel: 'Tester cette notification',
      frequency: frequencies.training || 1,
      frequencyOptions: [1, 2, 3, 4, 5, 6],
      frequencyUnit: 'semaine',
      onFrequencyChange: (v) => updateFrequency('training', v),
      details: [
        `Heure : ${settings.training.time}`,
        'Messages motivants varies',
      ],
    },

    // 6. Hydratation
    {
      id: 'hydration',
      icon: Droplets,
      iconColor: '#06B6D4',
      title: 'Rappels hydratation',
      subtitle: settings.hydration.enabled ? `${frequencies.hydration || 1}x par jour` : 'Desactive',
      description: 'Rappels reguliers pour boire de l\'eau tout au long de la journee. L\'hydratation est essentielle pour la performance et la recuperation.',
      isEnabled: settings.hydration.enabled,
      onToggle: (v) => updateMainSetting('hydration.enabled', v),
      onTest: () => sendTest('hydration'),
      testLabel: 'Tester cette notification',
      frequency: frequencies.hydration || 1,
      frequencyOptions: [1, 2, 3, 4, 5, 6],
      frequencyUnit: 'jour',
      onFrequencyChange: (v) => updateFrequency('hydration', v),
      details: [
        `Plage horaire : ${settings.hydration.startTime} - ${settings.hydration.endTime}`,
        'Adapte a tes besoins',
      ],
    },

    // 7. Rappel pesee
    {
      id: 'weighing',
      icon: Scale,
      iconColor: '#10B981',
      title: 'Rappel pesee',
      subtitle: settings.weighing.enabled ? `${frequencies.weighing || 1}x/sem - ${settings.weighing.time}` : 'Desactive',
      description: 'Rappel pour te peser regulierement afin de suivre ta progression. Une pesee reguliere permet un meilleur suivi.',
      isEnabled: settings.weighing.enabled,
      onToggle: (v) => updateMainSetting('weighing.enabled', v),
      frequency: frequencies.weighing || 1,
      frequencyOptions: [1, 2, 3, 4, 5, 6],
      frequencyUnit: 'semaine',
      onFrequencyChange: (v) => updateFrequency('weighing', v),
      details: [
        `Heure : ${settings.weighing.time}`,
        'Le matin a jeun pour plus de precision',
      ],
    },

    // 8. Protection serie (streak)
    {
      id: 'streak',
      icon: Flame,
      iconColor: '#F97316',
      title: 'Protection serie',
      subtitle: settings.streak.enabled ? `${settings.streak.time} - Si pas entraine` : 'Desactive',
      description: 'Te previent en fin de journee si tu ne t\'es pas encore entraine, pour ne pas casser ton streak.',
      isEnabled: settings.streak.enabled,
      onToggle: (v) => updateMainSetting('streak.enabled', v),
      onTest: () => sendTest('streak'),
      testLabel: 'Tester cette notification',
      details: [
        `Heure : ${settings.streak.time}`,
        'Uniquement si pas d\'entrainement ce jour',
        'Protege ta serie de jours consecutifs',
      ],
    },

    // 9. Rappel sommeil
    {
      id: 'sleep',
      icon: BedDouble,
      iconColor: '#6366F1',
      title: 'Rappel sommeil',
      subtitle: settings.sleep.enabled ? `${settings.sleep.bedtimeReminder} - Heure du coucher` : 'Desactive',
      description: 'Te rappelle d\'aller dormir a l\'heure que tu as choisie. Un bon sommeil est essentiel pour la recuperation musculaire et les performances.',
      isEnabled: settings.sleep.enabled,
      onToggle: (v) => updateMainSetting('sleep.enabled', v),
      details: [
        `Heure : ${settings.sleep.bedtimeReminder}`,
        'Te rappelle d\'eteindre les ecrans',
        'Ameliore ta qualite de sommeil',
      ],
    },

    // 10. Briefing matinal
    {
      id: 'briefing',
      icon: Sun,
      iconColor: '#F59E0B',
      title: 'Briefing matinal',
      subtitle: settings.briefing?.enabled ? `${frequencies.briefing || 1}x/jour - ${settings.briefing.time}` : 'Desactive',
      description: 'Chaque matin, recois un resume personnalise : ton streak, ton poids, les entrainements prevus, et un message motivant pour la journee.',
      isEnabled: settings.briefing?.enabled ?? false,
      onToggle: (v) => updateMainSetting('briefing.enabled', v),
      onTest: () => sendTest('briefing'),
      testLabel: 'Tester le briefing',
      frequency: frequencies.briefing || 1,
      frequencyOptions: [1, 2, 3],
      frequencyUnit: 'jour',
      onFrequencyChange: (v) => updateFrequency('briefing', v),
      details: [
        `Heure : ${settings.briefing?.time || '07:30'}`,
        'Inclut streak, poids, planning',
        'Message motivant personnalise',
      ],
    },

    // 11. Cartes sociales
    {
      id: 'social',
      icon: Share2,
      iconColor: '#EC4899',
      title: 'Rappels cartes sociales',
      subtitle: settings.socialCards?.enabled ? `${frequencies.social || 1}x/sem - Vendredi 19h` : 'Desactive',
      description: 'Te rappelle de partager tes progres sur les reseaux sociaux. Carte hebdomadaire chaque vendredi soir et carte mensuelle le 1er de chaque mois.',
      isEnabled: settings.socialCards?.enabled ?? false,
      onToggle: (v) => updateMainSetting('socialCards.enabled', v),
      onTest: () => sendTest('social_weekly'),
      testLabel: 'Tester (carte hebdo)',
      frequency: frequencies.social || 1,
      frequencyOptions: [1, 2, 3, 4],
      frequencyUnit: 'semaine',
      onFrequencyChange: (v) => updateFrequency('social', v),
      details: [
        'Carte hebdomadaire : chaque vendredi a 19h',
        'Carte mensuelle : 1er du mois',
        'Partage tes stats sur Instagram, etc.',
      ],
    },

    // 12. Dormir moins bete
    {
      id: 'health_tips',
      icon: Moon,
      iconColor: '#8B5CF6',
      title: 'Dormir moins bete',
      subtitle: healthTipSettings.enabled ? `${frequencies.health_tips || 1}x/jour - ${healthTipSettings.time}` : 'Desactive',
      description: 'Chaque soir, recois un conseil sante ou nutrition scientifiquement prouve. Apprends quelque chose d\'utile avant de dormir.',
      isEnabled: healthTipSettings.enabled,
      onToggle: (v) => updateHealthTip('enabled', v),
      frequency: frequencies.health_tips || 1,
      frequencyOptions: [1, 2, 3],
      frequencyUnit: 'jour',
      onFrequencyChange: (v) => updateFrequency('health_tips', v),
      details: [
        `Heure : ${healthTipSettings.time}`,
        '100+ conseils varies',
        'Categories : poids, nutrition, sommeil, exercice, hydratation, mental',
      ],
    },

    // 13. Rappels intelligents
    {
      id: 'smart',
      icon: Brain,
      iconColor: '#6366F1',
      title: 'Rappels intelligents',
      subtitle: settings.smartReminders?.enabled ? 'Analyse de tes habitudes' : 'Desactive',
      description: 'Analyse tes 60 derniers jours d\'entrainement pour t\'envoyer des rappels personnalises : jours habituels manques, suggestion de repos, frequence en baisse.',
      isEnabled: settings.smartReminders?.enabled ?? false,
      onToggle: (v) => updateMainSetting('smartReminders.enabled', v),
      onTest: () => sendTest('smart'),
      testLabel: 'Voir mon analyse',
      details: [
        'Alerte si tu manques un jour habituel',
        'Suggestion de repos apres 4+ jours consecutifs',
        'Alerte si frequence en baisse',
        'Analyse basee sur 60 jours de donnees',
      ],
    },
  ];

  const activeCount = cards.filter(c => c.isEnabled).length;

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
        {/* Resume */}
        <View style={[styles.summaryBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
          <Text style={[styles.summaryText, { color: colors.textMuted }]}>
            {activeCount === 0
              ? 'Aucune notification active'
              : `${activeCount} notification${activeCount > 1 ? 's' : ''} active${activeCount > 1 ? 's' : ''} sur ${cards.length}`}
          </Text>
        </View>

        {/* Toutes les cartes */}
        {cards.map((card) => (
          <NotifCard key={card.id} config={card} colors={colors} isDark={isDark} />
        ))}

        {/* Note */}
        <View style={[styles.noteBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
          <Text style={[styles.noteText, { color: colors.textMuted }]}>
            Appuie sur une carte pour voir les details. Active uniquement ce qui t'aide vraiment.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      <PopupComponent />
    </View>
  );
}

// ============================================
// STYLES
// ============================================

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
  content: { paddingHorizontal: 16, paddingTop: 4 },

  // Summary
  summaryBar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'center',
    gap: 2,
  },

  // Expanded content
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  detailsList: {
    gap: 6,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  detailText: {
    fontSize: 12,
    flex: 1,
  },
  // Frequence
  frequencySection: {
    marginBottom: 12,
  },
  frequencyLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  frequencyPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    minWidth: 48,
    alignItems: 'center',
  },
  frequencyPillText: {
    fontSize: 14,
    fontWeight: '700',
  },

  testBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 4,
  },
  testBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Note
  noteBox: {
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
