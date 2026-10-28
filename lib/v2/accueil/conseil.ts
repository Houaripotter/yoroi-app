/**
 * Conseil du jour de l'accueil : une seule phrase utile, tiree de tes vraies donnees.
 * Remplace la carte « Coach du jour » de l'ancien accueil (lib/coachService), avec ton objectif de la semaine
 * au lieu d'un objectif fixe, et sans chiffre invente. Le meme conseil reste toute la journee.
 */
import type { Training } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { trainingsThisWeek } from '@/lib/v2/trainingWeek';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

/** Petite icone dessinee (plus aucun kanji) */
export type ConseilPicto = 'steps' | 'bolt' | 'calendar' | 'mountain' | 'play' | 'repeat' | 'moon' | 'check' | 'scale' | 'target' | 'flame' | 'refresh';

export type Conseil = {
  picto: ConseilPicto;
  title: string;
  text: string;
  action?: string;
  href?: string;
  tone: 'red' | 'indigo' | 'gold' | 'moss';
};

const DAY = 86400000;
const NB = ' ';

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dayIndex(iso: string): number {
  return Math.floor(new Date(iso.slice(0, 10) + 'T12:00:00').getTime() / DAY);
}

const SAGESSE: Conseil[] = [
  { picto: 'steps', title: traduire('Un pas de plus'), text: traduire('Aujourd’hui n’a pas besoin d’être parfait. Il a juste besoin d’être fait.'), tone: 'gold' },
  { picto: 'bolt', title: traduire('Aiguise ta lame'), text: traduire('Les grandes victoires naissent de petites habitudes, répétées chaque jour.'), tone: 'gold' },
  { picto: 'calendar', title: traduire('La discipline reste'), text: traduire('La motivation va et vient. La régularité, elle, construit ta progression.'), tone: 'gold' },
  { picto: 'mountain', title: traduire('Patience'), text: traduire('Le progrès se voit sur des semaines, pas sur une séance. Continue.'), tone: 'gold' },
];

/**
 * Conseils choisis selon ce qui t'a freine jusqu'ici (ecran de l'onboarding, vague 27).
 * Ils remplacent les phrases de sagesse quand aucun conseil tire de tes donnees ne s'impose.
 */
const PAR_FREIN: Record<string, Conseil[]> = {
  regularite: [
    { picto: 'calendar', title: traduire('Petit mais régulier'), text: traduire('Deux séances tenues valent mieux que cinq prévues. Regarde ta semaine et vise juste.'), action: traduire('Ma semaine'), href: '/seances', tone: 'gold' },
    { picto: 'repeat', title: traduire('Le même créneau'), text: traduire('Garde le même moment pour t’entraîner. L’habitude fait le travail à ta place.'), tone: 'gold' },
  ],
  progres: [
    { picto: 'scale', title: traduire('Ta courbe parle'), text: traduire('Une pesée seule ne dit pas grand chose. Ta tendance sur plusieurs semaines, si.'), action: traduire('Voir ma courbe'), href: '/poids-detail', tone: 'indigo' },
    { picto: 'target', title: traduire('Note tes charges'), text: traduire('Une charge notée aujourd’hui, c’est un record à battre la prochaine fois.'), action: traduire('Mes records'), href: '/records', tone: 'indigo' },
  ],
  motivation: [
    { picto: 'flame', title: traduire('Regarde le chemin'), text: traduire('Les jours sans envie, relis ce que tu as déjà fait. Chaque séance notée compte.'), action: traduire('Mes séances'), href: '/seances', tone: 'red' },
    { picto: 'steps', title: traduire('Juste commencer'), text: traduire('Juste dix minutes. Une fois lancé, le reste suit souvent.'), tone: 'gold' },
  ],
  blessures: [
    { picto: 'moon', title: traduire('Écoute ton corps'), text: traduire('Une douleur qui revient mérite du repos. Ta récupération du jour t’aide à choisir.'), action: traduire('Voir ta récupération'), href: '/readiness-detail', tone: 'indigo' },
    { picto: 'refresh', title: traduire('Monte doucement'), text: traduire('Augmente la charge petit à petit, pas tout d’un coup. Ton corps suit mieux.'), tone: 'gold' },
  ],
  programme: [
    { picto: 'play', title: traduire('Une idée de séance'), text: traduire('Pas besoin d’un plan parfait. Choisis un sport et note ce que tu as fait.'), action: traduire('M’entraîner'), href: '/seance', tone: 'red' },
    { picto: 'bolt', title: traduire('Repars de la dernière'), text: traduire('Reprends tes exercices de la dernière séance et ajoute un peu. C’est un plan.'), action: traduire('Mes séances'), href: '/seances', tone: 'red' },
  ],
};

/** Conseil lie a tes freins pour ce jour, ou null */
export function conseilFrein(freins: string[] | null | undefined, today: number): Conseil | null {
  const list = (freins ?? []).flatMap((f) => PAR_FREIN[f] ?? []);
  return list.length ? list[today % list.length] : null;
}

/**
 * trainings : toutes tes seances. lastWeighIso : date de ta derniere pesee. goal : seances voulues par semaine.
 */
/**
 * semaineVisible (16 octobre, grille de l'accueil) : la tuile Ta semaine montre deja tes seances et ton objectif ;
 * le conseil ne le repete pas (ni « Semaine réussie » ni « Encore n séances ») et passe au conseil suivant.
 */
