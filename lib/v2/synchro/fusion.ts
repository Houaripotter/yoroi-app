/**
 * Fusion par element pour la synchro entre tes telephones (28 octobre 2026).
 *
 * Avant : une liste entiere (partenaires, carnet, charges...) partait comme UNE valeur, et la plus recente
 * remplacait l'autre. Un partenaire ajoute sur l'iPad et une note ajoutee sur l'iPhone le meme jour :
 * l'un des deux disparaissait.
 *
 * Maintenant chaque liste est decoupee en elements (un partenaire, une entree du carnet, un champ d'un
 * reglage). Chaque element a son identifiant, son empreinte et son heure de modification :
 *  - un element ajoute d'un cote arrive de l'autre ;
 *  - deux modifications du meme element : la plus recente gagne (a egalite, la meme regle des deux cotes) ;
 *  - une suppression laisse une pierre tombale : l'element ne revient pas, sauf s'il a ete modifie APRES
 *    la suppression sur l'autre telephone ;
 *  - un ancien telephone qui envoie la liste entiere : on AJOUTE ce qui manque, rien n'est retire.
 *
 * Fonctions pures, sans stockage : l'etat est tenu par ./elements.ts. Testees dans
 * __tests__/unit/synchroFusion.test.ts.
 */

/** Version du format des elements echanges. Un telephone qui ne la connait pas recoit l'ancien format seul. */
export const FORMAT_ELEMENTS = 1;

export type Forme = 'liste' | 'objet' | 'valeur';

export interface SousListe {
  /** champ de l'element qui contient la sous liste (entries, notes, missions...) */
  champ: string;
  /** champs propres a ce telephone (numero de seance local, chemin de photo) : jamais envoyes, gardes ici */
  champsLocaux?: readonly string[];
  /** champ qui identifie un element de la sous liste (par defaut id, uuid ou key, sinon le contenu) */
  idChamp?: string;
}

export interface SpecForme {
  forme: Forme;
  sousListes?: readonly SousListe[];
  champsLocaux?: readonly string[];
  idChamp?: string;
  /** forme valeur : ce qui part (sans ce qui est propre a ce telephone) */
  nettoyerValeur?: (brut: string) => string;
  /** forme valeur : la valeur recue, completee avec ce qui est propre a ce telephone */
  completerValeur?: (recu: string, local: string | null) => string;
}

/** Un element d'une valeur decoupee : id stable, contenu, parent pour un element de sous liste */
export interface Element {
  id: string;
  d: unknown;
  p?: string;
}

export interface MetaEl { h: string; u: number; c: number; s?: string }
export interface MetaTomb { u: number; c: number; s?: string }
/** Etat de synchro d'une cle sur ce telephone */
export interface MetaCle { el: Record<string, MetaEl>; t: Record<string, MetaTomb> }

export interface ItemEnvoi { id: string; u: number; d: unknown; p?: string }
export interface TombEnvoi { id: string; u: number }
/** Ce qui part pour une cle : les elements modifies et les suppressions depuis le dernier echange */
export interface EtatEnvoi { k: string; f: Forme; items: ItemEnvoi[]; tombs: TombEnvoi[] }

/** Garde fou : une disparition massive (remise a zero, incident) ne laisse aucune pierre tombale */
export const SUPPRESSION_MASSIVE_MIN = 10;
export const SUPPRESSION_MASSIVE_PART = 0.5;

// ─── Empreintes ──────────────────────────────────────────────────────────

/** JSON stable : les cles des objets triees a tous les niveaux */
export function stable(v: unknown): string {
  if (v === undefined) return 'null';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(o[k])}`).join(',')}}`;
}

/** Hash 64 bits (deux FNV 1a 32 bits), le meme que lib/peerSyncService.ts */
export function hash64(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619);
    h2 ^= c;
    h2 = Math.imul(h2, 0x5bd1e995);
    h2 ^= h2 >>> 15;
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

export const empreinte = (d: unknown): string => hash64(stable(d));

// ─── Decoupage ───────────────────────────────────────────────────────────

const estObjet = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

const sans = (o: Record<string, unknown>, champs: readonly string[]): Record<string, unknown> => {
  if (!champs.length) return o;
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (!champs.includes(k)) r[k] = v;
  return r;
};

