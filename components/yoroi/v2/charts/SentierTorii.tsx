/**
 * Le chemin vers ton cap (vague 34, refait en vague 42).
 * Vague 42 (Houari : « on ne comprend pas énormément les choses ») : les 18 pierres, que personne ne savait lire,
 * laissent la place a une fine barre de progression evidente :
 *  - « 87,0 kg » a gauche (ton depart), le torii et « 80,0 kg » a droite (ton cap) ;
 *  - ton personnage (le meme que dans la scene de l'accueil, a ton rang) debout sur la barre a ta part du chemin ;
 *  - au-dessus de la barre, « 90 % du chemin » ;
 *  - dessous, centree : « 6,3 kg perdus, plus que 0,7 kg avant ton cap. » (prise de masse : « 3,6 kg pris ») ;
 *  - maintien : pas de barre, une phrase sur l'ecart a ton poids de forme ;
 *  - cap atteint : ton personnage au bout, le torii en or, « Cap atteint le 24 août ».
 * Le mot « torii » ne s'ecrit plus dans les phrases : on dit « cap », le torii reste le symbole. Tout vient de tes
 * vraies pesees. Ancienne version (pierres) : _archive_ancien_design_2026-10-09/vague42/carte42/.
 */
import React, { useRef, useState } from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ink } from '../Ink';
import { MARGE_STABLE, jourCourt } from '@/lib/v2/pesee/ligneDirectrice';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { POIDS } from './CourbePoids';
import { ToriiImage } from './ToriiImage';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

export type ModeSentier = 'perte' | 'prise' | 'maintien';

const TORII_W = 22;
const PERSO_W = 20;
const BARRE_H = 6;
/** hauteur de la zone de la barre : le personnage debout dessus */
const HAUT = 30;

/** 80,7 : toujours une decimale, comme le grand chiffre */
const kg1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', DECIMAL);

type Morceau = { t: string; k?: 'kg' | 'ok' };

type Props = {
  depart: number;
  cap: number;
  actuel: number;
  mode: ModeSentier;
  /** date du torii (arrivee prevue, ou vraie arrivee si atteint) */
  torii?: string | null;
  atteint?: boolean;
  /** ton personnage en pied, a ton rang (image de l'accueil) */
  personnage: ImageSourcePropType;
};

/** La part du chemin (0 a 1) et la phrase, mots cles a part */
export function phraseSentier({ depart, cap, actuel, mode, torii, atteint }: Omit<Props, 'personnage'>): { pct: number | null; parts: Morceau[] } {
  if (mode === 'maintien') {
    const ecart = actuel - cap;
    const marge = cap * MARGE_STABLE;
    if (Math.abs(ecart) <= marge) return { pct: null, parts: [{ t: traduire('Dans ta zone de forme'), k: 'ok' }, { t: traduire(', à ') }, { t: `${kg1(Math.abs(ecart))} kg`, k: 'kg' }, { t: traduire(" de ton poids de forme de {0} kg.", kg1(cap)) }] };
    return { pct: null, parts: [{ t: `${kg1(Math.abs(ecart))} kg`, k: 'kg' }, { t: ecart > 0 ? traduire(" de plus que ton poids de forme de {0} kg, ta zone va de {1} à {2} kg.", kg1(cap), kg1(cap - marge), kg1(cap + marge)) : traduire(" en dessous de ton poids de forme de {0} kg, ta zone va de {1} à {2} kg.", kg1(cap), kg1(cap - marge), kg1(cap + marge)) }] };
  }
  const perte = mode === 'perte';
  const span = Math.abs(depart - cap);
  const fait = perte ? depart - actuel : actuel - depart;
  const reste = Math.max(0, perte ? actuel - cap : cap - actuel);
  const pct = atteint ? 1 : span < 0.05 ? 0 : Math.max(0, Math.min(1, fait / span));
  if (atteint) {
    const parts: Morceau[] = [{ t: torii ? traduire("Cap atteint le {0}", jourCourt(torii)) : traduire('Cap atteint'), k: 'ok' }];
    if (Math.abs(fait) >= 0.05) parts.push({ t: ', ' }, { t: `${kg1(Math.abs(fait))} kg`, k: 'kg' }, { t: perte ? traduire(' perdus') : traduire(' pris') });
    parts.push({ t: '.' });
    return { pct, parts };
  }
  const parts: Morceau[] = [];
  if (Math.abs(fait) < 0.05) parts.push({ t: traduire('Ton chemin commence') });
  else if (fait > 0) parts.push({ t: `${kg1(fait)} kg`, k: 'kg' }, { t: perte ? traduire(' perdus') : traduire(' pris') });
  else parts.push({ t: `${kg1(-fait)} kg`, k: 'kg' }, { t: perte ? traduire(" pris depuis ton départ") : traduire(" perdus depuis ton départ") });
  parts.push({ t: traduire(', plus que ') }, { t: `${kg1(reste)} kg`, k: 'kg' }, { t: traduire(' avant ton cap.') });
  return { pct, parts };
}

