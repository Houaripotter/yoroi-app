/**
 * Ouvrir la seance d'un jour de programme (24 octobre 2026) : musculation, rounds (sac de frappe) ou cardio.
 * Course a pied : la consigne avance de semaine en semaine (CardioProgramme.semaines).
 * 26 octobre 2026 : fin de seance (finSeance.ts). Un jour de musculation du programme actif recoit l'abdo et
 * le cardio choisis ; le bloc cardio part dans les notes de la seance et dans le resume du jour.
 * 26 octobre 2026 : modules (modules.ts). Grip, cou et force sont dans les exercices ; le bloc d'etirements
 * (mobilite) part dans les notes et le resume, apres le cardio.
 */
import { traduire } from '@/lib/i18n/tr';
import { contexteFinPour } from './finSeance';
import { avecModules } from './modules';
import type { AvecModules } from './modules';
import type { CardioProgramme, JourProgramme, Programme } from './types';

/** Le jour avec sa fin de seance et ses modules (deja calcules, ou ceux du programme actif) */
function complet<J extends JourProgramme>(j: J): J & AvecModules {
  const x = j as J & AvecModules;
  return x.finFaite || x.modulesFaits ? x : avecModules(j, contexteFinPour(j));
}

/** « Fin de séance : 30 minutes de marche inclinée... », puis « Étirements : ... », pour les notes de la seance */
export function noteFinCardio(j: JourProgramme): string {
  const x = complet(j);
  const c = x.finCardio;
  const e = x.finEtirements;
  const notes = [
    c ? traduire('Fin de séance : {0}', traduire(c.consigne)) : '',
    e ? traduire('Étirements, {0} min : {1}', e.minutes, traduire(e.consigne)) : '',
  ].filter(Boolean);
  return notes.join('\n\n');
}

/** La sortie de la semaine N du programme (1 la premiere) ; la derniere entree sert ensuite */
export function cardioDeLaSemaine(c: CardioProgramme, semaine = 1): { minutes: number; consigne: string } {
  if (!c.semaines?.length) return { minutes: c.minutes, consigne: c.consigne };
  const i = Math.min(Math.max(1, Math.floor(semaine)), c.semaines.length) - 1;
  return c.semaines[i];
}

export function routeDuJour(p: Programme, j: JourProgramme, semaine = 1): { pathname: string; params: Record<string, string> } {
  const base = { programme: p.id, jour: j.id };
  if (j.rounds) {
    return {
      pathname: '/seance/combat',
      params: { ...base, sport: j.rounds.sport, rounds: String(j.rounds.nombre), roundSec: String(j.rounds.dureeSec), restSec: String(j.rounds.reposSec), label: traduire(j.titre) },
    };
  }
  if (j.cardio) {
    const s = cardioDeLaSemaine(j.cardio, semaine);
    return { pathname: '/seance/cardio', params: { ...base, sport: j.cardio.sport, label: traduire(j.titre), notes: traduire(s.consigne) } };
  }
  const note = noteFinCardio(j);
  return { pathname: '/seance/muscu', params: { ...base, sport: 'musculation', ...(note ? { notes: note } : {}) } };
}

/** Resume court d'un jour : « 6 exercices, 20 séries », « 8 rounds de 3 min », « 25 min de course » */
export function resumeDuJour(jour: JourProgramme, semaine = 1): string {
  const j = complet(jour);
  if (j.rounds) {
    const d = j.rounds.dureeSec % 60 === 0 ? `${j.rounds.dureeSec / 60} min` : `${j.rounds.dureeSec} s`;
    return traduire('{0} rounds de {1}', j.rounds.nombre, d);
  }
  if (j.cardio) {
    const m = cardioDeLaSemaine(j.cardio, semaine).minutes;
    if (j.cardio.sport === 'running') return traduire('{0} min de course', m);
    if (j.cardio.sport === 'marche') return traduire('{0} min de marche', m);
    if (j.cardio.sport === 'stretching') return traduire('{0} min d’étirements', m);
    return traduire('{0} min de cardio', m);
  }
  const base = traduire('{0} exercices, {1} séries', j.exos.length, j.exos.reduce((n, e) => n + e.series, 0));
  const avecMarche = j.finCardio ? traduire('{0}, puis {1} min de marche', base, j.finCardio.minutes) : base;
  return j.finEtirements ? traduire('{0}, puis {1} min d’étirements', avecMarche, j.finEtirements.minutes) : avecMarche;
}

/**
 * Le texte du message du jour : « Pectoraux : 5 exercices, 18 séries, environ 60 min »,
 * « Sortie 2 : 5 min de marche rapide. Puis 8 fois... ». Jamais de chiffre de sante.
 */
export function messageDuJour(p: Programme, jour: JourProgramme, semaine = 1): { titre: string; corps: string } {
  const j = complet(jour);
  const titre = traduire('Aujourd’hui : {0}', traduire(j.titre));
  if (j.cardio) return { titre, corps: traduire(cardioDeLaSemaine(j.cardio, semaine).consigne) };
  if (j.rounds) return { titre, corps: traduire('{0}, au sac. Ouvre YOROI pour lancer le chrono.', resumeDuJour(j, semaine)) };
  const noms = j.exos.slice(0, 3).map((e) => traduire(e.nom)).join(', ');
  return { titre, corps: traduire('{0}, environ {1} min. On commence par : {2}.', resumeDuJour(j, semaine), p.dureeMin, noms) };
}
