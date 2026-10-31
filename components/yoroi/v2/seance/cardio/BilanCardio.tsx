/**
 * Bilan du cardio de fin de seance (31 octobre 2026), sous le chrono qui garde la duree : les chiffres cles (distance si elle se calcule de
 * facon fiable, pente moyenne, FC moyenne si Sante l'a), et la zone 2 : une phrase courte, et ce que tu veux pour
 * la prochaine fois. Toi seul decides : la suggestion ne s'applique que si tu la choisis.
 * Sans FC : « Tu pouvais parler ? », approximatif, et c'est dit (lib/v2/seances/zone2.ts).
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ton } from '@/components/yoroi/v2/seance/pastel';
import { StickerOuIcone } from '@/components/yoroi/v2/profil/Rubriques';
import { traduire } from '@/lib/i18n/tr';
import { fmtNum } from '@/lib/v2/seance/format';
import { bilanCardio, infoCardio, segmentCourant } from '@/lib/v2/seances/cardioChoix';
import type { Valeurs } from '@/lib/v2/seances/cardioChoix';
import type { ChronoCardio } from '@/lib/v2/seances/cardioFin';
import { phraseBilan, suggestionZone2, texteValeurs } from '@/lib/v2/seances/zone2';

function Chiffre({ v, l }: { v: string; l: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexGrow: 1, flexBasis: '45%', borderRadius: 16, backgroundColor: c.surface, paddingVertical: 10, paddingHorizontal: 12 }}>
      <Ink size={22} weight="black" tight color={c.ink} style={{ fontVariant: ['tabular-nums'] }}>{v}</Ink>
      <Ink size={12} weight="bold" color={c.textSecondary}>{l}</Ink>
    </View>
  );
}

type Props = {
  chrono: ChronoCardio;
  dureeSec: number;
  /** la FC est en cours de lecture dans Sante */
  lecture?: boolean;
  onParler: (oui: boolean) => void;
  onSuite: (suite: 'garder' | 'suggestion', prochain: Valeurs) => void;
};

export function BilanCardio({ chrono, dureeSec, lecture, onParler, onSuite }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const type = chrono.type ?? 'marche_inclinee';
  const mesure = infoCardio(type).mesure;
  const b = bilanCardio(chrono.segments, dureeSec, mesure);
  const valeurs: Valeurs = { ...(segmentCourant(chrono.segments) ?? {}) };
  delete (valeurs as { aSec?: number }).aSec;
  const s = suggestionZone2({ type, mesure, valeurs, fcMoy: chrono.fcMoy, zone: chrono.zone2, parler: chrono.parler });
  const phrase = s ? phraseBilan(s, valeurs) : null;
  const fc = typeof chrono.fcMoy === 'number' && chrono.fcMoy > 0;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {b.distanceKm ? <Chiffre v={`${fmtNum(b.distanceKm)} km`} l={traduire('distance, d’après la vitesse du tapis')} /> : null}
        {typeof b.penteMoy === 'number' ? <Chiffre v={`${fmtNum(b.penteMoy)} %`} l={traduire('pente moyenne')} /> : null}
        {typeof b.vitesseMoy === 'number' ? <Chiffre v={`${fmtNum(b.vitesseMoy)} km/h`} l={traduire('vitesse moyenne')} /> : null}
        {typeof b.niveauMoy === 'number' ? <Chiffre v={fmtNum(b.niveauMoy)} l={traduire('niveau moyen')} /> : null}
        {fc ? <Chiffre v={`${Math.round(chrono.fcMoy!)} bpm`} l={traduire('FC moyenne')} /> : null}
      </View>

      {fc && chrono.zone2 ? null : lecture ? (
        <Ink size={13} weight="bold" color={c.textSecondary}>{traduire('Lecture de ta fréquence cardiaque dans Santé...')}</Ink>
      ) : typeof chrono.parler !== 'boolean' ? (
        <View style={{ gap: 10, borderRadius: 18, backgroundColor: ton('ciel').fond, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <StickerOuIcone sticker="souffle" icon="heart" size={36} />
            <View style={{ flex: 1 }}>
              <Ink size={16} weight="black" color={ton('ciel').encre}>{traduire('Tu pouvais parler en faisant des phrases ?')}</Ink>
              <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('Pas de fréquence cardiaque pour ce cardio. Ta réponse donne une idée, approximative.')}</Ink>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[true, false].map((oui) => (
              <Pressable key={String(oui)} onPress={() => onParler(oui)} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.surface })}>
                <Ink size={16} weight="black" color={ton('ciel').encre}>{oui ? traduire('Oui') : traduire('Non')}</Ink>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {s && phrase ? (
        <View style={{ gap: 10, borderRadius: 18, backgroundColor: s.verdict === 'dedans' ? c.surface : ton('peche').fond, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <StickerOuIcone sticker={s.verdict === 'dedans' ? 'cardio_zone2' : 'coeur'} icon="heart" size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={16} weight="black" color={s.verdict === 'dedans' ? ton('menthe').encre : ton('peche').encre}>{traduire(phrase.cle, ...phrase.valeurs)}</Ink>
              {s.base === 'fc' && chrono.zone2 ? (
                <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('{0} bpm en moyenne, ta zone 2 : {1} à {2} bpm', Math.round(chrono.fcMoy!), chrono.zone2.min, chrono.zone2.max)}</Ink>
              ) : (
                <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('D’après ton ressenti, c’est approximatif.')}</Ink>
              )}
            </View>
          </View>
          {s.change ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => onSuite('suggestion', s.prochain)} accessibilityRole="button" accessibilityState={{ selected: chrono.suite === 'suggestion' }} style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, backgroundColor: chrono.suite === 'suggestion' ? c.primary : pressed ? c.fillSubtle : c.surface })}>
                <Ink size={14} weight="black" color={chrono.suite === 'suggestion' ? c.onPrimary : c.ink} numberOfLines={2} style={{ textAlign: 'center' }}>{traduire('Prochaine fois : {0}', texteValeurs(s.prochain))}</Ink>
              </Pressable>
              <Pressable onPress={() => onSuite('garder', valeurs)} accessibilityRole="button" accessibilityState={{ selected: chrono.suite === 'garder' }} style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, backgroundColor: chrono.suite === 'garder' ? c.primary : pressed ? c.fillSubtle : c.surface })}>
                <Ink size={14} weight="black" color={chrono.suite === 'garder' ? c.onPrimary : c.ink} numberOfLines={2} style={{ textAlign: 'center' }}>{traduire('Garder {0}', texteValeurs(valeurs))}</Ink>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
