/**
 * La montagne des paliers de la carte « Ton poids » de l'accueil (13 novembre 2026, bloc C « La montagne » choisi par
 * Houari, maquette paliers_version2.png). Elle remplace la ligne de ronds (proposition A du 2 novembre 2026, archivee
 * dans _archive_ancien_design_2026-10-09/paliers_avant_montagne_2026-11-13/).
 * Une montagne pastel au sommet enneige, un chemin qui monte vers ton objectif : la partie faite en degrade violet,
 * rose puis orange, le reste en pointilles gris clair. Un rond blanc par palier, pose sur le chemin : coche et bordure
 * vertes une fois franchi, bordure en pointilles avant. « Palier 1 · 84,8 » a gauche de chaque rond (« P1 · 84,8 »
 * quand la place manque). Le fanion et « Objectif 80,0 » au sommet, la bulle « Toi, 80,6 kg » a ta position.
 * Pas de rouge, pas de rond barre. Le chemin se dessine une fois a l'ouverture, sauf si le mouvement est reduit.
 * La geometrie (positions sur le chemin, partie parcourue) vit dans lib/v2/accueil/montagnePaliers.ts, testee.
 * Les paliers, ceux qui sont franchis et ta progression viennent tels quels de la carte (etatsLignePaliers).
 */
