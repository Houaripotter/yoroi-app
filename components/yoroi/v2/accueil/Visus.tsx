/**
 * Micro visualisations de l'accueil (17 octobre 2026). Houari : « juste des chiffres et des icônes, ça ne donne pas
 * envie ; trouve-moi un meilleur design, de belles animations ». Chaque tuile raconte sa donnee : jauge en arc,
 * barres des 7 nuits, verre qui se remplit, courbe de tendance, 7 jours de la semaine, rangee de semaines tenues,
 * trophee, anneaux concentriques.
 *
 * Mouvement (regles de mouvement-interface-web, en Reanimated) : une seule fois par ouverture de l'app (memoire du
 * module, jamais en boucle) ; seulement transform, opacity et le trait des anneaux ; courbe de sortie
 * (0.16, 1, 0.3, 1) ; 700 ms pour un remplissage (une revelation), 380 ms pour l'entree d'une rangee ; tout est coupe
 * par « réduire les animations » et l'etat final s'affiche alors directement. Rien d'invente : chaque visuel ne
 * dessine que des valeurs deja notees, et se replie proprement quand l'historique manque.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Reanimated, { Easing, Extrapolation, ReduceMotion, interpolate, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient as SvgGradient, Line, Path, Stop } from 'react-native-svg';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { partCapuchon } from '@/lib/v2/accueil/anneau';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from './kit';

export const SORTIE = Easing.bezier(0.16, 1, 0.3, 1);
const DUREE_REMPLISSAGE = 700;

/* ============ Une seule fois par ouverture ============ */

const dejaVu = new Set<string>();

/** Vrai la premiere fois qu'une cle s'affiche depuis l'ouverture de l'app (et si le mouvement n'est pas reduit) */
function useAnimer(cle: string, pret = true): boolean {
  const reduit = useReducedMotion();
  const [animer] = useState(() => !reduit && !dejaVu.has(cle));
  useEffect(() => {
    if (pret) dejaVu.add(cle);
  }, [cle, pret]);
  return animer && pret;
}

/** Une part (0 a max, 1 par defaut) qui se remplit une fois, puis suit la valeur sans rejouer */
export function useRemplissage(part: number, cle: string, delai = 0, max = 1) {
  const p = Math.max(0, Math.min(max, Number.isFinite(part) ? part : 0));
  const animer = useAnimer(`r:${cle}`, p > 0);
  const v = useSharedValue(animer ? 0 : p);
  useEffect(() => {
    v.value = animer ? withDelay(delai, withTiming(p, { duration: DUREE_REMPLISSAGE, easing: SORTIE, reduceMotion: ReduceMotion.System })) : p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);
  return v;
}

/** Un chiffre qui compte jusqu'a sa valeur une fois (700 ms), puis s'affiche directement */
export function useCompteur(cible: number, cle: string): number {
  const ok = Number.isFinite(cible) && cible > 0;
  const animer = useAnimer(`n:${cle}`, ok);
  const [v, setV] = useState(animer ? 0 : cible);
  useEffect(() => {
    if (!animer) {
      setV(cible);
      return;
    }
    let raf = 0;
    const t0 = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - t0) / DUREE_REMPLISSAGE);
      // sortie exponentielle : rapide au depart, posee a l'arrivee
      const e = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setV(cible * e);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cible]);
  return v;
}

/**
 * Entree d'une rangee de la grille : fondu et 8 points de montee, en cascade legere (40 ms, au plus 240 ms), une seule
 * fois par ouverture. Valeurs animees a la main (opacity, translateY) plutot qu'une animation de mise en page :
 * la mise en page ne bouge jamais, rien ne se chevauche pendant l'entree.
 */
export function Apparition({ i, cle, children, style }: { i: number; cle: string; children: React.ReactNode; style?: object }) {
  const animer = useAnimer(`a:${cle}`);
  const v = useSharedValue(animer ? 0 : 1);
  useEffect(() => {
    if (animer) v.value = withDelay(Math.min(240, i * 40), withTiming(1, { duration: 380, easing: SORTIE, reduceMotion: ReduceMotion.System }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const s = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 8 }] }));
  return <Reanimated.View style={[style, s]}>{children}</Reanimated.View>;
}

/* ============ Anneaux ============ */

