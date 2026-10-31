/**
 * Pas rapide des boutons de charge pendant une seance (+ et -).
 * Tapes rapides : moins de 350 ms apres la precedente, sur le meme bouton. Les 2 premieres gardent le pas normal,
 * a partir de la 3e chaque tape fait le saut (10 kg, 20 lb). Une pause plus longue remet le pas normal.
 * 31 octobre 2026 : l'ecart se mesure entre deux appuis successifs, a l'heure du doigt pose (horodatage natif de
 * l'evenement), plus a l'heure ou le JS traite la tape : en seance le JS est charge (minuteur, sauvegarde), les
 * tapes lentes arrivaient en paquet et semblaient rapides, d'ou le pas de 10 qui restait colle.
 * Appui long : repetition toutes les 150 ms au pas normal, puis au saut apres 1 s d'appui.
 * Au saut, la valeur se cale sur le multiple du saut dans le sens de l'appui (63 + 10 donne 70, 63 - 10 donne 60).
 */

export const DELAI_TAPE_RAPIDE_MS = 350;
export const TAPES_AVANT_SAUT = 2;
export const REPETITION_MS = 150;
export const APPUI_LONG_SAUT_MS = 1000;

export type Rafale = { bouton: string | null; derniere: number; compte: number };

export const RAFALE_VIDE: Rafale = { bouton: null, derniere: 0, compte: 0 };

/** Compte une tape. `saut` vaut vrai a partir de la 3e tape rapide d'affilee sur le meme bouton. */
export function compterTape(r: Rafale, bouton: string, maintenant: number): { rafale: Rafale; saut: boolean } {
  const ecart = maintenant - r.derniere;
  // ecart negatif ou illisible (horloges differentes) : on repart du pas normal
  const suite = r.bouton === bouton && r.compte > 0 && Number.isFinite(ecart) && ecart >= 0 && ecart < DELAI_TAPE_RAPIDE_MS;
  const compte = suite ? r.compte + 1 : 1;
  return { rafale: { bouton, derniere: maintenant, compte }, saut: compte > TAPES_AVANT_SAUT };
}

/** Heure du doigt pose : horodatage natif de l'evenement s'il existe, sinon l'heure du JS */
export function heureAppui(e?: { nativeEvent?: { timestamp?: number } } | null): number {
  const t = e?.nativeEvent?.timestamp;
  return typeof t === 'number' && Number.isFinite(t) && t > 0 ? t : Date.now();
}

/** Appui long : vrai quand l'appui dure depuis assez longtemps pour passer au saut */
export function sautAppuiLong(dureeMs: number): boolean {
  return dureeMs >= APPUI_LONG_SAUT_MS;
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
