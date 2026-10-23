/**
 * Vague 45 : petites regles d'affichage du Dojo selon l'univers du personnage (lib/v2/dojo/univers.ts).
 * Rien ne change dans le moteur d'XP : on traduit seulement ce qui s'affiche (noms de rangs, badges,
 * textes des objectifs) pour que l'univers Classique ne montre jamais les rangs du Japon.
 */
import type { ImageSourcePropType } from 'react-native';
import { RANKS } from '@/lib/v2/armure';
import type { NextGoal } from '@/lib/v2/armure';
import type { Espace } from '@/lib/v2/espace';
import { rangNom, type Univers } from './univers';
import {
  CLASSIQUE_IMAGES,
  MONDE_PERSONNAGES,
  THEMES,
  THEME_IMAGES,
  aUnPersonnage,
  classiqueImage,
  guerrierImage,
  packDisplayName,
  packImage,
  parsePersonnage,
  themeCondition,
} from './personnages';
import type { Gender } from './personnages';
import { pieceDuRang } from './pieces';
import { SCENES_CLASSIQUE } from '@/lib/v2/espace/classique';

/** Vague 45 : univers de l'espace, 'japon' par defaut (anciens utilisateurs compris) */
export function universDe(espace: Pick<Espace, 'univers'> | null | undefined): Univers {
  return espace?.univers === 'classique' ? 'classique' : 'japon';
}

/** Vague 45 : remplace les noms de rangs du Japon par ceux de l'univers choisi dans un texte du moteur */
export function texteUnivers(texte: string, u: Univers): string {
  if (u === 'japon' || !texte) return texte;
  let out = texte;
  // du plus long au plus court, pour ne pas couper « Samouraï » en route
  RANKS.map((r) => ({ nom: r.name, i: r.index }))
    .sort((a, b) => b.nom.length - a.nom.length)
    .forEach(({ nom, i }) => {
      out = out.split(nom).join(rangNom(i, u));
    });
  // 18 octobre 2026 : les sceaux du journal (« Sceau Mont Fuji ») prennent leur nom Classique
  for (const n of Object.values(NOMS_SCEAUX_CLASSIQUE)) out = out.split(`Sceau ${n.japon}`).join(`Sceau ${n.classique}`);
  return out
    .replace(/ta première pièce d’armure/g, 'ta première pièce de tenue')
    .replace(/de ton armure/g, 'de ta tenue')
    .replace(/ton armure/g, 'ta tenue');
}

/**
 * 18 octobre 2026 : noms des sceaux en univers Classique, sans reference au Japon. Les dessins restent les memes,
 * le nom decrit ce qu'on voit. L'identifiant, l'XP et la date du sceau ne changent pas.
 * 18 octobre (soir) : dessins neutres pour ces 8 sceaux (assets/avatars/app/sceaux/classique/, SealMedal).
 */
export const NOMS_SCEAUX_CLASSIQUE: Record<string, { japon: string; classique: string }> = {
  fuji: { japon: 'Mont Fuji', classique: 'Sommet' },
  cerisier: { japon: 'Cerisier', classique: 'Arbre en fleur' },
  kimono: { japon: 'Kimono', classique: 'Tenue de combat' },
  katanas: { japon: 'Katanas', classique: 'Lames croisées' },
  kabuto: { japon: 'Kabuto', classique: 'Casque de boxe' },
  oni: { japon: 'Masque d’oni', classique: 'Trophée' },
  torii: { japon: 'Torii', classique: 'Clé' },
  lanterne_papier: { japon: 'Lanterne de papier', classique: 'Carnet' },
};

/** Nom d'un sceau dans l'univers choisi */
export function nomSceau(s: { id: string; name: string }, u: Univers): string {
  return u === 'classique' ? NOMS_SCEAUX_CLASSIQUE[s.id]?.classique ?? s.name : s.name;
}

/** Condition d'un sceau dans l'univers choisi (« Atteindre le rang Champion ») */
export function conditionSceau(condition: string, u: Univers): string {
  return texteUnivers(condition, u);
}

/** Vague 45 : un objectif du moteur, raconte dans l'univers choisi */
export function objectifUnivers(g: NextGoal, u: Univers): NextGoal {
  return { ...g, title: texteUnivers(g.title, u), detail: texteUnivers(g.detail, u) };
}

export type BadgeVitrine = { texte: string; ton: 'premium' | 'offert' | 'rang' };

