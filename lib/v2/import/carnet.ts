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

export type SerieLue = {
  weight: number;
  /** repetitions ; pour une serie tenue ou de cardio, les secondes (format de YOROI : les secondes dans la colonne Repetitions) */
  reps: number;
  type?: 'normal' | 'warmup' | 'dropset';
  /** 18 novembre 2026 : serie en duree (gainage, velo, rameur...), en secondes */
  secondes?: number;
  /** 18 novembre 2026 : serie en distance, en kilometres */
  distanceKm?: number;
};
export type ExoLu = {
  nom: string;
  series: SerieLue[];
  notes?: string;
  /** le nom tel qu'il etait ecrit, quand l'exercice a ete reconnu sous un autre nom */
  saisi?: string;
  /** nom pas reconnu : garde comme un exercice a toi */
  inconnu?: boolean;
  /** 18 novembre 2026 : le superset de Hevy (colonne superset_id), pour relier les exercices dans ta routine */
  superset?: string;
  /** 18 novembre 2026 : le groupe musculaire donne par l'app d'origine (categorie de FitNotes), deja ecrit comme la bibliotheque */
  muscle?: string;
};
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
export type ResultatLecture = {
  seances: SeanceLue[];
  incomprises: string[];
  /** 18 novembre 2026 : ce qui n'a pas ete repris, avec sa raison (gabarit francais, traduit a l'affichage) */
  ignorees?: { quoi: string; raison: string }[];
  /** 18 novembre 2026 : ce que l'utilisateur doit savoir (unite supposee...) ; gabarits francais */
  avertissements?: string[];
  /** l'app reconnue */
  format?: 'hevy' | 'strong' | 'fitnotes' | 'colonnes' | 'notes' | 'hevy_texte';
};

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
/** CSV avec guillemets ; `sep` : la virgule, ou le point-virgule (export de Strong) */
export function lireCsv(texte: string, sep = ','): string[][] {
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
    else if (ch === sep) {
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
  // Hevy ecrit le mois dans la langue du telephone : « 10 Jun 2024 », « 27 oct. 2026 », « 3 févr. 2026 », « 5 août 2026 »
  let m = /^(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\.?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/.exec(t);
  const moisLu = m ? sansAccents(m[2].toLowerCase()) : '';
  const moisNum = m ? (MOIS[moisLu] ?? MOIS_EN[moisLu.slice(0, 3)]) : undefined;
  if (m && moisNum) {
    const a = +m[3], mo = moisNum, j = +m[1], h = +m[4], mi = +m[5];
    return { date: `${a}-${deux(mo)}-${deux(j)}`, heure: `${deux(h)}:${deux(mi)}`, ms: Date.UTC(a, mo - 1, j, h, mi) };
  }
  m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(t);
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, heure: `${m[4]}:${m[5]}`, ms: Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) };
  return null;
}

/**
 * 18 novembre 2026 : une serie lue d'un export (Hevy, Strong, FitNotes, colonnes choisies). Charge et repetitions,
 * ou duree (gainage, velo, rameur : les secondes vont dans les repetitions, comme la seance en direct de YOROI), ou
 * distance. null : rien de mesure, la serie est vide.
 */
export function serieLue(kg: number, reps: number, secondes: number, km: number, type?: SerieLue['type']): SerieLue | null {
  const w = Math.round((Number.isFinite(kg) && kg > 0 ? kg : 0) * 100) / 100;
  const r = Number.isFinite(reps) && reps > 0 ? Math.round(reps) : 0;
  const sec = Number.isFinite(secondes) && secondes > 0 ? Math.round(secondes) : 0;
  const d = Number.isFinite(km) && km > 0 ? Math.round(km * 1000) / 1000 : 0;
  if (!r && !sec && !d) return null;
  return { weight: w, reps: r || sec, ...(type ? { type } : {}), ...(!r && sec ? { secondes: sec } : {}), ...(d ? { distanceKm: d } : {}) };
}

/** « 2 séries vides » : les exercices dont des series n'avaient ni charge, ni repetitions, ni duree, ni distance */
function noterVides(vides: Map<string, number>): { quoi: string; raison: string }[] {
  return [...vides.entries()].map(([quoi, n]) => ({ quoi: `${quoi} (${n})`, raison: 'séries vides : ni répétitions, ni durée, ni distance' }));
}

