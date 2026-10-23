/**
 * Calcul d'une nuit de sommeil avec les regles de l'app Sante d'Apple (16 octobre 2026).
 *
 * Regles appliquees, une par une :
 * 1. Une seule source par nuit : la plus prioritaire qui a du sommeil (Apple Watch, puis iPhone, puis les apps).
 *    Apple n'additionne jamais deux sources qui se chevauchent.
 * 2. Dans cette source, les echantillons qui se chevauchent (doublons, phase precise posee sur « endormi »)
 *    ne comptent qu'une fois : chaque seconde recoit une seule phase.
 * 3. La nuit va du debut du premier echantillon de sommeil a la fin du dernier.
 *    Les eveils ne comptent qu'entre ces deux bornes. « Au lit » (inBed) est un autre type, jamais compte en eveil.
 * 4. Tout est additionne en millisecondes, puis arrondi une seule fois a la minute, phase par phase et pour le total.
 * 5. Les pourcentages sont calcules sur sommeil plus eveils, comme Apple (5, 25, 61, 9 pour la nuit du 14 octobre).
 * 6. Une nuit appartient au jour du reveil : une fin apres 18 h compte pour le lendemain.
 * 7. Le coeur, la respiration et la temperature sont pris du premier au dernier echantillon de sommeil de la nuit,
 *    sur la meme famille de source (la montre d'abord).
 */

/** Valeurs HKCategoryValueSleepAnalysis (inchangees depuis iOS 16, toujours les memes sous iOS 26 et 27) */
export const VALEUR_SOMMEIL = { auLit: 0, endormi: 1, eveil: 2, leger: 3, profond: 4, paradoxal: 5 } as const;

export type PhaseNuit = 'eveil' | 'paradoxal' | 'leger' | 'profond' | 'endormi';

export type EchantillonSommeil = {
  /** millisecondes depuis 1970 */
  debut: number;
  fin: number;
  valeur: number;
  source?: string;
  bundle?: string;
  appareil?: string;
};

export type SegmentNuit = { debut: number; fin: number; phase: PhaseNuit };

export type NuitCalculee = {
  /** jour du reveil, AAAA-MM-JJ, heure locale */
  cle: string;
  debut: number;
  fin: number;
  segments: SegmentNuit[];
  secondes: Record<PhaseNuit, number>;
  /** minutes arrondies une seule fois, phase par phase */
  minutes: Record<PhaseNuit, number>;
  /** temps de sommeil (profond + leger + paradoxal + endormi), arrondi une fois */
  totalMinutes: number;
  /** sommeil plus eveils */
  baseMinutes: number;
  pourcents: Record<PhaseNuit, number>;
  /** au lit : echantillons inBed qui touchent la nuit s'il y en a, sinon du coucher au reveil */
  auLitMinutes: number;
  efficacite: number;
  source: string;
  rang: number;
  /** toutes les sources vues pour cette nuit, la retenue en premier */
  sources: string[];
};

const PHASE_DE: Record<number, PhaseNuit | undefined> = { 1: 'endormi', 2: 'eveil', 3: 'leger', 4: 'profond', 5: 'paradoxal' };
/** dans une meme source, une phase precise l'emporte sur « endormi », qui l'emporte sur l'eveil */
const FORCE: Record<PhaseNuit, number> = { profond: 3, paradoxal: 3, leger: 3, endormi: 2, eveil: 1 };
const PHASES: PhaseNuit[] = ['eveil', 'paradoxal', 'leger', 'profond', 'endormi'];

const zero = (): Record<PhaseNuit, number> => ({ eveil: 0, paradoxal: 0, leger: 0, profond: 0, endormi: 0 });

/** 0 Apple Watch, 1 iPhone (app Sante), 2 app tierce */
export function rangSource(e: { source?: string; bundle?: string; appareil?: string }): number {
  const b = (e.bundle ?? '').toLowerCase();
  const s = (e.source ?? '').toLowerCase();
  const d = (e.appareil ?? '').toLowerCase();
  const apple = b.startsWith('com.apple.health') || b.startsWith('com.apple.');
  if (apple && (d.includes('watch') || s.includes('watch'))) return 0;
  if (!b && (d.includes('watch') || s.includes('watch'))) return 0;
  if (apple) return 1;
  return 2;
}

export function cleSource(e: { source?: string; bundle?: string; appareil?: string }): string {
  return `${rangSource(e)}|${e.bundle || e.source || 'inconnue'}`;
}

