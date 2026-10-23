/**
 * Sol de chaque scene de l'accueil (14 octobre 2026) : FICHIER GENERE, ne pas modifier a la main.
 * Houari : « sur beaucoup de scenes mon personnage flotte dans les airs ». Le personnage etait pose au meme endroit
 * sur toutes les scenes, alors que la ligne du sol de chaque image est a une hauteur differente.
 * sol : hauteur du sol a l'endroit ou se tiennent les pieds du personnage (a droite), en fraction de la hauteur
 * de l'image (0 en haut, 1 en bas). Mesure faite dans le cadrage reel de l'accueil (390 et 375 points, iPhone SE)
 * et de l'apercu Ta scene : reperes trouves par analyse de l'image (lignes horizontales, changement de texture)
 * puis lecture a l'oeil de chaque image agrandie. Script : scratchpad perso_sol (analyse.py, sol_valeurs.py, gen_ts.py).
 * Une valeur au dessus de 1 ou plus basse que la bande des raccourcis (eau, nuages, sol hors du cadre) : les pieds
 * restent juste au dessus de la bande, ancres par l'ombre douce (compromis visible).
 * 15 octobre 2026 : plus de bande de nuit, les pastilles de tes outils sont posees sur l'horizon a H + 4 ; le
 * plancher des pieds descend donc a H + 1 (PLANCHER_OUTILS), jamais sous le haut des pastilles.
 * echelle : taille du personnage (1 = taille habituelle), plus petite quand le sol est lointain ou la piece vaste.
 * Les scenes animees reprennent le cadrage de leur image fixe (meme valeur). Les cles dojo_matin et dojo_soir
 * sont les variantes du dojo selon l'heure.
 * 16 octobre 2026 (miroir) : Sommet des nuages, Jardin de nuit, Quai du port, Auberge de la riviere et Mer la nuit sont
 * montres en miroir (lib/v2/espace/miroir.ts) : leur sol est mesure sur l'image retournee, dans le recadrage retourne
 * (scratchpad miroir : vue.py, compo.py, cfg.py, lecture a l'oeil a 390, 375, iPhone SE, 430 et apercu). Valeurs
 * d'origine : sommet 1,0, lanternes_jardin 1,0, lanternes_port 1,0, lanternes_ryokan 1,0, nature_mer_nuit 0,97.
 */
import { SOL_VIE, MARGE_PIEDS_VIE } from '@/lib/v2/espace/packsScenes';
import { SOL_VOYAGES } from '@/lib/v2/espace/voyages';

export type SolScene = { sol: number; echelle: number };

