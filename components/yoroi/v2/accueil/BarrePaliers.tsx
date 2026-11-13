/**
 * La barre des paliers de la carte « Ton poids » de l'accueil (14 novembre 2026, bloc A « Barre degradee en
 * 4 tranches » choisi par Houari, maquette paliers_version2.png). Elle remplace la montagne du 13 novembre, trop haute
 * et peu lisible (archivee dans _archive_ancien_design_2026-10-09/paliers_montagne_2026-11-13/).
 * Une rangee de coches au-dessus de la barre, une par palier franchi : rond blanc, ombre legere, coche dans la couleur
 * de sa tranche, le poids du palier dessous. La barre en tranches arrondies, une par palier : franchie pleine dans le
 * degrade violet vers orange, en cours remplie jusqu'a toi, a venir vide. Ta bulle sombre au-dessus de ta position,
 * le fanion au bout. Dessous : « Depart 86,4 » a gauche, « Objectif 80,0 · encore 0,6 kg » a droite.
 * Pas de rouge, pas de rond barre. Les tranches se remplissent une fois a l'ouverture, sauf si le mouvement est reduit.
 * La geometrie vit dans lib/v2/accueil/barrePaliers.ts, testee. Les paliers viennent de la carte (etatsLignePaliers).
 */
import React, { useId, useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import Reanimated, { useAnimatedProps, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { LignePaliers } from '@/lib/v2/accueil/lignePaliers';
import { BARRE, DEGRADE_BARRE, geometrieBarre, largeurPoids } from '@/lib/v2/accueil/barrePaliers';
import { formatKg } from '@/lib/v2/weightStats';
import { traduire } from '@/lib/i18n/tr';
import { ltrSiRTL } from '@/lib/v2/rtl';
import { P } from './kit';
import { useRemplissage } from './Visus';

/** Les couleurs de la barre (maquette A), et leurs equivalents lisibles en sombre */
export const COULEURS_BARRE = {
  vide: { clair: '#EEF0FA', sombre: '#2A3048' },
  rondCoche: { clair: '#FFFFFF', sombre: '#262C45' },
  bulle: { clair: '#1B1F3B', sombre: '#E8ECFF' },
  bulleTexte: { clair: '#FFFFFF', sombre: '#1B1F3B' },
  nuit: { clair: '#23358F', sombre: '#B4C0FF' },
  rose: { clair: '#E0619A', sombre: '#F28CB8' },
} as const;

const RectAnime = Reanimated.createAnimatedComponent(Rect);

type Props = {
  /** les paliers et leur etat, tels que la carte les calcule (etatsLignePaliers) */
  ligne: LignePaliers;
  depart: number;
  objectif: number;
  actuel: number;
  /** ce qu'il te reste avant ton objectif */
  reste: number;
  atteint: boolean;
  sombre: boolean;
  /** objectif atteint : le texte qui existait deja (« Torii atteint, les 4 paliers franchis ») a la place de la ligne */
  legendeAtteint?: React.ReactNode;
  /** largeur de depart, avant la mesure */
  largeurInitiale: number;
};

/** Une tranche, remplie a l'ouverture (v de 0 a 1) jusqu'a sa part : les tranches se remplissent l'une apres l'autre */
function Tranche({ id, x, largeur, rempli, avant, total, v, y, h }: { id: string; x: number; largeur: number; rempli: number; avant: number; total: number; v: SharedValue<number>; y: number; h: number }) {
  const props = useAnimatedProps(() => ({ width: largeur * Math.max(0, Math.min(rempli, v.value * total - avant)) }));
  if (rempli <= 0) return null;
  return <RectAnime x={x} y={y} height={h} rx={h / 2} ry={h / 2} fill={`url(#${id})`} animatedProps={props} />;
}

export function BarrePaliers({ ligne, depart, objectif, actuel, reste, atteint, sombre, legendeAtteint, largeurInitiale }: Props) {
  const C = COULEURS_BARRE;
  const t = sombre ? 'sombre' : 'clair';
  const B = BARRE;
  const illus = useIllustrations();
  // un degrade par barre (sur le web, deux dessins de la meme page partagent leurs id)
  const idDegrade = `barrePaliersDegrade${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [largeur, setLargeur] = useState(largeurInitiale);
  const [largeurBulle, setLargeurBulle] = useState<number>(B.bulleL);
  const poids = useMemo(() => Math.max(...ligne.paliers.map((p) => largeurPoids(formatKg(p.kg))), 0), [ligne.paliers]);
  const g = useMemo(() => geometrieBarre(largeur, ligne, atteint, largeurBulle, poids), [largeur, ligne, atteint, largeurBulle, poids]);

  // les tranches se remplissent une fois a l'ouverture (sauf mouvement reduit : useRemplissage pose la valeur finale)
  const v = useRemplissage(1, 'barre-paliers');
  const total = g.tranches.reduce((s, q) => s + q.rempli, 0);
  // objectif atteint : le fanion fete, il grandit d'un coup quand la barre arrive au bout
  const styleFanion = useAnimatedStyle(() => ({ transform: [{ scale: atteint ? 0.7 + 0.3 * v.value + 0.14 * Math.sin(Math.PI * v.value) : 1 }] }));

  const b = g.bulle;
  const resteTxt = `${formatKg(reste)} kg`;
  const encore = traduire('encore {0} kg', formatKg(reste));
  const j = encore.indexOf(resteTxt);

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - largeur) > 0.5) setLargeur(w);
      }}
      style={[{ height: g.hauteur, marginTop: 12 }, ltrSiRTL]}
    >
      <Svg width={g.largeur} height={g.hauteur} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <SvgGradient id={idDegrade} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={String(g.finBarre)} y2="0">
            {DEGRADE_BARRE.map((s) => (
              <Stop key={s.t} offset={String(s.t)} stopColor={s.c} />
            ))}
          </SvgGradient>
        </Defs>
        {/* chaque tranche vide, puis sa part remplie par-dessus */}
        {g.tranches.map((q, i) => (
          <Rect key={`v${i}`} x={q.x} y={B.barreY} width={q.largeur} height={B.barreH} rx={B.barreH / 2} ry={B.barreH / 2} fill={C.vide[t]} />
        ))}
        {g.tranches.map((q, i) => (
          <Tranche key={`r${i}`} id={idDegrade} x={q.x} largeur={q.largeur} rempli={q.rempli} avant={i} total={total} v={v} y={B.barreY} h={B.barreH} />
        ))}
        {/* la pointe de ta bulle, vers ta position */}
        {b && g.toi !== null ? (
          b.cote === 'haut' ? (
            <Path d={`M${b.x + b.pointe - B.bulleFleche} ${b.y + B.bulleH - 1}L${b.x + b.pointe} ${b.y + B.bulleH + B.bulleFleche}L${b.x + b.pointe + B.bulleFleche} ${b.y + B.bulleH - 1}Z`} fill={C.bulle[t]} />
          ) : (
            <Path d={`M${b.x + b.pointe - B.bulleFleche} ${b.y + 1}L${b.x + b.pointe} ${b.y - B.bulleFleche}L${b.x + b.pointe + B.bulleFleche} ${b.y + 1}Z`} fill={C.bulle[t]} />
          )
        ) : null}
        {atteint ? (
          // la fete au bout de la barre : quelques confettis autour du fanion
          <>
            <Circle cx={g.fanion.x - 6} cy={g.fanion.y - 2} r={2.2} fill={DEGRADE_BARRE[0].c} />
            <Circle cx={g.fanion.x + 4} cy={g.fanion.y - 9} r={1.7} fill={DEGRADE_BARRE[1].c} />
            <Circle cx={g.fanion.x + B.fanion - 2} cy={g.fanion.y - 6} r={2} fill={DEGRADE_BARRE[2].c} />
          </>
        ) : null}
      </Svg>

      {/* une coche par palier franchi, le poids du palier dessous */}
      {g.coches.map((c) => {
        const p = ligne.paliers[c.indice];
        return (
          <View key={`c${c.indice}`} pointerEvents="none" style={{ position: 'absolute', left: c.x - B.coche / 2, top: 0, width: B.coche, alignItems: 'center' }}>
            <View
              style={{
                width: B.coche,
                height: B.coche,
                borderRadius: B.coche / 2,
                backgroundColor: C.rondCoche[t],
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#23358F',
                shadowOpacity: sombre ? 0 : 0.16,
                shadowRadius: 5,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
                borderWidth: sombre ? 1 : 0,
                borderColor: P.line,
              }}
            >
              <Svg width={14} height={14} viewBox="0 0 24 24">
                <Path d="M5 12.6l4.4 4.4L19 7.4" fill="none" stroke={c.couleur} strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            {g.poidsVisibles && p ? (
              <View style={{ position: 'absolute', top: B.poidsY, left: B.coche / 2 - 30, width: 60, alignItems: 'center' }}>
                <Ink size={11} weight="black" color={c.couleur} numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
                  {formatKg(p.kg)}
                </Ink>
              </View>
            ) : null}
          </View>
        );
      })}

      {/* le fanion, au bout de la barre */}
      <Reanimated.View pointerEvents="none" style={[{ position: 'absolute', left: g.fanion.x, top: g.fanion.y, width: B.fanion, height: B.fanion }, styleFanion]}>
        <Image source={illus.img('fanion')} style={{ width: B.fanion, height: B.fanion }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Reanimated.View>

      {/* ta bulle */}
      {b ? (
        <View
          pointerEvents="none"
          onLayout={(e) => {
            const w = Math.ceil(e.nativeEvent.layout.width);
            if (w > 0 && Math.abs(w - largeurBulle) > 1) setLargeurBulle(w);
          }}
          style={{ position: 'absolute', left: b.x, top: b.y, height: B.bulleH, paddingHorizontal: 8, borderRadius: 7, backgroundColor: C.bulle[t], justifyContent: 'center' }}
        >
          <Ink size={11.5} weight="black" color={C.bulleTexte[t]} numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
            {traduire('{0} kg', formatKg(actuel))}
          </Ink>
        </View>
      ) : null}

      {/* la ligne du dessous : ton depart a gauche, ton objectif et ce qu'il te reste a droite */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: g.ligneY, height: B.ligneH, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {atteint ? (
          <View style={{ flexShrink: 1 }}>{legendeAtteint}</View>
        ) : (
          <>
            {g.departVisible ? (
              <Ink size={12} weight="extraBold" color={P.muted} numberOfLines={1} style={{ fontVariant: ['tabular-nums'], flexShrink: 0 }}>
                {`${traduire('Départ')} ${formatKg(depart)}`}
              </Ink>
            ) : (
              <View />
            )}
            <Ink size={12} weight="black" color={C.nuit[t]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' }}>
              {`${traduire('Objectif {0}', formatKg(objectif))} · `}
              {j < 0 ? encore : encore.slice(0, j)}
              {j < 0 ? null : (
                <Ink size={12} weight="black" color={C.rose[t]} style={{ fontVariant: ['tabular-nums'] }}>
                  {resteTxt}
                </Ink>
              )}
              {j < 0 ? null : encore.slice(j + resteTxt.length)}
            </Ink>
          </>
        )}
      </View>
    </View>
  );
}
