/**
 * Silhouette du personnage (vague 26) : le Guerrier et la Guerriere peuvent te ressembler.
 * Reglage dans Reglages, Apparence, ligne « Ton personnage te ressemble » :
 *  'classique'  : le dessin d'origine (par defaut, aussi pour les utilisateurs existants)
 *  'auto'       : la silhouette suit tes pesees (IMC et, s'il existe, taux de masse grasse)
 *  une silhouette choisie a la main
 * Regles : aucun chiffre d'IMC n'est affiche a cote du personnage, aucun mot blessant,
 * chaque silhouette est fiere et forte. L'armure et la pose restent celles du rang.
 *
 * Le calcul (silhouetteFromBody) est pur et teste par un script node sur des cas fictifs.
 * La silhouette active est gardee en memoire (silhouetteCourante) pour que toutes les
 * fonctions d'image (accueil, profil, Dojo, paywall...) appliquent la meme regle.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SilhouetteId = 'elancee' | 'equilibree' | 'athletique' | 'robuste';
export type SilhouetteMode = 'classique' | 'auto' | SilhouetteId;

export const SILHOUETTES: { id: SilhouetteId; nom: string; phrase: string }[] = [
  { id: 'elancee', nom: 'Élancée', phrase: 'Fine et légère, toute en vitesse' },
  { id: 'equilibree', nom: 'Équilibrée', phrase: 'Entre les deux, le juste milieu' },
  { id: 'athletique', nom: 'Athlétique', phrase: 'Épaules larges, muscles marqués' },
  { id: 'robuste', nom: 'Robuste', phrase: 'Large et solide, une force tranquille' },
];

const IDS: SilhouetteId[] = ['elancee', 'equilibree', 'athletique', 'robuste'];

export function isSilhouetteId(v: unknown): v is SilhouetteId {
  return typeof v === 'string' && (IDS as string[]).includes(v);
}

export function silhouetteNom(id: SilhouetteId): string {
  return SILHOUETTES.find((s) => s.id === id)?.nom ?? 'Équilibrée';
}

export type BodyInput = {
  /** poids en kg (moyenne des dernieres pesees) */
  poidsKg?: number | null;
  tailleCm?: number | null;
  /** taux de masse grasse en %, s'il existe */
  grasPct?: number | null;
  genre: 'h' | 'f';
  /** silhouette precedente, pour ne pas changer d'image a chaque petite variation */
  precedente?: SilhouetteId | null;
};

/** Seuils de masse grasse : bas (silhouette musclee) et haut, selon le genre */
const GRAS = { h: { bas: 15, haut: 25 }, f: { bas: 23, haut: 33 } } as const;

function classer(imc: number, gras: number | null, genre: 'h' | 'f'): SilhouetteId {
  const s = GRAS[genre];
  if (gras !== null) {
    const bas = gras <= s.bas;
    const haut = gras >= s.haut;
    // un IMC eleve avec peu de masse grasse, c'est du muscle : jamais Robuste
    if (bas && imc >= 23) return 'athletique';
    if (imc < 19.5) return 'elancee';
    if (bas && imc >= 21.5) return 'athletique';
    if (haut && imc >= 25) return 'robuste';
    if (imc >= 28 && !bas) return 'robuste';
    return 'equilibree';
  }
  if (imc < 19.5) return 'elancee';
  // vague 29 : sans taux de masse grasse, l'IMC seul ne distingue pas le muscle du gras.
  // Un sportif a 27 ou 28 est souvent muscle : Robuste seulement a partir de 30.
  if (imc >= 30) return 'robuste';
  return 'equilibree';
}

/**
 * Silhouette calculee depuis le corps, ou null si les donnees manquent ou sont incoherentes
 * (le personnage reste alors classique). Une marge de 0,4 point d'IMC evite de changer
 * d'image pour une pesee isolee.
 */
