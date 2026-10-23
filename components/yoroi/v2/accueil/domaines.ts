/**
 * Code couleur des domaines de l'accueil (16 octobre 2026) : une couleur par sujet, la meme partout.
 * fond : le pastel doux de la tuile ; texte : l'accent lisible (titre, icone, action) ; plein : la pastille pleine.
 * Contraste verifie (WCAG AA, 4,5:1 au moins) : accent sur fond, encre et encre secondaire sur fond, en clair et en sombre.
 *   poids        violet   (le meme que la courbe : POIDS.soft et POIDS.softText)
 *   seances      indigo   (la couleur des actions de l'app)
 *   forme        vert d'eau (recuperation et sommeil)
 *   eau          bleu lagon
 *   mensurations ocre
 *   competition  prune
 * Le rouge reste reserve aux records et aux erreurs.
 */
import { P, paletteSombre } from '@/components/yoroi/livePalette';

export type Domaine = 'poids' | 'seances' | 'forme' | 'eau' | 'mensurations' | 'competition';

type Teinte = { fond: string; texte: string; plein: string; surPlein: string; bord: string };

const CLAIR: Record<Domaine, Teinte> = {
  poids: { fond: '#F1EEFF', texte: '#4B37C9', plein: '#4B37C9', surPlein: '#FFFFFF', bord: '#E2DCFB' },
  seances: { fond: '#E4E9F3', texte: '#2C4A84', plein: '#2C4A84', surPlein: '#FFFFFF', bord: '#D3DBEA' },
  forme: { fond: '#DFF0EA', texte: '#1E6650', plein: '#1E6650', surPlein: '#FFFFFF', bord: '#CBE5DB' },
  eau: { fond: '#DCEFF6', texte: '#0B6380', plein: '#0B6380', surPlein: '#FFFFFF', bord: '#C6E3EE' },
  mensurations: { fond: '#F5ECD6', texte: '#7E5A14', plein: '#7E5A14', surPlein: '#FFFFFF', bord: '#EADDBB' },
  competition: { fond: '#F4E5EE', texte: '#7A2E5E', plein: '#7A2E5E', surPlein: '#FFFFFF', bord: '#E9D1DF' },
};

const SOMBRE: Record<Domaine, Teinte> = {
  poids: { fond: '#272246', texte: '#B5A8FF', plein: '#B5A8FF', surPlein: '#1A1E29', bord: '#332D59' },
  seances: { fond: '#212B42', texte: '#8FA8DE', plein: '#8FA8DE', surPlein: '#1A1E29', bord: '#2C3856' },
  forme: { fond: '#17302A', texte: '#7FCDB3', plein: '#7FCDB3', surPlein: '#1A1E29', bord: '#1F3E36' },
  eau: { fond: '#132E3A', texte: '#74C6E2', plein: '#74C6E2', surPlein: '#1A1E29', bord: '#1A3B4A' },
  mensurations: { fond: '#2F2A1C', texte: '#D8B562', plein: '#D8B562', surPlein: '#1A1E29', bord: '#3B3424' },
  competition: { fond: '#33202C', texte: '#E3A3CB', plein: '#E3A3CB', surPlein: '#1A1E29', bord: '#432A3A' },
};

/**
 * 17 octobre soir (Houari : « trop de couleurs de fond, ça fait trop moche, les couleurs doivent être mises
 * stratégiquement ») : toutes les tuiles de l'accueil ont le meme fond neutre, carte blanche sur le papier (en sombre,
 * la carte sombre neutre), une bordure fine tres legere et la meme ombre douce. La couleur du domaine ne sert plus
 * que d'accent : icone et titre, anneau ou jauge, chiffre cle. Seul aplat : Ta prochaine seance (indigo) et le
 * compte a rebours de la competition (prune).
 */
export function carteNeutre(): { backgroundColor: string; borderWidth: number; borderColor: string; shadowColor: string; shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number }; elevation: number } {
  const sombre = paletteSombre();
  return { backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, shadowColor: '#1D2029', shadowOpacity: sombre ? 0 : 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: sombre ? 0 : 1 };
}

/** La teinte d'un domaine dans le mode en cours (clair ou sombre) */
export function teinte(d: Domaine): Teinte {
  return (paletteSombre() ? SOMBRE : CLAIR)[d];
}

/** Le domaine d'un lien (conseil du jour) : la tuile prend la couleur du sujet dont elle parle */
export function domaineDuLien(href: string | null | undefined): Domaine {
  const h = href ?? '';
  if (/^\/(pesee|progres|poids|weight)/.test(h)) return 'poids';
  if (/^\/(readiness|sleep)/.test(h)) return 'forme';
  if (/^\/(measure|add-measurement)/.test(h)) return 'mensurations';
  if (/^\/compet/.test(h)) return 'competition';
  return 'seances';
}
