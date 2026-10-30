/**
 * 30 octobre 2026 (Houari : « Par photo, Composition, Évolution, Photo : je clique, ça quitte, seul le premier marche »).
 *
 * La cause : la feuille du bouton + (app/ajouter.tsx) est un ecran « transparentModal ». Sur iPhone, iPad et Mac,
 * react-native-screens range tout ecran « push » (une page normale) dans la pile de base, SOUS les fenetres
 * presentees : une page poussee depuis la feuille s'ouvre donc derriere elle. Seules les pages declarees en
 * « modal » dans app/_layout.tsx (pesee, add-measurement, sleep-input, add-competition...) passent par dessus,
 * d'ou « seul le premier marche » : Poids (/pesee) et Mesurer (/add-measurement) sont des modales, Par photo,
 * Composition, Evolution et Photo sont des pages normales. Toucher le fond assombri pour sortir appelait
 * router.back() et fermait la page ouverte derriere : « ça quitte ».
 *
 * La regle : une modale s'ouvre par dessus la feuille (le retour ramene au +). Une page normale, sur iOS, REMPLACE
 * la feuille ; on note qu'il faut rouvrir le + quand tu reviens sur les onglets (le retour ramene quand meme au +).
 * Android et le web empilent correctement : on garde l'ouverture par dessus.
 *
 * Aucun import React Native ici : tout se teste avec jest.
 */

/** Les ecrans declares en modale dans app/_layout.tsx (verifie par le test depuisLePlus) */
export const ECRANS_MODAUX: readonly string[] = [
  'pesee',
  'add-measurement',
  'entry',
  'injury-detail',
  'add-competition',
  'add-combat',
  'sleep-input',
  'add-training',
  'add-combat-session',
  'add-club',
  'quick-nutrition',
  'wrapped',
];

/** Le nom d'ecran d'un lien : « /seance/match?x=1 » donne « seance/match », « /programmes/index » donne « programmes » */
export function nomEcran(href: string): string {
  let n = href.split('?')[0].split('#')[0].trim();
  n = n.replace(/^\/+/, '').replace(/\/+$/, '');
  if (n === 'index') return '';
  return n.replace(/\/index$/, '');
}

/** Vrai si l'ecran s'ouvre par dessus la feuille du + (sinon il la remplace) */
export function parDessusLaFeuille(href: string, os: string): boolean {
  if (os !== 'ios') return true;
  return ECRANS_MODAUX.includes(nomEcran(href));
}

/** Ce que le + doit montrer quand il se rouvre */
export type EtatPlus = { onglet: string };

/** Au dela, on ne rouvre plus le + (tu es passe a autre chose) */
const DUREE_RETOUR_MS = 2 * 60 * 60 * 1000;

let retour: (EtatPlus & { quand: number }) | null = null;

/** La feuille va etre remplacee par une page : rouvrir le + au retour sur les onglets */
export function memoriserRetourAuPlus(etat: EtatPlus, maintenant = Date.now()): void {
  retour = { ...etat, quand: maintenant };
}

/** Le + est ouvert : plus rien a rouvrir */
export function oublierRetourAuPlus(): void {
  retour = null;
}

/** Tu reviens sur les onglets : l'etat du + a rouvrir, une seule fois, sinon null */
export function prendreRetourAuPlus(maintenant = Date.now()): EtatPlus | null {
  const r = retour;
  retour = null;
  if (!r || maintenant - r.quand > DUREE_RETOUR_MS || maintenant < r.quand) return null;
  return { onglet: r.onglet };
}

type EtatNav = { index?: number; routes?: { name: string; state?: unknown }[] } | null | undefined;

/**
 * Vrai si les onglets sont au premier plan : on cherche la pile qui contient « (tabs) » (la pile racine, meme
 * enveloppee par expo-router) et on regarde son ecran du dessus.
 */
export function ongletsAuPremierPlan(etat: EtatNav, profondeur = 0): boolean {
  if (!etat || !Array.isArray(etat.routes) || etat.routes.length === 0 || profondeur > 6) return false;
  const i = typeof etat.index === 'number' ? etat.index : etat.routes.length - 1;
  const dessus = etat.routes[Math.min(Math.max(i, 0), etat.routes.length - 1)];
  if (etat.routes.some((r) => r.name === '(tabs)')) return dessus?.name === '(tabs)';
  return ongletsAuPremierPlan(dessus?.state as EtatNav, profondeur + 1);
}

/** La pile qui contient « (tabs) » (la pile racine de l'app), sinon null */
function pileRacine(etat: EtatNav, profondeur = 0): EtatNav {
  if (!etat || !Array.isArray(etat.routes) || etat.routes.length === 0 || profondeur > 6) return null;
  if (etat.routes.some((r) => r.name === '(tabs)')) return etat;
  const i = typeof etat.index === 'number' ? etat.index : etat.routes.length - 1;
  return pileRacine(etat.routes[Math.min(Math.max(i, 0), etat.routes.length - 1)]?.state as EtatNav, profondeur + 1);
}

/** L'ecran juste sous la feuille du + (« (tabs) » quand tu l'as ouverte depuis la barre d'onglets), sinon null */
export function ecranSousLePlus(etat: EtatNav): string | null {
  const pile = pileRacine(etat);
  if (!pile?.routes) return null;
  let i = -1;
  pile.routes.forEach((r, k) => {
    if (r.name === 'ajouter') i = k;
  });
  return i > 0 ? pile.routes[i - 1].name : null;
}
