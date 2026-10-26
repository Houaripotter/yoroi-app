/**
 * Mesure de l'onboarding, branchee sur utils/telemetry.ts (13 octobre 2026).
 *
 * onboarding_etape : un evenement par ecran atteint, dans l'ordre.
 * onboarding_choix : envoye en QUITTANT un ecran vers l'avant, a partir du brouillon. Decisions de Houari :
 *  . le genre, l'univers, l'objectif et la famille de sport partent en identifiant de liste fermee ;
 *  . le frein ne part qu'en renseigne ou passe (il peut contenir une blessure) ;
 *  . poids, taille, cap : jamais la valeur, seulement la methode ou renseigne et passe.
 *  . 26 octobre 2026 : le genre peut valoir « autre » (le repere homme ou femme des calculs ne part pas) ;
 *    la tranche d'age part en propriete utilisateur tranche_age (jamais l'age ni la date de naissance),
 *    l'evenement de l'ecran ne dit que renseigne ou passe.
 */
import { familleDeSport, setProprietes, track, trancheNombre, type ChoixOnboarding, type EtapeOnboarding, type Famille } from '@/utils/telemetry';
import type { Draft } from './draft';

/** Noms internes de app/onboarding.tsx vers les etapes de la mesure */
const ETAPES: Record<string, EtapeOnboarding> = {
  ouverture: 'accroche',
  prenom: 'prenom',
  toi: 'toi',
  age: 'age',
  univers: 'univers',
  objectif: 'objectif',
  frein: 'frein',
  affirmation: 'affirmation',
  sport: 'sport',
  poids: 'poids',
  taille: 'taille',
  cap: 'cap',
  rythme: 'rythme',
  moment_pesee: 'moment',
  demonstration: 'demo',
  comparaison: 'comparaison',
  preparation: 'forge',
  plan: 'resultat',
  premium: 'premium',
};

const OBJECTIFS: Record<string, 'perdre' | 'prendre' | 'combat' | 'maintenir'> = {
  lose: 'perdre',
  gain: 'prendre',
  combat: 'combat',
  maintain: 'maintenir',
};

/** En apercu du Studio, rien ne compte */
let apercu = false;
export function setApercuOnboarding(v: boolean): void {
  apercu = v;
}

/** Point d'accroche historique de app/onboarding.tsx */
export function onboardingEvent(nom: string, donnees?: Record<string, unknown>): void {
  if (apercu) return;
  if (nom === 'ecran') {
    const etape = ETAPES[String(donnees?.ecran ?? '')];
    if (etape) track('onboarding_etape', { etape });
    return;
  }
  if (nom === 'fin') {
    const par = donnees?.par;
    if (par === 'restauration') track('onboarding_restauration', { resultat: 'ok' });
    else track('onboarding_termine', { statut: par === 'premium' ? 'abonne' : 'gratuit' });
  }
  // 'reponse', 'passer', 'reprise', 'abandon' : les choix partent par choixOnboarding, en quittant l'ecran
}

function famillePrincipale(sports: string[]): Famille | null {
  if (!sports.length) return null;
  const compte: Record<Famille, number> = { muscu: 0, combat: 0, cardio: 0, autre: 0 };
  for (const s of sports) compte[familleDeSport(s)] += 1;
  return (Object.entries(compte).sort((a, b) => b[1] - a[1])[0][0]) as Famille;
}

/** A appeler quand on quitte un ecran vers l'avant. nomEcran : nom interne (NAMES de app/onboarding.tsx). */
export function choixOnboarding(nomEcran: string, d: Draft): void {
  const etape = ETAPES[nomEcran];
  if (!etape || apercu) return;
  const choix = (c: ChoixOnboarding) => track('onboarding_choix', { etape, choix: c });
  switch (etape) {
    case 'toi':
      choix(d.gender ?? 'passe');
      setProprietes({ genre: d.gender ?? 'non_renseigne' });
      return;
    case 'age':
      choix(d.trancheAge ? 'renseigne' : 'passe');
      setProprietes({ tranche_age: d.trancheAge ?? 'non_renseigne' });
      return;
    case 'univers':
      choix(d.univers);
      setProprietes({ univers: d.univers });
      return;
    case 'objectif': {
      const liste = d.goals.map((g) => OBJECTIFS[g]).filter(Boolean);
      if (!liste.length) choix('passe');
      for (const o of liste) choix(o);
      setProprietes({ objectif_principal: d.goal ? OBJECTIFS[d.goal] ?? 'aucun' : 'aucun', mode: d.goals.includes('combat') ? 'competiteur' : 'loisir' });
      return;
    }
    case 'frein':
      choix(d.freins.length ? 'renseigne' : 'passe');
      return;
    case 'sport': {
      if (!d.sports.length) {
        choix('passe');
        return;
      }
      const familles = new Set(d.sports.map((s) => familleDeSport(s)));
      for (const f of familles) track('onboarding_choix', { etape, famille: f, tranche_nombre: trancheNombre(d.sports.length) });
      const p = famillePrincipale(d.sports);
      if (p) setProprietes({ famille_principale: p });
      return;
    }
    case 'poids':
      choix(d.weightOrigin === 'health' ? 'sante' : 'regle');
      return;
    case 'taille':
      choix(d.height ? 'renseigne' : 'passe');
      return;
    case 'cap':
      choix(d.target != null ? 'renseigne' : 'passe');
      return;
    case 'rythme':
      track('onboarding_choix', { etape, tranche_nombre: trancheNombre(d.jours.length) });
      return;
    case 'moment':
      choix(d.peseeMoment && d.peseeMoment !== 'inconnu' ? d.peseeMoment : 'passe');
      return;
    default:
      return;
  }
}
