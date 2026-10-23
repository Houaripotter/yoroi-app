/**
 * Ton chemin vers le torii (vague 33, carte Poids de l'accueil et detail du poids) : une seule barre de progression,
 * a la place de la jauge en arc et des cases Perdu, Objectif, Reste.
 *  - a gauche ton depart, a droite le torii et ton cap, un repere « Toi » a ta place, dans le degrade de la courbe ;
 *  - dessous, une phrase claire : « 6,3 kg perdus, plus que 0,7 kg avant ton torii, arrivée prévue le 18 févr. » ;
 *  - le pourcentage du chemin reste discret, en haut a droite ;
 *  - prise de masse : les memes reperes, « pris » au lieu de « perdus » ; maintien : ta zone de forme a plus ou moins
 *    1 % de ton cap (la meme marge que la ligne directrice) ; cap atteint : la barre pleine et le torii en or.
 * Tout vient de tes vraies pesees, de ton depart et de ton cap. Aucune date si le torii n'en a pas.
 */
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ink } from '../Ink';
import { MARGE_STABLE, jourCourt } from '@/lib/v2/pesee/ligneDirectrice';
import { POIDS, ToriiIcone } from './CourbePoids';

const PISTE = '#EEEDF4';
const BAR_H = 10;
const TORII_W = 26;

/** 80,7 : toujours une decimale, comme le grand chiffre */
const kg1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');

export type ModeChemin = 'perte' | 'prise' | 'maintien';

type Props = {
  depart: number;
  cap: number;
  actuel: number;
  mode: ModeChemin;
  /** date du torii (arrivee prevue, ou vraie arrivee si atteint) */
  torii?: string | null;
  atteint?: boolean;
  /** largeur de la carte etroite : textes un cran plus petits */
  compact?: boolean;
};

let seq = 0;

/** Le texte du chemin, pour l'accessibilite et la phrase */
export function phraseChemin({ depart, cap, actuel, mode, torii, atteint }: Props): { pct: number | null; parts: { t: string; k?: 'kg' | 'date' | 'ok' }[] } {
  if (mode === 'maintien') {
    const ecart = actuel - cap;
    const marge = cap * MARGE_STABLE;
    if (Math.abs(ecart) <= marge) return { pct: null, parts: [{ t: 'Dans ta zone de forme', k: 'ok' }, { t: `, à ${kg1(Math.abs(ecart))} kg de ton cap de ${kg1(cap)} kg.` }] };
    return { pct: null, parts: [{ t: `${kg1(Math.abs(ecart))} kg`, k: 'kg' }, { t: ` ${ecart > 0 ? 'au-dessus' : 'en dessous'} de ton cap de ${kg1(cap)} kg, ta zone va de ${kg1(cap - marge)} à ${kg1(cap + marge)} kg.` }] };
  }
  const perte = mode === 'perte';
  const span = Math.abs(depart - cap);
  const fait = perte ? depart - actuel : actuel - depart;
  const reste = Math.max(0, perte ? actuel - cap : cap - actuel);
  const pct = atteint ? 1 : span < 0.05 ? 0 : Math.max(0, Math.min(1, fait / span));
  const verbe = perte ? 'perdus' : 'pris';
  const contraire = perte ? 'pris' : 'perdus';
  if (atteint) {
    return {
      pct,
      parts: [
        { t: torii ? `Cap atteint le ${jourCourt(torii)}` : 'Cap atteint', k: 'ok' },
        { t: ' : ' },
        { t: `${kg1(Math.abs(fait))} kg ${verbe}`, k: 'kg' },
        { t: ' depuis ton départ. Garde ce cap.' },
      ],
    };
  }
  const parts: { t: string; k?: 'kg' | 'date' | 'ok' }[] = [];
  if (Math.abs(fait) < 0.05) parts.push({ t: 'Ton chemin commence' });
  else if (fait > 0) parts.push({ t: `${kg1(fait)} kg ${verbe}`, k: 'kg' });
  else parts.push({ t: `${kg1(-fait)} kg ${contraire}`, k: 'kg' }, { t: ' depuis ton départ' });
  parts.push({ t: ', plus que ' }, { t: `${kg1(reste)} kg`, k: 'kg' }, { t: ' avant ton torii' });
  if (torii) parts.push({ t: ', arrivée prévue le ' }, { t: jourCourt(torii), k: 'date' });
  // « févr. » finit deja par un point
  if (!parts[parts.length - 1].t.endsWith('.')) parts.push({ t: '.' });
  return { pct, parts };
}

