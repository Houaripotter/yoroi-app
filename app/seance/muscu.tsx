/**
 * Seance de musculation en direct (maquette S2).
 * Chrono, exercices pre-remplis avec la derniere fois, series en un appui, repos automatique, records tamponnes.
 * Parametres : sport, label, slotId (creneau du planning), repeatId (refaire une seance), resume ('1'),
 * editId (modifier une seance), date, time, duration, clubId (saisie apres coup, aussi sous les anciens noms prefill...),
 * maSeance (une seance de « Mes séances », 25 octobre 2026).
 */
import { PRECISION_EXO } from '@/lib/v2/programmes/musclesExos';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { accordSouleve, formatTonnage, tonnageOfSets } from '@/lib/v2/trainingWeek';
import { AppState, Image, Pressable, ScrollView, TextInput, Vibration, View } from 'react-native';
import { Interrupteur } from '@/components/yoroi/Interrupteur';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { fontStyle } from '@/components/yoroi/fonts';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ExercisePicker } from '@/components/yoroi/v2/seance/ExercisePicker';
import { Hanko } from '@/components/yoroi/v2/seance/Hanko';
import { Icon } from '@/components/yoroi/v2/seance/Icon';
import { RestBar } from '@/components/yoroi/v2/seance/RestBar';
import { SessionDetailsForm, SportRibbon, dayLabel } from '@/components/yoroi/v2/seance/Details';
import { ChoiceRow, Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';
import { AlerteManquantes, TamponValide } from '@/components/yoroi/v2/seance/EtatExercice';
import { etatExo, texteManquantes } from '@/lib/v2/seances/etatExo';
import { getActiveInjuries, getProfile, getTrainingById, getTrainings, getWeeklyPlanById } from '@/lib/database';
import type { Exercise } from '@/lib/database';
import { MUSCLES, getSportName } from '@/lib/sports';
import { logger } from '@/lib/security/logger';
import { fmtClock, fmtMinutes, fmtNum, hhmm, isoDay, niceGroup, relativeDay } from '@/lib/v2/seance/format';
import { bestSet, buildExerciseHistory, epley, normName, setLabel } from '@/lib/v2/seance/history';
import type { ExerciseHistory, SetValue } from '@/lib/v2/seance/history';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { kgDepuisSaisie, saisieDepuisKg } from '@/lib/v2/unitePoids';
import { useSauvegardeBrouillon } from '@/lib/v2/seance/useSauvegardeBrouillon';
import { allerAExercice, seriesRestantes, chargerSaisie, clearDraft, effacerSaisie, loadDraft, loadRestPref, mesurerAbandon, saveRestPref, uid } from '@/lib/v2/seance/model';
import { offrirSaisie } from '@/lib/v2/seance/repriseSaisie';
import type { LiveExercise, LiveSet, MuscuDraft, SessionDetails } from '@/lib/v2/seance/model';
import { detailsFromTraining, loadTrainingForEdit, trainingFromDetails } from '@/lib/v2/seance/edit';
import { initialDetails, readParams, timeOf, wantsForm } from '@/lib/v2/seance/params';
import { draftAgo, draftRoute, draftTitle } from '@/lib/v2/seance/resume';
import { saveSeance } from '@/lib/v2/seance/save';
import type { SeanceRecord } from '@/lib/v2/seance/save';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
import { useNow } from '@/lib/v2/seance/useNow';
import { rappelReposAutorise, useRappelFinRepos } from '@/lib/v2/seance/rappelRepos';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { blancA } from '@/components/yoroi/livePalette';
import { PlusPastille } from '@/components/yoroi/v2/accueil/kit';
import { carteBlanche, ton, tonDuRang } from '@/components/yoroi/v2/seance/pastel';
import type { TonSeance } from '@/components/yoroi/v2/seance/pastel';
import { intensite, niveauRpe } from '@/lib/v2/intensite';
import { traduire } from '@/lib/i18n/tr';
import { programmeParId, libelleRepos } from '@/lib/v2/programmes/catalogue';
import { ExoDemo } from '@/components/yoroi/v2/seance/ExoDemo';
import { ExplicationExo } from '@/components/yoroi/v2/programmes/ExplicationExo';
import { AideBarre } from '@/components/yoroi/v2/seance/AideBarre';
import { proposer, proposerLegere, proposerLibre, seancesDeLExo } from '@/lib/v2/programmes/progression';
import { chargerMachines, chargerMateriel, chargerProgrammeActif, estSemaineLegere, marquerJourFait, plusJours } from '@/lib/v2/programmes/suivi';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { seanceExpress } from '@/lib/v2/programmes/express';
import { lireZones, seanceZones, titreZones } from '@/lib/v2/programmes/zones';
import { marquerFaite, maSeanceParId, seriesPrevues } from '@/lib/v2/seance/mesSeances';
import { terminerActiviteSeance, useActiviteSeance } from '@/lib/v2/widgets/activiteSeance';
import type { EtatSeance } from '@/lib/v2/widgets/activiteSeance';
import { appliquerActionsIle, ecouterActionsIle, planIle } from '@/lib/v2/seance/actionsIle';
import { coachSeance } from '@/lib/v2/seance/coachSeance';
import type { TextesIle } from '@/lib/v2/seance/actionsIle';
import { LIBELLE_REGION, regionsDesBlessures, unirRegions } from '@/lib/v2/programmes/blessures';
import { estProgrammePerso } from '@/lib/v2/programmes/registrePerso';
import { chargerProgrammesPerso } from '@/lib/v2/programmes/monProgramme';
import { dateDuJour, jourPourToi, remplacementsLe } from '@/lib/v2/programmes/perso';
import { besoinDesPerso, jourDuProgramme } from '@/lib/v2/programmes/semaineLibre';
import { avecVersion } from '@/lib/v2/programmes/alternance';
import { EXPLICATION_PRISE, PRISES, avecPrise, sansPrise } from '@/lib/v2/seance/prise';
import type { Prise } from '@/lib/v2/seance/prise';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { DUREE_PASTILLE_MS, PastilleAjout, SeriePrevue } from '@/components/yoroi/v2/seance/SeriePrevue';
import { correctionPossible, corrigerSerie } from '@/lib/v2/seances/correctionSerie';
import { SonnerieFinRepos } from '@/components/yoroi/v2/seance/SonnerieFinRepos';
import { BoutonCoachVocal, useCoachVocal } from '@/components/yoroi/v2/seance/CoachVocal';
import { PeseeSeanceRapide } from '@/components/yoroi/v2/corps/PeseeSeance';
import { cibleDefilement } from '@/lib/v2/seances/defilementExo';
import { completerExercice } from '@/lib/v2/seances/exerciceEnregistre';
import { DUREE_MESSAGE_MS, decisionFinRepos, retirerReposFini } from '@/lib/v2/seances/finRepos';
import { alternativesCardio, annulerFinCardio, estCardioFin, demarrer as demarrerChrono, dureeFinaleSec, ecouleMs, enCours as chronoEnCours, finObjectifMs, nomCardioFin, nouveauChrono, objectifAtteint, pause as pauseChrono, programmerFinCardio, suiteFinCardio } from '@/lib/v2/seances/cardioFin';
import type { ChronoCardio } from '@/lib/v2/seances/cardioFin';
import { avecValeur, chargerChoix, chargerReglagesCardio, choixParDefaut, cleChoix, enregistrerChoix, enregistrerReglagesCardio, infoCardio, nouveauSegment, sansDernierSegment, segmentCourant, typeDepart } from '@/lib/v2/seances/cardioChoix';
import type { ChoixCardio, ReglagesCardio, Valeurs } from '@/lib/v2/seances/cardioChoix';
import { appliquerChoix, exerciceSuivant, preparerCardio } from '@/lib/v2/seances/cardioSeance';
import { liensGardes, retenirHabitudes } from '@/lib/v2/seances/habitudesFin';
import type { SeanceLue } from '@/lib/v2/seances/habitudesFin';
import { chargerZone2 } from '@/lib/v2/seances/zone2';
import type { Zone2 } from '@/lib/v2/seances/zone2';
import { fcMoyenneEntre } from '@/lib/v2/seances/fcCardio';
import { FeuilleChoixCardio } from '@/components/yoroi/v2/seance/cardio/FeuilleChoixCardio';
import { CarteCardio } from '@/components/yoroi/v2/seance/cardio/CarteCardio';
import { playWizzSound } from '@/lib/soundManager';
import { encouragement, etatSerie, nouvelleSerie, remettreSerie, sansSerie, seriesAFaire } from '@/lib/v2/seances/seriesSaisie';
import { chargerMinuteurRepos, enregistrerMinuteurRepos, reposApresSerie } from '@/lib/v2/seances/minuteurRepos';
import { objectifExo, seriesVisees, texteReps, texteSerie } from '@/lib/v2/seances/objectifExo';
import { chargerReglages, enregistrerCran, typeReglage, CRAN_MAX } from '@/lib/v2/seances/reglagesMachine';
import { cranAffiche, cranAvant, indexReperes, libelleCharge, recordBattu, recordPlaquesBattuEnSeance, reperesDe, serieDerniereFois } from '@/lib/v2/seances/reperesExo';
import { avecChoix, chargerUnites, enregistrerUnite, modeOuverture, type UnitesCharge } from '@/lib/v2/seances/plaques';
import { exerciceEnPlaques, kgDePlaques, libelleKgParPlaque, libellePlaques, libelleSeriePlaques, motPlaques, plaquesDe, recordPlaquesBattu, serieEnMode, KG_PAR_PLAQUE_MAX, PLAQUES_MAX, type ModePlaques } from '@/lib/v2/seances/plaquesSerie';
import { Icon as IconSeances } from '@/components/yoroi/v2/seances/Icon';
import { useGrandEcran } from '@/lib/v2/nav/useGrandEcran';
import type { Reglages } from '@/lib/v2/seances/reglagesMachine';
import { libelleHauteurPoulie } from '@/lib/v2/seances/hauteurPoulie';
import { chargerEcartes, ecarterExercice, ecartesEnMemoire, nomsEcartes } from '@/lib/v2/seances/exercicesEcartes';
import { alternativesPour } from '@/lib/v2/seances/alternatives';
import { ChangerExercice } from '@/components/yoroi/v2/seance/ChangerExercice';
import type { PorteeChangement } from '@/components/yoroi/v2/seance/ChangerExercice';
import { changerDansSeance, musclePour } from '@/lib/v2/seances/changerExo';
import { chargerMachinesPerso, machineDe, machinesEnMemoire } from '@/lib/v2/seances/machinesPerso';
import { ajouterAuGroupe, apresSerie, delier, estEnGroupe, groupeDe, lierAuSuivant, nettoyerEnchaines } from '@/lib/v2/seances/superset';
import { AjoutAuBloc, EnTeteSuperset, PastilleGroupe } from '@/components/yoroi/v2/seance/BlocSuperset';
import { appliquerEnchainements, avecAjout, avecLien, blocDuJour, chargerEnchainements, cleJour, modifierEnchainements, sansExoDuBloc } from '@/lib/v2/programmes/enchainements';
import type { Enchainements } from '@/lib/v2/programmes/enchainements';
import type { ExoProgramme } from '@/lib/v2/programmes/types';
import { remplacerExercice } from '@/lib/v2/programmes/suivi';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { StickerOuIcone } from '@/components/yoroi/v2/profil/Rubriques';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { StickerSinon } from '@/components/yoroi/v2/ui/StickerSinon';

const INTENSITIES = [
  { value: 3, label: 'Facile' },
  { value: 5, label: traduire('Correct') },
  { value: 7, label: 'Dur' },
  { value: 9, label: traduire('À bloc') },
];

/** Premier texte d'un parametre de navigation */
function param1(v: string | string[] | undefined): string | undefined {
  const x = Array.isArray(v) ? v[0] : v;
  return typeof x === 'string' && x ? x : undefined;
}

function makeSets(planned: SetValue[], withPrev: boolean): LiveSet[] {
  // 3 novembre 2026 : une serie de la derniere fois en plaques garde ses plaques (lib/v2/seances/plaques.ts)
  return planned.map((s) => ({ id: uid(), weight: s.weight, reps: s.reps, done: false, prevWeight: withPrev ? s.weight : undefined, prevReps: withPrev ? s.reps : undefined, ...(typeof s.plaques === 'number' ? { plaques: s.plaques, ...(withPrev ? { prevPlaques: s.plaques } : {}) } : {}) }));
}

function exerciseFrom(name: string, muscle: string | undefined, h: ExerciseHistory | undefined, planned?: SetValue[]): LiveExercise {
  const base = planned ?? h?.lastSets ?? [{ weight: 0, reps: 10 }, { weight: 0, reps: 10 }, { weight: 0, reps: 10 }];
  const sets = makeSets(base, !!(planned || h));
  return { id: uid(), name, muscle: muscle ?? h?.muscle, sets, objectifSeries: seriesVisees(sets) };
}

/** 30 octobre 2026 : le cardio de fin de seance, un exercice a une serie dont la duree est en secondes (cardioFin.ts) */
function exoCardio(minutes: number, nom: string): LiveExercise {
  const cardio = nouveauChrono(minutes);
  return { id: uid(), name: nom, muscle: 'CARDIO', sets: [{ id: uid(), weight: 0, reps: cardio.objectifSec, done: false }], objectifSeries: 1, cardio };
}

/**
 * 31 octobre 2026 : chaque cardio de la seance recoit ton dernier choix pour ce jour du programme (type, duree), et la
 * pente et la vitesse de ta derniere fois (lib/v2/seances/cardioChoix.ts). La feuille de choix s'ouvrira quand meme.
 */
async function cardiosDuJour(exos: LiveExercise[], cle: string, prevu?: ChoixCardio | null): Promise<LiveExercise[]> {
  if (!exos.some((e) => e.cardio)) return exos;
  const [choix, reglages] = await Promise.all([chargerChoix(), chargerReglagesCardio()]);
  // 1er novembre 2026 : sans choix gardé pour ce jour, le cardio prévu par ton programme (type et durée), sinon ton habitude
  const garde = choix[cle] ?? prevu ?? null;
  return exos.map((e) => {
    if (!e.cardio) return e;
    const prep = { ...e, cardio: preparerCardio(e.cardio, e.name, reglages) };
    if (!garde) return prep;
    const x = appliquerChoix(prep, garde, reglages);
    return { ...x, cardio: { ...x.cardio!, choisi: undefined } };
  });
}

/** Exercice d'une seance enregistree, series deja validees (modification) */
function exerciseDone(e: Exercise): LiveExercise {
  // le type de serie (echauffement...) est garde : sinon un echauffement compterait dans le tonnage apres modification
  const types = e.setsData && e.setsData.length > 0 ? e.setsData.map((s) => s?.type) : [];
  const sets = setsOfExercise(e).map((s, i) => ({ id: uid(), weight: s.weight, reps: s.reps, done: true, ...(types[i] ? { type: types[i] } : {}), ...(typeof s.plaques === 'number' ? { plaques: s.plaques } : {}) }));
  // 3 novembre 2026 : un exercice enregistre en plaques se rouvre en plaques, avec le poids de plaque qu'il avait
  const kgP = Number((e as Exercise & { kg_par_plaque?: number }).kg_par_plaque);
  const plaques = exerciceEnPlaques(e) ? { kgParPlaque: kgP > 0 ? kgP : null } : null;
  return { id: uid(), name: e.name, muscle: e.muscle_group, sets, notes: e.notes, orig: e, plaques };
}

function setsOfExercise(e: Exercise): SetValue[] {
  if (e.setsData && e.setsData.length > 0) return e.setsData.map((s) => { const p = plaquesDe(s); return { weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, ...(p !== null ? { plaques: p } : {}) }; });
  const n = Math.max(1, Math.min(Number(e.sets) || 1, 20));
  return Array.from({ length: n }, () => ({ weight: Number(e.weight) || 0, reps: Number(e.reps) || 0 }));
}

function muscleId(g?: string): string | null {
  if (!g) return null;
  return g.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '_');
}