export const SOL_SCENES: Record<string, SolScene> = {
  bambous: { sol: 0.88, echelle: 1 },
  bataille: { sol: 0.76, echelle: 0.9 },
  camp: { sol: 0.76, echelle: 0.9 },
  cascade: { sol: 0.76, echelle: 0.9 },
  chateau: { sol: 0.7, echelle: 0.8 },
  classique_desert_jour: { sol: 0.76, echelle: 0.9 },
  classique_mer_jour: { sol: 0.76, echelle: 0.95 },
  classique_mer_nuit: { sol: 0.76, echelle: 0.95 },
  classique_parc_jour: { sol: 0.76, echelle: 0.95 },
  classique_parc_nuit: { sol: 0.76, echelle: 0.95 },
  classique_piste_jour: { sol: 0.76, echelle: 0.95 },
  classique_piste_nuit: { sol: 0.76, echelle: 0.95 },
  classique_salle_jour: { sol: 0.76, echelle: 0.95 },
  classique_salle_nuit: { sol: 0.76, echelle: 0.95 },
  classique_ville_jour: { sol: 0.76, echelle: 0.95 },
  classique_ville_nuit: { sol: 0.76, echelle: 0.95 },
  dojo: { sol: 0.76, echelle: 0.85 },
  dojo_matin: { sol: 0.76, echelle: 0.85 },
  dojo_soir: { sol: 0.76, echelle: 0.85 },
  festival: { sol: 1.0, echelle: 1 },
  forge: { sol: 0.76, echelle: 0.9 },
  jardin: { sol: 0.76, echelle: 0.9 },
  kyudojo: { sol: 0.76, echelle: 0.9 },
  lanternes_canal: { sol: 0.76, echelle: 0.95 },
  lanternes_chateau: { sol: 0.76, echelle: 0.95 },
  lanternes_festival: { sol: 0.76, echelle: 0.95 },
  lanternes_jardin: { sol: 0.78, echelle: 0.95 },
  lanternes_maison_the: { sol: 0.76, echelle: 0.95 },
  lanternes_marche: { sol: 0.76, echelle: 0.95 },
  lanternes_neige: { sol: 0.76, echelle: 0.95 },
  lanternes_pluie: { sol: 0.76, echelle: 0.95 },
  lanternes_port: { sol: 0.77, echelle: 0.95 },
  lanternes_ryokan: { sol: 0.74, echelle: 0.95 },
  lanternes_samourai: { sol: 0.76, echelle: 0.95 },
  lanternes_sanctuaire: { sol: 0.8, echelle: 1 },
  machiya_aube: { sol: 0.78, echelle: 1 },
  machiya_couchant: { sol: 0.8, echelle: 1 },
  machiya_nuit: { sol: 0.8, echelle: 1 },
  matcha: { sol: 0.76, echelle: 0.9 },
  montagne: { sol: 0.76, echelle: 0.9 },
  nature_cascade: { sol: 0.72, echelle: 0.85 },
  nature_desert_nuit: { sol: 0.76, echelle: 0.9 },
  nature_foret: { sol: 0.76, echelle: 0.95 },
  nature_mer_nuit: { sol: 0.77, echelle: 0.95 },
  nature_plage_couchant: { sol: 0.76, echelle: 0.9 },
  nature_plage_jour: { sol: 0.76, echelle: 0.9 },
  nature_ville_jour: { sol: 0.76, echelle: 0.95 },
  nature_ville_nuit: { sol: 0.76, echelle: 0.95 },
  nuit: { sol: 0.76, echelle: 0.9 },
  onsen: { sol: 0.8, echelle: 1 },
  pagode: { sol: 0.76, echelle: 0.9 },
  pavillon: { sol: 1.0, echelle: 1 },
  plage: { sol: 0.76, echelle: 0.9 },
  pont: { sol: 0.76, echelle: 0.9 },
  port: { sol: 1.0, echelle: 1 },
  remparts: { sol: 0.77, echelle: 0.9 },
  rizieres: { sol: 0.73, echelle: 0.85 },
  sakura: { sol: 0.8, echelle: 1 },
  salle: { sol: 0.76, echelle: 0.85 },
  samourai_armurerie: { sol: 0.76, echelle: 0.9 },
  samourai_armurerie_nuit: { sol: 0.76, echelle: 0.9 },
  samourai_camp_nuit: { sol: 0.76, echelle: 0.9 },
  samourai_cour: { sol: 0.76, echelle: 0.9 },
  samourai_forge_nuit: { sol: 0.76, echelle: 0.9 },
  samourai_kenjutsu: { sol: 0.76, echelle: 0.9 },
  samourai_meditation: { sol: 0.76, echelle: 0.9 },
  samourai_pavillon_aube: { sol: 1.0, echelle: 1 },
  samourai_pont_nuit: { sol: 0.95, echelle: 1 },
  samourai_porte_nuit: { sol: 0.76, echelle: 0.9 },
  sommet: { sol: 0.78, echelle: 1 },
  temple: { sol: 0.82, echelle: 1 },
  village: { sol: 0.8, echelle: 1 },
  // 16 octobre 2026 : les scenes des packs Vie reelle, mesurees par scratchpad packs/mesure.py (packsScenes.ts)
  ...SOL_VIE,
  // 18 octobre 2026 : le pack Voyages, lu sur la planche des scenes (voyages.ts)
  ...SOL_VOYAGES,
};

/** Scene pas encore mesuree (une nouvelle image) : les pieds en bas de la scene, taille habituelle */
export const SOL_DEFAUT: SolScene = { sol: 0.76, echelle: 1 };

/** Le sol de la scene, avec la variante du dojo selon l'heure */
export function solDeScene(scene: string, date: Date = new Date()): SolScene {
  let cle = scene;
  if (scene === 'dojo') {
    const h = date.getHours();
    if (h >= 5 && h < 11) cle = 'dojo_matin';
    else if (h >= 18 || h < 5) cle = 'dojo_soir';
  }
  return SOL_SCENES[cle] ?? SOL_DEFAUT;
}

