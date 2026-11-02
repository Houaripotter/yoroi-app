/**
 * Revenir sur ta derniere page (2 novembre 2026). Houari : quand l'app est fermee completement (par toi ou par iOS),
 * elle revient sur la page ou tu etais, surtout la carte de partage et son studio.
 *
 * Ce fichier est la logique pure (testee dans __tests__/unit/dernierePage.test.ts) :
 *  1. memoriser la page courante et ses parametres, avec l'heure, dans la cle yoroi_derniere_page_v1 (ce telephone
 *     seulement : jamais dans les cles synchronisees, lib/v2/synchro/cles.ts) ; ecriture regroupee (petit delai) ;
 *  2. au demarrage a froid seulement, rouvrir cette page si elle date de moins de 2 heures ;
 *  3. ne jamais rouvrir l'onboarding, le paywall, les modales passageres, la seance en direct (elle a deja sa
 *     barre « Séance en cours » pour la reprendre), l'appairage et la synchro, la corbeille ni la suppression ;
 *  4. jamais la photo d'une carte : ses copies sont effacees a la sortie (lib/v2/cartes/tmp.ts). On garde
 *     seulement « il y avait une photo », pour proposer « Ajouter ta photo » a la reouverture.
 * Le composant qui branche tout ca : lib/v2/nav/RouvrirDernierePage.tsx, monte dans app/_layout.tsx.
 */

export const CLE_DERNIERE_PAGE = 'yoroi_derniere_page_v1';
/** Au-dela, on reste sur l'accueil */
export const DUREE_MAX_MS = 2 * 60 * 60 * 1000;
/** Ecriture regroupee : plusieurs changements rapides ne font qu'une ecriture */
export const DELAI_ECRITURE_MS = 400;

export type Params = Record<string, string>;

export interface DernierePage {
  v: 1;
  /** chemin sans groupe : /carte, /progres, /programmes/ppl */
  chemin: string;
  /** parametres de la page (sans ceux deja dans le chemin, ni rien qui ressemble a un fichier) */
  params: Params;
  /** details notes par la page elle-meme (onglet, chiffres choisis...), remis en parametres a la reouverture */
  details?: Params;
  /** heure d'enregistrement (ms) */
  at: number;
}

// ─── Ecrans jamais rouverts ───────────────────────────────────────────────────

/** Ecrans exclus, avec tout ce qui est en dessous */
const EXCLUS_PREFIXES = [
  // onboarding, nouveautes, abonnement
  '/onboarding', '/onboarding-tour', '/nouveautes', '/paywall',
  // relais des widgets et liens, ecran d'erreur
  '/w', '/+not-found', '/_sitemap',
  // seance en direct et chrono : ils ont leur reprise (barre « Séance en cours », lib/v2/seance/reprendre.ts)
  '/seance', '/timer', '/combat-timer', '/match-tracker',
  // appairage et synchro avec son code
  '/sync-devices', '/sync-history',
  // suppression, corbeille, restauration
  '/corbeille', '/privacy-data', '/backup-history', '/settings/copies-securite',
  // Studio createur : ecrans de test des etats d'erreur et des fenetres
  '/studio/etats', '/studio/fenetres',
];

/** Modales et saisies passageres (presentation modale dans app/_layout.tsx, formulaires d'ajout ou de modification) */
const EXCLUS_EXACTS = new Set([
  '/ajouter', '/pesee', '/entry', '/add-measurement', '/injury-detail', '/add-competition', '/add-combat',
  '/sleep-input', '/add-training', '/add-combat-session', '/add-club', '/quick-nutrition', '/quick-log', '/wrapped',
  '/edit-competition', '/injury-evaluation', '/mes-seances/modifier',
]);

/** Normalise un chemin : sans groupe « (tabs) », sans barre finale, toujours avec une barre au debut */
export function normaliserChemin(chemin: string | null | undefined): string {
  if (typeof chemin !== 'string') return '/';
  const sansQuery = chemin.split('?')[0].split('#')[0];
  const morceaux = sansQuery.split('/').filter((m) => m && !/^\(.*\)$/.test(m));
  return `/${morceaux.join('/')}`;
}

