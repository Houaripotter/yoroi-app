/**
 * Ecran « Relie tes appareils » (31 octobre 2026) : quelle etape montrer, en logique pure (teste dans
 * __tests__/unit/ecranRelier.test.ts). L'ecran est app/sync-devices.tsx, le rendu components/yoroi/v2/synchro/Relier.tsx.
 *
 * Deroule voulu par Houari (« un truc hyper simple ») :
 *  1. Ouvrir l'ecran sur les deux appareils : ils se voient tout seuls (module natif Multipeer).
 *  2. Toucher « Relier » sur l'un : il affiche un code a 6 chiffres en grand, l'autre propose aussitot de le taper.
 *  3. Taper le code sur l'autre : appairage SPAKE2 (lib/v2/sync/appairageSpake.ts), puis synchro automatique.
 *
 * 1er novembre 2026 : si les deux touchent « Relier » en meme temps, un seul garde son code (lib/peerSyncService.ts,
 * recevoirAnnonce) ; un code faux est dit tout de suite (« mauvais_code ») et la saisie se rouvre.
 *
 * Pourquoi taper le code et pas « C'est le meme code » : avec SPAKE2, le code EST le secret partage. L'afficher
 * sur les deux ecrans voudrait dire le faire circuler, ou passer a un autre protocole (comparaison d'empreinte,
 * comme le Bluetooth) qu'il faudrait concevoir et verifier a part. Taper le code garde la securite actuelle :
 * aucun essai hors ligne possible, 5 essais en direct au plus.
 */

export type EtapeRelier =
  | 'indisponible' // module natif absent (Expo Go, web, Android)
  | 'cherche' // « Cherche tes appareils… »
  | 'probleme' // rien trouve apres un moment, ou recherche impossible
  | 'trouve' // un appareil YOROI non relie est a cote : bouton « Relier »
  | 'montre_code' // cet appareil affiche le code
  | 'tape_code' // l'autre affiche un code : on le tape ici
  | 'attend' // code tape, verification en cours
  | 'relies'; // au moins un appareil appaire est relie en ce moment

/** Sans rien trouver pendant ce temps, l'ecran passe a « Probleme » avec les conseils */
export const DELAI_PROBLEME_MS = 20_000;

export interface EntreeRelier {
  disponible: boolean;
  /** Heure de debut de la recherche, null si elle ne tourne pas */
  rechercheDepuis: number | null;
  maintenant: number;
  /** Appareils YOROI vus ou relies a proximite (noms) */
  aProximite: string[];
  /** Appareils appaires relies en ce moment (noms) */
  connectes: string[];
  /** Noms des appareils deja appaires */
  nomsPaires: string[];
  appairage: { role: 'affiche' | 'saisit' } | null;
  invitation: { expireA: number } | null;
  /** L'utilisateur a ouvert la saisie du code lui meme (« J'ai un code ») */
  saisieOuverte: boolean;
  erreurReseau: boolean;
}

/** Appareils proches a proposer avec « Relier » : ni relies, ni deja appaires (ceux la se relient tout seuls) */
export function appareilsAProposer(e: Pick<EntreeRelier, 'aProximite' | 'connectes' | 'nomsPaires'>): string[] {
  const exclus = new Set([...e.connectes, ...e.nomsPaires]);
  const vus = new Set<string>();
  const out: string[] = [];
  for (const nom of e.aProximite) {
    if (!nom || exclus.has(nom) || vus.has(nom)) continue;
    vus.add(nom);
    out.push(nom);
  }
  return out;
}

export function etapeRelier(e: EntreeRelier): EtapeRelier {
  if (!e.disponible) return 'indisponible';
  if (e.appairage?.role === 'affiche') return 'montre_code';
  if (e.appairage?.role === 'saisit') return 'attend';
  if (e.saisieOuverte || (e.invitation && e.invitation.expireA > e.maintenant)) return 'tape_code';
  if (e.connectes.length > 0) return 'relies';
  if (appareilsAProposer(e).length > 0) return 'trouve';
  if (e.erreurReseau) return 'probleme';
  if (e.rechercheDepuis != null && e.maintenant - e.rechercheDepuis > DELAI_PROBLEME_MS) return 'probleme';
  return 'cherche';
}

/** Secondes restantes avant l'expiration du code (jamais negatif) */
export function secondesRestantes(expireA: number, maintenant: number): number {
  return Math.max(0, Math.ceil((expireA - maintenant) / 1000));
}

/** Ce qui est tape dans la case du code : chiffres seulement, 6 au plus (un code colle avec des espaces passe) */
export function nettoyerCode(t: string): string {
  return String(t ?? '').replace(/\D/g, '').slice(0, 6);
}