export default function SeanceMuscu() {
  const { theme } = useYoroiTheme();
  const illus = useIllustrations();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // 18 octobre 2026 : en livres, tu saisis et tu lis tes charges en livres ; elles sont enregistrees en kilos
  const unite = useUnitePoids();
  const lb = unite === 'lb';
  const raw = useLocalSearchParams();
  const params = useMemo(() => readParams(raw), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [draft, setDraft] = useState<MuscuDraft | null>(null);
  // 18 octobre 2026 : app en arriere plan pendant un repos, une notification annonce sa fin (lib/v2/seance/rappelRepos.ts)
  // 30 octobre 2026 (G) : « Repos terminé » et la suite, plutôt qu'un titre seul
  const corpsRepos = (() => {
    const cur = draft?.exercises.find((e) => e.id === draft.currentId);
    if (!draft || !cur) return '';
    const i = cur.sets.findIndex((x) => !x.done);
    if (i >= 0) return traduire('Ensuite : {0}, série {1}', sansTiret(traduire(nomFr(cur.name))), i + 1);
    const suite = draft.exercises.find((e) => e.id !== cur.id && seriesRestantes(e) > 0);
    return suite ? traduire('Ensuite : {0}', sansTiret(traduire(nomFr(suite.name)))) : '';
  })();
  useRappelFinRepos(draft?.sansRepos ? null : draft?.restEndsAt ?? null, traduire('Repos terminé'), corpsRepos);
  // fin du repos vue en revenant dans l'app : pas de son, un petit message qui part tout seul (lib/v2/seances/finRepos.ts)
  const [reposFiniVu, setReposFiniVu] = useState(false);
  useEffect(() => {
    if (!reposFiniVu) return;
    const t = setTimeout(() => setReposFiniVu(false), DUREE_MESSAGE_MS);
    return () => clearTimeout(t);
  }, [reposFiniVu]);
  // 25 octobre 2026 : le même rappel, programmé par le natif après un appui dans la Dynamic Island
  const [rappelIle, setRappelIle] = useState(false);
  useEffect(() => {
    rappelReposAutorise().then(setRappelIle, () => setRappelIle(false));
  }, []);
  const [hist, setHist] = useState<{ map: Map<string, ExerciseHistory>; recent: string[] }>({ map: new Map(), recent: [] });
  // 24 octobre 2026 : toutes tes seances, pour proposer la charge du jour hors programme (proposerLibre)
  const [toutesSeances, setToutesSeances] = useState<Parameters<typeof seancesDeLExo>[0]>([]);
  const [femme, setFemme] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [priseFor, setPriseFor] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // garde synchrone : deux appuis rapproches n'enregistrent jamais la seance deux fois
  const savingRef = useRef(false);
  const [freshRecord, setFreshRecord] = useState<string | null>(null);
  const [musclesOpen, setMusclesOpen] = useState(false);
  // fin de seance : lieu, muscles et note d'execution replies sous « Plus de détails » (24 octobre 2026)
  const [plusOpen, setPlusOpen] = useState(false);
  const finished = useRef(false);
  // 1er novembre 2026 (perf) : plus d'horloge ici, l'ecran entier ne se redessine plus chaque seconde.
  // Le chrono, le coach, la duree et la carte cardio ont chacun la leur (composants en bas du fichier).

  // Chargement : brouillon, historique, preferences
  useEffect(() => {
    (async () => {
      try {
        // affichage immediat (15 octobre 2026) : l'historique complet des seances (lecture lourde) se lit
        // en parallele et ne retarde plus l'ecran ; seule « Refaire ta derniere » l'attend (series pre-remplies)
        // la seance modifiee ne compte pas dans l'historique (sinon pas de record possible)
        const trainingsP = getTrainings()
          .catch(() => [])
          .then((trainings) => (trainings ?? []).filter((t) => t.id !== params.editId));
        const histP = trainingsP.then((trainings) => buildExerciseHistory(trainings));
        trainingsP.then((t) => setToutesSeances((t ?? []) as any)).catch(() => {});
        histP.then(setHist).catch(() => {});
        const [existing, rest, profile, slot] = await Promise.all([
          params.editId ? Promise.resolve(null) : loadDraft(),
          loadRestPref(),
          getProfile().catch(() => null),
          params.slotId ? getWeeklyPlanById(params.slotId).catch(() => null) : Promise.resolve(null),
        ]);
        setFemme(profile?.avatar_gender === 'femme');

        if (params.editId) {
          const t = await loadTrainingForEdit(params.editId);
          if (!t) {
            appAlert(traduire('Séance introuvable'), traduire('Elle a sans doute été supprimée.'));
            router.back();
            return;
          }
          const exercises = (t.exercises ?? []).filter((e) => e && e.name).map(exerciseDone);
          // 28 octobre 2026 : une modification laissée en plan (app fermée) se reprend
          void offrirSaisie<MuscuDraft>({
            kind: 'muscu',
            form: true,
            editId: params.editId,
            sport: t.sport || 'musculation',
            label: 'Modifier ta séance',
            startedAt: Date.now(),
            exercises,
            currentId: exercises[0]?.id ?? null,
            notes: t.notes ?? '',
            restSec: rest,
            restEndsAt: null,
            restTotal: 0,
            muscles: t.muscles ? t.muscles.split(',').map((m) => m.trim()).filter(Boolean) : null,
            intensity: t.intensity ?? null,
            details: detailsFromTraining(t),
          }, setDraft);
          return;
        }

        const form = wantsForm(params);
        const details: SessionDetails = initialDetails(
          { ...params, clubId: params.clubId ?? slot?.club_id, time: params.time ?? slot?.time, duration: params.duration ?? slot?.duration_minutes },
          60,
        );

        const fresh = async (): Promise<MuscuDraft> => {
          let exercises: LiveExercise[] = [];
          let label = params.label ?? slot?.label ?? undefined;
          let programme: MuscuDraft['programme'];
          let maSeance: string | undefined;
          // 24 octobre 2026 : seance d'un programme, exercices et charges proposes (lib/v2/programmes/progression.ts)
          // 27 octobre 2026 : ton programme construit (« Je construis le mien ») est lu avant d'être cherché
          // 28 octobre 2026 : une séance de tes programmes posée dans ta semaine libre (lib/v2/programmes/semaineLibre.ts)
          if (estProgrammePerso(param1(raw.programme)) || besoinDesPerso(param1(raw.jour))) await chargerProgrammesPerso().catch(() => []);
          const prog = programmeParId(param1(raw.programme));
          const jourDuProg = prog ? jourDuProgramme(prog, param1(raw.jour)) : null;
          // 24 octobre 2026 : « Je ne sais pas quoi faire », la seance des zones touchees sur le corps (lib/v2/programmes/zones.ts)
          const zones = prog ? [] : lireZones(param1(raw.zones));
          const jourSource = prog && jourDuProg ? jourDuProg : zones.length ? { id: 'zones', titre: titreZones(zones, traduire), muscles: [], exos: seanceZones(zones) } : null;
          if (jourSource) {
            // 31 octobre 2026 : les supersets gardes dans le programme (lib/v2/programmes/enchainements.ts)
            const blocsP = chargerEnchainements().catch((): Enchainements => ({}));
            // revue du 30 octobre 2026 : tes exercices ecartes lus avant jourPourToi (app fermee, la copie en memoire est vide)
            const [trainings, h, actif, materiel, blessures, machines] = await Promise.all([trainingsP, histP, chargerProgrammeActif(), chargerMateriel(), getActiveInjuries().catch(() => []), chargerMachines(), chargerEcartes().catch(() => [])]);
            // 1er novembre 2026 : tes abdos (supersets compris) et ton cardio habituels, avant de préparer la séance
            retenirHabitudes(trainings as SeanceLue[], new Date(), liensGardes(await blocsP));
            // ton materiel et tes douleurs declarees : chaque exercice impossible ou qui charge une zone douloureuse
            // est remplace par le plus proche (lib/v2/programmes/materiel.ts, blessures.ts)
            // puis tes exercices changes a la main sur la page du programme en cours (lib/v2/programmes/perso.ts)
            // 1er novembre 2026 : et ceux changes pour la seance d'aujourd'hui seulement (Tes prochaines seances)
            const protege = jourPourToi(jourSource, materiel, unirRegions(regionsDesBlessures(blessures ?? []), prog && actif && actif.id === prog.id ? actif.douleurs : null), machines, prog && actif && actif.id === prog.id ? remplacementsLe(actif.remplacements, actif.changementsDates, dateDuJour()) : null);
            // seance express (15, 20 ou 30 min) : la seance du jour raccourcie (lib/v2/programmes/express.ts)
            const express = Number(param1(raw.express)) || 0;
            const jour = express > 0 ? { ...protege, exos: seanceExpress(protege.exos, express).exos } : protege;
            // semaine legere du programme en cours : moitie moins de series, meme charge
            const legere = !!prog && !!actif && actif.id === prog.id && estSemaineLegere(actif);
            // les seances des semaines legeres passees ne comptent pas dans la progression
            const legeres = prog && actif && actif.id === prog.id ? actif.legeres ?? [] : [];
            const horsLegere = trainings.filter((t) => !legeres.some((d) => t.date.slice(0, 10) >= d && t.date.slice(0, 10) <= plusJours(d, 6)));
            // 31 octobre 2026 : les exercices ajoutes au bloc et les liens (superset) gardes pour ce jour du programme
            const exosJour = appliquerEnchainements(jour.exos, blocDuJour(await blocsP, prog?.id, jour.id));
            exercises = exosJour.map((e) => {
              // 30 octobre 2026 : la brique Cardio de ta semaine (lib/v2/programmes/briques.ts) : l'exercice cardio et son chrono
              if (e.minutes && estCardioFin(e.nom)) {
                const ec = ecartesEnMemoire();
                return exoCardio(e.minutes, ec.has(e.nom) ? nomCardioFin(ec) : e.nom);
              }
              const prop = legere ? proposerLegere(e, seancesDeLExo(trainings, e.nom)) : proposer(e, seancesDeLExo(horsLegere, e.nom));
              // series proposees ; « la derniere fois » reste ta vraie derniere seance (rien si premiere fois)
              const hx = h.map.get(normName(e.nom));
              const sets: LiveSet[] = prop.series.map((sv, i) => {
                const last = serieDerniereFois(hx, i);
                return { id: uid(), weight: sv.weight, reps: sv.reps, done: false, ...(last ? { prevWeight: last.weight, prevReps: last.reps } : {}) };
              });
              // 30 octobre 2026 : la case du programme (pour retenir un remplacement) et les series visees
              const k = prog ? protege.exos.findIndex((x) => x.nom === e.nom) : -1;
              const ex: LiveExercise = { id: uid(), name: e.nom, muscle: e.muscle ?? hx?.muscle, sets, objectifSeries: seriesVisees(sets), ...(prog && k >= 0 && !e.ajoutBloc ? { caseProg: { jourId: jour.id, index: k } } : {}), ...(e.enchaine ? { enchaine: true } : {}), ...(e.ajoutBloc ? { ajoutBloc: true } : {}) };
              const zone = 'zone' in e && e.zone ? e.zone : null;
              const conseil = zone
                ? e.impossible
                  ? traduire('Tu as signalé une douleur : {0}. Passe cet exercice, et demande l’avis d’un professionnel si elle dure.', traduire(LIBELLE_REGION[zone]))
                  : [traduire('Remplace {0} pour ménager {1}', sansTiret(traduire(nomFr(e.remplace ?? ''))), traduire(LIBELLE_REGION[zone])), PRECISION_EXO[e.nom] ? traduire(PRECISION_EXO[e.nom]) : ''].filter(Boolean).join(' ')
                : e.remplace
                  ? PRECISION_EXO[e.nom] ? traduire(PRECISION_EXO[e.nom]) : undefined
                  : e.conseil ?? (PRECISION_EXO[e.nom] ? traduire(PRECISION_EXO[e.nom]) : undefined);
              return { ...ex, cible: { repsMin: e.repsMin, repsMax: e.repsMax, reposSec: e.reposSec, conseil, raison: prop.raison, nouvelleCharge: prop.nouvelleCharge, ...(e.secondes ? { secondes: true } : {}) } };
            });
            // 1er novembre 2026, soir : la vraie version de la seance, « Push B », quand tes seances alternent (alternance.ts)
            const titreJour = avecVersion(traduire(jour.titre), jourDuProg);
            if (!label) label = !prog ? jour.titre : express > 0 ? traduire('{0}, express {1} min', titreJour, express) : legere ? traduire('{0}, semaine légère', titreJour) : `${traduire(prog.titre)}, ${titreJour}`;
            if (prog) programme = { id: prog.id, jourId: jour.id };
            // 30 octobre 2026 (J) : le cardio de fin de seance, un vrai exercice en dernier, apres les abdos
            if (jour.finCardio) exercises = [...exercises, exoCardio(jour.finCardio.minutes, nomCardioFin((await chargerEcartes().catch(() => [])).map((x) => x.nom)))];
            // 31 octobre 2026 : ton dernier choix de cardio pour ce jour, ta derniere pente et ta derniere vitesse
            // 1er novembre 2026 : le cardio annoncé partout (type et durée prévus) est celui que la séance lance
            const finJour = jour as typeof jour & { finCardioType?: ChoixCardio['type'] };
            exercises = await cardiosDuJour(exercises, cleChoix(prog?.id, jour.id), jour.finCardio && finJour.finCardioType ? { type: finJour.finCardioType, minutes: jour.finCardio.minutes } : null).catch(() => exercises);
          }
          // 25 octobre 2026 : une seance de « Mes séances » ; les charges viennent de ta derniere fois sur chaque exercice
          const maSeanceId = param1(raw.maSeance);
          if (maSeanceId && exercises.length === 0) {
            const [m, h] = await Promise.all([maSeanceParId(maSeanceId), histP]);
            if (m) {
              exercises = m.exos.map((e) => {
                const hx = h.map.get(normName(e.nom));
                const sets = makeSets(seriesPrevues(e, hx?.travail ?? hx?.lastSets), !!hx);
                return { id: uid(), name: e.nom, muscle: e.muscle ?? hx?.muscle, sets, objectifSeries: e.series, objectifReps: e.reps };
              });
              if (!label) label = m.nom;
              maSeance = m.id;
            }
          }
          if (params.repeatId) {
            const [t, h] = await Promise.all([getTrainingById(Number(params.repeatId)).catch(() => null), histP]);
            if (t?.exercises) {
              exercises = t.exercises.filter((e) => e && e.name && (e.weight || e.reps || e.setsData?.length)).map((e) => exerciseFrom(e.name, e.muscle_group, h.map.get(normName(e.name)), setsOfExercise(e)));
              if (!label) label = `Comme ${relativeDay(t.date)}`;
            }
          }
          return {
            kind: 'muscu',
            form,
            details,
            sport: params.sport || slot?.sport || 'musculation',
            label,
            slotId: params.slotId,
            startedAt: Date.now(),
            exercises,
            currentId: exercises[0]?.id ?? null,
            restSec: rest,
            restEndsAt: null,
            restTotal: 0,
            notes: params.notes ?? '',
            ...(programme ? { programme } : {}),
            ...(maSeance ? { maSeance } : {}),
            intensity: params.intensity ?? null,
          };
        };

        const tidy = (d: MuscuDraft): MuscuDraft => ({ ...d, restEndsAt: d.restEndsAt && d.restEndsAt > Date.now() ? d.restEndsAt : null });

        if (form) {
          // 26 octobre 2026 : une saisie laissee en plan (app fermee par le telephone) se reprend
          const saisie = params.repeatId || raw.programme || raw.maSeance ? null : await chargerSaisie('muscu');
          if (saisie && saisie.kind === 'muscu' && saisie.exercises.length > 0) {
            appAlert(traduire('Reprendre ta saisie ?'), traduire('Tu avais commencé à noter une séance. Tu la reprends ?'), [
              { text: traduire('Nouvelle saisie'), style: 'destructive', onPress: async () => { await effacerSaisie(); setDraft(await fresh()); } },
              { text: traduire('Reprendre'), onPress: () => setDraft(saisie) },
            ], { cancelable: false });
            return;
          }
          setDraft(await fresh());
          return;
        }
        if (existing && existing.kind === 'muscu' && params.resume) {
          setDraft(tidy(existing));
          return;
        }
        if (existing) {
          appAlert(
            traduire('Une séance est en cours'),
            traduire("{0}, commencée {1}. Tu la reprends ?", traduire(draftTitle(existing)), draftAgo(existing)),
            [
              {
                text: traduire('Nouvelle séance'),
                style: 'destructive',
                // 26 octobre 2026 : on ne jette plus une seance en cours sur un seul toucher
                onPress: () =>
                  appAlert(traduire('Effacer la séance en cours ?'), traduire('Ses séries ne seront pas gardées. Pour les garder, reprends la et termine la.'), [
                    {
                      text: traduire('Reprendre'),
                      style: 'cancel',
                      onPress: () => {
                        if (existing.kind === 'muscu') setDraft(tidy(existing));
                        else router.replace({ pathname: draftRoute(existing) as any, params: { resume: '1' } });
                      },
                    },
                    {
                      text: traduire('Effacer'),
                      style: 'destructive',
                      onPress: async () => {
                        mesurerAbandon(existing);
                        await clearDraft();
                        terminerActiviteSeance();
                        setDraft(await fresh());
                      },
                    },
                  ], { cancelable: false }),
              },
              {
                text: traduire('Reprendre'),
                onPress: () => {
                  if (existing.kind === 'muscu') setDraft(tidy(existing));
                  else router.replace({ pathname: draftRoute(existing) as any, params: { resume: '1' } });
                },
              },
            ],
            { cancelable: false },
          );
          return;
        }
        setDraft(await fresh());
      } catch (err) {
        logger.error('Ouverture de la seance impossible', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 26 octobre 2026 : le brouillon est ecrit tout de suite, et encore au passage en arriere plan (lib/v2/seance/useSauvegardeBrouillon.ts)
  useSauvegardeBrouillon(draft, finished);

  const update = useCallback((fn: (d: MuscuDraft) => MuscuDraft) => setDraft((d) => (d ? fn(d) : d)), []);

  const updateExercise = (id: string, fn: (e: LiveExercise) => LiveExercise) =>
    update((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === id ? fn(e) : e)) }));

  /**
   * La prise choisie s'ajoute au nom (« ... (prise neutre) ») : chaque prise a sa propre historique, ses charges
   * et ses records. Les series pas encore faites reprennent ta derniere fois avec cette prise, s'il y en a une.
   */
  const choisirPrise = (ex: LiveExercise, prise: Prise | null) => {
    setPriseFor(null);
    const name = avecPrise(ex.name, prise);
    if (name === ex.name) return;
    const h = hist.map.get(normName(name));
    updateExercise(ex.id, (e) => ({
      ...e,
      name,
      sets: e.sets.map((st, i) => {
        if (st.done) return st;
        const last = serieDerniereFois(h, i);
        return last ? { ...st, weight: last.weight, reps: last.reps, prevWeight: last.weight, prevReps: last.reps } : { ...st, prevWeight: undefined, prevReps: undefined };
      }),
    }));
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
  };

  const current = draft?.exercises.find((e) => e.id === draft.currentId) ?? draft?.exercises[0] ?? null;
  const activeIndex = current ? current.sets.findIndex((s) => !s.done) : -1;
  // 31 octobre 2026 : l'exercice en cours est il dans le bloc abdos (bouton « Ajouter un exercice » en superset)
  const abdosEnCours = useMemo(() => (current ? musclePour(current.name, { muscle: current.muscle, perso: machinesEnMemoire() }) === 'ABDOS' : false), [current?.name, current?.muscle]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 30 octobre 2026 (A) : au passage a l'exercice suivant, la carte du nouvel exercice se pose sous l'en-tete,
     sa premiere serie visible. Avant, rien ne gerait le defilement : la liste gardait la position de l'exercice
     d'avant, au mauvais endroit dans la nouvelle page (lib/v2/seances/defilementExo.ts). */
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const vueH = useRef(0);
  const basMasque = useRef(0);
  const carteY = useRef(0);
  const serieBas = useRef<number | null>(null);
  // 31 octobre 2026 : la derniere serie ajoutee, pour la pastille « Serie 5 ajoutee » et l'animation d'entree
  const [serieAjoutee, setSerieAjoutee] = useState<string | null>(null);
  const [validePop, setValidePop] = useState<string | null>(null);
  const minuteurAjout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (minuteurAjout.current) clearTimeout(minuteurAjout.current); }, []);
  // 31 octobre 2026 : correction d'une serie deja validee (lib/v2/seances/correctionSerie.ts), a part de la serie en cours
  const [correction, setCorrection] = useState<{ exId: string; setId: string; weight: number; reps: number; plaques?: number } | null>(null);
  const [serieCorrigee, setSerieCorrigee] = useState<string | null>(null);
  const minuteurCorrige = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (minuteurCorrige.current) clearTimeout(minuteurCorrige.current); }, []);
  const exoVu = useRef<string | null>(null);
  useEffect(() => {
    const id = current?.id ?? null;
    if (!id || exoVu.current === null) {
      exoVu.current = id;
      return;
    }
    if (exoVu.current === id) return;
    exoVu.current = id;
    serieBas.current = null;
    // la nouvelle page se mesure d'abord (onLayout), puis on defile en douceur
    const t = setTimeout(() => {
      const y = cibleDefilement({ scrollY: scrollY.current, vueH: vueH.current, basMasque: basMasque.current, carteY: carteY.current, serieBas: serieBas.current });
      if (y !== null) scrollRef.current?.scrollTo({ y, animated: true });
    }, 120);
    return () => clearTimeout(t);
  }, [current?.id]);

  /* (B) minuteur de repos : active par defaut, ton choix est garde (lib/v2/seances/minuteurRepos.ts) */
  const [minuteurOn, setMinuteurOn] = useState<boolean | null>(null);
  useEffect(() => {
    chargerMinuteurRepos().then(setMinuteurOn, () => setMinuteurOn(true));
  }, []);
  const sansReposVoulu = minuteurOn === null ? null : !minuteurOn;
  useEffect(() => {
    if (sansReposVoulu === null || !draft || !!draft.sansRepos === sansReposVoulu) return;
    update((d) => ({ ...d, sansRepos: sansReposVoulu || undefined, ...(sansReposVoulu ? { restEndsAt: null, restTotal: 0 } : {}) }));
  }, [sansReposVoulu, draft?.sansRepos, !!draft]); // eslint-disable-line react-hooks/exhaustive-deps
  const changerMinuteur = (on: boolean) => {
    setMinuteurOn(on);
    void enregistrerMinuteurRepos(on);
  };

  /* (C) series visees retenues sur chaque exercice (une serie ajoutee en plus ne les repousse pas) */
  useEffect(() => {
    if (!draft || draft.form || !draft.exercises.some((e) => e.objectifSeries === undefined)) return;
    update((d) => ({ ...d, exercises: d.exercises.map((e) => (e.objectifSeries === undefined ? { ...e, objectifSeries: seriesVisees(e.sets) } : e)) }));
  }, [draft?.exercises, draft?.form]); // eslint-disable-line react-hooks/exhaustive-deps

  /* (D) le cran de la machine de la derniere fois, lu une fois a l'ouverture (lib/v2/seances/reglagesMachine.ts) */
  const [cransAvant, setCransAvant] = useState<Reglages>({});
  const [reglageOuvert, setReglageOuvert] = useState<string[]>([]);
  useEffect(() => {
    chargerReglages().then(setCransAvant, () => {});
  }, []);
  const changerCran = (ex: LiveExercise, v: number) => {
    const cran = v > 0 ? v : null;
    updateExercise(ex.id, (e) => ({ ...e, cran }));
    void enregistrerCran(ex.name, cran);
  };

  /* 3 novembre 2026 (Houari) : la charge en plaques de la pile, au choix par exercice, gardee pour la prochaine fois
     (lib/v2/seances/plaques.ts). Les plaques ne comptent jamais comme des kilos. */
  const [unitesCharge, setUnitesCharge] = useState<UnitesCharge | null>(null);
  const [poidsPlaqueOuvert, setPoidsPlaqueOuvert] = useState<string[]>([]);
  useEffect(() => {
    chargerUnites().then(setUnitesCharge, () => setUnitesCharge({}));
  }, []);
  // a l'ouverture d'un exercice pas encore decide : ton choix garde, sinon les plaques si ta derniere fois l'etait
  useEffect(() => {
    if (!draft || !unitesCharge || !draft.exercises.some((e) => e.plaques === undefined && !e.cardio)) return;
    update((d) => ({
      ...d,
      exercises: d.exercises.map((e) => {
        if (e.plaques !== undefined || e.cardio) return e;
        const h = hist.map.get(normName(e.name));
        const mode = modeOuverture(unitesCharge, e.name, !!h?.lastSets?.some((x) => typeof x.plaques === 'number'));
        return { ...e, plaques: mode, sets: e.sets.map((s) => (s.done ? s : serieEnMode(s, mode))) };
      }),
    }));
  }, [draft?.exercises, unitesCharge]); // eslint-disable-line react-hooks/exhaustive-deps
  const changerUniteCharge = (ex: LiveExercise, mode: ModePlaques | null) => {
    updateExercise(ex.id, (e) => ({ ...e, plaques: mode, sets: e.sets.map((s) => (s.done ? s : serieEnMode(s, mode))) }));
    setUnitesCharge((u) => avecChoix(u ?? {}, ex.name, mode));
    void enregistrerUnite(ex.name, mode);
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
  };
  /** Le poids d'une plaque, seulement si tu le donnes : les series en plaques de l'exercice comptent alors en kilos */
  const changerKgParPlaque = (ex: LiveExercise, kg: number) => {
    const mode: ModePlaques = { kgParPlaque: kg > 0 ? kg : null };
    updateExercise(ex.id, (e) => ({ ...e, plaques: mode, sets: e.sets.map((s) => (typeof s.plaques === 'number' ? { ...s, weight: kgDePlaques(s.plaques, mode.kgParPlaque) } : s)) }));
    setUnitesCharge((u) => avecChoix(u ?? {}, ex.name, mode));
    void enregistrerUnite(ex.name, mode);
  };

  /* (J) chrono du cardio : heure de depart et temps cumule, il tient en arriere plan (lib/v2/seances/cardioFin.ts) */
  const changerCardio = (id: string, fn: (c: ChronoCardio) => ChronoCardio) => updateExercise(id, (e) => (e.cardio ? { ...e, cardio: fn(e.cardio) } : e));

  /* 31 octobre 2026 : choix du cardio, pente et vitesse, zone 2 (lib/v2/seances/cardioChoix.ts, zone2.ts) */
  const [choixCardioFor, setChoixCardioFor] = useState<string | null>(null);
  const [reglagesCardio, setReglagesCardio] = useState<ReglagesCardio>({});
  const [zone2, setZone2] = useState<Zone2 | null>(null);
  const [lectureFc, setLectureFc] = useState<string | null>(null);
  useEffect(() => {
    chargerReglagesCardio().then(setReglagesCardio, () => {});
    chargerZone2().then(setZone2, () => setZone2(null));
  }, []);
  const cleCardio = cleChoix(draft?.programme?.id, draft?.programme?.jourId);
  const exoChoixCardio = draft?.exercises.find((e) => e.id === choixCardioFor && e.cardio) ?? null;
  const departCardio: ChoixCardio = exoChoixCardio?.cardio
    ? { type: exoChoixCardio.cardio.type ?? typeDepart(exoChoixCardio.name), minutes: Math.round(exoChoixCardio.cardio.objectifSec / 60) }
    : choixParDefaut({}, cleCardio);
  // en arrivant sur le cardio (pas lance, pas encore choisi), la feuille s'ouvre une fois
  useEffect(() => {
    if (!draft || draft.form || !current?.cardio || current.cardio.choisi || current.cardio.premierDebutMs || current.sets.every((x) => x.done)) return;
    setChoixCardioFor(current.id);
    changerCardio(current.id, (x) => ({ ...x, choisi: true }));
  }, [current?.id, current?.cardio?.choisi]); // eslint-disable-line react-hooks/exhaustive-deps
  const validerChoixCardio = (choix: ChoixCardio) => {
    const ex = exoChoixCardio;
    setChoixCardioFor(null);
    if (!ex?.cardio) return;
    const suiteEx = appliquerChoix(ex, choix, reglagesCardio);
    updateExercise(ex.id, () => suiteEx);
    void enregistrerChoix(cleCardio, choix);
    // chrono lance : la notification de fin suit le nouvel objectif et le nouveau nom
    if (suiteEx.cardio && chronoEnCours(suiteEx.cardio)) {
      const reste = (suiteEx.cardio.objectifSec * 1000 - ecouleMs(suiteEx.cardio, Date.now())) / 1000;
      if (reste > 0) void programmerFinCardio(reste, traduire('Cardio terminé'), traduire('{0} : objectif de {1} min atteint', sansTiret(traduire(nomFr(suiteEx.name))), choix.minutes));
      else void annulerFinCardio();
    }
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
  };
  // « Passer le cardio aujourd'hui » : il sort de la seance, rien n'est garde pour la prochaine fois
  const passerCardio = () => {
    const id = choixCardioFor;
    setChoixCardioFor(null);
    if (!id) return;
    if (suiteFinCardio(draft?.exercises.find((e) => e.id === id)?.cardio, Date.now(), false).annuler) void annulerFinCardio();
    update((d) => {
      const list = nettoyerEnchaines(delier(d.exercises, id).filter((e) => e.id !== id));
      return { ...d, exercises: list, currentId: d.currentId === id ? list[list.length - 1]?.id ?? null : d.currentId };
    });
  };
  const valeurCardio = (ex: LiveExercise, v: Valeurs) => changerCardio(ex.id, (x) => ({ ...x, segments: avecValeur(x.segments, infoCardio(x.type ?? typeDepart(ex.name)).mesure, v) }));
  const segmentCardio = (ex: LiveExercise) => changerCardio(ex.id, (x) => ({ ...x, segments: nouveauSegment(x.segments, ecouleMs(x, Date.now()) / 1000) }));
  const retirerSegmentCardio = (ex: LiveExercise) => changerCardio(ex.id, (x) => ({ ...x, segments: sansDernierSegment(x.segments) }));
  const suiteCardio = (ex: LiveExercise, suite: 'garder' | 'suggestion', prochain: Valeurs) => {
    changerCardio(ex.id, (x) => ({ ...x, suite }));
    const type = ex.cardio?.type ?? typeDepart(ex.name);
    void enregistrerReglagesCardio(type, prochain).then(setReglagesCardio, () => {});
  };
  // la FC moyenne du cardio, lue dans Sante ; la montre peut tarder a l'y ecrire : un second essai 20 s apres
  const lireFcCardio = (id: string, debut: number, fin: number, essai = 0) => {
    setLectureFc(id);
    fcMoyenneEntre(debut, fin).then((fc) => {
      if (fc !== null) {
        changerCardio(id, (x) => ({ ...x, fcMoy: fc }));
        setLectureFc(null);
      } else if (essai === 0) setTimeout(() => lireFcCardio(id, debut, fin, 1), 20_000);
      else setLectureFc(null);
    }, () => setLectureFc(null));
  };
  const demarrerCardio = (ex: LiveExercise) => {
    if (!ex.cardio) return;
    const t = Date.now();
    const c = demarrerChrono(ex.cardio, t);
    changerCardio(ex.id, () => c);
    const reste = (c.objectifSec * 1000 - ecouleMs(c, t)) / 1000;
    if (!c.signale && reste > 0) void programmerFinCardio(reste, traduire('Cardio terminé'), traduire('{0} : objectif de {1} min atteint', sansTiret(traduire(nomFr(ex.name))), Math.round(c.objectifSec / 60)));
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
  };
  const pauseCardio = (ex: LiveExercise) => {
    changerCardio(ex.id, (c) => pauseChrono(c, Date.now()));
    void annulerFinCardio();
  };
  const terminerCardio = (ex: LiveExercise) => {
    if (!ex.cardio) return;
    const t = Date.now();
    const sec = dureeFinaleSec(ex.cardio, t);
    if (sec <= 0) return;
    // pas de repos apres le cardio
    // 31 octobre 2026 : l'heure de fin et ta zone 2 restent avec le cardio, pour le bilan
    updateExercise(ex.id, (e) => ({ ...e, cardio: e.cardio ? { ...pauseChrono(e.cardio, t), finMs: t, ...(zone2 ? { zone2: { min: zone2.min, max: zone2.max } } : {}) } : e.cardio, sets: e.sets.map((x, i) => (i === 0 ? { ...x, reps: sec, done: true } : x)) }));
    void annulerFinCardio();
    // ta pente et ta vitesse de la fin reviennent la prochaine fois (le bilan peut proposer un pas de plus ou de moins)
    const type = ex.cardio.type ?? typeDepart(ex.name);
    const derniere = segmentCourant(ex.cardio.segments);
    if (derniere) {
      const { aSec: _a, ...v } = derniere;
      void enregistrerReglagesCardio(type, v).then(setReglagesCardio, () => {});
    }
    if (ex.cardio.premierDebutMs) lireFcCardio(ex.id, ex.cardio.premierDebutMs, t);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
  };
  // objectif atteint : le son si tu as l'app sous les yeux, le petit message si tu reviens apres (memes regles que le repos)
  const [cardioFiniVu, setCardioFiniVu] = useState(false);
  useEffect(() => {
    if (!cardioFiniVu) return;
    const t = setTimeout(() => setCardioFiniVu(false), DUREE_MESSAGE_MS);
    return () => clearTimeout(t);
  }, [cardioFiniVu]);
  // verifie chaque seconde avec le dernier brouillon, sans redessiner l'ecran (1er novembre 2026)
  const verifierCardio = useRef<() => void>(() => undefined);
  verifierCardio.current = () => {
    if (!draft) return;
    for (const e of draft.exercises) {
      const ch = e.cardio;
      if (!ch || ch.signale || !chronoEnCours(ch) || e.sets.every((x) => x.done) || !objectifAtteint(ch, Date.now())) continue;
      const d = decisionFinRepos({ finMs: finObjectifMs(ch), maintenant: Date.now(), etatApp: AppState.currentState });
      if (d === 'attendre' || d === 'rien') continue;
      if (d === 'son') {
        Vibration.vibrate([0, 400, 150, 400]);
        playWizzSound().catch(() => {});
      } else {
        setCardioFiniVu(true);
        impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
      }
      changerCardio(e.id, (c) => ({ ...c, signale: true }));
    }
  };
  const enSeance = !!draft;
  useEffect(() => {
    if (!enSeance) return;
    verifierCardio.current();
    const id = setInterval(() => verifierCardio.current(), 1000);
    return () => clearInterval(id);
  }, [enSeance]);

  /* (E) remplacer un exercice : la raison, puis une alternative a la fois (lib/v2/seances/alternatives.ts) */
  const [ecartes, setEcartes] = useState<Set<string>>(new Set());
  useEffect(() => {
    chargerEcartes().then((l) => setEcartes(nomsEcartes(l)), () => {});
  }, []);
  const [remplacerFor, setRemplacerFor] = useState<{ id: string; raison: 'occupee' | 'salle' | 'douleur' | null; liste: string[]; i: number } | null>(null);
  // 31 octobre 2026 : un exercice cardio garde son choix de machine de cardio ; les autres ouvrent « Changer d'exercice »
  // 31 octobre 2026 : un cardio s'ouvre sur la feuille « Ton cardio » (type, duree, passer)
  const ouvrirRemplacer = (ex: LiveExercise) => (ex.cardio ? setChoixCardioFor(ex.id) : setChangerFor({ id: ex.id, mode: 'changer' }));
  const choisirRaison = (raison: 'occupee' | 'salle' | 'douleur') => {
    const ex = draft?.exercises.find((e) => e.id === remplacerFor?.id);
    if (!ex || !draft) return setRemplacerFor(null);
    // un exercice cardio ne se remplace que par une autre machine de cardio (cardioFin.ts)
    const liste = ex.cardio ? alternativesCardio(ex.name, ecartes) : alternativesPour(ex.name, { muscle: ex.muscle, ecartes, deja: draft.exercises.map((e) => e.name) });
    setRemplacerFor({ id: ex.id, raison, liste, i: 0 });
  };
  const prendreAlternative = (nom: string) => {
    const r = remplacerFor;
    const ex = draft?.exercises.find((e) => e.id === r?.id);
    setRemplacerFor(null);
    if (!r || !ex || !draft || !r.raison) return;
    if (ex.cardio) {
      // meme objectif de duree, chrono garde
      updateExercise(ex.id, (e) => ({ ...e, name: nom, remplaceEnSeance: e.remplaceEnSeance ?? e.name }));
      // revue du 30 octobre 2026 : la notification de fin repart avec le bon nom (cardioFin.ts, suiteFinCardio)
      const suite = suiteFinCardio(ex.cardio, Date.now(), true);
      if (suite.reprogrammerDans) void programmerFinCardio(suite.reprogrammerDans, traduire('Cardio terminé'), traduire('{0} : objectif de {1} min atteint', sansTiret(traduire(nomFr(nom))), Math.round(ex.cardio.objectifSec / 60)));
      else if (suite.annuler) void annulerFinCardio();
      impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
      if (r.raison !== 'occupee') void ecarterExercice(ex.name, r.raison).then((l) => setEcartes(nomsEcartes(l)));
      return;
    }
    const h = hist.map.get(normName(nom));
    // (E3) meme objectif de series et de repetitions ; charges de ta derniere fois sur l'exercice choisi
    const reps = ex.cible?.repsMin ?? ex.objectifReps ?? ex.sets.find((x) => !x.done)?.reps ?? 10;
    const sets: LiveSet[] = ex.sets.map((_, i) => {
      const last = serieDerniereFois(h, i);
      return { id: uid(), weight: last?.weight ?? 0, reps: last?.reps ?? reps, done: false, ...(last ? { prevWeight: last.weight, prevReps: last.reps } : {}), ...(typeof last?.plaques === 'number' ? { plaques: last.plaques, prevPlaques: last.plaques } : {}) };
    });
    const original = sansPrise(ex.name).base;
    updateExercise(ex.id, (e) => {
      // le cran et l'unite de charge (kilos ou plaques) suivent le nouvel exercice
      const { cran: _c, plaques: _pl, ...reste } = e;
      return {
        ...reste,
        name: nom,
        muscle: EXERCISE_LIBRARY.find((x) => x.name === nom)?.muscle ?? e.muscle,
        sets,
        objectifSeries: e.objectifSeries ?? seriesVisees(e.sets),
        remplaceEnSeance: e.remplaceEnSeance ?? e.name,
        ...(e.cible ? { cible: { repsMin: e.cible.repsMin, repsMax: e.cible.repsMax, reposSec: e.cible.reposSec, ...(e.cible.secondes ? { secondes: true } : {}) } } : {}),
      };
    });
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    // (E4) machine occupee : pour cette seance seulement. (E5) pas dans ma salle, ca me fait mal : pour toujours
    if (r.raison === 'occupee') return;
    void ecarterExercice(original, r.raison).then((l) => setEcartes(nomsEcartes(l)));
    const prog = draft.programme;
    const cas = ex.caseProg;
    if (prog && cas) {
      // programme fixe en cours : le choix est retenu dans sa case, comme « Changer » sur la page du programme
      void chargerProgrammeActif()
        .then((a) => (a && a.id === prog.id ? remplacerExercice(cas.jourId, cas.index, nom) : undefined))
        .catch(() => {});
    }
  };

  /* 31 octobre 2026 : « Changer d'exercice » et « Enchaîner un exercice » (components/yoroi/v2/seance/ChangerExercice.tsx) */
  const [changerFor, setChangerFor] = useState<{ id: string; mode: 'changer' | 'enchainer' } | null>(null);
  useEffect(() => {
    chargerMachinesPerso().catch(() => {});
  }, []);
  /** Le cran et la hauteur de poulie suivent le nouvel exercice ; les series faites restent sur l'ancien (changerExo.ts) */
  const changerPour = (ex: LiveExercise, nom: string, muscle: string, portee: PorteeChangement) => {
    if (!draft) return;
    const h = hist.map.get(normName(nom));
    const reps = ex.cible?.repsMin ?? ex.objectifReps ?? ex.sets.find((x) => !x.done)?.reps ?? 10;
    const seriesNeuves = (l: LiveSet[]): LiveSet[] =>
      l.map((_, i) => {
        const last = serieDerniereFois(h, i);
        return { id: uid(), weight: last?.weight ?? 0, reps: last?.reps ?? reps, done: false, ...(last ? { prevWeight: last.weight, prevReps: last.reps } : {}), ...(typeof last?.plaques === 'number' ? { plaques: last.plaques, prevPlaques: last.plaques } : {}) };
      });
    const nouvelId = uid();
    update((d) => {
      const r = changerDansSeance(d.exercises, ex.id, { nom, muscle }, seriesNeuves, nouvelId);
      return r ? { ...d, exercises: r.exercises, currentId: d.currentId === ex.id ? r.currentId : d.currentId } : d;
    });
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    if (portee === 'jour') return;
    // « Toujours » : l'ancien n'est plus propose, et le programme en cours garde le choix dans sa case
    const original = sansPrise(ex.name).base;
    void ecarterExercice(original, 'salle').then((l) => setEcartes(nomsEcartes(l)));
    const prog = draft.programme;
    const cas = ex.caseProg;
    if (prog && cas) {
      void chargerProgrammeActif()
        .then((a) => (a && a.id === prog.id ? remplacerExercice(cas.jourId, cas.index, nom) : undefined))
        .catch(() => {});
    }
  };
  /** Ajoute un exercice a la suite, en superset : memes series visees, repos apres le dernier du groupe */
  const enchainerApres = (ex: LiveExercise, nom: string, muscle: string, portee: PorteeChangement) => {
    if (!draft) return;
    const h = hist.map.get(normName(nom));
    const n = Math.max(1, ex.objectifSeries ?? ex.sets.length);
    const tenu = EXERCISE_LIBRARY.find((x) => x.name === nom)?.unit === 'time';
    const repsMin = tenu ? 30 : ex.cible && !ex.cible.secondes ? ex.cible.repsMin : 10;
    const repsMax = tenu ? 45 : ex.cible && !ex.cible.secondes ? ex.cible.repsMax : 15;
    const reposSec = ex.cible?.reposSec ?? draft.restSec;
    const sets = makeSets(Array.from({ length: n }, (_, i) => h?.lastSets[Math.min(i, h.lastSets.length - 1)] ?? { weight: 0, reps: repsMin }), !!h);
    const neuf: LiveExercise = { id: uid(), name: nom, muscle, sets, objectifSeries: n, ...(ex.cible || tenu ? { cible: { repsMin, repsMax, reposSec, ...(tenu ? { secondes: true } : {}) } } : {}) };
    const groupe = groupeDe(draft.exercises, ex.id);
    const ancre = groupe[groupe.length - 1] ?? ex;
    update((d) => ({ ...d, exercises: ajouterAuGroupe(d.exercises, ex.id, portee === 'toujours' && d.programme ? { ...neuf, ajoutBloc: true } : neuf) }));
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    const prog = draft.programme;
    if (portee !== 'toujours' || !prog) return;
    const exo: ExoProgramme = { nom, muscle, series: n, repsMin, repsMax, reposSec, ...(tenu ? { secondes: true } : {}) };
    void modifierEnchainements((t) => avecAjout(t, cleJour(prog.id, prog.jourId), ancre.name, exo));
  };
  const choisirChangement = (nom: string, muscle: string, portee: PorteeChangement) => {
    const r = changerFor;
    setChangerFor(null);
    const ex = draft?.exercises.find((e) => e.id === r?.id);
    if (!r || !ex) return;
    if (r.mode === 'enchainer') enchainerApres(ex, nom, muscle, portee);
    else changerPour(ex, nom, muscle, portee);
  };
  /** Sortir du superset : pour cette seance, et retire du programme ce qui y etait garde */
  const sortirDuGroupe = (ex: LiveExercise) => {
    setMenuFor(null);
    if (!draft) return;
    const i = draft.exercises.findIndex((e) => e.id === ex.id);
    const avant = i > 0 && draft.exercises[i - 1].enchaine ? draft.exercises[i - 1].name : null;
    update((d) => ({ ...d, exercises: delier(d.exercises, ex.id) }));
    const prog = draft.programme;
    if (!prog) return;
    const cle = cleJour(prog.id, prog.jourId);
    void modifierEnchainements((t) => {
      let suite = avecLien(t, cle, ex.name, false);
      if (avant) suite = avecLien(suite, cle, avant, false);
      return ex.ajoutBloc ? sansExoDuBloc(suite, cle, ex.name, avant) : suite;
    });
  };

  const addExercise = (name: string, muscle?: string) => {
    setPickerOpen(false);
    const ex = exerciseFrom(name, muscle, hist.map.get(normName(name)));
    update((d) => allerAExercice({ ...d, exercises: [...d.exercises, ex] }, ex.id));
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
  };

  const setValue = (exId: string, setId: string, patch: Partial<LiveSet>) =>
    updateExercise(exId, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }));

  const validate = (ex: LiveExercise, index: number) => {
    if (!draft) return;
    const set = ex.sets[index];
    if (!set || set.reps <= 0) return;
    const h = hist.map.get(normName(ex.name));
    const earlier = ex.sets.filter((s, i) => s.done && i !== index);
    let record = false;
    if (h && set.weight > 0) {
      const bestW = Math.max(h.bestWeight, ...earlier.map((s) => s.weight));
      const bestE = Math.max(h.bestE1rm, ...earlier.map((s) => epley(s.weight, s.reps)));
      record = set.weight > bestW + 0.001 || epley(set.weight, set.reps) > bestE + 0.01;
    }
    // 3 novembre 2026 : en plaques, le record se compte en plaques (plus de plaques, ou autant et plus de repetitions)
    if (!record && typeof set.plaques === 'number') record = recordPlaquesBattu(reperesDe(indexRep, ex.name).recordPlaques ?? null, earlier.filter((s) => s.type !== 'warmup'), set);
    const sets = ex.sets.map((s, i) => {
      if (i === index) return { ...s, done: true, record };
      // la serie suivante sans reference reprend les valeurs de celle-ci
      if (i === index + 1 && !s.done && s.prevWeight === undefined) return { ...s, weight: set.weight, reps: set.reps, ...(typeof set.plaques === 'number' ? { plaques: set.plaques } : {}) };
      return s;
    });
    update((d) => {
      const exercises = d.exercises.map((e) => (e.id === ex.id ? { ...e, sets } : e));
      // 31 octobre 2026 : superset, A puis B sans repos, le repos apres le dernier puis retour au premier (superset.ts)
      const suite = d.form ? { suivantId: null, repos: true } : apresSerie(exercises, ex.id);
      return {
        ...d,
        exercises,
        ...(suite.suivantId ? { currentId: suite.suivantId } : {}),
        // seance de programme : le repos prevu pour cet exercice ; drop set suivi d'un autre drop set : pas de repos
        // 30 octobre 2026 : minuteur de repos coupe, pas de repos du tout (lib/v2/seances/minuteurRepos.ts)
        ...reposApresSerie({ sansRepos: d.sansRepos, pasDeRepos: d.form || ex.sets[index + 1]?.type === 'dropset' || !suite.repos, secondes: d.reposManuel ? d.restSec : ex.cible?.reposSec ?? d.restSec, maintenant: Date.now() }),
      };
    });
    if (record) {
      setFreshRecord(set.id);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    } else {
      impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    }
    // 3 novembre 2026 : la derniere serie prevue validee, le sticker « validé » arrive avec un rebond
    if (etatExo({ ...ex, sets }).etat === 'valide' && etatExo(ex).etat !== 'valide') setValidePop(ex.id);
  };

  /** Enregistre la correction : la serie reste validee, sans repos ni pre-remplissage, la serie en cours ne bouge pas */
  const enregistrerCorrection = () => {
    if (!draft || !correction) return;
    const ex = draft.exercises.find((e) => e.id === correction.exId);
    const avant = ex?.sets.find((x) => x.id === correction.setId);
    if (!ex || !avant) return setCorrection(null);
    const h = hist.map.get(normName(ex.name));
    const essai = corrigerSerie(ex.sets, correction.setId, correction, h);
    if (!essai) return;
    const { setId, weight, reps, plaques } = correction;
    // 3 novembre 2026 : une serie en plaques se corrige en plaques, son record se compte en plaques
    const recP = typeof plaques === 'number' ? recordPlaquesBattu(reperesDe(indexRep, ex.name).recordPlaques ?? null, ex.sets.filter((x) => x.done && x.id !== setId && x.type !== 'warmup'), { plaques, reps }) : false;
    updateExercise(ex.id, (e) => {
      const l = corrigerSerie(e.sets, setId, { weight, reps }, h)?.sets ?? e.sets;
      return { ...e, sets: typeof plaques === 'number' ? l.map((x) => (x.id === setId ? { ...x, plaques, record: x.record || recP } : x)) : l };
    });
    setCorrection(null);
    if ((essai.record || recP) && !avant.record) {
      setFreshRecord(setId);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    } else {
      impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    }
    setSerieCorrigee(setId);
    if (minuteurCorrige.current) clearTimeout(minuteurCorrige.current);
    minuteurCorrige.current = setTimeout(() => setSerieCorrigee(null), DUREE_PASTILLE_MS);
  };

  /**
   * Drop set (26 octobre 2026, retour utilisateur : goupille, changement de charge instantane) : une serie
   * juste apres la derniere faite, charge baissee d'environ 20 %, sans temps de repos quand tu la valides.
   */
  const addDropSet = (ex: LiveExercise) => {
    const faites = ex.sets.filter((x) => x.done);
    const ref = faites[faites.length - 1] ?? ex.sets[0];
    if (!ref) return;
    const pas = unite === 'lb' ? 2.268 : 2.5;
    const charge = ref.weight > 0 ? Math.max(pas, Math.round((ref.weight * 0.8) / pas) * pas) : 0;
    // en plaques : environ 20 % de plaques en moins, au moins une de moins
    const pl = typeof ref.plaques === 'number' && ex.plaques ? Math.max(0, Math.min(ref.plaques - 1, Math.round(ref.plaques * 0.8))) : null;
    const s: LiveSet = pl !== null
      ? { id: uid(), weight: kgDePlaques(pl, ex.plaques?.kgParPlaque), plaques: pl, reps: ref.reps, done: false, type: 'dropset' }
      : { id: uid(), weight: Math.round(charge * 100) / 100, reps: ref.reps, done: false, type: 'dropset' };
    updateExercise(ex.id, (e) => {
      const i = e.sets.findIndex((x) => !x.done);
      const sets = [...e.sets];
      sets.splice(i < 0 ? sets.length : i, 0, s);
      return { ...e, sets, laisse: false };
    });
    // le repos en cours s'arrete : on enchaine tout de suite
    update((d) => ({ ...d, restEndsAt: null }));
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
  };

  const addSet = (ex: LiveExercise) => {
    const last = ex.sets[ex.sets.length - 1];
    // 30 octobre 2026 (H3) : la serie d'avant, ou les repetitions de l'objectif si elle n'en a pas
    const s: LiveSet = { id: uid(), ...nouvelleSerie(last, ex.cible?.repsMin ?? ex.objectifReps), done: false, ...(ex.plaques ? { plaques: typeof last?.plaques === 'number' ? last.plaques : 0 } : {}) };
    updateExercise(ex.id, (e) => ({ ...e, sets: [...e.sets, s] }));
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    // chaque ajout se voit, meme deux d'affilee : la pastille repart avec la nouvelle serie
    setSerieAjoutee(s.id);
    if (minuteurAjout.current) clearTimeout(minuteurAjout.current);
    minuteurAjout.current = setTimeout(() => setSerieAjoutee(null), DUREE_PASTILLE_MS);
  };

  /**
   * Fin de seance (16 octobre 2026) : valide d'un coup les series restantes qui ont des repetitions,
   * avec la meme detection de record que la validation une par une, sans lancer de repos.
   */
  const validateAll = () => {
    let anyRecord = false;
    update((d) => ({
      ...d,
      exercises: d.exercises.map((ex) => {
        // exercice laisse : ses series prevues non faites ne sont pas validees
        if (ex.laisse) return ex;
        const h = hist.map.get(normName(ex.name));
        const sets: LiveSet[] = [];
        for (const s of ex.sets) {
          if (s.done || s.reps <= 0) {
            sets.push(s);
            continue;
          }
          const earlier = sets.filter((x) => x.done);
          let record = false;
          if (h && s.weight > 0) {
            const bestW = Math.max(h.bestWeight, ...earlier.map((x) => x.weight));
            const bestE = Math.max(h.bestE1rm, ...earlier.map((x) => epley(x.weight, x.reps)));
            record = s.weight > bestW + 0.001 || epley(s.weight, s.reps) > bestE + 0.01;
          }
          if (!record && typeof s.plaques === 'number') record = recordPlaquesBattu(reperesDe(indexRep, ex.name).recordPlaques ?? null, earlier.filter((x) => x.type !== 'warmup'), s);
          if (record) anyRecord = true;
          sets.push({ ...s, done: true, record });
        }
        return { ...ex, sets };
      }),
    }));
    if (anyRecord) notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    else impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
  };

  /** Ferme la feuille de fin sur le premier exercice qui a une serie a valider */
  const showPending = () => {
    const ex = draft?.exercises.find((e) => seriesRestantes(e) > 0);
    if (ex) update((d) => allerAExercice(d, ex.id));
    setFinishOpen(false);
  };

  /* 30 octobre 2026 (H1) : supprimer une serie d'un geste, sans fenetre ; remplie, « Annuler » quelques secondes.
     Il reste toujours au moins une serie (lib/v2/seances/seriesSaisie.ts). */
  const [annulable, setAnnulable] = useState<{ exId: string; serie: LiveSet; index: number } | null>(null);
  useEffect(() => {
    if (!annulable) return;
    const t = setTimeout(() => setAnnulable(null), 5000);
    return () => clearTimeout(t);
  }, [annulable]);
  const supprimerSerie = (ex: LiveExercise, index: number) => {
    const serie = ex.sets[index];
    if (!serie || ex.sets.length <= 1) return;
    updateExercise(ex.id, (e) => ({ ...e, sets: sansSerie(e.sets, index) }));
    setAnnulable(etatSerie(serie) === 'vide' ? null : { exId: ex.id, serie, index });
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
  };
  const annulerSuppression = () => {
    const a = annulable;
    setAnnulable(null);
    if (a) updateExercise(a.exId, (e) => ({ ...e, sets: remettreSerie(e.sets, a.serie, a.index) }));
  };
  const askSetAction = (ex: LiveExercise, index: number) => supprimerSerie(ex, index);

  const moveExercise = (id: string, dir: -1 | 1) =>
    update((d) => {
      const i = d.exercises.findIndex((e) => e.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.exercises.length) return d;
      const list = [...d.exercises];
      [list[i], list[j]] = [list[j], list[i]];
      return { ...d, exercises: nettoyerEnchaines(list) };
    });

  const removeExercise = (id: string) => {
    appAlert(traduire('Supprimer cet exercice ?'), traduire('Ses séries seront retirées de la séance.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: () => {
          setMenuFor(null);
          // revue du 30 octobre 2026 : un cardio retire pendant que son chrono tourne ne sonne plus (cardioFin.ts)
          if (suiteFinCardio(draft?.exercises.find((e) => e.id === id)?.cardio, Date.now(), false).annuler) void annulerFinCardio();
          update((d) => {
            // 31 octobre 2026 : un exercice retire sort d'abord de son superset
            const list = nettoyerEnchaines(delier(d.exercises, id).filter((e) => e.id !== id));
            return { ...d, exercises: list, currentId: d.currentId === id ? list[0]?.id ?? null : d.currentId };
          });
        },
      },
    ]);
  };

  // repos affiche : celui de l'exercice en cours dans un programme, sinon ton reglage
  // (24 octobre 2026 : aussi pour une seance guidee sans programme, « Je choisis mes zones » : la cible decide)
  const guidee = !!draft?.programme || !!draft?.exercises.some((e) => e.cible);
  const reposAffiche = guidee && !draft?.reposManuel && current?.cible ? current.cible.reposSec : draft?.restSec ?? 90;

  const changeRest = (delta: number) => {
    if (!draft) return;
    const v = Math.min(600, Math.max(15, reposAffiche + delta));
    // seance de programme : regle a la main, ton repos remplace celui du programme jusqu'a la fin
    update((d) => ({ ...d, restSec: v, ...(guidee ? { reposManuel: true } : {}) }));
    // dans une seance guidee, le reglage reste pour cette seance : ton repos habituel n'est pas touche
    if (!guidee) saveRestPref(v);
  };

  // Resume pour la feuille de fin
  const summary = useMemo(() => {
    const done = (draft?.exercises ?? []).flatMap((e) => e.sets.filter((s) => s.done));
    // 30 octobre 2026 (H2) : une serie vide est ignoree, elle ne compte pas comme oubliee
    const pending = (draft?.exercises ?? []).reduce((n, e) => n + (e.laisse ? 0 : seriesAFaire(e.sets)), 0);
    // series restantes qui ont des repetitions : les seules que « Tout valider » peut valider
    const pendingValid = (draft?.exercises ?? []).reduce((n, e) => n + (e.laisse ? 0 : e.sets.filter((s) => !s.done && s.reps > 0).length), 0);
    return {
      sets: done.length,
      pending,
      pendingValid,
      // regle unique du tonnage (lib/v2/trainingWeek) : series terminees, charge x repetitions, poids du corps exclu
      tonnage: tonnageOfSets(done.filter((s) => s.type !== 'warmup').map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 }))),
      records: done.filter((s) => s.record).length,
    };
  }, [draft]);

  // 24 octobre 2026 : la seance en direct sur l'ecran verrouille et dans la Dynamic Island (lib/v2/widgets/activiteSeance.ts)
  const etatLive = useMemo((): EtatSeance | null => {
    if (!draft || draft.form || draft.editId) return null;
    const cur = draft.exercises.find((e) => e.id === draft.currentId) ?? draft.exercises[0];
    const titre = traduire(draftTitle(draft));
    if (!cur) return { titre, debutMs: draft.startedAt, libelle: titre, finReposMs: null, reposTotalS: 0, ensuite: '' };
    const i = cur.sets.findIndex((x) => !x.done);
    const nom = sansTiret(traduire(nomFr(cur.name)));
    const libelle = i >= 0 ? traduire('{0}, série {1} sur {2}', nom, i + 1, cur.sets.length) : traduire('{0}, bouclé', nom);
    const suivant = i >= 0 ? null : draft.exercises.find((e) => e.id !== cur.id && seriesRestantes(e) > 0);
    const ensuite = i >= 0 ? traduire('Ensuite : {0}, série {1}', nom, i + 1) : suivant ? traduire('Ensuite : {0}', sansTiret(traduire(nomFr(suivant.name)))) : traduire('Dernier effort, bravo');
    // 25 octobre 2026 : boutons « Série faite » et « +15 s » dans la Dynamic Island (lib/v2/seance/actionsIle.ts)
    const textes: TextesIle = {
      serie: traduire('{0}, série {1} sur {2}'),
      ensuite: traduire('Ensuite : {0}, série {1}'),
      ensuiteExo: traduire('Ensuite : {0}'),
      fini: traduire('Séance bouclée'),
      bouton: traduire('Série faite'),
      plus15: traduire('+15 s'),
      reposFini: traduire('Repos terminé'),
    };
    const plan = planIle(draft, textes, (e) => sansTiret(traduire(nomFr(e.name))), rappelIle);
    // 28 octobre 2026 : la charge et les repetitions de la prochaine serie de chaque exercice, pour l'Apple Watch
    const charges = draft.exercises.map((e) => {
      const st = e.sets.find((x) => !x.done) ?? e.sets[e.sets.length - 1];
      return { kg: Number(st?.weight) || 0, reps: Number(st?.reps) || e.cible?.repsMin || Number(st?.prevReps) || 0 };
    });
    return { titre, debutMs: draft.startedAt, libelle, finReposMs: draft.restEndsAt ?? null, reposTotalS: draft.restTotal, ensuite, plan, charges };
  }, [draft, rappelIle]); // eslint-disable-line react-hooks/exhaustive-deps
  useActiviteSeance(etatLive);
  // les appuis faits dans la Dynamic Island arrivent ici quand l'écran est ouvert (lib/v2/widgets/synchro.ts)
  const draftIle = useRef(draft);
  draftIle.current = draft;
  useEffect(
    () =>
      ecouterActionsIle((actions) => {
        const d = draftIle.current;
        // séance pas encore chargée ou saisie après coup : les appuis vont au brouillon enregistré
        if (!d || d.form || d.editId) return false;
        update((x) => appliquerActionsIle(x, actions));
        return true;
      }),
    [update],
  );

  const autoMuscles = useMemo(
    () => Array.from(new Set((draft?.exercises ?? []).filter((e) => e.sets.some((s) => s.done)).map((e) => muscleId(e.muscle)).filter((m): m is string => !!m && MUSCLES.some((x) => x.id === m)))),
    [draft?.exercises],
  );
  const shownMuscles = draft?.muscles ?? autoMuscles;
  const toggleMuscle = (id: string) =>
    update((d) => {
      const cur = d.muscles ?? autoMuscles;
      return { ...d, muscles: cur.includes(id) ? cur.filter((m) => m !== id) : [...cur, id] };
    });
  const setDetails = (patch: Partial<SessionDetails>) => update((d) => (d.details ? { ...d, details: { ...d.details, ...patch } } : d));

  const abandon = () => {
    if (draft?.form) {
      appAlert(draft.editId ? traduire('Quitter sans enregistrer ?') : traduire('Annuler cette saisie ?'), traduire('Tes changements ne seront pas gardés.'), [
        { text: traduire('Rester'), style: 'cancel' },
        { text: traduire('Quitter'), style: 'destructive', onPress: () => { finished.current = true; setFinishOpen(false); void effacerSaisie(draft); router.back(); } },
      ]);
      return;
    }
    appAlert(traduire('Abandonner la séance ?'), traduire('Rien ne sera enregistré.'), [
      { text: traduire('Continuer la séance'), style: 'cancel' },
      {
        text: traduire('Abandonner'),
        style: 'destructive',
        onPress: async () => {
          finished.current = true;
          setFinishOpen(false);
          mesurerAbandon(draft);
          await clearDraft();
          void annulerFinCardio();
          terminerActiviteSeance();
          router.back();
        },
      },
    ]);
  };

  const save = async () => {
    if (!draft || savingRef.current || saving || (summary.sets === 0 && !draft.form)) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const records: SeanceRecord[] = [];
      const exercises: Exercise[] = draft.exercises
        .map((e) => {
          const done = e.sets.filter((s) => s.done);
          if (done.length === 0) return null;
          // 3 novembre 2026 : une serie en plaques garde ses plaques ; son weight reste en kilos (0 sans poids de plaque)
          const setsData = done.map((s) => ({ weight: s.weight, reps: s.reps, ...(s.type ? { type: s.type } : {}), ...(typeof s.plaques === 'number' ? { plaques: s.plaques } : {}) }));
          const best = bestSet(setsData)!;
          const recs = done.filter((s) => s.record);
          if (recs.length > 0) {
            const top = [...recs].sort((a, b) => epley(b.weight, b.reps) - epley(a.weight, a.reps))[0];
            const h = hist.map.get(normName(e.name));
            const topP = recs.filter((s) => typeof s.plaques === 'number').sort((a, b) => (b.plaques! - a.plaques!) || (b.reps - a.reps))[0];
            if (topP && !(top.weight > 0)) records.push({ name: e.name, weight: 0, reps: topP.reps, kind: 'charge', plaques: topP.plaques });
            else records.push({ name: e.name, weight: top.weight, reps: top.reps, kind: h && top.weight > h.bestWeight ? 'charge' : 'max' });
          }
          const out: Exercise = { ...(e.orig ?? {}), name: e.name, muscle_group: e.muscle, weight: best.weight, reps: best.reps, sets: setsData.length, setsData };
          // 1er novembre 2026 : lié au suivant (superset, crunch puis roue), gardé pour que l'app apprenne tes habitudes
          if (e.enchaine) (out as Exercise & { enchaine?: true }).enchaine = true;
          else delete (out as Exercise & { enchaine?: true }).enchaine;
          // 3 novembre 2026 : l'exercice note en plaques, et le poids d'une plaque seulement si tu l'as donne (plaques.ts)
          const enP = out as Exercise & { unite_charge?: 'plaques'; kg_par_plaque?: number };
          if (setsData.some((s) => typeof s.plaques === 'number')) {
            enP.unite_charge = 'plaques';
            if (e.plaques?.kgParPlaque) enP.kg_par_plaque = e.plaques.kgParPlaque;
            else delete enP.kg_par_plaque;
          } else {
            delete enP.unite_charge;
            delete enP.kg_par_plaque;
          }
          // la note, et pour le cardio la duree reelle (minutes) et la distance (lib/v2/seances/exerciceEnregistre.ts)
          return completerExercice(out, e, done[0]?.reps ?? 0);
        })
        .filter((e): e is Exercise => e !== null);

      const start = new Date(draft.startedAt);
      const muscles = draft.muscles ?? autoMuscles;
      const det = draft.details;
      finished.current = true;
      const result = await saveSeance(
        {
          ...(det ? trainingFromDetails(det) : {}),
          sport: draft.sport,
          date: draft.form && det ? det.date : isoDay(start),
          start_time: draft.form && det ? timeOf(det.startMin) : hhmm(start),
          duration_minutes: draft.form && det ? det.duration : Math.max(1, Math.round(Math.floor((Date.now() - draft.startedAt) / 1000) / 60)),
          exercises: exercises.length ? exercises : undefined,
          muscles: muscles.length ? muscles.join(',') : undefined,
          notes: draft.notes.trim() || undefined,
          intensity: draft.intensity ?? undefined,
          source: 'manual',
        },
        { slotId: draft.slotId, title: draft.editId ? getSportName(draft.sport) : draftTitle(draft), records, editId: draft.editId, methode: 'live' },
      );
      setFinishOpen(false);
      // 26 octobre 2026 : la seance est enregistree, le brouillon part tout de suite (sinon, app fermee juste
      // apres, elle reapparaissait « en cours » et pouvait etre enregistree deux fois)
      if (!draft.form) await clearDraft();
      else void effacerSaisie(draft);
      void annulerFinCardio();
      if (draft.programme && !draft.editId) await marquerJourFait(draft.programme.id, draft.programme.jourId, result.id, draft.form && det ? det.date : undefined).catch(() => {});
      if (draft.maSeance && !draft.editId && exercises.length > 0) await marquerFaite(draft.maSeance, draft.form && det ? det.date : undefined).catch(() => {});
      if (draft.editId) {
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        router.back();
        return;
      }
      terminerActiviteSeance();
      router.replace({ pathname: '/seance/fin' as any, params: { id: String(result.id), ...(draft.maSeance ? { maSeance: draft.maSeance } : {}) } });
    } catch (err) {
      finished.current = false;
      logger.error('Enregistrement de la seance impossible', err);
      appAlert(traduire('Oups'), traduire('La séance n’a pas pu être enregistrée. Elle reste en cours, réessaie.'));
      savingRef.current = false;
      setSaving(false);
    }
  };

  // hors programme : la meme double progression que les programmes (calcul garde en memoire, pas a chaque seconde)
  const libreNom = current && !current.cible && !draft?.editId ? current.name : null;
  const libre = useMemo(() => (libreNom ? proposerLibre(seancesDeLExo(toutesSeances, libreNom, 2)) : null), [libreNom, toutesSeances]);
  // 28 octobre 2026 : coach vocal, une voix dans les écouteurs (lib/v2/coachVocal)
  useCoachVocal(draft, toutesSeances);
  // 2 novembre 2026 : record, max de la derniere fois et cran en haut de l'exercice (lib/v2/seances/reperesExo.ts)
  const indexRep = useMemo(() => indexReperes(toutesSeances as unknown as Parameters<typeof indexReperes>[0]), [toutesSeances]);
  const grandEcran = useGrandEcran();

  if (!draft) {
    return <View style={{ flex: 1, backgroundColor: c.background }}><Stack.Screen options={{ gestureEnabled: false }} /></View>;
  }

  const title = draftTitle(draft);
  const restOn = !!draft.restEndsAt;
  // en direct : la barre d'action fixe du bas (valider, exercice suivant, terminer) prend sa place
  const cardioActif = !!current?.cardio && activeIndex >= 0;
  const barreOn = !draft.form && !restOn && !cardioActif;
  const bottomSpace = insets.bottom + (restOn ? 110 : barreOn ? 130 : 30);
  const hCurrent = current ? hist.map.get(normName(current.name)) : undefined;
  const repTous = current ? reperesDe(indexRep, current.name) : null;
  // 3 novembre 2026 : exercice en plaques, record et derniere fois en plaques (jamais les kilos d'un autre jour)
  const enPlaques = !!current?.plaques;
  const rep = repTous && enPlaques
    ? {
        record: repTous.recordPlaques ? { weight: 0, reps: repTous.recordPlaques.reps, plaques: repTous.recordPlaques.plaques } : null,
        derniere: repTous.dernierePlaques ? { date: repTous.dernierePlaques.date, max: { weight: 0, reps: repTous.dernierePlaques.max.reps, plaques: repTous.dernierePlaques.max.plaques } } : null,
      }
    : repTous;
  const chargeRepere = (r: { weight: number; reps: number; plaques?: number }) => (r.plaques ? libellePlaques(r.plaques) : r.weight > 0 ? libelleCharge(r.weight, unite) : traduire('{0} répétitions', r.reps));
  const cranHaut = current ? cranAffiche(current.cran, cranAvant(cransAvant, current.name)) : null;
  const recordNeuf = !!rep?.record && !!current && !draft.form && (enPlaques ? recordPlaquesBattuEnSeance(repTous?.recordPlaques, current.sets) : recordBattu(rep.record, current.sets));
  // 30 octobre 2026 (C) : l'objectif de series de l'exercice (lib/v2/seances/objectifExo.ts)
  const objectif = current ? objectifExo(current) : null;
  // objectif atteint en direct : l'exercice est boucle, une serie ajoutee en plus reste possible sans etre poussee
  const enPlus = !draft.form && !!objectif?.atteint && activeIndex >= 0;
  const currentDone = current ? (current.sets.length > 0 && current.sets.every((s) => s.done)) || enPlus : false;
  // 3 novembre 2026 (Houari) : validé seulement si toutes les series prevues sont faites (lib/v2/seances/etatExo.ts).
  // Il en manque (serie sautee, ou supprimee sous l'objectif) : avertissement et serie mise en evidence.
  const etatCourant = current && !current.cardio ? etatExo(current) : null;
  const derniereFaite = current ? current.sets.reduce((m, s, i) => (s.done ? i : m), -1) : -1;
  const manqueVisible = !!etatCourant && etatCourant.etat === 'incomplet' && (draft.form || activeIndex < 0 || etatCourant.indexManquants.some((i) => i < derniereFaite));
  const serieManquante = (i: number) => manqueVisible && !!etatCourant?.indexManquants.includes(i);
  basMasque.current = Math.max(0, bottomSpace - 14);
  // 26 octobre 2026 : un exercice laisse (passe apres au moins une serie) n'est plus repropose
  // 31 octobre 2026 : la regle est dans lib/v2/seances/cardioSeance.ts (testee : abdos en superset, puis le cardio)
  const nextEx = current ? exerciceSuivant(draft.exercises, current.id) : undefined;
  const menuEx = draft.exercises.find((e) => e.id === menuFor) ?? null;
  const noteEx = draft.exercises.find((e) => e.id === noteFor) ?? null;
  const priseEx = draft.exercises.find((e) => e.id === priseFor) ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ gestureEnabled: false }} />

      {/* En-tete : retour (la seance reste en cours), titre, chrono, Terminer */}
      <View style={{ paddingTop: Math.max(insets.top, 24) + 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {draft.form ? (
          <Pressable onPress={abandon} accessibilityRole="button" accessibilityLabel={traduire("Fermer sans enregistrer")} style={[carteBlanche(c.surface, c.divider), { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }]}>
            <Icon name="close" size={18} strokeWidth={2.6} />
          </Pressable>
        ) : (
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={traduire("Réduire, la séance reste en cours")} style={[carteBlanche(c.surface, c.divider), { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }]}>
            <Icon name="down" size={20} strokeWidth={2.6} />
          </Pressable>
        )}
        {draft.form && draft.details ? (
          <Pressable onPress={() => setFinishOpen(true)} accessibilityRole="button" accessibilityLabel={traduire("Changer le jour et la durée")} style={{ flex: 1 }}>
            <Ink size={14} weight="bold" color={c.textSecondary} numberOfLines={1}>{draft.editId ? traduire('Modifier ta séance') : title}</Ink>
            <Ink size={22} weight="black" tight numberOfLines={1}>{dayLabel(draft.details.date)}, {fmtMinutes(draft.details.duration)}</Ink>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }}>
            <Ink size={14} weight="bold" color={c.textSecondary} numberOfLines={1}>{traduire(title)}</Ink>
            <ChronoSeance debut={draft.startedAt} />
          </View>
        )}
        {!draft.form ? <BoutonCoachVocal /> : null}
        <BoutonPrincipal onPress={() => setFinishOpen(true)} hauteur={46} rayon={16} compact tailleTexte={15} lignes={1} label={draft.form ? traduire('Enregistrer') : traduire('Terminer')} />
      </View>

      {/* Avancement : une barre par exercice */}
      {draft.exercises.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 16, marginTop: 10 }} accessibilityLabel={traduire("Exercice {0} sur {1}", draft.exercises.indexOf(current!) + 1, draft.exercises.length)}>
          {draft.exercises.map((e) => {
            const isCur = e.id === current?.id;
            const all = e.sets.length > 0 && e.sets.every((s) => s.done);
            return (
              <Pressable key={e.id} onPress={() => update((d) => allerAExercice(d, e.id))} accessibilityLabel={traduire("Aller à {0}", e.name)} style={{ flex: 1, paddingVertical: 8 }}>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: isCur ? c.detail : all ? c.onPrimary : c.fillSubtle }} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <ScrollView ref={scrollRef} onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }} scrollEventThrottle={32} onLayout={(e) => { vueH.current = e.nativeEvent.layout.height; }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: bottomSpace, gap: 12 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
        {!current ? (
          <EmptyStart
            image={sportImage(draft.sport, femme, 1)}
            recent={hist.recent.map((k) => hist.map.get(k)!).filter((h) => h && !ecartes.has(sansPrise(h.name).base)).slice(0, 8)}
            onPick={(h) => addExercise(h.name, h.muscle)}
            onLibrary={() => setPickerOpen(true)}
          />
        ) : (
          <>
            {/* 25 octobre 2026 : le coach en direct, une phrase qui change à chaque moment (lib/v2/seance/coachSeance.ts) */}
            <CoachDirect draft={draft} femme={femme} unite={unite} />
            {/* 31 octobre 2026 : superset ou circuit en cours, les exercices lies et celui ou tu en es (superset.ts) */}
            {draft.form ? null : <EnTeteSuperset exercises={draft.exercises} currentId={current.id} onAller={(id) => update((d) => ({ ...d, currentId: id }))} />}
            <View onLayout={(e) => { carteY.current = e.nativeEvent.layout.y; }} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4, marginTop: 4 }}>
              <View style={{ flex: 1, gap: 4 }}>
                {draft.exercises.length > 1 ? (
                  <Ink size={13} weight="extraBold" color={c.accent}>{traduire('EXERCICE {0} SUR {1}', draft.exercises.indexOf(current) + 1, draft.exercises.length)}</Ink>
                ) : null}
                <Ink size={30} weight="black" tight>{sansTiret(traduire(current.name))}</Ink>
                {/* 2 novembre 2026 (Houari) : ton record, le max de la derniere fois et le cran, cote a cote sous le nom.
                    Deux lignes au plus, rien de coupe : le record et le cran (courts) d'abord, puis « Dernière fois ». */}
                {current.cardio || !rep ? null : (
                  <>
                    {rep.record || rep.derniere || cranHaut != null ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        {rep.record ? (
                          <View
                            accessible
                            accessibilityLabel={recordNeuf ? traduire('Nouveau record sur cet exercice') : traduire('Ton record sur cet exercice : {0}', chargeRepere(rep.record))}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: grandEcran ? 32 : 28, paddingLeft: 6, paddingRight: 10, borderRadius: 10, backgroundColor: recordNeuf ? c.accent : c.accentTint }}
                          >
                            <IconSeances name="trophy" size={grandEcran ? 18 : 16} color={recordNeuf ? c.onAccent : c.accentText} />
                            <Ink size={grandEcran ? 14 : 13} weight="extraBold" color={recordNeuf ? c.onAccent : c.accentText} numberOfLines={1}>
                              {recordNeuf
                                ? traduire('Nouveau record')
                                : traduire('Record {0}', chargeRepere(rep.record))}
                            </Ink>
                          </View>
                        ) : null}
                        {cranHaut != null ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: grandEcran ? 32 : 28, paddingLeft: illus.stickers ? 4 : 10, paddingRight: 10, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.divider }}>
                            <StickerSinon nom="reglage_machine" taille={grandEcran ? 22 : 20} />
                            <Ink size={grandEcran ? 14 : 13} weight="extraBold" numberOfLines={1}>{traduire('Cran {0}', cranHaut)}</Ink>
                          </View>
                        ) : null}
                        {rep.derniere ? (
                          <View style={{ flexShrink: 1, maxWidth: '100%', minHeight: grandEcran ? 32 : 28, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.divider }}>
                            <Ink size={grandEcran ? 14 : 13} weight="bold" color={c.textSecondary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                              {traduire('Dernière fois : max {0}', setLabel(rep.derniere.max, unite))}
                            </Ink>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    {!rep.record && !rep.derniere ? (
                      <Ink size={14} color={c.textSecondary}>{enPlaques ? traduire('Première fois en plaques sur cet exercice. Ce que tu fais aujourd’hui devient ta référence.') : traduire('Première fois sur cet exercice. Ce que tu fais aujourd’hui devient ta référence.')}</Ink>
                    ) : null}
                  </>
                )}
                {libre && !enPlaques ? (
                  <Ink size={13} weight="bold" color={libre.raison === 'monte' ? c.accent : c.textSecondary}>
                    {libre.raison === 'monte'
                      ? lb
                        ? traduire('{0} répétitions sur toutes tes séries deux fois de suite : essaie {1} livres aujourd’hui.', libre.reps, fmtNum(saisieDepuisKg(libre.charge, unite)))
                        : traduire('{0} répétitions sur toutes tes séries deux fois de suite : essaie {1} kilos aujourd’hui.', libre.reps, fmtNum(saisieDepuisKg(libre.charge, unite)))
                      : lb
                        ? traduire('Objectif du jour : {0} répétitions sur chaque série à {1} livres.', libre.reps, fmtNum(saisieDepuisKg(libre.charge, unite)))
                        : traduire('Objectif du jour : {0} répétitions sur chaque série à {1} kilos.', libre.reps, fmtNum(saisieDepuisKg(libre.charge, unite)))}
                  </Ink>
                ) : null}
                {/* 30 octobre 2026 (E) : machine occupee, pas dans ta salle, ou qui te fait mal ; 31 octobre 2026 : « Changer »,
                    une autre machine ou une recherche par nom, aussi apres une serie faite (elle reste sur l'exercice d'origine) */}
                {!draft.form && (current.cardio ? !current.sets.some((x) => x.done) : activeIndex >= 0) ? (
                  <Pressable onPress={() => ouvrirRemplacer(current)} accessibilityRole="button" accessibilityLabel={traduire('Changer {0}', sansTiret(traduire(nomFr(current.name))))} hitSlop={8} style={{ alignSelf: 'flex-start', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <StickerOuIcone sticker="refresh" icon="sync" size={22} />
                    <Ink size={13} weight="extraBold" color={c.accentText}>{traduire('Changer')}</Ink>
                  </Pressable>
                ) : null}
              </View>
              <Pressable onPress={() => setMenuFor(current.id)} accessibilityRole="button" accessibilityLabel={traduire("Options de l'exercice")} style={[carteBlanche(c.surface, c.divider), { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }]}>
                <Icon name="more" size={20} />
              </Pressable>
            </View>

            {/* 24 octobre 2026 : animation de l'exercice, si ses deux images existent */}
            <View style={{ alignItems: 'center' }}>
              <ExoDemo nom={sansPrise(current.name).base} taille={150} arrondi={22} />
            </View>

            {/* 30 octobre 2026 : position, mouvement, à éviter, en trois lignes (lib/v2/programmes/explications.ts) */}
            <ExplicationExo nom={sansPrise(current.name).base} style={{ marginHorizontal: 4 }} />

            {/* 30 octobre 2026 (D) : le cran de la machine ou de la poulie, et la hauteur de la poulie quand elle est standard */}
            {(() => {
              if (draft.form || current.cardio) return null;
              // 31 octobre 2026 : une de tes machines (machinesPerso.ts) a toujours son reglage
              const type = machineDe(machinesEnMemoire(), sansPrise(current.name).base) ? 'ouvert' : typeReglage(current.name);
              const hauteur = libelleHauteurPoulie(current.name);
              const avant = cranAvant(cransAvant, current.name);
              const valeur = current.cran !== undefined ? current.cran : avant;
              if (type === 'aucun' && valeur == null && !hauteur) return null;
              const ouvert = type === 'ouvert' || valeur != null || !!hauteur || reglageOuvert.includes(current.id);
              if (!ouvert) {
                return (
                  <Pressable onPress={() => setReglageOuvert((l) => [...l, current.id])} accessibilityRole="button" hitSlop={6} style={{ alignSelf: 'flex-start', marginHorizontal: 4, minHeight: 36, justifyContent: 'center' }}>
                    <Ink size={13} weight="extraBold" color={c.textSecondary}>{traduire('Noter le réglage de la machine')}</Ink>
                  </Pressable>
                );
              }
              return (
                <View style={[carteBlanche(c.surface, c.divider), { marginHorizontal: 4, paddingVertical: 10, paddingHorizontal: 14, gap: 6 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <StickerSinon nom="reglage_machine" taille={36} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Ink size={15} weight="extraBold">{traduire('Réglage')}</Ink>
                      {avant != null ? <Ink size={12} weight="bold" color={c.textMuted}>{traduire('Dernière fois : cran {0}', avant)}</Ink> : null}
                    </View>
                    <Stepper value={valeur ?? 0} step={1} min={0} max={CRAN_MAX} unit={traduire('cran')} size={20} button={38} format={(v) => (v > 0 ? traduire('cran {0}', v) : traduire('Aucun'))} onChange={(v) => changerCran(current, v)} />
                  </View>
                  {hauteur ? <Ink size={13} weight="bold" color={c.accentText}>{traduire(hauteur)}</Ink> : null}
                </View>
              );
            })()}

            {current.cible ? (
              <View style={{ marginHorizontal: 4, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: c.accentTint, gap: 3 }}>
                <Ink size={13} weight="extraBold" color={c.accent}>
                  {current.cible.secondes
                    ? traduire('Objectif : tenir {0} à {1} secondes, repos {2}. Note les secondes dans la colonne Répétitions.', current.cible.repsMin, current.cible.repsMax, libelleRepos(current.cible.reposSec))
                    : current.cible.repsMin === current.cible.repsMax
                    ? traduire('Objectif : {0} répétitions, repos {1}', current.cible.repsMin, libelleRepos(current.cible.reposSec))
                    : traduire('Objectif : {0} à {1} répétitions, repos {2}', current.cible.repsMin, current.cible.repsMax, libelleRepos(current.cible.reposSec))}
                </Ink>
                {current.cible.raison === 'monte' && current.cible.nouvelleCharge && !enPlaques ? (
                  <Ink size={13} color={c.textSecondary}>{lb ? traduire('Haut de la fourchette deux fois de suite : on monte à {0} livres.', fmtNum(saisieDepuisKg(current.cible.nouvelleCharge, unite))) : traduire('Haut de la fourchette deux fois de suite : on monte à {0} kilos.', fmtNum(saisieDepuisKg(current.cible.nouvelleCharge, unite)))}</Ink>
                ) : current.cible.raison === 'garde' ? (
                  <Ink size={13} color={c.textSecondary}>{traduire('Même charge que la dernière fois, vise une répétition de plus.')}</Ink>
                ) : current.cible.raison === 'legere' ? (
                  <Ink size={13} color={c.textSecondary}>{traduire('Semaine légère : moitié moins de séries, même charge. Ton corps récupère pour repartir plus fort.')}</Ink>
                ) : current.cible.raison === 'poids_du_corps' ? (
                  <Ink size={13} color={c.textSecondary}>{current.cible.secondes ? traduire('Vise quelques secondes de plus que la dernière fois.') : traduire('Au poids du corps : vise une répétition de plus que la dernière fois.')}</Ink>
                ) : current.cible.raison === 'variante' ? (
                  <Ink size={13} color={c.textSecondary}>{traduire('Haut de la fourchette deux fois de suite : passe à une version plus dure.')}</Ink>
                ) : current.cible.raison === 'premiere' ? (
                  <Ink size={13} color={c.textSecondary}>{traduire('Choisis une charge qui te laisse 2 ou 3 répétitions en réserve.')}</Ink>
                ) : null}
                {current.cible.conseil ? <Ink size={12} color={c.textMuted}>{traduire(current.cible.conseil)}</Ink> : null}
              </View>
            ) : null}

            {current.notes ? (
              <Pressable onPress={() => setNoteFor(current.id)} style={{ marginHorizontal: 4, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: ton('creme').fond }}>
                <Ink size={13} color={c.textSecondary}>{current.notes}</Ink>
              </Pressable>
            ) : null}

            {current.cardio ? (
              <CarteCardioEnDirect
                chrono={current.cardio}
                fait={current.sets.every((x) => x.done)}
                dureeFaite={current.sets[0]?.reps ?? 0}
                onDemarrer={() => demarrerCardio(current)}
                onPause={() => pauseCardio(current)}
                onTerminer={() => terminerCardio(current)}
                onManuel={(min) => changerCardio(current.id, (x) => ({ ...x, manuelMin: min > 0 ? min : undefined }))}
                onDistance={(km) => changerCardio(current.id, (x) => ({ ...x, distanceKm: km > 0 ? km : undefined }))}
                zone2={zone2}
                lectureFc={lectureFc === current.id}
                onChoisir={() => setChoixCardioFor(current.id)}
                onValeur={(v) => valeurCardio(current, v)}
                onSegment={() => segmentCardio(current)}
                onRetirerSegment={() => retirerSegmentCardio(current)}
                onParler={(oui) => changerCardio(current.id, (x) => ({ ...x, parler: oui }))}
                onSuite={(suite, prochain) => suiteCardio(current, suite, prochain)}
                nom={current.name}
              />
            ) : (<>
            {/* 3 novembre 2026 (Houari) : sur une machine sans poids ecrit, la charge en plaques de la pile (lib/v2/seances/plaques.ts) */}
            {current.plaques || typeReglage(current.name) !== 'aucun' || machineDe(machinesEnMemoire(), sansPrise(current.name).base) ? (
              <View style={[carteBlanche(c.surface, c.divider), { marginHorizontal: 4, paddingVertical: 10, paddingHorizontal: 12, gap: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <StickerSinon nom="reglage_machine" taille={30} />
                  <Ink size={15} weight="extraBold" style={{ flex: 1 }} numberOfLines={1}>{traduire('Charge en')}</Ink>
                  <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', padding: 3, borderRadius: 14, backgroundColor: c.fillSoft, gap: 3 }}>
                    {([null, 'plaques'] as const).map((u) => {
                      const actif = u ? !!current.plaques : !current.plaques;
                      return (
                        <Pressable
                          key={u ?? 'kg'}
                          onPress={() => (actif ? undefined : changerUniteCharge(current, u ? { kgParPlaque: null } : null))}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: actif }}
                          accessibilityLabel={u ? traduire('Compter en plaques de la pile') : lb ? traduire('Compter en livres') : traduire('Compter en kilos')}
                          style={{ minHeight: 38, minWidth: 64, paddingHorizontal: 12, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: actif ? c.primary : 'transparent' }}
                        >
                          <Ink size={14} weight="black" color={actif ? c.onPrimary : c.ink}>{u ? traduire('Plaques') : lb ? traduire('LB') : traduire('KG')}</Ink>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
                {current.plaques ? (
                  current.plaques.kgParPlaque || poidsPlaqueOuvert.includes(current.id) ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Ink size={13} weight="extraBold">{traduire('Poids d’une plaque')}</Ink>
                        <Ink size={12} weight="bold" color={c.textSecondary}>{current.plaques.kgParPlaque ? traduire('Tes séries comptent aussi en kilos.') : traduire('Facultatif. Sans lui, rien ne compte en kilos.')}</Ink>
                      </View>
                      <Stepper value={current.plaques.kgParPlaque ?? 0} step={0.5} min={0} max={KG_PAR_PLAQUE_MAX} decimals unit={traduire('kilos par plaque')} size={18} button={36} format={(v) => (v > 0 ? libelleKgParPlaque(v) : traduire('Inconnu'))} onChange={(v) => changerKgParPlaque(current, v)} />
                    </View>
                  ) : (
                    <Pressable onPress={() => setPoidsPlaqueOuvert((l) => [...l, current.id])} accessibilityRole="button" hitSlop={6} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
                      <Ink size={13} weight="extraBold" color={c.accentText}>{traduire('Tu connais le poids d’une plaque ? Ajoute le')}</Ink>
                    </Pressable>
                  )
                ) : null}
              </View>
            ) : null}
            {manqueVisible && etatCourant ? (
              <AlerteManquantes
                n={etatCourant.manquantes}
                detail={etatCourant.indexManquants.length > 0 ? (etatCourant.indexManquants.length === 1 ? traduire('Série {0} pas validée', etatCourant.indexManquants[0] + 1) : traduire('Séries {0} pas validées', etatCourant.indexManquants.map((i) => i + 1).join(', '))) : traduire('Ajoute une série pour atteindre ton objectif.')}
                style={{ marginHorizontal: 4 }}
              />
            ) : null}
            <View style={{ flexDirection: 'row', paddingHorizontal: 8, marginTop: 6 }}>
              <Ink size={12} weight="bold" color={c.textMuted} style={{ width: 44 }}>{traduire("Série")}</Ink>
              <Ink size={12} weight="bold" color={c.textMuted} style={{ flex: 1, textAlign: 'center' }}>{current.plaques ? traduire('PLAQUES') : lb ? traduire('LB') : traduire('KG')}</Ink>
              <Ink size={12} weight="bold" color={c.textMuted} style={{ flex: 1, textAlign: 'center' }}>{traduire("Répétitions")}</Ink>
              <View style={{ width: current.sets.length > 1 ? 82 : 48 }} />
            </View>

            {current.sets.map((s, i) => {
              if (i === activeIndex) {
                return (
                  <View key={s.id} onLayout={(e) => { serieBas.current = e.nativeEvent.layout.y + e.nativeEvent.layout.height; }} style={{ borderRadius: 24, backgroundColor: c.surface, borderWidth: 2, borderColor: serieManquante(i) ? intensite(4).fill : etatSerie(s) === 'moitie' ? intensite(3).text : c.primary, padding: 14, gap: 12, shadowColor: c.shadow, shadowOpacity: 0.07, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
                      <View style={{ minWidth: 32, height: 32, paddingHorizontal: 8, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                        <Ink size={15} weight="black" color={c.onPrimary}>{String(i + 1)}</Ink>
                      </View>
                      <View style={{ flex: 1, gap: 1 }}>
                        <Ink size={16} weight="black">{s.type === 'dropset' ? traduire('Drop set, charge baissée') : !draft.form && objectif ? texteSerie(objectif, i + 1 - current.sets.slice(0, i).filter((x) => x.type === 'warmup' || x.type === 'dropset').length) : traduire("Série {0}", i + 1)}</Ink>
                        {/* 30 octobre 2026 (C) : les repetitions visees, seulement quand le programme ou ta seance les donne */}
                        {!draft.form && objectif && texteReps(objectif) ? <Ink size={13} weight="extraBold" color={c.accent}>{texteReps(objectif)}</Ink> : null}
                      </View>
                      {s.prevWeight !== undefined ? <Ink size={12} weight="bold" color={c.textMuted} numberOfLines={1}>{traduire("la dernière fois {0}", setLabel({ weight: s.prevWeight, reps: s.prevReps ?? 0, ...(s.prevPlaques !== undefined ? { plaques: s.prevPlaques } : {}) }, unite))}</Ink> : null}
                      {current.sets.length > 1 ? (
                        <Pressable onPress={() => supprimerSerie(current, i)} accessibilityRole="button" accessibilityLabel={traduire('Supprimer la série')} hitSlop={8} style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : 'transparent' })}>
                          <Icon name="close" size={14} color={c.textMuted} strokeWidth={2.6} />
                        </Pressable>
                      ) : null}
                    </View>
                    {/* 30 octobre 2026 (H2) : une charge sans repetitions se voit, sans rien bloquer d'autre */}
                    {etatSerie(s) === 'moitie' ? (
                      <View style={{ alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: intensite(3).tint }}>
                        <Ink size={13} weight="extraBold" color={intensite(3).text}>{traduire('Il manque les répétitions')}</Ink>
                      </View>
                    ) : null}
                    {/* (H4) la derniere fois au haut de l'objectif : un palier de plus, sans chiffre de kilos */}
                    {(() => {
                      if (draft.form || i !== 0 || current.sets.some((x) => x.done) || enPlaques) return null;
                      if (current.cible?.raison === 'monte' || current.cible?.raison === 'variante' || libre?.raison === 'monte') return null;
                      const objectifReps = current.cible ? { repsMax: current.cible.repsMax, secondes: current.cible.secondes } : current.objectifReps ? { repsMax: current.objectifReps } : null;
                      const enc = encouragement(hCurrent?.travail ?? hCurrent?.lastSets, objectifReps);
                      if (!enc) return null;
                      const charge = enc.weight > 0 ? (lb ? traduire('{0} lb', fmtNum(saisieDepuisKg(enc.weight, unite))) : traduire('{0} kg', fmtNum(enc.weight))) : null;
                      return (
                        <Ink size={13} weight="bold" color={c.accentText}>
                          {charge ? traduire('La dernière fois : {0} × {1}. Essaie un palier de plus.', charge, enc.reps) : traduire('La dernière fois : {0} répétitions. Essaie un palier de plus.', enc.reps)}
                        </Ink>
                      );
                    })()}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        {current.plaques ? (
                          <Stepper layout="stack" value={s.plaques ?? 0} step={1} saut={5} max={PLAQUES_MAX} unit={traduire('plaques')} size={38} button={50} hint={motPlaques(s.plaques ?? 0)} onChange={(v) => setValue(current.id, s.id, { plaques: v, weight: kgDePlaques(v, current.plaques?.kgParPlaque) })} />
                        ) : (
                          <Stepper layout="stack" value={saisieDepuisKg(s.weight, unite)} step={lb ? 2 : 1} fine={lb ? 1 : 0.5} saut={lb ? 20 : 10} max={lb ? 1100 : 500} decimals unit={lb ? traduire('livres') : traduire('kilos')} size={38} button={50} uniteForte={lb ? traduire('LB') : traduire('KG')} onChange={(v) => setValue(current.id, s.id, { weight: kgDepuisSaisie(v, unite) })} />
                        )}
                      </View>
                      <View style={{ width: 1, backgroundColor: c.divider, marginVertical: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Stepper layout="stack" value={s.reps} step={1} max={200} unit={traduire("répétitions")} size={38} button={50} hint={i > 0 && s.prevReps === undefined ? traduire("comme la série {0}", i) : traduire('répétitions')} onChange={(v) => setValue(current.id, s.id, { reps: v })} />
                      </View>
                    </View>
                    {/* en saisie apres coup, le bouton reste dans la carte ; en direct, il est dans la barre fixe du bas,
                        sauf pour une serie en plus de l'objectif : la barre invite alors a passer a la suite */}
                    {draft.form || enPlus ? (
                      <BoutonPrincipal
                        onPress={() => validate(current, i)}
                        disabled={s.reps <= 0}
                        accessibilityLabel={traduire("Valider la série {0}", i + 1)}
                        label={traduire("Valider la série")}
                        hauteur={58}
                        rayon={20}
                        tailleTexte={17}
                        icone={(col) => <Icon name="check" size={24} color={col} strokeWidth={3} />}
                      />
                    ) : null}
                  </View>
                );
              }
              // 31 octobre 2026 : une serie validee touchee s'ouvre en correction ici, les autres lignes restent visibles
              if (s.done && correction && correction.exId === current.id && correction.setId === s.id) {
                return (
                  <View key={s.id} style={{ borderRadius: 24, backgroundColor: c.surface, borderWidth: 2, borderColor: ton('menthe').encre, padding: 14, gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
                      <View style={{ minWidth: 32, height: 32, paddingHorizontal: 8, borderRadius: 12, backgroundColor: ton('menthe').fond, alignItems: 'center', justifyContent: 'center' }}>
                        <Ink size={15} weight="black" color={ton('menthe').encre}>{String(i + 1)}</Ink>
                      </View>
                      <Ink size={16} weight="black" style={{ flex: 1 }}>{traduire('Corriger la série {0}', i + 1)}</Ink>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        {typeof correction.plaques === 'number' ? (
                          <Stepper layout="stack" value={correction.plaques} step={1} saut={5} max={PLAQUES_MAX} unit={traduire('plaques')} size={38} button={50} hint={motPlaques(correction.plaques)} onChange={(v) => setCorrection((x) => (x ? { ...x, plaques: v, weight: kgDePlaques(v, current.plaques?.kgParPlaque) } : x))} />
                        ) : (
                          <Stepper layout="stack" value={saisieDepuisKg(correction.weight, unite)} step={lb ? 2 : 1} fine={lb ? 1 : 0.5} saut={lb ? 20 : 10} max={lb ? 1100 : 500} decimals unit={lb ? traduire('livres') : traduire('kilos')} size={38} button={50} uniteForte={lb ? traduire('LB') : traduire('KG')} onChange={(v) => setCorrection((x) => (x ? { ...x, weight: kgDepuisSaisie(v, unite) } : x))} />
                        )}
                      </View>
                      <View style={{ width: 1, backgroundColor: c.divider, marginVertical: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Stepper layout="stack" value={correction.reps} step={1} max={200} unit={traduire('répétitions')} size={38} button={50} hint={traduire('répétitions')} onChange={(v) => setCorrection((x) => (x ? { ...x, reps: v } : x))} />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Pressable onPress={() => setCorrection(null)} accessibilityRole="button" accessibilityLabel={traduire('Annuler')} style={({ pressed }) => ({ minHeight: 58, paddingHorizontal: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.fillSoft })}>
                        <Ink size={15} weight="extraBold" color={c.textSecondary}>{traduire('Annuler')}</Ink>
                      </Pressable>
                      <View style={{ flex: 1 }}>
                        <BoutonPrincipal
                          onPress={enregistrerCorrection}
                          disabled={!correctionPossible(correction)}
                          accessibilityLabel={traduire('Enregistrer la correction de la série {0}', i + 1)}
                          label={traduire('Enregistrer')}
                          hauteur={58}
                          rayon={20}
                          tailleTexte={17}
                          icone={(col) => <Icon name="check" size={24} color={col} strokeWidth={3} />}
                        />
                      </View>
                    </View>
                  </View>
                );
              }
              const pending = !s.done;
              // 31 octobre 2026 : les series prevues apres celle en cours se voient toutes, en petit, sous la carte
              // (avant : une phrase grise « Puis encore 3 series prevues ») ; celle qu'on vient d'ajouter arrive animee
              if (pending && !draft.form) {
                const detail = typeof s.plaques === 'number' && s.plaques > 0 ? libelleSeriePlaques(s.plaques, s.reps) : s.weight > 0 ? `${fmtNum(saisieDepuisKg(s.weight, unite))} ${lb ? traduire('LB') : traduire('KG')} × ${s.reps}` : s.reps > 0 ? traduire('{0} répétitions', s.reps) : undefined;
                return (
                  <SeriePrevue
                    key={s.id}
                    numero={i + 1}
                    titre={traduire('Série {0}', i + 1)}
                    detail={detail}
                    nouvelle={serieAjoutee === s.id}
                    alerte={serieManquante(i)}
                    accessibilityLabel={traduire('Série {0} prévue, {1}', i + 1, setLabel(s, unite))}
                    onLongPress={() => askSetAction(current, i)}
                  />
                );
              }
              return (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    // 31 octobre 2026 : plus de « devalidation » (la serie redevenait celle en cours et, pendant le repos,
                    // plus aucun bouton pour la revalider) : elle s'ouvre en correction, la serie en cours ne bouge pas
                    if (s.done) setCorrection({ exId: current.id, setId: s.id, weight: s.weight, reps: s.reps, ...(typeof s.plaques === 'number' ? { plaques: s.plaques } : {}) });
                  }}
                  onLongPress={() => askSetAction(current, i)}
                  accessibilityRole="button"
                  accessibilityLabel={s.done ? traduire("Série {0} validée, {1}. Toucher pour la modifier", i + 1, setLabel(s, unite)) : traduire("Série {0} prévue, {1}", i + 1, setLabel(s, unite))}
                  style={[pending ? (serieManquante(i) ? { backgroundColor: intensite(4).tint, borderWidth: 2, borderColor: intensite(4).fill } : { backgroundColor: c.fillSoft }) : { backgroundColor: ton('menthe').fond }, { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 8, borderRadius: 18 }]}
                >
                  <Ink size={16} weight="extraBold" color={c.textSecondary} style={{ width: 44, textAlign: 'center' }}>{i + 1}</Ink>
                  {/* 30 octobre 2026 (F) : l'unite en gros, aux deux tiers du chiffre */}
                  {typeof s.plaques === 'number' ? (
                    <Ink size={20} weight={pending ? 'bold' : 'black'} color={pending ? c.textMuted : c.ink} style={{ flex: 1, textAlign: 'center' }}>{s.plaques}<Ink size={14} weight="black" color={pending ? c.textMuted : c.ink}>{` ${motPlaques(s.plaques)}`}</Ink></Ink>
                  ) : (
                    <Ink size={20} weight={pending ? 'bold' : 'black'} color={pending ? c.textMuted : c.ink} style={{ flex: 1, textAlign: 'center' }}>{fmtNum(saisieDepuisKg(s.weight, unite))}<Ink size={14} weight="black" color={pending ? c.textMuted : c.ink}>{` ${lb ? traduire('LB') : traduire('KG')}`}</Ink></Ink>
                  )}
                  <Ink size={20} weight={pending ? 'bold' : 'black'} color={pending ? c.textMuted : c.ink} style={{ flex: 1, textAlign: 'center' }}>{s.reps}</Ink>
                  <View style={{ width: 48, alignItems: 'center' }}>
                    {s.done ? (
                      s.record ? (
                        <Hanko size={30} animate={freshRecord === s.id} />
                      ) : (
                        <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: ton('menthe').fond, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="check" size={16} color={ton('menthe').encre} strokeWidth={3} />
                        </View>
                      )
                    ) : null}
                  </View>
                  {current.sets.length > 1 ? (
                    <Pressable onPress={() => supprimerSerie(current, i)} accessibilityRole="button" accessibilityLabel={traduire('Supprimer la série {0}', i + 1)} hitSlop={6} style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? blancA(0.7) : 'transparent' })}>
                      <Icon name="close" size={13} color={c.textMuted} strokeWidth={2.6} />
                    </Pressable>
                  ) : null}
                  {serieCorrigee === s.id ? (
                    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: -14, zIndex: 2, alignItems: 'center' }}>
                      <PastilleAjout cle={`corrigee-${s.id}`} texte={traduire('Série {0} corrigée', i + 1)} />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* pastille par-dessus, sans pousser le bouton : un deuxieme appui tombe au meme endroit */}
              {serieAjoutee && current.sets.some((x) => x.id === serieAjoutee) ? (
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: -22, zIndex: 2, alignItems: 'center' }}>
                  <PastilleAjout cle={serieAjoutee} texte={traduire('Série {0} ajoutée', current.sets.findIndex((x) => x.id === serieAjoutee) + 1)} />
                </View>
              ) : null}
              <Pressable onPress={() => addSet(current)} accessibilityRole="button" accessibilityLabel={traduire("Ajouter une série")} style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 18, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.primary : c.accentTint })}>
                <Icon name="plus" size={18} color={c.accentText} strokeWidth={2.6} />
                <Ink size={15} weight="extraBold" color={c.accentText}>{traduire("Ajouter une série")}</Ink>
              </Pressable>
              {!draft.form && current.sets.some((x) => x.done) ? (
                <Pressable onPress={() => addDropSet(current)} accessibilityRole="button" accessibilityLabel={traduire('Drop set : une série tout de suite, charge baissée')} style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: 16, borderRadius: 18, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: ton('lilas').fond, opacity: pressed ? 0.85 : 1 })}>
                  <Icon name="down" size={16} color={ton('lilas').encre} strokeWidth={2.6} />
                  <Ink size={15} weight="extraBold" color={ton('lilas').encre}>{traduire('Drop set')}</Ink>
                </Pressable>
              ) : null}
            </View>

            {/* 31 octobre 2026 : le bloc abdos, un deuxieme exercice a la suite (crunch puis roue abdominale) */}
            {!draft.form && abdosEnCours ? (
              <AjoutAuBloc exercises={draft.exercises} id={current.id} onPress={() => setChangerFor({ id: current.id, mode: 'enchainer' })} />
            ) : null}

            <AideBarre
              nom={sansPrise(current.name).base}
              chargeKg={(current.sets.find((x) => !x.done) ?? current.sets[current.sets.length - 1])?.weight}
              debut={!current.sets.some((x) => x.done)}
              unite={unite}
            />
            </>)}


            {currentDone ? (
              <View style={{ marginTop: 6, padding: 16, borderRadius: 22, backgroundColor: manqueVisible ? intensite(4).tint : ton('menthe').fond, gap: 12 }}>
                {/* 3 novembre 2026 : le grand sticker « validé » au milieu, seulement si toutes les series prevues sont faites */}
                {etatCourant?.etat === 'valide' ? <TamponValide taille={104} anime={validePop === current.id} style={{ alignSelf: 'center' }} /> : null}
                {manqueVisible && etatCourant ? (
                  <Ink size={17} weight="black" color={intensite(4).text}>{texteManquantes(etatCourant.manquantes)}</Ink>
                ) : (
                  <Ink size={17} weight="black" color={ton('menthe').encre} style={etatCourant?.etat === 'valide' ? { textAlign: 'center' } : undefined}>{traduire("Exercice bouclé.")}</Ink>
                )}
                {nextEx ? (
                  <Pressable onPress={() => update((d) => allerAExercice(d, nextEx.id))} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 52, borderRadius: 18, backgroundColor: pressed ? blancA(0.7) : c.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 })}>
                    <Ink size={15} weight="black" color={ton('menthe').encre} numberOfLines={1} style={{ flexShrink: 1 }}>{traduire("Suivant : {0}", nextEx.name)}</Ink>
                    <Icon name="chevron" size={18} color={ton('menthe').encre} />
                  </Pressable>
                ) : (
                  <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 52, borderRadius: 18, backgroundColor: pressed ? blancA(0.7) : c.surface, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' })}>
                    <PlusPastille />
                    <Ink size={15} weight="black" color={c.onPrimary}>{traduire("Ajouter un exercice")}</Ink>
                  </Pressable>
                )}
              </View>
            ) : null}

            {/* La suite de la seance */}
            {draft.exercises.length > 1 ? (
              <View style={{ marginTop: 14, gap: 8 }}>
                <Ink size={18} weight="black" tight style={{ paddingHorizontal: 4 }}>{traduire("Ta séance")}</Ink>
                {draft.exercises.map((e, i) => {
                  if (e.id === current.id) return null;
                  const doneCount = e.sets.filter((s) => s.done).length;
                  // 3 novembre 2026 : « fait » seulement si toutes les series prevues sont faites ; laisse en route, il
                  // n'est plus grise comme fini, il dit combien de series manquent et lesquelles (lib/v2/seances/etatExo.ts)
                  const et = e.cardio ? null : etatExo(e);
                  const all = et ? et.etat === 'valide' : doneCount === e.sets.length && e.sets.length > 0;
                  const manque = !!et && et.etat === 'incomplet';
                  return (
                    <Pressable key={e.id} onPress={() => update((d) => allerAExercice(d, e.id))} accessibilityRole="button" style={({ pressed }) => [carteBlanche(c.surface, c.divider), { minHeight: 70, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, opacity: all ? 0.6 : pressed ? 0.85 : 1 }]}>
                      <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: tonDuRang(i).fond, alignItems: 'center', justifyContent: 'center' }}>
                        <Ink size={17} weight="black" color={tonDuRang(i).encre}>{String(i + 1)}</Ink>
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Ink size={15.5} weight="black" tight color={all ? c.textMuted : c.ink} numberOfLines={2}>{sansTiret(traduire(e.name))}</Ink>
                        <PastilleGroupe exercises={draft.exercises} id={e.id} />
                        {manque && et ? (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                            <AlerteManquantes n={et.manquantes} compact />
                            {e.sets.map((s, k) => (s.type === 'warmup' || s.type === 'dropset' ? null : (
                              <View key={s.id} style={{ minWidth: 22, height: 22, paddingHorizontal: 4, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: s.done ? ton('menthe').fond : intensite(4).tint, borderWidth: s.done ? 0 : 2, borderColor: intensite(4).fill }}>
                                <Ink size={11} weight="black" color={s.done ? ton('menthe').encre : intensite(4).text}>{String(k + 1)}</Ink>
                              </View>
                            )))}
                          </View>
                        ) : null}
                      </View>
                      <ExoDemo nom={sansPrise(e.name).base} taille={44} arrondi={12} />
                      {manque ? null : <Ink size={13} weight="bold" color={all ? c.successText : c.textMuted}>{all ? traduire('fait') : doneCount > 0 ? traduire("{0} sur {1}", doneCount, e.sets.length) : traduire("{0} séries", e.sets.length)}</Ink>}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {/* un seul bouton Ajouter un exercice a la fois : celui de la carte Exercice boucle quand il n'y a pas de suite */}
            {currentDone && !nextEx ? null : <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" style={({ pressed }) => ({ marginTop: 4, height: 60, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: pressed ? c.primaryPressed : c.primary })}>
              <View style={{ width: 30, height: 30, borderRadius: 11, backgroundColor: blancA(0.7), alignItems: 'center', justifyContent: 'center' }}>
                <PlusPastille />
              </View>
              <Ink size={16} weight="black" color={c.onPrimary}>{traduire("Ajouter un exercice")}</Ink>
            </Pressable>}
          </>
        )}

        {/* Reglages de la seance */}
        <View style={[carteBlanche(c.surface, c.divider), { marginTop: 10, padding: 16, gap: 12 }]}>
          {/* 1er novembre 2026 (AT) : pesee avant et apres seance, perte d'eau (components/yoroi/v2/corps/PeseeSeance.tsx) */}
          {!draft.form ? <PeseeSeanceRapide debut={hhmm(new Date(draft.startedAt))} /> : null}
          {/* 30 octobre 2026 (B) : coupe, aucun repos ne se lance apres une serie, donc ni son ni notification */}
          {!draft.form ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {illus.stickers ? <Image source={illus.img('sablier')} style={{ width: 30, height: 30, marginVertical: -4 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <Icon name="clock" size={20} color={c.textSecondary} />}
              <Ink size={15} weight="bold" style={{ flex: 1 }}>{traduire('Minuteur de repos')}</Ink>
              <Interrupteur value={minuteurOn !== false} onValueChange={changerMinuteur} accessibilityLabel={traduire('Minuteur de repos')} />
            </View>
          ) : null}
          {/* 31 octobre 2026 : sonnerie de fin de repos, alarme du systeme quand le telephone le permet (lib/v2/seances/alarmeRepos.ts) */}
          {!draft.form && minuteurOn !== false ? <SonnerieFinRepos /> : null}
          {!draft.form && minuteurOn !== false ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {illus.stickers ? <Image source={illus.img('chrono')} style={{ width: 30, height: 30, marginVertical: -4 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <Icon name="clock" size={20} color={c.textSecondary} />}
            <Ink size={15} weight="bold" style={{ flex: 1 }}>{traduire("Repos entre les séries")}</Ink>
            <Pressable onPress={() => changeRest(-15)} accessibilityLabel={traduire("Moins 15 secondes de repos")} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="minus" size={16} strokeWidth={2.8} />
            </Pressable>
            <Ink size={17} weight="black" style={{ minWidth: 48, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{fmtClock(reposAffiche)}</Ink>
            <Pressable onPress={() => changeRest(15)} accessibilityLabel={traduire("Plus 15 secondes de repos")} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={16} strokeWidth={2.8} />
            </Pressable>
          </View> : null}
          <TextInput
            value={draft.notes}
            onChangeText={(t) => update((d) => ({ ...d, notes: t }))}
            placeholder={traduire("Une note sur ta séance")}
            placeholderTextColor={c.textMuted}
            multiline
            accessibilityLabel={traduire("Note sur la séance")}
            style={[fontStyle('medium'), { minHeight: 44, fontSize: 15, color: c.ink, paddingVertical: 8 }]}
          />
        </View>
      </ScrollView>

      {/* 24 octobre 2026 : la barre d'action fixe, toujours visible (Houari : « pour passer a l'exercice suivant c'est chaud a voir ») */}
      {barreOn ? (
        <BarreAction
          bottom={insets.bottom}
          etape={
            !current
              ? { quoi: 'ajouter' }
              : activeIndex >= 0 && !enPlus
                ? { quoi: 'valider', serie: activeIndex + 1, total: Math.max(objectif?.total ?? current.sets.length, activeIndex + 1), detail: setLabel(current.sets[activeIndex], unite), possible: current.sets[activeIndex].reps > 0 || (etatSerie(current.sets[activeIndex]) === 'vide' && current.sets.length > 1) }
                : nextEx
                  ? { quoi: 'suivant', nom: sansTiret(traduire(nomFr(nextEx.name))) }
                  : { quoi: 'terminer' }
          }
          aSuivre={activeIndex >= 0 && !enPlus && nextEx ? sansTiret(traduire(nomFr(nextEx.name))) : null}
          onValider={() => {
            if (!current || activeIndex < 0) return;
            // 30 octobre 2026 (H2) : une serie vide est ignoree (retiree), la suivante prend sa place
            if (etatSerie(current.sets[activeIndex]) === 'vide' && current.sets.length > 1) return supprimerSerie(current, activeIndex);
            validate(current, activeIndex);
          }}
          onSuivant={() => nextEx && update((d) => allerAExercice(d, nextEx.id))}
          onTerminer={() => setFinishOpen(true)}
          onAjouter={() => setPickerOpen(true)}
        />
      ) : null}

      {restOn && draft.restEndsAt ? (
        <RestBar
          endsAt={draft.restEndsAt}
          total={draft.restTotal}
          bottom={insets.bottom + 12}
          onAdd={(sec) => update((d) => ({ ...d, restEndsAt: (d.restEndsAt ?? Date.now()) + sec * 1000, restTotal: d.restTotal + sec }))}
          onSkip={() => update((d) => ({ ...d, restEndsAt: null }))}
          onFinish={(enRetard) => {
            // seul le repos qui vient de finir part : un repos relance entre temps reste (lib/v2/seances/finRepos.ts)
            const fin = draft.restEndsAt;
            if (!enRetard) return void setTimeout(() => update((d) => retirerReposFini(d, fin)), 1500);
            update((d) => ({ ...d, restEndsAt: null }));
            setReposFiniVu(true);
            impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
          }}
        />
      ) : null}

      {cardioFiniVu ? (
        <View pointerEvents="none" accessibilityLiveRegion="polite" style={{ position: 'absolute', alignSelf: 'center', bottom: insets.bottom + 150, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 18, backgroundColor: ton('menthe').fond, shadowColor: c.shadow, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
          <Ink size={14} weight="extraBold" color={ton('menthe').encre}>{traduire('Cardio terminé')}</Ink>
        </View>
      ) : null}

      {annulable ? (
        <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 150, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 16, paddingRight: 8, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, shadowColor: c.shadow, shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
          <Ink size={14} weight="bold" style={{ flex: 1 }}>{traduire('Série supprimée')}</Ink>
          <Pressable onPress={annulerSuppression} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.accentTint })}>
            <Ink size={14} weight="extraBold" color={c.accentText}>{traduire('Annuler')}</Ink>
          </Pressable>
        </View>
      ) : null}

      {reposFiniVu ? (
        <View pointerEvents="none" accessibilityLiveRegion="polite" style={{ position: 'absolute', alignSelf: 'center', bottom: insets.bottom + 150, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 18, backgroundColor: ton('menthe').fond, shadowColor: c.shadow, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
          <Ink size={14} weight="extraBold" color={ton('menthe').encre}>{traduire('Repos terminé')}</Ink>
        </View>
      ) : null}

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        history={hist.map}
        recent={hist.recent}
        already={draft.exercises.map((e) => e.name)}
      />

      {/* 31 octobre 2026 : changer d'exercice (autre machine, recherche, ta machine) ou en enchainer un (superset) */}
      {(() => {
        const ex = changerFor ? draft.exercises.find((e) => e.id === changerFor.id) : null;
        return (
          <ChangerExercice
            visible={!!ex}
            onClose={() => setChangerFor(null)}
            mode={changerFor?.mode ?? 'changer'}
            nom={ex?.name ?? ''}
            muscle={ex?.muscle}
            deja={draft.exercises.map((e) => e.name)}
            history={hist.map}
            portees={changerFor?.mode === 'changer' || !!draft.programme}
            dansProgramme={!!draft.programme}
            onChoisir={choisirChangement}
          />
        );
      })()}

      {/* Options d'un exercice */}
      {/* 31 octobre 2026 : « Ton cardio », type, duree, ou passer (components/yoroi/v2/seance/cardio/FeuilleChoixCardio.tsx) */}
      <FeuilleChoixCardio visible={!!exoChoixCardio} depart={departCardio} onValider={validerChoixCardio} onPasser={passerCardio} onFermer={() => setChoixCardioFor(null)} />

      <Sheet visible={!!menuEx} onClose={() => setMenuFor(null)} title={traduire(menuEx?.name)}>
        {menuEx ? (
          <View style={{ gap: 8 }}>
            <MenuRow icon="up" label={traduire("Monter dans la séance")} onPress={() => moveExercise(menuEx.id, -1)} disabled={draft.exercises[0]?.id === menuEx.id} />
            <MenuRow icon="down" label={traduire("Descendre dans la séance")} onPress={() => moveExercise(menuEx.id, 1)} disabled={draft.exercises[draft.exercises.length - 1]?.id === menuEx.id} />
            <MenuRow icon="pencil" label={menuEx.notes ? traduire('Modifier la note') : traduire('Ajouter une note')} onPress={() => { setMenuFor(null); setNoteFor(menuEx.id); }} />
            {/* 31 octobre 2026 : superset, pour tous les exercices (l'entree visible est dans le bloc abdos) */}
            {!draft.form && !menuEx.cardio ? <MenuRow icon="plus" label={traduire('Enchaîner un exercice')} onPress={() => { setMenuFor(null); setChangerFor({ id: menuEx.id, mode: 'enchainer' }); }} /> : null}
            {!draft.form && estEnGroupe(draft.exercises, menuEx.id) ? (
              <MenuRow icon="close" label={traduire('Sortir du superset')} onPress={() => sortirDuGroupe(menuEx)} />
            ) : !draft.form && !menuEx.cardio && draft.exercises[draft.exercises.length - 1]?.id !== menuEx.id && !draft.exercises[draft.exercises.findIndex((e) => e.id === menuEx.id) + 1]?.cardio ? (
              <MenuRow icon="lien" label={traduire('Lier à l’exercice suivant')} onPress={() => { setMenuFor(null); update((d) => ({ ...d, exercises: lierAuSuivant(d.exercises, menuEx.id) })); }} />
            ) : null}
            <MenuRow icon="swap" label={sansPrise(menuEx.name).prise ? traduire('Prise : {0}', traduire(PRISES.find((x) => x.id === sansPrise(menuEx.name).prise)?.label ?? '')) : traduire('Prise')} onPress={() => { setMenuFor(null); setPriseFor(menuEx.id); }} />
            <MenuRow icon="trash" label={traduire("Supprimer l’exercice")} danger onPress={() => removeExercise(menuEx.id)} />
          </View>
        ) : null}
      </Sheet>

      {/* 26 octobre 2026 : la prise sur la meme machine (lib/v2/seance/prise.ts), suivie comme un exercice a part */}
      <Sheet visible={!!priseEx} onClose={() => setPriseFor(null)} title={traduire('Prise')}>
        {priseEx ? (
          <View style={{ gap: 10 }}>
            <Ink size={14} color={c.textSecondary}>{traduire(EXPLICATION_PRISE)}</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PRISES.map((x) => {
                const on = sansPrise(priseEx.name).prise === x.id;
                return (
                  <Pressable key={x.id} onPress={() => choisirPrise(priseEx, on ? null : x.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, justifyContent: 'center', backgroundColor: on ? c.primary : pressed ? c.fillSubtle : c.fillSoft })}>
                    <Ink size={15} weight="extraBold" color={on ? c.onPrimary : c.ink}>{traduire(x.label)}</Ink>
                  </Pressable>
                );
              })}
            </View>
            {sansPrise(priseEx.name).prise ? (
              <Pressable onPress={() => choisirPrise(priseEx, null)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
                <Ink size={14} weight="extraBold" color={c.accent}>{traduire('Sans prise précise')}</Ink>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Sheet>

      {/* 30 octobre 2026 (E) : remplacer un exercice, la raison puis une alternative a la fois */}
      <Sheet visible={!!remplacerFor} onClose={() => setRemplacerFor(null)} title={traduire('Remplacer l’exercice')}>
        {(() => {
          const r = remplacerFor;
          const ex = r ? draft.exercises.find((e) => e.id === r.id) : null;
          if (!r || !ex) return null;
          const garder = (
            <Pressable onPress={() => setRemplacerFor(null)} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={14} weight="extraBold" color={c.textSecondary} numberOfLines={1}>{traduire('Garder {0}', sansTiret(traduire(nomFr(ex.name))))}</Ink>
            </Pressable>
          );
          if (!r.raison) {
            const raisons: { id: 'occupee' | 'salle' | 'douleur'; label: string; sub: string; sticker: 'sablier' | 'barre' | 'recuperation'; icon: 'timer' | 'dumbbell' | 'heart' }[] = [
              { id: 'occupee', label: traduire('Machine occupée'), sub: traduire('Pour cette séance seulement'), sticker: 'sablier', icon: 'timer' },
              { id: 'salle', label: traduire('Pas dans ma salle'), sub: traduire('Il ne te sera plus proposé'), sticker: 'barre', icon: 'dumbbell' },
              { id: 'douleur', label: traduire('Ça me fait mal'), sub: traduire('Il ne te sera plus proposé'), sticker: 'recuperation', icon: 'heart' },
            ];
            return (
              <View style={{ gap: 8 }}>
                {raisons.map((x) => (
                  <Pressable key={x.id} onPress={() => choisirRaison(x.id)} accessibilityRole="button" accessibilityLabel={`${x.label}, ${x.sub}`} style={({ pressed }) => ({ minHeight: 64, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, backgroundColor: pressed ? c.fillSubtle : c.fillSoft })}>
                    <StickerOuIcone sticker={x.sticker} icon={x.icon} size={38} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Ink size={15} weight="extraBold">{x.label}</Ink>
                      <Ink size={12.5} color={c.textSecondary}>{x.sub}</Ink>
                    </View>
                  </Pressable>
                ))}
                {garder}
              </View>
            );
          }
          if (r.liste.length === 0) {
            return (
              <View style={{ gap: 10 }}>
                <Ink size={14} color={c.textSecondary}>{traduire('Pas d’autre exercice du même muscle à te proposer.')}</Ink>
                {garder}
              </View>
            );
          }
          const nom = r.liste[r.i % r.liste.length];
          return (
            <View style={{ gap: 12 }}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <ExoDemo nom={nom} taille={120} arrondi={20} />
                <Ink size={20} weight="black" tight style={{ textAlign: 'center' }}>{sansTiret(traduire(nomFr(nom)))}</Ink>
                <Ink size={12.5} weight="bold" color={c.textMuted}>{traduire('{0} sur {1}', (r.i % r.liste.length) + 1, r.liste.length)}</Ink>
              </View>
              <BoutonPrincipal onPress={() => prendreAlternative(nom)} label={traduire('Je prends')} rayon={20} tailleTexte={16} />
              {r.liste.length > 1 ? (
                <Pressable onPress={() => setRemplacerFor({ ...r, i: r.i + 1 })} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.fillSoft })}>
                  <Ink size={15} weight="extraBold">{traduire('Suivante')}</Ink>
                </Pressable>
              ) : null}
              {garder}
            </View>
          );
        })()}
      </Sheet>

      {/* Note d'un exercice */}
      <Sheet visible={!!noteEx} onClose={() => setNoteFor(null)} title={traduire("Note de l’exercice")}>
        {noteEx ? (
          <View style={{ gap: 12 }}>
            <TextInput
              value={noteEx.notes ?? ''}
              onChangeText={(t) => updateExercise(noteEx.id, (e) => ({ ...e, notes: t }))}
              placeholder={traduire("Réglage du banc, sensation, consigne du coach")}
              placeholderTextColor={c.textMuted}
              multiline
              autoFocus
              style={[fontStyle('medium'), { minHeight: 90, fontSize: 16, color: c.ink, padding: 14, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, textAlignVertical: 'top' }]}
            />
            <BoutonPrincipal onPress={() => setNoteFor(null)} label={traduire("Valider")} rayon={20} tailleTexte={16} />
          </View>
        ) : null}
      </Sheet>

      {/* Fin de seance */}
      <Sheet visible={finishOpen} onClose={() => setFinishOpen(false)} title={draft.editId ? traduire('Enregistrer les changements ?') : draft.form ? traduire('Enregistrer la séance ?') : traduire('Terminer la séance ?')} scroll>
        <SportRibbon sport={draft.sport} femme={femme} sub={draft.label && sansTiret(draft.label) !== getSportName(draft.sport) ? sansTiret(traduire(draft.label)) : undefined} />
        {/* series pas encore validees : en haut, avec de quoi agir (16 octobre 2026) */}
        {summary.pending > 0 ? (
          <View style={{ gap: 10, padding: 14, borderRadius: 18, backgroundColor: intensite(3).tint }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="check" size={20} color={intensite(3).text} strokeWidth={2.8} />
              <Ink size={15} weight="extraBold" color={intensite(3).text} style={{ flex: 1 }}>
                {summary.pending === 1 ? traduire('Une série pas encore validée') : traduire("{0} séries pas encore validées", summary.pending)}
              </Ink>
            </View>
            <Ink size={13} color={c.textSecondary}>
              {summary.pending === 1 ? traduire('Elle ne comptera pas tant que tu ne la valides pas.') : traduire('Elles ne comptent pas tant que tu ne les valides pas.')}
              {summary.pendingValid < summary.pending ? traduire(' Celles à 0 répétition restent de côté.') : ''}
            </Ink>
            {/* 3 novembre 2026 : exercice par exercice, combien de series manquent (lib/v2/seances/etatExo.ts) */}
            {draft.exercises.map((e) => {
              const et = e.cardio ? null : etatExo(e);
              if (!et || et.etat !== 'incomplet') return null;
              return (
                <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ink size={14} weight="extraBold" style={{ flex: 1 }} numberOfLines={1}>{sansTiret(traduire(nomFr(e.name)))}</Ink>
                  <AlerteManquantes n={et.manquantes} compact />
                </View>
              );
            })}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {summary.pendingValid > 0 ? (
                <BoutonPrincipal onPress={validateAll} haptique="light" accessibilityLabel={summary.pendingValid === 1 ? traduire('Valider la série restante') : traduire("Valider les {0} séries restantes", summary.pendingValid)} label={traduire("Tout valider")} hauteur={46} rayon={14} tailleTexte={14} lignes={1} compact style={{ flex: 1 }} />
              ) : null}
              <Pressable onPress={showPending} accessibilityRole="button" accessibilityLabel={traduire("Voir les séries à valider")} style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : blancA(0.75), borderWidth: 1, borderColor: c.border })}>
                <Ink size={14} weight="extraBold">{traduire("Voir")}</Ink>
              </Pressable>
            </View>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatDuree debut={draft.startedAt} minutes={draft.form && draft.details ? draft.details.duration : null} />
          <Stat ton="ciel" label={traduire("séries")} value={String(summary.sets)} />
          {/* pas de « 0 kg soulevés » : le tonnage n'apparait que s'il y en a un (poids du corps exclu) */}
          {summary.tonnage > 0 ? <Stat ton="peche" label={accordSouleve(summary.tonnage, unite)} value={formatTonnage(summary.tonnage, unite)} /> : null}
        </View>
        {summary.records > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: ton('peche').fond }}>
            <Hanko size={34} />
            <Ink size={15} weight="extraBold" style={{ flex: 1 }}>{summary.records === 1 ? traduire('Un record battu aujourd’hui') : traduire("{0} records battus aujourd’hui", summary.records)}</Ink>
          </View>
        ) : null}
        <Ink size={14} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Comment c’était ?")}</Ink>
        <ChoiceRow options={INTENSITIES} value={draft.intensity ?? null} onChange={(v) => update((d) => ({ ...d, intensity: v }))} columns={4} niveau={niveauRpe} />
        {/* 24 octobre 2026 : l'essentiel d'abord ; muscles, lieu et note replies (Houari : « mettre de l'ordre ») */}
        {!draft.form ? (
          <Pressable onPress={() => setPlusOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: plusOpen }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
            <Ink size={14} weight="extraBold" color={c.accent} style={{ flex: 1 }}>{plusOpen ? traduire('Moins de détails') : traduire('Plus de détails : muscles, lieu, note')}</Ink>
            <Icon name={plusOpen ? 'up' : 'down'} size={16} color={c.accent} />
          </Pressable>
        ) : null}
        {draft.form || plusOpen ? (
        <>
        {/* muscles devines depuis les exercices : replies, on les ouvre pour corriger */}
        <Pressable onPress={() => setMusclesOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: musclesOpen }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: blancA(0.75), borderWidth: 1, borderColor: c.border }}>
          <View style={{ flex: 1 }}>
            <Ink size={14} weight="bold" color={c.textSecondary}>{traduire("Muscles travaillés")}</Ink>
            {!musclesOpen && shownMuscles.length > 0 ? <Ink size={13} weight="bold" numberOfLines={2}>{MUSCLES.filter((m) => shownMuscles.includes(m.id)).map((m) => m.name).join(', ')}</Ink> : null}
          </View>
          <Icon name={musclesOpen ? 'up' : 'down'} size={16} color={c.textMuted} />
        </Pressable>
        {musclesOpen ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {MUSCLES.map((m) => {
              const on = shownMuscles.includes(m.id);
              return (
                <Pressable key={m.id} onPress={() => toggleMuscle(m.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 12, justifyContent: 'center', backgroundColor: on ? c.primary : c.fillSoft }}>
                  <Ink size={13} weight="bold" color={on ? c.onPrimary : c.ink}>{sansTiret(traduire(m.name))}</Ink>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {draft.details ? <SessionDetailsForm value={draft.details} onChange={setDetails} sport={draft.sport} showWhen={!!draft.form} /> : null}
        </>
        ) : null}
        {summary.sets === 0 && !draft.form ? (
          <Ink size={14} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Valide au moins une série pour enregistrer ta séance.")}</Ink>
        ) : null}
        <BoutonPrincipal onPress={save} disabled={saving || (summary.sets === 0 && !draft.form)} loading={saving} label={draft.editId ? traduire('Enregistrer les changements') : traduire('Enregistrer la séance')} />
        <Pressable onPress={abandon} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={14} weight="bold" color={c.textMuted}>{draft.form ? traduire('Quitter sans enregistrer') : traduire('Abandonner la séance')}</Ink>
        </Pressable>
      </Sheet>
    </View>
  );
}

type Etape =
  | { quoi: 'valider'; serie: number; total: number; detail: string; possible: boolean }
  | { quoi: 'suivant'; nom: string }
  | { quoi: 'terminer' }
  | { quoi: 'ajouter' };

/** La barre fixe du bas : une seule grande action a la fois, et l'exercice suivant toujours a portee */
function BarreAction({ bottom, etape, aSuivre, onValider, onSuivant, onTerminer, onAjouter }: { bottom: number; etape: Etape; aSuivre: string | null; onValider: () => void; onSuivant: () => void; onTerminer: () => void; onAjouter: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const principal =
    etape.quoi === 'valider'
      ? { label: traduire('Valider la série {0} sur {1}', etape.serie, etape.total), sous: etape.detail, icon: 'check' as const, onPress: onValider, fond: c.primary, texte: c.onPrimary, actif: etape.possible }
      : etape.quoi === 'suivant'
        ? { label: traduire('Exercice suivant'), sous: etape.nom, icon: 'chevron' as const, onPress: onSuivant, fond: ton('menthe').fond, texte: ton('menthe').encre, actif: true }
        : etape.quoi === 'terminer'
          ? { label: traduire('Terminer la séance'), sous: traduire('Tout est fait, bravo'), icon: 'check' as const, onPress: onTerminer, fond: c.primary, texte: c.onPrimary, actif: true }
          : { label: traduire('Ajouter un exercice'), sous: '', icon: 'plus' as const, onPress: onAjouter, fond: c.primary, texte: c.onPrimary, actif: true };
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: bottom + 10, backgroundColor: c.background, gap: 8 }}>
      {aSuivre ? (
        <Pressable onPress={onSuivant} accessibilityRole="button" accessibilityLabel={traduire('Passer à {0}', aSuivre)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
          <Ink size={12} weight="bold" color={c.textMuted}>{traduire('À suivre')}</Ink>
          <Ink size={13} weight="extraBold" color={c.ink} numberOfLines={1} style={{ flex: 1 }}>{aSuivre}</Ink>
          <Ink size={12} weight="extraBold" color={c.accentText}>{traduire('Passer')}</Ink>
          <Icon name="chevron" size={14} color={c.accentText} />
        </Pressable>
      ) : null}
      {principal.fond === c.primary ? (
        // 28 octobre 2026 : l'action principale (valider, terminer, ajouter) prend le bouton principal partage
        <BoutonPrincipal
          onPress={principal.onPress}
          disabled={!principal.actif}
          accessibilityLabel={principal.sous ? `${principal.label}, ${principal.sous}` : principal.label}
          hauteur={64}
          rayon={22}
          styleBouton={{ justifyContent: 'flex-start', gap: 12, paddingHorizontal: 16 }}
        >
          {(col) => (
            <>
              <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: principal.actif ? 'rgba(255,255,255,0.18)' : blancA(0.7), alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={principal.icon} size={22} color={col} strokeWidth={3} />
              </View>
              <View style={{ flex: 1 }}>
                <Ink size={17} weight="black" color={col} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{principal.label}</Ink>
                {principal.sous ? <Ink size={13} weight="bold" color={col} style={{ opacity: 0.82 }} numberOfLines={1}>{principal.sous}</Ink> : null}
              </View>
            </>
          )}
        </BoutonPrincipal>
      ) : (
    <Pressable
          onPress={() => {
            if (!principal.actif) return;
            impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
            principal.onPress();
          }}
          disabled={!principal.actif}
          accessibilityRole="button"
          accessibilityLabel={principal.sous ? `${principal.label}, ${principal.sous}` : principal.label}
          style={({ pressed }) => ({ minHeight: 64, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, backgroundColor: !principal.actif ? c.fillSoft : principal.fond, opacity: pressed ? 0.85 : 1 })}
        >
          <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: blancA(0.7), alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={principal.icon} size={22} color={principal.actif ? principal.texte : c.textMuted} strokeWidth={3} />
          </View>
          <View style={{ flex: 1 }}>
            <Ink size={17} weight="black" color={principal.actif ? principal.texte : c.textMuted} numberOfLines={1}>{principal.label}</Ink>
            {principal.sous ? <Ink size={13} weight="bold" color={principal.actif ? principal.texte : c.textMuted} style={{ opacity: 0.8 }} numberOfLines={1}>{principal.sous}</Ink> : null}
          </View>
        </Pressable>
      )}
    </View>
  );
}

/*
 * 1er novembre 2026 (audit de performance) : ce qui bouge chaque seconde a sa propre horloge.
 * Avant, useNow(1000) en haut de l'ecran redessinait toutes les cartes et toutes les series chaque seconde.
 */
const ChronoSeance = React.memo(function ChronoSeance({ debut }: { debut: number }) {
  const now = useNow(1000);
  return <Ink size={26} weight="black" style={{ fontVariant: ['tabular-nums'] }}>{fmtClock(Math.floor((now - debut) / 1000))}</Ink>;
});

/** duree de la feuille de fin : fixe pour une seance saisie, en direct sinon */
const StatDuree = React.memo(function StatDuree({ debut, minutes }: { debut: number; minutes: number | null }) {
  const now = useNow(1000, minutes === null);
  return <Stat ton="creme" label={traduire("durée")} value={fmtMinutes(minutes !== null ? minutes : Math.floor((now - debut) / 1000) / 60)} />;
});

/** 25 octobre 2026 : le coach en direct, une phrase qui change a chaque moment (lib/v2/seance/coachSeance.ts) */
const CoachDirect = React.memo(function CoachDirect({ draft, femme, unite }: { draft: MuscuDraft; femme: boolean; unite: ReturnType<typeof useUnitePoids> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const now = useNow(1000, !draft.form);
  const lb = unite === 'lb';
  const mot = draft.form ? null : coachSeance(draft, {
    femme,
    maintenant: now,
    charge: (kg) => (lb ? traduire('{0} lb', fmtNum(saisieDepuisKg(kg, unite))) : traduire('{0} kg', fmtNum(kg))),
    nom: (n) => sansTiret(traduire(nomFr(n))),
  });
  if (!mot) return null;
  const fort = mot.moment === 'derniere' || mot.moment === 'fin' || mot.moment === 'moitie';
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: fort ? ton('lilas').fond : c.accentTint }}>
      <Ink size={11} weight="black" color={fort ? ton('lilas').encre : c.accentText} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>{traduire('Coach')}</Ink>
      <Ink size={14} weight="extraBold" color={c.ink} style={{ flex: 1, lineHeight: 19 }}>{mot.texte}</Ink>
    </View>
  );
});

/** la carte cardio garde son horloge a la seconde, seule */
function CarteCardioEnDirect(p: Omit<React.ComponentProps<typeof CarteCardio>, 'maintenant'>) {
  const maintenant = useNow(1000);
  return <CarteCardio {...p} maintenant={maintenant} />;
}

function Stat({ label, value, ton: t }: { label: string; value: string; ton: TonSeance }) {
  const p = ton(t);
  return (
    <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 20, backgroundColor: p.fond, gap: 2 }}>
      <Ink size={12.5} weight="extraBold" color={p.encre} numberOfLines={1}>{label.charAt(0).toUpperCase() + label.slice(1)}</Ink>
      <Ink size={22} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Ink>
    </View>
  );
}

// 30 octobre 2026 : le sticker a la place de l'icone quand il y en a un (reglage Illustrations sur Stickers)
type IconeMenu = 'up' | 'down' | 'pencil' | 'trash' | 'swap' | 'plus' | 'close' | 'lien';
const STICKER_MENU: Partial<Record<IconeMenu, NomSticker>> = { up: 'fleches_haut_bas', down: 'fleches_haut_bas', pencil: 'crayon', trash: 'corbeille', plus: 'repeter', close: 'quitter', lien: 'chaine' };

function MenuRow({ icon, label, onPress, danger, disabled }: { icon: IconeMenu; label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const sticker = STICKER_MENU[icon];
  const color = disabled ? c.textMuted : danger ? c.danger : c.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, backgroundColor: pressed ? c.fillSubtle : c.fillSoft, opacity: disabled ? 0.5 : 1 })}>
      {sticker ? <StickerSinon nom={sticker} taille={30}><Icon name={icon === 'lien' ? 'route' : icon} size={20} color={color} /></StickerSinon> : <Icon name={icon === 'lien' ? 'route' : icon} size={20} color={color} />}
      <Ink size={15} weight="bold" color={color}>{label}</Ink>
    </Pressable>
  );
}

function EmptyStart({ image, recent, onPick, onLibrary }: { image: ReturnType<typeof sportImage>; recent: ExerciseHistory[]; onPick: (h: ExerciseHistory) => void; onLibrary: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ gap: 14, marginTop: 10 }}>
      <View style={{ height: 230, borderRadius: 26, backgroundColor: ton('ciel').fond, overflow: 'hidden', padding: 20 }}>
        {image ? <Image source={image} style={{ position: 'absolute', right: -20, bottom: -40, width: 200, height: 266 }} resizeMode="contain" /> : null}
        <View style={{ maxWidth: '62%', gap: 6 }}>
          <Ink size={26} weight="black" tight>{traduire("Premier exercice ?")}</Ink>
          <Ink size={14} color={c.textSecondary}>{traduire("Choisis cet exercice : tes séries arrivent déjà remplies avec ta dernière fois.")}</Ink>
        </View>
        <Pressable onPress={onLibrary} accessibilityRole="button" style={({ pressed }) => ({ position: 'absolute', left: 20, bottom: 20, minHeight: 48, paddingHorizontal: 18, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: pressed ? blancA(0.75) : c.surface })}>
          <PlusPastille />
          <Ink size={15} weight="black" color={c.onPrimary}>{traduire("Choisir un exercice")}</Ink>
        </Pressable>
      </View>
      {recent.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Ink size={14} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Tes exercices récents")}</Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {recent.map((h) => (
              <Pressable key={h.name} onPress={() => onPick(h)} accessibilityRole="button" accessibilityLabel={traduire("Ajouter {0}", h.name)} style={({ pressed }) => [carteBlanche(c.surface, c.divider), { minHeight: 48, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, justifyContent: 'center', opacity: pressed ? 0.85 : 1 }]}>
                <Ink size={14} weight="extraBold">{sansTiret(traduire(h.name))}</Ink>
                <Ink size={11} color={c.textMuted}>{niceGroup(h.muscle)}</Ink>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