/** Vague 45 : badge discret d'une scene (Offert, Premium ou Rang X, texte court pour les vignettes de 132 points), d'apres themeCondition */
export function badgeScene(t: (typeof THEMES)[number], u: Univers): BadgeVitrine {
  const cond = themeCondition(t);
  if (cond === null) return { texte: 'Offert', ton: 'offert' };
  if (t.annual) return { texte: 'Premium', ton: 'premium' };
  if (t.unlockRank !== undefined) return { texte: `Rang ${rangNom(t.unlockRank, u)}`, ton: 'rang' };
  return { texte: 'Premium', ton: 'premium' };
}

/** Vague 45 : badge d'un personnage du monde samourai (offert ou gagne au rang, comme mondeCondition) */
export function badgeMonde(unlockRank: number | undefined, u: Univers): BadgeVitrine {
  const r = unlockRank ?? 0;
  return r <= 0 ? { texte: 'Offert', ton: 'offert' } : { texte: `Rang ${rangNom(r, u)}`, ton: 'rang' };
}

export type Vignette = {
  key: string;
  nom: string;
  image: ImageSourcePropType;
  /** 'figure' : personnage detoure sur un fond pastel ; 'scene' : image pleine */
  genre: 'figure' | 'scene';
  fond?: string;
  badge: BadgeVitrine;
};

const SCENES_VITRINE = ['jardin', 'pont', 'sakura', 'chateau', 'festival'] as const;
const MONDE_VITRINE = ['ronin_errant', 'ninja', 'daimyo'] as const;

/**
 * Vague 45 : les vignettes du petit carrousel de la boutique dans le Dojo (4 a 6 vraies images).
 * Japon : des figures du monde samourai puis des scenes. Classique : le personnage Classique puis les scenes.
 * Sans personnage : les scenes seules.
 */
export function vignettesBoutique(u: Univers, personnageKey: string | null | undefined, rankIndex: number): Vignette[] {
  const gender: Gender = parsePersonnage(personnageKey).gender;
  const scene = (id: (typeof SCENES_VITRINE)[number]): Vignette | null => {
    const t = THEMES.find((x) => x.id === id);
    if (!t) return null;
    return { key: `scene_${id}`, nom: t.name, image: THEME_IMAGES[t.id], genre: 'scene', badge: badgeScene(t, u) };
  };
  // vague 47 : en Classique, les scenes Classique (salle, parc, ville, mer), pas les scenes du Japon
  const scenes =
    u === 'classique'
      ? SCENES_CLASSIQUE.filter((x) => x.id.endsWith('_jour')).map((x) => ({ key: `scene_${x.id}`, nom: x.nom, image: x.image, genre: 'scene' as const, badge: x.offerte ? ({ texte: 'Offert', ton: 'offert' } as BadgeVitrine) : ({ texte: 'Premium', ton: 'premium' } as BadgeVitrine) }))
      : SCENES_VITRINE.map(scene).filter((v): v is Vignette => !!v);

  if (!aUnPersonnage(personnageKey)) return scenes.slice(0, 5);

  if (u === 'classique') {
    const prochain = Math.max(0, Math.min(4, rankIndex + 1));
    const figure: Vignette = {
      key: 'classique',
      nom: gender === 'f' ? 'La Sportive' : 'Le Sportif',
      image: CLASSIQUE_IMAGES[gender][prochain] ?? classiqueImage(gender, prochain),
      genre: 'figure',
      fond: '#E3E9F3',
      badge: { texte: 'Offert', ton: 'offert' },
    };
    return [figure, ...scenes.slice(0, 4)];
  }

  const figures: Vignette[] = MONDE_VITRINE.map((id) => MONDE_PERSONNAGES.find((p) => p.id === id))
    .filter((p): p is (typeof MONDE_PERSONNAGES)[number] => !!p)
    .map((p) => ({ key: `monde_${p.id}`, nom: packDisplayName(p, gender), image: packImage(p, gender), genre: 'figure' as const, fond: p.fond, badge: badgeMonde(p.unlockRank, u) }));
  return [...figures, ...scenes.slice(1, 3)];
}

/**
 * Vague 45 : image d'un rang dans le chemin des rangs. Guerrier ou Classique : la figure du personnage a ce rang.
 * Sans personnage : la piece du rang (pieceDuRang), jamais une figure. Autres personnages : la figure de l'univers.
 */
export function imageDuRang(personnageKey: string | null | undefined, index: number, u: Univers): { image: ImageSourcePropType | null; piece: boolean } {
  const p = parsePersonnage(personnageKey);
  // le premier rang n'a pas de piece a gagner (c'est le depart) : pas d'image, l'ecran montre son numero
  if (p.kind === 'aucun') return { image: index >= 1 ? pieceDuRang(index, u).image : null, piece: true };
  if (p.kind === 'classique' || (p.kind !== 'guerrier' && u === 'classique')) return { image: classiqueImage(p.gender, index), piece: false };
  return { image: guerrierImage(p.gender, index), piece: false };
}
