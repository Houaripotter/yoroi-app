/**
 * Bilan apres une mesure ou une seance (16 octobre 2026, agent BILAN).
 * Houari : « Après chaque mesure ou chaque ajout de séance, une page qui explique : poids, mensurations,
 * s'il a perdu ou pas, pris du muscle, perdu en graisse, en eau. Séance pareil : tu en es à tant de séances. »
 *
 * Logique pure, testee (__tests__/unit/bilanTexte.test.ts). Le texte est ecrit par des regles fixes a partir
 * des vraies donnees : aucune IA en ligne, aucun chiffre invente. Une donnee absente fait disparaitre sa phrase.
 * Le ton : positif et honnete, jamais culpabilisant. Une variation plus petite que le bruit normal
 * (eau, sel, repas, precision de la balance ou du metre ruban) est dite comme telle. Aucun conseil medical.
 */
import type { CoteExploit, Exploit, Grand } from '@/lib/v2/cartes/types';
import { phraseBilanRepas } from '@/lib/v2/nutrition/mange';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

export const MOINS = '−';

/** Ecart de poids sous lequel on parle de variation normale d'un jour a l'autre (eau, sel, repas) */
export const BRUIT_POIDS_KG = 0.5;
/** Masse grasse ou muscle : en dessous, c'est la precision d'une balance a impedance */
export const BRUIT_COMPO_KG = 0.3;
export const BRUIT_GRAISSE_PT = 0.5;
export const BRUIT_EAU_PT = 1;
/** Mensurations : la precision d'un metre ruban */
export const BRUIT_CM = 0.5;

// ============================================
// OUTILS DE TEXTE
// ============================================

const MOIS = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];
const MOIS_COURT = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];
const JOURS = [traduire('dimanche'), traduire('lundi'), traduire('mardi'), traduire('mercredi'), traduire('jeudi'), traduire('vendredi'), traduire('samedi')];

const dateDe = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
};
export function joursEntre(a: string, b: string): number {
  return Math.round((dateDe(b).getTime() - dateDe(a).getTime()) / 86400000);
}
export function moinsJours(iso: string, n: number): string {
  const d = dateDe(iso);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const numJour = (d: Date) => (d.getDate() === 1 ? '1er' : String(d.getDate()));
/** « 2 oct. » */
export function dateCourte(iso: string): string {
  const d = dateDe(iso);
  return `${numJour(d)} ${MOIS_COURT[d.getMonth()]}`;
}
/** « jeudi 16 octobre » */
export function dateLongue(iso: string): string {
  const d = dateDe(iso);
  return `${JOURS[d.getDay()]} ${numJour(d)} ${MOIS[d.getMonth()]}`;
}
const maj = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
/** « 2 oct.. » devient « 2 oct. » : une abreviation de mois en fin de phrase ne double pas le point */
export const propre = (t: string) => t.replace(/\.\.(?!\.)/g, '.');

// ============================================
// TEXTE RICHE (16 octobre, agent BILAN COULEURS)
// ============================================
// Houari : « Le texte du bilan est fade, mets de la couleur sur les mots, chiffres ou phrases importants. »
// Chaque phrase du topo est ecrite en morceaux (texte + role). Le role donne la couleur a l'ecran
// (components/yoroi/v2/bilan/BilanVue.tsx) ; la version texte brut (paragraphe) est la simple mise
// bout a bout des morceaux, identique a l'ancienne : rien ne change pour le partage et les tests.

/** seance : indigo ; objectif : vert (objectif atteint, bon sens) ; record : rouge ; poids : violet ; mesure : ocre ; fort : gras sans couleur */
export type RoleSegment = 'seance' | 'objectif' | 'record' | 'poids' | 'mesure' | 'fort';
export type Segment = { texte: string; role?: RoleSegment };
export type IconeBilan =
  | 'compteur' | 'objectif' | 'annee' | 'comparaison' | 'ressenti' | 'coeur' | 'record' | 'technique' | 'regularite'
  | 'poids' | 'tendance' | 'composition' | 'mesure' | 'ligne' | 'repas' | 'conseil';
/** Une phrase du topo : ses morceaux, la phrase phare (plus grande) et sa petite icone de tete */
export type PhraseRiche = { segments: Segment[]; phare?: boolean; icone?: IconeBilan };
type Morceau = string | Segment | null | false | undefined;

/** un morceau mis en avant */
export const seg = (role: RoleSegment, texte: string): Segment => ({ texte, role });

/** Assemble une phrase : les morceaux sans role se collent, les vides disparaissent */
export function riche(icone: IconeBilan | null, ...m: Morceau[]): PhraseRiche {
  const segments: Segment[] = [];
  for (const x of m) {
    if (!x) continue;
    const s: Segment = typeof x === 'string' ? { texte: x } : { ...x };
    if (!s.texte) continue;
    const prev = segments[segments.length - 1];
    if (prev && !prev.role && !s.role) prev.texte += s.texte;
    else segments.push(s);
  }
  return icone ? { segments, icone } : { segments };
}

/** La version texte brut d'une phrase riche */
export const texteDe = (p: PhraseRiche): string => p.segments.map((s) => s.texte).join('');

/** propre() morceau par morceau, y compris quand le double point tombe a la jointure de deux morceaux */
export function nettoyer(p: PhraseRiche): PhraseRiche {
  const segments = p.segments.map((s) => ({ ...s, texte: propre(s.texte) }));
  for (let i = 1; i < segments.length; i++) {
    const a = segments[i - 1].texte;
    const b = segments[i].texte;
    if (a.endsWith('.') && !a.endsWith('..') && b.startsWith('.') && !b.startsWith('..')) segments[i].texte = b.slice(1);
  }
  return { ...p, segments: segments.filter((s) => s.texte) };
}

/** un chiffre suivi de son unite (« 1,2 kg », « 35 % », « 15 min »), jamais une date seule */
const CHIFFRE_UNITE = /[+\u2212]?\d+(?:,\d+)?\s?(?:kg|g|cm|%|points?|pt|bpm|km|min|t|rounds?|séances?|semaines?|jours?)(?=$|[\s.,:;)!?])/gu;

/** Une phrase deja ecrite dont les chiffres avec unite prennent la couleur du role */
export function enCouleur(texte: string, role: RoleSegment, icone: IconeBilan | null = null): PhraseRiche {
  const m: Morceau[] = [];
  let i = 0;
  for (const x of texte.matchAll(CHIFFRE_UNITE)) {
    const at = x.index ?? 0;
    m.push(texte.slice(i, at), seg(role, x[0]));
    i = at + x[0].length;
  }
  m.push(texte.slice(i));
  return riche(icone, ...m);
}

/** Le topo final : propre, la premiere phrase en phare si aucune ne l'est */
function finirTopo(topo: PhraseRiche[], phareEnTete: boolean): { riche: PhraseRiche[]; paragraphe: string[] } {
  const l = topo.map(nettoyer).filter((p) => p.segments.length);
  if (phareEnTete && l.length && !l.some((p) => p.phare)) l[0] = { ...l[0], phare: true };
  return { riche: l, paragraphe: l.map(texteDe) };
}

