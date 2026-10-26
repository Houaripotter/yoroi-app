/**
 * Importer son carnet de muscu (26 octobre 2026).
 * Retour d'utilisateurs : beaucoup notent leurs seances depuis des annees dans les Notes du telephone :
 *
 *   14/10
 *   Hack squat 60kg 2x12 70kg 2x10
 *   Presse inclinée 160kg 2x12 180kg 1x8/10
 *   Leg curl allongé 35kg 2x12 2x10
 *
 * D'autres viennent de Hevy (export CSV : Profil, Reglages, Exporter et importer, Exporter les seances).
 * Ici, tout est pur (aucun import React Native) : teste dans __tests__/unit/importCarnet.test.ts.
 * L'ecran app/importer-carnet.tsx montre ce qui a ete compris avant d'enregistrer quoi que ce soit.
 */

export type SerieLue = { weight: number; reps: number; type?: 'normal' | 'warmup' | 'dropset' };
export type ExoLu = { nom: string; series: SerieLue[]; notes?: string };
export type SeanceLue = {
  /** AAAA-MM-JJ */
  date: string;
  /** HH:MM si connu */
  heure?: string;
  duree?: number;
  titre?: string;
  exos: ExoLu[];
  /** cle stable : la meme seance importee deux fois n'est enregistree qu'une fois */
  cle: string;
};
export type ResultatLecture = { seances: SeanceLue[]; incomprises: string[] };

const MOIS: Record<string, number> = {
  janvier: 1, janv: 1, jan: 1, january: 1,
  fevrier: 2, fevr: 2, fev: 2, feb: 2, february: 2,
  mars: 3, mar: 3, march: 3,
  avril: 4, avr: 4, apr: 4, april: 4,
  mai: 5, may: 5,
  juin: 6, jun: 6, june: 6,
  juillet: 7, juil: 7, jul: 7, july: 7,
  aout: 8, aug: 8, august: 8,
  septembre: 9, sept: 9, sep: 9, september: 9,
  octobre: 10, oct: 10, october: 10,
  novembre: 11, nov: 11, november: 11,
  decembre: 12, dec: 12, december: 12,
};

const sansAccents = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const nombre = (s: string): number => Number(s.replace(',', '.'));
const deux = (n: number): string => String(n).padStart(2, '0');

