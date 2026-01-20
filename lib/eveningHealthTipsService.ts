// ============================================
// YOROI - SERVICE "DORMIR MOINS BÊTE"
// ============================================
// Notifications du soir avec des conseils santé/poids
// À 22h chaque soir pour apprendre quelque chose avant de dormir

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './security/logger';

// ============================================
// TYPES
// ============================================

export interface HealthTipSettings {
  enabled: boolean;
  time: string; // HH:mm format (default: 22:00)
  days: number[]; // 0-6 (0 = dimanche)
}

interface HealthTip {
  id: string;
  title: string;
  content: string;
  category: 'weight' | 'nutrition' | 'sleep' | 'exercise' | 'hydration' | 'mental';
}

// ============================================
// CONSEILS SANTÉ (100+ conseils)
// ============================================

const HEALTH_TIPS: HealthTip[] = [
  // === POIDS ===
  {
    id: 'w1',
    title: '📊 Métabolisme',
    content: 'Le muscle brûle 3x plus de calories que la graisse au repos. Plus tu as de masse musculaire, plus tu brûles de calories même en dormant.',
    category: 'weight',
  },
  {
    id: 'w2',
    title: '⚖️ Fluctuations',
    content: 'Ton poids peut varier de 1 à 2 kg dans une journée. C\'est normal ! L\'eau, les repas et le sel influencent ces variations.',
    category: 'weight',
  },
  {
    id: 'w3',
    title: '🎯 Perte de poids',
    content: 'Une perte de poids saine est de 0,5 à 1 kg par semaine. Plus rapide = perte de muscle + effet yoyo.',
    category: 'weight',
  },
  {
    id: 'w4',
    title: '🔥 Calories',
    content: 'Pour perdre 1 kg de graisse, il faut un déficit de ~7700 calories. C\'est environ 1100 cal/jour pendant 1 semaine.',
    category: 'weight',
  },
  {
    id: 'w5',
    title: '💪 Muscle vs Graisse',
    content: 'Le muscle est plus dense que la graisse. Tu peux peser pareil mais être plus mince si tu remplaces la graisse par du muscle.',
    category: 'weight',
  },
  {
    id: 'w6',
    title: '📈 Plateau',
    content: 'Les plateaux de poids sont normaux. Ton corps s\'adapte. Change ton entraînement ou tes calories pour relancer la progression.',
    category: 'weight',
  },
  {
    id: 'w7',
    title: '⏰ Horaire de pesée',
    content: 'Pèse-toi toujours au même moment (idéalement le matin, à jeun, après être allé aux toilettes) pour des données fiables.',
    category: 'weight',
  },

  // === NUTRITION ===
  {
    id: 'n1',
    title: '🥗 Protéines',
    content: 'Les protéines augmentent la satiété et boostent le métabolisme de 20-30% pendant la digestion (effet thermique).',
    category: 'nutrition',
  },
  {
    id: 'n2',
    title: '🍽️ Taille des portions',
    content: 'Utilise des assiettes plus petites. Notre cerveau se sent satisfait quand l\'assiette est pleine, peu importe sa taille.',
    category: 'nutrition',
  },
  {
    id: 'n3',
    title: '🥜 Bonnes graisses',
    content: 'Les graisses ne font pas grossir ! Les bonnes graisses (avocat, noix, huile d\'olive) sont essentielles pour les hormones.',
    category: 'nutrition',
  },
  {
    id: 'n4',
    title: '🍚 Glucides',
    content: 'Les glucides ne sont pas l\'ennemi. Privilégie les glucides complexes (riz complet, patate douce) pour une énergie stable.',
    category: 'nutrition',
  },
  {
    id: 'n5',
    title: '🕐 Jeûne intermittent',
    content: 'Le jeûne 16/8 peut aider à perdre du poids mais n\'est pas magique. C\'est juste une façon de réduire les calories.',
    category: 'nutrition',
  },
  {
    id: 'n6',
    title: '🍫 Aliments plaisir',
    content: 'Se priver à 100% mène souvent à craquer. Accorde-toi 10-20% de plaisir pour tenir sur le long terme.',
    category: 'nutrition',
  },
  {
    id: 'n7',
    title: '🥦 Fibres',
    content: 'Les fibres augmentent la satiété et régulent la glycémie. Vise 25-35g par jour (légumes, fruits, céréales complètes).',
    category: 'nutrition',
  },
  {
    id: 'n8',
    title: '🧂 Sel',
    content: 'L\'excès de sel cause de la rétention d\'eau (jusqu\'à 2 kg !). Réduis le sel transformé pour dégonfler.',
    category: 'nutrition',
  },

  // === SOMMEIL ===
  {
    id: 's1',
    title: '😴 Sommeil et poids',
    content: 'Dormir moins de 7h augmente la ghréline (hormone de la faim) et réduit la leptine (satiété). Tu manges plus sans t\'en rendre compte.',
    category: 'sleep',
  },
  {
    id: 's2',
    title: '🌙 Récupération',
    content: 'Tes muscles se réparent pendant le sommeil. Sans bon sommeil, tes entraînements sont moins efficaces.',
    category: 'sleep',
  },
  {
    id: 's3',
    title: '📱 Écrans',
    content: 'La lumière bleue des écrans bloque la mélatonine. Arrête les écrans 1h avant de dormir pour mieux récupérer.',
    category: 'sleep',
  },
  {
    id: 's4',
    title: '🛏️ Routine',
    content: 'Une routine de coucher régulière améliore la qualité du sommeil. Couche-toi à la même heure, même le week-end.',
    category: 'sleep',
  },
  {
    id: 's5',
    title: '❄️ Température',
    content: 'Une chambre fraîche (18-19°C) favorise l\'endormissement. Le corps doit baisser sa température pour dormir.',
    category: 'sleep',
  },

  // === EXERCICE ===
  {
    id: 'e1',
    title: '🏋️ Musculation',
    content: 'La musculation augmente ton métabolisme de base pendant 24-48h après l\'entraînement (effet EPOC).',
    category: 'exercise',
  },
  {
    id: 'e2',
    title: '🚶 NEAT',
    content: 'Les petits mouvements quotidiens (marche, escaliers, fidgeting) peuvent brûler 300-500 calories par jour.',
    category: 'exercise',
  },
  {
    id: 'e3',
    title: '❤️ Cardio',
    content: 'Le HIIT brûle autant de calories que le cardio classique en moitié moins de temps, et boost le métabolisme après.',
    category: 'exercise',
  },
  {
    id: 'e4',
    title: '🔄 Récupération',
    content: 'Le muscle se construit pendant le repos, pas pendant l\'entraînement. Prévois 48h de récup entre les mêmes groupes musculaires.',
    category: 'exercise',
  },
  {
    id: 'e5',
    title: '📅 Régularité',
    content: '3 entraînements par semaine réguliers > 6 entraînements une semaine puis 0 la semaine suivante.',
    category: 'exercise',
  },
  {
    id: 'e6',
    title: '🎯 Progression',
    content: 'Ajoute progressivement du poids ou des répétitions. Sans progression, pas de résultats (surcharge progressive).',
    category: 'exercise',
  },

  // === HYDRATATION ===
  {
    id: 'h1',
    title: '💧 Eau et faim',
    content: 'On confond souvent faim et soif. Bois un verre d\'eau avant de manger, tu mangeras peut-être moins.',
    category: 'hydration',
  },
  {
    id: 'h2',
    title: '🚰 Métabolisme',
    content: 'Boire 500ml d\'eau froide peut augmenter ton métabolisme de 30% pendant 1h (thermogénèse).',
    category: 'hydration',
  },
  {
    id: 'h3',
    title: '💦 Performances',
    content: 'Une déshydratation de seulement 2% réduit tes performances sportives de 10-20%.',
    category: 'hydration',
  },
  {
    id: 'h4',
    title: '🎨 Urine',
    content: 'Urine jaune clair = bien hydraté. Jaune foncé = bois plus d\'eau !',
    category: 'hydration',
  },

  // === MENTAL ===
  {
    id: 'm1',
    title: '🧠 Stress',
    content: 'Le stress chronique augmente le cortisol, qui favorise le stockage des graisses abdominales.',
    category: 'mental',
  },
  {
    id: 'm2',
    title: '📝 Suivi',
    content: 'Les personnes qui trackent leur alimentation et leur poids perdent 2x plus de poids en moyenne.',
    category: 'mental',
  },
  {
    id: 'm3',
    title: '🎯 Objectifs',
    content: 'Des objectifs SMART (Spécifiques, Mesurables, Atteignables, Réalistes, Temporels) augmentent tes chances de succès de 40%.',
    category: 'mental',
  },
  {
    id: 'm4',
    title: '🏆 Habitudes',
    content: 'Il faut en moyenne 66 jours pour créer une habitude. Sois patient, ça devient automatique après.',
    category: 'mental',
  },
  {
    id: 'm5',
    title: '💪 Motivation',
    content: 'La motivation fluctue, les habitudes restent. Construis des routines plutôt que de compter sur la motivation.',
    category: 'mental',
  },
];

