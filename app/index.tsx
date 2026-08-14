import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserSettings, saveUserSettings } from "@/lib/storage";
import { getProfile } from "@/lib/database";
import logger from '@/lib/security/logger';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsTour, setNeedsTour] = useState(false);

  useEffect(() => {
    const checkAppState = async () => {
      try {
        // Verifier si l'utilisateur a complete l'onboarding
        const settings = await getUserSettings();

        // Si les données AsyncStorage sont manquantes, verifier SQLite et synchroniser
        if (!settings.username || !settings.gender) {
          try {
            const profile = await getProfile();
            if (profile && profile.name) {
              // Le profil existe dans SQLite, synchroniser vers AsyncStorage
              await saveUserSettings({
                username: profile.name,
                gender: profile.avatar_gender === 'femme' ? 'female' : 'male',
                height: profile.height_cm,
                targetWeight: profile.target_weight,
                onboardingCompleted: true,
              });
              // Ne pas rediriger vers onboarding, les données sont maintenant synchronisees
              setIsLoading(false);
              return;
            }
          } catch (dbError) {
            logger.warn("Erreur lecture profil SQLite:", dbError);
          }
          // Aucun profil trouve, onboarding necessaire
          setNeedsOnboarding(true);
        }
      } catch (error) {
        logger.error("Erreur verification etat app:", error);
        // En cas d'erreur, NE PAS rediriger vers l'onboarding — l'utilisateur a déjà onboardé.
        // On laisse l'app ouvrir normalement pour ne pas rejouer la musique d'intro.
      } finally {
        setIsLoading(false);
      }
    };

    checkAppState();
    // Vérifie si le tour onboarding a été fait (hors de checkAppState pour pouvoir
    // afficher le tour APRÈS l'onboarding principal, pas à la place)
    AsyncStorage.getItem('@yoroi_onboarding_tour_done').then(v => {
      if (v !== 'true') setNeedsTour(true);
    }).catch(() => {});
  }, []);

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: "#0D0D0F" }} />;
  }

  if (needsOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  // Tour post-onboarding : nouveau user qui découvre les features
  if (needsTour) {
    return <Redirect href="/onboarding-tour" />;
  }

  return <Redirect href="/(tabs)" />;
}
