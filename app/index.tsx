import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { AppState, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserSettingsStrict, saveUserSettings } from "@/lib/storage";
import { getProfile, getTrainingsCount } from "@/lib/database";
import logger from '@/lib/security/logger';

// Marqueur durable "onboarding terminé" (posé par l'onboarding et la restauration de sauvegarde)
const ONBOARDING_DONE_KEY = 'yoroi_onboarding_done';

type Destination = 'onboarding' | 'tabs';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Exécute une lecture avec 3 tentatives espacées de 500 ms.
 * Renvoie { ok: false } si toutes les tentatives échouent (au lieu de lancer).
 */
async function readWithRetry<T>(label: string, fn: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return { ok: true, value: await fn() };
    } catch (error) {
      logger.warn(`[Index] Lecture ${label} échouée (tentative ${attempt}/3):`, error);
      if (attempt < 3) await sleep(500);
    }
  }
  return { ok: false };
}

/**
 * Attend que l'app soit réellement au premier plan.
 * iOS peut lancer Yoroi en arrière-plan (HealthKit background delivery, Watch...),
 * souvent téléphone verrouillé : dans ce cas, on ne décide RIEN et on n'affiche rien.
 */
function waitForActive(): Promise<void> {
  if (AppState.currentState === 'active') return Promise.resolve();
  return new Promise(resolve => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        sub.remove();
        resolve();
      }
    });
  });
}

async function markOnboardingDone() {
  try {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
  } catch {}
}

/**
 * Décide si l'utilisateur doit voir l'onboarding.
 * Règle d'or : l'onboarding ne s'affiche QUE si toutes les lectures ont RÉUSSI
 * et qu'aucune trace d'utilisateur existant n'a été trouvée.
 * Au moindre doute (lecture impossible), on ouvre l'app normalement.
 */
async function isExistingUserOrUnknown(): Promise<boolean> {
  // 1. Marqueur durable
  const flag = await readWithRetry('flag onboarding', () => AsyncStorage.getItem(ONBOARDING_DONE_KEY));
  if (flag.ok && flag.value === 'true') {
    logger.info('[Index] Utilisateur existant (flag onboarding)');
    return true;
  }

  let anyReadFailed = !flag.ok;

  // 2. Réglages (trousseau sécurisé), lecture stricte
  const settings = await readWithRetry('settings', () => getUserSettingsStrict());
  if (settings.ok) {
    if (settings.value.username && settings.value.gender) {
      logger.info('[Index] Utilisateur existant (settings)');
      await markOnboardingDone();
      return true;
    }
  } else {
    anyReadFailed = true;
  }

  // 3. Profil SQLite
  const profile = await readWithRetry('profil SQLite', () => getProfile());
  if (profile.ok) {
    const p = profile.value;
    if (p && p.name) {
      logger.info('[Index] Utilisateur existant (profil SQLite), resynchronisation des settings');
      try {
        await saveUserSettings({
          username: p.name,
          gender: p.avatar_gender === 'femme' ? 'female' : 'male',
          height: p.height_cm,
          targetWeight: p.target_weight,
          onboardingCompleted: true,
        });
      } catch {}
      await markOnboardingDone();
      return true;
    }
  } else {
    anyReadFailed = true;
  }

  // 4. Données existantes (séances)
  const trainings = await readWithRetry('séances', () => getTrainingsCount());
  if (trainings.ok) {
    if (trainings.value.total > 0) {
      logger.info('[Index] Utilisateur existant (séances en base)');
      await markOnboardingDone();
      return true;
    }
  } else {
    anyReadFailed = true;
  }

  if (anyReadFailed) {
    logger.warn('[Index] Lecture impossible, on ouvre l\'app SANS onboarding par sécurité');
    return true;
  }

  logger.info('[Index] Aucun utilisateur trouvé : nouvel utilisateur, onboarding');
  return false;
}

export default function Index() {
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Ne jamais décider (ni lancer l'onboarding et sa musique) en arrière-plan
      await waitForActive();
      if (cancelled) return;

      let dest: Destination = 'tabs';
      try {
        const existing = await isExistingUserOrUnknown();
        if (!existing) {
          dest = 'onboarding';
        } else {
          // Le tour de découverte est réservé aux NOUVEAUX utilisateurs : il est lancé
          // à la fin de l'onboarding. Un utilisateur existant ne le voit jamais
          // (on le marque comme vu pour qu'il n'apparaisse pas après une mise à jour).
          try {
            const tourDone = await AsyncStorage.getItem('@yoroi_onboarding_tour_done');
            if (tourDone !== 'true') await AsyncStorage.setItem('@yoroi_onboarding_tour_done', 'true');
          } catch {}
        }
      } catch (error) {
        // En cas d'erreur inattendue : JAMAIS d'onboarding pour ne pas rejouer la musique d'intro
        logger.error("[Index] Erreur verification etat app:", error);
        dest = 'tabs';
      }

      if (!cancelled) setDestination(dest);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!destination) {
    return <View style={{ flex: 1, backgroundColor: "#0D0D0F" }} />;
  }

  if (destination === 'onboarding') {
    return <Redirect href="/onboarding" />;
  }


  return <Redirect href="/(tabs)" />;
}
