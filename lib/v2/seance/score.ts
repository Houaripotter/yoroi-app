/**
 * Score des sports collectifs et de raquette (17 octobre 2026) : deux colonnes dediees (score_for, score_against).
 * Les seances d'avant gardaient le score dans la note (« Score : 3 à 1 ») : on le relit de la note pour la
 * modification, et la ligne est retiree de la note a l'enregistrement, pour ne jamais l'avoir en double.
 */
const LIGNE = /^\s*Score\s*:\s*(\d{1,3})\s*à\s*(\d{1,3})\s*$/im;

export type Score = { pour: number; contre: number };

/** Le score ecrit dans une ancienne note, ou null */
export function scoreDansNote(note?: string | null): Score | null {
  const m = LIGNE.exec(String(note ?? ''));
  return m ? { pour: Number(m[1]), contre: Number(m[2]) } : null;
}

/** La note sans la ligne de score */
export function noteSansScore(note?: string | null): string {
  return String(note ?? '')
    .split('\n')
    .filter((l) => !LIGNE.test(l))
    .join('\n')
    .trim();
}

/** Score d'une seance enregistree : les colonnes d'abord, sinon l'ancienne note */
export function scoreDeSeance(t: { score_for?: number | null; score_against?: number | null; notes?: string | null }): Score | null {
  if (t.score_for != null || t.score_against != null) return { pour: t.score_for ?? 0, contre: t.score_against ?? 0 };
  return scoreDansNote(t.notes);
}