function cleLocale(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Jour de la nuit : le jour du reveil ; une fin apres 18 h compte pour le lendemain */
export function cleNuit(finMs: number): string {
  const d = new Date(finMs);
  if (d.getHours() >= 18) {
    const n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12);
    return cleLocale(n.getTime());
  }
  return cleLocale(finMs);
}

/** Une seule phase par instant dans une source : les doublons et chevauchements ne comptent qu'une fois */
function peindre(ech: EchantillonSommeil[]): SegmentNuit[] {
  const items = ech
    .map((e) => ({ debut: e.debut, fin: e.fin, phase: PHASE_DE[e.valeur] }))
    .filter((e): e is SegmentNuit => !!e.phase && e.fin > e.debut);
  if (!items.length) return [];
  const bornes = Array.from(new Set(items.flatMap((e) => [e.debut, e.fin]))).sort((a, b) => a - b);
  const out: SegmentNuit[] = [];
  for (let i = 0; i < bornes.length - 1; i++) {
    const a = bornes[i];
    const b = bornes[i + 1];
    let best: PhaseNuit | null = null;
    for (const it of items) {
      if (it.debut <= a && it.fin >= b && (!best || FORCE[it.phase] > FORCE[best])) best = it.phase;
    }
    if (!best) continue;
    const last = out[out.length - 1];
    if (last && last.phase === best && last.fin === a) last.fin = b;
    else out.push({ debut: a, fin: b, phase: best });
  }
  return out;
}

/** Calcule une nuit a partir de ses echantillons (toutes sources melangees, la priorite est faite ici) */
export function calculerNuit(echantillons: EchantillonSommeil[]): NuitCalculee | null {
  const parSource = new Map<string, EchantillonSommeil[]>();
  for (const e of echantillons) {
    if (e.valeur === VALEUR_SOMMEIL.auLit || !PHASE_DE[e.valeur] || !(e.fin > e.debut)) continue;
    const k = cleSource(e);
    if (!parSource.has(k)) parSource.set(k, []);
    parSource.get(k)!.push(e);
  }
  // sources avec du sommeil (pas seulement des eveils), triees par priorite puis par duree de sommeil
  const candidats = Array.from(parSource.entries())
    .map(([k, list]) => {
      const sommeil = list.filter((e) => e.valeur !== VALEUR_SOMMEIL.eveil).reduce((a, e) => a + (e.fin - e.debut), 0);
      return { k, list, rang: rangSource(list[0]), sommeil };
    })
    .filter((c) => c.sommeil > 0)
    .sort((a, b) => a.rang - b.rang || b.sommeil - a.sommeil || a.k.localeCompare(b.k));
  if (!candidats.length) return null;
  const choisi = candidats[0];

  const peint = peindre(choisi.list);
  const dorment = peint.filter((s) => s.phase !== 'eveil');
  if (!dorment.length) return null;
  const debut = dorment[0].debut;
  const fin = dorment[dorment.length - 1].fin;

  // eveils seulement entre le premier et le dernier sommeil
  const segments: SegmentNuit[] = [];
  for (const s of peint) {
    const a = Math.max(s.debut, debut);
    const b = Math.min(s.fin, fin);
    if (b > a) segments.push({ debut: a, fin: b, phase: s.phase });
  }

  const ms = zero();
  for (const s of segments) ms[s.phase] += s.fin - s.debut;
  const sommeilMs = ms.profond + ms.leger + ms.paradoxal + ms.endormi;
  const baseMs = sommeilMs + ms.eveil;
  const secondes = zero();
  const minutes = zero();
  const pourcents = zero();
  for (const p of PHASES) {
    secondes[p] = Math.round(ms[p] / 1000);
    minutes[p] = Math.round(ms[p] / 60000);
    pourcents[p] = baseMs > 0 ? Math.round((ms[p] / baseMs) * 100) : 0;
  }
  const totalMinutes = Math.round(sommeilMs / 60000);

  // au lit : union des echantillons inBed (toutes sources) qui touchent la nuit, sinon coucher a reveil
  const lits = echantillons
    .filter((e) => e.valeur === VALEUR_SOMMEIL.auLit && e.fin > debut && e.debut < fin)
    .sort((a, b) => a.debut - b.debut);
  let litMs = 0;
  if (lits.length) {
    let a = lits[0].debut;
    let b = lits[0].fin;
    for (const l of lits.slice(1)) {
      if (l.debut <= b) b = Math.max(b, l.fin);
      else {
        litMs += b - a;
        a = l.debut;
        b = l.fin;
      }
    }
    litMs += b - a;
    // la nuit ne peut pas etre plus longue que le temps au lit
    litMs = Math.max(litMs, fin - debut);
  } else {
    litMs = fin - debut;
  }
  const auLitMinutes = Math.round(litMs / 60000);
  const efficacite = litMs > 0 ? Math.round((sommeilMs / litMs) * 100) : 0;

  const nom = (k: string) => {
    const e = parSource.get(k)![0];
    return e.source || e.bundle || 'Source inconnue';
  };
  return {
    cle: cleNuit(fin),
    debut,
    fin,
    segments,
    secondes,
    minutes,
    totalMinutes,
    baseMinutes: Math.round(baseMs / 60000),
    pourcents,
    auLitMinutes,
    efficacite,
    source: nom(choisi.k),
    rang: choisi.rang,
    sources: candidats.map((c) => nom(c.k)),
  };
}