/** 81,3 */
export function nb(v: number, dec = 1): string {
  const r = Math.round(Math.abs(v) * 10 ** dec) / 10 ** dec;
  const t = dec > 0 && Math.abs(r - Math.round(r)) > 1e-9 ? r.toFixed(dec) : String(Math.round(r));
  return t.replace('.', DECIMAL);
}
/** un poids : toujours au dixieme, « 82,0 » */
export const kg1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', DECIMAL);
/** « 600 g » sous le kilo, « 1,2 kg » au-dessus, toujours au dixieme de kilo */
export function kgOuG(v: number): string {
  const a = Math.round(Math.abs(v) * 10) / 10;
  if (a < 1) return `${Math.round(a * 1000)} g`;
  return `${nb(a, 1)} kg`;
}
/** « −0,6 », « +0,2 » */
export function signe(v: number, dec = 1): string {
  const r = Math.round(v * 10 ** dec) / 10 ** dec;
  return `${r > 0 ? '+' : r < 0 ? MOINS : ''}${nb(r, dec)}`;
}
/** « 1re », « 4e » */
export function ordinal(n: number): string {
  return n === 1 ? '1re' : `${n}e`;
}
const pluriel = (n: number, un: string, plusieurs: string) => (n > 1 ? plusieurs : un);
/** « a, b et c » */
export function liste(v: string[]): string {
  if (v.length <= 1) return v.join('');
  return traduire("{0} et {1}", v.slice(0, -1).join(', '), v[v.length - 1]);
}
function minutesTexte(m: number): string {
  const r = Math.round(Math.abs(m));
  if (r < 60) return `${r} min`;
  const h = Math.floor(r / 60);
  const mm = r % 60;
  return mm ? `${h} h ${String(mm).padStart(2, '0')}` : `${h} h`;
}

// ============================================
// CORPS : POIDS, COMPOSITION, MENSURATIONS
// ============================================

export type PeseeJ = { date: string; value: number; trend?: number };
export type CompoJ = { date: string; weight?: number; fat?: number; muscleKg?: number; muscle?: number; water?: number; bone?: number; visceral?: number };
export type MesureCle = 'shoulders' | 'chest' | 'arm' | 'waist' | 'navel' | 'hips' | 'thigh' | 'calf' | 'neck';
export type MesureJ = { date: string; valeurs: Partial<Record<MesureCle, number>> };
export type ModeObjectif = 'perte' | 'prise' | 'maintien' | 'recompo';
export type OrigineCorps = 'pesee' | 'composition' | 'mensurations' | 'photo' | 'montre' | 'detail';

export const MESURES: { key: MesureCle; label: string; bon: 'up' | 'down' | 'none' }[] = [
  { key: 'waist', label: traduire('tour de taille'), bon: 'down' },
  { key: 'navel', label: traduire('tour au nombril'), bon: 'down' },
  { key: 'hips', label: traduire('tour de hanches'), bon: 'none' },
  { key: 'chest', label: traduire('tour de poitrine'), bon: 'up' },
  { key: 'shoulders', label: traduire('tour d’épaules'), bon: 'up' },
  { key: 'arm', label: traduire('tour de bras'), bon: 'up' },
  { key: 'thigh', label: traduire('tour de cuisse'), bon: 'none' },
  { key: 'calf', label: traduire('tour de mollet'), bon: 'none' },
  { key: 'neck', label: traduire('tour de cou'), bon: 'none' },
];

export type EntreeCorps = {
  /** jour du bilan (AAAA-MM-JJ) */
  date: string;
  /** pesees, une par jour, de la plus ancienne a la plus recente (trend : tendance lissee) */
  pesees: PeseeJ[];
  /** compositions, de la plus ancienne a la plus recente */
  compo?: CompoJ[];
  /** mensurations, de la plus ancienne a la plus recente */
  mesures?: MesureJ[];
  objectif?: { depart: { date: string; poids: number } | null; cap: number | null; mode: ModeObjectif | null } | null;
  /** phrase de ta ligne directrice ce jour-la (phraseStatut), deja ecrite */
  ligne?: { ton: 'vert' | 'bleu' | 'orange' | 'gris'; texte: string } | null;
  /** phrase de ta prevision (phrasePrevision) et du torii (phraseTorii), deja ecrites */
  prevision?: string | null;
  torii?: string | null;
  /** bruit de tes pesees autour de ta droite (predictions.ajuster), en kg */
  bruit?: number | null;
  origine: OrigineCorps;
  /** 16 octobre (agent MANGÉ) : moyenne des 7 jours avant le bilan, lue dans ton app de repas via Santé ; absente, aucune phrase */
  repas?: { kcal: number | null; proteines: number | null; jours: number; app?: string | null } | null;
};

export type Comparaison = { id: 'precedente' | 'semaine' | 'mois' | 'objectif'; label: string; depuis: string; ecart: number; texte: string; bruit: boolean; bon: boolean | null };
export type LigneCompo = { id: 'fatKg' | 'fat' | 'muscleKg' | 'water' | 'bone' | 'visceral'; label: string; valeur: string; unite: string; ecart: number | null; ecartTexte: string | null; bruit: boolean; bon: boolean | null };
export type LigneMesure = { key: MesureCle; label: string; valeur: number; ecart: number | null; depuis: string | null; bruit: boolean; bon: boolean | null };

export type BilanCorps = {
  titre: string;
  sousTitre: string;
  /** poids du jour du bilan (ou la derniere pesee avant), null sans pesee */
  poids: number | null;
  /** pesee du jour meme */
  peseeDuJour: boolean;
  /** le grand titre : « 400 g de moins », « Dans la marge normale », « Ta première pesée » */
  verdict: { titre: string; texte: string; bon: boolean | null } | null;
  comparaisons: Comparaison[];
  tendance: { valeur: number; parSemaine: number | null; texte: string } | null;
  compo: { lignes: LigneCompo[]; depuis: string | null; phrase: string | null } | null;
  mesures: { lignes: LigneMesure[]; depuis: string | null; phrase: string | null } | null;
  objectif: { pct: number | null; reste: number | null; atteint: boolean; texte: string; depart: number; cap: number } | null;
  ligne: { ton: 'vert' | 'bleu' | 'orange' | 'gris'; texte: string } | null;
  prevision: string | null;
  /** phrase facultative sur tes repas des 7 derniers jours, factuelle, sans conseil */
  repas: string | null;
  /** le topo, phrase par phrase */
  paragraphe: string[];
  /** le meme topo en morceaux colores (meme texte, phrase par phrase) */
  riche: PhraseRiche[];
  /** tes pesees des 30 jours qui finissent au jour du bilan, pour la petite courbe */
  serie: PeseeJ[];
  /** la carte « Bilan » a partager */
  carte: Exploit | null;
};

const dernierAvant = <T extends { date: string }>(l: T[], jour: string, inclus = true) => {
  for (let i = l.length - 1; i >= 0; i--) if (inclus ? l[i].date <= jour : l[i].date < jour) return l[i];
  return null;
};
/** La pesee la plus proche d'il y a n jours (a 3 jours pres), jamais apres le jour vu */
function peseeVers(l: PeseeJ[], jour: string, n: number): PeseeJ | null {
  const cible = moinsJours(jour, n);
  let best: PeseeJ | null = null;
  let d = 99;
  for (const p of l) {
    if (p.date >= jour) continue;
    const e = Math.abs(joursEntre(p.date, cible));
    if (e <= 3 && e < d) {
      best = p;
      d = e;
    }
  }
  return best;
}

