/**
 * Doublons dans ton historique de seances.
 * Cause corrigee en vague 19 : YOROI ecrivait chaque seance dans Apple Sante (ou Health Connect)
 * puis la relisait a la synchronisation suivante comme une seance importee, avec un autre identifiant.
 * Ici, on masque a l'affichage les doublons deja en base : meme jour, meme sport (ou meme famille
 * de sport), heure de debut a quelques minutes pres. La seance YOROI est toujours gardee.
 */
import type { Training } from '@/lib/database';
import { getSportCategory } from '@/lib/sports';

/** Ecart maximum entre deux heures de debut, en minutes */
const TOLERANCE_MIN = 5;

const dayOf = (t: Training) => String(t.date ?? '').slice(0, 10);

function minutesOf(t: Training): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t.start_time ?? ''));
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Seance importee depuis Sante (Apple Sante, Health Connect, montre) */
const isImported = (t: Training) => !!t.healthkit_uuid;

/** Seance importee qui vient en fait de YOROI (recopiee dans Sante puis relue) */
const isYoroiEcho = (t: Training) => isImported(t) && /yoroi/i.test(String(t.source ?? ''));

const sameSport = (a: Training, b: Training) =>
  a.sport === b.sport || (getSportCategory(a.sport) !== 'autre' && getSportCategory(a.sport) === getSportCategory(b.sport));

/** Quantite d'infos d'une seance importee, pour garder la plus complete entre deux imports */
const richness = (t: Training) =>
  (t.heart_rate ? 1 : 0) + (t.calories ? 1 : 0) + (t.distance ? 1 : 0) + (t.workout_details_json ? 2 : 0);

/** Vrai si b est le doublon de a (meme seance) */
function isSameSession(a: Training, b: Training): boolean {
  if (dayOf(a) !== dayOf(b)) return false;
  const ma = minutesOf(a);
  const mb = minutesOf(b);
  if (ma === null || mb === null) {
    // Sans heure, seule une copie de YOROI relue depuis Sante est sure d'etre un doublon
    return (isYoroiEcho(a) || isYoroiEcho(b)) && sameSport(a, b);
  }
  if (Math.abs(ma - mb) > TOLERANCE_MIN) return false;
  return sameSport(a, b) || isYoroiEcho(a) || isYoroiEcho(b);
}

/** 16 octobre (SEANCES AVATAR) : la meme regle, pour l'import « Importer mes seances » (lib/v2/seances/importPlan.ts) */
export const estMemeSeance = isSameSession;

/** Quantite d'infos d'une seance importee (meme mesure que le dedoublonnage) */
export const richesseSeance = richness;

/**
 * Retire les doublons sans changer l'ordre de la liste.
 * Entre une seance YOROI et une seance importee, on garde YOROI.
 * Entre deux seances importees, on garde la plus complete.
 * Deux seances YOROI ne sont jamais fusionnees : tu as pu en noter deux.
 */
export function dedupeTrainings(list: Training[]): Training[] {
  const seenIds = new Set<number>();
  const unique = list.filter((t) => {
    if (typeof t.id !== 'number') return true;
    if (seenIds.has(t.id)) return false;
    seenIds.add(t.id);
    return true;
  });
  const drop = new Set<Training>();
  const byDay = new Map<string, Training[]>();
  for (const t of unique) {
    const k = dayOf(t);
    const arr = byDay.get(k);
    if (arr) arr.push(t);
    else byDay.set(k, [t]);
  }
  for (const day of byDay.values()) {
    if (day.length < 2) continue;
    for (const imp of day) {
      if (!isImported(imp) || drop.has(imp)) continue;
      for (const other of day) {
        if (other === imp || drop.has(other) || !isSameSession(imp, other)) continue;
        if (!isImported(other)) {
          drop.add(imp);
          break;
        }
        // Deux imports de la meme seance (montre et autre app) : garder le plus complet
        const loser = richness(other) > richness(imp) ? imp : other;
        drop.add(loser);
        if (loser === imp) break;
      }
    }
  }
  return drop.size ? unique.filter((t) => !drop.has(t)) : unique;
}

/** Valeur vide pour la base (texte vide, liste vide en texte, null) */
const isBlank = (v: unknown) => v == null || v === '' || v === '[]' || v === '{}' || v === 'null';