/** Groupe les echantillons par jour de reveil puis calcule chaque nuit (une seule source par nuit) */
export function calculerNuits(echantillons: EchantillonSommeil[]): NuitCalculee[] {
  const parCle = new Map<string, EchantillonSommeil[]>();
  for (const e of echantillons) {
    if (!(e.fin > e.debut)) continue;
    const k = cleNuit(e.fin);
    if (!parCle.has(k)) parCle.set(k, []);
    parCle.get(k)!.push(e);
  }
  const out: NuitCalculee[] = [];
  for (const list of parCle.values()) {
    const n = calculerNuit(list);
    if (n) out.push(n);
  }
  return out.sort((a, b) => a.cle.localeCompare(b.cle));
}

// ---------------- Pendant ton sommeil ----------------

export type EchantillonMesure = { debut: number; valeur: number; source?: string; bundle?: string; appareil?: string };

export type TrancheFC = { debut: number; fin: number; min: number; max: number };

export type MesureNuit = { min: number; max: number; moy: number; n: number; tranches: TrancheFC[] };

/** Garde la meilleure famille de source presente (montre, puis iPhone, puis apps) */
function memeFamille<T extends { source?: string; bundle?: string; appareil?: string }>(list: T[]): T[] {
  if (!list.length) return list;
  const r = Math.min(...list.map((e) => rangSource(e)));
  return list.filter((e) => rangSource(e) === r);
}

/**
 * Mesures prises pendant la nuit, du premier au dernier echantillon de sommeil.
 * Les tranches sont alignees sur l'heure pleine (barres min et max, comme Apple).
 */
export function mesuresPendantNuit(
  ech: EchantillonMesure[],
  debut: number,
  fin: number,
  opts: { min: number; max: number; tranche?: number; decimales?: number },
): MesureNuit | null {
  const dans = memeFamille(ech.filter((e) => e.debut >= debut && e.debut <= fin && Number.isFinite(e.valeur) && e.valeur >= opts.min && e.valeur <= opts.max));
  if (!dans.length) return null;
  const f = Math.pow(10, opts.decimales ?? 0);
  const arr = (v: number) => Math.round(v * f) / f;
  const vals = dans.map((e) => e.valeur);
  const tranche = (opts.tranche ?? 60) * 60000;
  const d0 = new Date(debut);
  const origine = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), d0.getHours()).getTime();
  const parT = new Map<number, number[]>();
  for (const e of dans) {
    const t = origine + Math.floor((e.debut - origine) / tranche) * tranche;
    if (!parT.has(t)) parT.set(t, []);
    parT.get(t)!.push(e.valeur);
  }
  const tranches = Array.from(parT.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([t, v]) => ({ debut: t, fin: t + tranche, min: arr(Math.min(...v)), max: arr(Math.max(...v)) }));
  return {
    min: arr(Math.min(...vals)),
    max: arr(Math.max(...vals)),
    moy: arr(vals.reduce((a, b) => a + b, 0) / vals.length),
    n: vals.length,
    tranches,
  };
}

/** Choisit la session qui correspond au jour demande (et a l'heure de coucher notee si elle est connue) */
export function nuitPourJour(nuits: NuitCalculee[], jour: string, coucher?: string): NuitCalculee | null {
  const ok = nuits.filter((n) => n.cle === jour);
  if (ok.length) return ok[0];
  if (coucher && /^\d{1,2}:\d{2}$/.test(coucher)) {
    const [h, m] = coucher.split(':').map((x) => parseInt(x, 10));
    const proche = nuits.find((n) => {
      const d = new Date(n.debut);
      return Math.abs(d.getHours() * 60 + d.getMinutes() - (h * 60 + m)) <= 1;
    });
    if (proche) return proche;
  }
  return null;
}