/**
 * Marge transparente sous les pieds dans les images des personnages (600 x 800), en fraction de la hauteur,
 * mesuree avec PIL sur chaque image (perso_sol/marges.json) : de 1,5 % (Sensei) a 9 % (Kunoichi).
 */
const MARGE_PIEDS: Record<string, number> = {
  guerrier: 0.04,
  classique: 0.043,
  daimyo: 0.018,
  kyudo: 0.016,
  ninja: 0.026,
  ronin_errant: 0.028,
  sensei: 0.015,
  sohei: 0.016,
  dragon: 0.041,
  kitsune: 0.027,
  kunoichi: 0.09,
  moine: 0.049,
  oni: 0.044,
  tengu: 0.043,
  yuki_onna: 0.026,
  boxe: 0.06,
  course: 0.06,
  crosstraining: 0.06,
  fitness: 0.06,
  jjb: 0.06,
  mma: 0.06,
  musculation: 0.06,
  yoga: 0.06,
  // 16 octobre 2026 : packs Vie reelle, mesure PIL sur chaque image (packsScenes.ts)
  ...MARGE_PIEDS_VIE,
};

/** Marge sous les pieds de l'image du personnage (fraction de sa hauteur) */
export function margePieds(personnage: string | null | undefined): number {
  const famille = (personnage ?? 'guerrier_h').replace(/_(h|f)$/, '');
  return MARGE_PIEDS[famille] ?? 0.042;
}

/** Marge transparente au dessus de la tete (environ 6 % dans toutes les images) */
const MARGE_TETE = 0.06;

export type PlacementPersonnage = {
  /** taille de l'image du personnage (points) */
  charH: number;
  charW: number;
  /** distance entre le bas de la scene (hauteur H) et le bas de l'image du personnage */
  bas: number;
  /** hauteur des pieds depuis le haut de la scene (points), la ou se pose l'ombre */
  pieds: number;
  /** vrai si le sol de l'image est plus bas que la bande des raccourcis : pieds juste au dessus de la bande */
  compromis: boolean;
};

/**
 * Plancher des pieds, en points sous le bas de la scene (15 octobre 2026) : le haut des pastilles de tes outils est a
 * H + 4 (components/yoroi/v2/accueil/Raccourcis.tsx), les pieds restent 3 points au dessus, jamais caches.
 */
export const PLANCHER_OUTILS = 1;

/**
 * 19 octobre 2026 (Houari : « on ne voit pas la scene ») : la scene de l'accueil est une fenetre aux coins du bas
 * arrondis, tes outils sont dessous. Les pieds restent 8 points au dessus du bord de la fenetre, jamais coupes.
 */
export const PLANCHER_FENETRE = -8;

/**
 * Place les pieds du personnage sur le sol de la scene, sans deplacer l'image de la scene.
 * H : hauteur de la scene (le contenu commence la), imgH : hauteur de l'image affichee, top : marge du haut (encoche).
 * Les pieds ne descendent jamais sous H + PLANCHER_OUTILS (le haut des pastilles des outils) ; la tete reste sous
 * top + 40 (barre d'etat, bouton du son) : sinon le personnage rapetisse, jusqu'a 60 % de sa taille.
 */
export function placerPersonnage(o: { H: number; imgH: number; top: number; scene: string; personnage: string; date?: Date; plancher?: number }): PlacementPersonnage {
  const s = solDeScene(o.scene, o.date);
  const marge = margePieds(o.personnage);
  const solY = s.sol * o.imgH;
  // 19 octobre 2026 : plancher reglable (la scene fenetre de l'accueil garde les pieds au dessus de son bord, PLANCHER_FENETRE)
  const maxPieds = o.H + (o.plancher ?? PLANCHER_OUTILS);
  const pieds = Math.min(solY, maxPieds);
  const base = o.H * 0.74;
  let charH = base * s.echelle;
  // la tete visible reste sous la barre d'etat et le bouton du son
  const place = pieds - (o.top + 40);
  const visible = 1 - marge - MARGE_TETE;
  if (charH * visible > place) charH = Math.max(base * 0.6, place / visible);
  charH = Math.round(charH);
  return { charH, charW: charH * 0.75, bas: Math.round(o.H - pieds - marge * charH), pieds: Math.round(pieds), compromis: solY > maxPieds + 6 };
}
