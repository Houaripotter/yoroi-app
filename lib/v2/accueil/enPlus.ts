/**
 * Blocs en plus de l'accueil (16 octobre 2026). Houari : « regarde ce qu'on pourrait mettre sur l'accueil en plus,
 * dans les réglages, que l'utilisateur ajoutera lui-même, tant qu'il ne met rien on n'affiche rien ».
 * Chaque bloc est cache par defaut (lib/v2/accueil/disposition.ts) et ne montre une tuile que si l'app a deja
 * la donnee : rien d'invente, rien de calcule a partir de valeurs par defaut.
 *   Activite (affichee par defaut, 16 octobre) : tes pas, tes calories actives et tes minutes d'exercice du jour
 *   Coeur au repos : ta frequence cardiaque au repos (Sante)
 *   Records et regularite : ton dernier record (30 jours au plus), tes semaines d'affilee a l'objectif
 *   Ta prochaine pesee   : tes jours de pesee choisis (onboarding ou Notifications)
 *   Avant, apres         : ta premiere et ta derniere photo
 * Aucun import React Native ici : tout se teste avec jest.
 */
import type { Training } from '@/lib/database';
import { computeRecords, formatRecordValue, recordShortTitle } from '@/lib/v2/seances/records';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import { dedupeTrainings } from '@/lib/v2/seances/dedupe';

type Point = { date: string; value: number };

const DAY = 86400000;
const p2 = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const jourNum = (s: string) => Math.round(new Date(s.slice(0, 10) + 'T12:00:00').getTime() / DAY);