import React, { useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import Reanimated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { LignePaliers } from '@/lib/v2/accueil/lignePaliers';
import { geometrieMontagne, MONTAGNE, texteMontagne } from '@/lib/v2/accueil/montagnePaliers';
import { formatKg } from '@/lib/v2/weightStats';
import { traduire } from '@/lib/i18n/tr';
import { ltrSiRTL } from '@/lib/v2/rtl';
import { P } from './kit';
import { useRemplissage } from './Visus';

/** Les couleurs de la montagne (maquette C), et leurs equivalents lisibles en sombre */
export const COULEURS_MONTAGNE = {
  montagne: { clair: '#DCE3FF', sombre: '#2A3058' },
  neige: { clair: '#FFFFFF', sombre: '#C9D2F2' },
  crete: { clair: '#C7D0F7', sombre: '#3C4473' },
  reste: { clair: '#C3CAE8', sombre: '#4D5679' },
  aVenir: { clair: '#AEB6D9', sombre: '#6A7398' },
  franchi: '#4CC38A',
  degrade: ['#6E4BFF', '#C55BEA', '#FF8A5B'],
  rose: { clair: '#E0619A', sombre: '#F28CB8' },
  bulle: { clair: '#1B2559', sombre: '#E8ECFF' },
  bulleTexte: { clair: '#FFFFFF', sombre: '#1B2559' },
} as const;

const CheminAnime = Reanimated.createAnimatedComponent(Path);

/** Ce que lit VoiceOver (lib/v2/accueil/montagnePaliers.ts), redonne ici pour la carte */
export { texteMontagne };

type Props = {
  /** les paliers et leur etat, tels que la carte les calcule (etatsLignePaliers) */
  ligne: LignePaliers;
  /** ton objectif, ton poids actuel, ta part du chemin (0 a 1) */
  objectif: number;
  actuel: number;
  progression: number;
  atteint: boolean;
  sombre: boolean;
  /** largeur de depart, avant la mesure */
  largeurInitiale: number;
};

export function MontagnePaliers({ ligne, objectif, actuel, progression, atteint, sombre, largeurInitiale }: Props) {
  const C = COULEURS_MONTAGNE;
  const t = sombre ? 'sombre' : 'clair';
  const illus = useIllustrations();
  const [largeur, setLargeur] = useState(largeurInitiale);
  const [largeurBulle, setLargeurBulle] = useState<number>(MONTAGNE.bulleL);
  const n = ligne.paliers.length;
  const g = useMemo(() => geometrieMontagne(largeur, n, atteint ? 1 : progression, largeurBulle), [largeur, n, atteint, progression, largeurBulle]);

  // le chemin se dessine une fois a l'ouverture (sauf mouvement reduit : useRemplissage le pose directement)
  const v = useRemplissage(1, 'montagne-paliers');
  const L = g.longueurParcourue;
  const propsChemin = useAnimatedProps(() => ({ strokeDashoffset: L * (1 - v.value) }));
  // objectif atteint : le fanion fete, il grandit d'un coup a l'arrivee du chemin
  const styleFanion = useAnimatedStyle(() => ({ transform: [{ scale: atteint ? 0.7 + 0.3 * v.value + 0.12 * Math.sin(Math.PI * v.value) : 1 }] }));

  const M = MONTAGNE;
  const b = g.bulle;
  const etiquette = (i: number, kg: number) => (g.court ? traduire('P{0} · {1}', i + 1, formatKg(kg)) : traduire('Palier {0} · {1}', i + 1, formatKg(kg)));
  const xFanion = g.pic.x - M.fanion / 2;
  const xObjectif = g.pic.x + M.fanion / 2 + 2;

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - largeur) > 0.5) setLargeur(w);
      }}
      style={[{ height: g.hauteur, marginTop: 2 }, ltrSiRTL]}
    >
      <Svg width={g.largeur} height={g.hauteur} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <SvgGradient id="montagneDegrade" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={C.degrade[0]} />
            <Stop offset="0.6" stopColor={C.degrade[1]} />
            <Stop offset="1" stopColor={C.degrade[2]} />
          </SvgGradient>
        </Defs>
        <Path d={g.montagne} fill={C.montagne[t]} />
        <Path d={g.neige} fill={C.neige[t]} />
        <Path d={g.crete} fill="none" stroke={C.crete[t]} strokeWidth={1.2} strokeLinejoin="round" />
        {/* le chemin entier en pointilles, puis la partie faite par dessus, en degrade */}
        <Path d={g.chemin} fill="none" stroke={C.reste[t]} strokeWidth={M.trait} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1.5 8" />
        {g.parcouru ? (
          <CheminAnime d={g.parcouru} fill="none" stroke="url(#montagneDegrade)" strokeWidth={M.trait} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${L} ${L}`} animatedProps={propsChemin} />
        ) : null}
        {/* un rond blanc par palier, pose sur le chemin */}
        {g.paliers.map((q, i) => {
          const franchi = ligne.paliers[i]?.etat === 'atteint';
          return (
            <React.Fragment key={`p${i}`}>
              <Circle cx={q.x} cy={q.y} r={M.rond / 2 - 1} fill={P.white} stroke={franchi ? C.franchi : C.aVenir[t]} strokeWidth={2} strokeDasharray={franchi ? undefined : '3 2.6'} />
              {franchi ? (
                <Path d={`M${q.x - 4.6} ${q.y + 0.3}l3.1 3.1l6 -6.4`} fill="none" stroke={C.franchi} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              ) : null}
            </React.Fragment>
          );
        })}
        {/* ta position : un point au bout de la partie faite, et la pointe de ta bulle */}
        <Circle cx={g.toi.x} cy={g.toi.y} r={4.5} fill={C.degrade[2]} stroke={P.white} strokeWidth={2} />
        {b.cote === 'droite' ? (
          <Path d={`M${b.x + 1} ${b.y + b.pointe - M.bulleFleche}L${b.x - M.bulleFleche} ${b.y + b.pointe}L${b.x + 1} ${b.y + b.pointe + M.bulleFleche}Z`} fill={C.bulle[t]} />
        ) : (
          <Path d={`M${b.x + b.pointe - M.bulleFleche} ${b.y + M.bulleH - 1}L${b.x + b.pointe} ${b.y + M.bulleH + M.bulleFleche}L${b.x + b.pointe + M.bulleFleche} ${b.y + M.bulleH - 1}Z`} fill={C.bulle[t]} />
        )}
        {atteint ? (
          // la fete au sommet : quelques confettis autour du fanion
          <>
            <Circle cx={g.pic.x - 20} cy={10} r={2.4} fill={C.degrade[0]} />
            <Circle cx={g.pic.x - 24} cy={26} r={1.8} fill={C.franchi} />
            <Circle cx={g.pic.x + 18} cy={34} r={2} fill={C.degrade[1]} />
            <Circle cx={g.pic.x - 6} cy={38} r={1.6} fill={C.degrade[2]} />
          </>
        ) : null}
      </Svg>

      {/* l'etiquette de chaque palier, a gauche de son rond */}
      {g.etiquettes.map((e, i) => {
        const p = ligne.paliers[i];
        if (!p || e.largeur <= 0) return null;
        return (
          <View key={`e${i}`} pointerEvents="none" style={{ position: 'absolute', left: e.x, top: e.y, width: e.largeur, height: e.hauteur, alignItems: 'flex-end' }}>
            <View style={{ maxWidth: e.largeur, height: e.hauteur, paddingHorizontal: 6, borderRadius: 7, backgroundColor: P.white, justifyContent: 'center', shadowColor: '#23358F', shadowOpacity: sombre ? 0 : 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1, borderWidth: sombre ? 1 : 0, borderColor: P.line }}>
              <Ink size={11} weight="extraBold" color={P.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontVariant: ['tabular-nums'] }}>
                {etiquette(i, p.kg)}
              </Ink>
            </View>
          </View>
        );
      })}

      {/* le fanion et ton objectif, au sommet */}
      <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: xFanion, top: 0, width: M.fanion, height: M.fanion }, styleFanion]}>
        <Image source={illus.img('fanion')} style={{ width: M.fanion, height: M.fanion }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Reanimated.View>
      <View
        pointerEvents="none"
        style={
          g.objectifAGauche
            ? { position: 'absolute', right: g.largeur - xFanion + 2, top: 6, maxWidth: Math.max(0, xFanion - 2), alignItems: 'flex-end' }
            : { position: 'absolute', left: xObjectif, top: 6, maxWidth: Math.max(0, g.largeur - xObjectif) }
        }
      >
        <Ink size={12} weight="black" color={P.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontVariant: ['tabular-nums'] }}>
          {traduire('Objectif {0}', formatKg(objectif))}
        </Ink>
      </View>

      {/* ta bulle, a ta position sur le chemin */}
      <View
        pointerEvents="none"
        onLayout={(e) => {
          const w = Math.ceil(e.nativeEvent.layout.width);
          if (w > 0 && Math.abs(w - largeurBulle) > 1) setLargeurBulle(w);
        }}
        style={{ position: 'absolute', left: b.x, top: b.y, height: M.bulleH, maxWidth: g.largeur, paddingHorizontal: 8, borderRadius: 8, backgroundColor: C.bulle[t], justifyContent: 'center' }}
      >
        <Ink size={11.5} weight="black" color={C.bulleTexte[t]} numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
          {traduire('Toi, {0} kg', formatKg(actuel))}
        </Ink>
      </View>
    </View>
  );
}
