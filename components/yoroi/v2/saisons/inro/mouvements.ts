/**
 * Les rythmes des decorations d'INRO, recrits en fonctions du temps (18 octobre 2026, v5).
 *
 * Dans INRO, chaque animation tourne avec withRepeat. Dans YOROI, chaque calque a une seule horloge (en
 * secondes) qui s'arrete hors ecran, ecran pas au premier plan et app en arriere plan : ces fonctions
 * redonnent exactement les memes courbes a partir de cette horloge.
 *
 * Fichier pur : teste dans __tests__/unit/saisonsInro.test.ts. Tout tourne aussi sur le fil d'affichage.
 */

/**
 * Le moteur useIconCycle d'INRO, en mode aller retour : 0,26 s d'attente, montee en `duree` (sortie cubique),
 * `pause` en haut, descente en duree / 2 (entree cubique). Rend 0 a 1.
 */
export function cycleInro(t: number, duree: number, pause: number): number {
  'worklet';
  const periode = 0.26 + duree + pause + duree * 0.5;
  const c = ((t % periode) + periode) % periode;
  if (c < 0.26) return 0;
  const a = c - 0.26;
  if (a < duree) {
    const x = a / duree;
    return 1 - (1 - x) * (1 - x) * (1 - x);
  }
  const b = a - duree;
  if (b < pause) return 1;
  const x = Math.min(1, (b - pause) / (duree * 0.5));
  return 1 - x * x * x;
}

/** withRepeat(withTiming(1, { duration: demi, easing: inOut(sin) }), -1, true) : un aller retour doux, 0 a 1 */
export function vaEtVient(t: number, demi: number, decalage = 0): number {
  'worklet';
  return 0.5 - 0.5 * Math.cos((Math.PI * (t + decalage)) / demi);
}

/**
 * Un clignement : `ouvert` secondes les yeux ouverts, fermeture en 0,09 s, reouverture en 0,12 s.
 * Rend 0 (ouvert) a 1 (ferme). Comme le chat et les yeux d'INRO.
 */
export function clignement(t: number, ouvert = 2.6, decalage = 0): number {
  'worklet';
  const periode = ouvert + 0.21;
  const c = (((t + decalage) % periode) + periode) % periode;
  if (c < ouvert) return 0;
  if (c < ouvert + 0.09) return (c - ouvert) / 0.09;
  return 1 - (c - ouvert - 0.09) / 0.12;
}

/** Les ampoules d'INRO : de 1 a 0,35 en 0,5 s puis retour, chacune avec son retard */
export function ampouleAllumee(t: number, retard: number): number {
  'worklet';
  return 0.675 + 0.325 * Math.cos((Math.PI * (t - retard)) / 0.5);
}

/** Le pas du zombie d'INRO : 11 pas en 8 secondes, de -1 a 1 */
export function pasZombie(t: number): number {
  'worklet';
  return Math.sin(t * ((Math.PI * 22) / 8));
}
