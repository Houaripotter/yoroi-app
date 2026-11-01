/**
 * Le sac des mesures brutes (1er novembre 2026, demande AQ : « l'import par l'IA ne doit rien perdre »).
 *
 * YOROI range une pesee importee dans ses colonnes connues (poids, composition, segments, 14 mensurations).
 * Tout le reste etait perdu ou range sans contexte : valeur en texte, valeur illisible, valeur hors plage
 * decochee, deuxieme pesee du jour, bras sans cote range a gauche, heure, appareil, cote et segment
 * d'une mesure en plus. Ici chaque mesure gardee a :
 *   cle normalisee, nom d'origine, valeur (ou texte), unite, cote, segment, date, heure, appareil,
 *   texte d'origine, et une valeur convertie en unite de base quand YOROI sait le faire.
 * Rien n'est affiche pour l'instant : la matrice (_propositions/donnees_corps_2026-11-01/MATRICE.md)
 * dira lesquelles promouvoir en vraies colonnes.
 *
 * Fichier pur (aucun import React Native) : teste par jest (__tests__/unit/mesuresBrutes.test.ts).
 */
import { BALANCE_FIELD, normKey, UNSIDED_MEASURE } from '@/lib/v2/balance/format';
import type { ParseResult, ScaleAutre } from '@/lib/v2/balance/format';

export type Cote = 'gauche' | 'droite';
export type Segment = 'bras' | 'avant_bras' | 'jambe' | 'cuisse' | 'mollet' | 'tronc';

/**
 * Pourquoi la mesure est dans le sac :
 * - autre : mesure que YOROI ne connait pas (gardee aussi dans la pesee si elle a ete cochee) ;
 * - decochee : mesure en plus que tu as decochee dans l'apercu ;
 * - texte : valeur ecrite en texte (type de corps, resultat d'ECG) ;
 * - illisible : cle connue dont la valeur n'a pas pu etre lue ;
 * - hors_plage : cle connue, valeur en dehors des valeurs possibles (decochee par defaut) ;
 * - doublon : deuxieme valeur pour la meme mesure le meme jour (deux pesees, deux lignes) ;
 * - sans_cote : mensuration sans cote, rangee a gauche dans la table des mensurations ;
 * - contexte : heure et appareil de la pesee (la table des pesees n'a pas de colonne pour eux).
 */
export type StatutBrut = 'autre' | 'decochee' | 'texte' | 'illisible' | 'hors_plage' | 'doublon' | 'sans_cote' | 'contexte';

export type OrigineBrute = 'ia_balance';

export type MesureBrute = {
  /** identifiant stable : la meme mesure importee deux fois n'en fait qu'une (synchro, sauvegarde) */
  id: string;
  cle: string;
  nom: string;
  valeur: number | null;
  texte?: string;
  unite: string;
  cote: Cote | null;
  segment: Segment | null;
  /** AAAA-MM-JJ */
  date: string | null;
  /** HH:MM */
  heure: string | null;
  appareil: string | null;
  origine: OrigineBrute;
  statut: StatutBrut;
  /** la valeur a aussi ete rangee dans la pesee (colonne JSON scale_extras) */
  dansPesee?: boolean;
  /** cle YOROI connue (BALANCE_FIELDS) quand il y en a une */
  cleYoroi?: string;
  /** valeur en unite de base (cm, kg, kcal, °C, mmol/L) quand l'unite lue est convertie */
  valeurBase?: number;
  uniteBase?: string;
  /** le texte tel que l'IA l'a ecrit */
  brut: string;
  /** ISO, moment de l'import */
  creeLe: string;
};

const plier = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Le cote ecrit dans un nom (« droit », « left », « (G) »), ou null */
export function coteDe(nom: string): Cote | null {
  const p = ` ${plier(nom).replace(/[^a-z0-9()]+/g, ' ')} `;
  const d = /\s(droit|droite|right|dr)\s|\(d\)|\(r\)/.test(p);
  const g = /\s(gauche|left|ga)\s|\(g\)|\(l\)/.test(p);
  if (d && !g) return 'droite';
  if (g && !d) return 'gauche';
  return null;
}

/** La partie du corps ecrite dans un nom, ou null */
export function segmentDe(nom: string): Segment | null {
  const p = ` ${plier(nom).replace(/[^a-z0-9]+/g, ' ')} `;
  if (/\savant\s?bras\s|\sforearm\s/.test(p)) return 'avant_bras';
  if (/\s(bras|arm|arms|biceps|triceps)\s/.test(p)) return 'bras';
  if (/\s(cuisse|cuisses|thigh|thighs)\s/.test(p)) return 'cuisse';
  if (/\s(mollet|mollets|calf|calves)\s/.test(p)) return 'mollet';
  if (/\s(jambe|jambes|leg|legs)\s/.test(p)) return 'jambe';
  if (/\s(tronc|torse|trunk|torso)\s/.test(p)) return 'tronc';
  return null;
}

