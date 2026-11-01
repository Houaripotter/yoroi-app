/**
 * Biomarqueurs en saisie manuelle (1er novembre 2026, demande AU, point 4), niveau Athlete.
 * Glycemie (sans precision, a jeun, apres repas), tension (systolique et diastolique), cetones, lactate, temperature, et un bilan
 * sanguin libre (nom, valeur, unite, date). Seulement les valeurs et leurs courbes : AUCUNE interpretation medicale,
 * et la phrase « Parle de tes résultats avec un professionnel de santé ».
 * Donnees sensibles : gardees sur le telephone (cle yoroi_biomarqueurs_v1), sauvegardees et synchronisees entre
 * TES appareils comme le reste (sans internet), jamais envoyees en statistiques d'usage (aucun track ici).
 *
 * Conversions vers l'unite de base :
 *  - glycemie mg/dL -> mmol/L : / 18,016 (masse molaire du glucose 180,16 g/mol) ;
 *  - cetones (beta-hydroxybutyrate) mg/dL -> mmol/L : / 10,41 (104,1 g/mol) ;
 *  - lactate mg/dL -> mmol/L : / 9,008 (90,08 g/mol) ;
 *  - temperature °F -> °C : (F - 32) x 5 / 9 ;
 *  - tension : mmHg (kPa x 7,50062).
 * Apple Sante : lecture seule de BloodGlucose, BloodPressure et BodyTemperature si l'autorisation existe deja
 * (aucune fenetre d'autorisation n'est ouverte). Les mesures du sac (import IA) peuvent etre reprises ici.
 */
import { jourLocal, lireListe, modifierListe, nombre, remplacerParId } from './listeStockee';
import { cleDe } from './sac';
import type { MesureBrute } from './sac';

export const CLE_BIOMARQUEURS = 'yoroi_biomarqueurs_v1';

export type TypeBio = 'glycemie' | 'glycemie_jeun' | 'glycemie_repas' | 'tension' | 'cetones' | 'lactate' | 'temperature' | 'libre';

export type SpecBio = { id: TypeBio; label: string; unite: string; unites: string[]; digits: number; min: number; max: number };

export const TYPES_BIO: SpecBio[] = [
  { id: 'glycemie', label: 'Glycémie', unite: 'mmol/L', unites: ['mmol/L', 'mg/dL', 'g/L'], digits: 1, min: 1, max: 35 },
  { id: 'glycemie_jeun', label: 'Glycémie à jeun', unite: 'mmol/L', unites: ['mmol/L', 'mg/dL', 'g/L'], digits: 1, min: 1, max: 35 },
  { id: 'glycemie_repas', label: 'Glycémie après repas', unite: 'mmol/L', unites: ['mmol/L', 'mg/dL', 'g/L'], digits: 1, min: 1, max: 35 },
  { id: 'tension', label: 'Tension', unite: 'mmHg', unites: ['mmHg', 'kPa'], digits: 0, min: 40, max: 260 },
  { id: 'cetones', label: 'Cétones', unite: 'mmol/L', unites: ['mmol/L', 'mg/dL'], digits: 1, min: 0, max: 15 },
  { id: 'lactate', label: 'Lactate', unite: 'mmol/L', unites: ['mmol/L', 'mg/dL'], digits: 1, min: 0, max: 30 },
  { id: 'temperature', label: 'Température', unite: '°C', unites: ['°C', '°F'], digits: 1, min: 30, max: 45 },
  { id: 'libre', label: 'Bilan sanguin', unite: '', unites: [], digits: 2, min: -1e9, max: 1e9 },
];

export const TYPE_BIO: Record<TypeBio, SpecBio> = Object.fromEntries(TYPES_BIO.map((t) => [t.id, t])) as Record<TypeBio, SpecBio>;

export type Biomarqueur = {
  id: string;
  date: string;
  heure?: string | null;
  type: TypeBio;
  /** en unite de base (mmol/L, mmHg, °C) ; pour libre, telle que saisie */
  valeur: number;
  /** tension : diastolique */
  valeur2?: number | null;
  unite: string;
  /** ce que tu as saisi, si l'unite a ete convertie */
  saisie?: { valeur: number; valeur2?: number | null; unite: string };
  /** bilan libre : nom de l'analyse */
  nom?: string;
  source: 'saisie' | 'healthkit' | 'import';
  creeLe: string;
};

