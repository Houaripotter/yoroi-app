/**
 * 2 novembre 2026 (cartes v10) : la vraie date d'installation de YOROI sur ce telephone,
 * independante de profile.created_at (qu'une restauration peut changer).
 *
 * La cle yoroi_date_installation :
 *  - est ecrite UNE seule fois, au premier lancement (app/_layout.tsx, apres l'ouverture de la base), si elle n'existe pas ;
 *  - n'est jamais synchronisee entre tes appareils : elle n'est pas dans lib/v2/synchro/cles.ts (chaque telephone a la sienne) ;
 *  - est dans la sauvegarde (lib/exportService.ts). A la restauration, on garde la plus ancienne des deux dates,
 *    jamais une plus recente.
 * Valeur : {"date":"AAAA-MM-JJ","statut":"reelle"|"estimee"}.
 *
 * REGLE DES UTILISATEURS EXISTANTS. A la mise a jour qui apporte cette cle, la vraie date est inconnue.
 * Si l'app a deja des donnees, la date est la plus ancienne de ces donnees : premiere seance, premiere pesee,
 * creation du profil, premier lancement compte par les badges (@yoroi_first_use_date), ancienne date d'installation
 * de la sauvegarde (@yoroi_install_date). Elle est marquee « estimee ».
 * Sans aucune donnee (ou seulement des donnees du jour), c'est une vraie premiere installation : aujourd'hui, « reelle ».
 * Une date estimee n'est jamais plus recente qu'une donnee de l'app : aucun jour avec une seance n'est « inconnu ».
 *
 * Elle sert a la carte Semaine (lib/v2/cartes/charger.ts, chargerSemaine) : un jour avant le debut des donnees
 * est « inconnu » (un trait gris), pas « repos ».
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLE_DATE_INSTALLATION = 'yoroi_date_installation';

export type StatutInstallation = 'reelle' | 'estimee';
export type DateInstallation = { date: string; statut: StatutInstallation };

const JOUR = /^\d{4}-\d{2}-\d{2}/;
const pad = (n: number) => String(n).padStart(2, '0');

/** AAAA-MM-JJ local */
export function jourLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Le jour (AAAA-MM-JJ) d'une date ISO ou d'un horodatage, null si illisible */
export function jourDe(v: unknown): string | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) return jourLocal(new Date(v));
  if (typeof v !== 'string' || !v) return null;
  if (/^\d{12,}$/.test(v)) return jourLocal(new Date(Number(v)));
  if (JOUR.test(v)) {
    // une date avec heure (ISO) se lit dans le fuseau du telephone ; une date seule reste telle quelle
    if (v.length > 10 && /T/.test(v)) {
      const t = new Date(v);
      return Number.isFinite(t.getTime()) ? jourLocal(t) : v.slice(0, 10);
    }
    return v.slice(0, 10);
  }
  const t = new Date(v);
  return Number.isFinite(t.getTime()) ? jourLocal(t) : null;
}

/** La valeur rangee, lue avec prudence : null si absente ou illisible */
export function lireValeurInstallation(raw: unknown): DateInstallation | null {
  if (raw == null) return null;
  let o: unknown = raw;
  if (typeof raw === 'string') {
    try {
      o = JSON.parse(raw);
    } catch {
      o = raw;
    }
  }
  if (typeof o === 'string') {
    const d = jourDe(o);
    return d ? { date: d, statut: 'reelle' } : null;
  }
  if (o && typeof o === 'object') {
    const x = o as { date?: unknown; statut?: unknown };
    const d = jourDe(x.date);
    if (!d) return null;
    return { date: d, statut: x.statut === 'estimee' ? 'estimee' : 'reelle' };
  }
  return null;
}

/** La plus ancienne des deux ; a date egale, « reelle » l'emporte sur « estimee » */
export function plusAncienne(a: DateInstallation | null, b: DateInstallation | null): DateInstallation | null {
  if (!a) return b;
  if (!b) return a;
  if (a.date < b.date) return a;
  if (b.date < a.date) return b;
  return { date: a.date, statut: a.statut === 'reelle' || b.statut === 'reelle' ? 'reelle' : 'estimee' };
}