/** L'export CSV des seances de Hevy : une ligne par serie */
export function lireHevy(texte: string): ResultatLecture | null {
  const rows = lireCsv(texte);
  if (rows.length < 2) return null;
  const tete = rows[0].map((h) => h.trim().toLowerCase());
  const col = (n: string) => tete.indexOf(n);
  const iTitre = col('title'), iDebut = col('start_time'), iFin = col('end_time'), iExo = col('exercise_title');
  const iKg = col('weight_kg'), iLb = col('weight_lbs'), iReps = col('reps'), iType = col('set_type'), iNote = col('exercise_notes'), iSup = col('superset_id');
  // 18 novembre 2026 : gainage, cardio et distance (colonnes duration_seconds et distance_km de l'export)
  const iSec = col('duration_seconds'), iKm = col('distance_km');
  if (iDebut < 0 || iExo < 0 || iReps < 0) return null;
  const parSeance = new Map<string, SeanceLue>();
  const incomprises: string[] = [];
  const vides = new Map<string, number>();
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
      const sup = iSup >= 0 ? (r[iSup] ?? '').trim() : '';
      if (sup) exo.superset = sup;
      s.exos.push(exo);
    }
    const reps = Number(r[iReps] || 0);
    const kg = iKg >= 0 && r[iKg] !== '' ? nombre(r[iKg]) : iLb >= 0 && r[iLb] !== '' ? nombre(r[iLb]) * 0.45359237 : 0;
    const typ = iType >= 0 ? (r[iType] ?? '').trim().toLowerCase() : '';
    const type: SerieLue['type'] = typ === 'warmup' || typ === '2' ? 'warmup' : typ === 'dropset' || typ === '3' ? 'dropset' : undefined;
    const sec = iSec >= 0 && r[iSec] !== '' ? nombre(r[iSec] ?? '') : 0;
    const km = iKm >= 0 && r[iKm] !== '' ? nombre(r[iKm] ?? '') : 0;
    const serie = serieLue(kg, reps, sec, km, type);
    if (serie) exo.series.push(serie);
    else vides.set(nom, (vides.get(nom) ?? 0) + 1);
  }
  const seances = [...parSeance.values()]
    .map((s) => ({ ...s, exos: s.exos.filter((e) => e.series.length > 0) }))
    .filter((s) => s.exos.length > 0)
    .sort((a, b) => (a.date + (a.heure ?? '') < b.date + (b.heure ?? '') ? -1 : 1));
  return { seances, incomprises, ignorees: noterVides(vides), format: 'hevy' };
}

/**
 * Une seance partagee depuis Hevy en texte (12 novembre 2026, retour d'un utilisateur) :
 *
 *   PUSH A FORCE
 *   Le lundi, nov. 02, 2026 à 9:02am
 *
 *   Développé Couché (Machine Smith)
 *   Série 1: 20 kg x 20
 *   Série 3: 20.3 kg x 10      (point decimal)
 *   Série 1: 12 répétitions    (poids du corps)
 *
 *   @hevyapp
 *   https://hevy.com/workout/...
 *
 * En anglais : « Monday, Nov 02, 2026 at 9:02am », « Set 1: 20 kg x 20 », « Set 1: 45 lbs x 12 », « 12 reps ».
 */
const RE_LIGNE_SERIE = /^(?:s[ée]rie|set|serie)\s+([0-9]+|w|d|f|[ée]chauffement|warm[\s-]?up|drop(?:\s*set)?|[ée]chec|failure)\s*:\s*(.*)$/i;
const RE_JOUR = /^(?:le\s+)?(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday|lun|mar|mer|jeu|ven|sam|dim|mon|tue|wed|thu|fri|sat|sun)\.?,?\s+/i;

