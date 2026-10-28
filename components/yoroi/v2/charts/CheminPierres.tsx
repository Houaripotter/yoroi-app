/**
 * Le chemin de pierres vers le torii, LE composant du chemin (28 octobre 2026) : la carte Ton poids de l'accueil
 * (components/yoroi/v2/accueil/CartePoids.tsx) et l'onglet Progres (app/(tabs)/progres.tsx) l'utilisent tous les deux.
 * Couleurs, mesures et paliers : une seule source, lib/v2/pesee/cheminPierres.ts ; l'accueil et Progres changent ensemble.
 * 4 pierres separees qui se remplissent a mesure que tu avances (couleurs C : bleu nuit doux, lilas, peche clair, or
 * lumineux), une lanterne a chaque palier (grise, puis ambre allumee une fois franchi), le torii dore au bout, avec un
 * halo quand tu l'as atteint ; les kilos dessous, chaque palier franchi dans la couleur de sa pierre, ton objectif
 * toujours dans celle de la derniere. L'anneau du pourcentage (AnneauPierres) reprend les memes 4 couleurs.
 * Version d'avant (vermillon) : _archive_ancien_design_2026-10-09/carte_poids_v3_2026-10-28/CheminPierres.tsx.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BARRE_PIERRES, PIERRES_CHEMIN, TORII_CHEMIN, paliersDuChemin, pisteAnneau } from '@/lib/v2/pesee/cheminPierres';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { formatKg } from '@/lib/v2/weightStats';

/** Une lanterne de pierre : grise tant que le palier n'est pas franchi, ambre allumee (avec son halo) ensuite */
export function LanternePalier({ allumee, sombre, id }: { allumee: boolean; sombre: boolean; id: string }) {
  const corps = allumee ? '#F4C27A' : sombre ? '#3E4466' : '#DCDDEB';
  const chapeau = allumee ? '#8A5A2B' : sombre ? '#5A6088' : '#A3A7BF';
  const contour = sombre ? '#1A1E29' : '#FFFFFF';
  return (
    <Svg width={BARRE_PIERRES.lanterneL} height={BARRE_PIERRES.lanterneH} viewBox="0 0 24 34" style={{ overflow: 'visible' }}>
      {allumee ? (
        <>
          <Defs>
            <RadialGradient id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#F6C46A" stopOpacity={0.75} />
              <Stop offset="1" stopColor="#F6C46A" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={12} cy={17} rx={11} ry={12} fill={`url(#${id})`} opacity={0.9} />
        </>
      ) : null}
      <Path d="M12 0V5" stroke={chapeau} strokeWidth={2} strokeLinecap="round" />
      <Rect x={6} y={4} width={12} height={4} rx={1.5} fill={chapeau} />
      <Rect x={3} y={7} width={18} height={21} rx={8} fill={corps} stroke={contour} strokeWidth={2} />
      {allumee ? (
        <>
          <Path d="M7 13H17M7 18H17M7 23H17" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.55} />
          <Ellipse cx={9} cy={13} rx={2.2} ry={3.4} fill="#FFFFFF" opacity={0.55} />
        </>
      ) : (
        <Path d="M7 13H17M7 18H17M7 23H17" stroke={sombre ? '#4E5578' : '#C7C9DA'} strokeWidth={1.2} />
      )}
      <Rect x={6} y={27} width={12} height={4} rx={1.5} fill={chapeau} />
    </Svg>
  );
}

