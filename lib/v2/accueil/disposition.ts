/**
 * Disposition de l'accueil (vague 36) : l'ordre et la visibilite des blocs sous la carte Poids.
 * Le haut (scene, raccourcis du jour, Ton poids) est fixe ; le reste se montre, se cache et se reordonne
 * depuis « Personnaliser l'accueil ». Memorise dans AsyncStorage, partage entre ecrans par un evenement.
 * Vague 37 : « Tes outils » monte sous l'en-tete (les raccourcis) et quitte les blocs ; « Ton mois » (le calendrier
 * de tes seances) arrive en bas. Une disposition deja memorisee perd « outils » et gagne « mois » a la fin
 * (propre, ci-dessous), sans rien perdre de ton ordre ni de ce que tu as cache.
 * 16 octobre : quatre blocs en plus (BLOCS_EN_PLUS, lib/v2/accueil/enPlus.ts) et le bloc Activite (pas, calories
 * actives, minutes d'exercice).
 * 17 octobre (Houari : « afficher d'autres choses comme les pas, quoi qu'il arrive, et l'utilisateur pourra les
 * désactiver tout en bas de l'accueil ») : tous les blocs sont affiches par defaut. Une disposition memorisee avant
 * le 17 octobre (sans v ou v < 2) les recoit visibles une seule fois (MIGRATION_17) ; ensuite, un bloc que tu
 * decoches reste cache : la disposition ecrite porte v = 2 et la migration ne repasse plus.
 * 17 octobre (Houari : « un rectangle avec tous les éléments ») : Activite et Coeur au repos ne font plus qu'un bloc,
 * « Ta santé aujourd'hui » (id 'activite', une tuile pleine largeur : pas, calories, distance, exercice, FC, FC au
 * repos, SpO2, respiration, sommeil, debout). L'ancien bloc 'sante' disparait des dispositions memorisees ; s'il etait
 * affiche alors qu'Activite etait decoche, la nouvelle tuile reste affichee (v = 3, une seule fois).
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { traduire } from '@/lib/i18n/tr';

export type BlocAccueil = 'semaine' | 'activite' | 'forme' | 'mange' | 'rendezvous' | 'conseil' | 'mois' | 'progres' | 'pesee' | 'photos';

/** L'ancien bloc Coeur au repos (16 et 17 octobre), fondu dans « Ta santé aujourd'hui » */
const ANCIEN_COEUR = 'sante';

export const BLOCS_ACCUEIL: { id: BlocAccueil; titre: string; aide: string }[] = [
  { id: 'semaine', titre: traduire('Ta semaine'), aide: traduire('ta prochaine séance, ton objectif, ta dernière séance') },
  // 17 octobre : un seul rectangle Sante, a la place d'Activite et de Coeur au repos
  { id: 'activite', titre: traduire('Ta santé aujourd’hui'), aide: traduire('pas, calories, distance, cœur, oxygène, respiration, sommeil, depuis Santé') },
  { id: 'forme', titre: traduire('Ta forme du jour'), aide: traduire('récupération, sommeil, eau, mensurations') },
  // 16 octobre (agent MANGÉ) : une ligne discrète, seulement si ton app de repas écrit dans Santé ; sinon rien
  { id: 'mange', titre: traduire('Mangé aujourd’hui'), aide: traduire('calories et protéines de ton app de repas, seulement si elle écrit dans Santé') },
  { id: 'rendezvous', titre: traduire('Ta compétition'), aide: traduire('seulement quand tu as ajouté une compétition à venir') },
  { id: 'conseil', titre: traduire('Ta citation du jour'), aide: traduire('une phrase sous tes outils ; touche cette phrase pour le conseil du jour') },
  { id: 'mois', titre: traduire('Ton mois'), aide: traduire('ton calendrier, le logo de ton club sur chaque séance') },
  // 16 octobre : blocs en plus ; 17 octobre : affiches par defaut, avec un etat vide utile tant que l'app n'a pas la donnee
  { id: 'progres', titre: traduire('Records et régularité'), aide: traduire('ton dernier record, tes semaines d’affilée à l’objectif') },
  { id: 'pesee', titre: traduire('Ta prochaine pesée'), aide: traduire('le prochain de tes jours de pesée') },
  { id: 'photos', titre: traduire('Avant, après'), aide: traduire('ta première et ta dernière photo') },
];

/** Blocs en plus (16 octobre). 17 octobre : affiches par defaut comme les autres, decochables dans Tes blocs */
export const BLOCS_EN_PLUS: BlocAccueil[] = ['progres', 'pesee', 'photos'];

