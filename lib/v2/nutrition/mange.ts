/**
 * « Mangé aujourd'hui » (16 octobre 2026, agent MANGÉ). Houari accepte une ligne discrète sur l'accueil :
 * les calories et protéines du jour, lues dans Apple Santé ou Health Connect, écrites par ton app de repas
 * (MyFitnessPal, Cronometer, Lifesum, MacroFactor...). YOROI ne saisit aucun repas, ne fixe aucun objectif
 * de calories et ne juge rien.
 *
 * Logique pure, testée (__tests__/unit/mange.test.ts). La lecture native est dans ./lireRepas(.ios|.android).ts.
 *
 * Doublons (MyFitnessPal a déjà écrit deux fois les mêmes calories) :
 * 1. dans une même app, deux entrées du même type avec le même début, la même fin et la même valeur
 *    (ou le même identifiant) n'en font qu'une ;
 * 2. si plusieurs apps de repas ont écrit le même jour, on garde seulement celle qui a écrit en dernier ce
 *    jour-là (deux apps qui recopient les mêmes repas doubleraient le total ; Apple Santé fait pareil en ne
 *    comptant qu'une source par moment). Les autres apps sont notées, pas additionnées.
 */

import { traduire } from '@/lib/i18n/tr';
export type TypeRepas = 'kcal' | 'proteines' | 'glucides' | 'lipides';
export const TYPES_REPAS: TypeRepas[] = ['kcal', 'proteines', 'glucides', 'lipides'];

/** Une valeur écrite par une app de repas (un nutriment d'un repas) */
export type EntreeRepas = {
  type: TypeRepas;
  valeur: number;
  /** horodatage ISO du début du repas */
  debut: string;
  fin?: string | null;
  /** nom lisible de l'app (« MyFitnessPal ») ou identifiant brut */
  source: string;
  /** identifiant stable de l'app (bundle iOS, paquet Android), sinon le nom */
  sourceId?: string | null;
  /** identifiant de l'échantillon dans Santé ou Health Connect */
  id?: string | null;
};

export type JourRepas = {
  date: string;
  kcal: number | null;
  proteines: number | null;
  glucides: number | null;
  lipides: number | null;
  /** l'app retenue ce jour-là */
  source: string | null;
  /** apps qui ont aussi écrit ce jour-là, écartées pour ne pas compter deux fois */
  ecartees: string[];
  /** entrées identiques retirées dans l'app retenue */
  doublons: number;
};

export type ResumeRepas = {
  /** aujourd'hui, seulement s'il y a des calories ou des protéines */
  aujourdhui: JourRepas | null;
  /** les 7 derniers jours, du plus ancien à aujourd'hui (un jour sans rien a ses valeurs à null) */
  jours: JourRepas[];
  /** moyenne des jours notés parmi les 7 jours avant aujourd'hui (aujourd'hui est souvent incomplet) */
  moyenne: { kcal: number | null; proteines: number | null; jours: number } | null;
  /** « Apple Santé » ou « Health Connect » */
  fournisseur: string;
  /** app la plus récente, pour la petite mention de source */
  app: string | null;
};

// ============================================
// DATES
// ============================================

export function cleJour(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function jourDe(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const t = new Date(iso);
  return Number.isFinite(t.getTime()) ? cleJour(t) : String(iso).slice(0, 10);
}
export function moinsJour(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(y, (m || 1) - 1, d || 1, 12);
  t.setDate(t.getDate() - n);
  return cleJour(t);
}
const temps = (iso: string | null | undefined) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
};

// ============================================
// NOMS DES APPS
// ============================================

/** Paquets Android et bundles iOS connus vers un nom lisible ; un nom déjà lisible reste tel quel */
const APPS: [RegExp, string][] = [
  [/myfitnesspal/i, 'MyFitnessPal'],
  [/cronometer/i, 'Cronometer'],
  [/lifesum|sillens\.shapeupclub/i, 'Lifesum'],
  [/macrofactor|com\.sbs\.diet/i, 'MacroFactor'],
  [/yazio/i, 'Yazio'],
  [/lose ?it|fitnow\.loseit/i, 'Lose It!'],
  [/foodvisor/i, 'Foodvisor'],
  [/fatsecret/i, 'FatSecret'],
  [/samsung|shealth/i, 'Samsung Health'],
  [/fitbit/i, 'Fitbit'],
];