// ============================================
// CONSTANTES
// ============================================

const SETTINGS_KEY = '@yoroi_evening_health_tips_settings';
const SCHEDULED_KEY = '@yoroi_evening_health_tips_scheduled';
const LAST_TIP_KEY = '@yoroi_evening_health_tips_last';
const CHANNEL_ID = 'yoroi-health-tips';

const DEFAULT_SETTINGS: HealthTipSettings = {
  enabled: false,
  time: '22:00',
  days: [0, 1, 2, 3, 4, 5, 6], // Tous les jours
};

// ============================================
// GETTERS/SETTERS
// ============================================

export const getHealthTipSettings = async (): Promise<HealthTipSettings> => {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    logger.error('[HealthTips] Erreur lecture settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const saveHealthTipSettings = async (settings: HealthTipSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    await scheduleHealthTipNotifications();
  } catch (error) {
    logger.error('[HealthTips] Erreur sauvegarde settings:', error);
  }
};

// ============================================
// NOTIFICATIONS
// ============================================

const getRandomTip = async (): Promise<HealthTip> => {
  // Essayer de ne pas répéter le dernier conseil
  const lastTipId = await AsyncStorage.getItem(LAST_TIP_KEY);
  let availableTips = HEALTH_TIPS;

  if (lastTipId) {
    availableTips = HEALTH_TIPS.filter(t => t.id !== lastTipId);
  }

  const tip = availableTips[Math.floor(Math.random() * availableTips.length)];
  await AsyncStorage.setItem(LAST_TIP_KEY, tip.id);

  return tip;
};