const fatKgDe = (c: CompoJ, poids: number | null) => (c.fat && (c.weight || poids) ? ((c.weight || (poids as number)) * c.fat) / 100 : undefined);
const muscleKgDe = (c: CompoJ, poids: number | null) => c.muscleKg ?? (c.muscle && (c.weight || poids) ? ((c.weight || (poids as number)) * c.muscle) / 100 : undefined);

/** Sens attendu (perte : baisser est bon ; prise : monter est bon ; maintien, recomposition ou sans objectif : sans jugement) */
function bonPoids(ecart: number, mode: ModeObjectif | null | undefined): boolean | null {
  if (mode === 'perte') return ecart < 0;
  if (mode === 'prise') return ecart > 0;
  return null;
}

function phraseEcartPoids(ecart: number, depuis: string, quoi: string): string {
  if (Math.abs(ecart) < 0.05) return traduire("Le même poids que {0} du {1}", quoi, dateCourte(depuis));
  return ecart < 0 ? traduire("{0} de moins que {1} du {2}", maj(kgOuG(ecart)), quoi, dateCourte(depuis)) : traduire("{0} de plus que {1} du {2}", maj(kgOuG(ecart)), quoi, dateCourte(depuis));
}

export function bilanCorps(e: EntreeCorps): BilanCorps {
  const jour = e.date.slice(0, 10);
  const pesees = [...e.pesees].filter((p) => p.value > 0).sort((a, b) => (a.date < b.date ? -1 : 1));
  const mode = e.objectif?.mode ?? null;
  const cible = dernierAvant(pesees, jour);
  const peseeDuJour = !!cible && cible.date === jour;
  const poids = cible ? cible.value : null;
  const seuil = Math.max(BRUIT_POIDS_KG, (e.bruit ?? 0) * 1.5);
  const topo: PhraseRiche[] = [];

  // ---- comparaisons de poids ----
  const comparaisons: Comparaison[] = [];
  const prec = cible ? dernierAvant(pesees, cible.date, false) : null;
  if (cible && prec) {
    const ec = cible.value - prec.value;
    comparaisons.push({ id: 'precedente', label: traduire('Depuis ta dernière pesée'), depuis: prec.date, ecart: ec, texte: phraseEcartPoids(ec, prec.date, traduire('ta pesée')), bruit: Math.abs(ec) < seuil, bon: bonPoids(ec, mode) });
  }
  const vus = new Set(prec ? [prec.date] : []);
  for (const [id, n, label] of [['semaine', 7, 'Sur 7 jours'], ['mois', 30, 'Sur 30 jours']] as const) {
    if (!cible) break;
    const p = peseeVers(pesees, cible.date, n);
    if (!p || vus.has(p.date)) continue;
    vus.add(p.date);
    const ec = cible.value - p.value;
    comparaisons.push({ id, label, depuis: p.date, ecart: ec, texte: phraseEcartPoids(ec, p.date, traduire('ta pesée')), bruit: Math.abs(ec) < seuil, bon: bonPoids(ec, mode) });
  }
  const dep = e.objectif?.depart ?? null;
  if (cible && dep && dep.date < cible.date && dep.poids > 0) {
    const ec = cible.value - dep.poids;
    comparaisons.push({ id: 'objectif', label: traduire('Depuis le début de ton objectif'), depuis: dep.date, ecart: ec, texte: phraseEcartPoids(ec, dep.date, traduire('ton départ')), bruit: false, bon: bonPoids(ec, mode) });
  }

  // ---- tendance lissee ----
  let tendance: BilanCorps['tendance'] = null;
  const avecTrend = pesees.filter((p) => p.date <= jour && typeof p.trend === 'number');
  if (cible && avecTrend.length >= 3) {
    const t = avecTrend[avecTrend.length - 1];
    const ref = avecTrend.filter((p) => joursEntre(p.date, t.date) >= 14);
    const r = ref.length ? ref[ref.length - 1] : null;
    const parSemaine = r ? (((t.trend as number) - (r.trend as number)) / joursEntre(r.date, t.date)) * 7 : null;
    const sens =
      parSemaine === null
        ? ''
        : Math.abs(parSemaine) < 0.1
          ? traduire(', et elle est stable ces dernières semaines')
          : parSemaine < 0 ? traduire(", et elle descend d’environ {0} par semaine", kgOuG(parSemaine)) : traduire(", et elle monte d’environ {0} par semaine", kgOuG(parSemaine));
    tendance = {
      valeur: t.trend as number,
      parSemaine,
      texte: traduire("Ta tendance lissée est à {0} kg{1}. C’est une moyenne qui gomme les hauts et les bas d’un jour à l’autre : c’est elle qui dit vraiment où tu vas.", kg1(t.trend as number), sens),
    };
  }

  // ---- verdict et premieres phrases ----
  let verdict: BilanCorps['verdict'] = null;
  const cp = comparaisons.find((x) => x.id === 'precedente');
  if (cible && !prec) {
    verdict = { titre: traduire('Ta première pesée'), texte: traduire('Elle devient ton point de départ.'), bon: null };
    topo.push(riche('poids', traduire('Tu pèses '), seg('poids', `${kg1(cible.value)} kg`), traduire('. C’est ta première pesée : elle devient ton point de départ, et dès la prochaine tu verras ce qui bouge.')));
  } else if (cible && cp) {
    const ilYa = joursEntre(cp.depuis, cible.date);
    const quand = ilYa <= 1 ? 'hier' : traduire("le {0}", dateCourte(cp.depuis));
    if (Math.abs(cp.ecart) < 0.05) {
      verdict = { titre: traduire('Le même poids'), texte: quand === 'hier' ? traduire('qu’hier') : traduire("que {0}", quand), bon: null };
      topo.push(riche('poids', traduire('Tu pèses '), seg('poids', `${kg1(cible.value)} kg`), quand === 'hier' ? traduire(', exactement comme hier.') : traduire(", exactement comme {0}.", quand)));
    } else if (cp.bruit) {
      verdict = { titre: cp.ecart < 0 ? traduire("{0} de moins", maj(kgOuG(cp.ecart))) : traduire("{0} de plus", maj(kgOuG(cp.ecart))), texte: traduire('Dans la marge normale d’un jour à l’autre'), bon: null };
      topo.push(riche('poids', traduire('Tu pèses '), seg('poids', `${kg1(cible.value)} kg`), ', ', seg('fort', cp.ecart < 0 ? traduire("{0} de moins", kgOuG(cp.ecart)) : traduire("{0} de plus", kgOuG(cp.ecart))), traduire(" {0}. C’est dans la marge normale d’un jour à l’autre : l’eau, le sel et le dernier repas font bouger la balance de quelques centaines de grammes.", quand === 'hier' ? traduire('qu’hier') : traduire("que {0}", quand))));
    } else {
      const perdu = cp.ecart < 0;
      verdict = { titre: `${perdu ? traduire('Tu as perdu') : traduire('Tu as pris')} ${kgOuG(cp.ecart)}`, texte: traduire("depuis ta pesée du {0}", dateCourte(cp.depuis)), bon: cp.bon };
      const suite =
        cp.bon === false
          ? traduire(' Une pesée seule ne fait pas une tendance : regarde plutôt ta courbe lissée sur plusieurs jours.')
          : ilYa >= 1 && ilYa <= 3 && Math.abs(cp.ecart) >= 1
            ? traduire(' Un tel écart en si peu de temps vient surtout de l’eau, ta tendance dira la suite.')
            : '';
      topo.push(riche('poids', traduire('Tu pèses '), seg('poids', `${kg1(cible.value)} kg`), traduire(' : tu as '), seg(cp.bon === true ? 'objectif' : 'poids', `${perdu ? traduire('perdu') : traduire('pris')} ${kgOuG(cp.ecart)}`), traduire(" depuis ta pesée du {0}.", dateCourte(cp.depuis)), suite));
    }
  }
  const sem = comparaisons.find((x) => x.id === 'semaine');
  const mois = comparaisons.find((x) => x.id === 'mois');
  const loin = mois ?? sem;
  if (loin && cible) {
    const sur = loin.id === 'mois' ? traduire('un mois') : traduire('une semaine');
    if (loin.bruit) topo.push(riche('tendance', traduire("Sur {0}, ton poids bouge peu (", sur), seg('poids', kgOuG(loin.ecart)), traduire(') : il est stable.')));
    else topo.push(riche('tendance', traduire("Sur {0}, tu as ", sur), seg(loin.bon === true ? 'objectif' : 'poids', `${loin.ecart < 0 ? traduire('perdu') : traduire('pris')} ${kgOuG(loin.ecart)}`), loin.bon === true ? seg('objectif', traduire(', dans le sens de ton objectif')) : '', '.'));
  }
  if (tendance) topo.push(enCouleur(tendance.texte, 'poids', 'tendance'));

  // ---- composition ----
  let compo: BilanCorps['compo'] = null;
  const compos = [...(e.compo ?? [])].filter((c) => c.fat || c.muscleKg || c.muscle || c.water || c.bone || c.visceral).sort((a, b) => (a.date < b.date ? -1 : 1));
  const cc = dernierAvant(compos, jour);
  // la composition n'est montree que si elle est du jour, ou de moins de 3 jours quand le bilan n'en apporte pas
  if (cc && joursEntre(cc.date, jour) <= 3) {
    const pc = dernierAvant(compos, cc.date, false);
    const poidsC = cc.weight ?? (cible && cible.date === cc.date ? cible.value : poids);
    const poidsP = pc ? pc.weight ?? dernierAvant(pesees, pc.date)?.value ?? null : null;
    const lignes: LigneCompo[] = [];
    const add = (id: LigneCompo['id'], label: string, v: number | undefined, avant: number | undefined, unite: string, dec: number, bruit: number, bon: (d: number) => boolean | null) => {
      if (!(typeof v === 'number' && v > 0)) return;
      const ec = typeof avant === 'number' && avant > 0 ? v - avant : null;
      const petit = ec !== null && Math.abs(ec) < bruit;
      lignes.push({ id, label, valeur: nb(v, dec), unite, ecart: ec, ecartTexte: ec === null ? null : Math.abs(ec) < 10 ** -dec / 2 ? traduire('pareil') : `${signe(ec, dec)} ${unite}`, bruit: petit, bon: ec === null || petit ? null : bon(ec) });
    };
    const fk = fatKgDe(cc, poidsC);
    const fkP = pc ? fatKgDe(pc, poidsP) : undefined;
    const mk = muscleKgDe(cc, poidsC);
    const mkP = pc ? muscleKgDe(pc, poidsP) : undefined;
    add('fatKg', 'Graisse', fk, fkP, 'kg', 1, BRUIT_COMPO_KG, (d) => (mode === 'prise' ? null : d < 0));
    add('fat', traduire('% de graisse'), cc.fat, pc?.fat, '%', 1, BRUIT_GRAISSE_PT, (d) => (mode === 'prise' ? null : d < 0));
    add('muscleKg', 'Muscle', mk, mkP, 'kg', 1, BRUIT_COMPO_KG, (d) => d > 0);
    add('water', 'Eau', cc.water, pc?.water, '%', 1, BRUIT_EAU_PT, () => null);
    add('bone', traduire('Os'), cc.bone, pc?.bone, 'kg', 1, 0.15, () => null);
    add('visceral', traduire('Viscérale'), cc.visceral, pc?.visceral, '', 0, 1, (d) => d < 0);

    let phrase: string | null = null;
    const dF = fk !== undefined && fkP !== undefined ? fk - fkP : null;
    const dM = mk !== undefined && mkP !== undefined ? mk - mkP : null;
    const dW = cc.water && pc?.water ? cc.water - pc.water : null;
    if (!pc) {
      phrase = traduire("C’est ta première composition{0}{1}. La prochaine dira ce qui a bougé.", fk !== undefined ? traduire(" : {0} de graisse{1}", kgOuG(fk), cc.fat ? ` (${nb(cc.fat)} %)` : '') : '', mk !== undefined ? (fk !== undefined ? traduire(" et {0} de muscle", kgOuG(mk)) : traduire(" : {0} de muscle", kgOuG(mk))) : '');
    } else {
      const depuis = dateCourte(pc.date);
      const fBouge = dF !== null && Math.abs(dF) >= BRUIT_COMPO_KG;
      const mBouge = dM !== null && Math.abs(dM) >= BRUIT_COMPO_KG;
      if (fBouge || mBouge) {
        const morceaux: string[] = [];
        if (dF !== null && Math.abs(dF) >= 0.05) morceaux.push(dF < 0 ? traduire("perdu {0} de graisse", kgOuG(dF)) : traduire("pris {0} de graisse", kgOuG(dF)));
        if (dM !== null && Math.abs(dM) >= 0.05) morceaux.push(dM > 0 ? traduire("gagné {0} de muscle", kgOuG(dM)) : traduire("perdu {0} de muscle", kgOuG(dM)));
        phrase = traduire("Selon ta balance, tu as {0} depuis le {1}.", liste(morceaux), depuis);
        const poidsStable = poidsC && poidsP ? Math.abs(poidsC - poidsP) < BRUIT_POIDS_KG : false;
        if (dF !== null && dM !== null && dF < 0 && dM > 0) phrase += poidsStable ? traduire(' Ton poids bouge peu mais ton corps change : moins de graisse, plus de muscle, c’est une recomposition.') : traduire(' Moins de graisse et plus de muscle : c’est exactement le bon mélange.');
        else if (dF !== null && dF < 0 && (dM === null || dM >= -0.05)) phrase += traduire(' Ce que tu perds, c’est surtout de la graisse.');
        else if (dM !== null && dM < 0 && (dF === null || dF < 0)) phrase += traduire(' Une partie de ce qui part est lue comme du muscle : sur une balance à impédance, l’eau joue beaucoup, regarde la tendance sur plusieurs mesures.');
        else if (dF !== null && dF > 0) phrase += traduire(' Une mesure seule ne fait pas une tendance : l’hydratation et l’heure de la pesée font varier la lecture.');
      } else if (dF !== null || dM !== null) {
        phrase = traduire("Ta composition est stable depuis le {0} : les écarts restent dans la précision de ta balance.", depuis);
      }
      if (dW !== null && Math.abs(dW) >= BRUIT_EAU_PT) phrase = traduirePluriel(Math.abs(dW), Math.abs(dW) >= 2, "{0}Ton eau a bougé de {1} point : ça suffit à décaler un peu la graisse et le muscle lus par la balance.", "{0}Ton eau a bougé de {1} points : ça suffit à décaler un peu la graisse et le muscle lus par la balance.", phrase ? `${phrase} ` : '', nb(dW));
    }
    if (lignes.length) compo = { lignes, depuis: pc?.date ?? null, phrase: phrase ? propre(phrase) : null };
    if (phrase) topo.push(enCouleur(phrase, 'poids', 'composition'));
  }

  // ---- mensurations ----
  let mesures: BilanCorps['mesures'] = null;
  const ms = [...(e.mesures ?? [])].sort((a, b) => (a.date < b.date ? -1 : 1));
  const mc = dernierAvant(ms, jour);
  if (mc && (mc.date === jour || e.origine === 'mensurations') && Object.keys(mc.valeurs).length) {
    const avant = ms.filter((m) => m.date < mc.date);
    const lignes: LigneMesure[] = [];
    for (const f of MESURES) {
      const v = mc.valeurs[f.key];
      if (!v) continue;
      const pm = [...avant].reverse().find((m) => m.valeurs[f.key]);
      const ec = pm ? v - (pm.valeurs[f.key] as number) : null;
      const petit = ec !== null && Math.abs(ec) < BRUIT_CM;
      lignes.push({ key: f.key, label: f.label, valeur: v, ecart: ec, depuis: pm?.date ?? null, bruit: petit, bon: ec === null || petit || f.bon === 'none' ? null : f.bon === 'down' ? ec < 0 : ec > 0 });
    }
    let phrase: string | null = null;
    const bougent = lignes.filter((l) => l.ecart !== null && !l.bruit).sort((a, b) => Math.abs(b.ecart as number) - Math.abs(a.ecart as number));
    const avecPrec = lignes.filter((l) => l.ecart !== null);
    if (!avecPrec.length) phrase = traduire("Tes premières mensurations sont notées{0}. La prochaine fois, tu verras les écarts.", lignes.length ? ` (${liste(lignes.slice(0, 3).map((l) => `${l.label} ${nb(l.valeur)} cm`))})` : '');
    else if (!bougent.length) phrase = traduire('Tes mensurations n’ont pas bougé au-delà d’un demi-centimètre : c’est la précision d’un mètre ruban.');
    else {
      const top = bougent.slice(0, 2).map((l) => (l.ecart as number) < 0 ? traduire("ton {0} a perdu {1} cm", l.label, nb(l.ecart as number)) : traduire("ton {0} a pris {1} cm", l.label, nb(l.ecart as number)));
      phrase = traduire("{0} depuis le {1}.", maj(liste(top)), dateCourte(bougent[0].depuis as string));
      const taille = bougent.find((l) => l.key === 'waist' || l.key === 'navel');
      if (taille && (taille.ecart as number) < 0 && mode !== 'prise') phrase += traduire(' Le tour de taille est souvent le plus parlant : il bouge même quand la balance hésite.');
    }
    mesures = { lignes, depuis: avecPrec.length ? (avecPrec[0].depuis as string) : null, phrase: propre(phrase) };
    if (e.origine === 'mensurations') topo.unshift(enCouleur(phrase, 'mesure', 'mesure'));
    else topo.push(enCouleur(phrase, 'mesure', 'mesure'));
  }

  // ---- objectif ----
  let objectif: BilanCorps['objectif'] = null;
  const cap = e.objectif?.cap ?? null;
  if (cible && dep && cap && (mode === 'perte' || mode === 'prise') && Math.abs(dep.poids - cap) >= 0.2) {
    const total = dep.poids - cap;
    const fait = dep.poids - cible.value;
    const pct = Math.max(0, Math.min(1, fait / total));
    const atteint = mode === 'perte' ? cible.value <= cap + 0.05 : cible.value >= cap - 0.05;
    const reste = Math.max(0, Math.abs(cible.value - cap));
    const ec = cible.value - dep.poids;
    let texte: string;
    if (atteint) texte = traduire("Ton objectif de {0} kg est atteint. Parti de {1} kg le {2}, tu y es.", nb(cap), kg1(dep.poids), dateCourte(dep.date));
    else if (bonPoids(ec, mode) && Math.abs(ec) >= 0.1) texte = ec < 0 ? traduire("Depuis le début de ton objectif, le {0}, tu as perdu {1} : {2} % du chemin. Il reste {3} jusqu’à {4} kg.", dateCourte(dep.date), kgOuG(ec), Math.round(pct * 100), kgOuG(reste), nb(cap)) : traduire("Depuis le début de ton objectif, le {0}, tu as pris {1} : {2} % du chemin. Il reste {3} jusqu’à {4} kg.", dateCourte(dep.date), kgOuG(ec), Math.round(pct * 100), kgOuG(reste), nb(cap));
    else texte = traduire("Ton objectif : {0} kg, il reste {1}. Chaque pesée rend ta tendance plus juste.", nb(cap), kgOuG(reste));
    objectif = { pct: atteint ? 1 : pct, reste: atteint ? 0 : reste, atteint, texte: propre(texte), depart: dep.poids, cap };
    topo.push(atteint ? riche('objectif', seg('objectif', texte)) : enCouleur(texte, 'poids', 'objectif'));
  }
  if (e.ligne?.texte) {
    const t = e.ligne.texte.endsWith('.') ? e.ligne.texte : `${e.ligne.texte}.`;
    topo.push(e.ligne.ton === 'vert' ? riche('ligne', seg('objectif', t)) : enCouleur(t, 'poids', 'ligne'));
  }
  if (e.prevision) topo.push(enCouleur(e.prevision, 'poids', 'tendance'));
  if (e.torii) topo.push(enCouleur(e.torii, 'poids'));
  const repas = phraseBilanRepas(e.repas ?? null, e.repas?.app ?? null);
  if (repas) topo.push(riche('repas', repas));

  // une seule pesee de reference ou une variation faible : un repere simple pour la suite
  if (cible && cp && cp.bruit && !tendance) topo.push(riche('conseil', traduire('Pèse-toi dans les mêmes conditions, le matin au réveil, pour des écarts plus parlants.')));
  const fin = finirTopo(topo, true);

  const titre = e.origine === 'mensurations' ? 'Tes mensurations' : e.origine === 'composition' || e.origine === 'photo' ? traduire('Ta composition') : traduire('Ta pesée');
  return {
    titre,
    sousTitre: maj(dateLongue(jour)),
    poids,
    peseeDuJour,
    verdict,
    comparaisons,
    tendance,
    compo,
    mesures,
    objectif,
    ligne: e.ligne ?? null,
    prevision: e.prevision ?? null,
    repas,
    paragraphe: fin.paragraphe,
    riche: fin.riche,
    serie: pesees.filter((p) => p.date <= jour && joursEntre(p.date, jour) <= 30),
    carte: carteCorps({ jour, compo, mesures, comparaisons, mode, nbPesees: pesees.filter((p) => p.date <= jour).length, depart: dep, poids }),
  };
}

