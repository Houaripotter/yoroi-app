/**
 * Ton accueil (vague 36) : la meme liste que la feuille « Personnaliser l'accueil » en bas de l'accueil.
 * Montre, cache et reordonne les blocs sous la carte Poids. L'ancien ecran (blocs d'espace.accueilBlocs)
 * est archive dans _archive_ancien_design_2026-10-09/vague36/accueil2/accueil.tsx.
 * Vague 41 : les citations (ton style et le rappel motivant), auparavant dans Apparence, sont ici en bas.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Card, EspaceScreen } from '@/components/yoroi/v2/espace/ui';
import { DispositionEditor } from '@/components/yoroi/v2/accueil/Personnaliser';
import { ValueRow } from '@/components/yoroi/v2/espace/reglages/parts';
import { Groupe, TUILE } from '@/components/yoroi/v2/reglages/kit';
import { getCitationNotifSettings } from '@/lib/citations';
import { traduire } from '@/lib/i18n/tr';

export default function TonAccueil() {
  const router = useRouter();
  const [citStyle, setCitStyle] = useState<string | undefined>(undefined);
  useFocusEffect(
    useCallback(() => {
      getCitationNotifSettings()
        .then((cs) => setCitStyle(cs?.enabled ? 'Rappel actif' : traduire('Sans rappel')))
        .catch(() => setCitStyle(undefined));
    }, []),
  );
  return (
    <EspaceScreen title={traduire("Ton accueil")} subtitle={traduire("Les raccourcis et Ton poids restent en haut. Coche ce que tu veux voir dessous, range-le avec les flèches.")}>
      <DispositionEditor />
      <Groupe title="Citations" />
      <Card>
        <ValueRow first tint={TUILE.or} icon="quote" label={traduire("Citation du jour")} sub={traduire("Ton style et le rappel motivant")} value={citStyle} onPress={() => router.push('/citations' as any)} />
      </Card>
    </EspaceScreen>
  );
}