/** « Le lundi, nov. 02, 2026 à 9:02am », « Monday, Nov 2, 2026 at 9:02 PM », « lundi 2 nov. 2026 à 21:02 » */
export function lireDateHevyTexte(ligne: string): { date: string; heure?: string } | null {
  const t = sansAccents(ligne.trim().toLowerCase());
  if (!RE_JOUR.test(t)) return null;
  const reste = t.replace(RE_JOUR, '');
  let j: number | undefined, mo: number | undefined, a: number | undefined, suite = '';
  let m = /^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})(.*)$/.exec(reste);
  if (m && (MOIS[m[1]] ?? MOIS_EN[m[1].slice(0, 3)])) {
    mo = MOIS[m[1]] ?? MOIS_EN[m[1].slice(0, 3)];
    j = +m[2];
    a = +m[3];
    suite = m[4];
  } else {
    m = /^(\d{1,2})(?:er)?\s+([a-z]+)\.?,?\s+(\d{4})(.*)$/.exec(reste);
    if (m && (MOIS[m[2]] ?? MOIS_EN[m[2].slice(0, 3)])) {
      j = +m[1];
      mo = MOIS[m[2]] ?? MOIS_EN[m[2].slice(0, 3)];
      a = +m[3];
      suite = m[4];
    }
  }
  if (!j || !mo || !a || j > 31) return null;
  const date = `${a}-${deux(mo)}-${deux(j)}`;
  const h = /(\d{1,2})[:h](\d{2})\s*(am|pm)?/.exec(suite);
  if (!h) return { date };
  let hh = +h[1];
  if (h[3] === 'pm' && hh < 12) hh += 12;
  if (h[3] === 'am' && hh === 12) hh = 0;
  if (hh > 23 || +h[2] > 59) return { date };
  return { date, heure: `${deux(hh)}:${h[2]}` };
}

/** Le detail d'une serie : « 20 kg x 20 », « 20.3 kg x 10 », « 45 lbs x 12 », « 12 répétitions », « 12 reps », « 20 kg × 8 @ 8 rpe » */
function lireSerieHevy(detail: string): { weight: number; reps: number } | null {
  const t = sansAccents(detail.trim().toLowerCase());
  let m = /^(\d+(?:[.,]\d+)?)\s*(kg|kgs|lb|lbs)\s*[x×*]\s*(\d{1,3})\b/.exec(t);
  if (m) {
    const kg = nombre(m[1]) * (m[2].startsWith('l') ? 0.45359237 : 1);
    return { weight: Math.round(kg * 100) / 100, reps: +m[3] };
  }
  m = /^(\d{1,3})\s*(?:repetitions?|reps?|rep\.?|x)\b/.exec(t);
  if (m) return { weight: 0, reps: +m[1] };
  return null;
}

/** Le texte ressemble-t-il a une seance partagee depuis Hevy ? */
export function estPartageHevy(texte: string): boolean {
  const lignes = texte.replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean);
  const series = lignes.filter((l) => RE_LIGNE_SERIE.test(l)).length;
  if (series === 0) return false;
  return series >= 2 || lignes.some((l) => /^@hevyapp$/i.test(l) || /hevy\.com\/workout/i.test(l));
}

