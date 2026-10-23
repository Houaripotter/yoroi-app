/**
 * Vitrine du paywall (17 octobre 2026). Houari : « sur le paywall, change de scène et de personnage pour leur donner
 * envie ». Le bandeau du paywall (compte gratuit) montre a chaque ouverture un autre couple scene et personnage Premium,
 * pris dans cette selection : packs Vie reelle avec leur scene (toutes origines, lib/v2/dojo/packsTeintes.ts), monde
 * samourai, Legendes, scenes Japon, Nature et ville. La liste alterne homme et femme (entrelacement des deux listes)
 * et les origines. Ton propre personnage reste sur ta carte « Ton plan » et quand tu es deja Premium.
 * Univers Classique (pas de style japonais) : seulement les couples hors Japon. Sans personnage : pas de vitrine.
 *
 * voile : opacite du degrade sombre (#0E111C) sous le texte du bandeau, mesuree sur chaque image dans le cadrage reel du
 * paywall (web 390, iPhone 390, 375 SE, 375 mini, 430) : 99,5e centile des pixels de la zone du texte, cible 4,7 pour 1
 * pour le texte blanc et 4,6 pour 1 pour le libelle or, plus 0,02 de marge, plancher 0,4.
 * Script et planche de controle : scratchpad paywall_17 (sim.py, mesure.py, planche.py, planche.png).
 * Ecartes a la planche : Kunoichi (pose en saut, elle flotte au dessus des paves), scenes sans sol a droite (sol 1,0 :
 * Fete des lanternes, Pavillon d'or, Port d'hiver, Pavillon de l'armure) et scenes en miroir (lib/v2/espace/miroir.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageSourcePropType } from 'react-native';
import type { SceneId } from '@/lib/v2/espace';
import { guerrierImage, packById, packDisplayName, packImage, parsePersonnage } from '@/lib/v2/dojo/personnages';

export type MondeVitrine = 'japon' | 'hors_japon';

export type Vitrine = {
  scene: SceneId;
  /** cle du personnage (meme format que l'espace : 'spartiate_h.peau_foncee', 'daimyo_f', 'oni') */
  cle: string;
  genre: 'h' | 'f';
  monde: MondeVitrine;
  voile: number;
};

const v = (scene: string, cle: string, genre: 'h' | 'f', monde: MondeVitrine, voile: number): Vitrine => ({ scene: scene as SceneId, cle, genre, monde, voile });

/** Selection retenue apres la planche de controle, dans l'ordre de rotation */
export const VITRINES: Vitrine[] = [
  v('vie_spartiate', 'spartiate_h.peau_foncee', 'h', 'hors_japon', 0.74),
  v('samourai_cour', 'daimyo_f', 'f', 'japon', 0.74),
  v('vie_astronaute', 'astronaute_h.asie', 'h', 'hors_japon', 0.74),
  v('vie_surf', 'surf_f.peau_foncee', 'f', 'hors_japon', 0.73),
  v('remparts', 'guerrier_h', 'h', 'japon', 0.75),
  v('vie_viking', 'viking_f', 'f', 'hors_japon', 0.73),
  v('vie_pompier', 'pompier_h.peau_mate', 'h', 'hors_japon', 0.74),
  v('kyudojo', 'kyudo_f', 'f', 'japon', 0.55),
  v('vie_explorateur', 'explorateur_h.peau_foncee', 'h', 'hors_japon', 0.72),
  v('vie_ninja_moderne', 'ninja_moderne_f.asie', 'f', 'hors_japon', 0.57),
  v('samourai_forge_nuit', 'oni', 'h', 'japon', 0.4),
  v('vie_chevalier', 'chevalier_f.peau_mate', 'f', 'hors_japon', 0.74),
  v('vie_gladiateur', 'gladiateur_h', 'h', 'hors_japon', 0.74),
  v('nature_ville_nuit', 'boxe_f', 'f', 'hors_japon', 0.65),
  v('samourai_kenjutsu', 'sensei_h', 'h', 'japon', 0.55),
  v('vie_futuriste', 'futuriste_f.peau_foncee', 'f', 'hors_japon', 0.7),
  v('vie_pirate', 'pirate_h.peau_mate', 'h', 'hors_japon', 0.71),
  v('lanternes_sanctuaire', 'kitsune', 'f', 'japon', 0.46),
  v('vie_basket', 'basket_h.peau_foncee', 'h', 'hors_japon', 0.74),
  v('vie_motard', 'motard_f.asie', 'f', 'hors_japon', 0.71),
  v('montagne', 'dragon', 'h', 'japon', 0.73),
  v('vie_ski', 'ski_f', 'f', 'hors_japon', 0.74),
  v('nature_plage_couchant', 'course_h', 'h', 'hors_japon', 0.68),
  v('chateau', 'guerrier_f', 'f', 'japon', 0.75),
  v('classique_salle_nuit', 'musculation_h', 'h', 'hors_japon', 0.66),
  v('nature_foret', 'yoga_f', 'f', 'hors_japon', 0.74),
];

