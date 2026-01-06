import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserSettings, saveUserSettings } from "@/lib/storage";
import { getProfile } from "@/lib/database";
import logger from '@/lib/security/logger';

const LEGAL_ACCEPTED_KEY = '@yoroi_legal_accepted';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [needsLegalAcceptance, setNeedsLegalAcceptance] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkAppState = async () => {
      try {
        // 1. Vérifier si le disclaimer légal a été accepté
        const legalAccepted = await AsyncStorage.getItem(LEGAL_ACCEPTED_KEY);
        if (!legalAccepted) {
          setNeedsLegalAcceptance(true);
          setIsLoading(false);
          return;
        }

        // 2. Vérifier si l'utilisateur a complété l'onboarding
        const settings = await getUserSettings();

        // Si les données AsyncStorage sont manquantes, vérifier SQLite et synchroniser
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
              // Ne pas rediriger vers onboarding, les données sont maintenant synchronisées
              setIsLoading(false);
              return;
            }
          } catch (dbError) {
            logger.warn("Erreur lecture profil SQLite:", dbError);
          }
          // Aucun profil trouvé, onboarding nécessaire
          setNeedsOnboarding(true);
        }
      } catch (error) {
        logger.error("Erreur vérification état app:", error);
        setNeedsLegalAcceptance(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkAppState();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFB" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (needsLegalAcceptance) {
    return <Redirect href="/legal" />;
  }

  if (needsOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}