const kgGrand = (d: number): Grand => ({ value: signe(d), unit: 'kg' });
const pctGrand = (d: number, base: number): Grand => ({ value: signe((d / base) * 100), unit: '%' });

/**
 * La carte « Bilan » : les gros chiffres qui ont vraiment bouge.
 * Composition d'abord (« −0,6 kg de graisse, +200 g de muscle »), sinon une mensuration, sinon le poids
 * depuis le debut de ton objectif (ou sur un mois). Jamais de poids absolu en vedette : le masquage du poids
 * retire les petits chiffres marques poids et passe en pourcentage.
 */
function carteCorps(a: {
  jour: string;
  compo: BilanCorps['compo'];
  mesures: BilanCorps['mesures'];
  comparaisons: Comparaison[];
  mode: ModeObjectif | null;
  nbPesees: number;
  depart: { date: string; poids: number } | null;
  poids: number | null;
}): Exploit | null {
  const base = { type: 'bilan_corps' as const, date: a.jour, surtitre: traduire('Mon bilan'), priorite: 45 };
  const f = a.compo?.lignes.find((l) => l.id === 'fatKg');
  const m = a.compo?.lignes.find((l) => l.id === 'muscleKg');
  const fp = a.compo?.lignes.find((l) => l.id === 'fat');
  const depuis = a.compo?.depuis;
  if (depuis && f && f.ecart !== null && Math.abs(f.ecart) >= 0.1) {
    const mPart = m && m.ecart !== null && Math.abs(m.ecart) >= 0.1 ? traduire(", {0}{1} de muscle", m.ecart > 0 ? '+' : MOINS, kgOuG(m.ecart)) : '';
    const cotes: CoteExploit[] = [];
    if (m && m.ecart !== null) cotes.push({ label: traduire('de muscle'), value: signe(m.ecart), unit: 'kg' });
    if (fp && fp.ecart !== null) cotes.push({ label: traduire('de masse grasse'), value: signe(fp.ecart), unit: 'pt' });
    const pe = a.comparaisons.find((c) => c.depuis === depuis) ?? null;
    if (pe) cotes.push({ label: traduire('sur la balance'), value: signe(pe.ecart), unit: 'kg' });
    return {
      ...base,
      hero: kgGrand(f.ecart),
      accroche: traduire("de graisse{0}", mPart),
      detail: traduire("Depuis le {0}", dateCourte(depuis)),
      cotes: cotes.slice(0, 3),
      masque: {
        ecart: { hero: kgGrand(f.ecart), accroche: traduire("de graisse{0}", mPart) },
        pourcentage: fp && fp.ecart !== null ? { hero: { value: signe(fp.ecart), unit: 'pt' }, accroche: traduire('de masse grasse') } : { hero: kgGrand(f.ecart), accroche: traduire("de graisse{0}", mPart) },
      },
    };
  }
  const mb = a.mesures?.lignes.filter((l) => l.ecart !== null && !l.bruit).sort((x, y) => Math.abs(y.ecart as number) - Math.abs(x.ecart as number))[0];
  if (mb && mb.depuis) {
    const autres = (a.mesures?.lignes ?? []).filter((l) => l !== mb && l.ecart !== null && !l.bruit).slice(0, 2);
    const cotes: CoteExploit[] = autres.map((l) => ({ label: l.label, value: signe(l.ecart as number), unit: 'cm' }));
    return { ...base, hero: { value: signe(mb.ecart as number), unit: 'cm' }, accroche: traduire("de {0}", mb.label), detail: traduire("Depuis le {0}", dateCourte(mb.depuis)), cotes, masque: { ecart: { hero: { value: signe(mb.ecart as number), unit: 'cm' } }, pourcentage: { hero: { value: signe(mb.ecart as number), unit: 'cm' } } } };
  }
  const ref = a.comparaisons.find((c) => c.id === 'objectif' && Math.abs(c.ecart) >= 0.1) ?? a.comparaisons.find((c) => c.id === 'mois' && !c.bruit) ?? a.comparaisons.find((c) => c.id === 'semaine' && !c.bruit);
  if (ref && a.poids) {
    const basePoids = a.poids - ref.ecart;
    const mot = ref.ecart < 0 ? 'perdus' : traduire('pris');
    const cotes: CoteExploit[] = [{ label: traduire('aujourd’hui'), value: nb(a.poids), unit: 'kg', poids: true }, { label: a.nbPesees > 1 ? traduire('pesées') : traduire('pesée'), value: String(a.nbPesees) }];
    return {
      ...base,
      hero: kgGrand(ref.ecart),
      accroche: traduire("{0} depuis le {1}", mot, dateCourte(ref.depuis)),
      cotes,
      masque: { ecart: { hero: kgGrand(ref.ecart), accroche: traduire("{0} depuis le {1}", mot, dateCourte(ref.depuis)) }, pourcentage: { hero: pctGrand(ref.ecart, basePoids), accroche: traduire("{0} depuis le {1}", mot, dateCourte(ref.depuis)) } },
    };
  }
  return null;
}