const r = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

/** La valeur dans l'unite de base du type ; undefined si l'unite n'est pas connue pour ce type */
export function versUniteBase(type: TypeBio, valeur: number, unite: string): number | undefined {
  const u = unite.trim().toLowerCase();
  const spec = TYPE_BIO[type];
  if (type === 'libre') return valeur;
  if (u === spec.unite.toLowerCase()) return valeur;
  if (type.startsWith('glycemie') && u === 'mg/dl') return r(valeur / 18.016, 2);
  if (type.startsWith('glycemie') && u === 'g/l') return r((valeur * 1000) / 18.016 / 10, 2);
  if (type === 'cetones' && u === 'mg/dl') return r(valeur / 10.41, 2);
  if (type === 'lactate' && u === 'mg/dl') return r(valeur / 9.008, 2);
  if (type === 'temperature' && (u === '°f' || u === 'f')) return r(((valeur - 32) * 5) / 9, 2);
  if (type === 'tension' && u === 'kpa') return r(valeur * 7.50062, 0);
  return undefined;
}

export type SaisieBio = { date: string; heure?: string | null; type: TypeBio; valeur: unknown; valeur2?: unknown; unite: string; nom?: string; source?: Biomarqueur['source'] };

/** Un biomarqueur valide (unite convertie, plage plausible) ; null sinon */
export function creerBiomarqueur(s: SaisieBio, maintenant: Date = new Date()): Biomarqueur | null {
  const jour = String(s.date ?? '').slice(0, 10);
  const spec = TYPE_BIO[s.type];
  const v = nombre(s.valeur);
  if (!spec || !/^\d{4}-\d{2}-\d{2}$/.test(jour) || v === undefined) return null;
  const base = versUniteBase(s.type, v, s.unite);
  if (base === undefined || base < spec.min || base > spec.max) return null;
  let v2: number | null = null;
  if (s.type === 'tension') {
    const d = nombre(s.valeur2);
    const db = d !== undefined ? versUniteBase('tension', d, s.unite) : undefined;
    if (db === undefined || db < 20 || db > 180 || db >= base) return null;
    v2 = db;
  }
  const nom = s.type === 'libre' ? String(s.nom ?? '').trim().slice(0, 60) : undefined;
  if (s.type === 'libre' && !nom) return null;
  const unite = s.type === 'libre' ? s.unite.trim().slice(0, 16) : spec.unite;
  const converti = s.type !== 'libre' && s.unite.trim().toLowerCase() !== spec.unite.toLowerCase();
  const heure = typeof s.heure === 'string' && /^\d{2}:\d{2}$/.test(s.heure) ? s.heure : null;
  const id = `bio_${s.source ?? 'saisie'}_${jour}_${heure ?? ''}_${s.type}_${nom ? cleDe(nom) : ''}`;
  return {
    id,
    date: jour,
    heure,
    type: s.type,
    valeur: base,
    ...(v2 !== null ? { valeur2: v2 } : {}),
    unite,
    ...(converti ? { saisie: { valeur: v, ...(s.type === 'tension' ? { valeur2: nombre(s.valeur2) ?? null } : {}), unite: s.unite.trim() } } : {}),
    ...(nom ? { nom } : {}),
    source: s.source ?? 'saisie',
    creeLe: maintenant.toISOString(),
  };
}

export function estBiomarqueur(x: unknown): x is Biomarqueur {
  const b = x as Biomarqueur;
  return !!b && typeof b === 'object' && typeof b.id === 'string' && typeof b.date === 'string' && !!TYPE_BIO[b.type] && typeof b.valeur === 'number';
}

