import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserSettings, saveUserSettings } from "@/lib/storage";
import { getProfile } from "@/lib/database";
import logger from '@/lib/security/logger';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkAppState = async () => {
      try {
        // Verifier si l'utilisateur a complete l'onboarding
        const settings = await getUserSettings();

        // Si les donnees AsyncStorage sont manquantes, verifier SQLite et synchroniser
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
              // Ne pas rediriger vers onboarding, les donnees sont maintenant synchronisees
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
        setNeedsOnboarding(true);
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

  if (needsOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