/** Petite empreinte stable (djb2) pour les cles d'import */
export function empreinte(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Une ligne qui n'est qu'une date : « 14/10 », « 14/10/2025 », « Lundi 14/10 », « 14 octobre 2025 », « 2025-10-14 » */
export function lireDate(ligne: string): { j: number; m: number; a?: number } | null {
  const t = sansAccents(ligne.trim().toLowerCase()).replace(/[:.]+$/, '').trim();
  if (!t || t.length > 40) return null;
  const sansJour = t.replace(/^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lun|mar|mer|jeu|ven|sam|dim|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\.?\s*/, '');
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(sansJour);
  if (m) return { a: +m[1], m: +m[2], j: +m[3] };
  m = /^(\d{1,2})\s*[/.\-]\s*(\d{1,2})(?:\s*[/.\-]\s*(\d{2,4}))?$/.exec(sansJour);
  if (m) {
    const a = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : undefined;
    const j = +m[1];
    const mo = +m[2];
    if (j >= 1 && j <= 31 && mo >= 1 && mo <= 12) return { j, m: mo, a };
    return null;
  }
  m = /^(\d{1,2})(?:er)?\s+([a-z]+)\.?(?:\s+(\d{4}))?$/.exec(sansJour);
  if (m && MOIS[m[2]]) return { j: +m[1], m: MOIS[m[2]], a: m[3] ? +m[3] : undefined };
  return null;
}

const RE_CHARGE = /^(\d+(?:[.,]\d+)?)\s*(kg|kgs|kilos?|lb|lbs|livres?)$/i;
const RE_SERIES = /^(\d{1,2})\s*[x×*]\s*(\d{1,3}(?:\s*\/\s*\d{1,3})*)$/i;

/** Decoupe une ligne en morceaux, en recollant « 60 kg » et « 2 x 12 » */
function morceaux(ligne: string): string[] {
  return ligne
    .replace(/(\d)\s+(kg|kgs|kilos?|lbs?|livres?)\b/gi, '$1$2')
    .replace(/(\d)\s*([x×*])\s*(\d)/gi, '$1x$3')
    .replace(/(\d)\s*\/\s*(\d)/g, '$1/$2')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Une ligne d'exercice : le nom, puis des charges et des series, dans l'ordre.
 * « Hack squat 60kg 2x12 70kg 2x10 » : 2 series de 12 a 60 kg, puis 2 de 10 a 70 kg.
 * « Leg curl allongé 35kg 2x12 2x10 » : la charge reste jusqu'a la suivante.
 * « 2x20/15 » : deux series, 20 puis 15 repetitions. « 1x8/10 » : une serie de 8 (le reste est garde en note).
 */
export function lireExercice(ligne: string): ExoLu | null {
  const ms = morceaux(ligne.trim());
  const nomMots: string[] = [];
  const reste: string[] = [];
  let i = 0;
  for (; i < ms.length; i++) {
    if (RE_CHARGE.test(ms[i]) || RE_SERIES.test(ms[i])) break;
    nomMots.push(ms[i]);
  }
  const nom = nomMots.join(' ').replace(/[:\-–—,;]+$/, '').trim();
  if (!nom || !/[a-zA-Zà-ÿ]/.test(nom)) return null;
  let charge = 0;
  let lb = false;
  const series: SerieLue[] = [];
  const notes: string[] = [];
  for (; i < ms.length; i++) {
    const t = ms[i];
    const c = RE_CHARGE.exec(t);
    if (c) {
      lb = /^l/i.test(c[2]);
      charge = nombre(c[1]) * (lb ? 0.45359237 : 1);
      continue;
    }
    const s = RE_SERIES.exec(t);
    if (s) {
      const n = +s[1];
      const reps = s[2].split('/').map((x) => +x).filter((x) => x > 0);
      if (!n || !reps.length) continue;
      if (reps.length > 1 && reps.length !== n) notes.push(t);
      for (let k = 0; k < n; k++) {
        const r = reps.length === n ? reps[k] : reps[0];
        series.push({ weight: Math.round(charge * 100) / 100, reps: r });
      }
      continue;
    }
    reste.push(t);
  }
  if (!series.length) return null;
  if (reste.length) notes.push(reste.join(' '));
  return { nom: nom.charAt(0).toUpperCase() + nom.slice(1), series, ...(notes.length ? { notes: notes.join(' ') } : {}) };
}

/**
 * Les notes du telephone, collees telles quelles. L'annee manquante est retrouvee : la derniere date est
 * la plus recente avant aujourd'hui, et on remonte le temps en arriere (14/10 apres 02/01 : annee precedente).
 */
export function lireNotes(texte: string, aujourdhui: Date = new Date()): ResultatLecture {
  const lignes = texte.replace(/\r/g, '').split('\n');
  type Bloc = { d: { j: number; m: number; a?: number } | null; exos: ExoLu[] };
  const blocs: Bloc[] = [];
  const incomprises: string[] = [];
  let courant: Bloc | null = null;
  for (const brute of lignes) {
    const l = brute.trim().replace(/^[-•*·]\s*/, '');
    if (!l) continue;
    const d = lireDate(l);
    if (d) {
      courant = { d, exos: [] };
      blocs.push(courant);
      continue;
    }
    const e = lireExercice(l);
    if (e) {
      if (!courant) {
        courant = { d: null, exos: [] };
        blocs.push(courant);
      }
      courant.exos.push(e);
    } else incomprises.push(l);
  }

  // annees : de la fin vers le debut
  const finJour = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate()).getTime();
  let suivante: number | null = null;
  const dates: (string | null)[] = new Array(blocs.length).fill(null);
  for (let k = blocs.length - 1; k >= 0; k--) {
    const d = blocs[k].d;
    if (!d) continue;
    let a = d.a ?? aujourdhui.getFullYear();
    const quand = (an: number) => new Date(an, d.m - 1, d.j).getTime();
    if (d.a === undefined) {
      const borne = suivante ?? finJour;
      while (quand(a) > borne) a--;
    }
    suivante = quand(a);
    dates[k] = `${a}-${deux(d.m)}-${deux(d.j)}`;
  }
  const iso = `${aujourdhui.getFullYear()}-${deux(aujourdhui.getMonth() + 1)}-${deux(aujourdhui.getDate())}`;

  // une date peut apparaitre plusieurs fois : une seance par date
  const parDate = new Map<string, SeanceLue>();
  blocs.forEach((b, k) => {
    if (!b.exos.length) return;
    const date = dates[k] ?? iso;
    const s = parDate.get(date) ?? { date, exos: [], cle: '' };
    s.exos.push(...b.exos);
    parDate.set(date, s);
  });
  const seances = [...parDate.values()].map((s) => ({
    ...s,
    cle: `notes:${s.date}:${empreinte(s.exos.map((e) => `${e.nom}|${e.series.map((x) => `${x.weight}x${x.reps}`).join(',')}`).join(';'))}`,
  }));
  seances.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { seances, incomprises };
}

/** CSV avec guillemets (« "Bench Press (Barbell)" », virgules dans les notes) */
export function lireCsv(texte: string): string[][] {
  const out: string[][] = [];
  let ligne: string[] = [];
  let champ = '';
  let dansGuillemets = false;
  const t = texte.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (dansGuillemets) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          champ += '"';
          i++;
        } else dansGuillemets = false;
      } else champ += ch;
      continue;
    }
    if (ch === '"') dansGuillemets = true;
    else if (ch === ',') {
      ligne.push(champ);
      champ = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      ligne.push(champ);
      champ = '';
      if (ligne.some((x) => x !== '')) out.push(ligne);
      ligne = [];
    } else champ += ch;
  }
  ligne.push(champ);
  if (ligne.some((x) => x !== '')) out.push(ligne);
  return out;
}