/** Les mesures du sac (import IA) qui sont des biomarqueurs connus */
export function depuisSac(brutes: MesureBrute[]): Biomarqueur[] {
  const out: Biomarqueur[] = [];
  const tension = new Map<string, { sys?: number; dia?: number; heure?: string | null }>();
  for (const m of brutes) {
    if (!m || m.valeur === null || !m.date) continue;
    const k = m.cle;
    const u = m.unite || '';
    let type: TypeBio | undefined;
    if (/glyc|gluc/.test(k)) type = /jeun|fasting|matin/.test(k) ? 'glycemie_jeun' : /repas|post|apres|meal/.test(k) ? 'glycemie_repas' : 'glycemie';
    else if (/cetone|ketone|bhb|hydroxybutyr/.test(k)) type = 'cetones';
    else if (/lactat/.test(k)) type = 'lactate';
    else if (/temperature|temp_corp|body_temp/.test(k)) type = 'temperature';
    else if (/systol|diastol|tension|blood_pressure|pression_art/.test(k)) {
      const t = tension.get(m.date) ?? { heure: m.heure };
      if (/diastol/.test(k)) t.dia = m.valeur;
      else t.sys = m.valeur;
      tension.set(m.date, t);
      continue;
    }
    if (!type) continue;
    const b = creerBiomarqueur({ date: m.date, heure: m.heure, type, valeur: m.valeur, unite: u || TYPE_BIO[type].unite, source: 'import' });
    if (b) out.push(b);
  }
  for (const [date, t] of tension) {
    if (t.sys === undefined || t.dia === undefined) continue;
    const b = creerBiomarqueur({ date, heure: t.heure, type: 'tension', valeur: t.sys, valeur2: t.dia, unite: 'mmHg', source: 'import' });
    if (b) out.push(b);
  }
  return out;
}

/** Les lectures d'Apple Sante (deja autorisees) en biomarqueurs */
export function depuisSante(p: {
  glycemie?: { date: string; value: number; unit: string }[];
  tension?: { systolic: number; diastolic: number; date: string } | null;
  temperature?: { date: string; value: number }[];
}): Biomarqueur[] {
  const out: (Biomarqueur | null)[] = [];
  for (const g of p.glycemie ?? []) out.push(creerBiomarqueur({ date: g.date, type: 'glycemie', valeur: g.value, unite: g.unit, source: 'healthkit' }));
  if (p.tension) out.push(creerBiomarqueur({ date: String(p.tension.date).slice(0, 10), type: 'tension', valeur: p.tension.systolic, valeur2: p.tension.diastolic, unite: 'mmHg', source: 'healthkit' }));
  for (const t of p.temperature ?? []) out.push(creerBiomarqueur({ date: t.date, type: 'temperature', valeur: t.value, unite: '°C', source: 'healthkit' }));
  return out.filter((b): b is Biomarqueur => !!b);
}

/** Une serie par type (et par nom pour le bilan libre), dans l'ordre des dates */
export function seriesBio(liste: Biomarqueur[]): { cle: string; type: TypeBio; nom?: string; unite: string; points: Biomarqueur[] }[] {
  const m = new Map<string, { cle: string; type: TypeBio; nom?: string; unite: string; points: Biomarqueur[] }>();
  for (const b of liste) {
    const cle = b.type === 'libre' ? `libre_${cleDe(b.nom ?? '')}_${b.unite}` : b.type;
    const s = m.get(cle) ?? { cle, type: b.type, ...(b.nom ? { nom: b.nom } : {}), unite: b.unite, points: [] };
    s.points.push(b);
    m.set(cle, s);
  }
  return Array.from(m.values()).map((s) => ({ ...s, points: s.points.sort((a, b) => (a.date + (a.heure ?? '') < b.date + (b.heure ?? '') ? -1 : 1)) }));
}

export async function lireBiomarqueurs(): Promise<Biomarqueur[]> {
  return lireListe(CLE_BIOMARQUEURS, estBiomarqueur);
}

export async function enregistrerBiomarqueurs(liste: Biomarqueur[]): Promise<boolean> {
  if (!liste.length) return false;
  return modifierListe<Biomarqueur>(CLE_BIOMARQUEURS, (avant) => remplacerParId(avant.filter(estBiomarqueur), liste, (a, n) => ({ ...n, creeLe: a.creeLe })));
}

export async function supprimerBiomarqueur(id: string): Promise<boolean> {
  return modifierListe<Biomarqueur>(CLE_BIOMARQUEURS, (avant) => {
    const apres = avant.filter((b) => b && b.id !== id);
    return apres.length === avant.length ? avant : apres;
  });
}

export const AUJOURDHUI = () => jourLocal();