/** Voile sous le texte quand la scene n'a pas ete mesuree (ta propre scene) : sur au pire cas, un ciel blanc */
export const VOILE_SUR = 0.75;

/** Entrelace homme et femme, chacun dans son ordre, pour ne jamais montrer deux fois le meme genre de suite */
export function entrelacer(list: Vitrine[]): Vitrine[] {
  const h = list.filter((x) => x.genre === 'h');
  const f = list.filter((x) => x.genre === 'f');
  const out: Vitrine[] = [];
  for (let i = 0; i < Math.max(h.length, f.length); i += 1) {
    if (h[i]) out.push(h[i]);
    if (f[i]) out.push(f[i]);
  }
  return out;
}

/** La liste de rotation : tout le catalogue, ou seulement hors Japon pour l'univers Classique */
export function listeVitrines(classique: boolean): Vitrine[] {
  // garde fou : un personnage absent du catalogue (pack pas encore dessine dans cette version) ne s'affiche jamais
  const dispo = VITRINES.filter((x) => cleConnue(x.cle));
  return entrelacer(classique ? dispo.filter((x) => x.monde === 'hors_japon') : dispo);
}

const CLE_CURSEUR = 'yoroi_paywall_vitrine_v1';
let curseur: number | null = null;

// lu des le chargement du module (bien avant l'ouverture du paywall) ; sans valeur, depart au hasard
AsyncStorage.getItem(CLE_CURSEUR)
  .then((raw) => {
    const n = Number(raw);
    if (curseur === null && raw !== null && Number.isFinite(n) && n >= 0) curseur = Math.floor(n);
  })
  .catch(() => undefined);

/** La vitrine de cette ouverture, puis le curseur avance (garde entre deux lancements de l'app) */
export function prochaineVitrine(classique: boolean, hasard: () => number = Math.random): Vitrine {
  const liste = listeVitrines(classique);
  if (curseur === null) curseur = Math.floor(hasard() * liste.length);
  const choix = liste[((curseur % liste.length) + liste.length) % liste.length];
  curseur += 1;
  AsyncStorage.setItem(CLE_CURSEUR, String(curseur)).catch(() => undefined);
  return choix;
}

/** Pour les tests : remet le curseur a une valeur connue */
export function _fixerCurseur(n: number | null) {
  curseur = n;
}

/**
 * Image du personnage de la vitrine, a son plus beau niveau : le Guerrier au rang Shogun (dessin d'origine, sans la
 * silhouette de tes reglages), les Legendes et les packs sport au niveau 3, les packs Vie reelle dans leur teinte.
 */
export function imageVitrine(cle: string): ImageSourcePropType {
  const p = parsePersonnage(cle);
  if (p.kind === 'guerrier') return guerrierImage(p.gender, 4, null);
  if (p.kind === 'pack') {
    const niveau = p.pack.kind === 'legende' || p.pack.kind === 'sport' ? 3 : 1;
    return packImage(p.pack, p.gender, niveau, p.teinte ?? null);
  }
  return guerrierImage('h', 4, null);
}

/** Vrai si toutes les cles de la selection designent un vrai personnage (garde fou des tests) */
export function cleConnue(cle: string): boolean {
  const p = parsePersonnage(cle);
  if (p.kind === 'guerrier') return cle.startsWith('guerrier_');
  return p.kind === 'pack' && !!packById(p.pack.id);
}

/**
 * Defilement du bandeau (17 octobre 2026, Houari : « je voulais qu'elles défilent pour que l'utilisateur puisse voir ») :
 * le voile sous le texte reste FIXE pendant le defilement, a la valeur la plus forte de la liste (lisible sur toutes).
 */
export function voileMax(liste: Vitrine[]): number {
  return liste.reduce((m, x) => Math.max(m, x.voile), 0) || VOILE_SUR;
}

/** Le petit libelle du bandeau : ce que tu debloques (« Pack Astronautes », « Légende Kitsune », « Armure Shōgun ») */
export function libelleVitrine(v: Vitrine): string {
  const p = parsePersonnage(v.cle);
  if (p.kind !== 'pack') return 'Armure Shōgun';
  if (p.pack.kind === 'legende') return `Légende ${p.pack.name}`;
  if (p.pack.kind === 'monde') return `Monde samouraï, ${packDisplayName(p.pack, p.gender)}`;
  return `Pack ${p.pack.name}`;
}

/** Rang suivant ou precedent dans la liste, en boucle */
export function rangBoucle(n: number, total: number): number {
  if (total <= 0) return 0;
  return ((n % total) + total) % total;
}
