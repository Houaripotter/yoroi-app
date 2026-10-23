/**
 * Identifiants des actions recues de l'Apple Watch (contrat de synchro v1), gardes dans le telephone.
 * Sert a deux choses : ne jamais appliquer deux fois la meme action (transferUserInfo et sendMessage
 * portent la meme charge), et faire ignorer a l'import Apple Sante ce que la montre y a deja ecrit
 * (HKMetadataKeyExternalUUID = id de l'action). Aucune dependance lourde : lu aussi par lib/healthConnect.ios.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'yoroi_montre_ids_recus_v1';
const MAX = 1000;
/** Bundle de l'app montre : ses echantillons Apple Sante sont deja dans YOROI */
export const BUNDLE_MONTRE = 'com.houari.yoroi.watchkitapp';

let ids: string[] = [];
let set = new Set<string>();
let charge: Promise<void> | null = null;

/** Charge la liste gardee (une seule fois par lancement) */
export function chargerIdsMontre(): Promise<void> {
  if (!charge) {
    charge = AsyncStorage.getItem(KEY)
      .then((raw) => {
        const v = raw ? JSON.parse(raw) : [];
        if (Array.isArray(v)) {
          const lus = v.filter((x): x is string => typeof x === 'string');
          // garde aussi ceux ajoutes pendant la lecture
          ids = [...lus, ...ids.filter((x) => !lus.includes(x))].slice(-MAX);
          set = new Set(ids);
        }
      })
      .catch(() => undefined);
  }
  return charge;
}

/** Vrai si cette action de la montre a deja ete appliquee */
export function idMontreDejaRecu(id: string | null | undefined): boolean {
  return !!id && set.has(String(id));
}

/** Retient une action appliquee */
export async function retenirIdMontre(id: string): Promise<void> {
  if (!id || set.has(id)) return;
  ids.push(id);
  if (ids.length > MAX) ids = ids.slice(-MAX);
  set = new Set(ids);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // reste en memoire pour ce lancement
  }
}

/**
 * Echantillon Apple Sante ecrit par l'app montre YOROI : par son bundle, ou par son identifiant externe
 * (HKMetadataKeyExternalUUID, cle brute « HKExternalUUID ») egal a une action deja recue.
 */
export function vientDeLaMontre(sample: any): boolean {
  const bundle = String(sample?.sourceRevision?.source?.bundleIdentifier ?? sample?.sourceBundleId ?? '').toLowerCase();
  if (bundle === BUNDLE_MONTRE) return true;
  const meta = sample?.metadata;
  if (!meta || typeof meta !== 'object') return false;
  const ext = meta.HKExternalUUID ?? meta.HKMetadataKeyExternalUUID;
  return typeof ext === 'string' && set.has(ext);
}
