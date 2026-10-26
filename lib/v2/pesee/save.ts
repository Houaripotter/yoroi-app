/**
 * Enregistrement d'une pesee v2, sans doublon :
 * une pesee deja presente ce jour-la (saisie ou importee d'Apple Sante) est completee, pas recopiee.
 * Une pesee saisie a la main est aussi recopiee dans Apple Sante (ou Health Connect) si YOROI
 * a deja le droit d'y ecrire. La lecture ignore ensuite ce que YOROI a ecrit : pas de doublon.
 */
import { addWeight, getWeights, updateWeight, updateWeightScaleExtras, updateWeightScaleJson, upsertWeight } from '@/lib/database';
import type { Weight } from '@/lib/database';
import { addBodyComposition } from '@/lib/bodyComposition';
import { healthConnect } from '@/lib/healthConnect';
import { logger } from '@/lib/security/logger';
import { getSanteSource } from '@/lib/v2/sante/data';
import { mergeScaleJson, parseScaleJson } from '@/lib/v2/balance/format';
import type { ScaleExtras, ScaleJson } from '@/lib/v2/balance/format';
import type { CompoValues } from './fields';
import type { HealthDay } from './health';

export type WeighInInput = {
  date: string;
  weight: number;
  compo: CompoValues;
  /** pesee a corriger (parametre id, ou pesee deja enregistree ce jour-la) */
  rowId?: number | null;
  /** pesee d'Apple Sante du meme jour, pour ranger la bonne source */
  health?: HealthDay | null;
  /** mesures en plus de la balance (masse maigre, IMC...), rangees comme l'import photo */
  scale?: { extras?: ScaleExtras; json?: ScaleJson };
};

function columns(weight: number, compo: CompoValues) {
  return {
    fat_percent: compo.fat,
    muscle_percent: compo.muscleKg && weight ? Math.round((compo.muscleKg / weight) * 1000) / 10 : undefined,
    water_percent: compo.water,
    bone_mass: compo.bone,
    visceral_fat: compo.visceral,
    metabolic_age: compo.metabolicAge,
    bmr: compo.bmr,
  };
}

type HealthWriter = {
  canWriteBodyMeasures?: () => Promise<{ weight: boolean; bodyFat: boolean }>;
  writeWeight?: (weight: number, unit?: 'kg' | 'lbs', day?: string) => Promise<boolean>;
  writeBodyFat?: (percentage: number, day?: string) => Promise<boolean>;
};

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

/**
 * Recopie une pesee manuelle dans Apple Sante : seulement si la sante est branchee dans YOROI
 * et si l'ecriture est deja autorisee. Aucune fenetre d'autorisation, aucune erreur remontee.
 */
async function pushManualToHealth(day: string, weight: number, fat?: number): Promise<void> {
  try {
    const svc = healthConnect as unknown as HealthWriter;
    if (typeof svc.canWriteBodyMeasures !== 'function') return;
    const src = await withTimeout(getSanteSource(), 8000);
    if (!src || src.mode !== 'live') return;
    const can = await withTimeout(svc.canWriteBodyMeasures(), 5000);
    if (!can) return;
    if (can.weight && typeof svc.writeWeight === 'function' && weight > 20 && weight < 400) {
      await withTimeout(svc.writeWeight(weight, 'kg', day), 10000);
    }
    if (can.bodyFat && typeof svc.writeBodyFat === 'function' && fat && fat > 2 && fat < 70) {
      await withTimeout(svc.writeBodyFat(fat, day), 10000);
    }
  } catch (e) {
    logger.info('[Pesee v2] recopie vers la sante ignoree', e);
  }
}

export async function saveWeighIn(input: WeighInInput, history: Weight[]): Promise<void> {
  const cols = columns(input.weight, input.compo);
  const row = input.rowId ? history.find((w) => w.id === input.rowId) : undefined;
  const fromScale = !!(input.health?.weight && Math.abs(input.health.weight - input.weight) < 0.05);
  const source = input.rowId ? row?.source ?? 'manual' : fromScale && input.health ? input.health.sourceKey : 'manual';
  let inserted = false;
  let savedId: number | undefined = input.rowId ?? undefined;
  if (input.rowId) {
    // updateWeight remplace toutes les colonnes : on garde la note existante
    await updateWeight(input.rowId, { weight: input.weight, date: input.date, note: row?.note, ...cols });
  } else {
    const res = await upsertWeight({
      weight: input.weight,
      date: input.date,
      source,
      ...cols,
    });
    inserted = res?.action === 'inserted';
    savedId = res?.id;
  }

  // Mesures en plus de la balance : colonnes et JSON scale_extras, completes sans rien perdre (comme l'import photo)
  if (savedId && input.scale) {
    try {
      if (input.scale.extras) await updateWeightScaleExtras(savedId, input.scale.extras);
      if (input.scale.json) {
        const before = history.find((w) => w.id === savedId);
        const merged = mergeScaleJson(parseScaleJson(before?.scale_extras), input.scale.json);
        if (merged) await updateWeightScaleJson(savedId, JSON.stringify(merged));
      }
    } catch (err) {
      logger.error('[Pesee v2] mesures en plus de la balance non enregistrees', err);
    }
  }

  // Recopie vers Apple Sante : nouvelle pesee saisie a la main uniquement (jamais une pesee de la balance,
  // jamais une correction, pour ne pas empiler les echantillons). Sans attendre : l'enregistrement local est fait.
  if (inserted && source === 'manual') {
    void pushManualToHealth(String(input.date).slice(0, 10), input.weight, input.compo.fat);
  }

  // Widget Android du poids : seulement si c'est la pesee la plus recente. Sans attendre ni bloquer.
  const day = String(input.date).slice(0, 10);
  const newest = history.every((w) => w.id === input.rowId || String(w.date).slice(0, 10) <= day);
  if (newest) {
    import('@/lib/widgetData')
      .then(({ updateWidgetWeight }) => updateWidgetWeight(input.weight))
      .catch((e) => logger.info('[Pesee v2] widget du poids non mis a jour', e));
  }

  // Copie dans l'ancien format composition, lu par quelques ecrans pas encore refaits.
  // Elle n'ecrit plus rien dans Apple Sante : la recopie ci-dessus s'en charge une seule fois.
  const c = input.compo;
  if (source === 'manual' && (c.fat || c.muscleKg || c.water || c.bone || c.visceral || c.bmr || c.metabolicAge)) {
    try {
      await addBodyComposition(
        {
          date: input.date,
          weight: input.weight,
          bodyFatPercent: c.fat ?? 0,
          muscleMass: c.muscleKg ?? 0,
          boneMass: c.bone ?? 0,
          waterPercent: c.water ?? 0,
          visceralFat: c.visceral ?? 0,
          metabolicAge: c.metabolicAge,
          bmr: c.bmr,
          source: 'manual',
        },
        { skipHealthWrite: true },
      );
    } catch (err) {
      logger.error('Copie de la composition (ancien format) impossible', err);
    }
  }
}

/** Importe une pesee d'Apple Sante telle quelle (poids et masse grasse), sans doublon quelle que soit la source */
export async function importHealthDay(day: HealthDay): Promise<void> {
  if (!day.weight) return;
  try {
    const rows = await getWeights(400);
    const dup = rows.some((w) => String(w.date).slice(0, 10) === day.date && Math.abs(Number(w.weight) - Number(day.weight)) < 0.05);
    if (dup) return;
  } catch {
    // lecture impossible : addWeight ecarte deja le doublon de meme source
  }
  await addWeight({
    weight: day.weight,
    date: day.date,
    source: day.sourceKey,
    fat_percent: day.fat,
  });
}