/** La barre : le fond gris, la part faite dans le degrade de ta courbe */
function Barre({ w, pct }: { w: number; pct: number }) {
  const id = useRef(`yst${Math.random().toString(36).slice(2, 8)}`).current;
  const fond = paletteSombre() ? '#2E3240' : '#E6E3EC';
  const fait = Math.max(pct > 0 ? BARRE_H : 0, w * pct);
  return (
    <Svg width={w} height={BARRE_H}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={POIDS.c1} />
          <Stop offset="1" stopColor={POIDS.c3} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={BARRE_H} rx={BARRE_H / 2} fill={fond} />
      {fait > 0 ? <Rect x={0} y={0} width={Math.min(w, fait)} height={BARRE_H} rx={BARRE_H / 2} fill={`url(#${id})`} /> : null}
    </Svg>
  );
}

export function SentierTorii(props: Props) {
  const { depart, cap, mode, torii = null, atteint = false, personnage } = props;
  const [w, setW] = useState(0);
  const { pct, parts } = phraseSentier(props);
  // a 375 points de large, la phrase tient sur une ligne un peu plus petite
  const fs = w > 0 && w < 230 ? 12.5 : 13.5;
  const phrase = (
    <Ink size={fs} weight="medium" color={POIDS.encre} style={{ marginTop: mode === 'maintien' ? 0 : 8, lineHeight: Math.round(fs * 1.45), textAlign: 'center', paddingHorizontal: 6 }}>
      {parts.map((p, i) =>
        p.k ? (
          <Ink key={i} size={fs} weight="extraBold" color={p.k === 'kg' ? POIDS.c2 : POIDS.capText}>
            {p.t}
          </Ink>
        ) : (
          <Ink key={i} size={fs} weight="medium" color={POIDS.encre}>
            {p.t}
          </Ink>
        ),
      )}
    </Ink>
  );
  const texte = parts.map((p) => p.t).join('');

  if (mode === 'maintien' || pct == null) {
    return (
      <View accessible accessibilityLabel={traduire("Ton poids de forme. {0}", texte)}>
        {phrase}
      </View>
    );
  }

  const pctTxt = traduire("{0} % du chemin", Math.round(pct * 100));
  // ton personnage : debout sur la barre a ta part du chemin, jamais coupe au bord
  const persoH = Math.min(HAUT - 4, Math.round((PERSO_W * 800) / 600));
  const cx = Math.min(Math.max(w * pct, PERSO_W * 0.35), Math.max(PERSO_W * 0.35, w - PERSO_W * 0.35));
  // « 90 % du chemin » : au-dessus de la barre, du cote libre de ton personnage (jamais sur lui)
  const etiquette = atteint ? traduire('tout le chemin') : pctTxt;
  const tw = etiquette.length * 6 + 6;
  const libreG = cx - PERSO_W / 2 > tw;
  const libreD = w - (cx + PERSO_W / 2) > tw;
  const cote: 'g' | 'd' | null = pct >= 0.5 ? (libreG ? 'g' : libreD ? 'd' : null) : libreD ? 'd' : libreG ? 'g' : null;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={traduire("Ton chemin vers ton cap. Départ {0} kilos, cap {1} kilos{2}. {3}. {4}", kg1(depart), kg1(cap), torii && !atteint ? `, arrivée prévue le ${jourCourt(torii)}` : '', pctTxt, texte)}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <Ink size={12} weight="extraBold" color={POIDS.encre} numberOfLines={1} style={{ marginBottom: -2, fontVariant: ['tabular-nums'] }}>
          {`${kg1(depart)} kg`}
        </Ink>
        <View style={{ flex: 1, height: HAUT }} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
          {w > 0 ? (
            <>
              {cote ? (
                <Ink size={11} weight="bold" color={POIDS.axe} numberOfLines={1} style={{ position: 'absolute', top: 3, ...(cote === 'g' ? { left: 0 } : { right: 0 }) }}>
                  {etiquette}
                </Ink>
              ) : null}
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: 2 }}>
                <Barre w={w} pct={pct} />
              </View>
              <Image
                source={personnage}
                style={{ position: 'absolute', left: cx - PERSO_W / 2, bottom: 5, width: PERSO_W, height: persoH }}
                resizeMode="contain"
                fadeDuration={0}
                accessibilityIgnoresInvertColors
              />
            </>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
          <ToriiImage width={TORII_W} halo={atteint} />
          <Ink size={12} weight="extraBold" color={POIDS.capText} numberOfLines={1} style={{ marginBottom: -2, fontVariant: ['tabular-nums'] }}>
            {`${kg1(cap)} kg`}
          </Ink>
        </View>
      </View>
      {phrase}
    </View>
  );
}

export default SentierTorii;