/** Le torii dore du chemin (dessin de la maquette, 48 sur 48), contour blanc pour se detacher de la pierre */
export function ToriiDore({ taille }: { taille: number }) {
  const T = TORII_CHEMIN;
  return (
    <Svg width={taille} height={taille} viewBox="0 0 48 48" style={{ overflow: 'visible' }}>
      <Rect x={12} y={13} width={6} height={31} rx={2} fill={T.or} stroke={T.contour} strokeWidth={2.5} />
      <Rect x={30} y={13} width={6} height={31} rx={2} fill={T.or} stroke={T.contour} strokeWidth={2.5} />
      <Rect x={7} y={19} width={34} height={5.5} rx={2} fill={T.or} stroke={T.contour} strokeWidth={2.5} />
      <Path d="M2 9Q24 2 46 9L45 15Q24 9 3 15Z" fill={T.or} stroke={T.contour} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M4 9.5Q24 3 44 9.5" fill="none" stroke={T.trait} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

/** Le halo dore derriere le torii, une fois ton objectif atteint */
function HaloTorii({ taille, id }: { taille: number; id: string }) {
  return (
    <Svg width={taille} height={taille} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={TORII_CHEMIN.halo} stopOpacity={0.7} />
          <Stop offset="0.7" stopColor={TORII_CHEMIN.halo} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={taille / 2} cy={taille / 2} r={taille / 2} fill={`url(#${id})`} />
    </Svg>
  );
}

/** L'anneau du pourcentage en 4 arcs des couleurs des pierres, le torii dore au centre ; chaque arc se remplit avec sa pierre */
export function AnneauPierres({ part, taille = 38 }: { part: number; taille?: number }) {
  const S = taille;
  const r = S * 0.39;
  const ep = S * 0.11;
  const c = S / 2;
  const tour = 2 * Math.PI * r;
  // 7 points de jour entre deux arcs (les bouts arrondis compris)
  const arc = tour / 4 - 7;
  const p = Math.max(0, Math.min(1, part));
  const sombre = paletteSombre();
  return (
    <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={S} height={S} style={{ position: 'absolute', left: 0, top: 0 }}>
        {PIERRES_CHEMIN.map((pi, i) => {
          const loc = Math.max(0, Math.min(1, (p - i * 0.25) / 0.25));
          const rot = `rotate(${-90 + i * 90 + 7} ${c} ${c})`;
          return (
            <React.Fragment key={i}>
              <Circle cx={c} cy={c} r={r} stroke={pisteAnneau(i, sombre)} strokeWidth={ep} fill="none" strokeLinecap="round" strokeDasharray={`${arc} ${tour}`} transform={rot} />
              {loc > 0 ? <Circle cx={c} cy={c} r={r} stroke={pi.plein} strokeWidth={ep} fill="none" strokeLinecap="round" strokeDasharray={`${arc * loc} ${tour}`} transform={rot} /> : null}
            </React.Fragment>
          );
        })}
      </Svg>
      <ToriiDore taille={Math.round(S * 0.42)} />
    </View>
  );
}

/** Paliers franchis sur 4 (la part du chemin), comme la barre : 0 a 4 */
export function paliersFranchis(part: number, atteint: boolean): number {
  if (atteint) return 4;
  return Math.max(0, Math.min(4, Math.floor(Math.max(0, part) / 0.25 + 1e-6)));
}

export function CheminPierres({ depart, objectif, part, atteint, fg2, idLanterne = 'progres' }: { depart: number; objectif: number; part: number; atteint: boolean; fg2: string; idLanterne?: string }) {
  const sombre = paletteSombre();
  const l = paliersDuChemin(depart, objectif, depart, atteint ? 1 : part);
  const p = Math.max(0, Math.min(1, atteint ? 1 : part));
  const B = BARRE_PIERRES;
  const marge = B.torii / 2 - 1;
  const demiJour = B.jour / 2;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ height: B.hauteur, marginHorizontal: marge }}>
        {PIERRES_CHEMIN.map((pi, i) => {
          const loc = Math.max(0, Math.min(1, (p - i * 0.25) / 0.25));
          return (
            <View key={i} style={{ position: 'absolute', left: `${i * 25}%`, width: '25%', top: (B.hauteur - B.pierre) / 2, height: B.pierre, paddingLeft: i === 0 ? 0 : demiJour, paddingRight: demiJour }}>
              <View style={{ flex: 1, borderRadius: B.pierre / 2, backgroundColor: sombre ? pi.paleSombre : pi.pale, overflow: 'hidden' }}>
                {loc > 0 ? (
                  <View style={{ width: `${Math.round(loc * 1000) / 10}%`, height: B.pierre, borderRadius: B.pierre / 2, backgroundColor: pi.plein }}>
                    {/* le reflet clair sur le haut de la pierre */}
                    <View style={{ position: 'absolute', left: 3, right: 3, top: 1.5, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.45)' }} />
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
        {l.map((x) =>
          x.part === 1 ? (
            <View key={x.part} pointerEvents="none" style={{ position: 'absolute', left: '100%', marginLeft: -B.halo / 2, top: (B.hauteur - B.halo) / 2, width: B.halo, height: B.halo, alignItems: 'center', justifyContent: 'center' }}>
              {p >= 1 ? <HaloTorii taille={B.halo} id={`halo-${idLanterne}`} /> : null}
              <ToriiDore taille={B.torii} />
            </View>
          ) : (
            <View key={x.part} style={{ position: 'absolute', left: `${x.part * 100}%`, marginLeft: -B.lanterneL / 2, top: (B.hauteur - B.lanterneH) / 2, width: B.lanterneL, height: B.lanterneH }}>
              <LanternePalier allumee={x.franchi} sombre={sombre} id={`lanterne-${idLanterne}-${Math.round(x.part * 100)}`} />
            </View>
          ),
        )}
      </View>
      {/* les kilos : ton debut a gauche, chaque palier sous sa lanterne, ton objectif sous le torii */}
      <View style={{ height: B.chiffres, marginHorizontal: marge, marginTop: B.ecartChiffres }}>
        <Ink size={11.5} weight="bold" color={fg2} numberOfLines={1} style={{ position: 'absolute', left: -marge, width: 60, fontVariant: ['tabular-nums'] }}>
          {formatKg(depart)}
        </Ink>
        {l.map((x, i) => {
          const pi = PIERRES_CHEMIN[i];
          const fort = x.franchi || x.part === 1;
          const couleur = fort ? (sombre ? pi.texteSombre : pi.texte) : fg2;
          return (
            <Ink
              key={x.part}
              size={11.5}
              weight={x.part === 1 ? 'black' : fort ? 'extraBold' : 'bold'}
              color={couleur}
              numberOfLines={1}
              style={[{ fontVariant: ['tabular-nums'] }, x.part === 1 ? { position: 'absolute', right: -marge, width: 60, textAlign: 'right' } : { position: 'absolute', left: `${x.part * 100}%`, marginLeft: -30, width: 60, textAlign: 'center' }]}
            >
              {formatKg(x.kg)}
            </Ink>
          );
        })}
      </View>
    </View>
  );
}
