/**
 * Contexte de chaque pesee (1er novembre 2026, demande AT, point 1) : heure, appareil, moment (reveil, avant ou
 * apres seance, autre), a jeun. La table weights n'a pas de colonne pour eux et lib/database*.ts n'est pas a nous :
 * une table d'accompagnement dans AsyncStorage (cle yoroi_contexte_pesees_v1), reliee a la pesee par son
 * identifiant quand il est connu, sinon par la date et le poids.
 *
 * Remplie par :
 *  - l'import IA (lib/v2/balance/save.ts) : heure et appareil lus sur la photo, et la deuxieme pesee du jour ;
 *  - Apple Sante (lib/healthConnect.ios.ts) : heure de l'echantillon et appareil ou application source ;
 *  - le detail d'une pesee (app/pesee-detail.tsx) : moment, a jeun, heure, appareil corriges a la main ;
 *  - la seance en direct (components/yoroi/v2/seance/PeseeSeance.tsx) : pesee avant et apres seance.
 *    Celles-la restent ICI seulement (seule: true) : elles n'entrent pas dans la courbe du poids, qui garde la
 *    pesee du reveil (lib/v2/pesee/poidsDuJour.ts, non modifie).
 *
 * Migration future en base (conversation pesee) : le SQL est dans _propositions/donnees_corps_ajouts_2026-11-01/.
 * Synchronisee par element (lib/v2/synchro/cles.ts) et sauvegardee avec toutes les cles de l'app.
 */
import { lireListe, modifierListe, nombre, remplacerParId } from './listeStockee';

export const CLE_CONTEXTE_PESEES = 'yoroi_contexte_pesees_v1';

export type MomentPesee = 'reveil' | 'avant_seance' | 'apres_seance' | 'autre';
export const MOMENTS_PESEE: MomentPesee[] = ['reveil', 'avant_seance', 'apres_seance', 'autre'];
export type OrigineContexte = 'ia_balance' | 'saisie' | 'healthkit' | 'seance';

export type ContextePesee = {
  /** cp_AAAA-MM-JJ_poids (pesee de la table weights) ou cs_AAAA-MM-JJ_HHMM_moment (pesee de seance) */
  id: string;
  /** AAAA-MM-JJ */
  date: string;
  poids: number | null;
  /** id de la ligne weights quand il est connu (il change d'un telephone a l'autre : on retombe sur date et poids) */
  peseeId?: number | null;
  /** HH:MM, heure locale */
  heure?: string | null;
  appareil?: string | null;
  moment?: MomentPesee | null;
  aJeun?: boolean | null;
  /** eau bue pendant la seance, en litres (pesee apres seance) */
  eauBueL?: number | null;
  /** pesee gardee seulement ici (seance, deuxieme pesee importee) : hors courbe du poids */
  seule?: boolean;
  origine: OrigineContexte;
  creeLe: string;
  majLe: string;
};

const r1 = (x: number) => Math.round(x * 10) / 10;

