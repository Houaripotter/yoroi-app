/**
 * Enregistre une pesee importee depuis les photos d'une balance (source « Balance (photo) »).
 * Sans doublon : la pesee deja notee ce jour-la (a la main, ou une photo precedente) est completee.
 * Poids dans la courbe, composition dans la table weights, segments et morphologie dans leurs colonnes,
 * toutes les autres mesures de la balance dans la colonne JSON scale_extras.
 * Rien n'est envoye nulle part : tout reste sur le telephone.
 */
import { getProfile, getWeights, openDatabase, updateWeightScaleExtras, updateWeightScaleJson } from '@/lib/database';
import type { Weight } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { mergeScaleJson, parseScaleJson, PHOTO_SOURCE, toColumns } from './format';
import type { ParseResult, ScaleAutre } from './format';
import { existingAutres, existingValues, measureOfDay, measurePart, pickSameDayRow, planBlock, weightPart } from './multi';
import type { MeasureDay } from './multi';
import { loadMeasures, saveMeasures } from '@/lib/v2/progres/measures';
import { brutesDesAutres, brutesDuBloc } from '@/lib/v2/mesures/sac';
import { ajouterMesuresBrutes } from '@/lib/v2/mesures/stockage';
import { enregistrerContextes } from '@/lib/v2/mesures/contextePesee';
import type { NouveauContexte } from '@/lib/v2/mesures/contextePesee';
import { depuisAutres, enregistrerMensurationsPlus } from '@/lib/v2/mesures/mensurationsPlus';
import { enregistrerBiomarqueurs } from '@/lib/v2/mesures/biomarqueurs';
import { ageA, enregistrerPlis } from '@/lib/v2/mesures/plis';
import { biomarqueursDepuisAutres, mesurePlisDepuisAutres, separerAutres } from './rangement';

export type PhotoSaveResult =
  | { ok: true; weight: number; updated: boolean; date: string; replaced?: { weight: number; source?: string } }
  | { ok: false; reason: 'no_weight' };

/** Le poids deja note ce jour-la, pour une photo sans l'ecran du poids (la pesee que l'import completerait) */
export function sameDayWeight(rows: Weight[], date: string): number | undefined {
  const day = String(date).slice(0, 10);
  const w = pickSameDayRow(rows.filter((r) => Number(r.weight) > 0), day);
  return w ? Number(w.weight) : undefined;
}

/** NUIT 14 : les colonnes de la pesee du jour reprises dans la nouvelle pesee de la balance (rien ne se perd) */
const CARRY_COLUMNS = ['fat_percent', 'muscle_percent', 'water_percent', 'bone_mass', 'visceral_fat', 'metabolic_age', 'bmr'] as const;