/**
 * Infos que seule une personne ajoute (jamais l'import Sante) : etoiles, ressenti, debrief, rounds, exercices,
 * club, theme, types. Le texte des notes n'est pas dedans : l'import en ecrit un automatiquement.
 * (verif donnees, 13 octobre : une seance importee que tu avais completee dans la 2.4.2 ne doit pas partir au nettoyage)
 */
const USER_FIELDS = [
  'session_rating', 'session_mood', 'technique_rating', 'what_worked', 'what_didnt_work', 'game_plan',
  'combat_rounds', 'exercises', 'technical_theme', 'session_types', 'club_id', 'score_for', 'score_against',
] as const;

/** Vrai si l'import n'a aucune info (frequence cardiaque, calories, distance, details, ni rien ajoute a la main) absente de la seance gardee */
const bringsNothingMore = (imp: Training, keep: Training) =>
  (['heart_rate', 'calories', 'distance', 'workout_details_json', ...USER_FIELDS] as const).every(
    (k) => isBlank((imp as any)[k]) || !isBlank((keep as any)[k]),
  );

/** Vrai si tout ce que tu as ajoute a la main sur l'import est aussi sur la seance gardee */
const userFieldsKept = (imp: Training, keep: Training) =>
  USER_FIELDS.every((k) => isBlank((imp as any)[k]) || !isBlank((keep as any)[k]));

/** Nombre d'infos ajoutees a la main, pour garder la copie que tu as completee */
const userScore = (t: Training) => USER_FIELDS.reduce((n, k) => n + (isBlank((t as any)[k]) ? 0 : 1), 0);

/** Une seance importee a effacer pour de bon, et la seance qu'on garde a sa place */
export type DuplicateToDelete = { drop: Training; keep: Training; reason: 'yoroi' | 'meme_id' };

/**
 * Doublons a effacer vraiment de la base (nettoyage unique, voir dedupeMigration.ts).
 * Plus prudent que l'affichage, avec la meme regle de meme seance (isSameSession) :
 * 1. une seance importee qui doublonne une seance notee dans YOROI : on garde YOROI ;
 * 2. deux imports avec le meme identifiant de source : on garde le plus ancien.
 * Jamais une seance notee dans YOROI, jamais deux imports differents entre eux.
 */
export function findDuplicatesToDelete(list: Training[]): DuplicateToDelete[] {
  const rows = list.filter((t) => typeof t.id === 'number');
  const out: DuplicateToDelete[] = [];
  const dropped = new Set<number>();
  const byDay = new Map<string, Training[]>();
  for (const t of rows) {
    const k = dayOf(t);
    const arr = byDay.get(k);
    if (arr) arr.push(t);
    else byDay.set(k, [t]);
  }
  for (const day of byDay.values()) {
    const yoroi = day.filter((t) => !isImported(t));
    if (!yoroi.length) continue;
    for (const imp of day) {
      if (!isImported(imp)) continue;
      const keep = yoroi.find((y) => isSameSession(imp, y));
      // 13 octobre : on n'efface que si l'import n'apporte rien de plus (copie de YOROI relue, ou import
      // sans frequence cardiaque, calories, distance ni details que la seance YOROI n'a pas). Une vraie seance
      // de montre plus riche reste en base (masquee a l'affichage par dedupeTrainings) : rien ne se perd.
      if (keep && (isYoroiEcho(imp) ? userFieldsKept(imp, keep) : bringsNothingMore(imp, keep))) {
        out.push({ drop: imp, keep, reason: 'yoroi' });
        dropped.add(imp.id as number);
      }
    }
  }
  const byUuid = new Map<string, Training[]>();
  for (const t of rows) {
    if (!isImported(t) || dropped.has(t.id as number)) continue;
    const k = String(t.healthkit_uuid);
    const arr = byUuid.get(k);
    if (arr) arr.push(t);
    else byUuid.set(k, [t]);
  }
  for (const group of byUuid.values()) {
    if (group.length < 2) continue;
    // on garde la copie que tu as completee (puis la plus riche, puis la plus ancienne) ;
    // une copie qui porte une info absente de celle gardee reste en base (masquee a l'affichage)
    const sorted = [...group].sort((a, b) => userScore(b) - userScore(a) || richness(b) - richness(a) || (a.id as number) - (b.id as number));
    for (const t of sorted.slice(1)) {
      if (bringsNothingMore(t, sorted[0])) out.push({ drop: t, keep: sorted[0], reason: 'meme_id' });
    }
  }
  return out;
}
