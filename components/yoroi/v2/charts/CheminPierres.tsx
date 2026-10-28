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
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Reanimated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { APERCU_CHEMIN, BARRE_PIERRES, ETATS_CHEMIN, TORII_ANNEAU, PIERRES_CHEMIN, TORII_CHEMIN, PALIERS_CHEMIN, etatsPierres, largeurChiffre, paliersDuChemin, pisteAnneau, placerTuEsIci, texteEtatsChemin } from '@/lib/v2/pesee/cheminPierres';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { formatKg } from '@/lib/v2/weightStats';
import { traduire } from '@/lib/i18n/tr';
import { ToriiImage, TORII_RATIO } from '@/components/yoroi/v2/charts/ToriiImage';

/** Une lanterne de pierre : grise tant que le palier n'est pas franchi, ambre allumee (avec son halo) ensuite */
export function LanternePalier({ allumee, sombre, id, coche }: { allumee: boolean; sombre: boolean; id: string; coche?: string }) {
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
      {/* palier franchi : une coche blanche dans un rond de la couleur de la pierre, sur le corps de la lanterne */}
      {coche ? (
        <>
          <Circle cx={12} cy={17.5} r={6.6} fill={coche} stroke="#FFFFFF" strokeWidth={1.4} />
          <Path d="M9 17.6l2.1 2.2l4 -4.3" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
    </Svg>
  );
}

/** Le torii dore du chemin (dessin de la maquette, 48 sur 48), contour blanc pour se detacher de la pierre */
export function ToriiDore({ taille, eteint }: { taille: number; eteint?: boolean }) {
  // 28 octobre 2026 soir : gris tant que ton objectif n'est pas atteint, dore lumineux ensuite
  const sombreT = paletteSombre();
  const T = eteint ? (sombreT ? ETATS_CHEMIN.toriiGris.sombre : ETATS_CHEMIN.toriiGris.clair) : TORII_CHEMIN;
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
      {/* 28 octobre 2026 soir (Houari : le petit torii moutarde n'etait pas beau) : le vrai torii de l'app (sticker ou encre
          selon Illustrations), le meme qu'au bout du chemin et sur la courbe, au plus grand qui tient dans le rond interieur
          (sa diagonale), descendu d'un demi point : le toit lourd remonte le centre visuel */}
      <View style={{ marginTop: TORII_ANNEAU.decalage * S }}>
        <ToriiImage width={Math.round(S * TORII_ANNEAU.largeur)} />
      </View>
    </View>
  );
}

/** Paliers franchis sur 4 (la part du chemin), comme la barre : 0 a 4 */
export function paliersFranchis(part: number, atteint: boolean): number {
  if (atteint) return 4;
  return Math.max(0, Math.min(4, Math.floor(Math.max(0, part) / 0.25 + 1e-6)));
}

/** Le marqueur « tu es ici » : un point blanc cercle de la couleur de la pierre, et une legere pulsation autour */
function MarqueurIci({ couleur, sombre }: { couleur: string; sombre: boolean }) {
  const M = ETATS_CHEMIN.marqueur;
  const reduit = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduit) return;
    t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(t);
  }, [reduit, t]);
  const halo = useAnimatedStyle(() => (reduit ? { opacity: 0.28, transform: [{ scale: 1.5 }] } : { opacity: 0.5 * (1 - t.value), transform: [{ scale: 1 + 1.1 * t.value }] }));
  return (
    <View pointerEvents="none" style={{ width: M.taille, height: M.taille, alignItems: 'center', justifyContent: 'center' }}>
      <Reanimated.View style={[{ position: 'absolute', width: M.taille, height: M.taille, borderRadius: M.taille / 2, backgroundColor: couleur }, halo]} />
      <View style={{ width: M.taille, height: M.taille, borderRadius: M.taille / 2, backgroundColor: '#FFFFFF', borderWidth: M.bord, borderColor: couleur, shadowColor: '#1B2559', shadowOpacity: sombre ? 0 : 0.18, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2 }} />
    </View>
  );
}

/**
 * Le chemin, 28 octobre 2026 soir (Houari : « on ne sait pas si c'est atteint ou pas ») : chaque pierre a un etat qu'on
 * ne peut pas confondre (lib/v2/pesee/cheminPierres.ts, etatsPierres).
 * FAITE : pleine, couleur franche, reflet, lanterne de fin allumee avec une coche blanche, chiffre en couleur et gras.
 * EN COURS : la part faite en couleur franche, le reste en pointilles de sa couleur, le marqueur « tu es ici » au poids
 * d'aujourd'hui (« Tu es ici » dans la ligne des chiffres quand la place le permet).
 * A VENIR : vide, contour pointille gris bleu, lanterne eteinte, chiffre gris. Au tout debut, la premiere pierre est en
 * cours, le marqueur au depart. Le torii reste gris jusqu'a ton objectif atteint, puis dore avec son halo.
 * Version d'avant : _archive_ancien_design_2026-10-09/chemin_etats_2026-10-28/CheminPierres.tsx.
 */
