// ============================================
// YOROI - SERVICE CONSEILS DU SOIR
// ============================================
// Notifications du soir avec des conseils santé/poids
// À 22h chaque soir pour apprendre quelque chose avant de dormir

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './security/logger';
import { saveNotification } from './notificationHistoryService';
import { traduire } from '@/lib/i18n/tr';

// ============================================
// TYPES
// ============================================

export interface HealthTipSettings {
  enabled: boolean;
  time: string; // HH:mm format (default: 22:00)
  days: number[]; // 0-6 (0 = dimanche)
}

export interface HealthTip {
  id: string;
  title: string;
  content: string;
  category: 'weight' | 'nutrition' | 'sleep' | 'exercise' | 'hydration' | 'mental';
}

// ============================================
// CONSEILS DU SOIR (35 conseils, tutoiement, sans promesse médicale)
// ============================================

export const HEALTH_TIPS: HealthTip[] = [
  // === POIDS ===
  {
    id: "w1",
    title: traduire("Le muscle dépense"),
    content: traduire("Le muscle consomme plus d'énergie que la graisse, même au repos. Entretenir ta masse musculaire aide à garder une bonne dépense."),
    category: 'weight',
  },
  {
    id: "w2",
    title: traduire("Poids qui bouge"),
    content: traduire("Ton poids peut varier d'un ou deux kilos dans la journée. L'eau, le sel et les repas jouent. Regarde la tendance sur plusieurs jours."),
    category: 'weight',
  },
  {
    id: "w3",
    title: traduire("Rythme de perte"),
    content: traduire("Perdre trop vite fait souvent perdre du muscle. Un rythme de 0,5 à 1 kg par semaine se tient mieux."),
    category: 'weight',
  },
  {
    id: "w4",
    title: traduire("Petit écart chaque jour"),
    content: traduire("Un kilo de graisse représente environ 7 700 kcal. Un petit écart tenu chaque jour suffit, inutile de te priver d'un coup."),
    category: 'weight',
  },
  {
    id: "w5",
    title: traduire("Même poids, autre silhouette"),
    content: traduire("Le muscle prend moins de place que la graisse. À poids égal, ta silhouette peut changer. Ton tour de taille le montre mieux que la balance."),
    category: 'weight',
  },
  {
    id: "w6",
    title: "Plateau",
    content: traduire("Un plateau est normal, ton corps s'adapte. Laisse passer deux ou trois semaines avant de changer tes repas ou ton entraînement."),
    category: 'weight',
  },
  {
    id: "w7",
    title: traduire("Bien te peser"),
    content: traduire("Pèse-toi toujours dans les mêmes conditions : le matin, à jeun, après être passé aux toilettes."),
    category: 'weight',
  },

  // === NUTRITION ===
  {
    id: "n1",
    title: traduire("Protéines"),
    content: traduire("Les protéines calent bien et protègent ton muscle quand tu surveilles ton poids. Mets-en une source à chaque repas."),
    category: 'nutrition',
  },
  {
    id: "n2",
    title: traduire("Taille des portions"),
    content: traduire("Une assiette plus petite aide à te servir moins sans te sentir frustré. L'œil compte autant que l'estomac."),
    category: 'nutrition',
  },
  {
    id: "n3",
    title: "Bonnes graisses",
    content: traduire("Les graisses ne sont pas l'ennemi. Avocat, noix, huile d'olive : ton corps en a besoin, en quantité raisonnable."),
    category: 'nutrition',
  },
  {
    id: "n4",
    title: traduire("Glucides"),
    content: traduire("Les glucides sont ton carburant pour l'entraînement. Riz complet, patate douce, flocons d'avoine donnent une énergie plus stable."),
    category: 'nutrition',
  },
  {
    id: "n5",
    title: traduire("Jeûne intermittent"),
    content: traduire("Le jeûne 16/8 n'a rien de magique : il aide surtout à manger moins. S'il ne te convient pas, tu ne rates rien."),
    category: 'nutrition',
  },
  {
    id: "n6",
    title: "Petits plaisirs",
    content: traduire("Tout t'interdire mène souvent au craquage. Garde une petite place pour le plaisir, c'est ce qui permet de tenir."),
    category: 'nutrition',
  },
  {
    id: "n7",
    title: "Fibres",
    content: traduire("Légumes, fruits, légumineuses, céréales complètes : les fibres calent et aident la digestion. Vise environ 25 à 30 g par jour."),
    category: 'nutrition',
  },
  {
    id: "n8",
    title: "Sel",
    content: traduire("Trop de sel fait retenir de l'eau et gonfle le chiffre de la balance. Les plats préparés en contiennent beaucoup."),
    category: 'nutrition',
  },

  // === SOMMEIL ===
  {
    id: "s1",
    title: traduire("Sommeil et faim"),
    content: traduire("Après une mauvaise nuit, la faim est souvent plus forte. Bien dormir aide aussi à mieux manger."),
    category: 'sleep',
  },
  {
    id: "s2",
    title: traduire("Récupérer en dormant"),
    content: traduire("C'est pendant le sommeil que ton corps récupère de l'entraînement. Mal dormir, c'est moins profiter de tes séances."),
    category: 'sleep',
  },
  {
    id: "s3",
    title: traduire("Écrans"),
    content: traduire("La lumière des écrans retarde l'endormissement. Essaie de les poser une heure avant de te coucher."),
    category: 'sleep',
  },
  {
    id: "s4",
    title: traduire("Heures fixes"),
    content: traduire("Te coucher et te lever à heures fixes aide ton sommeil, week-end compris."),
    category: 'sleep',
  },
  {
    id: "s5",
    title: traduire("Chambre fraîche"),
    content: traduire("Une chambre autour de 18 °C aide à t'endormir. Ton corps baisse sa température pour trouver le sommeil."),
    category: 'sleep',
  },

  // === EXERCICE ===
  {
    id: "e1",
    title: "Musculation",
    content: traduire("La musculation entretient ton muscle et ta force. Elle reste utile quand ton objectif est de perdre du poids."),
    category: 'exercise',
  },
  {
    id: "e2",
    title: traduire("Bouger hors du sport"),
    content: traduire("Marcher, prendre les escaliers, rester moins assis : ces petits gestes pèsent lourd dans ta dépense de la journée."),
    category: 'exercise',
  },
  {
    id: "e3",
    title: traduire("Fractionné"),
    content: traduire("Le fractionné intense donne beaucoup en peu de temps. Garde-le pour une ou deux séances par semaine, il fatigue vite."),
    category: 'exercise',
  },
  {
    id: "e4",
    title: traduire("Repos"),
    content: traduire("Ton muscle se renforce pendant le repos. Laisse environ 48 h avant de retravailler à fond les mêmes muscles."),
    category: 'exercise',
  },
  {
    id: "e5",
    title: traduire("Régularité"),
    content: traduire("Trois séances chaque semaine valent mieux que six une semaine puis rien la suivante."),
    category: 'exercise',
  },
  {
    id: "e6",
    title: traduire("Progression"),
    content: traduire("Ajoute petit à petit une répétition ou un peu de charge. C'est ce qui fait progresser sur la durée."),
    category: 'exercise',
  },

  // === HYDRATATION ===
  {
    id: "h1",
    title: traduire("Faim ou soif"),
    content: traduire("On confond parfois faim et soif. Bois un verre d'eau et attends un peu avant de grignoter."),
    category: 'hydration',
  },
  {
    id: "h2",
    title: traduire("Boire tout au long du jour"),
    content: traduire("Garde une bouteille à portée de main. Boire un peu toute la journée est plus simple que tout d'un coup le soir."),
    category: 'hydration',
  },
  {
    id: "h3",
    title: traduire("Eau et entraînement"),
    content: traduire("Même un léger manque d'eau peut te rendre moins efficace à l'entraînement. Bois avant, pendant et après."),
    category: 'hydration',
  },
  {
    id: "h4",
    title: traduire("Repère d'hydratation"),
    content: traduire("Des urines jaune clair indiquent en général que tu bois assez. Plus foncées, pense à boire."),
    category: 'hydration',
  },

  // === MENTAL ===
  {
    id: "m1",
    title: "Stress",
    content: traduire("Le stress qui dure pèse sur ton sommeil et ton appétit. Une marche ou quelques respirations lentes aident à redescendre."),
    category: 'mental',
  },
  {
    id: "m2",
    title: "Suivi",
    content: traduire("Noter ton poids et tes repas t'aide à voir ce qui marche vraiment. Le suivi rend tes progrès visibles."),
    category: 'mental',
  },
  {
    id: "m3",
    title: traduire("Objectifs"),
    content: traduire("Un objectif précis et daté se tient mieux qu'un vague souhait. Par exemple : trois séances par semaine pendant un mois."),
    category: 'mental',
  },
  {
    id: "m4",
    title: "Habitudes",
    content: traduire("Une habitude met souvent plusieurs semaines à s'installer. Sois patient, elle finit par devenir naturelle."),
    category: 'mental',
  },
  {
    id: "m5",
    title: "Motivation",
    content: traduire("La motivation va et vient, les habitudes restent. Mise sur une routine simple plutôt que sur l'envie du moment."),
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
        name: 'Conseils du soir',
        importance: Notifications.AndroidImportance.DEFAULT,
        description: traduire('Conseils santé du soir'),
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
          title: `${tip.title}`,
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

      // Sauvegarder dans l'historique
      saveNotification(tip.title, tip.content, 'health_tip', { category: tip.category }).catch(() => {});
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
