/**
 * La tuile « Ta santé aujourd'hui » (17 octobre 2026), en trois traitements au choix (lib/v2/accueil/styleSante.ts).
 * Houari : « la couleur de fond, j'aime pas, c'est pas beau, ça ne donne pas envie, je veux que ça donne envie ».
 *   clair    (par defaut, 17 octobre soir) : carte claire, 3 colonnes de cellules carrees identiques ; dans chaque
 *              cellule, tout est centre : l'icone dans son anneau (ou une pastille de meme taille sans objectif),
 *              la valeur et son unite sur la meme ligne de base, le libelle, l'objectif (ligne reservee meme vide) ;
 *              une derniere rangee incomplete est centree
 *   cadran   : fond nuit facon cadran de montre, en clair comme en sombre ; chaque mesure dans sa couleur
 *              vive ; un anneau vers ton objectif pour les pas (repere 8 000), les calories actives, l'exercice,
 *              le sommeil et les heures debout (tes objectifs de l'ecran Sante et ton objectif de sommeil)
 *   nuit     : carte claire, en-tete en degrade indigo nuit, tes trois premieres mesures en blanc
 *   mosaique : carte claire, une mini carte par mesure dans sa couleur, avec une micro jauge
 * Memes donnees partout : santeDuJour (enPlus.ts), rien d'invente ; une mesure sans donnee n'apparait pas ;
 * toucher une mesure ouvre son ecran (/sante/<mesure>). Texte toujours en contraste AA sur son fond.
 */
import React, { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path as SvgPath } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { objectifMesure, partObjectif, texteMesureSante } from '@/lib/v2/accueil/enPlus';
import type { CleSanteJour, MesureSanteJour, ObjectifsSante } from '@/lib/v2/accueil/enPlus';
import { useStyleSante } from '@/lib/v2/accueil/styleSante';
import type { StyleSante } from '@/lib/v2/accueil/styleSante';
import { Icon, P } from './kit';
import { AnneauxConcentriques, ChiffreAnime, ORDRE_ACTIVITE, couleurActivite } from './Visus';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { carteNeutre, teinte } from './domaines';
import type { Domaine } from './domaines';
import { traduire } from '@/lib/i18n/tr';

const RAYON = 22;

