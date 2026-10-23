/**
 * « Importer mes séances » (16 octobre 2026, SEANCES AVATAR) : lit Apple Santé (iPhone) ou Health Connect (Android)
 * sur la période choisie, ajoute ce qui manque, relie ce qui existe déjà. Les règles sont dans ./importPlan.ts (pur, testé).
 * L'accès se demande par connecterSante (jamais de faux « relié » : une lecture réelle décide).
 * Si la connexion vient de lancer l'import complet de fond, on attend sa fin avant de compter, pour ne rien ajouter deux fois.
 */
import { DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthConnect } from '@/lib/healthConnect';
import { addTraining, getExistingHealthkitUUIDs, getTrainings } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { connecterSante } from '@/lib/v2/sante/connecter';
import { lireEtatSante, ecouterEtatSante } from '@/lib/v2/sante/importEtat';
import type { IssueConnexion, StatutDemande } from '@/lib/v2/sante/connexion';
import { addDismissedImportIds } from './dismissedImports';
import { completerLieuImport } from './importLieu';
import { joursDe, planifierImport, resultatDe } from './importPlan';
import type { PeriodeImport, ResultatImport, SeanceSante } from './importPlan';

const EMPREINTES_KEY = '@yoroi_imported_workouts';
/** Séances importées dont on charge aussi les détails (FC, zones, tracé), les plus récentes d'abord */
const DETAILS_MAX = 30;

type Svc = {
  isAvailable: () => Promise<boolean>;
  statutDemande?: () => Promise<StatutDemande>;
  lireSeancesPourImport?: (days?: number | null) => Promise<SeanceSante[] | null>;
  enrichirSeanceImportee?: (id: string, trainingId: number, debutIso?: string, dureeMin?: number) => Promise<void>;
};
const svc = healthConnect as unknown as Svc;

export const importSeancesDisponible = (): boolean => Platform.OS === 'ios' || Platform.OS === 'android';
export const nomSourceSante = (): string => (Platform.OS === 'android' ? 'Health Connect' : 'Apple Santé');

export type EtapeImport =
  | { phase: 'acces' }
  | { phase: 'attente' }
  | { phase: 'lecture' }
  | { phase: 'ajout'; fait: number; total: number }
  | { phase: 'details'; fait: number; total: number };

export type IssueImport =
  | { ok: true; resultat: ResultatImport }
  | { ok: false; raison: 'acces'; issue: IssueConnexion }
  | { ok: false; raison: 'rien_lu' | 'indisponible' | 'en_cours' | 'erreur' };

let enCours = false;

