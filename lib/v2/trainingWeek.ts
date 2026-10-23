/**
 * Regroupement des seances par semaine (lundi au dimanche) pour les ecrans v2.
 */
import type { Training } from '@/lib/database';
import { devNow } from '@/lib/v2/creator/devClock';
import { versUnitePoids, type UnitePoids } from '@/lib/v2/unitePoids';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Jour courant (AAAA-MM-JJ) ; suit l'horloge de test du Studio en mode createur seulement */
export function todayLocalIso(): string {
  const d = devNow();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function mondayOf(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function durationOf(t: Training): number {
  return t.duration_minutes ?? t.duration ?? 0;
}

export function formatDuration(min: number): string {
  if (!min) return '';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

// ============================================================
// Series et tonnage : SOURCE UNIQUE (vague 32)
// Accueil, Seances, Progres, fin de seance, detail d'une seance, partage et Dojo (sceaux de force)
// passent tous par ces fonctions. Regle :
//  - seules les series terminees comptent : une seance enregistree ne garde que les series validees (setsData) ;
//  - les echauffements (type 'warmup') sont exclus ;
//  - tonnage = somme, serie par serie, de la charge multipliee par les repetitions ;
//  - la charge est le poids ajoute (barre, halteres, machine, lest) : au poids du corps sans lest elle vaut 0,
//    la serie compte comme serie mais pas dans le tonnage ; avec un lest, seul le lest compte ;
//  - anciennes seances sans detail par serie : nombre de series x repetitions x charge ;
//  - affichage : « 850 kg » sous 1 000 kg, puis en tonnes avec une decimale, « 3,2 t ».
// ============================================================

export type SetLike = { weight?: number | string; reps?: number | string; type?: string };
export type ExerciseLike = { name?: string; sets?: number; reps?: number; weight?: number; muscle_group?: string; setsData?: SetLike[] };
export type WorkSet = { weight: number; reps: number };

/** Exercices d'une seance, qu'ils soient stockes en tableau ou en texte JSON */
export function exercisesOf(t: Training | null | undefined): ExerciseLike[] {
  const raw = t?.exercises as unknown;
  let list: unknown = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      list = [];
    }
  }
  return Array.isArray(list) ? (list as ExerciseLike[]).filter((e) => !!e && typeof e === 'object') : [];
}

/** Series de travail d'un exercice (echauffements exclus) */
export function workSetsOf(e: ExerciseLike): WorkSet[] {
  if (Array.isArray(e.setsData) && e.setsData.length > 0) {
    return e.setsData.filter((s) => !!s && s.type !== 'warmup').map((s) => ({ weight: Math.max(0, Number(s.weight) || 0), reps: Math.max(0, Number(s.reps) || 0) }));
  }
  const n = Math.max(0, Math.floor(Number(e.sets) || 0));
  const one = { weight: Math.max(0, Number(e.weight) || 0), reps: Math.max(0, Number(e.reps) || 0) };
  if (n === 0) return one.weight > 0 || one.reps > 0 ? [one] : [];
  return Array.from({ length: n }, () => ({ ...one }));
}

/** Tonnage d'une liste de series : charge x repetitions, charge nulle (poids du corps) exclue */
export function tonnageOfSets(sets: WorkSet[]): number {
  return sets.reduce((s, x) => s + (x.weight > 0 && x.reps > 0 ? x.weight * x.reps : 0), 0);
}

/** Tonnage d'un exercice */
export function exerciseTonnage(e: ExerciseLike): number {
  return tonnageOfSets(workSetsOf(e));
}

/** Tonnage d'une seance, en kg */
export function tonnage(t: Training): number {
  return exercisesOf(t).reduce((s, e) => s + exerciseTonnage(e), 0);
}

/** Nombre de series de travail d'une seance */
export function setsCount(t: Training): number {
  return exercisesOf(t).reduce((s, e) => s + workSetsOf(e).length, 0);
}

/** « 850 kg » ou « 3,2 t » : valeur et unite separees */
export function tonnageParts(kg: number, unite: UnitePoids = 'kg'): { value: string; unit: string } {
  const v = Math.max(0, kg || 0);
  // 18 octobre 2026 : en livres, le total en livres entieres (« 27 558 lb »), jamais en tonnes
  if (unite === 'lb') return { value: String(Math.round(versUnitePoids(v, 'lb'))).replace(/\B(?=(\d{3})+(?!\d))/g, ' '), unit: 'lb' };
  if (v >= 1000) return { value: (Math.round(v / 100) / 10).toFixed(1).replace('.', DECIMAL), unit: 't' };
  return { value: String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '), unit: 'kg' };
}

/** « soulevés » (kilos) ou « soulevées » (tonnes, livres) */
export function accordSouleve(kg: number, unite: UnitePoids = 'kg'): string {
  return unite === 'lb' || kg >= 1000 ? traduire('soulevées') : traduire('soulevés');
}

/** « 850 kg » ou « 3,2 t » */
export function formatTonnage(kg: number, unite: UnitePoids = 'kg'): string {
  const p = tonnageParts(kg, unite);
  return `${p.value} ${p.unit}`;
}

// ============================================================
// Periode « semaine » : SOURCE UNIQUE (vague 32)
// Partout dans l'app, « cette semaine » = la semaine calendaire, du lundi a aujourd'hui (jamais les 7 derniers jours).
// ============================================================

/** Seances de la semaine en cours, du lundi a aujourd'hui */
export function trainingsThisWeek(trainings: Training[], today: string = todayLocalIso()): Training[] {
  const monday = mondayOf(today);
  return trainings.filter((t) => {
    const d = (t?.date || '').slice(0, 10);
    return d >= monday && d <= today;
  });
}

export type WeekGroup = { monday: string; title: string; count: number; minutes: number; items: Training[] };

export function groupByWeek(trainings: Training[], today: string = todayLocalIso()): WeekGroup[] {
  const thisMonday = mondayOf(today);
  const lastMonday = (() => {
    const d = new Date(thisMonday + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  })();
  const map = new Map<string, Training[]>();
  [...trainings]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.start_time ?? '').localeCompare(a.start_time ?? '')))
    .forEach((t) => {
      const k = mondayOf(t.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(t);
    });
  const months = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];
  return Array.from(map.entries()).map(([monday, items]) => {
    const d = new Date(monday + 'T12:00:00');
    const title = monday === thisMonday ? traduire('Cette semaine') : monday === lastMonday ? traduire('Semaine dernière') : traduire("Semaine du {0} {1}", d.getDate(), months[d.getMonth()]);
    return { monday, title, count: items.length, minutes: items.reduce((s, t) => s + durationOf(t), 0), items };
  });
}
