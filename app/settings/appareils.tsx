/**
 * Sante et appareils (13 octobre, soir) : le groupe Connexions de la page Reglages, sorti pour la raccourcir.
 * Memes lignes qu'avant : Apple Sante et ta montre (Health Connect sur Android), Balance connectee.
 * Les marges de l'encoche et du bas (useSafeAreaInsets) sont gerees par EspaceScreen.
 */
import React, { useCallback } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Card, EspaceScreen } from '@/components/yoroi/v2/espace/ui';
import { ValueRow } from '@/components/yoroi/v2/espace/reglages/parts';
import { TUILE } from '@/components/yoroi/v2/reglages/kit';
import { useEspaceStatus } from '@/components/yoroi/v2/espace/reglages/useEspaceStatus';
import { traduire } from '@/lib/i18n/tr';

export default function SanteEtAppareils() {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { status, reload } = useEspaceStatus();
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const sante = status.sante;
  const santeValue = sante ? (sante.mode === 'live' ? traduire('Relié') : traduire('Non relié')) : undefined;
  const android = Platform.OS === 'android';

  return (
    <EspaceScreen title={traduire("Santé et appareils")} subtitle={android ? traduire('Health Connect, ta montre et ta balance') : traduire('Apple Santé, ta montre et ta balance')} gap={14}>
      <Card>
        <ValueRow first tint={TUILE.mousse} icon="heart" label={android ? traduire('Health Connect et montre') : traduire('Apple Santé et ta montre')} value={santeValue} valueColor={sante?.mode === 'live' ? c.successText : undefined} onPress={() => router.push('/health-connect' as any)} />
        <ValueRow tint={TUILE.bleu} icon="scale" label={traduire("Balance connectée")} value="Guides" onPress={() => router.push('/sante/montre' as any)} />
      </Card>
    </EspaceScreen>
  );
}