export function nomApp(source: string | null | undefined): string | null {
  const s = String(source ?? '').trim();
  if (!s) return null;
  for (const [re, nom] of APPS) if (re.test(s)) return nom;
  // un identifiant technique (com.exemple.app) ne se montre pas tel quel
  if (/^[a-z0-9_]+(\.[a-z0-9_]+){1,}$/i.test(s) && !/\s/.test(s)) return null;
  return s;
}

// ============================================
// AGRÉGATION
// ============================================

const valide = (e: EntreeRepas) => !!e && TYPES_REPAS.includes(e.type) && Number.isFinite(e.valeur) && e.valeur > 0 && e.valeur < 100000 && temps(e.debut) > 0;
const cleSource = (e: EntreeRepas) => String(e.sourceId || e.source || 'inconnue').toLowerCase();

/** Retire les entrées identiques d'une même app : même id, ou même type, même début, même fin, même valeur */
export function sansDoublons(entrees: EntreeRepas[]): { gardees: EntreeRepas[]; doublons: number } {
  const vus = new Set<string>();
  const gardees: EntreeRepas[] = [];
  let doublons = 0;
  for (const e of entrees) {
    const s = cleSource(e);
    const cleId = e.id ? `id|${s}|${e.id}` : null;
    const cleContenu = `c|${s}|${e.type}|${temps(e.debut)}|${temps(e.fin ?? e.debut)}|${Math.round(e.valeur * 10)}`;
    if ((cleId && vus.has(cleId)) || vus.has(cleContenu)) {
      doublons++;
      continue;
    }
    if (cleId) vus.add(cleId);
    vus.add(cleContenu);
    gardees.push(e);
  }
  return { gardees, doublons };
}

const arrondi = (v: number, type: TypeRepas) => (type === 'kcal' ? Math.round(v) : Math.round(v * 10) / 10);

/** Un jour : une seule app (la plus récente ce jour-là), sans les entrées en double */
export function agregerJour(date: string, entrees: EntreeRepas[]): JourRepas {
  const vide: JourRepas = { date, kcal: null, proteines: null, glucides: null, lipides: null, source: null, ecartees: [], doublons: 0 };
  const du = entrees.filter((e) => valide(e) && jourDe(e.debut) === date);
  if (!du.length) return vide;
  // l'app qui a écrit en dernier ce jour-là
  const parSource = new Map<string, { nom: string; dernier: number; liste: EntreeRepas[] }>();
  for (const e of du) {
    const k = cleSource(e);
    const g = parSource.get(k) ?? { nom: nomApp(e.source) ?? '', dernier: 0, liste: [] };
    g.dernier = Math.max(g.dernier, temps(e.debut), temps(e.fin));
    g.liste.push(e);
    parSource.set(k, g);
  }
  const groupes = [...parSource.values()].sort((a, b) => b.dernier - a.dernier || b.liste.length - a.liste.length);
  const retenue = groupes[0];
  const { gardees, doublons } = sansDoublons(retenue.liste);
  const somme = (t: TypeRepas) => {
    const l = gardees.filter((e) => e.type === t);
    return l.length ? arrondi(l.reduce((a, e) => a + e.valeur, 0), t) : null;
  };
  return {
    date,
    kcal: somme('kcal'),
    proteines: somme('proteines'),
    glucides: somme('glucides'),
    lipides: somme('lipides'),
    source: retenue.nom || null,
    ecartees: groupes.slice(1).map((g) => g.nom).filter((n) => !!n),
    doublons,
  };
}

const aDesRepas = (j: JourRepas | null | undefined) => !!j && ((j.kcal ?? 0) > 0 || (j.proteines ?? 0) > 0);