const MOTS_COTE = /\b(droit|droite|right|dr|gauche|left|ga)\b|\((d|g|r|l)\)/g;

/** Cle normalisee d'un nom : sans accents, sans le cote (« Tour de poignet droit » : tour_de_poignet) */
export function cleDe(nom: string): string {
  const sans = plier(nom).replace(MOTS_COTE, ' ');
  return normKey(sans) || normKey(nom) || 'mesure';
}

/** Valeur en unite de base quand YOROI sait convertir (pouces, livres, stones, grammes, kJ, °F, mg/dL de glycemie) */
export function enUniteBase(valeur: number, unite: string, cle: string): { valeurBase: number; uniteBase: string } | undefined {
  const u = plier(unite).replace(/\s+/g, '').replace(/\.$/, '');
  const r = (x: number, d = 3) => Math.round(x * 10 ** d) / 10 ** d;
  if (/^(in|inch|inches|pouces?|"|″)$/.test(u)) return { valeurBase: r(valeur * 2.54), uniteBase: 'cm' };
  if (/^(lbs?|livres?|pounds?)$/.test(u)) return { valeurBase: r(valeur * 0.45359237), uniteBase: 'kg' };
  if (/^(st|stones?)$/.test(u)) return { valeurBase: r(valeur * 6.35029318), uniteBase: 'kg' };
  if (u === 'g' && !/glyc|gluc|sucre|sugar/.test(cle)) return { valeurBase: r(valeur / 1000), uniteBase: 'kg' };
  if (/^(kj|kilojoules?)$/.test(u)) return { valeurBase: r(valeur / 4.184, 1), uniteBase: 'kcal' };
  if (/^(°f|f|degf|fahrenheit)$/.test(u)) return { valeurBase: r(((valeur - 32) * 5) / 9, 2), uniteBase: '°C' };
  if (u === 'mg/dl' && /glyc|gluc/.test(cle)) return { valeurBase: r(valeur / 18.016, 2), uniteBase: 'mmol/L' };
  return undefined;
}

/** Hash 32 bits FNV-1a en base 36 (identifiant stable, pas de securite) */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

type Base = { date: string | null; heure: string | null; appareil: string | null; origine: OrigineBrute; creeLe: string };

function mesure(base: Base, statut: StatutBrut, nom: string, valeur: number | null, unite: string, brut: string, extra?: Partial<MesureBrute>): MesureBrute {
  const cle = extra?.cle ?? cleDe(nom);
  const cote = extra?.cote !== undefined ? extra.cote : coteDe(nom);
  const segment = extra?.segment !== undefined ? extra.segment : segmentDe(nom);
  const conv = valeur !== null ? enUniteBase(valeur, unite, cle) : undefined;
  const texte = extra?.texte;
  const id = `mb_${hash([base.origine, base.date ?? '', base.heure ?? '', statut, cle, cote ?? '', segment ?? '', valeur ?? '', texte ?? '', plier(unite)].join('|'))}`;
  return {
    id,
    cle,
    nom: nom.trim().slice(0, 80),
    valeur,
    ...(texte !== undefined ? { texte } : {}),
    unite: unite.trim().slice(0, 16),
    cote,
    segment,
    date: base.date,
    heure: base.heure,
    appareil: base.appareil,
    origine: base.origine,
    statut,
    ...(extra?.dansPesee ? { dansPesee: true } : {}),
    ...(extra?.cleYoroi ? { cleYoroi: extra.cleYoroi } : {}),
    ...(conv ?? {}),
    brut: brut.trim().slice(0, 160),
    creeLe: base.creeLe,
  };
}

export type OptionsBloc = {
  /** jour choisi pour ce bloc (AAAA-MM-JJ), celui de l'enregistrement */
  date: string;
  /** les mesures en plus gardees dans la pesee (cochees), pour marquer les autres « decochee » */
  gardees?: ScaleAutre[];
  /** les mesures en plus cochees ont-elles ete rangees dans la pesee (faux : aucun poids ce jour-la) */
  dansPesee?: boolean;
  /** les cles connues effectivement enregistrees (cochees et valides) */
  enregistrees?: Iterable<string>;
  origine?: OrigineBrute;
  maintenant?: Date;
};

/**
 * Tout ce qu'un bloc importe contient et que les colonnes de YOROI ne gardent pas (ou pas entierement).
 * Une liste vide si le bloc est entierement range.
 */
export function brutesDuBloc(bloc: ParseResult, o: OptionsBloc): MesureBrute[] {
  const base: Base = {
    date: o.date ? String(o.date).slice(0, 10) : bloc.date ?? null,
    heure: bloc.heure ?? null,
    appareil: bloc.appareil ?? null,
    origine: o.origine ?? 'ia_balance',
    creeLe: (o.maintenant ?? new Date()).toISOString(),
  };
  const out: MesureBrute[] = [];
  const gardees = new Map((o.gardees ?? []).map((a) => [normKey(a.nom), a]));
  const enregistrees = o.enregistrees ? new Set(o.enregistrees) : undefined;

  // contexte de la pesee : heure et appareil
  if (base.heure || base.appareil) {
    out.push(mesure(base, 'contexte', 'Contexte de la mesure', null, '', [base.heure ? `heure: ${base.heure}` : '', base.appareil ? `appareil: ${base.appareil}` : ''].filter(Boolean).join(', '), {
      cle: 'contexte',
      cote: null,
      segment: null,
      texte: base.appareil ?? undefined,
    }));
  }
  // mesures en plus, avec cote, segment et texte d'origine
  for (const a of bloc.autres) {
    const g = gardees.get(normKey(a.name));
    const valeur = g ? g.valeur : a.value;
    out.push(mesure(base, g || !o.gardees ? 'autre' : 'decochee', a.name, valeur, a.unit, `${a.name} = ${a.raw}`, { dansPesee: !!g && o.dansPesee !== false }));
  }
  // cles connues : hors plage, sans cote, ou non enregistrees
  for (const v of bloc.values) {
    const spec = BALANCE_FIELD[v.key];
    if (!spec) continue;
    if (v.outOfRange && (!enregistrees || !enregistrees.has(v.key))) {
      out.push(mesure(base, 'hors_plage', spec.label, v.value, spec.unit, `${v.key}: ${v.raw}`, { cle: v.key, cleYoroi: v.key, cote: null, segment: null }));
    } else if (UNSIDED_MEASURE[v.key]) {
      out.push(mesure(base, 'sans_cote', spec.label, v.value, spec.unit, `${v.key}: ${v.raw}`, { cle: v.key, cleYoroi: v.key, cote: null, segment: segmentDe(spec.label) }));
    }
  }
  for (const t of bloc.textes ?? []) {
    const k = cleDe(t.name);
    const connue = Object.values(BALANCE_FIELD).find((f) => f.label === t.name)?.key;
    out.push(mesure(base, connue ? 'illisible' : 'texte', t.name, null, '', `${t.name}: ${t.raw}`, { texte: t.raw, cle: connue ?? k, ...(connue ? { cleYoroi: connue } : {}) }));
  }
  for (const d of bloc.doublons ?? []) {
    const b2: Base = { ...base, heure: d.heure ?? base.heure };
    out.push(mesure(b2, 'doublon', d.name, d.value, d.unit, d.key ? `${d.key}: ${d.raw}` : `${d.name} = ${d.raw}`, d.key ? { cle: d.key, cleYoroi: d.key, cote: null, segment: null } : undefined));
  }
  // une meme mesure ecrite deux fois dans le bloc : une seule
  const vus = new Set<string>();
  return out.filter((m) => (vus.has(m.id) ? false : (vus.add(m.id), true)));
}

/** Les mesures en plus seules (sans bloc lu : enregistrement d'une liste deja choisie) */
export function brutesDesAutres(autres: ScaleAutre[], date: string, maintenant: Date = new Date()): MesureBrute[] {
  const base: Base = { date: String(date).slice(0, 10), heure: null, appareil: null, origine: 'ia_balance', creeLe: maintenant.toISOString() };
  return autres.map((a) => mesure(base, 'autre', a.nom, a.valeur, a.unite ?? '', `${a.nom} = ${a.valeur}${a.unite ? ` ${a.unite}` : ''}`));
}

/** Ajoute les nouvelles mesures a la liste deja gardee, sans doublon (meme id) et sans rien retirer */
export function fusionnerBrutes(existantes: MesureBrute[], nouvelles: MesureBrute[]): { liste: MesureBrute[]; ajoutees: number } {
  const ids = new Set(existantes.map((m) => m?.id).filter(Boolean));
  const ajout = nouvelles.filter((m) => m && m.id && !ids.has(m.id) && (ids.add(m.id), true));
  return { liste: ajout.length ? [...existantes, ...ajout] : existantes, ajoutees: ajout.length };
}

/** Une mesure lue en stockage est-elle bien formee (synchro, sauvegarde ancienne) */
export function estMesureBrute(x: unknown): x is MesureBrute {
  const m = x as MesureBrute;
  return !!m && typeof m === 'object' && typeof m.id === 'string' && typeof m.cle === 'string' && typeof m.nom === 'string' && (m.valeur === null || typeof m.valeur === 'number');
}
