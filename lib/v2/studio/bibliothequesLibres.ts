/**
 * Studio, bibliotheque d'exercices Gym visual (26 octobre 2026, Houari : « supprime tout sauf Gym visual »).
 * Le catalogue complet (1 324 exercices, GIF anatomiques, muscles en rouge, consignes en francais) est lu en ligne
 * a l'ouverture de la galerie, rien n'est livre dans l'app.
 * ATTENTION : medias propriete de Gym visual, test prive seulement ; pour le public il faut une licence Gym visual.
 */
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { demoSlug } from '@/lib/v2/programmes/demos';
import { GIFS_GV } from '@/lib/v2/programmes/demosTestCorrespondances';
import { RACINE_GV } from '@/lib/v2/programmes/demosTest';

export type ExoLibre = {
  id: string;
  nom: string;
  /** autres noms (allemand, espagnol) pour la recherche */
  autres: string[];
  materiel: string;
  muscles: string[];
  etapes: string[];
  description?: string;
  /** une ou deux images (depart, arrivee) */
  images: string[];
  /** nom de l'exercice YOROI qui reprend ces images, s'il existe */
  yoroi?: string;
};

export const ADRESSE_GV = `${RACINE_GV}data/exercises.json`;
export const INFO_GV = { nom: 'Gym visual', licence: 'Test privé seulement : pour le public, il faut acheter une licence Gym visual', mention: '© Gym visual, gymvisual.com' };

/** id de la bibliotheque -> nom YOROI (premier exercice de la bibliotheque YOROI qui pointe dessus) */
function inverse(map: Record<string, string>): Map<string, string> {
  const parSlug = new Map<string, string>();
  for (const e of EXERCISE_LIBRARY as { name: string }[]) {
    const s = demoSlug(e.name);
    if (!parSlug.has(s)) parSlug.set(s, e.name);
  }
  const m = new Map<string, string>();
  for (const [slug, id] of Object.entries(map)) {
    const nom = parSlug.get(slug);
    if (nom && !m.has(id)) m.set(id, nom);
  }
  return m;
}

const texte = (v: unknown): string => (typeof v === 'string' ? v : '');
const liste = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Les noms de fichiers GIF des exercices YOROI, ramenes a l'id Gym visual */
const idDeFichier = (f: string): string => f.split('-')[0];

export function lireGymvisual(json: unknown): ExoLibre[] {
  if (!Array.isArray(json)) return [];
  const yoroi = inverse(Object.fromEntries(Object.entries(GIFS_GV).map(([k, f]) => [k, idDeFichier(f)])));
  return json.flatMap((raw) => {
    const e = raw as Record<string, unknown>;
    const id = texte(e.id);
    const gif = texte(e.gif_url);
    if (!id || !gif) return [];
    const etapes = (e.instruction_steps ?? {}) as Record<string, unknown>;
    const fr = liste(etapes.fr);
    return [{
      id,
      nom: texte(e.name).replace(/^./, (c) => c.toUpperCase()) || id,
      autres: [],
      materiel: texte(e.equipment),
      muscles: [texte(e.target), ...liste(e.secondary_muscles)].filter(Boolean),
      etapes: fr.length ? fr : liste(etapes.en),
      images: [RACINE_GV + gif],
      yoroi: yoroi.get(id),
    }];
  });
}

let cache: ExoLibre[] | null = null;

export async function chargerGymvisual(): Promise<ExoLibre[]> {
  if (cache) return cache;
  const r = await fetch(ADRESSE_GV);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  cache = lireGymvisual((await r.json()) as unknown);
  return cache;
}

const sansAccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrer(l: ExoLibre[], q: string, seulementYoroi: boolean): ExoLibre[] {
  const mots = sansAccent(q).split(/\s+/).filter(Boolean);
  return l.filter((e) => {
    if (seulementYoroi && !e.yoroi) return false;
    if (!mots.length) return true;
    const t = sansAccent([e.nom, ...e.autres, e.materiel, ...e.muscles, e.yoroi ?? ''].join(' '));
    return mots.every((m) => t.includes(m));
  });
}
