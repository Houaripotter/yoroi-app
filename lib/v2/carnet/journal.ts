/**
 * Logique du carnet technique (refonte v2) : mise en forme des records, statistiques
 * des records et des techniques, filtres. Les donnees viennent de lib/carnetService.
 */
import {
  BENCHMARK_CATEGORIES,
  SKILL_CATEGORIES,
  calculatePace,
  formatForceEntry,
  formatValue,
  getBenchmarkLast,
  getBenchmarkPR,
} from '@/lib/carnetService';
import type { Benchmark, BenchmarkCategory, BenchmarkEntry, Skill, SkillCategory, SkillStatus } from '@/lib/carnetService';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

export type JournalTab =
  | 'records' | 'techniques' | 'videos' | 'combat' | 'competitions' | 'positions' | 'submissions'
  | 'sorties' | 'allures' | 'wods' | 'stations' | 'voies' | 'seances_muscu' | 'muscles' | 'progression';

export type GlobalFilter = 'all' | 'musculation' | 'running' | 'jjb' | 'boxe' | 'lutte' | 'grappling' | 'autre';

export const GLOBAL_FILTERS: { key: GlobalFilter; label: string }[] = [
  { key: 'all', label: traduire('Tout') },
  { key: 'musculation', label: 'Musculation' },
  { key: 'running', label: 'Course' },
  { key: 'jjb', label: 'JJB' },
  { key: 'boxe', label: 'Boxe' },
  { key: 'lutte', label: 'Lutte' },
  { key: 'grappling', label: 'Grappling' },
  { key: 'autre', label: 'Autre' },
];

export const STATUS_LABEL: Record<SkillStatus, string> = { to_learn: traduire('À apprendre'), in_progress: 'En cours', mastered: traduire('Maîtrisée') };

/** Couleur de la palette v2 pour une categorie de record */
export function categoryTone(cat: BenchmarkCategory | string): string {
  if (cat === 'force' || cat === 'musculation') return '#6E8C3A';
  if (cat === 'running' || cat === 'trail' || cat === 'cardio' || cat === 'hyrox') return '#3D5D9E';
  if (cat === 'street_workout' || cat === 'bodyweight') return '#A8832F';
  return '#454A58';
}

export function categoryLabel(cat: BenchmarkCategory | string): string {
  return BENCHMARK_CATEGORIES[cat as BenchmarkCategory]?.label ?? 'Autre';
}

export function skillCategoryLabel(cat: SkillCategory | string): string {
  const raw = SKILL_CATEGORIES[cat as SkillCategory]?.label ?? 'Autre';
  return raw.replace(' - ', ', ');
}

export function skillTone(cat: SkillCategory | string): string {
  if (String(cat).startsWith('jjb_')) return '#2C4A84';
  if (cat === 'lutte') return '#A8832F';
  if (cat === 'striking') return '#6E8C3A';
  return '#454A58';
}

export function isWeightCategory(cat: string): boolean {
  return cat === 'force' || cat === 'musculation';
}

/** Ancien filigrane des cartes : plus aucune ecriture japonaise affichee (vague 15), garde pour compatibilite */
export function categoryKanji(cat: string): string {
  if (cat === 'force' || cat === 'musculation') return '';
  if (cat === 'running' || cat === 'trail') return '';
  if (cat === 'cardio' || cat === 'hyrox') return '';
  if (cat === 'street_workout' || cat === 'bodyweight') return '';
  return '';
}

/** Ecriture lisible d'une entree ("100 kg x 5", "10 km en 5:12/km"...) */
/** vague 45 : toujours la virgule francaise (« 99,3 kg »), une decimale au plus */
export function nombreFr(n: number): string {
  return String(Math.round(n * 10) / 10).replace('.', DECIMAL);
}

export function entryText(b: Benchmark, e: BenchmarkEntry | null): string {
  if (!e) return '--';
  // vague 45 (Houari : « 15,6 x 15.6 reps », « 99.3 kg ») : virgule francaise, repetitions entieres ;
  // en repetitions (tractions), la valeur EST le nombre de repetitions : « 16 reps », jamais « 15,6 x 15.6 reps »
  if (b.unit === 'reps') return `${Math.round(e.value)} reps`;
  if (['force', 'musculation', 'street_workout'].includes(b.category) || b.unit === 'kg' || b.unit === 'lbs') {
    if (b.unit === 'kg' || b.unit === 'lbs') {
      const reps = e.reps && e.reps > 0 ? Math.round(e.reps) : 0;
      return reps ? `${nombreFr(e.value)} ${b.unit} x ${reps} reps` : `${nombreFr(e.value)} ${b.unit}`;
    }
    return clean(formatForceEntry(e.value, b.unit, e.reps)).replace(/(\d)\.(\d)/g, '$1,$2');
  }
  if (['running', 'trail', 'hyrox'].includes(b.category)) {
    const distKm = e.distance ?? (b.unit === 'km' ? e.value : null);
    const timeS = b.unit === 'time' ? e.value : e.duration ? e.duration * 60 : null;
    if (distKm && timeS) return `${nombreFr(distKm)} km, ${calculatePace(timeS, distKm)} /km`;
    if (distKm) return `${nombreFr(distKm)} km`;
  }
  return b.unit === 'time' ? formatValue(e.value, b.unit) : formatValue(e.value, b.unit).replace(/(\d)\.(\d)/g, '$1,$2');
}

/** formatForceEntry ecrit REPS en capitales : on remet en casse de phrase */
function clean(s: string): string {
  return s.replace(/ REPS/g, ' reps').replace(/ × /g, ' x ');
}