export function CheminPierres({ depart, objectif, part, atteint, fg2, idLanterne = 'progres' }: { depart: number; objectif: number; part: number; atteint: boolean; fg2: string; idLanterne?: string }) {
  const sombre = paletteSombre();
  const [W, setW] = useState(0);
  const p = Math.max(0, Math.min(1, atteint ? 1 : part));
  const l = paliersDuChemin(depart, objectif, depart, p);
  const etats = etatsPierres(p, atteint);
  const B = BARRE_PIERRES;
  const E = ETATS_CHEMIN;
  const marge = B.torii / 2 - 1;
  const demiJour = B.jour / 2;
  const y = (B.hauteur - B.pierre) / 2;
  const r = B.pierre / 2;
  const q = W / 4;
  const bords = [0, 1, 2, 3].map((i) => ({ x0: i * q + (i === 0 ? 0 : demiJour), x1: (i + 1) * q - demiJour }));
  const iCours = etats.indexOf('en_cours');
  const locCours = iCours < 0 ? 0 : Math.max(0, Math.min(1, (p - iCours * 0.25) / 0.25));
  const xIci = iCours < 0 || !W ? null : bords[iCours].x0 + (bords[iCours].x1 - bords[iCours].x0) * locCours;
  const gris = sombre ? E.aVenir.sombre : E.aVenir.clair;
  const dash = `${E.pointille.trait} ${E.pointille.vide}`;
  const ep = E.pointille.epaisseur;

  // « Tu es ici » dans la ligne des chiffres, seulement s'il ne touche aucun chiffre
  const txt = [formatKg(depart), ...l.map((x) => formatKg(x.kg))];
  const occupes: [number, number][] = W
    ? [
        [0, largeurChiffre(txt[0])],
        ...l.slice(0, 3).map((x, i): [number, number] => [marge + x.part * W - largeurChiffre(txt[i + 1]) / 2, marge + x.part * W + largeurChiffre(txt[i + 1]) / 2]),
        [W + 2 * marge - largeurChiffre(txt[4]), W + 2 * marge],
      ]
    : [];
  const xLibelle = xIci != null ? placerTuEsIci(W + 2 * marge, xIci + marge, occupes) : null;
  const pi = iCours >= 0 ? PIERRES_CHEMIN[iCours] : null;

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={texteEtatsChemin(depart, objectif, p, atteint)} accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}>
      <View style={{ height: B.hauteur, marginHorizontal: marge }} onLayout={(e) => setW(Math.max(0, e.nativeEvent.layout.width))}>
        {W > 0 ? (
          <Svg width={W} height={B.hauteur} style={{ position: 'absolute', left: 0, top: 0 }}>
            {PIERRES_CHEMIN.map((pierre, i) => {
              const { x0, x1 } = bords[i];
              const w = Math.max(0, x1 - x0);
              const franc = E.franc[i];
              const etat = etats[i];
              if (etat === 'faite') {
                return (
                  <React.Fragment key={i}>
                    <Rect x={x0} y={y} width={w} height={B.pierre} rx={r} fill={franc} />
                    {w > 8 ? <Rect x={x0 + 3} y={y + 1.5} width={w - 6} height={2.4} rx={1.2} fill="#FFFFFF" opacity={0.55} /> : null}
                  </React.Fragment>
                );
              }
              if (etat === 'en_cours') {
                const wf = w * locCours;
                return (
                  <React.Fragment key={i}>
                    <Rect x={x0 + ep / 2} y={y + ep / 2} width={Math.max(0, w - ep)} height={B.pierre - ep} rx={r - ep / 2} fill={sombre ? pierre.paleSombre : pierre.pale} stroke={sombre ? pierre.texteSombre : franc} strokeWidth={ep} strokeDasharray={dash} />
                    {wf >= 1 ? <Rect x={x0} y={y} width={wf} height={B.pierre} rx={Math.min(r, wf / 2)} fill={franc} /> : null}
                    {wf > 8 ? <Rect x={x0 + 3} y={y + 1.5} width={wf - 6} height={2.4} rx={1.2} fill="#FFFFFF" opacity={0.55} /> : null}
                  </React.Fragment>
                );
              }
              return <Rect key={i} x={x0 + ep / 2} y={y + ep / 2} width={Math.max(0, w - ep)} height={B.pierre - ep} rx={r - ep / 2} fill="none" stroke={gris} strokeWidth={ep} strokeDasharray={dash} />;
            })}
          </Svg>
        ) : null}
        {l.map((x, i) =>
          x.part === 1 ? (
            <View key={x.part} pointerEvents="none" style={{ position: 'absolute', left: '100%', marginLeft: -B.halo / 2, top: (B.hauteur - B.halo) / 2, width: B.halo, height: B.halo, alignItems: 'center', justifyContent: 'center' }}>
              {p >= 1 && atteint ? <HaloTorii taille={B.halo} id={`halo-${idLanterne}`} /> : null}
              {/* le vrai torii : gris doux tant que ton objectif n'est pas atteint, en couleur avec son halo dore ensuite */}
              <ToriiImage width={B.torii} eteint={!atteint} />
            </View>
          ) : (
            <View key={x.part} style={{ position: 'absolute', left: `${x.part * 100}%`, marginLeft: -B.lanterneL / 2, top: (B.hauteur - B.lanterneH) / 2, width: B.lanterneL, height: B.lanterneH }}>
              <LanternePalier allumee={etats[i] === 'faite'} sombre={sombre} id={`lanterne-${idLanterne}-${Math.round(x.part * 100)}`} coche={etats[i] === 'faite' ? PIERRES_CHEMIN[i].texte : undefined} />
            </View>
          ),
        )}
        {xIci != null && pi ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: xIci - E.marqueur.taille / 2, top: (B.hauteur - E.marqueur.taille) / 2 }}>
            <MarqueurIci couleur={sombre ? ETATS_CHEMIN.franc[iCours] : pi.texte} sombre={sombre} />
          </View>
        ) : null}
      </View>
      {/* les kilos : ton debut a gauche, chaque palier sous sa lanterne (en couleur une fois franchi), ton objectif sous le torii */}
      <View style={{ height: B.chiffres, marginHorizontal: marge, marginTop: B.ecartChiffres }}>
        <Ink size={11.5} weight="bold" color={fg2} numberOfLines={1} style={{ position: 'absolute', left: -marge, width: 60, fontVariant: ['tabular-nums'] }}>
          {txt[0]}
        </Ink>
        {l.map((x, i) => {
          const fait = etats[i] === 'faite';
          const pc = PIERRES_CHEMIN[i];
          const couleur = fait ? (sombre ? pc.texteSombre : pc.texte) : fg2;
          return (
            <Ink
              key={x.part}
              size={11.5}
              weight={fait ? 'black' : x.part === 1 ? 'extraBold' : 'bold'}
              color={couleur}
              numberOfLines={1}
              style={[{ fontVariant: ['tabular-nums'] }, x.part === 1 ? { position: 'absolute', right: -marge, width: 60, textAlign: 'right' } : { position: 'absolute', left: `${x.part * 100}%`, marginLeft: -30, width: 60, textAlign: 'center' }]}
            >
              {txt[i + 1]}
            </Ink>
          );
        })}
        {xLibelle != null && pi ? (
          <Ink size={E.libelle.taille} weight="extraBold" color={sombre ? pi.texteSombre : pi.texte} numberOfLines={1} style={{ position: 'absolute', left: xLibelle - marge, width: E.libelle.largeur, textAlign: 'center', lineHeight: B.chiffres }}>
            {traduire('Tu es ici')}
          </Ink>
        ) : null}
      </View>
    </View>
  );
}