function idDe(x: unknown, idChamp: string | undefined, champsLocaux: readonly string[]): string {
  if (estObjet(x)) {
    const brut = idChamp ? x[idChamp] : (x.id ?? x.uuid ?? x.key);
    if (typeof brut === 'string' || typeof brut === 'number') return `i:${brut}`;
    return `h:${empreinte(sans(x, champsLocaux))}`;
  }
  return `h:${empreinte(x)}`;
}

/** Un id deja pris (doublon) recoit un suffixe : aucun element n'est fondu avec un autre */
function unique(id: string, pris: Map<string, number>): string {
  const n = pris.get(id) ?? 0;
  pris.set(id, n + 1);
  return n === 0 ? id : `${id}#${n}`;
}

const idParent = (pid: string) => JSON.stringify(['i', pid]);
const idSous = (pid: string, champ: string, sid: string) => JSON.stringify(['s', pid, champ, sid]);
const idChampObjet = (champ: string) => JSON.stringify(['f', champ]);
const ID_VALEUR = JSON.stringify(['v']);

/** Erreur : la valeur enregistree ici ne se lit pas, rien n'est fusionne ni ecrit pour cette cle */
export class ValeurIllisible extends Error {
  constructor(cle: string) {
    super(`valeur illisible pour ${cle}, synchro de cette cle remise a plus tard`);
    this.name = 'ValeurIllisible';
  }
}

/** Lit la valeur selon sa forme ; null ou absente : rien. Lance ValeurIllisible si elle ne se lit pas. */
export function lire(spec: SpecForme, brut: string | null, cle = ''): unknown {
  if (brut == null || brut === '') return null;
  if (spec.forme === 'valeur') return brut;
  let v: unknown;
  try {
    v = JSON.parse(brut);
  } catch {
    throw new ValeurIllisible(cle);
  }
  if (v === null) return null;
  if (spec.forme === 'liste' && !Array.isArray(v)) throw new ValeurIllisible(cle);
  if (spec.forme === 'objet' && !estObjet(v)) throw new ValeurIllisible(cle);
  return v;
}

/** Decoupe une valeur en elements, dans l'ordre */
export function decouper(spec: SpecForme, brut: string | null, cle = ''): Element[] {
  const v = lire(spec, brut, cle);
  if (v == null) return [];
  if (spec.forme === 'valeur') {
    const s = String(v);
    return [{ id: ID_VALEUR, d: spec.nettoyerValeur ? spec.nettoyerValeur(s) : s }];
  }
  if (spec.forme === 'objet') {
    const o = v as Record<string, unknown>;
    return Object.keys(o).filter((k) => o[k] !== undefined && !(spec.champsLocaux ?? []).includes(k)).map((k) => ({ id: idChampObjet(k), d: o[k] }));
  }
  const out: Element[] = [];
  const pris = new Map<string, number>();
  const locaux = spec.champsLocaux ?? [];
  const sous = spec.sousListes ?? [];
  for (const item of v as unknown[]) {
    const pid = unique(idDe(item, spec.idChamp, locaux), pris);
    if (!estObjet(item)) {
      out.push({ id: idParent(pid), d: item });
      continue;
    }
    const champsSous = sous.filter((s) => Array.isArray(item[s.champ]));
    const corps = sans(item, [...locaux, ...champsSous.map((s) => s.champ)]);
    // les sous listes presentes (meme vides) sont notees : elles sont rendues meme sans element
    if (champsSous.length) corps.__s = champsSous.map((s) => s.champ);
    out.push({ id: idParent(pid), d: corps });
    for (const s of champsSous) {
      const prisSous = new Map<string, number>();
      for (const e of item[s.champ] as unknown[]) {
        const sid = unique(idDe(e, s.idChamp, s.champsLocaux ?? []), prisSous);
        out.push({ id: idSous(pid, s.champ, sid), d: estObjet(e) ? sans(e, s.champsLocaux ?? []) : e, p: idParent(pid) });
      }
    }
  }
  return out;
}

