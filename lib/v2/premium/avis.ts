/**
 * Avis REELS de YOROI sur l'App Store, la seule liste de l'app (accroche de l'onboarding et paywall).
 * Releves par Houari dans App Store Connect le 11 octobre 2026.
 * Extraits fideles : on peut couper avec « … », jamais changer un mot (fautes comprises),
 * et on coupe avant les emojis. N'en ajoute aucun qui ne soit pas publie sur un store.
 */

import { traduire } from '@/lib/i18n/tr';
export type Avis = {
  /** extrait fidele de l'avis */
  texte: string;
  /** pseudo tel qu'il apparait sur le store */
  pseudo: string;
  store: 'App Store' | 'Google Play';
  /** note donnee avec l'avis, sur 5 */
  note: number;
};

export const AVIS_VERIFIES_LE = '2026-10-11';

export const AVIS: Avis[] = [
  { texte: traduire('Application hyper intuitive ! … Elle permet de suivre facilement le sommeil, l’alimentation et le sport.'), pseudo: 'AbdelBCH', store: 'App Store', note: 5 },
  { texte: traduire('Interface super clean, super agréable à utiliser et surtout ultra complète'), pseudo: 'Kgc 2012 khey', store: 'App Store', note: 5 },
  { texte: traduire('J’adore de cet appli notamment pour le suivis intégrale sport, marche à pied, un suivis du poids avec des balance connectée direct'), pseudo: 'cristony-7', store: 'App Store', note: 5 },
  { texte: traduire('Moi aussi je suis pratiquant de JJB. … C’est un peu l’application que j’aurais aimé développer.'), pseudo: 'jmnog13009', store: 'App Store', note: 5 },
  { texte: traduire('En tant que débutante l’application es très bien pensée'), pseudo: 'Sassasouh', store: 'App Store', note: 5 },
  { texte: traduire('Une appli indispensable dans la routine quotidienne Merci au créateur.'), pseudo: 'Junior 143@143', store: 'App Store', note: 5 },
  { texte: traduire('Cette application me sert énormément lors de mes coachings'), pseudo: 'Ryanmoh13', store: 'App Store', note: 5 },
  { texte: traduire('M’a énormément aidé dans ma perte de poids poste grossesse. Je recommande'), pseudo: 'Sarah Lazli', store: 'App Store', note: 5 },
];