export const cancelAllHealthTipNotifications = async (): Promise<void> => {
  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_KEY);
    if (stored) {
      const notifIds: string[] = JSON.parse(stored);
      for (const id of notifIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    }
    await AsyncStorage.removeItem(SCHEDULED_KEY);
    logger.info('[HealthTips] Notifications annulées');
  } catch (error) {
    logger.error('[HealthTips] Erreur annulation:', error);
  }
};

export const scheduleHealthTipNotifications = async (): Promise<boolean> => {
  try {
    const settings = await getHealthTipSettings();

    if (!settings.enabled) {
      await cancelAllHealthTipNotifications();
      return false;
    }

    // Vérifier les permissions
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        logger.warn('[HealthTips] Permission refusée');
        return false;
      }
    }

    // Créer le canal Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Dormir Moins Bête',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: 'Conseils santé du soir',
      });
    }

    // Annuler les anciennes notifications
    await cancelAllHealthTipNotifications();

    const [hours, minutes] = settings.time.split(':').map(Number);
    const scheduledIds: string[] = [];

    // Mélanger les conseils pour en avoir 7 différents
    const shuffledTips = [...HEALTH_TIPS].sort(() => 0.5 - Math.random());
    const weekTips = shuffledTips.slice(0, 7);

    // Planifier pour les 7 prochains jours avec des déclencheurs récurrents
    for (let i = 0; i < 7; i++) {
      const dayIndex = i; // 0 = aujourd'hui, 1 = demain...
      const date = new Date();
      date.setDate(date.getDate() + dayIndex);
      
      const dayOfWeek = date.getDay(); // 0-6
      
      // Vérifier si ce jour de la semaine est activé
      if (!settings.days.includes(dayOfWeek)) {
        continue;
      }

      const tip = weekTips[i];

      const notifId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🌙 ${tip.title}`,
          body: tip.content,
          data: { 
            type: 'health_tip', 
            category: tip.category,
            url: '/ideas' // Rediriger vers la boîte à idées au clic
          },
          sound: true,
          ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: hours,
          minute: minutes,
          weekday: dayOfWeek + 1, // Expo weekday est 1-7 (1=Dimanche)
          repeats: true,
        },
      });

      scheduledIds.push(notifId);
    }

    await AsyncStorage.setItem(SCHEDULED_KEY, JSON.stringify(scheduledIds));
    logger.info(`[HealthTips] ${scheduledIds.length} notifications hebdomadaires planifiées`);
    return true;
  } catch (error) {
    logger.error('[HealthTips] Erreur planification:', error);
    return false;
  }
};

/**
 * Configure l'écouteur de clic sur notification
 */
export const setupNotificationHandler = () => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    if (data?.url === '/ideas') {
      // On utilise un timeout pour s'assurer que le routeur est prêt
      setTimeout(() => {
        try {
          const { router } = require('expo-router');
          router.push('/ideas');
        } catch (e) {
          logger.error('[HealthTips] Erreur navigation notification:', e);
        }
      }, 500);
    }
  });
  return subscription;
};

export const initHealthTipNotifications = async (): Promise<void> => {
  try {
    const settings = await getHealthTipSettings();
    if (settings.enabled) {
      await scheduleHealthTipNotifications();
    }
  } catch (error) {
    logger.error('[HealthTips] Erreur init:', error);
  }
};

// ============================================
// EXPORT
// ============================================

export default {
  getHealthTipSettings,
  saveHealthTipSettings,
  scheduleHealthTipNotifications,
  cancelAllHealthTipNotifications,
  initHealthTipNotifications,
  HEALTH_TIPS,
};
