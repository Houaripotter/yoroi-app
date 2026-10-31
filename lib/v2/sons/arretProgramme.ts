/**
 * 30 octobre 2026 (Houari : « le gong du paywall dure trop longtemps ») : gong.mp3 resonne 54 secondes. A la fin de
 * l'onboarding, il passait sous Ton plan et le paywall. Il s'arrete maintenant a 3 secondes au plus, avec un fondu de
 * sortie de 400 ms pour ne pas couper net. Le fichier d'origine reste intact (les chronos de combat le gardent entier).
 */

/** Ce qu'il faut d'un lecteur audio (expo-audio AudioPlayer) pour l'arreter en douceur */
export type LecteurArretable = { volume: number; pause: () => void };

export const GONG_MAX_MS = 3000;
export const GONG_FONDU_MS = 400;
const PAS_MS = 50;

/**
 * Programme l'arret du son : le volume descend a zero pendant les fonduMs dernieres millisecondes, puis le lecteur
 * se met en pause a maxMs. Rend une fonction qui annule les minuteurs ; avec couper = true elle arrete aussi le son
 * tout de suite (l'ecran se ferme avant la fin).
 */
export function arreterApres(
  lecteur: LecteurArretable,
  { maxMs = GONG_MAX_MS, fonduMs = GONG_FONDU_MS }: { maxMs?: number; fonduMs?: number } = {},
): (couper?: boolean) => void {
  const depart = lecteur.volume;
  const fondu = Math.max(0, Math.min(fonduMs, maxMs));
  let pas: ReturnType<typeof setInterval> | null = null;
  let fini = false;

  const nettoyer = () => {
    if (debutFondu) clearTimeout(debutFondu);
    if (fin) clearTimeout(fin);
    if (pas) clearInterval(pas);
    pas = null;
  };
  const couperSon = () => {
    try {
      lecteur.pause();
      // le volume revient a sa valeur pour la prochaine lecture
      lecteur.volume = depart;
    } catch {
      // lecteur deja libere : rien a faire
    }
  };

  const debutFondu = fondu > 0
    ? setTimeout(() => {
        const t0 = Date.now();
        pas = setInterval(() => {
          const k = Math.min(1, (Date.now() - t0) / fondu);
          try {
            lecteur.volume = Math.max(0, depart * (1 - k));
          } catch {
            // ignore
          }
        }, PAS_MS);
      }, maxMs - fondu)
    : null;
  const fin = setTimeout(() => {
    fini = true;
    nettoyer();
    couperSon();
  }, maxMs);

  return (couper = false) => {
    if (fini) return;
    fini = true;
    nettoyer();
    if (couper) couperSon();
  };
}