function lundi(s: string): string {
  const d = new Date(s.slice(0, 10) + 'T12:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}
function semainesAvant(s: string, n: number): string {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() - n * 7);
  return iso(d);
}

/** Tes pas du jour et tes calories actives du jour, null sans pas notes aujourd'hui */
export function pasDuJour(pas: Point[] | null | undefined, energie: Point[] | null | undefined, aujourdhui: string): { pas: number; kcal: number | null } | null {
  const p = (pas ?? []).find((x) => x.date === aujourdhui && Number.isFinite(x.value) && x.value > 0);
  if (!p) return null;
  const e = (energie ?? []).find((x) => x.date === aujourdhui && Number.isFinite(x.value) && x.value > 0);
  return { pas: Math.round(p.value), kcal: e ? Math.round(e.value) : null };
}

/**
 * Tuile Activite (16 octobre, Houari : une tuile des pas par defaut, « tout ça c'était trop ») : tes pas du jour
 * en grand, tes calories actives et tes minutes d'exercice en petit. Seulement des valeurs du jour notees par
 * Sante ou Health Connect ; null quand aucune des trois n'existe (la tuile ne s'affiche pas).
 */
export function activiteDuJour(
  pas: Point[] | null | undefined,
  energie: Point[] | null | undefined,
  exercice: Point[] | null | undefined,
  aujourdhui: string,
): { pas: number | null; kcal: number | null; minutes: number | null } | null {
  const du = (l: Point[] | null | undefined) => {
    const x = (l ?? []).find((y) => y.date === aujourdhui && Number.isFinite(y.value) && y.value > 0);
    return x ? Math.round(x.value) : null;
  };
  const r = { pas: du(pas), kcal: du(energie), minutes: du(exercice) };
  return r.pas === null && r.kcal === null && r.minutes === null ? null : r;
}

/** Ta frequence cardiaque au repos la plus recente (7 jours au plus) et ta moyenne sur 30 jours (5 mesures au moins) */
export function coeurAuRepos(fc: Point[] | null | undefined, aujourdhui: string): { bpm: number; date: string; moyenne: number | null } | null {
  const t = jourNum(aujourdhui);
  const ok = (fc ?? []).filter((x) => Number.isFinite(x.value) && x.value > 20 && x.value < 150 && jourNum(x.date) <= t).sort((a, b) => a.date.localeCompare(b.date));
  const last = ok[ok.length - 1];
  if (!last || t - jourNum(last.date) > 7) return null;
  const mois = ok.filter((x) => t - jourNum(x.date) < 30);
  const moyenne = mois.length >= 5 ? Math.round(mois.reduce((s, x) => s + x.value, 0) / mois.length) : null;
  return { bpm: Math.round(last.value), date: last.date, moyenne };
}

/** Ton dernier record battu en seance, s'il date de 30 jours au plus */
export function dernierRecord(trainings: Training[], aujourdhui: string, unite: UnitePoids = 'kg'): { titre: string; valeur: string; date: string; ecart?: string | null } | null {
  let r: ReturnType<typeof computeRecords>;
  try {
    r = computeRecords(trainings);
  } catch {
    return null;
  }
  const t = jourNum(aujourdhui);
  const x = r.recent.find((k) => !k.line.minor && t - jourNum(k.point.date) <= 30 && jourNum(k.point.date) <= t);
  if (!x) return null;
  // 17 octobre : l'ecart avec le record d'avant, seulement quand il se lit simplement (pas pour une allure)
  let ecart: string | null = null;
  const avant = (x.line.history ?? []).filter((p: any) => p.isRecord && p.date < x.point.date).sort((a: any, b: any) => (a.date < b.date ? 1 : -1))[0];
  if (avant && x.line.kind !== 'allure') {
    const d = x.point.value - avant.value;
    if (d > 1e-9) {
      try {
        ecart = `+${formatRecordValue(x.line, d, unite).main}`;
      } catch {
        ecart = null;
      }
    }
  }
  return { titre: recordShortTitle(x.line), valeur: formatRecordValue(x.line, x.point.value, unite).main, date: x.point.date, ecart };
}

/**
 * Tes semaines d'affilee a l'objectif. La semaine en cours compte des que l'objectif est tenu ;
 * sinon on part de la semaine derniere (elle n'est pas encore finie). null sans objectif ou a 0.
 */
export function semainesTenues(trainings: Training[], objectif: number, aujourdhui: string): number | null {
  if (!(objectif > 0)) return null;
  const parSemaine = new Map<string, number>();
  for (const t of trainings) {
    const d = (t?.date ?? '').slice(0, 10);
    if (!d || d > aujourdhui) continue;
    const m = lundi(d);
    parSemaine.set(m, (parSemaine.get(m) ?? 0) + 1);
  }
  let w = lundi(aujourdhui);
  if ((parSemaine.get(w) ?? 0) < objectif) w = semainesAvant(w, 1);
  let n = 0;
  while ((parSemaine.get(w) ?? 0) >= objectif && n < 520) {
    n += 1;
    w = semainesAvant(w, 1);
  }
  return n > 0 ? n : null;
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/**
 * Ta prochaine pesee prevue : le prochain de tes jours de pesee (Date.getDay(), 0 = dimanche).
 * Aujourd'hui compte tant que tu ne t'es pas pese. null sans jours choisis.
 */
export function prochainePesee(jours: number[] | null | undefined, heure: [number, number] | null, peseAujourdhui: boolean, now: Date): { quand: string; dans: number; heure: string | null } | null {
  const js = (jours ?? []).filter((j) => Number.isInteger(j) && j >= 0 && j <= 6);
  if (!js.length) return null;
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12);
    if (!js.includes(d.getDay())) continue;
    if (i === 0 && peseAujourdhui) continue;
    const quand = i === 0 ? 'Aujourd’hui' : i === 1 ? 'Demain' : JOURS[d.getDay()].charAt(0).toUpperCase() + JOURS[d.getDay()].slice(1);
    const h = heure ? `${heure[0]} h ${p2(heure[1])}` : null;
    return { quand, dans: i, heure: h };
  }
  return null;
}