const CercleAnime = Reanimated.createAnimatedComponent(Circle);

/** Un anneau de progression, rempli une fois ; children au centre */
export function Anneau({ part, couleur, piste, taille = 30, epaisseur = 3.2, cle, delai = 0, children }: { part: number | null; couleur: string; piste: string; taille?: number; epaisseur?: number; cle: string; delai?: number; children?: React.ReactNode }) {
  const r = (taille - epaisseur) / 2;
  const c = 2 * Math.PI * r;
  const v = useRemplissage(part ?? 0, cle, delai);
  const k = 1 - partCapuchon(epaisseur, r);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - (v.value >= 1 ? 1 : v.value * k)) }));
  return (
    <View style={{ width: taille, height: taille, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={taille} height={taille} style={{ position: 'absolute' }}>
        <Circle cx={taille / 2} cy={taille / 2} r={r} stroke={piste} strokeWidth={epaisseur} fill="none" />
        {part !== null && part > 0 ? (
          <CercleAnime
            cx={taille / 2}
            cy={taille / 2}
            r={r}
            stroke={couleur}
            strokeWidth={epaisseur}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            animatedProps={props}
            transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

/**
 * Un anneau d'activite (17 octobre nuit, retour de Houari : « ça ne ressemble pas à l'app Forme ») : un trait epais,
 * sa piste toujours visible dans la meme teinte (environ 25 %), meme sans donnee ; un leger degrade le long du trait
 * (plus sombre en haut a gauche, plus vif en bas a droite, sans couture) ; une petite
 * fleche blanche dessinee DANS le trait, au depart en haut ; au-dela de 100 %, un second tour dont l'extremite porte
 * une ombre legere. Dessin original YOROI. Le remplissage court une fois (700 ms).
 */
export function AnneauActivite({ part, couleurs, taille, epaisseur, cle, delai = 0, fleche = 'simple' }: { part: number; couleurs: { debut: string; fin: string; piste: string }; taille: number; epaisseur: number; cle: string; delai?: number; fleche?: 'simple' | 'double' | 'haut' }) {
  const p = Math.max(0, Math.min(2, Number.isFinite(part) ? part : 0));
  const r = (taille - epaisseur) / 2;
  const c = 2 * Math.PI * r;
  const m = taille / 2;
  const v = useRemplissage(p, cle, delai, 2);
  // echelle lineaire (lib/v2/accueil/anneau.ts) : sous 100 %, p x (1 - capuchon), l'anneau ne se ferme qu'a 100 %
  const echelle = 1 - partCapuchon(epaisseur, r);
  const tour1 = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - (v.value >= 1 ? 1 : v.value * echelle)) }));
  const tour2 = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - Math.max(0, Math.min(1, v.value - 1))) }));
  const bout = useAnimatedStyle(() => ({ opacity: p > 1 ? interpolate(v.value, [p * 0.92, p], [0, 1], Extrapolation.CLAMP) : 0 }));
  const id = `aa${cle.replace(/[^a-z0-9]/gi, '')}`;
  // extremite du second tour (au-dela de 100 %)
  const fin = p > 1 ? p - 1 : 0;
  const ang = fin * 2 * Math.PI - Math.PI / 2;
  const x = m + r * Math.cos(ang);
  const y = m + r * Math.sin(ang);
  const k = epaisseur * 0.22;

  return (
    <View style={{ width: taille, height: taille }}>
      <Svg width={taille} height={taille} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id={`${id}d`} x1="0.15" y1="0" x2="0.85" y2="1">
            <Stop offset="0" stopColor={couleurs.debut} />
            <Stop offset="0.55" stopColor={melange(couleurs.debut, couleurs.fin)} />
            <Stop offset="1" stopColor={couleurs.fin} />
          </SvgGradient>
        </Defs>
        <Circle cx={m} cy={m} r={r} stroke={couleurs.piste} strokeWidth={epaisseur} fill="none" />
        {p > 0 ? (
          <CercleAnime cx={m} cy={m} r={r} stroke={`url(#${id}d)`} strokeWidth={epaisseur} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={tour1} transform={`rotate(-90 ${m} ${m})`} />
        ) : null}
        {p > 1 ? <CercleAnime cx={m} cy={m} r={r} stroke={couleurs.fin} strokeWidth={epaisseur} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} animatedProps={tour2} transform={`rotate(-90 ${m} ${m})`} /> : null}
        {/* la fleche noire, dessinee dans le trait au depart en haut : simple, double ou vers le haut selon l'anneau */}
        <G transform={`translate(${m} ${m - r})`} opacity={p > 0 ? 1 : 0.45}>
          {fleche === 'haut' ? (
            <Path d={`M${-k * 1.3} ${k * 0.2} L0 ${-k * 1.1} L${k * 1.3} ${k * 0.2} M0 ${-k * 1.1} L0 ${k * 1.5}`} stroke={p > 0 ? '#0B0D12' : couleurs.debut} strokeWidth={Math.max(1.8, epaisseur * 0.14)} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ) : fleche === 'double' ? (
            <Path d={`M${-k * 1.5} ${-k * 1.3} L${-k * 0.2} 0 L${-k * 1.5} ${k * 1.3} M${k * 0.1} ${-k * 1.3} L${k * 1.4} 0 L${k * 0.1} ${k * 1.3}`} stroke={p > 0 ? '#0B0D12' : couleurs.debut} strokeWidth={Math.max(1.8, epaisseur * 0.14)} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ) : (
            <Path d={`M${-k * 1.4} 0 L${k * 1.2} 0 M${k * 0.1} ${-k * 1.2} L${k * 1.3} 0 L${k * 0.1} ${k * 1.2}`} stroke={p > 0 ? '#0B0D12' : couleurs.debut} strokeWidth={Math.max(1.8, epaisseur * 0.14)} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          )}
        </G>
      </Svg>
      {p > 1 ? (
        <Reanimated.View style={[{ position: 'absolute', left: 0, top: 0 }, bout]} pointerEvents="none">
          <Svg width={taille} height={taille}>
            {/* l'ombre de l'extremite du second tour sur le premier, puis l'extremite elle-meme */}
            <G transform={`rotate(${(fin * 360).toFixed(1)} ${x} ${y})`}>
              <Circle cx={x + epaisseur * 0.22} cy={y} r={epaisseur / 2 + 0.5} fill="#000000" opacity={0.4} />
            </G>
            <Circle cx={x} cy={y} r={epaisseur / 2} fill={couleurs.fin} />
          </Svg>
        </Reanimated.View>
      ) : null}
    </View>
  );
}