export const MESURE_SANTE: Record<CleSanteJour, { nom: string; domaine: Domaine; d: string; a11y: string }> = {
  pas: { nom: traduire('Pas'), domaine: 'forme', a11y: 'pas', d: 'M8.4 3.2c1.7 0 2.6 1.9 2.4 4.2-.2 2.3-1 3.9-2.5 3.9S5.9 9.6 5.9 7.3c0-2.3.8-4.1 2.5-4.1zM6.4 14h4.2l-.4 3a1.9 1.9 0 0 1-3.5 0zM15.6 7.2c1.7 0 2.5 1.8 2.5 4.1 0 2.3-.9 3.9-2.4 3.9s-2.4-1.6-2.5-3.9c-.2-2.3.7-4.1 2.4-4.1zM13.4 18h4.2l-.3 2.1a1.9 1.9 0 0 1-3.6 0z' },
  'energie-active': { nom: traduire('Calories'), domaine: 'mensurations', a11y: traduire('kilocalories actives'), d: 'M12 3c.6 3.3 4.6 5.1 4.6 10a4.6 4.6 0 0 1-9.2 0c0-2.4 1.2-3.8 2.4-4.9.3 1.6 1 2.5 1.9 2.9C12.8 8.9 12 5.7 12 3z' },
  distance: { nom: 'Distance', domaine: 'eau', a11y: traduire('kilomètres'), d: 'M5 20.5c0-3.4 3.3-3.9 6.4-5.3 2.6-1.2 4.6-2.4 5.4-4.7M17 3a3.2 3.2 0 0 1 3.2 3.2c0 2.4-3.2 4.8-3.2 4.8s-3.2-2.4-3.2-4.8A3.2 3.2 0 0 1 17 3zM5 18a1.6 1.6 0 1 1 0 3.2A1.6 1.6 0 0 1 5 18z' },
  exercice: { nom: traduire('Exercice'), domaine: 'forme', a11y: traduire('minutes d’exercice'), d: 'M13 3L5 13.5h6L10 21l8-10.5h-6z' },
  'frequence-cardiaque': { nom: traduire('FC du jour'), domaine: 'competition', a11y: traduire('battements par minute en moyenne aujourd’hui'), d: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10zM7.5 11.5h2.6l1.2-2.1 1.8 4.2 1.2-2.1h2.2' },
  'fc-repos': { nom: traduire('FC repos'), domaine: 'competition', a11y: traduire('battements par minute au repos'), d: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z' },
  oxygene: { nom: traduire('SpO2'), domaine: 'eau', a11y: traduire('pour cent d’oxygène dans le sang'), d: 'M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11zM12 12.2a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6z' },
  respiration: { nom: 'Respiration', domaine: 'seances', a11y: traduire('respirations par minute'), d: 'M3 9h10.5a2.8 2.8 0 1 0-2.8-2.8M3 15h14a2.8 2.8 0 1 1-2.8 2.8M3 12h6.5' },
  sommeil: { nom: traduire('Sommeil'), domaine: 'poids', a11y: traduire('de sommeil cette nuit'), d: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z' },
  debout: { nom: 'Debout', domaine: 'mensurations', a11y: traduire('heures debout'), d: 'M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 9h8M12 9v5.5M12 14.5l-2.5 6.5M12 14.5l2.5 6.5M8 9l-1.5 5M16 9l1.5 5' },
};

/** Couleurs vives du cadran (fond nuit) : toutes au-dessus de 7:1 sur #141A28 ; aucun rouge (reserve aux records) */
const VIF: Record<CleSanteJour, string> = {
  pas: '#5FE3AE',
  'energie-active': '#FFA45C',
  distance: '#62CBFF',
  exercice: '#C8F25E',
  'frequence-cardiaque': '#F78FD3',
  'fc-repos': '#F9A8DC',
  oxygene: '#7ADBFF',
  respiration: '#A5B8FF',
  sommeil: '#BBA8FF',
  debout: '#FFD36E',
};

const NUIT = { fond: ['#1E2639', '#121725'] as const, bord: '#2A3248', texte: '#F2F1EC', doux: '#A3ABBE', piste: 'rgba(255,255,255,0.12)' };

function Picto({ cle, couleur, taille = 13 }: { cle: CleSanteJour; couleur: string; taille?: number }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24" fill="none">
      <SvgPath d={MESURE_SANTE[cle].d} stroke={couleur} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** Un anneau de progression fin, le picto au centre */
function Anneau({ part, couleur, piste, taille = 30, epaisseur = 3.2, children }: { part: number | null; couleur: string; piste: string; taille?: number; epaisseur?: number; children: React.ReactNode }) {
  const r = (taille - epaisseur) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: taille, height: taille, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={taille} height={taille} style={{ position: 'absolute' }}>
        <Circle cx={taille / 2} cy={taille / 2} r={r} stroke={piste} strokeWidth={epaisseur} fill="none" />
        {part !== null && part > 0 ? (
          <Circle
            cx={taille / 2}
            cy={taille / 2}
            r={r}
            stroke={couleur}
            strokeWidth={epaisseur}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - part)}
            transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

/** Valeur en gras et unite ; « , hier » pour une mesure de la nuit d'avant */
function Valeur({ m, couleur, douce, taille = 18 }: { m: MesureSanteJour; couleur: string; douce: string; taille?: number }) {
  const { valeur, unite } = texteMesureSante(m);
  return (
    <Ink size={taille} weight="black" tight color={couleur} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontVariant: ['tabular-nums'] }}>
      {valeur}
      {unite || m.hier ? (
        <Ink size={11.5} weight="bold" color={douce}>
          {`${unite ? ` ${unite}` : ''}${m.hier ? traduire(', hier') : ''}`}
        </Ink>
      ) : null}
    </Ink>
  );
}

function a11yMesure(m: MesureSanteJour, o: ObjectifsSante | null | undefined): string {
  const def = MESURE_SANTE[m.cle];
  const { valeur } = texteMesureSante(m);
  const obj = objectifMesure(m.cle, o);
  return traduire("{0} : {1} {2}{3}{4}. Voir le détail", def.nom, valeur, def.a11y, m.hier ? traduire(', mesure d’hier') : '', obj ? `, ${obj.texte}` : '');
}

/** Largeur reelle de la grille (onLayout), estimee d'abord a partir de l'ecran */
function useColonnes(marge: number): [number, (w: number) => void] {
  const { width } = useWindowDimensions();
  const [w, setW] = useState(Math.min(width, 560) - 44 - marge);
  return [w, setW];
}

function Titre({ couleur, chevron, icone }: { couleur: string; chevron: string; icone: string }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/sante' as any)} accessibilityRole="button" accessibilityLabel={traduire("Ta santé aujourd’hui. Ouvrir Santé")} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 22 }}>
      <Icon name="heart" size={16} color={icone} width={2.5} />
      <Ink size={13} weight="extraBold" color={couleur} numberOfLines={1} style={{ flex: 1 }}>
        {traduire("Ta santé aujourd’hui")}</Ink>
      <Icon name="chevron" size={14} color={chevron} width={2.6} />
    </Pressable>
  );
}

/** Note des objectifs : dit d'ou viennent les anneaux, et que 8 000 pas est un repere */
function NoteObjectifs({ mesures, o, couleur }: { mesures: MesureSanteJour[]; o: ObjectifsSante | null | undefined; couleur: string }) {
  const avec = mesures.filter((m) => objectifMesure(m.cle, o));
  if (!avec.length) return null;
  const pas = avec.some((m) => m.cle === 'pas');
  const autres = avec.some((m) => m.cle !== 'pas');
  const texte = `${autres ? traduire('Tes objectifs, réglables dans Santé et Sommeil.') : ''}${autres && pas ? ' ' : ''}${pas ? traduire('Pas : repère de 8 000 par jour.') : ''}`;
  return (
    <Ink size={11} weight="bold" color={couleur} numberOfLines={2}>
      {texte}
    </Ink>
  );
}

/* ============ A. Cadran : fond nuit, couleurs vives, anneaux ============ */

function Cadran({ mesures, o }: { mesures: MesureSanteJour[]; o: ObjectifsSante | null | undefined }) {
  const router = useRouter();
  // la rangee deborde de 4 de chaque cote : sa largeur se partage en 3
  const [w, setW] = useColonnes(22);
  const L = Math.floor(w / 3) - 0.5;
  return (
    <LinearGradient colors={NUIT.fond} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: RAYON, borderWidth: 1, borderColor: NUIT.bord, padding: 14, gap: 8 }}>
      <Titre couleur={NUIT.texte} chevron={NUIT.doux} icone={VIF['frequence-cardiaque']} />
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, rowGap: 4 }}>
        {mesures.map((m) => {
          const obj = objectifMesure(m.cle, o);
          const c = VIF[m.cle];
          return (
            <Pressable
              key={m.cle}
              onPress={() => router.push(`/sante/${m.cle}` as any)}
              accessibilityRole="button"
              accessibilityLabel={a11yMesure(m, o)}
              style={({ pressed }) => ({ width: L, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 14, backgroundColor: pressed ? 'rgba(255,255,255,0.06)' : 'transparent', gap: 4 })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Anneau part={obj ? partObjectif(m.valeur, obj.cible) : null} couleur={c} piste={obj ? NUIT.piste : 'rgba(255,255,255,0.0)'} taille={30}>
                  <View style={{ width: obj ? 20 : 26, height: obj ? 20 : 26, borderRadius: 13, backgroundColor: obj ? 'transparent' : 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                    <Picto cle={m.cle} couleur={c} taille={obj ? 12 : 13} />
                  </View>
                </Anneau>
                <Ink size={11.5} weight="extraBold" color={c} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ flexShrink: 1 }}>
                  {traduire(MESURE_SANTE[m.cle].nom)}
                </Ink>
              </View>
              <View>
                <Valeur m={m} couleur={NUIT.texte} douce={NUIT.doux} />
                {obj ? (
                  <Ink size={10.5} weight="bold" color={NUIT.doux} numberOfLines={1}>
                    {traduire(obj.texte)}
                  </Ink>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <NoteObjectifs mesures={mesures} o={o} couleur={NUIT.doux} />
    </LinearGradient>
  );
}

/* ============ B. Nuit : carte claire, en-tete indigo nuit ============ */

function Nuit({ mesures, o }: { mesures: MesureSanteJour[]; o: ObjectifsSante | null | undefined }) {
  const router = useRouter();
  // la rangee deborde de 4 de chaque cote : sa largeur se partage en 3
  const [w, setW] = useColonnes(22);
  const L = Math.floor(w / 3) - 0.5;
  const heros = mesures.slice(0, 3);
  const reste = mesures.slice(3);
  return (
    <View style={{ borderRadius: RAYON, backgroundColor: P.white, borderWidth: 1, borderColor: P.line, overflow: 'hidden' }}>
      <LinearGradient colors={['#151D38', '#243F78', '#2F569A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 14, gap: 10 }}>
        <Titre couleur="#FFFFFF" chevron="rgba(255,255,255,0.8)" icone="#FFFFFF" />
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', marginHorizontal: -4 }}>
          {heros.map((m) => {
            const obj = objectifMesure(m.cle, o);
            return (
              <Pressable key={m.cle} onPress={() => router.push(`/sante/${m.cle}` as any)} accessibilityRole="button" accessibilityLabel={a11yMesure(m, o)} style={{ width: L, paddingHorizontal: 4, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Picto cle={m.cle} couleur="#FFFFFF" />
                  <Ink size={11.5} weight="bold" color="rgba(255,255,255,0.9)" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {traduire(MESURE_SANTE[m.cle].nom)}
                  </Ink>
                </View>
                <Valeur m={m} couleur="#FFFFFF" douce="rgba(255,255,255,0.85)" taille={21} />
                {obj ? (
                  <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden', marginRight: 10 }}>
                    <View style={{ width: `${Math.round(partObjectif(m.valeur, obj.cible) * 100)}%`, height: 3, borderRadius: 2, backgroundColor: '#FFFFFF' }} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>
      {reste.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingTop: 8, paddingBottom: 8 }}>
          {reste.map((m) => {
            const t = teinte(MESURE_SANTE[m.cle].domaine);
            return (
              <Pressable key={m.cle} onPress={() => router.push(`/sante/${m.cle}` as any)} accessibilityRole="button" accessibilityLabel={a11yMesure(m, o)} style={({ pressed }) => ({ width: L, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 12, backgroundColor: pressed ? t.fond : 'transparent', gap: 3 })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: t.fond, alignItems: 'center', justifyContent: 'center' }}>
                    <Picto cle={m.cle} couleur={t.texte} taille={12} />
                  </View>
                  <Ink size={11.5} weight="bold" color={P.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {traduire(MESURE_SANTE[m.cle].nom)}
                  </Ink>
                </View>
                <Valeur m={m} couleur={P.ink} douce={P.ink2} />
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {mesures.some((m) => objectifMesure(m.cle, o)) ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 12, paddingTop: reste.length ? 0 : 10 }}>
          <NoteObjectifs mesures={heros} o={o} couleur={P.ink2} />
        </View>
      ) : null}
    </View>
  );
}

/* ============ C. Mosaique : une mini carte par mesure, micro jauge ============ */

function Mosaique({ mesures, o }: { mesures: MesureSanteJour[]; o: ObjectifsSante | null | undefined }) {
  const router = useRouter();
  const [w, setW] = useColonnes(26);
  const L = Math.floor((w - 16) / 3) - 0.5;
  return (
    <View style={{ borderRadius: RAYON, backgroundColor: P.white, borderWidth: 1, borderColor: P.line, padding: 12, gap: 10 }}>
      <Titre couleur={P.ink} chevron={P.ink2} icone={teinte('forme').texte} />
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {mesures.map((m) => {
          const t = teinte(MESURE_SANTE[m.cle].domaine);
          const obj = objectifMesure(m.cle, o);
          return (
            <Pressable key={m.cle} onPress={() => router.push(`/sante/${m.cle}` as any)} accessibilityRole="button" accessibilityLabel={a11yMesure(m, o)} style={({ pressed }) => ({ width: L, minHeight: 74, borderRadius: 14, backgroundColor: t.fond, borderWidth: 1, borderColor: t.bord, padding: 8, gap: 3, opacity: pressed ? 0.85 : 1 })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Picto cle={m.cle} couleur={t.texte} taille={12} />
                <Ink size={11} weight="extraBold" color={t.texte} numberOfLines={1} style={{ flexShrink: 1 }}>
                  {traduire(MESURE_SANTE[m.cle].nom)}
                </Ink>
              </View>
              <Valeur m={m} couleur={P.ink} douce={P.ink2} taille={17} />
              {obj ? (
                <View style={{ gap: 2, marginTop: 'auto' }}>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: t.bord, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.round(partObjectif(m.valeur, obj.cible) * 100)}%`, height: 4, borderRadius: 2, backgroundColor: t.plein }} />
                  </View>
                  <Ink size={10} weight="bold" color={P.ink2} numberOfLines={1}>
                    {traduire(obj.texte)}
                  </Ink>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <NoteObjectifs mesures={mesures} o={o} couleur={P.ink2} />
    </View>
  );
}

/* ============ Clair (par defaut) : cellules carrees, tout centre ============ */

const ESPACE_CELLULE = 8;
const ANNEAU = 32;

/** Largeur d'une cellule carree : 3 par rangee, l'espace entre elles compris */
export function coteCellule(largeurGrille: number): number {
  return Math.max(0, Math.floor((largeurGrille - 2 * ESPACE_CELLULE) / 3));
}

function Clair({ mesures, o }: { mesures: MesureSanteJour[]; o: ObjectifsSante | null | undefined }) {
  const router = useRouter();
  // grille : la carte moins son padding (12) et son bord (1) de chaque cote
  const [w, setW] = useColonnes(26);
  const cote = coteCellule(w);
  return (
    <View style={[{ borderRadius: RAYON, padding: 12, gap: 10 }, carteNeutre()]}>
      <Titre couleur={P.ink} chevron={P.ink2} icone={teinte('competition').texte} />
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: ESPACE_CELLULE }}>
        {mesures.map((m) => {
          const t = teinte(MESURE_SANTE[m.cle].domaine);
          const obj = objectifMesure(m.cle, o);
          const { valeur, unite } = texteMesureSante(m);
          return (
            <Pressable
              key={m.cle}
              onPress={() => router.push(`/sante/${m.cle}` as any)}
              accessibilityRole="button"
              accessibilityLabel={a11yMesure(m, o)}
              style={({ pressed }) => ({
                width: cote,
                height: cote,
                borderRadius: 16,
                // 17 octobre soir : cellules blanches, separees par un filet fin ; la couleur reste dans l'anneau et le libelle
                backgroundColor: pressed ? P.paper : P.white,
                borderWidth: 1,
                borderColor: P.line2,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
              })}
            >
              {obj ? (
                <Anneau part={partObjectif(m.valeur, obj.cible)} couleur={partObjectif(m.valeur, obj.cible) >= 1 ? P.moss : t.plein} piste={P.line} taille={ANNEAU} epaisseur={3.2}>
                  <Picto cle={m.cle} couleur={t.texte} taille={14} />
                </Anneau>
              ) : (
                // sans objectif : un cercle neutre de meme taille, pour que tout reste aligne
                <Anneau part={null} couleur={t.plein} piste={P.line2} taille={ANNEAU} epaisseur={3.2}>
                  <Picto cle={m.cle} couleur={t.texte} taille={14} />
                </Anneau>
              )}
              <Ink size={18} weight="black" tight color={P.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ marginTop: 5, lineHeight: 22, height: 22, textAlign: 'center', alignSelf: 'stretch', fontVariant: ['tabular-nums'] }}>
                {valeur}
                {unite ? (
                  <Ink size={11} weight="bold" color={P.ink2}>
                    {` ${unite}`}
                  </Ink>
                ) : null}
              </Ink>
              <Ink size={11.5} weight="extraBold" color={t.texte} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ lineHeight: 15, height: 15, textAlign: 'center', alignSelf: 'stretch' }}>
                {m.hier ? traduire("{0}, hier", MESURE_SANTE[m.cle].nom) : MESURE_SANTE[m.cle].nom}
              </Ink>
              {/* la ligne d'objectif est toujours reservee : toutes les cellules ont le meme dessin */}
              <Ink size={10} weight="bold" color={P.ink2} numberOfLines={1} style={{ lineHeight: 13, height: 13, textAlign: 'center', alignSelf: 'stretch' }}>
                {obj ? obj.texte : ' '}
              </Ink>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ============ Anneaux (par defaut, 17 octobre nuit) : facon activite, les autres mesures en lignes fines ============ */

const ANNEAU_CLES: CleSanteJour[] = [...ORDRE_ACTIVITE];

function Anneaux({ mesures, o }: { mesures: MesureSanteJour[]; o: ObjectifsSante | null | undefined }) {
  const router = useRouter();
  const anneaux = ANNEAU_CLES.map((k) => mesures.find((m) => m.cle === k)).filter(Boolean) as MesureSanteJour[];
  const autres = mesures.filter((m) => !ANNEAU_CLES.includes(m.cle));
  const centre = anneaux[0];
  const [w, setW] = useColonnes(30);
  const demi = Math.floor((w - 12) / 2);
  return (
    <View style={[{ borderRadius: RAYON, padding: 14, gap: 12 }, carteNeutre()]}>
      <Titre couleur={P.ink} chevron={P.ink2} icone={teinte('competition').texte} />
      {anneaux.length ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable onPress={() => router.push(`/sante/${centre.cle}` as any)} accessibilityRole="button" accessibilityLabel={a11yMesure(centre, o)}>
            <AnneauxConcentriques
              cle="sante"
              taille={124}
              epaisseur={9}
              ecart={2}
              anneaux={anneaux.map((m) => {
                const obj = objectifMesure(m.cle, o);
                return { part: obj && obj.cible > 0 ? Math.min(2, m.valeur / obj.cible) : 0, couleurs: couleurActivite(m.cle) };
              })}
            >
              <View style={{ alignItems: 'center', width: 124 - 2 * anneaux.length * 11 }}>
                {centre.cle === 'pas' ? (
                  <>
                    <ChiffreAnime valeur={centre.valeur} format={(x) => texteMesureSante({ ...centre, valeur: Math.round(x) }).valeur} cle="sante:centre" taille={anneaux.length > 2 ? 15 : 18} />
                    <Ink size={9.5} weight="bold" color={P.ink2}>
                      pas
                    </Ink>
                  </>
                ) : null}
              </View>
            </AnneauxConcentriques>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
            {anneaux.map((m) => {
              const obj = objectifMesure(m.cle, o);
              const { valeur, unite } = texteMesureSante(m);
              const c = couleurActivite(m.cle).anneau;
              const atteint = obj ? partObjectif(m.valeur, obj.cible) >= 1 : false;
              return (
                <Pressable key={m.cle} onPress={() => router.push(`/sante/${m.cle}` as any)} accessibilityRole="button" accessibilityLabel={a11yMesure(m, o)} style={{ gap: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
                    <Ink size={11.5} weight="extraBold" color={P.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>
                      {traduire(MESURE_SANTE[m.cle].nom)}
                    </Ink>
                    {atteint ? <Icon name="check" size={12} color={P.mossText} width={3} /> : null}
                  </View>
                  <Ink size={19} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontVariant: ['tabular-nums'] }}>
                    {valeur}
                    <Ink size={11} weight="bold" color={P.ink2}>
                      {`${unite ? ` ${unite}` : ''}${obj ? `  ${obj.texte}` : ''}`}
                    </Ink>
                  </Ink>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {autres.length ? (
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, borderTopWidth: anneaux.length ? 1 : 0, borderTopColor: P.line2 }}>
          {autres.map((m, i) => {
            const t = teinte(MESURE_SANTE[m.cle].domaine);
            const { valeur, unite } = texteMesureSante(m);
            return (
              <Pressable
                key={m.cle}
                onPress={() => router.push(`/sante/${m.cle}` as any)}
                accessibilityRole="button"
                accessibilityLabel={a11yMesure(m, o)}
                style={({ pressed }) => ({ width: demi, paddingVertical: 9, borderBottomWidth: i < autres.length - (autres.length % 2 === 0 ? 2 : 1) ? 1 : 0, borderBottomColor: P.line2, opacity: pressed ? 0.6 : 1, gap: 2 })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Picto cle={m.cle} couleur={t.texte} taille={13} />
                  <Ink size={11.5} weight="bold" color={P.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {m.hier ? traduire("{0}, hier", MESURE_SANTE[m.cle].nom) : MESURE_SANTE[m.cle].nom}
                  </Ink>
                </View>
                <Ink size={16} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontVariant: ['tabular-nums'] }}>
                  {valeur}
                  {unite ? (
                    <Ink size={11} weight="bold" color={P.ink2}>
                      {` ${unite}`}
                    </Ink>
                  ) : null}
                </Ink>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function TuileSanteJour({ mesures, objectifs, rendu }: { mesures: MesureSanteJour[]; objectifs?: ObjectifsSante | null; rendu?: StyleSante }) {
  const { style } = useStyleSante();
  const s = rendu ?? style;
  if (s === 'nuit') return <Nuit mesures={mesures} o={objectifs} />;
  if (s === 'mosaique') return <Mosaique mesures={mesures} o={objectifs} />;
  if (s === 'cadran') return <Cadran mesures={mesures} o={objectifs} />;
  if (s === 'clair') return <Clair mesures={mesures} o={objectifs} />;
  return <Anneaux mesures={mesures} o={objectifs} />;
}

/** Sans aucune mesure du jour : Sante non reliee, « Connecte Santé » ; reliee, on le dit simplement */
export function TuileSanteJourVide({ relie, rendu }: { relie: boolean; rendu?: StyleSante }) {
  const router = useRouter();
  const { style } = useStyleSante();
  const s = rendu ?? style;
  const nuit = s === 'cadran' || s === 'nuit';
  const texte = nuit ? NUIT.texte : P.ink;
  const doux = nuit ? NUIT.doux : P.ink2;
  const vert = teinte('forme');
  const contenu = (
    <>
      <Titre couleur={texte} chevron={doux} icone={nuit ? VIF['frequence-cardiaque'] : vert.texte} />
      <Ink size={relie ? 17 : 14} weight={relie ? 'black' : 'bold'} tight={relie} color={relie ? texte : doux} numberOfLines={2}>
        {relie ? traduire('Pas encore de mesure aujourd’hui') : traduire('Connecte Santé pour voir tes pas, ton cœur, ton oxygène et ton sommeil')}
      </Ink>
      {relie ? (
        <Ink size={12.5} weight="bold" color={doux}>
          {traduire("Ta montre ou ton téléphone les ajoutera ici")}</Ink>
      ) : (
        <Pressable onPress={() => router.push('/sante' as any)} accessibilityRole="button" accessibilityLabel={traduire("Connecte Santé")} style={nuit ? { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingLeft: 10, paddingRight: 16, borderRadius: 20, backgroundColor: VIF.pas } : { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingLeft: 10, paddingRight: 16, borderRadius: 20, borderWidth: 1.5, borderColor: vert.texte }}>
          <Icon name="plus" size={16} color={nuit ? '#10261D' : vert.texte} width={3} />
          <Ink size={14} weight="extraBold" color={nuit ? '#10261D' : vert.texte}>
            {traduire("Connecte Santé")}</Ink>
        </Pressable>
      )}
    </>
  );
  if (!nuit) return <View style={[{ borderRadius: RAYON, padding: 14, gap: 8 }, carteNeutre()]}>{contenu}</View>;
  if (s === 'nuit')
    return (
      <LinearGradient colors={['#151D38', '#243F78', '#2F569A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: RAYON, padding: 14, gap: 8 }}>
        {contenu}
      </LinearGradient>
    );
  return (
    <LinearGradient colors={NUIT.fond} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: RAYON, borderWidth: 1, borderColor: NUIT.bord, padding: 14, gap: 8 }}>
      {contenu}
    </LinearGradient>
  );
}
