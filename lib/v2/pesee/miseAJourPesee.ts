/**
 * Modifier une pesee sans rien perdre (28 octobre 2026, audit « ne jamais perdre de donnees »).
 *
 * Avant : updateWeight reecrivait TOUTES les colonnes. Corriger seulement la masse grasse d'une pesee
 * (ecran des mesures du corps) remettait a vide le muscle, l'eau, l'os, la graisse viscerale,
 * l'age metabolique, le metabolisme et la note de cette pesee.
 * Maintenant : seules les colonnes PRESENTES dans la modification sont ecrites. Une colonne presente
 * avec une valeur vide (undefined ou null) est videe, c'est voulu (l'ecran de pesee efface un champ vide).
 * Le poids et la date ne sont jamais vides : une valeur vide les laisse tels quels.
 *
 * Doublons : seules deux pesees du meme jour, de la meme source ET du meme poids sont des doublons.
 * Avant, deux pesees differentes du meme jour (matin et soir) etaient fusionnees et celle du soir supprimee.
 */

export const COLONNES_MODIFIABLES = [
  'fat_percent', 'muscle_percent', 'water_percent', 'bone_mass',
  'visceral_fat', 'metabolic_age', 'bmr', 'note',
] as const;

export type ModifPesee = Partial<Record<(typeof COLONNES_MODIFIABLES)[number] | 'weight' | 'date', unknown>>;

const vide = (v: unknown) => v === undefined || v === null || v === '';

/** La requete UPDATE pour une pesee, ou null s'il n'y a rien a changer */
export function requeteMiseAJourPesee(id: number, data: ModifPesee): { sql: string; values: (string | number | null)[] } | null {
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  const has = (k: string) => Object.prototype.hasOwnProperty.call(data, k);
  if (has('weight') && !vide(data.weight)) {
    sets.push('weight = ?');
    values.push(Number(data.weight));
  }
  for (const k of COLONNES_MODIFIABLES) {
    if (!has(k)) continue;
    sets.push(`${k} = ?`);
    const v = data[k];
    values.push(vide(v) ? null : (typeof v === 'number' ? v : String(v)));
  }
  if (has('date') && !vide(data.date)) {
    sets.push('date = ?');
    values.push(String(data.date));
  }
  if (!sets.length) return null;
  values.push(id);
  return { sql: `UPDATE weights SET ${sets.join(', ')} WHERE id = ?`, values };
}

export type LignePesee = { id: number; date: string; source?: string | null; weight: number | null } & Record<string, unknown>;

const COLONNES_FUSION = ['fat_percent', 'muscle_percent', 'water_percent', 'bone_mass', 'visceral_fat', 'metabolic_age', 'bmr', 'note'];

/**
 * Groupes de vrais doublons : meme jour (date telle que rangee), meme source, poids a moins de 50 g.
 * Chaque groupe garde la plus ancienne ligne (id le plus bas), completee par les valeurs des autres.
 */
export function groupesDoublonsPesees(rows: LignePesee[]): Array<{ garder: LignePesee; fusion: Record<string, unknown>; supprimer: number[] }> {
  const parCle = new Map<string, LignePesee[][]>();
  const tri = [...rows].sort((a, b) => Number(a.id) - Number(b.id));
  for (const r of tri) {
    const cle = `${r.date}|${r.source || 'manual'}`;
    const groupes = parCle.get(cle) ?? [];
    const g = groupes.find((x) => Math.abs(Number(x[0].weight) - Number(r.weight)) < 0.05);
    if (g) g.push(r);
    else groupes.push([r]);
    parCle.set(cle, groupes);
  }
  const out: Array<{ garder: LignePesee; fusion: Record<string, unknown>; supprimer: number[] }> = [];
  for (const groupes of parCle.values()) {
    for (const g of groupes) {
      if (g.length < 2) continue;
      const fusion: Record<string, unknown> = {};
      for (const col of COLONNES_FUSION) {
        if (!vide(g[0][col])) continue;
        const v = g.slice(1).map((r) => r[col]).find((x) => !vide(x));
        if (v !== undefined) fusion[col] = v;
      }
      out.push({ garder: g[0], fusion, supprimer: g.slice(1).map((r) => r.id) });
    }
  }
  return out;
}

/**
 * upsertWeight : quelle pesee existante completer (28 octobre 2026, lib/v2/pesee/poidsDuJour.ts).
 * - saisie a la main : seulement le VRAI doublon (meme jour, meme poids a 50 g pres, ex. le meme fichier
 *   recolle) ; une deuxieme pesee du jour avec un autre poids est une NOUVELLE pesee, jamais un remplacement ;
 * - imports (Apple Sante, Health Connect, balance...) : comme avant, meme jour et meme source.
 */
export function requetePeseeExistante(data: { date: string; source?: string | null; weight?: number | null }): { sql: string; values: (string | number)[] } {
  const source = data.source || 'manual';
  if (source === 'manual') {
    return {
      sql: 'SELECT id FROM weights WHERE date = ? AND source = ? AND ABS(weight - ?) < 0.05 ORDER BY id ASC LIMIT 1',
      values: [data.date, source, Number(data.weight) || 0],
    };
  }
  return { sql: 'SELECT id FROM weights WHERE date = ? AND source = ? LIMIT 1', values: [data.date, source] };
}
