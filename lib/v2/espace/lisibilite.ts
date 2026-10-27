/**
 * Lisibilite du texte de l'en-tete : FICHIER GENERE, ne pas modifier a la main.
 * 15 octobre 2026 (composition du haut de l'Accueil refaite) : plus de bande de nuit sous la scene, la scene descend
 * derriere tes outils et se fond dans le fond de la page. Le voile du salut est maintenant local : un plateau doux
 * centre sur ta photo et ton prenom, plus un leger voile pleine largeur qui s'efface juste sous le texte. La droite
 * de la scene (ton personnage) et le bas restent lumineux.
 * Mesure faite sur chaque image de scene dans la geometrie exacte de components/yoroi/v2/accueil/Scene.tsx
 * (accueil a 390, 375 et 430 points, iPhone SE compris, et apercu de Ta scene a 346 et 331 points), sur la zone de la
 * salutation, du prenom et de la date. Script : scratchpad accueil_haut/py/lis_haut.py (meme methode que
 * nuit_scenes/contraste_lib.py : 92e centile des pixels les plus clairs, cible 4,7 pour 1, marge 0,03).
 * Contraste le plus faible obtenu : 4,92 pour 1.
 * lum : luminance relative moyenne de la zone (0 noir, 1 blanc).
 * voile : opacite du voile encre de nuit derriere le texte (au coeur du plateau).
 * Les cles dojo_matin et dojo_soir sont les variantes du dojo selon l'heure.
 * 16 octobre 2026 (miroir) : les cinq scenes montrees en miroir (lib/v2/espace/miroir.ts) sont mesurees sur l'image
 * retournee, meme methode et memes cadrages (scratchpad miroir/lis_miroir.py) ; contraste le plus faible : 4,96 pour 1.
 * Valeurs d'origine : sommet 0,5, lanternes_ryokan 0,19, nature_mer_nuit 0,12 (jardin et port inchanges).
 */
import { LISIBILITE_VIE } from '@/lib/v2/espace/packsScenes';
import { LISIBILITE_VOYAGES } from '@/lib/v2/espace/voyages';

export type LisibiliteScene = { lum: number; voile: number };