export function CheminTorii(props: Props) {
  const { depart, cap, actuel, mode, torii = null, atteint = false, compact } = props;
  const [w, setW] = useState(0);
  const id = useRef(`ych${++seq}`).current;
  const { pct, parts } = phraseChemin(props);
  const fs = compact ? 13.5 : 14.5;

  // maintien : une zone a plus ou moins 1 % du cap, sur une echelle a plus ou moins 3 %
  const maintien = mode === 'maintien';
  const trackW = Math.max(0, w - TORII_W - 6);
  let markX = 0;
  let zone: { x: number; w: number } | null = null;
  if (maintien) {
    const lo = cap * (1 - 3 * MARGE_STABLE);
    const hi = cap * (1 + 3 * MARGE_STABLE);
    const X = (v: number) => ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * trackW;
    zone = { x: X(cap * (1 - MARGE_STABLE)), w: X(cap * (1 + MARGE_STABLE)) - X(cap * (1 - MARGE_STABLE)) };
    markX = X(actuel);
  } else markX = (pct ?? 0) * trackW;

  const toiTxt = `Toi ${kg1(actuel)} kg`;
  const toiW = Math.round(toiTxt.length * 6.6 + 18);
  const toiLeft = Math.min(Math.max(markX - toiW / 2, 0), Math.max(0, trackW - toiW));
  const label = parts.map((p) => p.t).join('');
  const titre = maintien ? 'Ta zone de forme' : 'Ton chemin vers le torii';

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={`${titre}. ${maintien ? '' : `Départ ${kg1(depart)} kilos, cap ${kg1(cap)} kilos, toi ${kg1(actuel)} kilos. `}${label}`} accessibilityValue={pct != null ? { min: 0, max: 100, now: Math.round(pct * 100) } : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <Ink size={12.5} weight="extraBold" color={POIDS.axe} numberOfLines={1} style={{ flexShrink: 1 }}>
          {titre}
        </Ink>
        {pct != null ? (
          <Ink size={12.5} weight="bold" color={POIDS.axe} numberOfLines={1}>
            {atteint ? '100 %' : `${Math.round(pct * 100)} % du chemin`}
          </Ink>
        ) : null}
      </View>

      {/* repere « Toi » au-dessus de ta place */}
      <View style={{ height: 26, marginTop: 8 }} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
        {w > 0 ? (
          <View style={{ position: 'absolute', left: toiLeft, top: 0, width: toiW, height: 22, borderRadius: 11, backgroundColor: POIDS.encre, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={11.5} weight="extraBold" color={POIDS.surEncre} numberOfLines={1}>
              {toiTxt}
            </Ink>
          </View>
        ) : null}
      </View>

      {/* la barre, le torii au bout */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 26 }}>
        {w > 0 ? (
          <Svg width={trackW} height={22}>
            <Defs>
              <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={POIDS.c1} />
                <Stop offset="0.55" stopColor={POIDS.c2} />
                <Stop offset="1" stopColor={POIDS.c3} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={6} width={trackW} height={BAR_H} rx={BAR_H / 2} fill={PISTE} />
            {zone ? <Rect x={zone.x} y={6} width={Math.max(4, zone.w)} height={BAR_H} rx={BAR_H / 2} fill={POIDS.cap} fillOpacity={0.28} /> : null}
            {!maintien && markX > 1 ? <Rect x={0} y={6} width={Math.max(BAR_H, markX)} height={BAR_H} rx={BAR_H / 2} fill={`url(#${id}g)`} /> : null}
            <Circle cx={Math.min(Math.max(markX, 8), trackW - 8)} cy={11} r={8} fill={POIDS.c3} fillOpacity={0.16} />
            <Circle cx={Math.min(Math.max(markX, 8), trackW - 8)} cy={11} r={5.5} fill="#FFFFFF" stroke={maintien ? POIDS.cap : POIDS.c3} strokeWidth={3} />
          </Svg>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View style={{ width: TORII_W, alignItems: 'center' }}>
          <ToriiIcone size={24} color={atteint ? POIDS.or : POIDS.encre} />
        </View>
      </View>

      {/* depart a gauche, cap a droite */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, gap: 10 }}>
        <Ink size={12.5} weight="bold" color={POIDS.axe} numberOfLines={1}>
          {maintien ? `${kg1(cap * (1 - MARGE_STABLE))} kg` : 'Départ '}
          {maintien ? null : (
            <Ink size={12.5} weight="extraBold" color={POIDS.encre}>
              {`${kg1(depart)} kg`}
            </Ink>
          )}
        </Ink>
        <Ink size={12.5} weight="bold" color={POIDS.axe} numberOfLines={1}>
          {maintien ? `${kg1(cap * (1 + MARGE_STABLE))} kg` : 'Cap '}
          {maintien ? null : (
            <Ink size={12.5} weight="extraBold" color={POIDS.capText}>
              {`${kg1(cap)} kg`}
            </Ink>
          )}
        </Ink>
      </View>

      {/* la phrase, mots cles en couleur */}
      <Ink size={fs} weight="medium" color={POIDS.encre} style={{ marginTop: 10, lineHeight: Math.round(fs * 1.45) }}>
        {parts.map((p, i) =>
          p.k ? (
            <Ink key={i} size={fs} weight="extraBold" color={p.k === 'kg' ? POIDS.softText : p.k === 'date' ? POIDS.or : POIDS.capText}>
              {p.t}
            </Ink>
          ) : (
            <Ink key={i} size={fs} weight="medium" color={POIDS.encre}>
              {p.t}
            </Ink>
          ),
        )}
      </Ink>
    </View>
  );
}

export default CheminTorii;