/** Recompose la valeur a partir des elements, en gardant ce qui est propre a ce telephone */
export function recomposer(spec: SpecForme, elements: Element[], brutLocal: string | null): string | null {
  if (spec.forme === 'valeur') {
    const e = elements.find((x) => x.id === ID_VALEUR);
    if (!e) return null;
    const s = String(e.d);
    return spec.completerValeur ? spec.completerValeur(s, brutLocal) : s;
  }
  let local: unknown = null;
  try { local = lire(spec, brutLocal); } catch { local = null; }

  if (spec.forme === 'objet') {
    if (!elements.length && local == null) return null;
    const o: Record<string, unknown> = {};
    for (const e of elements) o[(JSON.parse(e.id) as string[])[1]] = e.d;
    // champs propres a ce telephone : repris tels quels
    if (estObjet(local)) for (const k of spec.champsLocaux ?? []) if (local[k] !== undefined) o[k] = local[k];
    return JSON.stringify(o);
  }

  if (!elements.length && local == null) return null;
  const locaux = spec.champsLocaux ?? [];
  const sous = spec.sousListes ?? [];
  // items locaux par id, pour reprendre leurs champs propres a ce telephone
  const parId = new Map<string, Element>();
  if (Array.isArray(local)) {
    const pris = new Map<string, number>();
    for (const item of local) parId.set(idParent(unique(idDe(item, spec.idChamp, locaux), pris)), { id: '', d: item });
  }
  const items: unknown[] = [];
  const enfants = new Map<string, Element[]>();
  for (const e of elements) {
    if (e.p) {
      const l = enfants.get(e.p) ?? [];
      l.push(e);
      enfants.set(e.p, l);
    }
  }
  for (const e of elements) {
    if (e.p) continue;
    if (!estObjet(e.d)) {
      items.push(e.d);
      continue;
    }
    const { __s, ...corps } = e.d as Record<string, unknown>;
    const item: Record<string, unknown> = { ...corps };
    const avant = parId.get(e.id)?.d;
    if (estObjet(avant)) for (const k of locaux) if (avant[k] !== undefined) item[k] = avant[k];
    const champsSous = Array.isArray(__s) ? (__s as string[]) : [];
    for (const s of sous) {
      const liste = (enfants.get(e.id) ?? []).filter((x) => (JSON.parse(x.id) as string[])[2] === s.champ);
      if (!liste.length && !champsSous.includes(s.champ)) continue;
      // champs propres a ce telephone dans la sous liste locale
      const avantSous = new Map<string, unknown>();
      if (estObjet(avant) && Array.isArray(avant[s.champ])) {
        const pris = new Map<string, number>();
        const pid = (JSON.parse(e.id) as string[])[1];
        for (const x of avant[s.champ] as unknown[]) avantSous.set(idSous(pid, s.champ, unique(idDe(x, s.idChamp, s.champsLocaux ?? []), pris)), x);
      }
      item[s.champ] = liste.map((x) => {
        const a = avantSous.get(x.id);
        if (!estObjet(x.d) || !estObjet(a)) return x.d;
        const r: Record<string, unknown> = { ...x.d };
        for (const k of s.champsLocaux ?? []) if (a[k] !== undefined) r[k] = a[k];
        return r;
      });
    }
    items.push(item);
  }
  return JSON.stringify(items);
}

// ─── Detection des changements locaux ────────────────────────────────────

export interface ResultatScan { meta: MetaCle; elements: Element[]; change: boolean }

/**
 * Compare la valeur actuelle a l'etat memorise :
 *  - premier passage pour cette cle : tout est date 0 (une donnee d'avant ne peut jamais ecraser une vraie
 *    modification faite ailleurs) ;
 *  - element nouveau ou modifie : date de maintenant ;
 *  - element disparu : pierre tombale (sauf disparition massive, ou element d'un parent disparu).
 */
