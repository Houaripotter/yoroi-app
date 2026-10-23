/**
 * Vague 41 : contour du rond de profil, au choix (Reglages > Ton personnage > Rond de profil).
 * Aucun, Fin (cercle blanc translucide, par defaut), Or, Indigo. Un simple choix de style :
 * il n'a aucun lien avec le rang du Dojo (la gamification ne se voit que dans le Dojo).
 * Le meme cadre sert a l'accueil (sur la scene), aux Reglages et au profil (sur le papier).
 *
 * 16 octobre 2026 (Houari : « pour le contour de la photo, finalement tu peux rajouter des couleurs, dont le noir ») :
 * huit couleurs de plus, sobres, a la suite des quatre premiers (rien n'est retire ni renomme, les valeurs deja
 * enregistrees restent valables) : Noir, Blanc, Rouge, Vert, Bleu ciel, Violet, Rose, Orange.
 * Chaque anneau a deux teintes : la franche sur le papier clair et sur la scene, la lumineuse sur le papier sombre
 * (3:1 au moins sur leur fond). Le noir garde un fin lisere clair la nuit et sur la scene, le blanc un fin lisere
 * gris sur le papier clair : les deux restent visibles partout.
 */
import React from 'react';
import { View } from 'react-native';
import type { Espace } from '@/lib/v2/espace';
import { useYoroiTheme } from '@/components/yoroi';
import { traduire } from '@/lib/i18n/tr';

export type ContourRond = NonNullable<Espace['contourRond']>;

export const CONTOURS: { id: ContourRond; nom: string; sub: string }[] = [
  { id: 'aucun', nom: traduire('Aucun'), sub: traduire('Ta photo seule') },
  { id: 'fin', nom: 'Fin', sub: traduire('Un cercle blanc discret') },
  { id: 'or', nom: 'Or', sub: traduire('Un cercle doré') },
  { id: 'indigo', nom: 'Indigo', sub: traduire('Un cercle bleu nuit') },
  { id: 'noir', nom: 'Noir', sub: traduire('Un cercle noir, cerné de clair la nuit') },
  { id: 'blanc', nom: 'Blanc', sub: traduire('Un cercle blanc franc') },
  { id: 'rouge', nom: 'Rouge', sub: traduire('Un cercle rouge brique') },
  { id: 'vert', nom: 'Vert', sub: traduire('Un cercle vert forêt') },
  { id: 'ciel', nom: 'Bleu ciel', sub: traduire('Un cercle bleu ciel') },
  { id: 'violet', nom: 'Violet', sub: traduire('Un cercle violet') },
  { id: 'rose', nom: 'Rose', sub: traduire('Un cercle rose framboise') },
  { id: 'orange', nom: 'Orange', sub: traduire('Un cercle orange cuivré') },
];

/** Les anneaux de couleur : franche (papier clair et scene) et lumineuse (papier sombre) */
const ANNEAUX: Partial<Record<ContourRond, { franc: string; nuit: string }>> = {
  noir: { franc: '#1D2029', nuit: '#1D2029' },
  blanc: { franc: '#FFFFFF', nuit: '#F2F1EC' },
  rouge: { franc: '#B5352F', nuit: '#E5706A' },
  vert: { franc: '#2E7D5B', nuit: '#5FC596' },
  ciel: { franc: '#2B86C5', nuit: '#7CC4EE' },
  violet: { franc: '#6A4FE0', nuit: '#A08CF5' },
  rose: { franc: '#C2457E', nuit: '#F09CC2' },
  orange: { franc: '#C8620F', nuit: '#F0A35E' },
};

const IDS = new Set<string>(CONTOURS.map((x) => x.id));

export function contourDe(e?: Pick<Espace, 'contourRond'> | null): ContourRond {
  const v = e?.contourRond;
  return typeof v === 'string' && IDS.has(v) ? (v as ContourRond) : 'fin';
}

export function nomContour(id: ContourRond): string {
  return CONTOURS.find((x) => x.id === id)?.nom ?? 'Fin';
}

/**
 * Le cadre rond : `size` est le diametre total, contour compris (la place prise ne change pas d'un choix a l'autre).
 * `fond` : 'scene' sur une illustration (accueil), 'papier' sur le fond de l'app (Reglages, profil).
 */
export function RondCadre({ size, contour: contourBrut, fond = 'papier', fill, children }: {
  size: number;
  contour: ContourRond;
  fond?: 'scene' | 'papier';
  /** fond du disque, sous la photo ou le personnage */
  fill?: string;
  children: React.ReactNode;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const disque = fill ?? c.fillSoft;
  // une valeur inconnue (version plus recente, donnee abimee) revient au contour fin
  const contour: ContourRond = IDS.has(contourBrut) ? contourBrut : 'fin';

  if (contour === 'aucun') {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: disque, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    );
  }

  if (contour === 'fin') {
    // un seul cercle fin : blanc translucide sur la scene, trait discret sur le papier
    const trait = fond === 'scene' ? 'rgba(255,255,255,0.7)' : c.border;
    const w = Math.max(1.5, Math.round(size * 0.03 * 2) / 2);
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: w, borderColor: trait, overflow: 'hidden', backgroundColor: disque, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    );
  }

  // Or, Indigo et les couleurs : un anneau de couleur, un lisere blanc, puis la photo
  const coul = ANNEAUX[contour];
  const nuit = fond === 'papier' && theme.isDark;
  const anneau = coul
    ? nuit
      ? coul.nuit
      : coul.franc
    : contour === 'or'
      ? fond === 'scene'
        ? c.goldLight
        : c.gold
      : fond === 'scene'
        ? '#8FA8DE'
        : '#3D5D9E';
  // le noir la nuit ou sur la scene, le blanc sur le papier clair ou la scene : un fin lisere exterieur pour se voir
  const lisere = contour === 'noir' && (nuit || fond === 'scene') ? 'rgba(242,241,236,0.62)' : contour === 'blanc' && !nuit ? 'rgba(29,32,41,0.22)' : null;
  // le lisere interieur du blanc est gris clair (blanc sur blanc ne se verrait pas)
  const lisereInt = contour === 'blanc' ? 'rgba(29,32,41,0.14)' : '#FFFFFF';
  const L = lisere ? 1 : 0;
  const S = size - L * 2;
  const gap = size >= 60 ? 2 : 1.5;
  const inner = S - 4 - gap * 2;
  const rond = (
    <View style={{ width: S, height: S, borderRadius: S / 2, borderWidth: 2, borderColor: anneau, padding: gap, backgroundColor: contour === 'blanc' ? anneau : fond === 'scene' ? 'rgba(255,255,255,0.35)' : 'transparent' }}>
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, borderWidth: contour === 'blanc' ? 1 : size >= 60 ? 2.5 : 2, borderColor: lisereInt, overflow: 'hidden', backgroundColor: disque, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
  if (!lisere) return rond;
  return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: L, borderColor: lisere }}>{rond}</View>;
}