/** Une ou plusieurs seances partagees depuis Hevy en texte */
export function lireHevyTexte(texte: string): ResultatLecture | null {
  if (!estPartageHevy(texte)) return null;
  const lignes = texte.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n').map((l) => l.trim());
  const seances: SeanceLue[] = [];
  const incomprises: string[] = [];
  let s: SeanceLue | null = null;
  let exo: ExoLu | null = null;
  let titreAttente: string | null = null;
  const fermer = () => {
    if (s) {
      s.exos = s.exos.filter((e) => e.series.length > 0);
      if (s.exos.length) seances.push(s);
    }
    s = null;
    exo = null;
  };
  for (let k = 0; k < lignes.length; k++) {
    const l = lignes[k];
    if (!l) continue;
    if (/^@hevyapp\b/i.test(l) || /^https?:\/\//i.test(l) || /hevy\.com/i.test(l)) continue;
    const d = lireDateHevyTexte(l);
    if (d) {
      fermer();
      const titre = titreAttente ?? undefined;
      titreAttente = null;
      s = { date: d.date, ...(d.heure ? { heure: d.heure } : {}), ...(titre ? { titre } : {}), exos: [], cle: '' };
      continue;
    }
    const serie = RE_LIGNE_SERIE.exec(l);
    if (serie) {
      if (!exo) {
        incomprises.push(l);
        continue;
      }
      const v = lireSerieHevy(serie[2]);
      if (!v) {
        if (serie[2].trim()) incomprises.push(l);
        continue;
      }
      const marque = sansAccents(serie[1].toLowerCase());
      const type: SerieLue['type'] = /^(w|echauffement)/.test(marque) ? 'warmup' : /^d/.test(marque) ? 'dropset' : undefined;
      exo.series.push({ ...v, ...(type ? { type } : {}) });
      continue;
    }
    // une ligne de texte : le titre (avant la date) ou un exercice
    const suivante = lignes.slice(k + 1).find((x) => x);
    if (!s || (suivante && lireDateHevyTexte(suivante))) {
      if (s) fermer();
      titreAttente = l;
      continue;
    }
    if (suivante && RE_LIGNE_SERIE.test(suivante)) {
      exo = { nom: l, series: [] };
      s.exos.push(exo);
      continue;
    }
    // une note d'exercice (Hevy la met sous le nom), sinon incomprise
    if (exo && exo.series.length === 0) exo.notes = exo.notes ? `${exo.notes} ${l}` : l;
    else incomprises.push(l);
  }
  fermer();
  if (!seances.length) return null;
  for (const x of seances) x.cle = `hevy:${x.date}T${x.heure ?? ''}:${empreinte(x.titre ?? '')}`;
  seances.sort((a, b) => (a.date + (a.heure ?? '') < b.date + (b.heure ?? '') ? -1 : 1));
  return { seances, incomprises };
}

/* ------------------------------------------------------------------------------------------------
 * 18 novembre 2026 : les autres apps de muscu qui exportent leurs seances en fichier. Formats d'apres des exports
 * reels publies (sources dans __tests__/unit/importAutresApps.test.ts) ; rien n'est invente : une colonne absente
 * est simplement ignoree, et ce qui est suppose (l'unite des charges) est dit a l'ecran.
 * ---------------------------------------------------------------------------------------------- */

const LB = 0.45359237;
const MI = 1.609344;
const tete = (rows: string[][]) => rows[0].map((h) => h.replace(/^﻿/, '').trim().toLowerCase());
/** « 2023-07-30 16:49:28 », « 2023-07-30 16:49 », « 2023-07-30 » */
function dateIso(v: string): { date: string; heure?: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?/.exec(v.trim());
  if (!m) return null;
  return { date: `${m[1]}-${m[2]}-${m[3]}`, ...(m[4] ? { heure: `${deux(+m[4])}:${m[5]}` } : {}) };
}
/** « 44m », « 1h 2m », « 1h », « 01:02:00 » : minutes */
function dureeMinutes(v: string): number | undefined {
  const t = (v ?? '').trim().toLowerCase();
  if (!t) return undefined;
  let m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t);
  // « 01:02:00 » et « 1:02 » : heures et minutes
  if (m) return +m[1] * 60 + +m[2];
  const h = /(\d+)\s*h/.exec(t);
  const mi = /(\d+)\s*m(?!s)/.exec(t);
  if (!h && !mi) return undefined;
  return (h ? +h[1] * 60 : 0) + (mi ? +mi[1] : 0);
}
/** « 0:01:30 », « 1:30 », « 90 » : secondes */
function secondesDe(v: string): number {
  const t = (v ?? '').trim();
  if (!t) return 0;
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})$/.exec(t);
  if (m) return (m[1] ? +m[1] * 3600 : 0) + +m[2] * 60 + +m[3];
  const n = nombre(t);
  return Number.isFinite(n) ? n : 0;
}
const versKm = (v: number, unite: string) => {
  const u = unite.trim().toLowerCase();
  return u.startsWith('mi') ? v * MI : u === 'm' || u.startsWith('met') ? v / 1000 : v;
};
function finir(parSeance: Map<string, SeanceLue>): SeanceLue[] {
  return [...parSeance.values()]
    .map((s) => ({ ...s, exos: s.exos.filter((e) => e.series.length > 0) }))
    .filter((s) => s.exos.length > 0)
    .sort((a, b) => (a.date + (a.heure ?? '') < b.date + (b.heure ?? '') ? -1 : 1));
}
function exoDe(s: SeanceLue, nom: string): ExoLu {
  let exo = s.exos[s.exos.length - 1];
  if (!exo || exo.nom !== nom) {
    exo = { nom, series: [] };
    s.exos.push(exo);
  }
  return exo;
}