export function conseilDuJour({ trainings, lastWeighIso, goal, now = new Date(), freins, semaineVisible = false }: { trainings: Training[]; lastWeighIso: string | null; goal: number; now?: Date; freins?: string[] | null; semaineVisible?: boolean }): Conseil {
  const todayIso = isoLocal(now);
  const today = dayIndex(todayIso);

  if (trainings.length === 0) {
    // un jour sur deux, le conseil lie a ce qui t'a freine (onboarding)
    const parFrein = today % 2 === 1 ? conseilFrein(freins, Math.floor(today / 2)) : null;
    if (parFrein) return parFrein;
    return { picto: 'play', title: traduire('Ta première séance'), text: traduire("Même 15{0}minutes aujourd’hui suffisent. Ta progression commence aujourd’hui.", NB), action: traduire('Commencer'), href: '/seance', tone: 'red' };
  }

  const days = Array.from(new Set(trainings.map((t) => t.date.slice(0, 10)))).sort();
  const lastDay = days[days.length - 1];
  const sinceLast = today - dayIndex(lastDay);

  if (sinceLast >= 10) {
    return { picto: 'repeat', title: traduire("{0}{1}jours sans séance", sinceLast, NB), text: traduire('Une séance courte aujourd’hui suffit pour relancer la machine.'), action: traduire('Reprendre'), href: '/seance', tone: 'red' };
  }

  const last7 = days.filter((d) => today - dayIndex(d) < 7 && today - dayIndex(d) >= 0).length;
  if (last7 >= 6) {
    return { picto: 'moon', title: traduire('Un jour de repos'), text: traduire("{0}{1}jours d’entraînement sur les 7 derniers. Ton corps progresse pendant la récupération.", last7, NB), action: traduire('Voir ta récupération'), href: '/readiness-detail', tone: 'indigo' };
  }

  // semaine calendaire, du lundi a aujourd'hui : regle unique de lib/v2/trainingWeek
  const weekSessions = trainingsThisWeek(trainings, todayIso).length;
  if (!semaineVisible && goal > 0 && weekSessions >= goal) {
    return { picto: 'check', title: traduire('Semaine réussie'), text: traduire("{0}{1}séances sur {2} cette semaine. Tout ce qui vient en plus est du bonus.", weekSessions, NB, goal), tone: 'moss' };
  }

  if (lastWeighIso) {
    const sinceWeigh = today - dayIndex(lastWeighIso);
    if (sinceWeigh >= 7) {
      return { picto: 'scale', title: traduire('Ta pesée de la semaine'), text: traduire("Ta dernière pesée date de {0}{1}jours. Dix secondes pour garder ta courbe juste.", sinceWeigh, NB), action: traduire('Me peser'), href: '/pesee', tone: 'indigo' };
    }
  }

  const dow = (now.getDay() + 6) % 7; // 0 = lundi
  const left = goal - weekSessions;
  if (!semaineVisible && goal > 0 && left > 0 && left >= 7 - dow - 1 && weekSessions > 0) {
    return { picto: 'target', title: traduirePluriel(left, left > 1, "Encore {0}{1}séance", "Encore {0}{1}séances", left, NB), text: traduirePluriel(7 - dow, 7 - dow > 1, "Tu en es à {0} sur {1} cette semaine. Il reste {2}{3}jour.", "Tu en es à {0} sur {1} cette semaine. Il reste {2}{3}jours.", weekSessions, goal, 7 - dow, NB), action: traduire('M’entraîner'), href: '/seance', tone: 'red' };
  }

  if (sinceLast === 1) {
    return { picto: 'flame', title: traduire('Garde le rythme'), text: traduire('Une séance hier. Une autre aujourd’hui et la régularité devient une habitude.'), action: traduire('M’entraîner'), href: '/seance', tone: 'red' };
  }

  const last14 = trainings.filter((t) => {
    const d = today - dayIndex(t.date);
    return d >= 0 && d < 14;
  });
  if (last14.length >= 5) {
    const counts = new Map<string, number>();
    last14.forEach((t) => {
      const s = (t.sport || '').split(',')[0].trim();
      if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
    });
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] / last14.length > 0.7) {
      const pct = Math.round((top[1] / last14.length) * 100);
      return { picto: 'refresh', title: traduire('Varie les armes'), text: traduire("{0}{1}% de tes séances récentes en {2}. Une autre discipline aujourd’hui réveille d’autres muscles.", pct, NB, getSportName(top[0])), action: traduire('Choisir'), href: '/seance', tone: 'gold' };
    }
  }

  return conseilFrein(freins, today) ?? SAGESSE[today % SAGESSE.length];
}

/**
 * Le texte du conseil coupe en morceaux, les chiffres cles a part (17 octobre, feuille du conseil : les chiffres en
 * couleur, comme le bilan). Un chiffre garde son unite collee (« 3 jours », « 80 % », « 15 minutes »).
 */
export function morceauxConseil(texte: string): { t: string; chiffre: boolean }[] {
  const re = /\d+(?:[,.]\d+)?(?:[\u00a0\u202f ](?:%|jours?|séances?|minutes?|min|kg))?/g;
  const out: { t: string; chiffre: boolean }[] = [];
  let i = 0;
  for (const m of texte.matchAll(re)) {
    const k = m.index ?? 0;
    if (k > i) out.push({ t: texte.slice(i, k), chiffre: false });
    out.push({ t: m[0], chiffre: true });
    i = k + m[0].length;
  }
  if (i < texte.length) out.push({ t: texte.slice(i), chiffre: false });
  return out;
}