/** Melange a parts egales de deux couleurs hexadecimales */
function melange(a: string, b: string): string {
  const n = (h: string) => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16));
  const [x, y] = [n(a), n(b)];
  return '#' + x.map((v, i) => Math.round((v + y[i]) / 2).toString(16).padStart(2, '0')).join('');
}

/**
 * Anneaux concentriques facon activite, du plus grand (exterieur) au plus petit, serres ; cadran : poses sur un petit
 * disque sombre (#0B0D12), comme un cadran de montre, dans la carte claire.
 */
export function AnneauxConcentriques({ anneaux, taille = 116, epaisseur = 11, ecart = 3, cle, cadran = false, contour = true, children }: { anneaux: { part: number; couleurs: { debut: string; fin: string; piste: string }; fleche?: 'simple' | 'double' | 'haut' }[]; taille?: number; epaisseur?: number; ecart?: number; cle: string; cadran?: boolean; contour?: boolean; children?: React.ReactNode }) {
  // avec contour : le disque noir deborde de 4 points autour des anneaux ; sans contour : l'anneau exterieur est
  // pose sur la carte et le disque noir s'arrete a son bord interieur (un demi point dessous, sans liseré clair)
  const avecContour = cadran && contour;
  const bord = avecContour ? 4 : 0;
  const t0 = taille - 2 * bord;
  const disque = cadran && !contour ? taille - 2 * epaisseur + 1 : 0;
  return (
    <View style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: avecContour ? '#0B0D12' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      {disque > 0 ? <View style={{ position: 'absolute', width: disque, height: disque, borderRadius: disque / 2, backgroundColor: '#0B0D12' }} /> : null}
      {anneaux.map((a, i) => {
        const t = t0 - i * 2 * (epaisseur + ecart);
        return (
          <View key={i} style={{ position: 'absolute' }}>
            <AnneauActivite part={a.part} couleurs={a.couleurs} taille={t} epaisseur={epaisseur} cle={`${cle}:${i}`} delai={i * 90} fleche={a.fleche} />
          </View>
        );
      })}
      {children}
    </View>
  );
}