/** Résumé pour l'accueil, le détail et le bilan. Rien d'inventé : un jour sans entrée reste vide. */
export function resumerRepas(entrees: EntreeRepas[], aujourdhui: string, fournisseur: string): ResumeRepas | null {
  const liste = (entrees ?? []).filter(valide);
  // 8 jours : les 7 barres finissent aujourd'hui, la moyenne prend les 7 jours d'avant
  const huit: JourRepas[] = [];
  for (let i = 7; i >= 0; i--) huit.push(agregerJour(moinsJour(aujourdhui, i), liste));
  const jours = huit.slice(1);
  if (!huit.some(aDesRepas)) return null;
  const today = huit[huit.length - 1];
  const avant = huit.slice(0, -1).filter(aDesRepas);
  const moy = (k: 'kcal' | 'proteines') => {
    const v = avant.map((j) => j[k]).filter((x): x is number => typeof x === 'number' && x > 0);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  const recent = [...huit].reverse().find((j) => aDesRepas(j) && j.source);
  return {
    aujourdhui: aDesRepas(today) ? today : null,
    jours,
    moyenne: avant.length ? { kcal: moy('kcal'), proteines: moy('proteines'), jours: avant.length } : null,
    fournisseur,
    app: recent?.source ?? null,
  };
}

/**
 * Repli sans le détail des entrées (ancienne version native, données déjà gardées) : les totaux par jour
 * que YOROI lit déjà (séries « calories-mangees », « proteines »...). Apple Santé les dédoublonne déjà entre apps.
 */
export function entreesDepuisSeries(series: Partial<Record<'calories-mangees' | 'proteines' | 'glucides' | 'lipides', { date: string; value: number }[]>> | null | undefined, source: string): EntreeRepas[] {
  if (!series) return [];
  const map: [keyof NonNullable<typeof series>, TypeRepas][] = [
    ['calories-mangees', 'kcal'],
    ['proteines', 'proteines'],
    ['glucides', 'glucides'],
    ['lipides', 'lipides'],
  ];
  const out: EntreeRepas[] = [];
  for (const [k, type] of map) {
    for (const p of series[k] ?? []) {
      if (!p?.date || !(p.value > 0)) continue;
      out.push({ type, valeur: p.value, debut: `${p.date.slice(0, 10)}T12:00:00`, source, sourceId: 'serie' });
    }
  }
  return out;
}

// ============================================
// TEXTES
// ============================================

/** 2150 devient « 2 150 » (espace insécable : le nombre ne se coupe jamais en fin de ligne) */
export function milliers(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
}

/** « 2 150 kcal, 140 g de protéines » ; une seule des deux si l'autre manque */
export function ligneMange(j: Pick<JourRepas, 'kcal' | 'proteines'>): string {
  const parts: string[] = [];
  if (j.kcal && j.kcal > 0) parts.push(`${milliers(j.kcal)} kcal`);
  if (j.proteines && j.proteines > 0) parts.push(traduire("{0} g de protéines", Math.round(j.proteines)));
  return parts.join(', ');
}

/** « depuis Apple Santé (MyFitnessPal) » */
export function mentionSource(r: Pick<ResumeRepas, 'fournisseur' | 'app'>): string {
  return r.app ? traduire("depuis {0} ({1})", r.fournisseur, r.app) : traduire("depuis {0}", r.fournisseur);
}

/** Phrase facultative du bilan de pesée : la moyenne des 7 derniers jours, factuelle, sans conseil */
export function phraseBilanRepas(m: ResumeRepas['moyenne'] | null | undefined, app?: string | null): string | null {
  if (!m || m.jours < 1) return null;
  const quoi = ligneMange({ kcal: m.kcal, proteines: m.proteines });
  if (!quoi) return null;
  const jours = m.jours === 1 ? traduire('1 jour noté') : traduire("{0} jours notés", m.jours);
  return traduire("Côté repas, {0}tu as mangé en moyenne {1} par jour sur les 7 derniers jours ({2}).", app ? `d’après ${app}, ` : '', quoi, jours);
}

/** Comment l'activer, selon la plateforme */
export function aideActivation(fournisseur: string): string {
  return fournisseur === 'Health Connect'
    ? traduire('Ces chiffres viennent de ton app de repas (MyFitnessPal, Cronometer, Lifesum, MacroFactor...) qui les écrit dans Health Connect. YOROI les lit seulement. Pour les voir ici, active le partage avec Health Connect dans les réglages de ton app de repas, puis autorise la nutrition pour YOROI dans Health Connect.')
    : traduire('Ces chiffres viennent de ton app de repas (MyFitnessPal, Cronometer, Lifesum, MacroFactor...) qui les écrit dans Apple Santé. YOROI les lit seulement. Pour les voir ici, active le partage avec Apple Santé dans les réglages de ton app de repas, puis autorise la nutrition pour YOROI dans Santé.');
}