export function scanner(
  spec: SpecForme, brut: string | null, meta: MetaCle | undefined, maintenant: number, cle = '',
  /** heure de ce telephone pour l'envoi (par defaut la meme) ; `maintenant` sert a departager les versions */
  heureLocale = maintenant,
): ResultatScan {
  const elements = decouper(spec, brut, cle);
  const premier = !meta;
  const m: MetaCle = { el: { ...(meta?.el ?? {}) }, t: { ...(meta?.t ?? {}) } };
  let change = premier;
  const presents = new Set<string>();
  for (const e of elements) {
    presents.add(e.id);
    const h = empreinte(e.d);
    const connu = m.el[e.id];
    if (connu && connu.h === h) continue;
    change = true;
    if (premier) m.el[e.id] = { h, u: 0, c: heureLocale };
    else {
      m.el[e.id] = { h, u: maintenant, c: heureLocale };
      delete m.t[e.id];
    }
  }
  const disparus = Object.keys(m.el).filter((id) => !presents.has(id));
  if (disparus.length) {
    change = true;
    const parents = new Set(elements.filter((e) => !e.p).map((e) => e.id));
    const anciens = Object.keys(m.el).length;
    const massive = disparus.length >= SUPPRESSION_MASSIVE_MIN && disparus.length >= anciens * SUPPRESSION_MASSIVE_PART;
    for (const id of disparus) {
      const parent = parentDe(id);
      delete m.el[id];
      // un element dont le parent a disparu part avec lui : la pierre tombale du parent suffit
      if (massive || (parent && !parents.has(parent))) continue;
      m.t[id] = { u: maintenant, c: heureLocale };
    }
  }
  return { meta: m, elements, change };
}

/** Parent d'un id de sous liste, sinon null */
export function parentDe(id: string): string | null {
  try {
    const a = JSON.parse(id) as string[];
    return a[0] === 's' ? idParent(a[1]) : null;
  } catch {
    return null;
  }
}

// ─── Envoi ───────────────────────────────────────────────────────────────

/** Les elements et suppressions modifies ici depuis `depuis` (heure de ce telephone), sauf ce qui vient du pair */
export function aEnvoyer(cle: string, spec: SpecForme, meta: MetaCle, elements: Element[], depuis: number, pair: string): EtatEnvoi | null {
  const items: ItemEnvoi[] = [];
  for (const e of elements) {
    const m = meta.el[e.id];
    if (!m || m.c <= depuis || m.s === pair) continue;
    items.push(e.p ? { id: e.id, u: m.u, d: e.d, p: e.p } : { id: e.id, u: m.u, d: e.d });
  }
  const tombs: TombEnvoi[] = [];
  for (const [id, t] of Object.entries(meta.t)) {
    if (t.c <= depuis || t.s === pair) continue;
    tombs.push({ id, u: t.u });
  }
  return items.length || tombs.length ? { k: cle, f: spec.forme, items, tombs } : null;
}

/** Un etat recu se lit sans faire confiance a l'autre telephone */
export function etatValide(x: unknown): x is EtatEnvoi {
  if (!estObjet(x) || typeof x.k !== 'string' || !Array.isArray(x.items) || !Array.isArray(x.tombs)) return false;
  const okU = (u: unknown) => typeof u === 'number' && Number.isFinite(u) && u >= 0;
  return (x.items as unknown[]).every((i) => estObjet(i) && typeof i.id === 'string' && okU(i.u) && (i.p === undefined || typeof i.p === 'string'))
    && (x.tombs as unknown[]).every((t) => estObjet(t) && typeof t.id === 'string' && okU(t.u));
}

// ─── Fusion ──────────────────────────────────────────────────────────────

export interface ResultatFusion {
  elements: Element[];
  meta: MetaCle;
  /** la valeur locale a change */
  change: boolean;
  /** elements ajoutes, modifies ou supprimes ici */
  appliques: number;
  /** elements dont le parent est inconnu ici : non appliques, ils seront renvoyes */
  orphelins: number;
  /** heure la plus haute vue (pour l'horloge de ce telephone) */
  plusHaute: number;
}

/**
 * Le distant gagne-t-il ? La plus recente gagne ; a egalite, la meme regle des deux cotes (empreinte la plus
 * grande), sauf pour l'ancien format ou l'egalite garde la version locale.
 */
function distantGagne(uDistant: number, hDistant: string, local: MetaEl, egaliteGardeLocal: boolean): boolean {
  if (uDistant !== local.u) return uDistant > local.u;
  if (hDistant === local.h) return false;
  return egaliteGardeLocal ? false : hDistant > local.h;
}

/**
 * Fusionne ce qu'un autre telephone a envoye dans l'etat local. Pur : rend les nouveaux elements et le nouvel etat.
 * `egaliteGardeLocal` : ancien format (heure de la cle entiere, pas de l'element).
 */