/** Ta premiere et ta derniere photo (2 photos au moins, dates differentes) */
export function avantApres<T extends { date: string; uri: string }>(photos: T[] | null | undefined): { avant: T; apres: T } | null {
  const ok = (photos ?? []).filter((x) => !!x?.uri && !!x?.date).sort((a, b) => a.date.localeCompare(b.date));
  if (ok.length < 2) return null;
  const avant = ok[0];
  const apres = ok[ok.length - 1];
  if (avant.date.slice(0, 10) === apres.date.slice(0, 10)) return null;
  return { avant, apres };
}

/* ============ Ta sante aujourd'hui (17 octobre) ============ */

/**
 * Les mesures de la tuile « Ta santé aujourd'hui » (Houari : « un rectangle avec tous les éléments »), dans l'ordre
 * de la grille. Les cumuls (pas, calories, distance, exercice, debout, sommeil de la nuit) ne comptent que pour
 * aujourd'hui ; la FC du jour aussi. FC au repos, SpO2 et frequence respiratoire, souvent mesurees la nuit, peuvent
 * dater d'hier (hier = vrai). Une mesure sans donnee n'apparait pas : rien n'est invente.
 */
export type CleSanteJour = 'pas' | 'energie-active' | 'distance' | 'exercice' | 'frequence-cardiaque' | 'fc-repos' | 'oxygene' | 'respiration' | 'sommeil' | 'debout';

export const MESURES_SANTE_JOUR: CleSanteJour[] = ['pas', 'energie-active', 'distance', 'exercice', 'frequence-cardiaque', 'fc-repos', 'oxygene', 'respiration', 'sommeil', 'debout'];

const LA_NUIT_OU_HIER: CleSanteJour[] = ['fc-repos', 'oxygene', 'respiration'];

/** bornes de vraisemblance : une valeur hors bornes est ignoree (capteur, unite inattendue) */
const BORNES: Record<CleSanteJour, [number, number]> = {
  pas: [1, 200000],
  'energie-active': [1, 10000],
  distance: [0.01, 300],
  exercice: [1, 1440],
  'frequence-cardiaque': [25, 230],
  'fc-repos': [25, 150],
  oxygene: [50, 100],
  respiration: [3, 60],
  sommeil: [1, 1440],
  debout: [1, 24],
};

export type MesureSanteJour = { cle: CleSanteJour; valeur: number; hier: boolean };

function hierDe(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return iso10(d);
}
const iso10 = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

export function santeDuJour(series: Partial<Record<string, Point[] | null | undefined>> | null | undefined, aujourdhui: string): MesureSanteJour[] {
  if (!series) return [];
  const hier = hierDe(aujourdhui);
  const out: MesureSanteJour[] = [];
  for (const cle of MESURES_SANTE_JOUR) {
    const l = (series[cle] ?? []).filter((x) => x && Number.isFinite(x.value) && x.value > 0);
    const pour = (j: string) => {
      const x = l.find((y) => (y.date ?? '').slice(0, 10) === j);
      if (!x) return null;
      // distance : Sante donne des kilometres ; une valeur en metres (plus de 300) est ramenee en kilometres
      let v = cle === 'distance' && x.value > 300 ? x.value / 1000 : x.value;
      if (cle === 'oxygene' && v > 0 && v <= 1) v = v * 100;
      const [min, max] = BORNES[cle];
      return v >= min && v <= max ? v : null;
    };
    const auj = pour(aujourdhui);
    if (auj !== null) out.push({ cle, valeur: auj, hier: false });
    else if (LA_NUIT_OU_HIER.includes(cle)) {
      const h = pour(hier);
      if (h !== null) out.push({ cle, valeur: h, hier: true });
    }
  }
  return out;
}