/* ============ Jauge en arc (240 degres, ouverte en bas) ============ */

export function ArcJauge({ part, couleur, piste, taille = 64, epaisseur = 7, cle, children }: { part: number; couleur: string; piste: string; taille?: number; epaisseur?: number; cle: string; children?: React.ReactNode }) {
  const r = (taille - epaisseur) / 2;
  const c = 2 * Math.PI * r;
  const arc = (c * 240) / 360;
  const v = useRemplissage(part, cle);
  const props = useAnimatedProps(() => ({ strokeDashoffset: arc * (1 - v.value) }));
  // le debut de l'arc a 150 degres (en bas a gauche), sens horaire
  const rot = `rotate(150 ${taille / 2} ${taille / 2})`;
  return (
    <View style={{ width: taille, height: taille, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={taille} height={taille} style={{ position: 'absolute' }}>
        <Circle cx={taille / 2} cy={taille / 2} r={r} stroke={piste} strokeWidth={epaisseur} fill="none" strokeLinecap="round" strokeDasharray={`${arc} ${c}`} transform={rot} />
        {part > 0 ? (
          <CercleAnime cx={taille / 2} cy={taille / 2} r={r} stroke={couleur} strokeWidth={epaisseur} fill="none" strokeLinecap="round" strokeDasharray={`${arc} ${c}`} animatedProps={props} transform={rot} />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

/* ============ Barres des 7 nuits, avec la ligne d'objectif ============ */

function Barre({ h, couleur, cle, i }: { h: number; couleur: string; cle: string; i: number }) {
  const v = useRemplissage(1, `${cle}:${i}`, i * 35);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - v.value) * h }] }));
  return (
    <View style={{ height: h, width: '100%', borderRadius: 3, overflow: 'hidden' }}>
      <Reanimated.View style={[{ height: h, width: '100%', borderRadius: 3, backgroundColor: couleur }, s]} />
    </View>
  );
}

export function Barres7({ valeurs, objectif, couleur, douce, hauteur = 40, cle, derniere = false }: { valeurs: (number | null)[]; objectif: number; couleur: string; douce: string; hauteur?: number; cle: string; derniere?: boolean }) {
  const max = Math.max(objectif || 0, ...valeurs.map((x) => x ?? 0)) * 1.08 || 1;
  const yObj = objectif > 0 ? hauteur - (objectif / max) * hauteur : null;
  return (
    <View style={{ height: hauteur, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
      {valeurs.map((x, i) => (
        <View key={i} style={{ flex: 1, height: hauteur, justifyContent: 'flex-end', alignItems: 'center' }}>
          {x ? (
            <Barre h={Math.max(3, (x / max) * hauteur)} couleur={derniere ? (i === valeurs.length - 1 ? couleur : douce) : objectif > 0 && x >= objectif ? couleur : douce} cle={cle} i={i} />
          ) : (
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: P.line }} />
          )}
        </View>
      ))}
      {yObj !== null ? (
        <Svg width="100%" height={hauteur} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <Line x1="0" x2="100%" y1={yObj} y2={yObj} stroke={P.ink2} strokeWidth={1} strokeDasharray="3 3" opacity={0.55} />
        </Svg>
      ) : null}
    </View>
  );
}

/* ============ Le verre d'eau qui se remplit ============ */

export function Verre({ part, couleur, largeur = 34, hauteur = 46, cle }: { part: number; couleur: string; largeur?: number; hauteur?: number; cle: string }) {
  const v = useRemplissage(part, cle);
  const interieur = hauteur - 4;
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - v.value) * interieur }] }));
  return (
    <View style={{ width: largeur, height: hauteur, borderWidth: 1.5, borderColor: couleur, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, overflow: 'hidden', padding: 1.5 }}>
      <View style={{ flex: 1, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, overflow: 'hidden' }}>
        <Reanimated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: interieur + 6 }, s]}>
          {/* la vague : une ligne douce sur le dessus de l'eau */}
          <Svg width="100%" height={6} viewBox="0 0 40 6" preserveAspectRatio="none">
            <Path d="M0 3 C6 0.5 12 0.5 20 3 C28 5.5 34 5.5 40 3 V6 H0 Z" fill={couleur} opacity={0.85} />
          </Svg>
          <View style={{ flex: 1, backgroundColor: couleur, opacity: 0.85 }} />
        </Reanimated.View>
      </View>
    </View>
  );
}

