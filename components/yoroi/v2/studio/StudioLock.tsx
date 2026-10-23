/**
 * Garde des ecrans du Studio (creator-mode, marketing-kit) : sans mode createur actif,
 * un cadenas seulement, et rien du contenu n'est monte. Le jeton est reverifie a chaque
 * ouverture de l'ecran.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Icon, RoundButton } from '@/components/yoroi/v2/espace/ui';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';

export function StudioGate({ children }: { children: React.ReactNode }) {
  const { ready, isCreator, recheck } = useCreatorMode();
  const [checked, setChecked] = React.useState(false);

  useEffect(() => {
    let alive = true;
    recheck()
      .catch(() => false)
      .finally(() => {
        if (alive) setChecked(true);
      });
    return () => {
      alive = false;
    };
  }, [recheck]);

  if (!ready || !checked) return <StudioWait />;
  if (!isCreator) return <StudioLock />;
  return <>{children}</>;
}

function StudioWait() {
  const { theme } = useYoroiTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ChargementPetit />
    </View>
  );
}

/** Un cadenas, rien d'autre */
export function StudioLock() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <RoundButton icon="back" label="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as never))} />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }} accessible accessibilityLabel="Verrouillé">
        <View style={{ width: 96, height: 96, borderRadius: 32, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="lock" size={42} color={c.textMuted} />
        </View>
      </View>
    </View>
  );
}

export default StudioGate;
