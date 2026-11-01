/**
 * Mensurations en plus (1er novembre 2026, demande AT, point 3) : poignet, cheville, genou, fessiers, taille la plus
 * etroite, biceps contracte (en plus du tour de bras relache de la table measurements). Gauche et droite quand c'est
 * pertinent. La table measurements n'est pas modifiable ici (lib/database*.ts) : un stockage a part, cle
 * yoroi_mensurations_plus_v1, synchronise et sauvegarde. Les 14 tours existants ne changent pas.
 * Remplies par l'ecran Mensurations (components/yoroi/v2/progres/MensurationsPlus.tsx) et par l'import IA
 * (consigne : regle 19 de lib/v2/balance/format.ts ; lignes autre reconnues ici par depuisAutres).
 */
import { lireListe, modifierListe, nombre, remplacerParId } from './listeStockee';
import { cleDe, coteDe, enUniteBase } from './sac';
import type { Cote } from './sac';

export const CLE_MENSURATIONS_PLUS = 'yoroi_mensurations_plus_v1';

export type ZonePlus = 'poignet' | 'cheville' | 'genou' | 'fessiers' | 'taille_etroite' | 'biceps_contracte';

export type SpecZonePlus = { id: ZonePlus; label: string; cotes: boolean; min: number; max: number; aide: string };

export const ZONES_PLUS: SpecZonePlus[] = [
  { id: 'poignet', label: 'Poignet', cotes: true, min: 10, max: 30, aide: 'juste au-dessus de l’os du poignet' },
  { id: 'cheville', label: 'Cheville', cotes: true, min: 15, max: 40, aide: 'au plus fin, au-dessus de la malléole' },
  { id: 'genou', label: 'Genou', cotes: true, min: 25, max: 60, aide: 'au milieu de la rotule, jambe tendue' },
  { id: 'fessiers', label: 'Fessiers', cotes: false, min: 60, max: 180, aide: 'au plus large des fesses, pieds joints' },
  { id: 'taille_etroite', label: 'Taille la plus étroite', cotes: false, min: 40, max: 180, aide: 'au plus fin du ventre, souvent au-dessus du nombril' },
  { id: 'biceps_contracte', label: 'Biceps contracté', cotes: true, min: 15, max: 70, aide: 'bras plié, biceps serré, au plus gros' },
];

export const ZONE_PLUS: Record<ZonePlus, SpecZonePlus> = Object.fromEntries(ZONES_PLUS.map((z) => [z.id, z])) as Record<ZonePlus, SpecZonePlus>;

export type MensurationPlus = {
  /** mp_AAAA-MM-JJ_zone_cote : une valeur par jour, par zone et par cote */
  id: string;
  date: string;
  zone: ZonePlus;
  cote: Cote | null;
  /** cm */
  valeur: number;
  origine: 'saisie' | 'ia_balance';
  creeLe: string;
};

export function idMensurationPlus(date: string, zone: ZonePlus, cote: Cote | null): string {
  return `mp_${String(date).slice(0, 10)}_${zone}_${cote ?? 'x'}`;
}

/** La zone d'un nom ecrit (« Tour de poignet droit », « Flexed biceps (L) », « Glutes ») ; undefined sinon */
export function zoneDepuisNom(nom: string): { zone: ZonePlus; cote: Cote | null } | undefined {
  const k = cleDe(nom);
  const cote = coteDe(nom);
  let zone: ZonePlus | undefined;
  if (/(poignet|wrist)/.test(k)) zone = 'poignet';
  else if (/(cheville|ankle)/.test(k)) zone = 'cheville';
  else if (/(genou|knee)/.test(k)) zone = 'genou';
  else if (/(fessier|fesses|glute|buttock|bum)/.test(k)) zone = 'fessiers';
  else if (/(taille_la_plus_etroite|taille_etroite|narrowest_waist|natural_waist|taille_fine)/.test(k)) zone = 'taille_etroite';
  else if (/(biceps|bras).*(contract|flex|flechi|serre)|(contract|flex).*(biceps|bras|arm)/.test(k)) zone = 'biceps_contracte';
  if (!zone) return undefined;
  return { zone, cote: ZONE_PLUS[zone].cotes ? cote : null };
}

