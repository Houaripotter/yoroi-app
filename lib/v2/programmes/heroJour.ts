/**
 * Ce que dit la grande carte du jour (26 octobre 2026), sur le Coach (app/coach.tsx) et la page du programme
 * (app/programmes/[id].tsx). Houari : « Je ne comprends pas pourquoi il me propose du cardio, c'est incompréhensible,
 * il faut que ce soit logique. » La carte dit donc :
 *  - quel programme et où tu en es : « Perdre du poids, 4 jours · séance 2 sur 4 cette semaine » ;
 *  - pourquoi cette séance, en une ligne tirée du contenu existant : la marche ajoute de la dépense avec peu de
 *    fatigue (modules.ts, cardio), la consigne d'une autre séance de cardio, la charge des exercices (charge.ts) ;
 *    un jour de repos ou une séance faite : le mot du coach (coach.ts) ;
 *  - la suite : « Puis ensuite : Push B, jeudi » ;
 *  - les ajouts de fin de séance, seulement un jour de musculation et seulement s'il y en a.
 * Données pures, testées dans __tests__/unit/coachDepart.test.ts.
 */
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { guideCharge, niveauCharge } from './charge';
import { indexJour, prochainJourPrevu } from './coach';
import type { MessageCoach } from './coach';
import { estJourMuscu } from './finSeance';
import { modulesActifs, moduleParId } from './modules';
import { faitsCetteSemaine, seancesAVenir } from './suivi';
import type { ProgrammeActif } from './suivi';
import type { JourProgramme, Programme } from './types';

const NOMS_JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export type InfosHero = {
  /** « Perdre du poids, 4 jours · séance 2 sur 4 cette semaine » */
  ligne: string;
  /** pourquoi cette séance, une ligne */
  pourquoi: string;
  /** « Puis ensuite : Push B, jeudi » ; un jour de repos : « Prochaine séance : jeudi, Push B. » */
  ensuite: string;
  /** « + Abdos », « + 20 min de marche » : un jour de musculation, seulement ce qui est ajouté */
  ajouts: string[];
};

/** « Push Pull + Upper Lower, 4 jours, jambes une fois » devient « Push Pull + Upper Lower » (texte traduit) */
export function nomDuProgramme(titre: string): string {
  return titre.split(',')[0].trim() || titre;
}

/** La première idée d'une phrase : jusqu'aux deux points ou au premier point */
export function premiereIdee(t: string): string {
  const m = /^(.+?)(\s?:\s|\.\s|\.$)/.exec(t.trim());
  return (m ? m[1] : t).trim();
}

/** Pourquoi cette séance, sans le mot de motivation */
export function pourquoiDuJour(jour: JourProgramme, semaine = 1): string {
  if (jour.cardio) {
    if (jour.cardio.sport === 'marche') return traduire('Marche : tu dépenses plus, avec peu de fatigue.');
    const s = jour.cardio.semaines?.length ? jour.cardio.semaines[Math.min(jour.cardio.semaines.length, Math.max(1, semaine)) - 1] : null;
    return premiereIdee(traduire(s?.consigne ?? jour.cardio.consigne));
  }
  if (jour.rounds) return jour.rounds.consignes[0] ? premiereIdee(traduire(jour.rounds.consignes[0])) : '';
  const charge = jour.exos.find((e) => niveauCharge(e) !== 'corps' && niveauCharge(e) !== 'tenu') ?? jour.exos[0];
  return charge ? premiereIdee(guideCharge(charge).pourquoi) : '';
}

/** Les ajouts de fin de séance d'un jour de musculation (rien un jour de cardio ou de rounds) */
export function ajoutsDuJour(jour: JourProgramme, actif: ProgrammeActif | null): string[] {
  if (!actif || !estJourMuscu(jour)) return [];
  return modulesActifs(actif).map((m) =>
    m === 'cardio'
      ? traduire('+ {0} min de marche', actif.fin?.minutes ?? 30)
      : traduire('+ {0}', traduire(moduleParId(m)?.label ?? m)),
  );
}

const nomJour = (d: Date, auj: Date): string => {
  const demain = new Date(auj.getFullYear(), auj.getMonth(), auj.getDate() + 1);
  return d.toDateString() === demain.toDateString() ? traduire('demain') : traduire(NOMS_JOURS[indexJour(d)]);
};

export function infosHero(opts: { programme: Programme; actif: ProgrammeActif; jour: JourProgramme; jours: number[]; message: MessageCoach; semaine?: number; aujourdhui?: Date }): InfosHero {
  const { programme: p, actif, jour, jours, message } = opts;
  const auj = opts.aujourdhui ?? new Date();
  const prevus = Math.max(1, jours.length || p.joursParSemaine);
  const faits = faitsCetteSemaine(actif, auj);
  const ou = message.seanceDuJour && faits < prevus
    ? traduire('séance {0} sur {1} cette semaine', faits + 1, prevus)
    : traduirePluriel(faits, faits > 1, '{0} séance sur {1} cette semaine', '{0} séances sur {1} cette semaine', faits, prevus);
  const ligne = `${traduire('{0}, {1} jours', nomDuProgramme(traduire(p.titre)), p.joursParSemaine)} · ${ou}`;

  const pourquoi = message.seanceDuJour ? pourquoiDuJour(jour, opts.semaine) : message.texte;

  let ensuite = '';
  if (!message.seanceDuJour) ensuite = message.ensuite;
  else {
    const suite = seancesAVenir(actif, 2)[1];
    if (suite && suite.jour.id !== jour.id && jours.length) {
      const d = prochainJourPrevu(jours, auj, false);
      ensuite = traduire('Puis ensuite : {0}, {1}', nomDuProgramme(traduire(suite.jour.titre).split(/\s?:\s/)[0]), nomJour(d, auj));
    }
  }
  return { ligne, pourquoi, ensuite, ajouts: ajoutsDuJour(jour, actif) };
}