/** La valeur affichee et son unite, au format francais (aucun arrondi trompeur : celui de l'ecran Sante) */
export function texteMesureSante(m: MesureSanteJour): { valeur: string; unite: string } {
  // espace simple entre les milliers, comme les autres tuiles (l'espace fine ne s'affiche pas partout)
  const entier = (n: number) => Math.round(n).toLocaleString('fr-FR').replace(/[\u202f\u00a0 ]/g, ' ');
  const dec = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
  switch (m.cle) {
    case 'pas':
      return { valeur: entier(m.valeur), unite: 'pas' };
    case 'energie-active':
      return { valeur: entier(m.valeur), unite: 'kcal' };
    case 'distance':
      return { valeur: dec(m.valeur), unite: 'km' };
    case 'exercice':
      return { valeur: entier(m.valeur), unite: 'min' };
    case 'frequence-cardiaque':
    case 'fc-repos':
      return { valeur: entier(m.valeur), unite: 'bpm' };
    case 'oxygene':
      return { valeur: entier(m.valeur), unite: '%' };
    case 'respiration':
      return { valeur: dec(m.valeur).replace(/,0$/, ''), unite: 'resp/min' };
    case 'sommeil': {
      const h = Math.floor(Math.round(m.valeur) / 60);
      const mm = Math.round(m.valeur) % 60;
      return h > 0 ? { valeur: `${h} h ${p2(mm)}`, unite: '' } : { valeur: String(mm), unite: 'min' };
    }
    case 'debout':
      return { valeur: entier(m.valeur), unite: 'h' };
  }
}

/**
 * Objectifs des anneaux (17 octobre, tuile Sante) : rien d'invente. Calories actives, exercice et heures debout :
 * tes objectifs d'anneaux de l'ecran Sante (500 kcal, 30 min, 12 h tant que tu ne les as pas changes) ; sommeil :
 * ton objectif de sommeil (8 h par defaut) ; pas : aucun reglage dans l'app, un repere de 8 000 pas, dit comme tel
 * (le bas de la fourchette 8 000 a 10 000 citee par l'ecran Pas). repere = vrai quand la cible est un repere.
 */
export type ObjectifsSante = { kcal?: number | null; exercice?: number | null; debout?: number | null; sommeilMin?: number | null };
export const REPERE_PAS = 8000;

export function objectifMesure(cle: CleSanteJour, o: ObjectifsSante | null | undefined): { cible: number; repere: boolean; texte: string } | null {
  const ok = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);
  switch (cle) {
    case 'pas':
      return { cible: REPERE_PAS, repere: true, texte: 'repère 8 000' };
    case 'energie-active': {
      const v = ok(o?.kcal);
      return v ? { cible: v, repere: false, texte: `sur ${Math.round(v)} kcal` } : null;
    }
    case 'exercice': {
      const v = ok(o?.exercice);
      return v ? { cible: v, repere: false, texte: `sur ${Math.round(v)} min` } : null;
    }
    case 'debout': {
      const v = ok(o?.debout);
      return v ? { cible: v, repere: false, texte: `sur ${Math.round(v)} h` } : null;
    }
    case 'sommeil': {
      const v = ok(o?.sommeilMin);
      if (!v) return null;
      const h = Math.floor(v / 60);
      const m = Math.round(v % 60);
      return { cible: v, repere: false, texte: `sur ${h} h${m ? ` ${p2(m)}` : ''}` };
    }
    default:
      return null;
  }
}

/** La part de l'objectif atteinte, entre 0 et 1 */
export function partObjectif(valeur: number, cible: number): number {
  if (!(cible > 0) || !Number.isFinite(valeur)) return 0;
  return Math.max(0, Math.min(1, valeur / cible));
}

/**
 * Tes dernieres semaines face a ton objectif (17 octobre, tuile Regularite) : de la plus ancienne a la semaine en
 * cours. tenue : objectif atteint ; enCours : la semaine d'aujourd'hui (pas encore finie). [] sans objectif.
 */
