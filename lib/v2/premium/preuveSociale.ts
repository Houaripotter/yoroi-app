/**
 * LA PREUVE SOCIALE DE YOROI, en un seul fichier : les vraies notes des stores et les vrais avis.
 * Tout ce qui montre une note ou un avis dans l'app lit ce fichier (nouvel onboarding, paywall, offre, accroche).
 *
 * Releve a la main par Houari le 11 octobre 2026 :
 *  - App Store Connect : 43 notes, moyenne 5 sur 5, et les 8 avis ci-dessous ;
 *  - Google Play Console : 6 notes, moyenne 5 sur 5.
 *
 * POUR METTRE A JOUR : changer RELEVE_LE, les deux notes, et ajouter ou retirer des avis dans AVIS_STORES.
 * Regles : jamais une note ou un avis invente. Extraits fideles : on peut couper avec « … », jamais changer un mot
 * (fautes comprises), et on coupe avant les emojis. Une note a null ne s'affiche pas.
 */

import { traduire } from '@/lib/i18n/tr';

/** Date du dernier releve sur les stores (AAAA-MM-JJ) */
export const RELEVE_LE = '2026-10-11';

export type NoteStore = { note: number; notes: number };

/** Les notes des stores, releve du 11 octobre 2026 */
export const NOTES_STORES: { appStore: NoteStore | null; googlePlay: NoteStore | null } = {
  appStore: { note: 5, notes: 43 },
  googlePlay: { note: 5, notes: 6 },
};

export type AvisStore = {
  /** extrait fidele de l'avis */
  texte: string;
  /** pseudo tel qu'il apparait sur le store */
  pseudo: string;
  store: 'App Store' | 'Google Play';
  /** note donnee avec l'avis, sur 5 */
  note: number;
};

/** Les vrais avis, releve du 11 octobre 2026 (tous sur l'App Store) */
export const AVIS_STORES: AvisStore[] = [
  { texte: traduire('Application hyper intuitive ! … Elle permet de suivre facilement le sommeil, l’alimentation et le sport.'), pseudo: 'AbdelBCH', store: 'App Store', note: 5 },
  { texte: traduire('Interface super clean, super agréable à utiliser et surtout ultra complète'), pseudo: 'Kgc 2012 khey', store: 'App Store', note: 5 },
  { texte: traduire('J’adore de cet appli notamment pour le suivis intégrale sport, marche à pied, un suivis du poids avec des balance connectée direct'), pseudo: 'cristony-7', store: 'App Store', note: 5 },
  { texte: traduire('Moi aussi je suis pratiquant de JJB. … C’est un peu l’application que j’aurais aimé développer.'), pseudo: 'jmnog13009', store: 'App Store', note: 5 },
  { texte: traduire('En tant que débutante l’application es très bien pensée'), pseudo: 'Sassasouh', store: 'App Store', note: 5 },
  { texte: traduire('Une appli indispensable dans la routine quotidienne Merci au créateur.'), pseudo: 'Junior 143@143', store: 'App Store', note: 5 },
  { texte: traduire('Cette application me sert énormément lors de mes coachings'), pseudo: 'Ryanmoh13', store: 'App Store', note: 5 },
  { texte: traduire('M’a énormément aidé dans ma perte de poids poste grossesse. Je recommande'), pseudo: 'Sarah Lazli', store: 'App Store', note: 5 },
];