export function entryPace(b: Benchmark, e: BenchmarkEntry): string | null {
  if (!['running', 'trail', 'hyrox', 'cardio'].includes(b.category)) return null;
  if (e.pace) return e.pace;
  const dist = e.distance ?? (b.unit === 'km' ? e.value : null);
  if (dist && dist > 0) {
    const timeS = b.unit === 'time' ? e.value : e.duration ? e.duration * 60 : null;
    if (timeS) return calculatePace(timeS, dist);
  }
  return null;
}

export function sortedEntries(b: Benchmark): BenchmarkEntry[] {
  return [...(b.entries || [])].sort((a, z) => new Date(z.date).getTime() - new Date(a.date).getTime());
}

export function trendOf(b: Benchmark): 'up' | 'down' | null {
  const s = sortedEntries(b);
  if (s.length < 2) return null;
  const better = b.unit === 'time' ? s[0].value < s[1].value : s[0].value > s[1].value;
  const worse = b.unit === 'time' ? s[0].value > s[1].value : s[0].value < s[1].value;
  return better ? 'up' : worse ? 'down' : null;
}

export function lastIsPR(b: Benchmark): boolean {
  const pr = getBenchmarkPR(b);
  const last = getBenchmarkLast(b);
  return !!pr && !!last && last.value === pr.value;
}

export function matchesFilter(f: GlobalFilter, bCat: BenchmarkCategory | null, sCat: SkillCategory | null): boolean {
  if (f === 'all') return true;
  if (f === 'musculation') return bCat === 'force' || bCat === 'bodyweight' || bCat === 'musculation';
  if (f === 'running') return bCat === 'running' || bCat === 'trail' || bCat === 'hyrox';
  if (f === 'jjb') return sCat?.startsWith('jjb_') ?? false;
  if (f === 'boxe') return sCat === 'striking';
  if (f === 'lutte') return sCat === 'lutte';
  if (f === 'grappling') return sCat === 'lutte' || (sCat?.startsWith('jjb_') ?? false);
  if (f === 'autre') return bCat === 'custom' || sCat === 'other';
  return true;
}

export const CATEGORY_ORDER = ['Force', 'Musculation', 'Street Workout', 'Cardio Appareils', 'Running', 'Trail', 'Hyrox', 'Autre'];

export function recordsStats(withEntries: Benchmark[]) {
  if (withEntries.length === 0) return { categories: 0, lastPR: null as null | { name: string; date: string; text: string }, mostActive: null as null | { name: string; entries: number }, recentMonth: 0 };
  const cats = new Set<string>();
  let lastPR: { name: string; date: string; text: string } | null = null;
  let mostActive: { name: string; entries: number } | null = null;
  let recentMonth = 0;
  const monthAgo = Date.now() - 30 * 86400000;
  for (const b of withEntries) {
    if (b.category) cats.add(b.category);
    const entries = b.entries || [];
    for (const e of entries) {
      const t = new Date(e.date).getTime();
      if (isFinite(t) && t >= monthAgo) recentMonth++;
    }
    if (!mostActive || entries.length > mostActive.entries) mostActive = { name: b.name, entries: entries.length };
    const recent = sortedEntries(b)[0];
    if (recent && (!lastPR || new Date(recent.date).getTime() > new Date(lastPR.date).getTime())) {
      lastPR = { name: b.name, date: recent.date, text: entryText(b, recent) };
    }
  }
  return { categories: cats.size, lastPR, mostActive, recentMonth };
}

export function skillsStats(skills: Skill[]) {
  const inProgress = skills.filter((s) => s.status === 'in_progress').length;
  const toLearn = skills.filter((s) => s.status === 'to_learn').length;
  const mastered = skills.filter((s) => s.status === 'mastered').length;
  const total = skills.length;
  const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const suggestion = skills.filter((s) => s.status === 'in_progress').sort((a, b) => (a.drillCount || 0) - (b.drillCount || 0))[0] || null;
  const topDrilled = [...skills].sort((a, b) => (b.drillCount || 0) - (a.drillCount || 0))[0] || null;
  const recentMastered = skills.filter((s) => s.status === 'mastered').sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] || null;
  return { inProgress, toLearn, mastered, total, masteryPct, suggestion, topDrilled, recentMastered };
}

/** Tabs autorises par pack */
export function tabsForPack(pack: string): JournalTab[] {
  const universal: JournalTab[] = ['records', 'techniques', 'videos'];
  if (pack === 'combat') return [...universal, 'combat', 'competitions', 'positions', 'submissions'];
  if (pack === 'endurance') return [...universal, 'sorties', 'allures', 'competitions'];
  if (pack === 'force') return [...universal, 'wods', 'stations', 'competitions'];
  if (pack === 'musculation') return [...universal, 'seances_muscu', 'muscles', 'progression'];
  if (pack === 'nature') return [...universal, 'voies', 'competitions'];
  return universal;
}

export function tabLabel(tab: JournalTab, pack: string): string {
  const map: Record<JournalTab, string> = {
    records: 'Records',
    techniques: 'Techniques',
    videos: traduire('Vidéos'),
    combat: 'Sparring',
    competitions: pack === 'endurance' ? 'Courses' : traduire('Compétitions'),
    positions: 'Positions',
    submissions: 'Soumissions',
    sorties: 'Sorties',
    allures: 'Allures',
    wods: 'WODs',
    stations: 'Stations',
    voies: 'Voies',
    seances_muscu: traduire('Séances'),
    muscles: 'Muscles',
    progression: traduire('Progression'),
  };
  return map[tab];
}