/** Blocs rendus visibles une seule fois dans une disposition memorisee avant le 17 octobre */
export const MIGRATION_17: BlocAccueil[] = ['activite', ...BLOCS_EN_PLUS];

/** Version de la disposition : 2 = migration du 17 octobre deja faite ; 3 = Coeur au repos fondu dans Ta sante aujourd'hui */
export const VERSION_DISPOSITION = 3;

export type Disposition = { ordre: BlocAccueil[]; caches: BlocAccueil[]; v?: number };

export const DISPOSITION_DEFAUT: Disposition = { ordre: BLOCS_ACCUEIL.map((b) => b.id), caches: [], v: VERSION_DISPOSITION };

const KEY = 'yoroi.accueil.disposition.v36';
const EVENT = 'YOROI_ACCUEIL_DISPOSITION';
const IDS = new Set<string>(DISPOSITION_DEFAUT.ordre);

/**
 * Nettoie une disposition : blocs inconnus retires, blocs manquants ajoutes (visibles).
 * choixDuJour : la disposition vient d'un choix fait maintenant (Tes blocs) ; jamais de migration alors.
 * Sinon, une disposition memorisee avant le 17 octobre (v absent ou < 2) recoit une fois les blocs de MIGRATION_17 visibles.
 */
export function propreDisposition(d: Partial<Disposition> | null | undefined, choixDuJour = false): Disposition {
  if (!d) return { ...DISPOSITION_DEFAUT, ordre: [...DISPOSITION_DEFAUT.ordre], caches: [] };
  const brut = { ordre: (d.ordre ?? []) as string[], caches: (d.caches ?? []) as string[] };
  // Coeur au repos affiche (ancien bloc 'sante') : sa place devient celle de Ta sante aujourd'hui si Activite etait cachee
  const coeurVu = !choixDuJour && (d.v ?? 0) < 3 && brut.ordre.includes(ANCIEN_COEUR) && !brut.caches.includes(ANCIEN_COEUR);
  const ordre = Array.from(new Set(brut.ordre.filter((b) => IDS.has(b)))) as BlocAccueil[];
  let caches = Array.from(new Set(brut.caches.filter((b) => IDS.has(b)))) as BlocAccueil[];
  const migrer = !choixDuJour && !((d.v ?? 0) >= 2);
  if (migrer) caches = caches.filter((b) => !MIGRATION_17.includes(b));
  if (coeurVu) caches = caches.filter((b) => b !== 'activite');
  DISPOSITION_DEFAUT.ordre.forEach((b) => {
    if (ordre.includes(b)) return;
    // 16 octobre : « Mangé aujourd'hui » arrive juste sous « Ta forme du jour », pas en bas ;
    // « Activité » arrive juste au-dessus de « Ta forme du jour », visible (pas un bloc en plus)
    const apres = b === 'mange' ? ordre.indexOf('forme') : -1;
    const avant = b === 'activite' ? ordre.indexOf('forme') : -1;
    if (apres >= 0) ordre.splice(apres + 1, 0, b);
    else if (avant >= 0) ordre.splice(avant, 0, b);
    else ordre.push(b);
  });
  return { ordre, caches, v: VERSION_DISPOSITION };
}

const propre = propreDisposition;

let memo: Disposition | null = null;

export async function lireDisposition(): Promise<Disposition> {
  if (memo) return memo;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    memo = propre(raw ? JSON.parse(raw) : null);
    // la migration du 17 octobre est ecrite une fois : un bloc decoche ensuite reste cache
    if (raw && !((JSON.parse(raw)?.v ?? 0) >= VERSION_DISPOSITION)) AsyncStorage.setItem(KEY, JSON.stringify(memo)).catch(() => {});
  } catch {
    memo = DISPOSITION_DEFAUT;
  }
  return memo;
}

export async function ecrireDisposition(d: Disposition): Promise<void> {
  memo = propre(d, true);
  DeviceEventEmitter.emit(EVENT, memo);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(memo));
  } catch {
    // la disposition reste valable pour la session
  }
}

export function useDisposition(): { disposition: Disposition; changer: (d: Disposition) => void } {
  const [disposition, setDisposition] = useState<Disposition>(memo ?? DISPOSITION_DEFAUT);
  useEffect(() => {
    let alive = true;
    lireDisposition().then((d) => {
      if (alive) setDisposition(d);
    });
    const sub = DeviceEventEmitter.addListener(EVENT, (d: Disposition) => setDisposition(d));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  const changer = useCallback((d: Disposition) => {
    setDisposition(propre(d, true));
    ecrireDisposition(d);
  }, []);
  return { disposition, changer };
}