export function estAccueil(chemin: string): boolean {
  return normaliserChemin(chemin) === '/';
}

/** Vrai pour un ecran qu'on ne rouvre jamais */
export function estExclu(chemin: string, params: Params = {}): boolean {
  const c = normaliserChemin(chemin);
  if (EXCLUS_EXACTS.has(c)) return true;
  if (EXCLUS_PREFIXES.some((p) => c === p || c.startsWith(`${p}/`))) return true;
  // la carte Avant apres montre les photos de ton coffre : elle ne s'ouvre jamais toute seule
  if (c === '/carte' && params.moment === 'avant_apres') return true;
  // un apercu de l'onboarding ou du paywall demande depuis un ecran (mode createur)
  if (params.preview === '1' || params.preview === 'true') return true;
  return false;
}

// ─── Parametres gardes ────────────────────────────────────────────────────────

/** Jamais gardes : photos (meme de demo), reprise de seance, apercus */
const PARAMS_JAMAIS = /^(photo\d*|resume|preview|autoShare|__.*|#.*)$/;
const VALEUR_FICHIER = /^(file|content|ph|assets-library|data|blob|https?):|cartes_tmp|\/var\/mobile|\/data\/user/i;
const MAX_VALEUR = 120;
const MAX_PARAMS = 16;

function valeurSimple(v: unknown): string | null {
  const x = Array.isArray(v) ? v[0] : v;
  if (typeof x === 'number' && Number.isFinite(x)) return String(x);
  if (typeof x !== 'string') return null;
  if (!x || x.length > MAX_VALEUR || x === 'undefined' || x === 'null') return null;
  if (VALEUR_FICHIER.test(x) || x.startsWith('/')) return null;
  return x;
}

/**
 * Les parametres a garder : seulement des valeurs courtes, jamais un chemin de fichier ni une photo.
 * `dynamiques` : les noms des segments du chemin ([id]), deja dans le chemin, donc pas repetes.
 */
export function nettoyerParams(params: Record<string, unknown> | null | undefined, dynamiques: readonly string[] = []): Params {
  const r: Params = {};
  if (!params || typeof params !== 'object') return r;
  let n = 0;
  for (const [k, v] of Object.entries(params)) {
    if (n >= MAX_PARAMS) break;
    if (!k || PARAMS_JAMAIS.test(k) || dynamiques.includes(k)) continue;
    const s = valeurSimple(v);
    if (s === null) continue;
    r[k] = s;
    n++;
  }
  return r;
}

/** Les noms des segments dynamiques d'apres useSegments : ['programmes', '[id]'] donne ['id'] */
export function segmentsDynamiques(segments: readonly string[]): string[] {
  const r: string[] = [];
  for (const s of segments) {
    const m = /^\[(?:\.\.\.)?([^\]]+)\]$/.exec(s);
    if (m) r.push(m[1]);
  }
  return r;
}

// ─── La page a memoriser ──────────────────────────────────────────────────────

/** Details que seule la page donne (noterDetails) : repris de l'adresse, ils ne doivent pas y rester colles */
const DETAILS_SEULEMENT = ['avaitPhoto', 'fiche'];

export function pageDe(chemin: string, params: Record<string, unknown> | null | undefined, segments: readonly string[], maintenant: number): DernierePage {
  return { v: 1, chemin: normaliserChemin(chemin), params: nettoyerParams(params, [...segmentsDynamiques(segments), ...DETAILS_SEULEMENT]), at: maintenant };
}

export const memePage = (a: Pick<DernierePage, 'chemin' | 'params'> | null, b: Pick<DernierePage, 'chemin' | 'params'> | null): boolean => {
  if (!a || !b || a.chemin !== b.chemin) return false;
  const ka = Object.keys(a.params).sort();
  const kb = Object.keys(b.params).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a.params[k] === b.params[k]);
};

export function serialiser(p: DernierePage): string {
  return JSON.stringify(p);
}

