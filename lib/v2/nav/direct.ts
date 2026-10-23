/**
 * Navigation directe (15 octobre 2026) : chaque toucher arrive tout de suite sur l'ecran voulu.
 *
 * 1. cheminDirect : les anciennes routes (/entry, /badges, /stats...) ne sont plus que des relais
 *    (un ecran vide qui redirige). Un lien qui y pointe passe par deux ecrans : on vise la destination.
 * 2. saisieDirecte : /seance avec un sport connu (creneau, modification, refaire) se contente de
 *    relayer vers /seance/muscu, /seance/combat ou /seance/cardio. On y va directement.
 * 3. delaiRestant : une attente au demarrage a froid (navigation pas encore prete) ne doit pas
 *    retarder un toucher quand l'app est deja ouverte.
 *
 * Aucun import React Native ici, sauf le choix de l'ecran de saisie : tout se teste avec jest.
 */
import { isMetricKey } from '@/lib/v2/sante/metrics';
import { seanceRoute } from '@/lib/v2/seance/sportVisuals';

type Query = Record<string, string>;

function lireQuery(q: string): Query {
  const r: Query = {};
  for (const morceau of q.split('&')) {
    if (!morceau) continue;
    const i = morceau.indexOf('=');
    const dec = (s: string) => {
      try {
        return decodeURIComponent(s.replace(/\+/g, ' '));
      } catch {
        return s;
      }
    };
    const k = dec(i >= 0 ? morceau.slice(0, i) : morceau);
    if (k && !(k in r)) r[k] = dec(i >= 0 ? morceau.slice(i + 1) : '');
  }
  return r;
}

function ecrireQuery(q: Query): string {
  const parts = Object.entries(q)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'undefined')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

const sansAccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Relais simples : la route et sa destination (identiques aux fichiers app/<relais>.tsx) */
const RELAIS: Record<string, string> = {
  '/entry': '/pesee',
  '/weight-manager': '/pesees',
  '/goals': '/training-goals?tab=liste',
  '/heart-zones': '/heart-zones-settings?mode=repos',
  '/challenges': '/(tabs)/dojo',
  '/connected-devices': '/health-connect',
  '/customize-tabs': '/settings',
  '/settings/apparence': '/settings',
  '/espace': '/settings',
  '/espace/personnaliser': '/settings',
  // 16 octobre 2026 : l'ancien choix de cadre arrive sur Photo et contour
  '/frame-selection': '/settings/photo',
  '/energy': '/readiness-detail',
  '/body-status': '/readiness-detail',
  '/health-metrics': '/sante',
  '/benchmark': '/records',
  '/performance-detail': '/activity-detail',
  '/history': '/(tabs)/seances',
  '/badges': '/dojo/sceaux',
};

/**
 * La vraie destination d'un lien : une ancienne route relais est remplacee par l'ecran ou elle renvoie.
 * Un lien deja direct ressort tel quel.
 */
export function cheminDirect(href: string): string {
  if (typeof href !== 'string' || !href) return href;
  const i = href.indexOf('?');
  const brut = i >= 0 ? href.slice(0, i) : href;
  const chemin = brut.length > 1 ? brut.replace(/\/+$/, '') : brut;
  const q = lireQuery(i >= 0 ? href.slice(i + 1) : '');

  if (RELAIS[chemin]) return RELAIS[chemin];
  switch (chemin) {
    case '/activity-history':
      return q.tab === 'calories' ? '/sante/energie-active' : '/sante/pas';
    case '/gamification':
      return q.tab === 'rangs' ? '/dojo/rangs' : q.tab === 'badges' ? '/dojo/sceaux' : q.tab === 'historique' ? '/dojo/journal' : '/(tabs)/dojo';
    case '/stats':
      if (sansAccent(q.tab ?? '') === 'sante') return isMetricKey(q.section) ? `/sante/${q.section}` : '/sante';
      return '/(tabs)/progres';
    case '/add-training':
      return `/seance${ecrireQuery(q)}`;
    case '/add-combat':
      return `/seance/match${ecrireQuery(q.competitionId ? { competitionId: q.competitionId } : {})}`;
    case '/add-combat-session':
      return `${q.editId ? '/seance' : '/seance/combat'}${ecrireQuery(q)}`;
    default:
      return href;
  }
}

/**
 * Saisie d'une seance dont le sport est connu : l'ecran de saisie du sport, sans passer par /seance
 * (qui ne ferait que relayer). Le premier sport d'une liste « jjb,musculation » choisit l'ecran.
 * Renvoie null sans sport : /seance reste le bon ecran (choix du sport).
 */
export function saisieDirecte(sport: string | null | undefined, params: Record<string, string | undefined | null> = {}): { pathname: string; params: Record<string, string> } | null {
  const principal = (sport ?? '').split(',')[0].trim();
  if (!principal) return null;
  const propres: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && v !== 'undefined') propres[k] = String(v);
  }
  return { pathname: seanceRoute(principal), params: { ...propres, sport: String(sport) } };
}

/**
 * Carte Avant apres (17 octobre 2026) : l'atelier de la carte, directement, avec la paire choisie.
 * Sans paire, la carte prend ta premiere et ta derniere photo. Le flou reste allume par defaut.
 */
export function carteAvantApresDirecte(ids?: { avant?: string | null; apres?: string | null } | null): string {
  return `/carte${ecrireQuery({ moment: 'avant_apres', avant: ids?.avant ?? '', apres: ids?.apres ?? '' })}`;
}

/** Ce qu'il reste a attendre d'une attente de demarrage commencee a `depuis` (0 si elle est passee) */
export function delaiRestant(depuis: number, maintenant: number, attente: number): number {
  if (!Number.isFinite(depuis) || !Number.isFinite(maintenant) || !(attente > 0)) return 0;
  return Math.max(0, Math.min(attente, attente - (maintenant - depuis)));
}
