/**
 * Ornements japonais illustres (vague 15) : 14 images 512 x 512 transparentes.
 * Table unique de require() statiques, a utiliser partout a la place des anciens kanji decoratifs.
 */
import type { ImageSourcePropType } from 'react-native';

export const ORNEMENTS = {
  torii: require('@/assets/avatars/app/ornements/torii.webp'),
  lanterne: require('@/assets/avatars/app/ornements/lanterne.webp'),
  eventail: require('@/assets/avatars/app/ornements/eventail.webp'),
  sakura: require('@/assets/avatars/app/ornements/sakura.webp'),
  vague: require('@/assets/avatars/app/ornements/vague.webp'),
  fuji: require('@/assets/avatars/app/ornements/fuji.webp'),
  koi: require('@/assets/avatars/app/ornements/koi.webp'),
  katanas: require('@/assets/avatars/app/ornements/katanas.webp'),
  kabuto: require('@/assets/avatars/app/ornements/kabuto.webp'),
  bonsai: require('@/assets/avatars/app/ornements/bonsai.webp'),
  chrono: require('@/assets/avatars/app/ornements/chrono.webp'),
  carnet: require('@/assets/avatars/app/ornements/carnet.webp'),
  cible: require('@/assets/avatars/app/ornements/cible.webp'),
  combat: require('@/assets/avatars/app/ornements/combat.webp'),
} satisfies Record<string, ImageSourcePropType>;

export type OrnementKey = keyof typeof ORNEMENTS;

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Regles de choix par mots du contexte, la premiere qui correspond gagne */
const REGLES: { mots: string[]; o: OrnementKey }[] = [
  { mots: ['sommeil', 'dormi', 'nuit', 'sieste', 'repos'], o: 'lanterne' },
  { mots: [' eau', "d'eau", 'd\u2019eau', 'hydrat', 'boire'], o: 'vague' },
  { mots: ['record', 'sommet', 'meilleur'], o: 'fuji' },
  { mots: ['objectif', 'but ', 'cible', 'defi'], o: 'cible' },
  { mots: ['combat', 'sparring', 'adversaire', 'partenaire', 'competition', 'tournoi', 'match', 'palmares', 'round'], o: 'katanas' },
  { mots: ['carnet', 'technique', ' notes', 'journal', 'apprend'], o: 'carnet' },
  { mots: ['chrono', 'minuteur', 'timer'], o: 'chrono' },
  { mots: ['blessure', 'douleur', 'infirmerie', 'soin', 'sante', 'forme', 'recuperation'], o: 'koi' },
  { mots: ['poids', 'pesee', 'mesure', 'progres', 'evolution', 'courbe', 'composition', 'tendance', 'photo'], o: 'bonsai' },
  { mots: ['repas', 'nutrition', 'jeune', 'calorie', 'manger'], o: 'eventail' },
  { mots: ['seance', 'entrainement', 'programme', 'exercice', 'muscu', 'semaine', 'planning'], o: 'kabuto' },
];

/** Ornement adapte au contexte d'un texte (titre et phrase d'un etat vide), torii par defaut */
export function ornementPour(...textes: (string | undefined)[]): OrnementKey {
  const t = ` ${sansAccents(textes.filter(Boolean).join(' '))} `;
  for (const r of REGLES) if (r.mots.some((m) => t.includes(m))) return r.o;
  return 'torii';
}
