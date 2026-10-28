/**
 * Le chemin de pierres vers le torii (28 octobre 2026, version C « chemin de pierres », choisie par Houari, maquette
 * Barre-C), en composant partage : le meme dessin que la barre de la carte Ton poids de l'accueil
 * (components/yoroi/v2/accueil/CartePoids.tsx, BarrePaliers), repris a l'identique pour l'onglet Progres.
 * Les couleurs des pierres, les mesures et le decoupage en paliers viennent de CartePoids (PIERRES_CHEMIN,
 * BARRE_PIERRES, paliersDuChemin) : une seule source, les deux barres ne peuvent pas diverger.
 * 4 pierres pastel separees qui se remplissent a mesure que tu avances, une lanterne a chaque palier (grise, puis ambre
 * allumee une fois franchi), le torii vermillon au bout ; les kilos dessous, chaque palier franchi dans la couleur de
 * sa pierre, ton objectif toujours dans celle de la derniere.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, Ellipse, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ToriiImage } from '@/components/yoroi/v2/charts/ToriiImage';
import { BARRE_PIERRES, PIERRES_CHEMIN, paliersDuChemin } from '@/components/yoroi/v2/accueil/CartePoids';
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
            <View key={x.part} style={{ position: 'absolute', left: '100%', marginLeft: -B.torii / 2, top: (B.hauteur - B.torii) / 2, width: B.torii, height: B.torii, alignItems: 'center', justifyContent: 'center' }}>
              <ToriiImage width={B.torii} />
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
