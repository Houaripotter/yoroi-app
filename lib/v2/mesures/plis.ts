/**
 * Plis cutanes (1er novembre 2026, demande AU, point 5), niveau Athlete. Saisie en mm a la pince.
 * Deux methodes de Jackson et Pollock, puis le % de graisse par l'equation de Siri.
 *
 * 7 plis (hommes et femmes) : pectoral, axillaire, triceps, sous scapulaire, abdominal, supra iliaque, cuisse.
 *   Hommes : densite = 1,112 - 0,00043499 S + 0,00000055 S² - 0,00028826 age
 *   Femmes : densite = 1,097 - 0,00046971 S + 0,00000056 S² - 0,00012828 age
 * 3 plis, selon le sexe :
 *   Hommes (pectoral, abdominal, cuisse) : densite = 1,10938 - 0,0008267 S + 0,0000016 S² - 0,0002574 age
 *   Femmes (triceps, supra iliaque, cuisse) : densite = 1,0994921 - 0,0009929 S + 0,0000023 S² - 0,0001392 age
 * Siri : % de graisse = 495 / densite - 450.
 *   Sources : Jackson AS, Pollock ML. Generalized equations for predicting body density of men. British Journal of
 *   Nutrition 1978;40(3):497-504. Jackson AS, Pollock ML, Ward A. Generalized equations for predicting body density
 *   of women. Medicine & Science in Sports & Exercise 1980;12(3):175-181. Siri WE. Body composition from fluid
 *   spaces and density: analysis of methods. In : Techniques for Measuring Body Composition, National Academy of
 *   Sciences, 1961.
 * Il faut ton age et ton sexe (profil) : sans eux, les plis sont gardes et la somme affichee, sans pourcentage.
 * Cle yoroi_plis_v1, une entree par jour et par methode.
 */
import { lireListe, modifierListe, nombre, remplacerParId } from './listeStockee';

export const CLE_PLIS = 'yoroi_plis_v1';

export type Pli = 'pectoral' | 'axillaire' | 'triceps' | 'sous_scapulaire' | 'abdominal' | 'supra_iliaque' | 'cuisse';
export const PLIS_7: Pli[] = ['pectoral', 'axillaire', 'triceps', 'sous_scapulaire', 'abdominal', 'supra_iliaque', 'cuisse'];
export const PLIS_3_HOMME: Pli[] = ['pectoral', 'abdominal', 'cuisse'];
export const PLIS_3_FEMME: Pli[] = ['triceps', 'supra_iliaque', 'cuisse'];

export const LABEL_PLI: Record<Pli, { label: string; aide: string }> = {
  pectoral: { label: 'Pectoral', aide: 'en diagonale, entre l’aisselle et le mamelon' },
  axillaire: { label: 'Axillaire', aide: 'vertical, sur la ligne de l’aisselle, à hauteur du sternum' },
  triceps: { label: 'Triceps', aide: 'vertical, à mi-chemin entre l’épaule et le coude, à l’arrière du bras' },
  sous_scapulaire: { label: 'Sous scapulaire', aide: 'en diagonale, juste sous la pointe de l’omoplate' },
  abdominal: { label: 'Abdominal', aide: 'vertical, à 2 cm à droite du nombril' },
  supra_iliaque: { label: 'Supra iliaque', aide: 'en diagonale, juste au-dessus de l’os de la hanche' },
  cuisse: { label: 'Cuisse', aide: 'vertical, au milieu du devant de la cuisse' },
};

export type Sexe = 'homme' | 'femme';
export type MethodePlis = 'jp7' | 'jp3';

export function plisDeLaMethode(m: MethodePlis, sexe: Sexe): Pli[] {
  return m === 'jp7' ? PLIS_7 : sexe === 'femme' ? PLIS_3_FEMME : PLIS_3_HOMME;
}

/** Densite corporelle de Jackson et Pollock ; undefined s'il manque un pli ou l'age */
export function densiteJP(m: MethodePlis, sexe: Sexe, age: number, plis: Partial<Record<Pli, number>>): number | undefined {
  const liste = plisDeLaMethode(m, sexe);
  if (!(age >= 15 && age <= 90)) return undefined;
  const vals = liste.map((p) => plis[p]);
  if (vals.some((v) => !(typeof v === 'number' && v > 0 && v < 80))) return undefined;
  const S = (vals as number[]).reduce((a, b) => a + b, 0);
  if (m === 'jp7') {
    return sexe === 'homme'
      ? 1.112 - 0.00043499 * S + 0.00000055 * S * S - 0.00028826 * age
      : 1.097 - 0.00046971 * S + 0.00000056 * S * S - 0.00012828 * age;
  }
  return sexe === 'homme'
    ? 1.10938 - 0.0008267 * S + 0.0000016 * S * S - 0.0002574 * age
    : 1.0994921 - 0.0009929 * S + 0.0000023 * S * S - 0.0001392 * age;
}

/** Siri : % de graisse, une decimale */
export function siri(densite: number): number {
  return Math.round((495 / densite - 450) * 10) / 10;
}

export type MesurePlis = {
  id: string;
  date: string;
  methode: MethodePlis;
  sexe: Sexe | null;
  age: number | null;
  plis: Partial<Record<Pli, number>>;
  somme: number;
  /** null sans age ou sans sexe */
  pctGraisse: number | null;
  creeLe: string;
};

export function creerMesurePlis(date: string, methode: MethodePlis, sexe: Sexe | null, age: number | null, saisis: Partial<Record<Pli, unknown>>, maintenant: Date = new Date()): MesurePlis | null {
  const jour = String(date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return null;
  const liste = plisDeLaMethode(methode, sexe ?? 'homme');
  const plis: Partial<Record<Pli, number>> = {};
  for (const p of methode === 'jp3' && !sexe ? Array.from(new Set([...PLIS_3_HOMME, ...PLIS_3_FEMME])) : liste) {
    const v = nombre(saisis[p]);
    if (v !== undefined && v > 0 && v < 80) plis[p] = Math.round(v * 10) / 10;
  }
  const utiles = liste.filter((p) => plis[p] !== undefined);
  if (utiles.length !== liste.length) return null;
  const somme = Math.round(utiles.reduce((a, p) => a + (plis[p] as number), 0) * 10) / 10;
  const d = sexe && age ? densiteJP(methode, sexe, age, plis) : undefined;
  return { id: `plis_${jour}_${methode}`, date: jour, methode, sexe, age, plis, somme, pctGraisse: d ? siri(d) : null, creeLe: maintenant.toISOString() };
}

/** Age en annees a une date, depuis la date de naissance AAAA-MM-JJ */
export function ageA(naissance: string | null | undefined, date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(naissance ?? '');
  const d = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m || !d) return null;
  let a = +d[1] - +m[1];
  if (+d[2] < +m[2] || (+d[2] === +m[2] && +d[3] < +m[3])) a--;
  return a >= 10 && a <= 100 ? a : null;
}

export function estMesurePlis(x: unknown): x is MesurePlis {
  const m = x as MesurePlis;
  return !!m && typeof m === 'object' && typeof m.id === 'string' && typeof m.date === 'string' && (m.methode === 'jp7' || m.methode === 'jp3') && typeof m.somme === 'number';
}

export async function lirePlis(): Promise<MesurePlis[]> {
  return lireListe(CLE_PLIS, estMesurePlis);
}

export async function enregistrerPlis(m: MesurePlis): Promise<boolean> {
  return modifierListe<MesurePlis>(CLE_PLIS, (avant) => remplacerParId(avant.filter(estMesurePlis), [m]));
}
