/**
 * Lecture des sources uniques v2 pour le contexte de l'Apple Watch (contexte.ts fait le calcul).
 * Chaque lecture est protegee : une source illisible donne une valeur vide, jamais un chiffre invente.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCompetitions, getProfile, getTrainings, getWeights } from '@/lib/database';
import type { Training } from '@/lib/database';
import { getUserSettings } from '@/lib/storage';
import { getSportName } from '@/lib/sports';
import { DEFAULT_ESPACE, getEspace, objectifVise } from '@/lib/v2/espace';
import { dedupeTrainings } from '@/lib/v2/seances/dedupe';
import { loadHydration, localISO } from '@/lib/v2/accueil/hydration';
import { toDailySeries } from '@/lib/v2/weightStats';
import type { MemoTorii } from '@/lib/v2/pesee/ligneDirectrice';
import { COMBAT_PRESETS, COMBAT_SETTINGS_KEY, PREPA_SECONDS, loadClapEnabled } from '@/lib/v2/carnet/chrono';
import type { CombatPreset } from '@/lib/v2/carnet/chrono';
import type { ChronoMontre, SourcesContexte } from './contexte';
import { kgDeCategorie } from './contexte';

/** meme cle que lib/v2/pesee/usePlanPoids.ts (date du torii gardee par la carte Poids) */
const TORII_KEY = 'yoroi_torii_v1';
/** meme cle que app/timer.tsx (dernier chrono lance) */
const DERNIER_CHRONO_KEY = 'yoroi_chrono_dernier_v1';
/** seconde d'alerte avant la fin du round (claquette du chrono de l'app) */
const ALERTE_S = 10;

async function sur<T>(p: Promise<T> | (() => Promise<T>), repli: T): Promise<T> {
  try {
    return await (typeof p === 'function' ? p() : p);
  } catch {
    return repli;
  }
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Tes rounds enregistres dans le chrono de l'app, et ton dernier Tabata */
async function lireChronos(): Promise<ChronoMontre[]> {
  const out: ChronoMontre[] = [];
  const clap = await sur(loadClapEnabled(), true);
  const alerteS = clap ? ALERTE_S : 0;
  const reglages = await sur(AsyncStorage.getItem(COMBAT_SETTINGS_KEY), null);
  if (reglages) {
    try {
      const s = JSON.parse(reglages);
      const rounds = num(s?.totalRounds);
      const roundS = num(s?.roundDuration);
      const reposS = num(s?.restDuration);
      const prepaS = num(s?.prepa) ?? PREPA_SECONDS;
      if (rounds && rounds > 0 && roundS && roundS > 0 && reposS != null) {
        const preset = COMBAT_PRESETS[s?.preset as CombatPreset];
        const tel = preset && s.preset !== 'custom' && preset.rounds === rounds && preset.roundTime === roundS && preset.restTime === reposS;
        out.push({ id: 'tes_rounds', nom: tel ? preset.name : 'Tes rounds', rounds, roundS, reposS, prepaS, alerteS });
      }
    } catch {
      // reglages illisibles : la montre garde ses chronos par defaut
    }
  }
  const dernier = await sur(AsyncStorage.getItem(DERNIER_CHRONO_KEY), null);
  if (dernier) {
    try {
      const d = JSON.parse(dernier);
      const r = d?.r ?? {};
      if (d?.mode === 'tabata') {
        const tours = (num(r.tabataRounds) ?? 0) * (num(r.tabataSets) ?? 1);
        const work = num(r.tabataWork);
        const rest = num(r.tabataRest);
        if (tours > 0 && work && work > 0 && rest != null) {
          out.push({ id: 'ton_tabata', nom: 'Ton Tabata', rounds: tours, roundS: work, reposS: rest, prepaS: num(r.prepa) ?? PREPA_SECONDS, alerteS: 0 });
        }
      }
    } catch {
      // ignore
    }
  }
  return out;
}

/** Tes sports : ceux de Ton espace, sinon ceux que tu pratiques le plus (60 derniers jours) */
function sportsDe(favoris: string[], trainings: Training[], today: string): { id: string; nom: string }[] {
  let ids = favoris.filter((s) => typeof s === 'string' && s);
  if (ids.length === 0) {
    const depuis = new Date(`${today}T12:00:00`);
    depuis.setDate(depuis.getDate() - 60);
    const lim = localISO(depuis);
    const compte = new Map<string, number>();
    for (const t of trainings) if (t.sport && t.date.slice(0, 10) >= lim) compte.set(t.sport, (compte.get(t.sport) ?? 0) + 1);
    ids = [...compte.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }
  return [...new Set(ids)].slice(0, 8).map((id) => ({ id, nom: getSportName(id) || id }));
}

export async function lireSourcesContexte(): Promise<SourcesContexte> {
  const today = localISO();
  const [weights, profil, settings, espace, trainings, hydration, memoRaw, chronos, comps] = await Promise.all([
    sur(() => getWeights(), []),
    sur(() => getProfile(), null),
    sur(() => getUserSettings(), null),
    sur(() => getEspace(), DEFAULT_ESPACE),
    sur(() => getTrainings().then((l) => dedupeTrainings(l ?? [])), [] as Training[]),
    sur(() => loadHydration(), null),
    sur(AsyncStorage.getItem(TORII_KEY), null),
    sur(lireChronos(), [] as ChronoMontre[]),
    sur(() => getCompetitions(), []),
  ]);
  let memo: MemoTorii | null = null;
  try {
    const m = memoRaw ? JSON.parse(memoRaw) : null;
    memo = m && typeof m.date === 'string' && typeof m.cle === 'string' ? m : null;
  } catch {
    memo = null;
  }
  const prochaine = (comps ?? [])
    .filter((c) => c?.date && c.date.slice(0, 10) >= today && c.statut !== 'termine')
    .sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const objectif = objectifVise(espace);
  return {
    aujourdhui: today,
    genere: new Date().toISOString(),
    profil: profil ?? null,
    unite: settings?.weight_unit === 'lbs' ? 'lb' : 'kg',
    sports: sportsDe(espace?.sportsFavoris ?? [], trainings, today),
    series: toDailySeries((weights ?? []).filter((w) => w && w.weight > 0)),
    memoTorii: memo,
    seances: trainings.map((t) => t.date),
    objectifSemaine: objectif > 0 ? objectif : null,
    eau: { litres: hydration?.amount ?? 0, objectifLitres: hydration?.goal ?? null },
    chronos,
    competition: prochaine ? { date: prochaine.date.slice(0, 10), categorieKg: kgDeCategorie(prochaine.poids_max, prochaine.categorie_poids) } : null,
  };
}
