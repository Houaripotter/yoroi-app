/**
 * onboarding-neuf/reponses.ts
 *
 * Les reponses reprises par l'ecran de chargement (plan B8) : ton prenom, tes objectifs, tes sports, tes jours, ton
 * univers et ta tranche d'age, en clair, sans doublon. Et les trois etapes, avec le vrai nombre de jours et le vrai
 * cap. Aucune valeur n'est inventee : sans jours ou sans cap, la phrase generale. Logique testee.
 */

import { getSportName } from '@/lib/sports';
import { JOURS_COURTS } from '@/components/yoroi/v2/espace/JoursPicker';
import { UNIVERS_CHOIX } from '@/lib/v2/dojo/univers';
import { objectifsPropres } from '@/lib/v2/onboarding/objectifs';
import type { Goal } from '@/lib/v2/onboarding/draft';
import type { TrancheAge } from '@/lib/v2/onboarding/trancheAge';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { kg } from '@/components/yoroi/v2/onboarding/ui';

const LIBELLE_OBJECTIF: Record<Goal, () => string> = {
  lose: () => traduire('Perdre du poids'),
  gain: () => traduire('Prendre du muscle'),
  combat: () => traduire('Performer en combat'),
  maintain: () => traduire('Me maintenir'),
};

const LIBELLE_TRANCHE: Record<TrancheAge, () => string> = {
  moins_18: () => traduire('Moins de 18 ans'),
  '18_24': () => traduire('18 à 24 ans'),
  '25_34': () => traduire('25 à 34 ans'),
  '35_44': () => traduire('35 à 44 ans'),
  '45_54': () => traduire('45 à 54 ans'),
  '55_plus': () => traduire('55 ans et plus'),
};

export type ReponsesBrouillon = {
  name: string;
  goals: Goal[];
  sports: string[];
  jours: number[];
  univers: 'japon' | 'classique' | 'aucun';
  trancheAge: TrancheAge | null;
};

/** « Lun., Mer., Ven. » : les jours choisis, en court, dans l'ordre de la semaine */
export function joursCourts(jours: number[]): string {
  const l = Array.from(new Set(jours)).filter((j) => Number.isInteger(j) && j >= 0 && j <= 6).sort((a, b) => a - b);
  return l.map((j) => {
    const c = JOURS_COURTS[j];
    return c.charAt(0).toUpperCase() + c.slice(1);
  }).join(', ');
}

/** Les pastilles qui flottent pendant le chargement, sans le prenom (il est a part, en grand) */
export function reponsesChargement(d: ReponsesBrouillon): string[] {
  const out: string[] = [];
  const vues = new Set<string>();
  const ajoute = (x: string | null | undefined) => {
    const t = (x ?? '').trim();
    if (!t || vues.has(t.toLowerCase())) return;
    vues.add(t.toLowerCase());
    out.push(t);
  };
  objectifsPropres(d.goals).forEach((g) => ajoute(LIBELLE_OBJECTIF[g]()));
  d.sports.slice(0, 2).forEach((s) => ajoute(getSportName(s) ?? s));
  if (d.jours.length) ajoute(joursCourts(d.jours));
  const u = UNIVERS_CHOIX.find((x) => x.id === d.univers);
  if (u) ajoute(traduire(u.nom));
  if (d.trancheAge) ajoute(LIBELLE_TRANCHE[d.trancheAge]());
  return out;
}

/** Les trois etapes du chargement, avec le vrai nombre de jours et le vrai cap */
export function etapesChargement(jours: number, cap: number | null): string[] {
  return [
    traduire('On récupère tes réponses...'),
    jours > 0 ? traduirePluriel(jours, jours > 1, 'On prépare ta semaine de {0} séance...', 'On prépare ta semaine de {0} séances...', jours) : traduire('On prépare ta semaine...'),
    cap != null ? traduire('On trace ton chemin vers {0} kg...', kg(cap)) : traduire('On prépare ton suivi de poids...'),
  ];
}