// ============================================
// SEANCE
// ============================================

export type SeanceJ = {
  id: number;
  date: string;
  sport: string;
  nomSport: string;
  dureeMin: number;
  /** ressenti 1 a 10 (RPE) */
  intensite?: number | null;
  fcMoy?: number | null;
  fcMax?: number | null;
  calories?: number | null;
  distanceKm?: number | null;
  rounds?: number | null;
  series?: number | null;
  tonnage?: number | null;
  /** secondes passees dans chaque zone cardiaque (5) */
  zones?: number[] | null;
};

export type EntreeSeance = {
  seance: SeanceJ;
  /** la seance d'avant du meme sport */
  precedente: SeanceJ | null;
  /** compte des seances jusqu'a celle-ci comprise */
  compteurs: { jour: number; semaine: number; mois: number; annee: number; total: number };
  /** seances par semaine visees, 0 sans objectif */
  objectifSemaine: number;
  annee?: { fait: number; total: number; ecart: number } | null;
  records?: string[];
  techniques?: { liste: string[]; appris: boolean } | null;
  /** semaines avec au moins une seance sur les 4 dernieres (celle-ci comprise), semaines d'affilee objectif tenu, jours depuis la seance precedente (tous sports) */
  regularite?: { semainesActives: number; sur: number; serie: number; joursDepuis: number | null } | null;
  /** plusieurs seances recues d'un coup (montre) : un seul bilan */
  recues?: number;
};

