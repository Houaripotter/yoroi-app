/**
 * Ce qui se synchronise par element entre tes telephones (28 octobre 2026), cle par cle.
 *
 * `ancienne` : la cle partait deja dans l'ancienne synchro (valeur entiere, la plus recente gagne). Un telephone
 * pas encore a jour l'envoie toujours ainsi : elle est alors fusionnee sans rien retirer (./fusion.ts).
 * Les autres cles ne partent que vers un telephone qui connait le format par element : un ancien telephone
 * ne les recoit pas, et les recevra entieres le jour ou il sera mis a jour.
 *
 * `type` regroupe les cles pour l'ecran de synchro (« 3 partenaires, 12 entrees du carnet »).
 * `apres` : ce qu'il faut refaire ici quand la cle a change (ecrans prevenus, rappels reprogrammes).
 */
import { DeviceEventEmitter } from 'react-native';
import type { SpecForme } from './fusion';

export type TypeSynchro =
  | 'partenaires' | 'records' | 'charges' | 'photos' | 'carnet' | 'seances_enregistrees' | 'programmes'
  | 'scene' | 'objectifs' | 'eau' | 'rappels' | 'reglages' | 'donnees';

export interface SpecCle extends SpecForme {
  cle: string;
  type: TypeSynchro;
  ancienne?: boolean;
  /** evenements emis quand la valeur a change ici (sans contenu) */
  evenements?: readonly string[];
  apres?: () => Promise<void>;
  /** ce qui arrive pour cette cle est range dans une autre cle (photos : les fichiers ne voyagent pas) */
  recuDans?: string;
  /** cle remplie seulement par ce qui arrive, jamais envoyee */
  jamaisEnvoyee?: boolean;
}

/** Programme en cours : les numeros de seance de ce telephone (trainingId) ne partent pas */
function programmeSansSeancesLocales(brut: string): string {
  try {
    const o = JSON.parse(brut);
    if (!o || typeof o !== 'object' || !Array.isArray(o.faits)) return brut;
    return JSON.stringify({ ...o, faits: o.faits.map((f: Record<string, unknown>) => {
      if (!f || typeof f !== 'object') return f;
      const { trainingId: _t, ...reste } = f;
      return reste;
    }) });
  } catch {
    return brut;
  }
}

/** Programme recu : chaque jour fait retrouve le numero de seance de ce telephone s'il le connaissait */
function programmeAvecSeancesLocales(recu: string, local: string | null): string {
  try {
    const o = JSON.parse(recu);
    const l = local ? JSON.parse(local) : null;
    if (!o || !Array.isArray(o.faits) || !l || !Array.isArray(l.faits) || l.id !== o.id) return recu;
    const ici = new Map<string, unknown>();
    for (const f of l.faits) if (f && f.trainingId != null) ici.set(`${f.date}|${f.jourId}`, f.trainingId);
    return JSON.stringify({ ...o, faits: o.faits.map((f: Record<string, unknown>) => {
      const t = f ? ici.get(`${f.date}|${f.jourId}`) : undefined;
      return t != null ? { ...f, trainingId: t } : f;
    }) });
  } catch {
    return recu;
  }
}

/** Informations des photos prises sur tes autres telephones (sans le fichier) */
export const CLE_PHOTOS_AUTRES = '@yoroi_photos_autres_telephones_v1';

const emettre = (nom: string, charge?: unknown) => {
  try { DeviceEventEmitter.emit(nom, charge); } catch { /* sans ecran ouvert */ }
};