export function semainesRecentes(trainings: Training[], objectif: number, aujourdhui: string, n = 8): { lundi: string; seances: number; tenue: boolean; enCours: boolean }[] {
  if (!(objectif > 0)) return [];
  const parSemaine = new Map<string, number>();
  for (const t of trainings) {
    const d = (t?.date ?? '').slice(0, 10);
    if (!d || d > aujourdhui) continue;
    const m = lundi(d);
    parSemaine.set(m, (parSemaine.get(m) ?? 0) + 1);
  }
  const cette = lundi(aujourdhui);
  const out: { lundi: string; seances: number; tenue: boolean; enCours: boolean }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const w = semainesAvant(cette, i);
    const k = parSemaine.get(w) ?? 0;
    out.push({ lundi: w, seances: k, tenue: k >= objectif, enCours: i === 0 });
  }
  return out;
}

/** Tes 7 dernieres nuits (de la plus ancienne a cette nuit), null quand rien n'est note ce jour-la */
export function septNuits(nuits: { date: string; duration: number }[] | null | undefined, aujourdhui: string): (number | null)[] {
  const parJour = new Map<string, number>();
  for (const x of nuits ?? []) {
    const d = (x?.date ?? '').slice(0, 10);
    if (d && Number.isFinite(x.duration) && x.duration > 0 && !parJour.has(d)) parJour.set(d, x.duration);
  }
  const out: (number | null)[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(aujourdhui + 'T12:00:00');
    d.setDate(d.getDate() - i);
    out.push(parJour.get(iso(d)) ?? null);
  }
  return out;
}

/** Tes seances de chaque jour de la semaine en cours (lundi a dimanche) */
export function joursDeLaSemaine<T extends { date: string }>(trainings: T[], aujourdhui: string): { iso: string; seances: T[]; aujourdhui: boolean; futur: boolean }[] {
  const l = lundi(aujourdhui);
  const out: { iso: string; seances: T[]; aujourdhui: boolean; futur: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(l + 'T12:00:00');
    d.setDate(d.getDate() + i);
    const j = iso(d);
    out.push({ iso: j, seances: trainings.filter((t) => (t?.date ?? '').slice(0, 10) === j), aujourdhui: j === aujourdhui, futur: j > aujourdhui });
  }
  return out;
}

/**
 * Anneaux relies a tes seances (17 octobre nuit, Houari : « l'anneau Exercice affiche 0/45 min alors que Dernière
 * séance montre une course de 52 min aujourd'hui »). Minutes d'exercice du jour = la plus grande valeur entre celles
 * de Sante (ou Health Connect, ou la demo) et la somme des durees de tes seances d'aujourd'hui dans l'app, sans
 * compter deux fois une seance importee de Sante (dedupeTrainings). Calories actives : si Sante n'en a pas, la somme
 * des calories de tes seances du jour. Rien d'invente : seulement des durees et des calories deja notees.
 */
export function activiteAvecSeances(mesures: MesureSanteJour[], trainings: Training[] | null | undefined, aujourdhui: string): MesureSanteJour[] {
  let jour: Training[] = [];
  try {
    jour = dedupeTrainings((trainings ?? []).filter((t) => (t?.date ?? '').slice(0, 10) === aujourdhui));
  } catch {
    jour = (trainings ?? []).filter((t) => (t?.date ?? '').slice(0, 10) === aujourdhui);
  }
  const minutes = jour.reduce((s, t) => s + (Number(t.duration_minutes ?? t.duration ?? 0) || 0), 0);
  const kcal = jour.reduce((s, t) => s + (Number(t.calories ?? 0) || 0), 0);
  const out = mesures.filter((m) => m.cle !== 'exercice' && !(m.cle === 'energie-active' && !(m.valeur > 0)));
  const ex = mesures.find((m) => m.cle === 'exercice');
  const exVal = Math.max(ex?.valeur ?? 0, minutes);
  if (exVal > 0) out.push({ cle: 'exercice', valeur: Math.round(exVal), hier: false });
  if (!out.some((m) => m.cle === 'energie-active') && kcal > 0) out.push({ cle: 'energie-active', valeur: Math.round(kcal), hier: false });
  return MESURES_SANTE_JOUR.map((k) => out.find((m) => m.cle === k)).filter(Boolean) as MesureSanteJour[];
}