async function lireEmpreintes(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(EMPREINTES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

/** Attend la fin de l'import complet de fond (au plus 5 minutes) */
function finImportDeFond(): Promise<void> {
  if (lireEtatSante().import !== 'en_cours' && lireEtatSante().connexion !== 'import') return Promise.resolve();
  return new Promise((resolve) => {
    let fin: () => void = () => {};
    const timer = setTimeout(() => fin(), 5 * 60 * 1000);
    const stop = ecouterEtatSante((e) => {
      if (e.import === 'termine' || e.connexion === 'termine' || e.connexion === 'repos') fin();
    });
    fin = () => {
      clearTimeout(timer);
      stop();
      resolve();
    };
  });
}

/** Faut-il ouvrir la fenêtre d'accès avant de lire ? */
async function accesADemander(): Promise<boolean> {
  try {
    const st = svc.statutDemande ? await svc.statutDemande() : 'inconnu';
    if (Platform.OS === 'android') return st !== 'repondu';
    if (st === 'a_demander') return true;
    if (st === 'repondu') return false;
    return (await AsyncStorage.getItem('@yoroi_healthkit_asked')) !== 'true';
  } catch {
    return false;
  }
}

export async function importerSeancesSante(periode: PeriodeImport, onEtape?: (e: EtapeImport) => void): Promise<IssueImport> {
  if (!importSeancesDisponible() || typeof svc.lireSeancesPourImport !== 'function') return { ok: false, raison: 'indisponible' };
  if (enCours) return { ok: false, raison: 'en_cours' };
  enCours = true;
  const etape = (e: EtapeImport) => {
    try {
      onEtape?.(e);
    } catch {
      /* écran fermé */
    }
  };
  try {
    if (!(await svc.isAvailable().catch(() => false))) return { ok: false, raison: 'indisponible' };

    // ce qui est connu AVANT : une séance arrivée ensuite par la synchro de fond compte comme importée
    const avant = { ids: new Set(await getExistingHealthkitUUIDs().catch(() => new Set<string>())), empreintes: await lireEmpreintes() };

    if (await accesADemander()) {
      etape({ phase: 'acces' });
      const issue = await connecterSante();
      if (issue !== 'connecte' && issue !== 'rien_lu') return { ok: false, raison: 'acces', issue };
    }
    etape({ phase: 'attente' });
    await finImportDeFond();

    etape({ phase: 'lecture' });
    const candidats = await svc.lireSeancesPourImport(joursDe(periode));
    if (candidats == null) return { ok: false, raison: 'rien_lu' };

    const existantes = await getTrainings().catch(() => [] as Awaited<ReturnType<typeof getTrainings>>);
    const connus = { ids: new Set(await getExistingHealthkitUUIDs().catch(() => new Set<string>())), empreintes: await lireEmpreintes() };
    const plan = planifierImport(candidats, existantes, connus, avant);

    let ajoutees = 0;
    let erreurs = 0;
    const aDetailler: { id: string; trainingId: number; debutIso?: string; duree?: number; date: string }[] = [];
    const total = plan.aAjouter.length;
    for (let i = 0; i < total; i++) {
      const c = plan.aAjouter[i];
      try {
        // 17 octobre : le club si un creneau du planning du meme sport chevauche la seance, dehors si la source le dit
        const trainingId = await addTraining(await completerLieuImport(c.training));
        ajoutees++;
        connus.empreintes.add(c.empreinte);
        if (c.training.healthkit_uuid) {
          connus.ids.add(String(c.training.healthkit_uuid));
          if (trainingId) aDetailler.push({ id: String(c.training.healthkit_uuid), trainingId, debutIso: c.debutIso, duree: c.training.duration_minutes, date: String(c.training.date ?? '') });
        }
      } catch (e) {
        erreurs++;
        logger.warn('[ImportSeances] ajout impossible', e);
      }
      if (i % 5 === 4 || i === total - 1) etape({ phase: 'ajout', fait: i + 1, total });
    }

    // la synchro suivante connaît ces empreintes, et ne ramène pas les séances reliées aux tiennes
    try {
      await AsyncStorage.setItem(EMPREINTES_KEY, JSON.stringify([...connus.empreintes].slice(-20000)));
    } catch {
      /* la base reste la référence (identifiants) */
    }
    const idsReliees = plan.reliees.map((r) => String(r.training.healthkit_uuid ?? '')).filter(Boolean);
    if (idsReliees.length) await addDismissedImportIds(idsReliees).catch(() => {});

    if (ajoutees > 0) DeviceEventEmitter.emit('YOROI_DATA_CHANGED');

    // détails des plus récentes (FC, zones, tracé), 3 à la fois
    if (typeof svc.enrichirSeanceImportee === 'function' && aDetailler.length) {
      const liste = aDetailler.sort((a, b) => b.date.localeCompare(a.date)).slice(0, DETAILS_MAX);
      for (let i = 0; i < liste.length; i += 3) {
        await Promise.allSettled(liste.slice(i, i + 3).map((d) => svc.enrichirSeanceImportee!(d.id, d.trainingId, d.debutIso, d.duree)));
        etape({ phase: 'details', fait: Math.min(i + 3, liste.length), total: liste.length });
      }
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
    }

    return { ok: true, resultat: resultatDe(plan, ajoutees, erreurs) };
  } catch (e) {
    logger.warn('[ImportSeances] import impossible', e);
    return { ok: false, raison: 'erreur' };
  } finally {
    enCours = false;
  }
}
