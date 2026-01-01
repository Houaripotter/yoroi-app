import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserSettings } from "@/lib/storage";
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
        if (!settings.username || !settings.gender) {
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