export const LISIBILITE: Record<string, LisibiliteScene> = {
  bambous: { lum: 0.686, voile: 0.53 },
  bataille: { lum: 0.239, voile: 0.28 },
  camp: { lum: 0.182, voile: 0.28 },
  cascade: { lum: 0.376, voile: 0.65 },
  chateau: { lum: 0.407, voile: 0.55 },
  classique_desert_jour: { lum: 0.498, voile: 0.59 },
  classique_mer_jour: { lum: 0.513, voile: 0.62 },
  classique_mer_nuit: { lum: 0.248, voile: 0.34 },
  classique_parc_jour: { lum: 0.27, voile: 0.57 },
  classique_parc_nuit: { lum: 0.075, voile: 0.12 },
  classique_piste_jour: { lum: 0.406, voile: 0.48 },
  classique_piste_nuit: { lum: 0.381, voile: 0.48 },
  classique_salle_jour: { lum: 0.25, voile: 0.49 },
  classique_salle_nuit: { lum: 0.093, voile: 0.14 },
  classique_ville_jour: { lum: 0.35, voile: 0.5 },
  classique_ville_nuit: { lum: 0.195, voile: 0.36 },
  dojo: { lum: 0.578, voile: 0.59 },
  dojo_matin: { lum: 0.567, voile: 0.58 },
  dojo_soir: { lum: 0.167, voile: 0.25 },
  festival: { lum: 0.072, voile: 0.12 },
  forge: { lum: 0.106, voile: 0.22 },
  jardin: { lum: 0.394, voile: 0.51 },
  kyudojo: { lum: 0.218, voile: 0.5 },
  lanternes_canal: { lum: 0.067, voile: 0.12 },
  lanternes_chateau: { lum: 0.161, voile: 0.3 },
  lanternes_festival: { lum: 0.079, voile: 0.12 },
  lanternes_jardin: { lum: 0.07, voile: 0.12 },
  lanternes_maison_the: { lum: 0.052, voile: 0.12 },
  lanternes_marche: { lum: 0.114, voile: 0.23 },
  lanternes_neige: { lum: 0.138, voile: 0.32 },
  lanternes_pluie: { lum: 0.069, voile: 0.12 },
  lanternes_port: { lum: 0.083, voile: 0.12 },
  lanternes_ryokan: { lum: 0.098, voile: 0.18 },
  lanternes_samourai: { lum: 0.13, voile: 0.37 },
  lanternes_sanctuaire: { lum: 0.101, voile: 0.12 },
  machiya_aube: { lum: 0.295, voile: 0.38 },
  machiya_couchant: { lum: 0.133, voile: 0.2 },
  machiya_nuit: { lum: 0.065, voile: 0.12 },
  matcha: { lum: 0.239, voile: 0.4 },
  montagne: { lum: 0.217, voile: 0.43 },
  nature_cascade: { lum: 0.482, voile: 0.56 },
  nature_desert_nuit: { lum: 0.356, voile: 0.48 },
  nature_foret: { lum: 0.439, voile: 0.58 },
  nature_mer_nuit: { lum: 0.111, voile: 0.16 },
  nature_plage_couchant: { lum: 0.566, voile: 0.53 },
  nature_plage_jour: { lum: 0.782, voile: 0.63 },
  nature_ville_jour: { lum: 0.432, voile: 0.58 },
  nature_ville_nuit: { lum: 0.172, voile: 0.32 },
  nuit: { lum: 0.05, voile: 0.12 },
  onsen: { lum: 0.421, voile: 0.5 },
  pagode: { lum: 0.13, voile: 0.26 },
  pavillon: { lum: 0.071, voile: 0.12 },
  plage: { lum: 0.162, voile: 0.27 },
  pont: { lum: 0.177, voile: 0.39 },
  port: { lum: 0.205, voile: 0.51 },
  remparts: { lum: 0.275, voile: 0.48 },
  rizieres: { lum: 0.48, voile: 0.49 },
  sakura: { lum: 0.567, voile: 0.54 },
  salle: { lum: 0.176, voile: 0.32 },
  samourai_armurerie: { lum: 0.192, voile: 0.47 },
  samourai_armurerie_nuit: { lum: 0.104, voile: 0.27 },
  samourai_camp_nuit: { lum: 0.116, voile: 0.15 },
  samourai_cour: { lum: 0.214, voile: 0.5 },
  samourai_forge_nuit: { lum: 0.056, voile: 0.12 },
  samourai_kenjutsu: { lum: 0.163, voile: 0.35 },
  samourai_meditation: { lum: 0.24, voile: 0.41 },
  samourai_pavillon_aube: { lum: 0.283, voile: 0.48 },
  samourai_pont_nuit: { lum: 0.081, voile: 0.12 },
  samourai_porte_nuit: { lum: 0.066, voile: 0.12 },
  sommet: { lum: 0.29, voile: 0.46 },
  temple: { lum: 0.169, voile: 0.35 },
  village: { lum: 0.091, voile: 0.18 },
  // 16 octobre 2026 : scenes des packs Vie reelle, meme methode (scratchpad packs/lis.py, valeurs dans packsScenes.ts)
  ...LISIBILITE_VIE,
  // 27 octobre 2026 : scenes de Marseille et aurores boreales, mesure du bandeau (valeurs et methode dans voyages.ts)
  ...LISIBILITE_VOYAGES,
};

/** Voile par defaut pour une scene pas encore mesuree (une nouvelle image) : assez fort pour une scene claire */
export const VOILE_DEFAUT = 0.65;

/** Le voile de la scene, avec la variante du dojo selon l'heure */
export function voileTexte(scene: string, date: Date = new Date()): number {
  let cle = scene;
  if (scene === 'dojo') {
    const h = date.getHours();
    if (h >= 5 && h < 11) cle = 'dojo_matin';
    else if (h >= 18 || h < 5) cle = 'dojo_soir';
  }
  return LISIBILITE[cle]?.voile ?? VOILE_DEFAUT;
}
