/**
 * La prise sur une meme machine (26 octobre 2026, retour utilisateur : « seated shoulder press, il y a plusieurs
 * prises, j'ai fait les deux, est-ce que ça travaille pareil ? »).
 * La prise choisie s'ajoute au nom de l'exercice : « Shoulder Press Machine (prise neutre) ». L'historique se lit
 * par nom (lib/v2/seance/history.ts, normName garde les parentheses) : chaque prise a donc sa propre progression,
 * ses propres charges et ses propres records, sans melanger les deux.
 * Code pur.
 */

export type Prise = 'neutre' | 'pronation' | 'supination' | 'large' | 'serree';

export const PRISES: { id: Prise; label: string; suffixe: string }[] = [
  { id: 'neutre', label: 'Neutre', suffixe: 'prise neutre' },
  { id: 'pronation', label: 'Pronation', suffixe: 'prise pronation' },
  { id: 'supination', label: 'Supination', suffixe: 'prise supination' },
  { id: 'large', label: 'Large', suffixe: 'prise large' },
  { id: 'serree', label: 'Serrée', suffixe: 'prise serrée' },
];

const MOTIF = / \((prise (?:neutre|pronation|supination|large|serrée))\)$/;

/** Le nom sans la prise, et la prise s'il y en a une */
export function sansPrise(nom: string): { base: string; prise: Prise | null } {
  const m = MOTIF.exec(nom ?? '');
  if (!m) return { base: nom, prise: null };
  const p = PRISES.find((x) => x.suffixe === m[1]);
  return { base: nom.slice(0, m.index), prise: p?.id ?? null };
}

/** Le nom avec cette prise (null : sans prise) ; une prise deja la est remplacee */
export function avecPrise(nom: string, prise: Prise | null): string {
  const { base } = sansPrise(nom);
  const p = prise ? PRISES.find((x) => x.id === prise) : null;
  return p ? `${base} (${p.suffixe})` : base;
}

/** Texte court montre au choix de la prise */
export const EXPLICATION_PRISE =
  'La prise change un peu l’accent, pas les muscles principaux. Sur un développé : la prise neutre ménage les épaules et sollicite un peu plus l’avant de l’épaule et les triceps ; la prise large en pronation charge un peu plus le côté de l’épaule. Faire les deux est une bonne idée. YOROI les compte comme deux exercices, pour suivre tes progrès sur chacune.';
