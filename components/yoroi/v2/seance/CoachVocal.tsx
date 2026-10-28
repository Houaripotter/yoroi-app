/**
 * Coach vocal (28 octobre 2026) : le bouton de l'en-tête de la séance en direct et sa feuille de choix
 * (Coupé, Discret, Motivant). Réexporte useCoachVocal pour que l'écran de séance n'ait qu'un import.
 * Logique : lib/v2/coachVocal/.
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ChoiceRow, Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { carteBlanche } from '@/components/yoroi/v2/seance/pastel';
import { LANG, traduire } from '@/lib/i18n/tr';
import type { NiveauCoach } from '@/lib/v2/coachVocal/moteur';
import { useNiveauCoach } from '@/lib/v2/coachVocal/reglages';
import { nombreDeFichiers } from '@/lib/v2/coachVocal/sons';

export { useCoachVocal } from '@/lib/v2/coachVocal/useCoachVocal';

export function libelleNiveauCoach(n: NiveauCoach): string {
  return n === 'motivant' ? traduire('Motivant') : n === 'discret' ? traduire('Discret') : traduire('Coupé');
}

export function detailNiveauCoach(n: NiveauCoach): string {
  if (n === 'motivant') return traduire('En plus, des encouragements et ton objectif.');
  if (n === 'discret') return traduire('Le repos, la dernière série, tes records et la fin.');
  return traduire('Aucune voix pendant la séance.');
}

/** Remarque honnête quand la voix ne peut pas encore parler */
export function remarqueCoach(): string | null {
  if (nombreDeFichiers() === 0) return traduire('Les voix arrivent avec une prochaine mise à jour.');
  if (LANG !== 'fr') return traduire('Voix en français seulement pour l’instant.');
  return null;
}

function Casque({ size, color, barre }: { size: number; color: string; barre: boolean }) {
  const p = { stroke: color, strokeWidth: 2.4, fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 15v-3a8 8 0 0 1 16 0v3" {...p} />
      <Path d="M4 15a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2zM20 15a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2z" {...p} />
      {barre ? <Path d="M4 4l16 16" {...p} /> : null}
    </Svg>
  );
}

/** Bouton de l'en-tête : un casque, barré quand le coach est coupé ; ouvre le choix */
export function BoutonCoachVocal() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [niveau, setNiveau] = useNiveauCoach();
  const [ouvert, setOuvert] = useState(false);
  const remarque = remarqueCoach();
  const off = niveau === 'off';
  return (
    <>
      <Pressable
        onPress={() => { selectionAsync().catch(() => {}); setOuvert(true); }}
        accessibilityRole="button"
        accessibilityLabel={traduire('Coach vocal : {0}', libelleNiveauCoach(niveau))}
        style={[carteBlanche(c.surface, c.divider), { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }]}
      >
        <Casque size={20} color={off ? c.textSecondary : c.ink} barre={off} />
      </Pressable>
      <Sheet visible={ouvert} onClose={() => setOuvert(false)} title={traduire('Coach vocal')}>
        <Ink size={14} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>
          {traduire('Une voix dans tes écouteurs pendant la séance. Ta musique baisse le temps d’une phrase, puis remonte.')}
        </Ink>
        <ChoiceRow<NiveauCoach>
          options={[
            { value: 'off', label: libelleNiveauCoach('off') },
            { value: 'discret', label: libelleNiveauCoach('discret') },
            { value: 'motivant', label: libelleNiveauCoach('motivant') },
          ]}
          value={niveau}
          onChange={(v) => { if (v) setNiveau(v); }}
          columns={3}
        />
        <View style={{ paddingHorizontal: 4, gap: 6 }}>
          <Ink size={14} weight="bold">{detailNiveauCoach(niveau)}</Ink>
          {remarque ? <Ink size={13} color={c.textSecondary}>{remarque}</Ink> : null}
        </View>
      </Sheet>
    </>
  );
}