/** « 7:05 », « 07h05 », « 7 h 5 » : HH:MM ; null si illisible */
export function normaliserHeure(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const m = /^\s*(\d{1,2})\s*(?:[:hH]\s*(\d{1,2}))?\s*$/.exec(s);
  if (!m) return null;
  const h = +m[1];
  const mi = m[2] !== undefined ? +m[2] : 0;
  if (h > 23 || mi > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

/** Heure locale d'un instant ISO (echantillon Apple Sante) ; null si illisible */
export function heureDepuisInstant(iso: unknown): string | null {
  if (typeof iso !== 'string' || !/T\d{2}:\d{2}/.test(iso)) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function idContextePesee(date: string, poids: number): string {
  return `cp_${String(date).slice(0, 10)}_${r1(poids).toFixed(1)}`;
}

export function idPeseeSeance(date: string, heure: string, moment: MomentPesee): string {
  return `cs_${String(date).slice(0, 10)}_${heure.replace(':', '')}_${moment}`;
}

export type NouveauContexte = {
  date: string;
  poids?: number | null;
  peseeId?: number | null;
  heure?: string | null;
  appareil?: string | null;
  moment?: MomentPesee | null;
  aJeun?: boolean | null;
  eauBueL?: number | null;
  seule?: boolean;
  origine: OrigineContexte;
};

/** Un contexte bien forme ; null s'il manque la date, ou le poids et l'heure d'une pesee de seance */
export function creerContexte(n: NouveauContexte, maintenant: Date = new Date()): ContextePesee | null {
  const date = String(n.date ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const poids = nombre(n.poids);
  const p = poids !== undefined && poids > 20 && poids < 400 ? r1(poids) : null;
  const heure = normaliserHeure(n.heure ?? undefined);
  const moment = n.moment && MOMENTS_PESEE.includes(n.moment) ? n.moment : null;
  let id: string;
  if (n.seule) {
    if (!heure || !moment || p === null) return null;
    id = idPeseeSeance(date, heure, moment);
  } else {
    if (p === null) return null;
    id = idContextePesee(date, p);
  }
  const eau = nombre(n.eauBueL);
  const appareil = typeof n.appareil === 'string' && n.appareil.trim() ? n.appareil.trim().slice(0, 60) : null;
  const iso = maintenant.toISOString();
  return {
    id,
    date,
    poids: p,
    ...(n.peseeId ? { peseeId: n.peseeId } : {}),
    heure,
    appareil,
    moment,
    aJeun: typeof n.aJeun === 'boolean' ? n.aJeun : null,
    ...(eau !== undefined && eau >= 0 && eau < 10 ? { eauBueL: Math.round(eau * 100) / 100 } : {}),
    ...(n.seule ? { seule: true } : {}),
    origine: n.origine,
    creeLe: iso,
    majLe: iso,
  };
}

/**
 * Deux contextes de la meme pesee : une saisie a la main l'emporte toujours ; sinon le nouveau complete seulement
 * ce qui manquait (une synchro Apple Sante ne remplace pas l'appareil lu sur la photo).
 */
export function fusionnerContexte(ancien: ContextePesee, nouveau: ContextePesee): ContextePesee {
  const main = nouveau.origine === 'saisie' || nouveau.origine === 'seance';
  const pick = <K extends keyof ContextePesee>(k: K): ContextePesee[K] => {
    const a = ancien[k];
    const b = nouveau[k];
    if (main) return (b ?? a) as ContextePesee[K];
    return (a ?? b) as ContextePesee[K];
  };
  const out: ContextePesee = {
    ...ancien,
    poids: pick('poids'),
    heure: pick('heure'),
    appareil: pick('appareil'),
    moment: pick('moment'),
    aJeun: pick('aJeun'),
    origine: main ? nouveau.origine : ancien.origine,
    creeLe: ancien.creeLe,
    majLe: ancien.majLe,
  };
  const pid = pick('peseeId');
  if (pid) out.peseeId = pid;
  const eau = pick('eauBueL');
  if (eau != null) out.eauBueL = eau;
  if (JSON.stringify({ ...out, majLe: '' }) !== JSON.stringify({ ...ancien, majLe: '' })) out.majLe = nouveau.majLe;
  return out;
}

export function estContextePesee(x: unknown): x is ContextePesee {
  const c = x as ContextePesee;
  return !!c && typeof c === 'object' && typeof c.id === 'string' && typeof c.date === 'string' && (c.poids === null || typeof c.poids === 'number');
}

/** Le contexte d'une pesee de la table weights : par son id, sinon par la date et le poids (a 50 g pres) */
export function contexteDePesee(w: { id?: number | null; date: string; weight: number }, liste: ContextePesee[]): ContextePesee | undefined {
  const jour = String(w.date).slice(0, 10);
  const parId = w.id ? liste.find((c) => !c.seule && c.peseeId === w.id && c.date === jour) : undefined;
  return parId ?? liste.find((c) => !c.seule && c.date === jour && c.poids !== null && Math.abs(c.poids - Number(w.weight)) < 0.05);
}

/** Toutes les pesees d'un jour, de la table et de la seance, dans l'ordre de l'heure (sans heure : a la fin) */
export function peseesDuJourAvecContexte(
  jour: string,
  rows: { id?: number | null; date: string; weight: number; created_at?: string }[],
  liste: ContextePesee[],
  heureDe?: (w: { date: string; created_at?: string }) => string | null,
): { poids: number; heure: string | null; moment: MomentPesee | null; appareil: string | null; aJeun: boolean | null; peseeId?: number | null; seule: boolean }[] {
  const out: { poids: number; heure: string | null; moment: MomentPesee | null; appareil: string | null; aJeun: boolean | null; peseeId?: number | null; seule: boolean }[] = [];
  for (const w of rows.filter((r) => String(r.date).slice(0, 10) === jour && Number(r.weight) > 0)) {
    const c = contexteDePesee(w, liste);
    out.push({ poids: Number(w.weight), heure: c?.heure ?? heureDe?.(w) ?? null, moment: c?.moment ?? null, appareil: c?.appareil ?? null, aJeun: c?.aJeun ?? null, peseeId: w.id, seule: false });
  }
  for (const c of liste.filter((x) => x.seule && x.date === jour && x.poids !== null)) {
    out.push({ poids: c.poids as number, heure: c.heure ?? null, moment: c.moment ?? null, appareil: c.appareil ?? null, aJeun: c.aJeun ?? null, seule: true });
  }
  return out.sort((a, b) => (a.heure ?? '99') < (b.heure ?? '99') ? -1 : (a.heure ?? '99') > (b.heure ?? '99') ? 1 : 0);
}

// ---------- stockage ----------

export async function lireContextesPesees(): Promise<ContextePesee[]> {
  return lireListe(CLE_CONTEXTE_PESEES, estContextePesee);
}

/** Enregistre (ou complete) des contextes ; ne lance jamais */
export async function enregistrerContextes(nouveaux: (NouveauContexte | null | undefined)[]): Promise<boolean> {
  const maintenant = new Date();
  const liste = nouveaux.map((n) => (n ? creerContexte(n, maintenant) : null)).filter((c): c is ContextePesee => !!c);
  if (!liste.length) return false;
  return modifierListe<ContextePesee>(CLE_CONTEXTE_PESEES, (avant) => remplacerParId(avant.filter(estContextePesee), liste, fusionnerContexte));
}

/** Retire une pesee de seance (seule) ; les contextes des pesees de la table restent */
export async function retirerPeseeSeance(id: string): Promise<boolean> {
  return modifierListe<ContextePesee>(CLE_CONTEXTE_PESEES, (avant) => {
    const apres = avant.filter((c) => !(c && c.id === id && c.seule));
    return apres.length === avant.length ? avant : apres;
  });
}

// File d'attente : Apple Sante envoie des centaines de pesees d'un coup, une seule ecriture pour toutes
let file: NouveauContexte[] = [];
let minuteur: ReturnType<typeof setTimeout> | null = null;

/** Ajoute un contexte a ecrire avec les autres dans un instant (import Apple Sante) */
export function contexteEnFile(n: NouveauContexte): void {
  file.push(n);
  if (minuteur) return;
  minuteur = setTimeout(() => {
    const lot = file;
    file = [];
    minuteur = null;
    void enregistrerContextes(lot);
  }, 600);
}