/**
 * Strong (export « Export Strong Data », CSV). Deux variantes vues dans des exports reels :
 *  - virgules : Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps, Distance, Seconds, Notes,
 *    Workout Notes, RPE (sans unite : les charges sont supposees en kilos, c'est dit a l'ecran) ;
 *  - points-virgules : Date;Workout Name;Exercise Name;Set Order;Weight;Weight Unit;Reps;RPE;Distance;Distance Unit;
 *    Seconds;Notes;Workout Notes;Workout Duration, dates « 2023-07-30 16:49:28 », duree « 44m ».
 * Les en-tetes sont en anglais (Hevy demande aussi de passer Strong en anglais avant d'exporter).
 */
export function lireStrong(texte: string): ResultatLecture | null {
  const premiere = texte.replace(/^﻿/, '').split(/\r?\n/, 1)[0];
  const sep = premiere.split(';').length > premiere.split(',').length ? ';' : ',';
  const rows = lireCsv(texte, sep);
  if (rows.length < 2) return null;
  const t = tete(rows);
  const col = (n: string) => t.indexOf(n);
  const iDate = col('date'), iTitre = col('workout name'), iExo = col('exercise name'), iOrdre = col('set order');
  const iKg = col('weight'), iUnite = col('weight unit'), iReps = col('reps'), iDist = col('distance'), iDistU = col('distance unit');
  const iSec = col('seconds'), iNote = col('notes'), iDuree = col('workout duration') >= 0 ? col('workout duration') : col('duration');
  if (iDate < 0 || iExo < 0 || iReps < 0 || iOrdre < 0) return null;
  const parSeance = new Map<string, SeanceLue>();
  const incomprises: string[] = [];
  const vides = new Map<string, number>();
  for (const r of rows.slice(1)) {
    const d = dateIso(r[iDate] ?? '');
    const nom = (r[iExo] ?? '').trim();
    if (!d || !nom) {
      incomprises.push(r.join(', ').slice(0, 80));
      continue;
    }
    const titre = iTitre >= 0 ? (r[iTitre] ?? '').trim() : '';
    const cle = `strong:${d.date}T${d.heure ?? ''}:${empreinte(titre)}`;
    let s = parSeance.get(cle);
    if (!s) {
      const duree = iDuree >= 0 ? dureeMinutes(r[iDuree] ?? '') : undefined;
      s = { date: d.date, ...(d.heure ? { heure: d.heure } : {}), titre: titre || undefined, exos: [], cle, ...(duree && duree > 0 && duree < 600 ? { duree } : {}) };
      parSeance.set(cle, s);
    }
    const exo = exoDe(s, nom);
    const note = iNote >= 0 ? (r[iNote] ?? '').trim() : '';
    if (note && !exo.notes) exo.notes = note;
    const unite = iUnite >= 0 ? (r[iUnite] ?? '').trim().toLowerCase() : '';
    const kg = iKg >= 0 ? nombre(r[iKg] || '0') * (unite.startsWith('lb') ? LB : 1) : 0;
    const km = iDist >= 0 ? versKm(nombre(r[iDist] || '0'), iDistU >= 0 ? r[iDistU] ?? '' : 'km') : 0;
    const ordre = (r[iOrdre] ?? '').trim().toUpperCase();
    const serie = serieLue(kg, nombre(r[iReps] || '0'), iSec >= 0 ? nombre(r[iSec] || '0') : 0, km, ordre === 'W' ? 'warmup' : ordre === 'D' ? 'dropset' : undefined);
    if (serie) exo.series.push(serie);
    else vides.set(nom, (vides.get(nom) ?? 0) + 1);
  }
  return {
    seances: finir(parSeance),
    incomprises,
    ignorees: noterVides(vides),
    format: 'strong',
    ...(iUnite < 0 && iKg >= 0 ? { avertissements: ['Le fichier ne dit pas l’unité des charges : elles sont lues en kilos. Si ton app était en livres, change l’unité avant d’importer.'] } : {}),
  };
}

/** Les categories de FitNotes vers les groupes de la bibliotheque */
const CATEGORIES_FITNOTES: Record<string, string> = {
  chest: 'PECTORAUX', back: 'DOS', shoulders: 'ÉPAULES', biceps: 'BICEPS', triceps: 'TRICEPS', legs: 'JAMBES', abs: 'ABDOS', calves: 'MOLLETS', glutes: 'FESSIERS', forearms: 'AVANT-BRAS',
};

