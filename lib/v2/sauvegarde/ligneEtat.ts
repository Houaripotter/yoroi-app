/**
 * La ligne d'etat de la sauvegarde dans Reglages, Donnees et sauvegardes (7 novembre 2026). Pure, testee dans
 * __tests__/unit/sauvegardeAuto.test.ts.
 *  - vert : « Dernière sauvegarde iCloud : il y a 12 min ✓ » (une vraie copie de moins de 48 heures) ;
 *  - rouge : plus de 48 heures sans copie, ou la derniere a rate : « La sauvegarde n'a pas marché depuis le 4 novembre »,
 *    avec le bouton « Sauvegarder maintenant » ;
 *  - gris : iCloud indisponible (ou aucun dossier relie sur Android), dit simplement.
 * Android : meme ligne, sur la derniere copie reussie dans le dossier relie (Google Drive).
 */
import { DELAI_PROTEGE_MS, derniereReussite, nomDuCloud, type InfosProtection } from './copieAuto';
import { traduire, traduirePluriel, LOCALE } from '@/lib/i18n/tr';

export type LigneEtat = { ton: 'vert' | 'rouge' | 'gris'; texte: string; bouton: boolean };

/** « à l'instant », « il y a 12 min », « il y a 3 h », « il y a 2 jours » */
export function ilYa(ms: number, now = Date.now()): string {
  const min = Math.max(0, Math.floor((now - ms) / 60000));
  if (min < 1) return traduire('à l’instant');
  if (min < 60) return traduire('il y a {0} min', min);
  const h = Math.floor(min / 60);
  if (h < 24) return traduire('il y a {0} h', h);
  const j = Math.floor(h / 24);
  return traduirePluriel(j, j > 1, 'il y a {0} jour', 'il y a {0} jours', j);
}

const jour = (ms: number) => new Date(ms).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' });

export function ligneEtatSauvegarde(i: InfosProtection, os: string, now = Date.now()): LigneEtat {
  if (os === 'web') return { ton: 'gris', texte: traduire('La sauvegarde automatique marche sur le téléphone, pas sur le web.'), bouton: false };
  const icloudActif = os === 'ios' && !!i.icloud;
  if (!icloudActif && !i.connecte) {
    if (os === 'ios') return { ton: 'gris', texte: traduire('iCloud n’est pas disponible sur ce téléphone. Connecte-toi à iCloud et active iCloud Drive dans les Réglages de l’iPhone.'), bouton: false };
    return { ton: 'gris', texte: traduire('Aucun dossier Google Drive relié : tes sauvegardes restent sur ce téléphone.'), bouton: false };
  }
  const derniere = derniereReussite({ ...i, succesICloud: icloudActif ? i.succesICloud : 0 });
  const vientDeICloud = icloudActif && !!i.succesICloud && i.succesICloud >= (i.connecte ? i.succes || 0 : 0);
  const lieu = vientDeICloud ? 'iCloud' : nomDuCloud(os);
  const echec = Math.max(icloudActif ? i.echecICloud || 0 : 0, i.connecte ? i.echec || 0 : 0);
  if (!derniere) {
    // jamais essaye (tout juste installe) : la premiere copie part bientot
    if (!echec && !(icloudActif && i.premierEssaiICloud)) return { ton: 'gris', texte: traduire('Pas encore de sauvegarde {0}. La première part toute seule.', icloudActif ? 'iCloud' : lieu), bouton: true };
    return { ton: 'rouge', texte: traduire('La sauvegarde {0} n’a encore jamais marché.', icloudActif ? 'iCloud' : lieu), bouton: true };
  }
  const recente = now - derniere < DELAI_PROTEGE_MS;
  if (recente && echec <= derniere) return { ton: 'vert', texte: `${traduire('Dernière sauvegarde {0} : {1}', lieu, ilYa(derniere, now))}\u00a0✓`, bouton: false };
  return { ton: 'rouge', texte: traduire('La sauvegarde n’a pas marché depuis le {0}', jour(derniere)), bouton: true };
}
