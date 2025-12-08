import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  useFrameworkReady();
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const ensureAuthentication = async () => {
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          console.log(`🔑 [Tentative ${retries + 1}/${maxRetries}] Vérification de la session...`);

          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.error('❌ Erreur getSession:', sessionError);
            retries++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1s avant de réessayer
            continue;
          }

          if (!session) {
            console.log('🔑 Aucune session détectée, authentification anonyme en cours...');
            const { data, error } = await supabase.auth.signInAnonymously();

            if (error) {
              console.error('❌ Erreur authentification anonyme:', error);
              console.error('❌ Détails erreur:', JSON.stringify(error, null, 2));
              retries++;
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }

            console.log('✅ Authentification anonyme réussie:', data.user?.id);
            console.log('✅ Session créée:', data.session ? 'Oui' : 'Non');
          } else {
            console.log('✅ Session existante trouvée:', session.user.id);
          }

          // Vérifier que l'utilisateur est bien authentifié
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            console.error('❌ Impossible de récupérer l\'utilisateur après auth:', userError);
            retries++;
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          console.log('✅ Utilisateur vérifié:', user.id);
          setIsAuthReady(true);
          return; // Succès, on sort de la boucle
        } catch (error) {
          console.error('❌ Erreur lors de la vérification de session:', error);
          retries++;
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      // Si on arrive ici, toutes les tentatives ont échoué
      console.error('❌ ÉCHEC AUTHENTIFICATION après', maxRetries, 'tentatives');
      console.error('⚠️ L\'app va continuer mais les sauvegardes risquent d\'échouer');
      setIsAuthReady(true); // On laisse l'app continuer quand même
    };

    ensureAuthentication();
  }, []);

  // Afficher un écran de chargement pendant l'authentification
  if (!isAuthReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666666' }}>
          Initialisation...
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