/** Relit la valeur rangee ; null au moindre doute */
export function lire(brut: string | null | undefined): DernierePage | null {
  if (!brut) return null;
  try {
    const o = JSON.parse(brut) as Partial<DernierePage> | null;
    if (!o || o.v !== 1 || typeof o.chemin !== 'string' || typeof o.at !== 'number' || !Number.isFinite(o.at)) return null;
    const params = nettoyerParams(o.params as Record<string, unknown>);
    const details = o.details ? nettoyerParams(o.details as Record<string, unknown>) : undefined;
    return { v: 1, chemin: normaliserChemin(o.chemin), params, ...(details && Object.keys(details).length ? { details } : {}), at: o.at };
  } catch {
    return null;
  }
}

// ─── Au demarrage ─────────────────────────────────────────────────────────────

export type Decision = { rouvrir: true; href: string; onglet: boolean } | { rouvrir: false; raison: string };

/** Les onglets : on change d'onglet (le retour ramene a l'accueil), on ne pousse pas une page */
const ONGLETS = new Set(['/seances', '/progres', '/dojo']);

/** L'adresse a rouvrir : le chemin, ses parametres, puis les details notes par la page */
export function hrefDe(p: DernierePage): string {
  const tout: Params = { ...p.params, ...(p.details ?? {}) };
  const q = Object.keys(tout)
    .filter((k) => tout[k] !== '')
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(tout[k])}`)
    .join('&');
  return q ? `${p.chemin}?${q}` : p.chemin;
}

/** Rouvrir ou non, sans toucher aux donnees (la verification des donnees vient apres : verifierDonnees) */
export function decider(p: DernierePage | null, maintenant: number): Decision {
  if (!p) return { rouvrir: false, raison: 'rien' };
  const age = maintenant - p.at;
  if (!(age >= 0)) return { rouvrir: false, raison: 'heure' };
  if (age >= DUREE_MAX_MS) return { rouvrir: false, raison: 'ancienne' };
  if (estAccueil(p.chemin)) return { rouvrir: false, raison: 'accueil' };
  if (estExclu(p.chemin, p.params)) return { rouvrir: false, raison: 'exclue' };
  return { rouvrir: true, href: hrefDe(p), onglet: ONGLETS.has(p.chemin) };
}

// ─── Les donnees dont la page a besoin ────────────────────────────────────────

/** Ce qu'on sait verifier ; chaque fonction dit si la donnee existe encore */
export interface Verifs {
  seance: (id: number) => Promise<boolean>;
  carte: (params: Params) => Promise<boolean>;
  programme: (id: string) => Promise<boolean>;
  competition: (id: number) => Promise<boolean>;
  combat: (id: number) => Promise<boolean>;
  pesee: (id: number) => Promise<boolean>;
}

const entier = (s: string | undefined): number | null => (s && /^\d{1,12}$/.test(s) ? Number(s) : null);

/** Parametres qui designent une donnee : une page qui en a un sans verification connue n'est pas rouverte */
const PARAMS_DONNEE = ['id', 'compId', 'competitionId', 'injuryId', 'avant', 'apres'];

/**
 * Vrai si la page peut se rouvrir : la seance, la carte, le programme... existent toujours.
 * Une erreur de lecture compte comme une donnee absente : on reste sur l'accueil, sans plantage.
 */
export async function verifierDonnees(p: DernierePage, v: Verifs): Promise<boolean> {
  try {
    const c = p.chemin;
    const q = p.params;
    if (c === '/carte') {
      if (q.demo === '1') return true;
      return await v.carte(q);
    }
    if (c === '/workout-detail' || c === '/social-share/last-session') {
      if (q.demo === '1') return true;
      const id = entier(q.id);
      return id !== null && (await v.seance(id));
    }
    const prog = /^\/programmes\/(?!conseil\/|zones$|prochaines$)([^/]+)$/.exec(c);
    if (prog) return await v.programme(decodeURIComponent(prog[1]));
    if (c === '/competition-detail' || c === '/competition-camp' || c === '/competition-countdown') {
      const brut = q.id ?? q.compId;
      if (brut === undefined) return true;
      const id = entier(brut);
      return id !== null && (await v.competition(id));
    }
    if (c === '/combat-detail') {
      const id = entier(q.id);
      return id !== null && (await v.combat(id));
    }
    if (c === '/pesee-detail') {
      const id = entier(q.id);
      return id !== null && (await v.pesee(id));
    }
    // une autre page qui depend d'une donnee qu'on ne sait pas verifier : on ne prend pas le risque
    if (PARAMS_DONNEE.some((k) => q[k] !== undefined)) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── Ecriture regroupee ───────────────────────────────────────────────────────

export interface Stockage {
  setItem: (k: string, v: string) => Promise<void>;
}

/**
 * Garde la page courante en memoire et l'ecrit apres un petit delai (une seule ecriture pour plusieurs
 * changements rapides). `vider` ecrit tout de suite (passage en arriere-plan).
 */
export function creerMemoire(stockage: Stockage, delai: number = DELAI_ECRITURE_MS) {
  let courante: DernierePage | null = null;
  /** details arrives avant la page (les effets d'un ecran passent avant ceux du layout) */
  let enAttente: { chemin: string; details: Params } | null = null;
  let minuteur: ReturnType<typeof setTimeout> | null = null;
  let actif = false;

  const ecrire = () => {
    minuteur = null;
    if (!courante || !actif) return;
    stockage.setItem(CLE_DERNIERE_PAGE, serialiser(courante)).catch(() => {});
  };
  const planifier = () => {
    if (!actif) return;
    if (minuteur) clearTimeout(minuteur);
    minuteur = setTimeout(ecrire, delai);
  };

  return {
    /** Rien n'est ecrit avant : la page d'avant doit d'abord etre relue (sinon l'accueil l'ecraserait) */
    activer() {
      actif = true;
      planifier();
    },
    estActive: () => actif,
    /** Une nouvelle page : ses details repartent de zero (sauf ceux qu'elle a deja donnes) */
    noter(p: DernierePage) {
      if (courante && memePage(courante, p)) courante = { ...courante, at: p.at };
      else {
        courante = p;
        if (enAttente && enAttente.chemin === p.chemin) courante = { ...p, details: enAttente.details };
      }
      enAttente = null;
      planifier();
    },
    /** Details donnes par la page ouverte (onglet, chiffres, fiche ouverte...) */
    noterDetails(chemin: string, details: Record<string, unknown>, maintenant: number) {
      const c = normaliserChemin(chemin);
      const d = nettoyerParams(details);
      if (!courante || courante.chemin !== c) {
        enAttente = { chemin: c, details: d };
        return;
      }
      courante = { ...courante, details: d, at: maintenant };
      planifier();
    },
    /** Passage en arriere-plan : l'heure est celle ou tu as quitte l'app, ecrite tout de suite */
    vider(maintenant?: number) {
      if (minuteur) clearTimeout(minuteur);
      if (courante && typeof maintenant === 'number') courante = { ...courante, at: maintenant };
      ecrire();
    },
    courante: () => courante,
  };
}

// ─── Details rendus a la page rouverte (une seule fois) ───────────────────────

/** Les details d'une page rouverte restent prets quelques secondes, le temps que la page se monte */
export const DUREE_DETAILS_MS = 15000;

let restaures: { details: Params; at: number } | null = null;

export function poserDetailsRestaures(details: Params | undefined, maintenant: number = Date.now()): void {
  restaures = details && Object.keys(details).length ? { details: { ...details }, at: maintenant } : null;
}

/**
 * Vrai une seule fois si la page rouverte avait ce detail avec cette valeur (la fiche d'exercice ouverte...).
 * Rien apres DUREE_DETAILS_MS : un detail oublie ne rouvre rien plus tard.
 */
export function prendreDetailRestaure(cle: string, valeur: string, maintenant: number = Date.now()): boolean {
  if (!restaures || maintenant - restaures.at > DUREE_DETAILS_MS) {
    restaures = null;
    return false;
  }
  if (restaures.details[cle] !== valeur) return false;
  delete restaures.details[cle];
  return true;
}