/* ============ Mini courbe de tendance ============ */

const CheminAnime = Reanimated.createAnimatedComponent(Path);

export function Courbe({ valeurs, couleur, largeur = 120, hauteur = 34, cle }: { valeurs: number[]; couleur: string; largeur?: number; hauteur?: number; cle: string }) {
  const pts = useMemo(() => {
    const v = valeurs.slice(-12);
    if (v.length < 2) return null;
    const min = Math.min(...v);
    const max = Math.max(...v);
    const e = max - min || 1;
    return v.map((y, i) => ({ x: 3 + (i / (v.length - 1)) * (largeur - 6), y: 4 + (1 - (y - min) / e) * (hauteur - 8) }));
  }, [valeurs, largeur, hauteur]);
  const longueur = useMemo(() => (pts ? pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0) : 0), [pts]);
  const v = useRemplissage(1, cle);
  const props = useAnimatedProps(() => ({ strokeDashoffset: longueur * (1 - v.value) }));
  if (!pts) return null;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const fin = pts[pts.length - 1];
  const id = `g${cle.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <Svg width={largeur} height={hauteur}>
      <Defs>
        <SvgGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={couleur} stopOpacity={0.18} />
          <Stop offset="1" stopColor={couleur} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      <Path d={`${d} L${fin.x.toFixed(1)} ${hauteur} L${pts[0].x.toFixed(1)} ${hauteur} Z`} fill={`url(#${id})`} />
      <CheminAnime d={d} stroke={couleur} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${longueur} ${longueur}`} animatedProps={props} />
      <Circle cx={fin.x} cy={fin.y} r={3} fill={couleur} stroke={P.white} strokeWidth={1.5} />
    </Svg>
  );
}

/* ============ La rangee de tes semaines ============ */

export function RangeeSemaines({ semaines, couleur }: { semaines: { tenue: boolean; enCours: boolean }[]; couleur: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
      {semaines.map((s, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            maxWidth: 14,
            aspectRatio: 1,
            borderRadius: 4,
            backgroundColor: s.tenue ? couleur : s.enCours ? 'transparent' : P.line,
            borderWidth: s.enCours && !s.tenue ? 1.5 : 0,
            borderColor: couleur,
            borderStyle: 'dashed',
          }}
        />
      ))}
    </View>
  );
}

/* ============ Le trophee dore ============ */

export function Trophee({ taille = 30 }: { taille?: number }) {
  const sombre = paletteSombre();
  const or = sombre ? '#D8B562' : '#B8892A';
  const clair = sombre ? '#F0D78C' : '#E2BE5F';
  return (
    <Svg width={taille} height={taille} viewBox="0 0 32 32">
      <Path d="M9 4 H23 V10 A7 7 0 0 1 9 10 Z" fill={or} />
      <Path d="M11.5 5.5 H14 V10 A4 4 0 0 1 11.5 8.5 Z" fill={clair} opacity={0.8} />
      <Path d="M9 6 H5.5 A4 4 0 0 0 9.5 12.5 M23 6 H26.5 A4 4 0 0 1 22.5 12.5" stroke={or} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M14.5 16.5 H17.5 V21 H14.5 Z" fill={or} />
      <Path d="M10.5 22 H21.5 A1.5 1.5 0 0 1 23 23.5 V27 H9 V23.5 A1.5 1.5 0 0 1 10.5 22 Z" fill={or} />
      <Path d="M12 24.5 H20" stroke={clair} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

/* ============ Un chiffre qui compte ============ */

/** Le grand chiffre anime : compte une fois jusqu'a la valeur, formate a chaque image */
export function ChiffreAnime({ valeur, format, cle, taille = 28, couleur, unite }: { valeur: number; format: (n: number) => string; cle: string; taille?: number; couleur?: string; unite?: string }) {
  const v = useCompteur(valeur, cle);
  return (
    <Ink size={taille} weight="black" tight color={couleur ?? P.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontVariant: ['tabular-nums'] }}>
      {format(v)}
      {unite ? (
        <Ink size={Math.round(taille * 0.48)} weight="bold" color={P.ink2}>
          {unite}
        </Ink>
      ) : null}
    </Ink>
  );
}

/**
 * Couleurs des anneaux d'activite (17 octobre nuit) : rose vif dehors (pas), vert citron au milieu (exercice), cyan
 * dedans (calories). L'anneau garde sa couleur vive ; le texte prend la meme teinte, assombrie en clair pour rester
 * lisible (AA : 5,0 a 5,3 sur blanc), vive en sombre (6,1 a 13 sur la carte sombre).
 */
export function couleurActivite(cle: string): { anneau: string; debut: string; fin: string; piste: string; texte: string; ombre: string | null } {
  // 17 octobre nuit (Houari : « les mêmes couleurs que les anneaux ») : anneaux, pastilles et valeurs dans les couleurs
  // exactes de l'activite, en clair comme en sombre. En clair, le vert et le cyan portent un tres fin liseré plus
  // sombre de la meme teinte (ombre), pour se lire sur le blanc sans changer la couleur percue.
  const s = paletteSombre();
  if (cle === 'pas') return { anneau: '#FA114F', debut: '#FA114F', fin: '#FF3B8E', piste: '#3B0A16', texte: '#FA114F', ombre: null };
  if (cle === 'exercice') return { anneau: '#92E82A', debut: '#92E82A', fin: '#B6FF3A', piste: '#1C2E07', texte: '#92E82A', ombre: s ? null : '#4F8A0E' };
  return { anneau: '#1EEAEF', debut: '#1EEAEF', fin: '#6BF6FF', piste: '#08363A', texte: '#1EEAEF', ombre: s ? null : '#0A8C92' };
}

/** La fleche de chaque anneau : simple (pas), double (exercice), vers le haut (calories) */
export const FLECHE_ACTIVITE: Record<string, 'simple' | 'double' | 'haut'> = { pas: 'simple', exercice: 'double', 'energie-active': 'haut' };

/** Ordre des anneaux, de l'exterieur vers l'interieur */
export const ORDRE_ACTIVITE = ['pas', 'exercice', 'energie-active'] as const;

/* ============ Recuperation : un arc de 220 degres dans le style des anneaux ============ */

const VueAnimee = Reanimated.View;
const CheminArc = Reanimated.createAnimatedComponent(Path);

/** Couleurs de la jauge selon le niveau, dans la palette des anneaux : bas rose, moyen rose vers vert, bon vert vers cyan */
export function couleursRecup(score: number): [string, string] {
  if (score >= 70) return ['#92E82A', '#1EEAEF'];
  if (score >= 40) return ['#FA114F', '#92E82A'];
  return ['#FA114F', '#FA114F'];
}

/**
 * La jauge de recuperation (17 octobre nuit, Houari : « les couleurs de la jauge En forme sont trop moches ») : un arc
 * epais aux extremites arrondies sur une piste sombre, comme un anneau, rempli une fois jusqu'a ta valeur dans la
 * palette des anneaux, une petite pastille au bout, le chiffre au centre.
 */
export function JaugeRecup({ score, taille = 84, epaisseur = 10, cle }: { score: number; taille?: number; epaisseur?: number; cle: string }) {
  const sombre = paletteSombre();
  const r = (taille - epaisseur) / 2 - 2;
  const m = taille / 2;
  const debut = 160; // degres, depuis l'axe horizontal, sens horaire (ecran)
  const etendue = 220;
  const pt = (deg: number) => ({ x: m + r * Math.cos((deg * Math.PI) / 180), y: m + r * Math.sin((deg * Math.PI) / 180) });
  const a = pt(debut);
  const b = pt(debut + etendue);
  const d = `M${a.x.toFixed(2)} ${a.y.toFixed(2)} A${r} ${r} 0 1 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  const longueur = (2 * Math.PI * r * etendue) / 360;
  const part = Math.max(0, Math.min(1, score / 100));
  const v = useRemplissage(part, cle);
  const trait = useAnimatedProps(() => ({ strokeDashoffset: longueur * (1 - v.value) }));
  const rot = useAnimatedStyle(() => ({ transform: [{ rotate: `${debut + etendue * v.value}deg` }] }));
  const [c1, c2] = couleursRecup(score);
  const id = `jr${cle.replace(/[^a-z0-9]/gi, '')}`;
  const hauteur = Math.round(m + r * Math.sin((20 * Math.PI) / 180) + epaisseur / 2 + 2);
  return (
    <View style={{ width: taille, height: hauteur, alignItems: 'center' }}>
      <Svg width={taille} height={taille} style={{ position: 'absolute', top: 0 }}>
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={c1} />
            <Stop offset="1" stopColor={c2} />
          </SvgGradient>
        </Defs>
        {/* la piste sombre, comme celle des anneaux */}
        <Path d={d} stroke={sombre ? '#2A2F3D' : '#24262E'} strokeWidth={epaisseur} strokeLinecap="round" fill="none" />
        {part > 0 ? <CheminArc d={d} stroke={`url(#${id})`} strokeWidth={epaisseur} strokeLinecap="round" fill="none" strokeDasharray={`${longueur} ${longueur}`} animatedProps={trait} /> : null}
      </Svg>
      {/* la petite pastille au bout de l'arc, portee par un bras qui tourne (transform seulement) */}
      {part > 0 ? (
        <VueAnimee style={[{ position: 'absolute', top: 0, left: 0, width: taille, height: taille }, rot]} pointerEvents="none">
          <View style={{ position: 'absolute', left: m + r - epaisseur * 0.32, top: m - epaisseur * 0.32, width: epaisseur * 0.64, height: epaisseur * 0.64, borderRadius: epaisseur, backgroundColor: '#FFFFFF' }} />
        </VueAnimee>
      ) : null}
      <View style={{ position: 'absolute', top: m - 15, width: taille, alignItems: 'center' }}>
        <ChiffreAnime valeur={score} format={(x) => String(Math.round(x))} cle={`${cle}:n`} taille={24} />
      </View>
    </View>
  );
}