export async function lireDateInstallation(): Promise<DateInstallation | null> {
  try {
    return lireValeurInstallation(await AsyncStorage.getItem(CLE_DATE_INSTALLATION));
  } catch {
    return null;
  }
}

/** La plus ancienne donnee de l'app (AAAA-MM-JJ), null si l'app est vide */
export async function plusAncienneDonnee(): Promise<string | null> {
  const dates: (string | null)[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const db = require('@/lib/database') as typeof import('@/lib/database');
    const [trainings, weights, profile] = await Promise.all([
      db.getTrainings().catch(() => []),
      db.getWeights().catch(() => []),
      db.getProfile().catch(() => null),
    ]);
    for (const t of trainings ?? []) dates.push(jourDe(t.date));
    for (const w of weights ?? []) dates.push(jourDe(w.date));
    const p = profile as { created_at?: unknown } | null;
    if (p?.created_at) dates.push(jourDe(p.created_at));
  } catch {
    // base pas prete : on compte seulement les cles ci-dessous
  }
  try {
    const [premier, ancienne] = await Promise.all([AsyncStorage.getItem('@yoroi_first_use_date'), AsyncStorage.getItem('@yoroi_install_date')]);
    dates.push(jourDe(premier), jourDe(ancienne));
  } catch {
    // facultatif
  }
  const ok = dates.filter((d): d is string => !!d && d >= '2000-01-01').sort();
  return ok[0] ?? null;
}

/**
 * Au premier lancement : ecrit la date si elle n'existe pas, et ne la change plus jamais ensuite.
 * Rend la date rangee (l'ancienne si elle existait deja).
 */
export async function poserDateInstallation(opts?: { maintenant?: Date; plusAncienneDonnee?: () => Promise<string | null> }): Promise<DateInstallation | null> {
  const deja = await lireDateInstallation();
  if (deja) return deja;
  const auj = jourLocal(opts?.maintenant ?? new Date());
  let ancienne: string | null = null;
  try {
    ancienne = await (opts?.plusAncienneDonnee ?? plusAncienneDonnee)();
  } catch {
    ancienne = null;
  }
  // utilisateur existant : la plus ancienne donnee, estimee ; sinon une vraie premiere installation, aujourd'hui
  const v: DateInstallation = ancienne && ancienne < auj ? { date: ancienne, statut: 'estimee' } : { date: auj, statut: 'reelle' };
  try {
    // relue juste avant d'ecrire : un autre appel a pu l'ecrire entre-temps
    const encore = await lireDateInstallation();
    if (encore) return encore;
    await AsyncStorage.setItem(CLE_DATE_INSTALLATION, JSON.stringify(v));
  } catch {
    return null;
  }
  return v;
}

/**
 * Restauration d'une sauvegarde : on garde la plus ancienne des deux dates (celle du telephone, celle de la sauvegarde),
 * jamais une plus recente. Rend la date gardee.
 */
export async function restaurerDateInstallation(entrante: unknown): Promise<DateInstallation | null> {
  const recue = lireValeurInstallation(entrante);
  const ici = await lireDateInstallation();
  const garde = plusAncienne(ici, recue);
  if (!garde) return null;
  if (!ici || garde.date !== ici.date || garde.statut !== ici.statut) {
    try {
      await AsyncStorage.setItem(CLE_DATE_INSTALLATION, JSON.stringify(garde));
    } catch {
      return ici;
    }
  }
  return garde;
}

/** Le debut des donnees de la carte Semaine : le plus ancien entre la date d'installation et ta premiere seance */
export function debutDesDonnees(installation: string | null | undefined, premiereSeance: string | null | undefined): string | null {
  const l = [installation, premiereSeance].filter((x): x is string => !!x && JOUR.test(x)).map((x) => x.slice(0, 10)).sort();
  return l[0] ?? null;
}