export type BilanSeance = {
  titre: string;
  sousTitre: string;
  chiffres: { label: string; value: string; unit?: string }[];
  intensite: { valeur: number; mot: string } | null;
  coeur: { fcMoy: number | null; fcMax: number | null; zones: { zone: number; nom: string; part: number }[] | null; texte: string | null } | null;
  comparaison: { depuis: string; lignes: string[] } | null;
  compteurs: { label: string; value: string }[];
  objectifSemaine: { fait: number; total: number; texte: string } | null;
  annee: { fait: number; total: number; texte: string } | null;
  records: string[];
  techniques: string[];
  techniquesTitre: string | null;
  regularite: string | null;
  paragraphe: string[];
  /** le meme topo en morceaux colores (meme texte, phrase par phrase) */
  riche: PhraseRiche[];
  carte: Exploit | null;
};

export const ZONES = ['récupération', traduire('endurance de base'), 'tempo', 'seuil', 'effort maximal'];

export function motIntensite(rpe: number): string {
  if (rpe <= 3) return traduire('légère');
  if (rpe <= 6) return traduire('modérée');
  if (rpe <= 8) return 'difficile';
  return traduire('très dure');
}

export function bilanSeance(e: EntreeSeance): BilanSeance {
  const s = e.seance;
  const k = e.compteurs;
  const sport = s.nomSport || traduire('Séance');
  const sportMin = sport.toLowerCase();
  const topo: PhraseRiche[] = [];
  const annee = s.date.slice(0, 4);

  const chiffres: BilanSeance['chiffres'] = [];
  if (s.dureeMin > 0) chiffres.push({ label: traduire('durée'), value: minutesTexte(s.dureeMin) });
  if (s.distanceKm && s.distanceKm > 0) chiffres.push({ label: 'distance', value: nb(s.distanceKm, 2), unit: 'km' });
  if (s.rounds && s.rounds > 0) chiffres.push({ label: pluriel(s.rounds, 'round', 'rounds'), value: String(s.rounds) });
  if (s.series && s.series > 0) chiffres.push({ label: traduire('séries'), value: String(s.series) });
  if (s.tonnage && s.tonnage >= 1) chiffres.push({ label: traduire('soulevés'), value: s.tonnage >= 1000 ? nb(s.tonnage / 1000, 1) : String(Math.round(s.tonnage)), unit: s.tonnage >= 1000 ? 't' : 'kg' });
  if (s.calories && s.calories > 0) chiffres.push({ label: 'calories', value: String(Math.round(s.calories)), unit: 'kcal' });

  const intensite = s.intensite && s.intensite >= 1 && s.intensite <= 10 ? { valeur: Math.round(s.intensite), mot: motIntensite(s.intensite) } : null;

  // ---- cœur ----
  let coeur: BilanSeance['coeur'] = null;
  const zs = Array.isArray(s.zones) && s.zones.length === 5 ? s.zones : null;
  const totZ = zs ? zs.reduce((a, b) => a + (b > 0 ? b : 0), 0) : 0;
  const zones = zs && totZ > 0 ? zs.map((v, i) => ({ zone: i + 1, nom: ZONES[i], part: Math.max(0, v) / totZ })) : null;
  if ((s.fcMoy && s.fcMoy > 0) || (s.fcMax && s.fcMax > 0) || zones) {
    let texte: string | null = null;
    const top = zones ? [...zones].sort((a, b) => b.part - a.part)[0] : null;
    const morceaux: string[] = [];
    if (s.fcMoy && s.fcMoy > 0) morceaux.push(`${Math.round(s.fcMoy)} bpm en moyenne`);
    if (s.fcMax && s.fcMax > 0) morceaux.push(traduire("{0} au plus haut", Math.round(s.fcMax)));
    if (morceaux.length) texte = traduire("Ton cœur : {0}.", liste(morceaux));
    if (top && top.part >= 0.2) texte = traduire("{0}Tu as passé {1} % du temps en zone {2}, {3}.", texte ? `${texte} ` : '', Math.round(top.part * 100), top.zone, top.nom);
    coeur = { fcMoy: s.fcMoy && s.fcMoy > 0 ? Math.round(s.fcMoy) : null, fcMax: s.fcMax && s.fcMax > 0 ? Math.round(s.fcMax) : null, zones, texte };
  }

  // ---- compteurs ----
  const compteurs: BilanSeance['compteurs'] = [
    { label: traduire('cette semaine'), value: ordinal(k.semaine) },
    { label: traduire('ce mois'), value: ordinal(k.mois) },
    { label: `en ${annee}`, value: ordinal(k.annee) },
  ];
  if (e.recues && e.recues > 1) topo.push(riche('compteur', seg('fort', traduire("{0} séances", e.recues)), traduire(' sont arrivées d’un coup : voici le bilan de la dernière.')));
  if (k.total === 1) topo.push({ ...riche(null, traduire('C’est ta '), seg('seance', traduire('toute première séance')), traduire(' enregistrée : bienvenue, le compteur est lancé.')), phare: true });
  else
    topo.push({
      ...riche(
        null,
        traduire('Tu en es à ta '),
        seg('seance', traduire("{0} séance", ordinal(k.semaine))),
        traduire(' de la semaine, ta '),
        seg('seance', ordinal(k.mois)),
        traduire(' du mois et ta '),
        seg('seance', ordinal(k.annee)),
        traduire(" de {0}.", annee),
        k.jour >= 2 && traduire(' Et la '),
        k.jour >= 2 && seg('seance', ordinal(k.jour)),
        k.jour >= 2 && traduire(' aujourd’hui.'),
      ),
      phare: true,
    });

  let objectifSemaine: BilanSeance['objectifSemaine'] = null;
  const w = Math.round(e.objectifSemaine || 0);
  if (w > 0) {
    const rp =
      k.semaine >= w
        ? k.semaine > w
          ? riche('objectif', seg('objectif', traduire('Objectif de la semaine dépassé')), ' : ', seg('objectif', traduire("{0} séances", k.semaine)), traduire(" pour {0} prévues.", w))
          : riche('objectif', seg('objectif', traduire('Objectif de la semaine atteint')), ' : ', seg('objectif', traduire("{0} sur {1}", w, w)), '.')
        : riche('compteur', traduire('Encore '), seg('seance', `${w - k.semaine} ${pluriel(w - k.semaine, traduire('séance'), traduire('séances'))}`), traduire(' pour ton objectif de la semaine ('), seg('fort', traduire("{0} sur {1}", k.semaine, w)), ').');
    objectifSemaine = { fait: k.semaine, total: w, texte: texteDe(rp) };
    topo.push(rp);
  }
  let anneeBloc: BilanSeance['annee'] = null;
  if (e.annee && e.annee.total > 0) {
    const a = e.annee;
    const rp =
      a.fait >= a.total
        ? riche('annee', seg('objectif', traduire("Ton objectif de {0} est tenu", annee)), ' : ', seg('objectif', traduire("{0} séances", a.fait)), traduire(" pour {0} visées.", a.total))
        : a.ecart > 0
          ? riche('annee', traduire("Sur ton objectif de {0}, tu as ", annee), seg('objectif', `${a.ecart} ${pluriel(a.ecart, traduire('séance'), traduire('séances'))} d’avance`), traduire(' sur ton rythme ('), seg('fort', traduire("{0} sur {1}", a.fait, a.total)), ').')
          : a.ecart < 0
            ? riche('annee', traduire("Sur ton objectif de {0}, ", annee), seg('fort', traduire("{0} séances sur {1}", a.fait, a.total)), traduire(" : {0} de retard sur ton rythme, rien qui ne se rattrape.", -a.ecart))
            : riche('annee', traduire("Sur ton objectif de {0}, tu es ", annee), seg('objectif', traduire('pile dans ton rythme')), ' : ', seg('fort', traduire("{0} sur {1}", a.fait, a.total)), '.');
    anneeBloc = { fait: a.fait, total: a.total, texte: texteDe(rp) };
    topo.push(rp);
  }

  // ---- comparaison avec la seance d'avant du meme sport ----
  let comparaison: BilanSeance['comparaison'] = null;
  const p = e.precedente;
  if (p) {
    const lignes: string[] = [];
    const dd = s.dureeMin - p.dureeMin;
    if (s.dureeMin > 0 && p.dureeMin > 0) lignes.push(Math.abs(dd) < 3 ? traduire('Même durée, à quelques minutes près') : dd > 0 ? traduire("{0} de plus", minutesTexte(dd)) : traduire("{0} de moins", minutesTexte(dd)));
    if (s.distanceKm && p.distanceKm && s.distanceKm > 0 && p.distanceKm > 0) {
      const d = s.distanceKm - p.distanceKm;
      if (Math.abs(d) >= 0.1) lignes.push(d > 0 ? traduire("{0} km de plus", nb(Math.abs(d), 1)) : traduire("{0} km de moins", nb(Math.abs(d), 1)));
    }
    if (s.rounds && p.rounds) {
      const d = s.rounds - p.rounds;
      if (d !== 0) lignes.push(d > 0 ? traduirePluriel(Math.abs(d), Math.abs(d) > 1, "{0} round de plus", "{0} rounds de plus", Math.abs(d)) : traduirePluriel(Math.abs(d), Math.abs(d) > 1, "{0} round de moins", "{0} rounds de moins", Math.abs(d)));
    }
    if (s.tonnage && p.tonnage && s.tonnage > 0 && p.tonnage > 0) {
      const d = s.tonnage - p.tonnage;
      if (Math.abs(d) >= 10) lignes.push(d > 0 ? traduire("{0} soulevés de plus", Math.abs(d) >= 1000 ? `${nb(Math.abs(d) / 1000, 1)} t` : `${Math.round(Math.abs(d))} kg`) : traduire("{0} soulevés de moins", Math.abs(d) >= 1000 ? `${nb(Math.abs(d) / 1000, 1)} t` : `${Math.round(Math.abs(d))} kg`));
    }
    if (s.intensite && p.intensite) {
      const d = Math.round(s.intensite) - Math.round(p.intensite);
      lignes.push(d === 0 ? traduire('Le même ressenti') : d > 0 ? traduire("Ressenti plus dur ({0} sur 10 contre {1})", Math.round(s.intensite), Math.round(p.intensite)) : traduire("Ressenti plus léger ({0} sur 10 contre {1})", Math.round(s.intensite), Math.round(p.intensite)));
    }
    if (s.fcMoy && p.fcMoy && s.fcMoy > 0 && p.fcMoy > 0) {
      const d = Math.round(s.fcMoy - p.fcMoy);
      if (Math.abs(d) >= 3) lignes.push(d > 0 ? traduire("Cœur moyen {0} bpm plus haut", Math.abs(d)) : traduire("Cœur moyen {0} bpm plus bas", Math.abs(d)));
    }
    comparaison = { depuis: p.date, lignes };
    if (lignes.length) {
      const detail = enCouleur(`${lignes.map((l) => l.charAt(0).toLowerCase() + l.slice(1)).join(', ')}.`, 'seance');
      topo.push(riche('comparaison', traduire("Par rapport à ta séance de {0} du {1} : ", sportMin, dateCourte(p.date)), ...detail.segments));
    }
  } else if (k.total > 1) {
    topo.push(riche('comparaison', traduire("Ta première séance de {0} enregistrée : la prochaine aura un point de comparaison.", sportMin)));
  }

  if (intensite) topo.push(riche('ressenti', traduire('Tu l’as ressentie '), seg('fort', traduire("{0}, {1} sur 10", intensite.mot, intensite.valeur)), '.'));
  if (coeur?.texte) topo.push(enCouleur(coeur.texte, 'seance', 'coeur'));

  const records = e.records ?? [];
  if (records.length) topo.push(records.length > 1 ? riche('record', traduire("Et {0} records tombent : ", records.length), seg('record', liste(records)), '.') : riche('record', traduire('Et un record tombe : '), seg('record', records[0]), '.'));
  const tech = e.techniques?.liste ?? [];
  const techniquesTitre = tech.length ? (e.techniques?.appris ? traduire('Appris aujourd’hui') : traduire('Travaillé aujourd’hui')) : null;
  if (tech.length) topo.push(riche('technique', `${e.techniques?.appris ? traduire('Tu as appris') : traduire('Tu as travaillé')} ${tech.length > 1 ? `${tech.length} techniques` : traduire('une technique')} : `, seg('seance', liste(tech.slice(0, 5))), '.'));

  // ---- regularite ----
  let regularite: string | null = null;
  const r = e.regularite;
  if (r) {
    const m: Morceau[] = [];
    if (r.serie >= 2) m.push(seg('objectif', traduire("{0} semaines d’affilée", r.serie)), traduire(' avec ton objectif tenu.'));
    else if (r.sur >= 2 && r.semainesActives >= r.sur) m.push(traduire('Au moins une séance chaque semaine depuis '), seg('seance', traduire("{0} semaines", r.sur)), '.');
    else if (r.sur >= 2) m.push(seg('seance', traduire("{0} semaines actives", r.semainesActives)), traduire(" sur les {0} dernières.", r.sur));
    if (r.joursDepuis !== null && r.joursDepuis >= 10) m.push(m.length ? ' ' : '', traduire('Ta séance précédente date de '), seg('fort', traduire("{0} jours", r.joursDepuis)), traduire(' : bon retour.'));
    if (m.length) {
      const rp = riche('regularite', ...m);
      regularite = texteDe(rp);
      topo.push(rp);
    }
  }
  const fin = finirTopo(topo, false);

  return {
    titre: sport,
    sousTitre: maj(dateLongue(s.date)),
    chiffres,
    intensite,
    coeur,
    comparaison,
    compteurs,
    objectifSemaine,
    annee: anneeBloc,
    records,
    techniques: tech,
    techniquesTitre,
    regularite,
    paragraphe: fin.paragraphe,
    riche: fin.riche,
    carte: carteSeance(e),
  };
}

/** La carte « Bilan » d'une seance : le compteur en gros (« 12e séance du mois ») avec la semaine et l'annee */
function carteSeance(e: EntreeSeance): Exploit {
  const k = e.compteurs;
  const s = e.seance;
  const annee = s.date.slice(0, 4);
  const cotes: CoteExploit[] = [{ label: traduire('de la semaine'), value: ordinal(k.semaine) }, { label: traduire("de {0}", annee), value: ordinal(k.annee) }];
  if (s.dureeMin > 0) cotes.push({ label: traduire('aujourd’hui'), value: minutesTexte(s.dureeMin) });
  const a = e.annee;
  return {
    type: 'bilan_seance',
    date: s.date.slice(0, 10),
    surtitre: s.nomSport || traduire('Mon bilan'),
    hero: { value: String(k.mois), unit: k.mois === 1 ? 're' : 'e' },
    accroche: traduire('séance du mois'),
    cotes,
    barre: a && a.total > 0 ? { fait: a.fait, total: a.total, legende: a.fait >= a.total ? traduire("Objectif {0} tenu", annee) : traduire("{0} sur {1} séances visées en {2}", a.fait, a.total, annee) } : undefined,
    priorite: 45,
  };
}