/** Une valeur plausible en cm, ou undefined */
export function valeurValide(zone: ZonePlus, v: unknown): number | undefined {
  const n = nombre(v);
  const z = ZONE_PLUS[zone];
  if (n === undefined || !z || n < z.min || n > z.max) return undefined;
  return Math.round(n * 10) / 10;
}

export function creerMensuration(date: string, zone: ZonePlus, cote: Cote | null, valeur: unknown, origine: MensurationPlus['origine'], maintenant: Date = new Date()): MensurationPlus | null {
  const jour = String(date ?? '').slice(0, 10);
  const v = valeurValide(zone, valeur);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour) || v === undefined) return null;
  const c = ZONE_PLUS[zone].cotes ? cote : null;
  return { id: idMensurationPlus(jour, zone, c), date: jour, zone, cote: c, valeur: v, origine, creeLe: maintenant.toISOString() };
}

/** Les lignes autre d'un import IA qui sont des mensurations en plus (en cm, ou en pouces convertis) */
export function depuisAutres(autres: { name?: string; nom?: string; value?: number | null; valeur?: number | null; unit?: string; unite?: string }[], date: string): MensurationPlus[] {
  const out: MensurationPlus[] = [];
  for (const a of autres ?? []) {
    const nom = a.name ?? a.nom ?? '';
    const z = zoneDepuisNom(nom);
    const brut = a.value ?? a.valeur;
    if (!z || typeof brut !== 'number') continue;
    const unite = (a.unit ?? a.unite ?? 'cm').trim();
    const conv = enUniteBase(brut, unite, 'tour');
    const cm = conv?.uniteBase === 'cm' ? conv.valeurBase : /^(cm|)$/i.test(unite) ? brut : undefined;
    const m = cm !== undefined ? creerMensuration(date, z.zone, z.cote, cm, 'ia_balance') : null;
    if (m) out.push(m);
  }
  return out;
}

export function estMensurationPlus(x: unknown): x is MensurationPlus {
  const m = x as MensurationPlus;
  return !!m && typeof m === 'object' && typeof m.id === 'string' && typeof m.date === 'string' && !!ZONE_PLUS[m.zone] && typeof m.valeur === 'number';
}

/** La serie d'une zone et d'un cote, par date */
export function serieZone(liste: MensurationPlus[], zone: ZonePlus, cote: Cote | null): { date: string; value: number }[] {
  return liste
    .filter((m) => m.zone === zone && (m.cote ?? null) === (cote ?? null))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((m) => ({ date: m.date, value: m.valeur }));
}

/** Toutes les cases de saisie : une par zone, deux pour les zones a cote */
export function casesPlus(): { zone: ZonePlus; cote: Cote | null }[] {
  return ZONES_PLUS.flatMap((z): { zone: ZonePlus; cote: Cote | null }[] => (z.cotes ? [{ zone: z.id, cote: 'droite' }, { zone: z.id, cote: 'gauche' }] : [{ zone: z.id, cote: null }]));
}

export async function lireMensurationsPlus(): Promise<MensurationPlus[]> {
  return lireListe(CLE_MENSURATIONS_PLUS, estMensurationPlus);
}

/** Enregistre (une saisie du meme jour, de la meme zone et du meme cote remplace la precedente) */
export async function enregistrerMensurationsPlus(liste: MensurationPlus[]): Promise<boolean> {
  if (!liste.length) return false;
  return modifierListe<MensurationPlus>(CLE_MENSURATIONS_PLUS, (avant) => remplacerParId(avant.filter(estMensurationPlus), liste, (a, n) => ({ ...n, creeLe: a.creeLe })));
}
