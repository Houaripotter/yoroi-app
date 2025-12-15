import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, View, Text } from "react-native";
import { getUserSettings } from "@/lib/storage";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const settings = await getUserSettings();
        // Vérifier si l'utilisateur a complété l'onboarding (nom, genre uniquement)
        if (!settings.username || !settings.gender) {
          setNeedsOnboarding(true);
        }
      } catch (error) {
        console.error("Erreur vérification onboarding:", error);
        setNeedsOnboarding(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboarding();
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