/**
 * FitNotes (export en tableur, CSV) : Date, Exercise, Category, Weight (kgs) ou Weight (lbs), Reps, Distance,
 * Distance Unit, Time, une ligne par serie, date « 2014-08-03 » sans heure ni titre de seance : une seance par jour,
 * pas de routine a reconstruire (rien ne la nomme). La categorie donne le muscle des exercices a toi.
 */
export function lireFitNotes(texte: string): ResultatLecture | null {
  const rows = lireCsv(texte);
  if (rows.length < 2) return null;
  const t = tete(rows);
  const col = (n: string) => t.indexOf(n);
  const iDate = col('date'), iExo = col('exercise'), iCat = col('category'), iKg = col('weight (kgs)'), iLb = col('weight (lbs)');
  const iReps = col('reps'), iDist = col('distance'), iDistU = col('distance unit'), iTemps = col('time');
  if (iDate < 0 || iExo < 0 || iReps < 0 || (iKg < 0 && iLb < 0)) return null;
  const parSeance = new Map<string, SeanceLue>();
  const incomprises: string[] = [];
  const vides = new Map<string, number>();
  for (const r of rows.slice(1)) {
    const d = dateIso(r[iDate] ?? '');
    const nom = (r[iExo] ?? '').trim();
    if (!d || !nom) {
      incomprises.push(r.join(', ').slice(0, 80));
      continue;
    }
    let s = parSeance.get(d.date);
    if (!s) {
      s = { date: d.date, exos: [], cle: '' };
      parSeance.set(d.date, s);
    }
    const exo = exoDe(s, nom);
    const cat = iCat >= 0 ? CATEGORIES_FITNOTES[(r[iCat] ?? '').trim().toLowerCase()] : undefined;
    if (cat && !exo.muscle) exo.muscle = cat;
    const kg = iKg >= 0 ? nombre(r[iKg] || '0') : nombre(r[iLb] || '0') * LB;
    const km = iDist >= 0 ? versKm(nombre(r[iDist] || '0'), iDistU >= 0 ? r[iDistU] ?? '' : 'km') : 0;
    const serie = serieLue(kg, nombre(r[iReps] || '0'), iTemps >= 0 ? secondesDe(r[iTemps] ?? '') : 0, km);
    if (serie) exo.series.push(serie);
    else vides.set(nom, (vides.get(nom) ?? 0) + 1);
  }
  const seances = finir(parSeance).map((s) => ({ ...s, cle: `fitnotes:${s.date}:${empreinte(s.exos.map((e) => `${e.nom}|${e.series.map((x) => `${x.weight}x${x.reps}`).join(',')}`).join(';'))}` }));
  return { seances, incomprises, ignorees: noterVides(vides), format: 'fitnotes' };
}

/* ---------------------------------- un autre fichier : tu choisis les colonnes ---------------------------------- */

export type Colonnes = { date: number; exercice: number; charge?: number; reps?: number; secondes?: number; distanceKm?: number; titre?: number };

/** Les noms de colonnes les plus courants, francais et anglais ; -1 : a choisir */
export function devinerColonnes(entete: readonly string[]): Colonnes {
  const t = entete.map((h) => sansAccents(h.trim().toLowerCase()));
  const trouve = (...motifs: RegExp[]) => {
    for (const re of motifs) {
      const i = t.findIndex((h) => re.test(h));
      if (i >= 0) return i;
    }
    return -1;
  };
  const c: Colonnes = {
    date: trouve(/^date$/, /date|start_time|jour/),
    exercice: trouve(/^exercise( name)?$/, /^exercice$/, /exercise|exercice|movement|mouvement/),
  };
  const charge = trouve(/^weight( \(kgs?\))?$/, /weight|poids|charge|kg/);
  const reps = trouve(/^reps$/, /reps|repetition/);
  const sec = trouve(/seconds|secondes|duration_seconds|^time$|duree/);
  const dist = trouve(/distance/);
  const titre = trouve(/workout name|^title$|^titre$|seance|routine/);
  if (charge >= 0) c.charge = charge;
  if (reps >= 0) c.reps = reps;
  if (sec >= 0) c.secondes = sec;
  if (dist >= 0) c.distanceKm = dist;
  if (titre >= 0 && titre !== c.exercice) c.titre = titre;
  return c;
}