/**
 * 28 octobre 2026 (Houari : un grand vide sous « Fixe ton cap ») : l'apercu du chemin quand tu n'as pas encore de cap.
 * Les memes 4 pierres en pointilles dans leurs couleurs pales, les lanternes eteintes aux paliers, le torii dore en
 * transparence au bout, sans chiffres : il montre ce qui t'attend, sans rien promettre. Memes mesures que la barre.
 */
export function CheminPierresApercu() {
  const sombre = paletteSombre();
  const B = BARRE_PIERRES;
  const A = APERCU_CHEMIN;
  const marge = B.torii / 2 - 1;
  const demiJour = B.jour / 2;
  const y = B.hauteur / 2;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: B.hauteur, marginHorizontal: marge }}>
      {PIERRES_CHEMIN.map((pi, i) => (
        <View key={i} style={{ position: 'absolute', left: `${i * 25}%`, width: '25%', top: 0, height: B.hauteur, paddingLeft: i === 0 ? 0 : demiJour, paddingRight: demiJour }}>
          <Svg width="100%" height={B.hauteur}>
            <Line x1={A.point / 2} y1={y} x2="96%" y2={y} stroke={sombre ? pi.texteSombre : pi.plein} strokeOpacity={sombre ? A.opaciteSombre : A.opacite} strokeWidth={A.point} strokeLinecap="round" strokeDasharray={`0.1 ${A.pas}`} />
          </Svg>
        </View>
      ))}
      {PALIERS_CHEMIN.map((f) =>
        f === 1 ? (
          <View key={f} pointerEvents="none" style={{ position: 'absolute', left: '100%', marginLeft: -B.torii / 2, top: (B.hauteur - B.torii / TORII_RATIO) / 2, width: B.torii, height: B.torii / TORII_RATIO, opacity: A.torii }}>
            <ToriiImage width={B.torii} eteint />
          </View>
        ) : (
          <View key={f} style={{ position: 'absolute', left: `${f * 100}%`, marginLeft: -B.lanterneL / 2, top: (B.hauteur - B.lanterneH) / 2, width: B.lanterneL, height: B.lanterneH }}>
            <LanternePalier allumee={false} sombre={sombre} id={`lanterne-apercu-${Math.round(f * 100)}`} />
          </View>
        ),
      )}
    </View>
  );
}