const MOIS_EN: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** Dates de Hevy : « 10 Jun 2024, 08:15 » ou ISO « 2024-06-10T08:15:00Z » ; heure locale gardee telle quelle */
export function lireDateHevy(s: string): { date: string; heure: string; ms: number } | null {
  const t = s.trim();
  let m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/.exec(t);
  if (m && MOIS_EN[m[2].toLowerCase()]) {
    const a = +m[3], mo = MOIS_EN[m[2].toLowerCase()], j = +m[1], h = +m[4], mi = +m[5];
    return { date: `${a}-${deux(mo)}-${deux(j)}`, heure: `${deux(h)}:${deux(mi)}`, ms: Date.UTC(a, mo - 1, j, h, mi) };
  }
  m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(t);
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, heure: `${m[4]}:${m[5]}`, ms: Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) };
  return null;
}

/** L'export CSV des seances de Hevy : une ligne par serie */
export function lireHevy(texte: string): ResultatLecture | null {
  const rows = lireCsv(texte);
  if (rows.length < 2) return null;
  const tete = rows[0].map((h) => h.trim().toLowerCase());
  const col = (n: string) => tete.indexOf(n);
  const iTitre = col('title'), iDebut = col('start_time'), iFin = col('end_time'), iExo = col('exercise_title');
  const iKg = col('weight_kg'), iLb = col('weight_lbs'), iReps = col('reps'), iType = col('set_type'), iNote = col('exercise_notes');
  if (iDebut < 0 || iExo < 0 || iReps < 0) return null;
  const parSeance = new Map<string, SeanceLue>();
  const incomprises: string[] = [];
  for (const r of rows.slice(1)) {
    const debut = lireDateHevy(r[iDebut] ?? '');
    const nom = (r[iExo] ?? '').trim();
    if (!debut || !nom) {
      incomprises.push(r.join(', ').slice(0, 80));
      continue;
    }
    const titre = iTitre >= 0 ? (r[iTitre] ?? '').trim() : '';
    const cle = `hevy:${debut.date}T${debut.heure}:${empreinte(titre)}`;
    let s = parSeance.get(cle);
    if (!s) {
      const fin = iFin >= 0 ? lireDateHevy(r[iFin] ?? '') : null;
      const duree = fin ? Math.round((fin.ms - debut.ms) / 60000) : undefined;
      s = { date: debut.date, heure: debut.heure, titre: titre || undefined, exos: [], cle, ...(duree && duree > 0 && duree < 600 ? { duree } : {}) };
      parSeance.set(cle, s);
    }
    let exo = s.exos[s.exos.length - 1];
    if (!exo || exo.nom !== nom) {
      exo = { nom, series: [] };
      const note = iNote >= 0 ? (r[iNote] ?? '').trim() : '';
      if (note) exo.notes = note;
      s.exos.push(exo);
    }
    const reps = Number(r[iReps]);
    if (!Number.isFinite(reps) || reps <= 0) continue;
    const kg = iKg >= 0 && r[iKg] !== '' ? nombre(r[iKg]) : iLb >= 0 && r[iLb] !== '' ? nombre(r[iLb]) * 0.45359237 : 0;
    const typ = iType >= 0 ? (r[iType] ?? '').trim().toLowerCase() : '';
    const type: SerieLue['type'] = typ === 'warmup' || typ === '2' ? 'warmup' : typ === 'dropset' || typ === '3' ? 'dropset' : undefined;
    exo.series.push({ weight: Math.round((Number.isFinite(kg) ? kg : 0) * 100) / 100, reps, ...(type ? { type } : {}) });
  }
  const seances = [...parSeance.values()]
    .map((s) => ({ ...s, exos: s.exos.filter((e) => e.series.length > 0) }))
    .filter((s) => s.exos.length > 0)
    .sort((a, b) => (a.date + (a.heure ?? '') < b.date + (b.heure ?? '') ? -1 : 1));
  return { seances, incomprises };
}

/** Le texte colle ou le fichier : Hevy si l'en-tete le dit, sinon des notes */
export function lireCarnet(texte: string, aujourdhui: Date = new Date()): ResultatLecture {
  const premiere = texte.replace(/^﻿/, '').split(/\r?\n/, 1)[0].toLowerCase();
  if (premiere.includes('exercise_title') && premiere.includes('start_time')) {
    const h = lireHevy(texte);
    if (h) return h;
  }
  return lireNotes(texte, aujourdhui);
}
