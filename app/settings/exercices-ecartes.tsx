/**
 * Exercices ecartes (30 octobre 2026) : ceux que tu as ecartes en les remplacant pendant une seance
 * (« Pas dans ma salle », « Ça me fait mal »). « Remettre » les rend de nouveau disponibles.
 * Liste gardee sur ce telephone (lib/v2/seances/exercicesEcartes.ts).
 */
import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, EspaceScreen } from '@/components/yoroi/v2/espace/ui';
import { StickerOuIcone } from '@/components/yoroi/v2/profil/Rubriques';
import { LIBELLE_RAISON, chargerEcartes, remettreExercice, type Ecarte } from '@/lib/v2/seances/exercicesEcartes';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire } from '@/lib/i18n/tr';

export default function ExercicesEcartes() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [liste, setListe] = useState<Ecarte[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      chargerEcartes().then(setListe, () => setListe([]));
    }, []),
  );

  const remettre = (nom: string) => {
    selectionAsync().catch(() => {});
    setListe((l) => (l ?? []).filter((e) => e.nom !== nom));
    remettreExercice(nom).then(setListe, () => {});
  };

  return (
    <EspaceScreen title={traduire('Exercices écartés')} subtitle={traduire('Ceux que tu as écartés en séance. Ils ne te sont plus proposés.')} gap={14}>
      <Card>
        {liste && liste.length === 0 ? (
          <View style={{ paddingVertical: 16, paddingHorizontal: 4 }}>
            <Ink size={15} color={c.textSecondary}>{traduire('Aucun exercice écarté.')}</Ink>
          </View>
        ) : null}
        {(liste ?? []).map((e, i) => (
          <View key={e.nom} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider }}>
            <StickerOuIcone sticker={e.raison === 'salle' ? 'barre' : 'recuperation'} icon={e.raison === 'salle' ? 'dumbbell' : 'heart'} size={36} />
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={15} weight="extraBold" numberOfLines={2}>{sansTiret(traduire(nomFr(e.nom)))}</Ink>
              <Ink size={12.5} color={c.textSecondary}>{traduire(LIBELLE_RAISON[e.raison])}</Ink>
            </View>
            <Pressable onPress={() => remettre(e.nom)} accessibilityRole="button" accessibilityLabel={traduire('Remettre {0}', sansTiret(traduire(nomFr(e.nom))))} style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.fillSoft })}>
              <Ink size={14} weight="extraBold" color={c.accentText}>{traduire('Remettre')}</Ink>
            </Pressable>
          </View>
        ))}
      </Card>
    </EspaceScreen>
  );
}