export function silhouetteFromBody(b: BodyInput): SilhouetteId | null {
  const p = Number(b.poidsKg);
  const t = Number(b.tailleCm);
  if (!Number.isFinite(p) || !Number.isFinite(t) || p < 25 || p > 350 || t < 120 || t > 230) return null;
  const imc = p / Math.pow(t / 100, 2);
  const g = b.grasPct === null || b.grasPct === undefined ? NaN : Number(b.grasPct);
  const gras = Number.isFinite(g) && g >= 3 && g <= 70 ? g : null;
  const brut = classer(imc, gras, b.genre);
  const prev = b.precedente ?? null;
  if (prev && prev !== brut) {
    if (classer(imc - 0.4, gras, b.genre) === prev || classer(imc + 0.4, gras, b.genre) === prev) return prev;
  }
  return brut;
}

/** Silhouette a dessiner selon le reglage, ou null pour le dessin classique */
export function silhouetteActive(mode: SilhouetteMode | null | undefined, auto: SilhouetteId | null | undefined): SilhouetteId | null {
  if (!mode || mode === 'classique') return null;
  if (mode === 'auto') return isSilhouetteId(auto) ? auto : null;
  return isSilhouetteId(mode) ? mode : null;
}

/* ---------- etat partage en memoire ---------- */

let courante: SilhouetteId | null = null;
/** vague 29 : ecrans de presentation (onboarding et son paywall) ouverts, toujours le dessin classique */
let presentation = 0;

/** Silhouette active pour toutes les images du Guerrier (null : dessin classique) */
export function silhouetteCourante(): SilhouetteId | null {
  return presentation > 0 ? null : courante;
}

/**
 * Vague 29 : pendant l'onboarding on ne sait encore rien de l'utilisateur, les personnages gardent
 * le dessin classique, meme si un reglage « Ton personnage te ressemble » existe deja sur l'appareil.
 * Renvoie la fonction qui referme ce mode (a appeler au demontage de l'ecran).
 */
export function ouvrirPresentation(): () => void {
  presentation += 1;
  let ferme = false;
  return () => {
    if (ferme) return;
    ferme = true;
    presentation = Math.max(0, presentation - 1);
  };
}

export function setSilhouetteCourante(s: SilhouetteId | null): void {
  courante = isSilhouetteId(s) ? s : null;
}

/* ---------- lecture des pesees (mode automatique) ---------- */

const AUTO_KEY = 'yoroi_silhouette_auto_v1';

/** Derniere silhouette automatique connue (pour un affichage immediat au lancement) */
export async function getSilhouetteAutoCache(): Promise<SilhouetteId | null> {
  try {
    const v = await AsyncStorage.getItem(AUTO_KEY);
    return isSilhouetteId(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * Recalcule la silhouette automatique depuis la base : moyenne des 3 dernieres pesees,
 * taille du profil, dernier taux de masse grasse des 60 derniers jours.
 * Ne jette jamais : en cas d'erreur, renvoie la valeur precedente.
 */
export async function calculerSilhouetteAuto(genre: 'h' | 'f'): Promise<SilhouetteId | null> {
  const prev = await getSilhouetteAutoCache();
  try {
    const db = await import('@/lib/database');
    const [profile, weights] = await Promise.all([db.getProfile(), db.getWeights(undefined, 10)]);
    const list = (weights ?? []).filter((w) => w && Number.isFinite(Number(w.weight)) && Number(w.weight) > 0);
    if (!list.length) return prev;
    const last3 = list.slice(0, 3);
    const poids = last3.reduce((s, w) => s + Number(w.weight), 0) / last3.length;
    const limite = Date.now() - 60 * 86400000;
    const avecGras = list.find((w) => {
      if (w.fat_percent === null || w.fat_percent === undefined) return false;
      const d = Date.parse(String(w.date ?? ''));
      return !Number.isFinite(d) || d >= limite;
    });
    const g: 'h' | 'f' = profile?.avatar_gender === 'femme' ? 'f' : profile?.avatar_gender === 'homme' ? 'h' : genre;
    const s = silhouetteFromBody({ poidsKg: poids, tailleCm: profile?.height_cm ?? null, grasPct: avecGras?.fat_percent ?? null, genre: g, precedente: prev });
    if (s && s !== prev) {
      try {
        await AsyncStorage.setItem(AUTO_KEY, s);
      } catch {
        // stockage indisponible : la valeur reste valable pour cette session
      }
    }
    return s ?? prev;
  } catch {
    return prev;
  }
}