/* ============ Eau : une bouteille qui se remplit, une vague douce ============ */

/** La bouteille d'eau (17 octobre nuit) : elle se remplit une fois jusqu'a ta part, la vague glisse doucement en meme temps */
export function Bouteille({ part, couleur, largeur = 34, hauteur = 58, cle, contour, vague: couleurVague }: { part: number; couleur: string; largeur?: number; hauteur?: number; cle: string; contour?: string; vague?: string }) {
  const bord = contour ?? couleur;
  const v = useRemplissage(part, cle);
  const corps = hauteur - 12;
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - v.value) * corps }] }));
  const vague = useAnimatedStyle(() => ({ transform: [{ translateX: -largeur * 0.9 * v.value }] }));
  return (
    <View style={{ width: largeur, height: hauteur, alignItems: 'center' }}>
      {/* le bouchon et le goulot */}
      <View style={{ width: largeur * 0.38, height: 5, borderRadius: 2, backgroundColor: bord, opacity: 0.9 }} />
      <View style={{ width: largeur * 0.5, height: 7, borderLeftWidth: 1.5, borderRightWidth: 1.5, borderColor: bord }} />
      <View style={{ width: largeur, height: corps, borderWidth: 1.5, borderColor: bord, borderRadius: 9, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden', padding: 1.5 }}>
        <View style={{ flex: 1, borderRadius: 7, overflow: 'hidden' }}>
          <VueAnimee style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: corps + 8 }, s]}>
            <View style={{ height: 6, overflow: 'hidden' }}>
              <VueAnimee style={[{ width: largeur * 3, height: 6 }, vague]}>
                <Svg width={largeur * 3} height={6} viewBox="0 0 120 6" preserveAspectRatio="none">
                  <Path d="M0 3 C5 0.6 10 0.6 15 3 S25 5.4 30 3 S40 0.6 45 3 S55 5.4 60 3 S70 0.6 75 3 S85 5.4 90 3 S100 0.6 105 3 S115 5.4 120 3 V6 H0 Z" fill={couleurVague ?? couleur} opacity={0.95} />
                </Svg>
              </VueAnimee>
            </View>
            <View style={{ flex: 1, backgroundColor: couleur, opacity: 0.95 }} />
          </VueAnimee>
        </View>
      </View>
    </View>
  );
}

