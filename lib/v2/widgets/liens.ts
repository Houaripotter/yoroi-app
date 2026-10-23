/**
 * Liens des widgets (iPhone, iPad, Android, Centre de controle, Live Activity) vers les ecrans de l'app.
 *
 * Un seul format : yoroi://w/<cible>[?params]  (sur le web : /w/<cible>[?params])
 *   w/accueil, w/poids, w/pesee, w/semaine, w/seance, w/seance-faite, w/eau,
 *   w/timer?mode=combat (chrono rounds avec ton dernier reglage), w/chrono-en-cours,
 *   w/combat, w/ajout-combat
 * Les anciennes URLs (yoroi://poids-detail, yoroi://timer?mode=combat, yoroi://hydration...) restent comprises.
 *
 * Le lien n'ouvre pas l'ecran tout de suite : il est mis en attente (le dernier gagne), puis
 * LiensWidgets.tsx l'ouvre quand la navigation est prete (chargement fini, onboarding termine),
 * sans doubler l'ecran si on y est deja. Aucun import React Native ici : tout se teste avec jest.
 */

export type CibleWidget =
  | 'accueil'
  | 'poids'
  | 'pesee'
  | 'semaine'
  | 'seance'
  | 'seanceFaite'
  | 'eau'
  | 'chrono'
  | 'chronoEnCours'
  | 'combat'
  | 'ajoutCombat'
  | 'entree'
  | 'chronoSparring';

export type Destination = {
  cible: CibleWidget;
  /** chemin expo-router de l'ecran (celui que renvoie usePathname) */
  pathname: string;
  /** ce qu'on passe au routeur (un onglet se vise par son groupe) */
  href: string;
  params: Record<string, string>;
  /** push : nouvel ecran par-dessus ; navigate : revient a l'ecran s'il est deja dans la pile (onglets, chrono en cours) */
  methode: 'push' | 'navigate';
};

export type Action =
  | { type: 'rien' }
  | { type: 'push' | 'navigate'; href: string; params: Record<string, string> }
  | { type: 'setParams'; params: Record<string, string> };

const MODES_CHRONO = ['musculation', 'combat', 'tabata', 'emom', 'amrap', 'fortime'];

const SCHEMAS_MAISON = new Set(['yoroi', 'exp+yoroi', 'com.houari.yoroi']);

const ECRANS: Record<CibleWidget, { pathname: string; href?: string; methode: 'push' | 'navigate' }> = {
  accueil: { pathname: '/', href: '/(tabs)', methode: 'navigate' },
  poids: { pathname: '/poids-detail', methode: 'push' },
  pesee: { pathname: '/pesee', methode: 'push' },
  semaine: { pathname: '/seances', href: '/(tabs)/seances', methode: 'navigate' },
  seance: { pathname: '/seance', methode: 'push' },
  seanceFaite: { pathname: '/seance/deja-faite', methode: 'push' },
  eau: { pathname: '/hydration', methode: 'push' },
  chrono: { pathname: '/timer', methode: 'push' },
  chronoEnCours: { pathname: '/timer', methode: 'navigate' },
  combat: { pathname: '/competition-countdown', methode: 'push' },
  ajoutCombat: { pathname: '/add-competition', methode: 'push' },
  // navigation directe : /entry n'est qu'un relais vers /pesee, on ouvre la pesee tout de suite
  entree: { pathname: '/pesee', methode: 'push' },
  chronoSparring: { pathname: '/combat-timer', methode: 'push' },
};

/** Noms acceptes apres w/ (et anciennes routes sans w/) */
const ALIAS: Record<string, CibleWidget> = {
  '': 'accueil',
  accueil: 'accueil',
  index: 'accueil',
  home: 'accueil',
  '(tabs)': 'accueil',
  poids: 'poids',
  'poids-detail': 'poids',
  pesee: 'pesee',
  peser: 'pesee',
  semaine: 'semaine',
  seances: 'semaine',
  '(tabs)/seances': 'semaine',
  seance: 'seance',
  'seance-faite': 'seanceFaite',
  'seance/deja-faite': 'seanceFaite',
  'deja-faite': 'seanceFaite',
  eau: 'eau',
  hydration: 'eau',
  chrono: 'chrono',
  timer: 'chrono',
  'chrono-en-cours': 'chronoEnCours',
  combat: 'combat',
  'competition-countdown': 'combat',
  competitions: 'combat',
  'ajout-combat': 'ajoutCombat',
  'add-competition': 'ajoutCombat',
  entry: 'entree',
  entree: 'entree',
  'combat-timer': 'chronoSparring',
};

function decoder(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s;
  }
}

function lireQuery(q: string): Record<string, string> {
  const r: Record<string, string> = {};
  for (const morceau of q.split('&')) {
    if (!morceau) continue;
    const i = morceau.indexOf('=');
    const k = decoder(i >= 0 ? morceau.slice(0, i) : morceau).trim();
    const v = decoder(i >= 0 ? morceau.slice(i + 1) : '').trim();
    if (k && !(k in r)) r[k] = v;
  }
  return r;
}

/** Seuls les parametres connus passent, avec des valeurs verifiees */
function paramsPour(cible: CibleWidget, q: Record<string, string>, viaW: boolean, nom: string): Record<string, string> {
  if (cible === 'chrono') {
    const mode = (q.mode || '').toLowerCase();
    if (MODES_CHRONO.includes(mode)) return { mode };
    // w/chrono et w/timer sans mode : le chrono rounds ; l'ancien yoroi://timer garde la liste des chronos
    return viaW || nom === 'chrono' ? { mode: 'combat' } : {};
  }
  if (cible === 'combat' && /^\d{1,12}$/.test(q.compId || '')) return { compId: q.compId };
  return {};
}

