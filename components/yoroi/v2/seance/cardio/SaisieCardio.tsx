/**
 * Pente et vitesse pendant le cardio (31 octobre 2026, Houari : « noter dans l'application ce qu'ils font : la pente
 * et la vitesse »). Tapis : pente en % au pas de 0,5, vitesse en km/h aux pas de 0,5 et 0,1, gros boutons comme la
 * saisie de poids. Velo, rameur, elliptique, escalier : le niveau. Une seule valeur par defaut ; « Noter un
 * changement » ouvre un segment. La plage de zone 2 en bpm, si on la connait (lib/v2/seances/zone2.ts).
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';
import { ton } from '@/components/yoroi/v2/seance/pastel';
import { StickerOuIcone } from '@/components/yoroi/v2/profil/Rubriques';
import { traduire } from '@/lib/i18n/tr';
import { fmtNum } from '@/lib/v2/seance/format';
import { NIVEAU_MAX, NIVEAU_MIN, PAS_PENTE, PAS_VITESSE, PAS_VITESSE_GROS, PENTE_MAX, PENTE_MIN, VITESSE_MAX, infoCardio, segmentCourant } from '@/lib/v2/seances/cardioChoix';
import type { SegmentCardio, TypeCardio, Valeurs } from '@/lib/v2/seances/cardioChoix';
import { fmtChrono } from '@/lib/v2/seances/cardioFin';
import { texteValeurs, texteMethode } from '@/lib/v2/seances/zone2';
import type { Zone2 } from '@/lib/v2/seances/zone2';

/** La plage de zone 2, sur l'ecran du cardio */
export function BandeZone2({ zone }: { zone: Zone2 }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, backgroundColor: ton('menthe').fond, paddingVertical: 10, paddingHorizontal: 12 }}>
      <StickerOuIcone sticker="coeur" icon="heart" size={34} />
      <View style={{ flex: 1 }}>
        <Ink size={15} weight="black" color={ton('menthe').encre}>{traduire('Ta zone 2 : {0} à {1} bpm', zone.min, zone.max)}</Ink>
        <Ink size={12} weight="bold" color={c.textSecondary}>{traduire(texteMethode(zone))}</Ink>
      </View>
    </View>
  );
}

type Props = {
  type: TypeCardio;
  segments: SegmentCardio[];
  ecouleSec: number;
  marche: boolean;
  onValeur: (v: Valeurs) => void;
  onSegment: () => void;
  onRetirerSegment: () => void;
};

export function SaisieCardio({ type, segments, ecouleSec, marche, onValeur, onSegment, onRetirerSegment }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const mesure = infoCardio(type).mesure;
  if (mesure === 'aucune') return null;
  const s = segmentCourant(segments) ?? { aSec: 0 };
  const bloc = (titre: string, enfant: React.ReactNode) => (
    <View style={{ flex: 1, gap: 6, alignItems: 'center', borderRadius: 18, backgroundColor: c.fillSoft, paddingVertical: 10, paddingHorizontal: 6 }}>
      <Ink size={13} weight="extraBold" color={c.textSecondary}>{titre}</Ink>
      {enfant}
    </View>
  );
  return (
    <View style={{ gap: 10 }}>
      {segments.length > 1 ? (
        <View style={{ gap: 4 }}>
          {segments.slice(0, -1).map((x, i) => (
            <Ink key={i} size={13} weight="bold" color={c.textSecondary}>{traduire('Dès {0} : {1}', fmtChrono(x.aSec), texteValeurs(x) || traduire('rien noté'))}</Ink>
          ))}
          <Ink size={13} weight="black" color={c.ink}>{traduire('Depuis {0}', fmtChrono(s.aSec))}</Ink>
        </View>
      ) : null}
      {mesure === 'tapis' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {bloc(traduire('Pente'), (
            <Stepper layout="stack" value={s.pente ?? 0} step={PAS_PENTE} min={PENTE_MIN} max={PENTE_MAX} decimals unit={traduire('pour cent de pente')} size={34} button={46} uniteForte="%" format={(v) => fmtNum(v)} onChange={(v) => onValeur({ pente: v })} />
          ))}
          {bloc(traduire('Vitesse'), (
            <Stepper layout="stack" value={s.vitesse ?? 0} step={PAS_VITESSE_GROS} fine={PAS_VITESSE} min={0} max={VITESSE_MAX} decimals unit={traduire('kilomètres par heure')} size={34} button={46} uniteForte="km/h" format={(v) => fmtNum(v)} onChange={(v) => onValeur({ vitesse: v })} />
          ))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          {bloc(traduire('Niveau ou résistance'), (
            <Stepper layout="stack" value={s.niveau ?? 0} step={1} min={0} max={NIVEAU_MAX} unit={traduire('niveau')} size={34} button={46} format={(v) => (v >= NIVEAU_MIN ? String(v) : traduire('Aucun'))} onChange={(v) => onValeur({ niveau: v })} />
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, paddingHorizontal: 4 }}>
        {ecouleSec > 0 || marche ? (
          <Pressable onPress={onSegment} accessibilityRole="button" hitSlop={6} style={{ minHeight: 36, justifyContent: 'center' }}>
            <Ink size={13} weight="extraBold" color={c.accentText}>{traduire('Noter un changement à {0}', fmtChrono(ecouleSec))}</Ink>
          </Pressable>
        ) : null}
        {segments.length > 1 ? (
          <Pressable onPress={onRetirerSegment} accessibilityRole="button" hitSlop={6} style={{ minHeight: 36, justifyContent: 'center' }}>
            <Ink size={13} weight="extraBold" color={c.textSecondary}>{traduire('Retirer le dernier changement')}</Ink>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
