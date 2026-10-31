/**
 * 31 octobre 2026 (cartes en 6 modeles) : les huit couleurs franches des fonds unis.
 * Jamais de couleur delavee. L'encre se choisit seule : foncee sur le jaune, blanche partout ailleurs.
 * Logique pure, testee dans __tests__/unit/cartesSixModeles.test.ts.
 */
import type { CouleurId } from './types';
import { traduire } from '@/lib/i18n/tr';

export type CouleurCarte = {
  id: CouleurId;
  nom: string;
  /** le fond plein */
  fond: string;
  /** une teinte plus sombre de la meme couleur (bas du bandeau sans photo, cases) */
  profond: string;
  /** la couleur qui brille sur fond noir (modele Neon nuit) */
  neon: string;
  /** l'encre du texte posee sur ce fond */
  encre: string;
};

export const COULEURS: CouleurCarte[] = [
  { id: 'rouge', nom: traduire('Rouge'), fond: '#E8141C', profond: '#A80D13', neon: '#FF4048', encre: '#FFFFFF' },
  { id: 'bleu', nom: traduire('Bleu roi'), fond: '#1440FF', profond: '#0B27B0', neon: '#4F86FF', encre: '#FFFFFF' },
  { id: 'jaune', nom: traduire('Jaune'), fond: '#FFD100', profond: '#D9A800', neon: '#FFE14D', encre: '#14161C' },
  { id: 'vert', nom: traduire('Vert'), fond: '#00A651', profond: '#007A3B', neon: '#2BFF88', encre: '#FFFFFF' },
  { id: 'orange', nom: traduire('Orange'), fond: '#FF5A00', profond: '#C24300', neon: '#FF8A3D', encre: '#FFFFFF' },
  { id: 'violet', nom: traduire('Violet'), fond: '#5B21F5', profond: '#3D10B8', neon: '#A47BFF', encre: '#FFFFFF' },
  { id: 'rose', nom: traduire('Rose'), fond: '#FF1F78', profond: '#C40F57', neon: '#FF4D9A', encre: '#FFFFFF' },
  { id: 'noir', nom: traduire('Noir'), fond: '#0B0B0D', profond: '#000000', neon: '#FFFFFF', encre: '#FFFFFF' },
];

export const COULEUR_DEFAUT: CouleurId = 'rouge';

export function couleurDe(id: CouleurId | string | null | undefined): CouleurCarte {
  return COULEURS.find((c) => c.id === id) ?? COULEURS.find((c) => c.id === COULEUR_DEFAUT)!;
}

/** Une couleur en rgba, pour les filets et les voiles */
export function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Contraste WCAG entre deux couleurs pleines */
export function contraste(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