export const CLES_ELEMENTS: readonly SpecCle[] = [
  // ── deja dans l'ancienne synchro ──
  {
    cle: '@yoroi_sparring_partners', type: 'partenaires', ancienne: true, forme: 'liste',
    // photo et videos : des fichiers de ce telephone, jamais envoyes
    champsLocaux: ['photoUri', 'media'],
    sousListes: [{ champ: 'notes' }, { champ: 'missions' }],
    evenements: ['YOROI_PARTNERS_CHANGED'],
  },
  { cle: '@yoroi_personal_records', type: 'records', ancienne: true, forme: 'objet' },
  // charge d'une seance : son numero de seance est propre a ce telephone
  { cle: '@yoroi_training_loads', type: 'charges', ancienne: true, forme: 'liste', champsLocaux: ['trainingId'] },
  { cle: '@yoroi_photo_history', type: 'photos', ancienne: true, forme: 'liste' },

  // ── nouvelles cles (format par element seulement) ──
  // Photos de progression : la synchro ne transfere pas de fichier. Les informations de chaque photo (date, poids,
  // pose, notes) partent sans le chemin du fichier, et arrivent a part, dans une cle que l'ecran des photos ne lit
  // pas : aucune vignette vide n'apparait, et rien ne se perd le jour ou les fichiers voyageront.
  { cle: '@yoroi_photos_v2', type: 'photos', forme: 'liste', champsLocaux: ['file_uri', 'base64'], recuDans: CLE_PHOTOS_AUTRES },
  { cle: CLE_PHOTOS_AUTRES, type: 'photos', forme: 'liste', jamaisEnvoyee: true },
  // le carnet est range sans @ (lib/carnetService.ts) : l'ancienne liste '@yoroi_benchmarks_v2' ne trouvait rien
  { cle: 'yoroi_benchmarks_v2', type: 'carnet', forme: 'liste', sousListes: [{ champ: 'entries' }], evenements: ['YOROI_DATA_CHANGED'] },
  { cle: 'yoroi_skills_v2', type: 'carnet', forme: 'liste', sousListes: [{ champ: 'notes' }], evenements: ['YOROI_DATA_CHANGED'] },
  // Mes seances (lib/v2/seance/mesSeances.ts, MES_SEANCES_EVENT)
  { cle: 'yoroi_mes_seances_v1', type: 'seances_enregistrees', forme: 'liste', evenements: ['YOROI_MES_SEANCES_CHANGED'] },
  // Tes programmes construits (lib/v2/programmes/monProgramme.ts) : le registre est rempli de nouveau
  {
    cle: 'yoroi_programmes_perso_v1', type: 'programmes', forme: 'liste',
    apres: async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        await (require('@/lib/v2/programmes/monProgramme') as typeof import('@/lib/v2/programmes/monProgramme')).chargerProgrammesPerso();
      } catch { /* relu a la prochaine ouverture */ }
      emettre('YOROI_PROGRAMME_CHANGED');
    },
  },
  {
    cle: 'yoroi_programme_actif_v1', type: 'programmes', forme: 'valeur',
    nettoyerValeur: programmeSansSeancesLocales, completerValeur: programmeAvecSeancesLocales,
    evenements: ['YOROI_PROGRAMME_CHANGED'],
  },
  { cle: 'yoroi_programmes_favoris_v1', type: 'programmes', forme: 'liste', evenements: ['YOROI_PROGRAMME_CHANGED'] },
  { cle: 'yoroi_materiel_v1', type: 'programmes', forme: 'valeur', evenements: ['YOROI_PROGRAMME_CHANGED'] },
  { cle: 'yoroi_salle_machines_v1', type: 'programmes', forme: 'valeur', evenements: ['YOROI_PROGRAMME_CHANGED'] },
  // Scene, personnage, objectifs de l'onboarding, blocs de l'accueil (lib/v2/espace.ts) : champ par champ
  {
    cle: 'yoroi_espace_v1', type: 'scene', forme: 'objet',
    apres: async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const espace = require('@/lib/v2/espace') as typeof import('@/lib/v2/espace');
        emettre(espace.ESPACE_CHANGED_EVENT, await espace.getEspace());
      } catch { /* relu a la prochaine ouverture */ }
    },
  },
  { cle: '@yoroi_scenes_gagnees_v1', type: 'scene', forme: 'liste', evenements: ['yoroi:scenes_gagnees'] },
  // Objectifs
  { cle: '@yoroi_user_goals', type: 'objectifs', forme: 'liste' },
  { cle: '@yoroi_v2_sante_ring_goals', type: 'objectifs', forme: 'objet' },
  { cle: '@yoroi_hydration_goal', type: 'objectifs', forme: 'valeur', evenements: ['HYDRATION_GOAL_CHANGED'] },
  // Eau : un total par jour, le plus recent gagne pour chaque jour
  { cle: '@yoroi_hydration_history', type: 'eau', forme: 'liste', idChamp: 'date' },
  // Rappels : seulement les reglages, les notifications sont reprogrammees sur ce telephone
  {
    cle: '@yoroi_notification_settings', type: 'rappels', forme: 'objet',
    apres: async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        await (require('@/lib/notificationService') as typeof import('@/lib/notificationService')).notificationService.initialize();
      } catch { /* reprogrammees au prochain lancement */ }
    },
  },
  { cle: '@yoroi_smart_reminders_settings', type: 'rappels', forme: 'objet' },
];

export const SPEC_PAR_CLE = new Map(CLES_ELEMENTS.map((s) => [s.cle, s]));

/** Cles de l'ancienne synchro desormais fusionnees par element */
export const CLES_ANCIENNES_PAR_ELEMENT = new Set(CLES_ELEMENTS.filter((s) => s.ancienne).map((s) => s.cle));