/** Date d'un fichier quelconque : ISO, ou jour/mois/annee (le format le plus courant en France) */
function dateLibre(v: string): { date: string; heure?: string } | null {
  const iso = dateIso(v);
  if (iso) return iso;
  const m = /^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})(?:[ T,]+(\d{1,2})[:h](\d{2}))?/.exec(v.trim());
  if (!m) return null;
  const a = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  if (+m[2] > 12 || +m[1] > 31) return null;
  return { date: `${a}-${deux(+m[2])}-${deux(+m[1])}`, ...(m[4] ? { heure: `${deux(+m[4])}:${m[5]}` } : {}) };
}

/** Un CSV d'une autre app, avec les colonnes choisies par l'utilisateur ; `livres` : les charges sont en livres */
export function lireCsvColonnes(texte: string, c: Colonnes, livres = false): ResultatLecture {
  const premiere = texte.replace(/^﻿/, '').split(/\r?\n/, 1)[0];
  const sep = premiere.split(';').length > premiere.split(',').length ? ';' : ',';
  const rows = lireCsv(texte, sep).slice(1);
  const parSeance = new Map<string, SeanceLue>();
  const incomprises: string[] = [];
  const vides = new Map<string, number>();
  const v = (r: string[], i?: number) => (i !== undefined && i >= 0 ? (r[i] ?? '').trim() : '');
  for (const r of rows) {
    const d = dateLibre(v(r, c.date));
    const nom = v(r, c.exercice);
    if (!d || !nom) {
      incomprises.push(r.join(', ').slice(0, 80));
      continue;
    }
    const titre = v(r, c.titre);
    const k = `${d.date}T${d.heure ?? ''}:${titre}`;
    let s = parSeance.get(k);
    if (!s) {
      s = { date: d.date, ...(d.heure ? { heure: d.heure } : {}), ...(titre ? { titre } : {}), exos: [], cle: `csv:${d.date}T${d.heure ?? ''}:${empreinte(titre)}` };
      parSeance.set(k, s);
    }
    const exo = exoDe(s, nom);
    const serie = serieLue(nombre(v(r, c.charge) || '0') * (livres ? LB : 1), nombre(v(r, c.reps) || '0'), secondesDe(v(r, c.secondes)), nombre(v(r, c.distanceKm) || '0'));
    if (serie) exo.series.push(serie);
    else vides.set(nom, (vides.get(nom) ?? 0) + 1);
  }
  return { seances: finir(parSeance), incomprises, ignorees: noterVides(vides), format: 'colonnes' };
}

/** Le texte colle ou le fichier : Hevy si l'en-tete le dit, sinon des notes */
export function lireCarnet(texte: string, aujourdhui: Date = new Date()): ResultatLecture {
  const premiere = texte.replace(/^﻿/, '').split(/\r?\n/, 1)[0].toLowerCase();
  if (premiere.includes('exercise_title') && premiere.includes('start_time')) {
    const h = lireHevy(texte);
    if (h) return h;
  }
  // 18 novembre 2026 : Strong et FitNotes
  if (premiere.includes('exercise name') && premiere.includes('set order')) {
    const st = lireStrong(texte);
    if (st) return st;
  }
  if (premiere.includes('exercise') && premiere.includes('category') && premiere.includes('weight (')) {
    const fn = lireFitNotes(texte);
    if (fn) return fn;
  }
  const partage = lireHevyTexte(texte);
  if (partage) return partage;
  return lireNotes(texte, aujourdhui);
}

/** Donne a chaque exercice son nom de la bibliotheque quand il est reconnu (lib/v2/import/vocabulaire.ts) */
export function nommerExos(r: ResultatLecture, reconnaitre: (nom: string) => { nom: string; sur: boolean }): ResultatLecture {
  return {
    ...r,
    seances: r.seances.map((s) => ({
      ...s,
      exos: s.exos.map((e) => {
        const x = reconnaitre(e.nom);
        if (!x.sur) return { ...e, inconnu: true };
        return x.nom === e.nom ? e : { ...e, nom: x.nom, saisi: e.nom };
      }),
    })),
  };
}