export function fusionner(
  local: { elements: Element[]; meta: MetaCle },
  recu: { items: ItemEnvoi[]; tombs: TombEnvoi[] },
  source: string,
  maintenant: number,
  egaliteGardeLocal = false,
): ResultatFusion {
  const meta: MetaCle = { el: { ...local.meta.el }, t: { ...local.meta.t } };
  const parId = new Map(local.elements.map((e) => [e.id, e]));
  const ordre = local.elements.map((e) => e.id);
  let appliques = 0;
  let orphelins = 0;
  let plusHaute = 0;

  // suppressions recues d'abord (elles peuvent viser un parent), puis les parents, puis les sous elements
  for (const t of recu.tombs) {
    plusHaute = Math.max(plusHaute, t.u);
    const m = meta.el[t.id];
    // modifie ici APRES la suppression la bas : on garde notre version
    if (m && m.u > t.u) continue;
    const deja = meta.t[t.id];
    if (deja && deja.u >= t.u && !m) continue;
    if (parId.has(t.id)) {
      parId.delete(t.id);
      appliques++;
      // les sous elements partent avec leur parent
      for (const [id] of parId) {
        if (parentDe(id) === t.id) {
          parId.delete(id);
          delete meta.el[id];
        }
      }
    }
    delete meta.el[t.id];
    meta.t[t.id] = { u: Math.max(t.u, deja?.u ?? 0), c: maintenant, s: source };
  }

  const items = [...recu.items].sort((a, b) => (a.p ? 1 : 0) - (b.p ? 1 : 0));
  for (const it of items) {
    plusHaute = Math.max(plusHaute, it.u);
    const tomb = meta.t[it.id];
    // supprime ici a la meme heure ou plus tard : il ne revient pas
    if (tomb && tomb.u >= it.u) continue;
    if (it.p && !parId.has(it.p)) {
      // parent supprime ici : l'element part avec lui ; parent inconnu : renvoye plus tard
      if (!meta.t[it.p]) orphelins++;
      continue;
    }
    const h = empreinte(it.d);
    const m = meta.el[it.id];
    if (m && !distantGagne(it.u, h, m, egaliteGardeLocal)) continue;
    if (!m && parId.has(it.id)) {
      // present ici mais jamais vu par le scan (ne devrait pas arriver) : on compare au contenu
      if (empreinte(parId.get(it.id)!.d) === h) continue;
    }
    if (!parId.has(it.id)) ordre.push(it.id);
    parId.set(it.id, it.p ? { id: it.id, d: it.d, p: it.p } : { id: it.id, d: it.d });
    meta.el[it.id] = { h, u: it.u, c: maintenant, s: source };
    delete meta.t[it.id];
    appliques++;
  }

  const vus = new Set<string>();
  const elements: Element[] = [];
  for (const id of ordre) {
    if (vus.has(id) || !parId.has(id)) continue;
    vus.add(id);
    elements.push(parId.get(id)!);
  }
  return { elements, meta, change: appliques > 0, appliques, orphelins, plusHaute };
}

/**
 * Ancien format : la valeur entiere envoyee par un telephone qui n'a pas encore cette version.
 * On AJOUTE ce qui manque et on met a jour ce qui est plus recent, rien n'est jamais retire.
 */
export function fusionnerAncienFormat(
  spec: SpecForme,
  local: { elements: Element[]; meta: MetaCle },
  brutRecu: string | null,
  heureRecu: number,
  source: string,
  maintenant: number,
  cle = '',
): ResultatFusion {
  let distants: Element[];
  try {
    distants = decouper(spec, brutRecu, cle);
  } catch {
    distants = [];
  }
  return fusionner(local, { items: distants.map((e) => ({ ...e, u: heureRecu })), tombs: [] }, source, maintenant, true);
}

/** Heure des reglages de l'ancienne synchro ("AAAA-MM-JJ HH:MM:SS.mmm", UTC) en millisecondes */
export function heureAncienFormat(ts: string | null | undefined): number {
  if (!ts) return 0;
  const ms = Date.parse(`${String(ts).replace(' ', 'T')}${/Z$/.test(String(ts)) ? '' : 'Z'}`);
  return Number.isFinite(ms) ? ms : 0;
}