export async function saveScalePhoto(date: string, values: Record<string, number | undefined>, autres?: ScaleAutre[]): Promise<PhotoSaveResult> {
  const day = String(date).slice(0, 10);
  let rows: Weight[] = [];
  try {
    rows = (await getWeights()) ?? [];
  } catch (err) {
    logger.warn('[Balance photo] lecture des pesees impossible', err);
  }
  const same = rows.filter((w) => String(w.date).slice(0, 10) === day);
  const { cols, extras, json } = toColumns(values, sameDayWeight(same, day), autres);
  const weight = cols.weight;
  if (!weight) return { ok: false, reason: 'no_weight' };

  let row = pickSameDayRow(same, day, weight);
  // NUIT 14 : la balance fait foi. Un poids de la balance different de la pesee deja notee ce jour-la
  // (a la main, Apple Sante...) ne la modifie pas : une nouvelle pesee « Balance (photo) » est creee, c'est
  // elle que la courbe montre (la plus recente du jour), l'ancienne reste dans l'historique. Modifier une pesee
  // d'Apple Sante la ferait revenir a la synchronisation suivante.
  let replaced: { weight: number; source?: string } | undefined;
  const scaleWeight = typeof values.poids_kg === 'number' && values.poids_kg > 0 ? values.poids_kg : undefined;
  if (row?.id && scaleWeight && row.source !== PHOTO_SOURCE && Math.abs(Number(row.weight) - scaleWeight) >= 0.05) {
    replaced = { weight: Number(row.weight), source: row.source };
    for (const k of CARRY_COLUMNS) {
      const old = Number(row[k]);
      if (cols[k] === undefined && Number.isFinite(old) && old > 0) cols[k] = old;
    }
    for (const k of Object.keys(extras) as (keyof typeof extras)[]) {
      const old = Number(row[k]);
      if (extras[k] === undefined && Number.isFinite(old) && old > 0) extras[k] = old;
    }
  }
  const base = row;
  if (replaced) row = undefined;

  const database = await openDatabase();
  let id: number | undefined;
  if (row?.id) {
    const sets: string[] = [];
    const params: (number | string)[] = [];
    for (const [k, v] of Object.entries(cols)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        sets.push(`${k} = ?`);
        params.push(v);
      }
    }
    // une pesee notee a la main devient la pesee de la balance ; une pesee d'Apple Sante garde sa source.
    // NUIT 14 : seulement si le poids vient de la balance. Avant, un poids garde (91,8 saisi a la main)
    // etait relabellise « balance (photo) » : l'historique faisait croire que la balance avait lu 91,8.
    if ((row.source ?? 'manual') === 'manual' && scaleWeight) {
      sets.push('source = ?');
      params.push(PHOTO_SOURCE);
    }
    if (sets.length) {
      params.push(row.id);
      await database.runAsync(`UPDATE weights SET ${sets.join(', ')} WHERE id = ?`, params);
    }
    id = row.id;
  } else {
    const res = await database.runAsync(
      `INSERT INTO weights (weight, fat_percent, muscle_percent, water_percent, bone_mass,
       visceral_fat, metabolic_age, bmr, note, source, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        weight,
        cols.fat_percent ?? null,
        cols.muscle_percent ?? null,
        cols.water_percent ?? null,
        cols.bone_mass ?? null,
        cols.visceral_fat ?? null,
        cols.metabolic_age ?? null,
        cols.bmr ?? null,
        null,
        PHOTO_SOURCE,
        day,
      ],
    );
    id = res?.lastInsertRowId || undefined;
  }
  if (id) await updateWeightScaleExtras(id, extras);
  // BALANCE 2 : les autres mesures de la balance (colonne JSON scale_extras), completees sans rien perdre
  if (id && json) {
    const merged = mergeScaleJson(base?.id ? parseScaleJson(base.scale_extras) : undefined, json);
    if (merged) await updateWeightScaleJson(id, JSON.stringify(merged));
  } else if (id && replaced && base?.scale_extras) {
    const old = parseScaleJson(base.scale_extras);
    if (old) await updateWeightScaleJson(id, JSON.stringify(old));
  }

  // Widget du poids : seulement si c'est la pesee la plus recente. Sans attendre ni bloquer.
  if (rows.every((w) => String(w.date).slice(0, 10) <= day)) {
    import('@/lib/widgetData')
      .then(({ updateWidgetWeight }) => updateWidgetWeight(weight))
      .catch((e) => logger.info('[Balance photo] widget du poids non mis a jour', e));
  }
  return { ok: true, weight, updated: !!row?.id, date: day, ...(replaced ? { replaced } : {}) };
}

// ---------- IMPORT MULTI : une date de l'apercu, fusionnee sans rien ecraser ----------

/** AV : ce qui a vraiment ete enregistre, pour le dire a l'ecran (« 3 mensurations, 2 biomarqueurs ») */
export type Ranges = {
  /** mensurations de la table measurements */
  mensurations: number;
  /** poignet, cheville, genou, fessiers, taille la plus etroite, biceps contracte */
  mensurationsPlus: number;
  biomarqueurs: number;
  /** une mesure de plis complete (7 plis, ou 3) */
  plis: number;
  /** plis lus mais methode incomplete : gardes dans le sac seulement */
  plisIncomplets: number;
  /** heure, appareil, moment ou a jeun gardes avec la pesee */
  contexte: boolean;
  /** mesures ajoutees au sac */
  sac: number;
};

export type BlockSaveResult =
  | { ok: true; written: number; same: number; kept: number; weight?: number; measures: boolean; nothingNew: boolean; date: string; replaced?: { weight: number; source?: string }; ranges: Ranges }
  | { ok: false; reason: 'no_weight' };

/**
 * Enregistre une date : le poids et la composition dans la pesee du jour (completee, jamais en double),
 * les mensurations dans la table measurements a la meme date. Une valeur deja saisie n'est remplacee que
 * si sa cle est dans replace. Coller deux fois le meme texte n'ecrit rien de plus.
 * AQ (1er novembre 2026) : `bloc`, le bloc lu, garde dans le sac des mesures (lib/v2/mesures/) tout ce que les
 * colonnes ne gardent pas : heure, appareil, cote et segment, textes, valeurs hors plage, deuxieme pesee du jour.
 * Des mesures en plus sans aucun poids ce jour-la ne bloquent plus l'enregistrement : elles vont dans le sac.
 * AT : l'heure et l'appareil vont aussi dans le contexte des pesees (lib/v2/mesures/contextePesee.ts), et les
 * mensurations en plus (poignet, cheville, genou...) dans lib/v2/mesures/mensurationsPlus.ts.
 */
export async function saveImportBlock(
  date: string,
  values: Record<string, number | undefined>,
  autres: ScaleAutre[],
  replace: Set<string>,
  bloc?: ParseResult,
): Promise<BlockSaveResult> {
  const day = String(date).slice(0, 10);
  let rows: Weight[] = [];
  let measures: MeasureDay[] = [];
  try {
    rows = (await getWeights()) ?? [];
  } catch (err) {
    logger.warn('[Import multi] lecture des pesees impossible', err);
  }
  try {
    measures = (await loadMeasures()) as MeasureDay[];
  } catch (err) {
    logger.warn('[Import multi] lecture des mensurations impossible', err);
  }
  const row = pickSameDayRow(rows, day, values.poids_kg);
  const existing = existingValues(row, measureOfDay(measures, day));
  // AV : mensurations en plus, biomarqueurs et plis vont dans leurs propres listes, jamais dans la pesee
  const parRang = separerAutres(autres);
  const rangees = [...parRang.mensuration_plus, ...parRang.biomarqueur, ...parRang.pli];
  const plan = planBlock(values, parRang.pesee, existing, existingAutres(row), replace);
  const forWeight = weightPart(plan.write);
  // la masse grasse en % gardee ne doit pas etre recalculee depuis les kilos
  if (forWeight.graisse_kg && !forWeight.graisse_pct && existing.graisse_pct) forWeight.graisse_pct = existing.graisse_pct;
  const forMeasures = measurePart(plan.write);
  const needsWeight = Object.keys(forWeight).length > 0 || plan.autres.length > 0;
  const weight = forWeight.poids_kg ?? values.poids_kg ?? sameDayWeight(rows, day);
  // rien n'est ecrit si le poids manque : pas de pesee a moitie enregistree.
  // AQ : seulement des mesures en plus (tour de poignet, tension...) sans poids ce jour-la : pas de pesee, elles vont dans le sac
  const autresSeules = Object.keys(forWeight).length === 0 && plan.autres.length > 0;
  if (needsWeight && !weight && !autresSeules) return { ok: false, reason: 'no_weight' };
  const enPesee = needsWeight && !!weight;

  if (Object.keys(forMeasures).length) {
    await saveMeasures(day, forMeasures);
  }
  let saved: number | undefined;
  let replaced: { weight: number; source?: string } | undefined;
  if (enPesee) {
    const res = await saveScalePhoto(day, forWeight, plan.autres);
    if (!res.ok) return res;
    saved = res.weight;
    replaced = res.replaced;
  }
  const ranges: Ranges = { mensurations: Object.keys(forMeasures).length, mensurationsPlus: 0, biomarqueurs: 0, plis: 0, plisIncomplets: 0, contexte: false, sac: 0 };
  let changeAilleurs = false;
  // AQ : le sac des mesures, jamais bloquant
  try {
    const sac = bloc
      ? brutesDuBloc(bloc, { date: day, gardees: autres, enregistrees: Object.keys(values), dansPesee: enPesee, rangees: rangees.map((a) => a.nom) })
      : !enPesee && plan.autres.length
        ? brutesDesAutres(plan.autres, day)
        : [];
    ranges.sac = await ajouterMesuresBrutes(sac);
  } catch (err) {
    logger.warn('[Import multi] sac des mesures non complete', err);
  }
  // AT (1er novembre 2026) : heure et appareil de la pesee, deuxieme pesee du jour. Jamais bloquant.
  // AV : avec le moment et a jeun lus sur la photo.
  if (bloc) {
    try {
      const ctx: NouveauContexte[] = [];
      // seulement une pesee de ce bloc : l'heure d'un bilan sanguin n'est pas celle de la pesee du jour
      const poidsCtx = saved;
      const aContexte = !!(bloc.heure || bloc.appareil || bloc.moment || bloc.aJeun !== undefined);
      if (poidsCtx && aContexte) ctx.push({ date: day, poids: poidsCtx, heure: bloc.heure ?? null, appareil: bloc.appareil ?? null, moment: bloc.moment ?? null, aJeun: bloc.aJeun ?? null, origine: 'ia_balance' });
      for (const d of bloc.doublons ?? []) {
        if (d.key === 'poids_kg' && d.heure) ctx.push({ date: day, poids: d.value, heure: d.heure, appareil: bloc.appareil ?? null, moment: 'autre', seule: true, origine: 'ia_balance' });
      }
      if (ctx.length && (await enregistrerContextes(ctx))) {
        ranges.contexte = true;
        changeAilleurs = true;
      }
    } catch (err) {
      logger.warn('[Import multi] contexte non enregistre', err);
    }
  }
  // AV : les valeurs cochees et corrigees (pas celles lues), chacune dans sa liste. Jamais bloquant.
  try {
    const plus = depuisAutres(parRang.mensuration_plus, day);
    ranges.mensurationsPlus = plus.length;
    if (plus.length && (await enregistrerMensurationsPlus(plus))) changeAilleurs = true;
  } catch (err) {
    logger.warn('[Import multi] mensurations en plus non enregistrees', err);
  }
  try {
    const bio = biomarqueursDepuisAutres(parRang.biomarqueur, day, bloc?.heure ?? null);
    ranges.biomarqueurs = bio.length;
    if (bio.length && (await enregistrerBiomarqueurs(bio))) changeAilleurs = true;
  } catch (err) {
    logger.warn('[Import multi] biomarqueurs non enregistres', err);
  }
  if (parRang.pli.length) {
    try {
      const p = await getProfile().catch(() => null);
      const sexe = p?.avatar_gender === 'femme' ? 'femme' : p?.avatar_gender === 'homme' ? 'homme' : null;
      const age = ageA(p?.birth_date, day) ?? (p?.age && p.age > 10 ? p.age : null);
      const m = mesurePlisDepuisAutres(parRang.pli, day, sexe, age);
      if (m) {
        ranges.plis = 1;
        if (await enregistrerPlis(m)) changeAilleurs = true;
      } else ranges.plisIncomplets = parRang.pli.length;
    } catch (err) {
      logger.warn('[Import multi] plis non enregistres', err);
    }
  }
  const written = Object.keys(plan.write).length + plan.autres.length;
  return {
    ok: true,
    written,
    same: plan.same.length + plan.autresSame,
    kept: plan.kept.length + plan.autresKept,
    weight: saved,
    measures: Object.keys(forMeasures).length > 0,
    nothingNew: written === 0 && !changeAilleurs,
    date: day,
    ...(replaced ? { replaced } : {}),
    ranges,
  };
}
