/**
 * Studio, bibliotheques d'exercices libres (26 octobre 2026, Houari : « ajoute tout, dans le mode Studio »).
 * Les catalogues complets sont lus en ligne a l'ouverture de la galerie, rien n'est livre dans l'app :
 * - RepDB, edition gratuite (650 exercices) : usage commercial permis avec la mention
 *   « Exercise data by RepDB (repdb.co) », pas de redistribution comme base de donnees ;
 * - Free Exercise DB (873 exercices, domaine public) ;
 * - Everkinetic (CC BY-SA 4.0).
 */
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { demoSlug } from '@/lib/v2/programmes/demos';
import { DESSINS_EK, DESSINS_REPDB, PHOTOS_FEDB } from '@/lib/v2/programmes/demosTestCorrespondances';

export type Bibliotheque = 'repdb' | 'photos' | 'dessins';

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

const GH = 'https://raw.githubusercontent.com/';
export const ADRESSES: Record<Bibliotheque, string> = {
  repdb: `${GH}RepDB/exercise-dataset/main/exercises.json`,
  photos: `${GH}yuhonas/free-exercise-db/main/dist/exercises.json`,
  dessins: `${GH}everkinetic/data/main/dist/exercises.json`,
};

export const INFOS: Record<Bibliotheque, { nom: string; licence: string; mention?: string }> = {
  repdb: { nom: 'RepDB', licence: 'Gratuit, même dans une app payante, avec la mention', mention: 'Exercise data by RepDB (repdb.co)' },
  photos: { nom: 'Free Exercise DB', licence: 'Domaine public, aucune mention obligatoire' },
  dessins: { nom: 'Everkinetic', licence: 'Licence CC BY-SA 4.0, mention obligatoire', mention: 'Everkinetic, CC BY-SA 4.0' },
};

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
const joli = (s: string): string => s.replace(/_/g, ' ');

export function lireRepdb(json: unknown): ExoLibre[] {
  const ex = (json as { exercises?: unknown[] })?.exercises;
  if (!Array.isArray(ex)) return [];
  const yoroi = inverse(DESSINS_REPDB);
  const racine = `${GH}RepDB/exercise-dataset/main/`;
  return ex.flatMap((raw) => {
    const e = raw as Record<string, unknown>;
    const id = texte(e.id);
    if (!id) return [];
    const flat = ((e.images as Record<string, unknown> | undefined)?.flat ?? {}) as Record<string, unknown>;
    const images = [flat.start, flat.peak, flat.main].map(texte).filter(Boolean).slice(0, 2).map((p) => racine + p);
    return [{
      id,
      nom: texte(e.name_en) || id,
      autres: [texte(e.name_de), texte(e.name_es)].filter(Boolean),
      materiel: joli(texte(e.equipment)),
      muscles: liste(e.primary_muscles).map(joli),
      etapes: liste(e.instructions_en),
      description: texte(e.description_en) || undefined,
      images,
      yoroi: yoroi.get(id),
    }];
  });
}

export function lirePhotos(json: unknown): ExoLibre[] {
  if (!Array.isArray(json)) return [];
  const yoroi = inverse(PHOTOS_FEDB);
  const racine = `${GH}yuhonas/free-exercise-db/main/exercises/`;
  return json.flatMap((raw) => {
    const e = raw as Record<string, unknown>;
    const id = texte(e.id);
    if (!id) return [];
    return [{
      id,
      nom: texte(e.name) || id,
      autres: [],
      materiel: texte(e.equipment),
      muscles: liste(e.primaryMuscles),
      etapes: liste(e.instructions),
      images: liste(e.images).slice(0, 2).map((p) => racine + p),
      yoroi: yoroi.get(id),
    }];
  });
}

export function lireDessins(json: unknown): ExoLibre[] {
  if (!Array.isArray(json)) return [];
  const yoroi = inverse(DESSINS_EK);
  const racine = `${GH}everkinetic/data/main/dist/png/`;
  return json.flatMap((raw) => {
    const e = raw as Record<string, unknown>;
    const id = texte(e.id);
    if (!id) return [];
    return [{
      id,
      nom: texte(e.title) || texte(e.name) || id,
      autres: [],
      materiel: liste(e.equipment).join(', '),
      muscles: liste(e.primary),
      etapes: liste(e.steps),
      description: texte(e.primer) || undefined,
      images: [`${racine}${id}-relaxation.png`, `${racine}${id}-tension.png`],
      yoroi: yoroi.get(id),
    }];
  });
}

const cache = new Map<Bibliotheque, ExoLibre[]>();

export async function chargerBibliotheque(b: Bibliotheque): Promise<ExoLibre[]> {
  const deja = cache.get(b);
  if (deja) return deja;
  const r = await fetch(ADRESSES[b]);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const json: unknown = await r.json();
  const l = b === 'repdb' ? lireRepdb(json) : b === 'photos' ? lirePhotos(json) : lireDessins(json);
  cache.set(b, l);
  return l;
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
