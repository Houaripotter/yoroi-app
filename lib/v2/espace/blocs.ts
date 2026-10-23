/**
 * Les blocs de l'accueil.
 * Le haut de l'accueil est fixe (poids, semaine, prochain entrainement) : ces trois blocs
 * ne sont plus reglables. Les anciens choix enregistres les contiennent encore :
 * on les filtre a la lecture, sans toucher au stockage.
 * Vague 15 : la citation du jour n'est plus un bloc d'accueil (elle n'aide pas au suivi du poids
 * et des seances) ; elle reste dans les rappels de notifications et sur l'ecran /citations.
 */
import type { AccueilBloc } from '@/lib/v2/espace';

export type BlocMeta = { id: AccueilBloc; label: string; sub: string; icon: string };

/** Toujours en haut de l'accueil, dans la carte Aujourd'hui et le prochain entrainement */
export const FIXED_BLOCS: AccueilBloc[] = ['poids', 'semaine', 'prochaine_seance'];

const ALL_BLOCS: BlocMeta[] = [
  { id: 'poids', label: 'Ton poids', sub: 'Ta courbe sur 30 jours', icon: 'scale' },
  { id: 'semaine', label: 'Ta semaine', sub: 'Tes séances de la semaine', icon: 'calendar' },
  { id: 'prochaine_seance', label: 'Prochaine séance', sub: 'Ce qui est prévu', icon: 'dumbbell' },
  { id: 'mensurations', label: 'Mensurations', sub: 'Ton tour de taille et tes mesures', icon: 'ruler' },
  { id: 'hydratation', label: 'Hydratation', sub: 'Ton eau du jour, en un geste', icon: 'drop' },
  { id: 'sommeil', label: 'Sommeil', sub: 'Ta dernière nuit', icon: 'moon' },
  { id: 'forme', label: 'Ta récupération', sub: 'Ton score du jour, sur 100', icon: 'pulse' },
  { id: 'records', label: 'Tes records', sub: 'Ton dernier record', icon: 'trophy' },
  { id: 'competition', label: 'Prochaine compétition', sub: 'Le compte à rebours', icon: 'swords' },
];

/** Les blocs que l'utilisateur peut ajouter, retirer et ordonner sous le haut fixe */
export const BLOCS: BlocMeta[] = ALL_BLOCS.filter((b) => !FIXED_BLOCS.includes(b.id));

/** Garde seulement les blocs reglables, sans doublon, dans l'ordre enregistre */
export function adjustableBlocs(list: AccueilBloc[] | undefined | null): AccueilBloc[] {
  return Array.from(new Set(list ?? [])).filter((b) => !FIXED_BLOCS.includes(b) && ALL_BLOCS.some((m) => m.id === b));
}

export function blocMeta(id: AccueilBloc): BlocMeta {
  return ALL_BLOCS.find((b) => b.id === id) ?? BLOCS[0];
}
