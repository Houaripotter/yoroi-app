/**
 * Pas des boutons de charge pendant une seance (+ et -).
 * 1er novembre 2026, precision de Houari : les appuis rapides doivent bien monter de 10 en 10, c'etait la sensibilite
 * qui posait probleme. L'ancien seuil (350 ms entre deux tapes, archive dans
 * _archive_ancien_design_2026-10-09/pas_rapide_2026-10-31/) etait au-dessus d'un rythme normal (3 tapes par seconde,
 * environ 330 ms) : la rafale ne s'arretait jamais et la charge est montee a 230 kg.
 * (Regle du 1er novembre remplacee le 17 novembre 2026, voir plus bas.)
 * Au saut, la valeur se cale sur le multiple du pas dans le sens de l'appui (63 + 10 donne 70, 63 - 10 donne 60).
 *
 * 17 novembre 2026, retour de Houari : « quand j'augmente, ca va trop vite. Il faudrait que ca monte par 10 seulement
 * apres 10 clics rapides, ou 15 ». Avant, le saut venait des le 3e appui rapide, et l'appui maintenu passait a 5 kg
 * apres 1 s. Nouvelle regle, la meme pour les appuis et l'appui maintenu, comptee en pas et non plus en temps :
 *  - pas 1 a PAS_AVANT_ACCELERATION (10) : le pas normal, 1 kg (ou le pas du reglage) a chaque fois ;
 *  - pas 11 a PAS_AVANT_SAUT (15) : un pas moyen, la moitie du saut (5 kg, 10 lb, 2 plaques) ;
 *  - a partir du 16e : le saut (10 kg, 20 lb, 5 plaques).
 * Un ecart de plus de DELAI_TAPE_RAPIDE_MS entre deux appuis, ou un autre bouton, et tout repart du pas normal.
 * Pour les repetitions (sans saut), l'appui maintenu garde le pas de 1 et ne prend de la vitesse qu'apres 10 pas,
 * doucement (delaiRepetition). Avant : plus rapide des le 6e pas, puis tres rapide (45 ms) des le 13e.
 */

/** ecart maximal entre deux appuis pour qu'ils comptent comme rapides (environ 3 appuis par seconde et plus) */
export const DELAI_TAPE_RAPIDE_MS = 300;
/** pas faits au pas normal avant toute acceleration */
export const PAS_AVANT_ACCELERATION = 10;
/** dernier pas au pas moyen ; ensuite, le saut */
export const PAS_AVANT_SAUT = 15;

export type Rafale = { bouton: string | null; derniere: number; compte: number };

export const RAFALE_VIDE: Rafale = { bouton: null, derniere: 0, compte: 0 };

/**
 * Compte un appui. `compte` dans la rafale : rang de cet appui parmi les appuis rapides d'affilee (1 pour le premier).
 * `saut` vaut vrai des que l'appui depasse PAS_AVANT_ACCELERATION (il accelere).
 */
export function compterTape(r: Rafale, bouton: string, maintenant: number): { rafale: Rafale; saut: boolean } {
  const ecart = maintenant - r.derniere;
  // ecart negatif ou illisible : on repart du pas normal
  const suite = r.bouton === bouton && r.compte > 0 && Number.isFinite(ecart) && ecart >= 0 && ecart < DELAI_TAPE_RAPIDE_MS;
  const compte = suite ? r.compte + 1 : 1;
  return { rafale: { bouton, derniere: maintenant, compte }, saut: compte > PAS_AVANT_ACCELERATION };
}

/** Heure du doigt pose : horodatage natif de l'evenement s'il existe, sinon l'heure du JS */
export function heureAppui(e?: { nativeEvent?: { timestamp?: number } } | null): number {
  const t = e?.nativeEvent?.timestamp;
  return typeof t === 'number' && Number.isFinite(t) && t > 0 ? t : Date.now();
}

export const REPETITION_MS = 150;
/** cadence des gros pas, plus lente pour pouvoir lacher a temps */
export const REPETITION_GROS_MS = 250;

/**
 * Gros pas a appliquer au `rang`-ieme pas d'affilee (appuis rapides ou appui maintenu).
 * `null` : le pas normal. Sinon le pas moyen (moitie du saut, arrondie au pas, jamais sous le pas), puis le saut.
 */
export function pasAccelere(rang: number, saut: number | undefined | null, pas = 1): number | null {
  if (!saut || saut <= 0 || !Number.isFinite(rang) || rang <= PAS_AVANT_ACCELERATION) return null;
  if (rang > PAS_AVANT_SAUT) return saut;
  const p = pas > 0 ? pas : 1;
  const moyen = Math.floor(saut / 2 / p) * p;
  return moyen > p ? Math.round(moyen * 100) / 100 : null;
}

/** Appui maintenu : meme regle, comptee en pas repetes (1 pour le premier) */
export function pasAppuiMaintenu(rang: number, saut: number | undefined | null, pas = 1): number | null {
  return pasAccelere(rang, saut, pas);
}

/** Delai avant le pas suivant d'un appui maintenu sans saut (repetitions) : regulier, puis un peu plus vif */
export function delaiRepetition(rang: number): number {
  if (!Number.isFinite(rang) || rang <= PAS_AVANT_ACCELERATION) return REPETITION_MS;
  if (rang <= 2 * PAS_AVANT_ACCELERATION) return 120;
  return 90;
}

const net = (v: number) => Math.round(v * 100) / 100;

/**
 * Valeur suivante. Sans saut : valeur + dir x pas. Avec saut : prochain multiple du saut dans le sens de l'appui.
 * Toujours bornee entre min (0 par defaut) et max.
 */
export function valeurSuivante(valeur: number, dir: 1 | -1, pas: number, saut: number | null, min = 0, max = Infinity): number {
  let next: number;
  if (saut && saut > 0) {
    const q = net(valeur / saut);
    const cale = Number.isInteger(q);
    next = dir > 0 ? (cale ? valeur + saut : Math.ceil(q) * saut) : cale ? valeur - saut : Math.floor(q) * saut;
  } else {
    next = valeur + dir * pas;
  }
  return Math.min(max, Math.max(min, net(next)));
}

