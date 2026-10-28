/**
 * Defile de l'ecran « Ravi de te connaitre » (14 octobre 2026) : homme et femme dans plusieurs tenues,
 * seulement des images qui existent deja (lib/v2/dojo/personnages.ts), toutes en 600 x 800 detourees,
 * affichees en contain : rien n'est coupe. Dessin classique (pas de silhouette pendant l'onboarding).
 * 17 octobre 2026 (revue de l'onboarding) : des personnes de toutes origines. Entre les tenues du Japon et du
 * sport, les personnages Vie reelle avec leurs variantes de teinte (lib/v2/dojo/packsTeintes.ts) : peau foncee,
 * peau mate, Asie. Une variante pas encore dessinee n'apparait pas.
 */
import type { ImageSourcePropType } from 'react-native';
import { CLASSIQUE_IMAGES, GUERRIER_IMAGES, VIE_PERSONNAGES, packById, packImage } from '@/lib/v2/dojo/personnages';
import { imageTeinte, type VarianteTeinte } from '@/lib/v2/dojo/packsTeintes';

export type Tenue = { nom: string; image: ImageSourcePropType };

function pack(id: string, g: 'h' | 'f', nom: string): Tenue[] {
  const p = packById(id);
  return p ? [{ nom, image: packImage(p, g, 1) }] : [];
}

/** Un personnage Vie reelle dans une teinte, avec son nom selon le genre ; rien si la variante manque */
function vie(id: string, g: 'h' | 'f', teinte: VarianteTeinte): Tenue[] {
  const p = VIE_PERSONNAGES.find((x) => x.id === id);
  if (!p) return [];
  const image = imageTeinte(id, teinte, g);
  return image !== undefined ? [{ nom: p.names?.[g] ?? p.name, image }] : [];
}

function serie(g: 'h' | 'f'): Tenue[] {
  const G = GUERRIER_IMAGES[g];
  const C = CLASSIQUE_IMAGES[g];
  // 28 octobre 2026 (Houari) : on commence par le sport, le kimono arrive plus loin (7e position)
  return [
    { nom: 'Sport', image: C[1] },
    ...vie('basket', g, 'asie'),
    ...pack('musculation', g, 'Salle'),
    ...vie('pompier', g, 'peau_foncee'),
    ...pack('boxe', g, 'Boxe'),
    ...vie('soignant', g, 'peau_mate'),
    { nom: 'Kimono', image: G[0] },
    { nom: 'Samouraï', image: G[2] },
    ...vie('foot', g, 'peau_foncee'),
    ...pack('ninja', g, g === 'f' ? 'Kunoichi' : 'Ninja'),
    ...vie('escalade', g, 'peau_mate'),
    ...vie('militaire', g, 'asie'),
    ...pack('jjb', g, 'JJB'),
    ...vie('tennis', g, 'peau_foncee'),
    { nom: 'Rōnin', image: G[3] },
    ...vie('velo', g, 'asie'),
    { nom: 'Shōgun', image: G[4] },
  ].filter((t) => !!t.image);
}

export const DEFILE: Record<'h' | 'f', Tenue[]> = { h: serie('h'), f: serie('f') };

/** Intervalle entre deux changements : les deux cartes changent a tour de role, chacune toutes les 2,6 s */
export const DEFILE_PAS_MS = 1300;