/**
 * Traduit une URL ou un chemin en destination, ou null si ce n'est pas un lien de widget
 * (le routeur le traite alors comme avant).
 */
export function lireLien(brut: unknown): Destination | null {
  if (typeof brut !== 'string') return null;
  let s = brut.trim();
  if (!s || s.length > 500) return null;
  const diese = s.indexOf('#');
  if (diese >= 0) s = s.slice(0, diese);
  let query = '';
  const qi = s.indexOf('?');
  if (qi >= 0) {
    query = s.slice(qi + 1);
    s = s.slice(0, qi);
  }

  let chemin = s;
  let maison = false;
  const m = /^([a-z][a-z0-9+.-]*):\/\/(.*)$/i.exec(s);
  if (m) {
    const schema = m[1].toLowerCase();
    if (SCHEMAS_MAISON.has(schema)) {
      maison = true;
      chemin = m[2];
    } else if (schema === 'http' || schema === 'https') {
      const i = m[2].indexOf('/');
      chemin = i >= 0 ? m[2].slice(i + 1) : '';
    } else {
      return null;
    }
  } else if (/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    return null;
  }

  const segs = chemin
    .split('/')
    .map((x) => decoder(x).trim().toLowerCase())
    .filter(Boolean);
  if (segs[0] === '--') segs.shift();
  let viaW = false;
  if (segs[0] === 'w') {
    viaW = true;
    segs.shift();
  } else if (!maison) {
    return null;
  }

  const nom = segs.join('/');
  const cible = ALIAS[nom] ?? (viaW ? 'accueil' : undefined);
  if (!cible) return null;
  const e = ECRANS[cible];
  return {
    cible,
    pathname: e.pathname,
    href: e.href ?? e.pathname,
    params: paramsPour(cible, lireQuery(query), viaW, nom),
    methode: e.methode,
  };
}

/** L'URL d'une cible, au format des widgets */
export function urlWidget(nom: string, params?: Record<string, string>): string {
  const q = params ? Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&') : '';
  return `yoroi://w/${nom}${q ? `?${q}` : ''}`;
}

function valeur(v: unknown): string | undefined {
  if (Array.isArray(v)) return v.length ? String(v[0]) : undefined;
  return v == null ? undefined : String(v);
}

/** Que faire de la destination, vu l'ecran ouvert : rien si on y est deja, sinon changer les reglages ou ouvrir */
export function decider(d: Destination, ici: { pathname: string; params?: Record<string, unknown> }): Action {
  const chemin = (ici.pathname || '/').replace(/\/+$/, '') || '/';
  if (chemin === d.pathname) {
    const p = ici.params ?? {};
    const pareil = Object.entries(d.params).every(([k, v]) => valeur(p[k]) === v);
    return pareil ? { type: 'rien' } : { type: 'setParams', params: d.params };
  }
  return { type: d.methode, href: d.href, params: d.params };
}

/** Ecrans pendant lesquels un lien attend : chargement (route racine), onboarding, paywall */
const ATTENTE = new Set(['onboarding', 'onboarding-tour', 'paywall', 'w']);

/** Vrai quand on peut ouvrir l'ecran : navigation montee et l'utilisateur dans l'app (pas au chargement ni a l'onboarding) */
export function navigationPrete(segments: readonly string[], cleNavigation?: string | null): boolean {
  if (!cleNavigation) return false;
  if (!segments.length) return false;
  return !ATTENTE.has(segments[0]);
}

// ─── File d'attente (un seul lien : le dernier gagne) ─────────────────────────

/** Le meme lien recu deux fois de suite (par exemple Centre de controle : URL et App Group) n'ouvre qu'un ecran */
export const FENETRE_DOUBLON_MS = 3000;

let enAttente: Destination | null = null;
let dernier: { cle: string; at: number } | null = null;
const abonnes = new Set<() => void>();

export const cleDestination = (d: Destination): string =>
  `${d.cible}|${Object.keys(d.params)
    .sort()
    .map((k) => `${k}=${d.params[k]}`)
    .join('&')}`;

export function deposerLien(d: Destination, maintenant: number = Date.now()): boolean {
  const cle = cleDestination(d);
  if (dernier && dernier.cle === cle && maintenant - dernier.at < FENETRE_DOUBLON_MS) return false;
  dernier = { cle, at: maintenant };
  enAttente = d;
  abonnes.forEach((f) => {
    try {
      f();
    } catch {
      // un abonne en erreur ne bloque pas les autres
    }
  });
  return true;
}

/** Traduit et met en attente ; vrai si c'etait un lien de widget (meme ignore comme doublon) */
export function recevoirUrl(url: unknown, maintenant: number = Date.now()): boolean {
  const d = lireLien(url);
  if (!d) return false;
  deposerLien(d, maintenant);
  return true;
}

export const lienEnAttente = (): Destination | null => enAttente;

export function prendreLien(): Destination | null {
  const d = enAttente;
  enAttente = null;
  return d;
}

export function surLien(f: () => void): () => void {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}

/** Pour les tests */
export function reinitialiserLiens(): void {
  enAttente = null;
  dernier = null;
  abonnes.clear();
}
