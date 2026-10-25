/**
 * Seance de musculation en direct (maquette S2).
 * Chrono, exercices pre-remplis avec la derniere fois, series en un appui, repos automatique, records tamponnes.
 * Parametres : sport, label, slotId (creneau du planning), repeatId (refaire une seance), resume ('1'),
 * editId (modifier une seance), date, time, duration, clubId (saisie apres coup, aussi sous les anciens noms prefill...),
 * maSeance (une seance de « Mes séances », 25 octobre 2026).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { accordSouleve, formatTonnage, tonnageOfSets } from '@/lib/v2/trainingWeek';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
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
import { getActiveInjuries, getProfile, getTrainingById, getTrainings, getWeeklyPlanById } from '@/lib/database';
import type { Exercise } from '@/lib/database';
import { MUSCLES, getSportName } from '@/lib/sports';
import { logger } from '@/lib/security/logger';
import { fmtClock, fmtMinutes, fmtNum, hhmm, isoDay, niceGroup, relativeDay } from '@/lib/v2/seance/format';
import { bestSet, buildExerciseHistory, epley, normName, setLabel } from '@/lib/v2/seance/history';
import type { ExerciseHistory, SetValue } from '@/lib/v2/seance/history';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { kgDepuisSaisie, saisieDepuisKg } from '@/lib/v2/unitePoids';
import { clearDraft, loadDraft, loadRestPref, saveDraft, saveRestPref, uid } from '@/lib/v2/seance/model';
import type { LiveExercise, LiveSet, MuscuDraft, SessionDetails } from '@/lib/v2/seance/model';
import { detailsFromTraining, loadTrainingForEdit, trainingFromDetails } from '@/lib/v2/seance/edit';
import { initialDetails, readParams, timeOf, wantsForm } from '@/lib/v2/seance/params';
import { draftAgo, draftRoute, draftTitle } from '@/lib/v2/seance/resume';
import { saveSeance } from '@/lib/v2/seance/save';
import type { SeanceRecord } from '@/lib/v2/seance/save';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
import { useNow } from '@/lib/v2/seance/useNow';
import { rappelReposAutorise, useRappelFinRepos } from '@/lib/v2/seance/rappelRepos';
import { useI18n } from '@/lib/I18nContext';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { blancA } from '@/components/yoroi/livePalette';
import { intensite, niveauRpe } from '@/lib/v2/intensite';
import { traduire } from '@/lib/i18n/tr';
import { programmeParId, libelleRepos } from '@/lib/v2/programmes/catalogue';
import { ExoDemo } from '@/components/yoroi/v2/seance/ExoDemo';
import { AideBarre } from '@/components/yoroi/v2/seance/AideBarre';
import { proposer, proposerLegere, proposerLibre, seancesDeLExo } from '@/lib/v2/programmes/progression';
import { chargerMateriel, chargerProgrammeActif, estSemaineLegere, marquerJourFait, plusJours } from '@/lib/v2/programmes/suivi';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { seanceExpress } from '@/lib/v2/programmes/express';
import { lireZones, seanceZones, titreZones } from '@/lib/v2/programmes/zones';
import { marquerFaite, maSeanceParId, seriesPrevues } from '@/lib/v2/seance/mesSeances';
import { terminerActiviteSeance, useActiviteSeance } from '@/lib/v2/widgets/activiteSeance';
import type { EtatSeance } from '@/lib/v2/widgets/activiteSeance';
import { appliquerActionsIle, ecouterActionsIle, planIle } from '@/lib/v2/seance/actionsIle';
import type { TextesIle } from '@/lib/v2/seance/actionsIle';
import { LIBELLE_REGION, protegerJour, regionsDesBlessures } from '@/lib/v2/programmes/blessures';

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
  return planned.map((s) => ({ id: uid(), weight: s.weight, reps: s.reps, done: false, prevWeight: withPrev ? s.weight : undefined, prevReps: withPrev ? s.reps : undefined }));
}

function exerciseFrom(name: string, muscle: string | undefined, h: ExerciseHistory | undefined, planned?: SetValue[]): LiveExercise {
  const base = planned ?? h?.lastSets ?? [{ weight: 0, reps: 10 }, { weight: 0, reps: 10 }, { weight: 0, reps: 10 }];
  return { id: uid(), name, muscle: muscle ?? h?.muscle, sets: makeSets(base, !!(planned || h)) };
}

/** Exercice d'une seance enregistree, series deja validees (modification) */
function exerciseDone(e: Exercise): LiveExercise {
  // le type de serie (echauffement...) est garde : sinon un echauffement compterait dans le tonnage apres modification
  const types = e.setsData && e.setsData.length > 0 ? e.setsData.map((s) => s?.type) : [];
  const sets = setsOfExercise(e).map((s, i) => ({ id: uid(), weight: s.weight, reps: s.reps, done: true, ...(types[i] ? { type: types[i] } : {}) }));
  return { id: uid(), name: e.name, muscle: e.muscle_group, sets, notes: e.notes, orig: e };
}

function setsOfExercise(e: Exercise): SetValue[] {
  if (e.setsData && e.setsData.length > 0) return e.setsData.map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 }));
  const n = Math.max(1, Math.min(Number(e.sets) || 1, 20));
  return Array.from({ length: n }, () => ({ weight: Number(e.weight) || 0, reps: Number(e.reps) || 0 }));
}

function muscleId(g?: string): string | null {
  if (!g) return null;
  return g.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, '_');
}

export default function SeanceMuscu() {
  const { theme } = useYoroiTheme();
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
  const { t: tRepos } = useI18n();
  useRappelFinRepos(draft?.restEndsAt ?? null, tRepos('timer.restEnded'));
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
  const [finishOpen, setFinishOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // garde synchrone : deux appuis rapproches n'enregistrent jamais la seance deux fois
  const savingRef = useRef(false);
  const [freshRecord, setFreshRecord] = useState<string | null>(null);
  const [musclesOpen, setMusclesOpen] = useState(false);
  // fin de seance : lieu, muscles et note d'execution replies sous « Plus de détails » (24 octobre 2026)
  const [plusOpen, setPlusOpen] = useState(false);
  const finished = useRef(false);
  const now = useNow(1000, !!draft);

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
            appAlert(traduire('Séance introuvable'), traduire('Elle a peut-être été supprimée.'));
            router.back();
            return;
          }
          const exercises = (t.exercises ?? []).filter((e) => e && e.name).map(exerciseDone);
          setDraft({
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
          });
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
          const prog = programmeParId(param1(raw.programme));
          const jourIdx = prog ? prog.jours.findIndex((j) => j.id === param1(raw.jour)) : -1;
          // 24 octobre 2026 : « Je ne sais pas quoi faire », la seance des zones touchees sur le corps (lib/v2/programmes/zones.ts)
          const zones = prog ? [] : lireZones(param1(raw.zones));
          const jourSource = prog && jourIdx >= 0 ? prog.jours[jourIdx] : zones.length ? { id: 'zones', titre: titreZones(zones, traduire), muscles: [], exos: seanceZones(zones) } : null;
          if (jourSource) {
            const [trainings, h, actif, materiel, blessures] = await Promise.all([trainingsP, histP, chargerProgrammeActif(), chargerMateriel(), getActiveInjuries().catch(() => [])]);
            // ton materiel et tes douleurs declarees : chaque exercice impossible ou qui charge une zone douloureuse
            // est remplace par le plus proche (lib/v2/programmes/materiel.ts, blessures.ts)
            const protege = protegerJour(jourSource, materiel, regionsDesBlessures(blessures ?? []));
            // seance express (15, 20 ou 30 min) : la seance du jour raccourcie (lib/v2/programmes/express.ts)
            const express = Number(param1(raw.express)) || 0;
            const jour = express > 0 ? { ...protege, exos: seanceExpress(protege.exos, express).exos } : protege;
            // semaine legere du programme en cours : moitie moins de series, meme charge
            const legere = !!prog && !!actif && actif.id === prog.id && estSemaineLegere(actif);
            // les seances des semaines legeres passees ne comptent pas dans la progression
            const legeres = prog && actif && actif.id === prog.id ? actif.legeres ?? [] : [];
            const horsLegere = trainings.filter((t) => !legeres.some((d) => t.date.slice(0, 10) >= d && t.date.slice(0, 10) <= plusJours(d, 6)));
            exercises = jour.exos.map((e) => {
              const prop = legere ? proposerLegere(e, seancesDeLExo(trainings, e.nom)) : proposer(e, seancesDeLExo(horsLegere, e.nom));
              // series proposees ; « la derniere fois » reste ta vraie derniere seance (rien si premiere fois)
              const hx = h.map.get(normName(e.nom));
              const sets: LiveSet[] = prop.series.map((sv, i) => {
                const last = hx?.lastSets[Math.min(i, (hx?.lastSets.length ?? 1) - 1)];
                return { id: uid(), weight: sv.weight, reps: sv.reps, done: false, ...(last ? { prevWeight: last.weight, prevReps: last.reps } : {}) };
              });
              const ex: LiveExercise = { id: uid(), name: e.nom, muscle: e.muscle ?? hx?.muscle, sets };
              const zone = 'zone' in e && e.zone ? e.zone : null;
              const conseil = zone
                ? e.impossible
                  ? traduire('Tu as signalé une douleur : {0}. Passe cet exercice, et demande l’avis d’un professionnel si elle dure.', traduire(LIBELLE_REGION[zone]))
                  : traduire('Remplace {0} pour ménager {1}', traduire(nomFr(e.remplace ?? '')), traduire(LIBELLE_REGION[zone]))
                : e.remplace
                  ? undefined
                  : e.conseil;
              return { ...ex, cible: { repsMin: e.repsMin, repsMax: e.repsMax, reposSec: e.reposSec, conseil, raison: prop.raison, nouvelleCharge: prop.nouvelleCharge, ...(e.secondes ? { secondes: true } : {}) } };
            });
            if (!label) label = !prog ? jour.titre : express > 0 ? traduire('{0}, express {1} min', traduire(jour.titre), express) : legere ? traduire('{0}, semaine légère', traduire(jour.titre)) : `${traduire(prog.titre)}, ${traduire(jour.titre)}`;
            if (prog) programme = { id: prog.id, jourId: jour.id };
          }
          // 25 octobre 2026 : une seance de « Mes séances » ; les charges viennent de ta derniere fois sur chaque exercice
          const maSeanceId = param1(raw.maSeance);
          if (maSeanceId && exercises.length === 0) {
            const [m, h] = await Promise.all([maSeanceParId(maSeanceId), histP]);
            if (m) {
              exercises = m.exos.map((e) => {
                const hx = h.map.get(normName(e.nom));
                return { id: uid(), name: e.nom, muscle: e.muscle ?? hx?.muscle, sets: makeSets(seriesPrevues(e, hx?.travail ?? hx?.lastSets), !!hx) };
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
                onPress: async () => {
                  await clearDraft();
                  terminerActiviteSeance();
                  setDraft(await fresh());
                },
              },
              {
                text: 'Reprendre',
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

  // Le brouillon est ecrit a chaque changement
  useEffect(() => {
    if (!draft || finished.current) return;
    const t = setTimeout(() => {
      if (!finished.current) saveDraft(draft);
    }, 300);
    return () => clearTimeout(t);
  }, [draft]);

  const update = useCallback((fn: (d: MuscuDraft) => MuscuDraft) => setDraft((d) => (d ? fn(d) : d)), []);

  const updateExercise = (id: string, fn: (e: LiveExercise) => LiveExercise) =>
    update((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === id ? fn(e) : e)) }));

  const current = draft?.exercises.find((e) => e.id === draft.currentId) ?? draft?.exercises[0] ?? null;
  const activeIndex = current ? current.sets.findIndex((s) => !s.done) : -1;

  const addExercise = (name: string, muscle?: string) => {
    setPickerOpen(false);
    const ex = exerciseFrom(name, muscle, hist.map.get(normName(name)));
    update((d) => ({ ...d, exercises: [...d.exercises, ex], currentId: ex.id }));
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
    const sets = ex.sets.map((s, i) => {
      if (i === index) return { ...s, done: true, record };
      // la serie suivante sans reference reprend les valeurs de celle-ci
      if (i === index + 1 && !s.done && s.prevWeight === undefined) return { ...s, weight: set.weight, reps: set.reps };
      return s;
    });
    update((d) => ({
      ...d,
      exercises: d.exercises.map((e) => (e.id === ex.id ? { ...e, sets } : e)),
      // seance de programme : le repos prevu pour cet exercice
      restEndsAt: d.form ? null : Date.now() + (d.reposManuel ? d.restSec : ex.cible?.reposSec ?? d.restSec) * 1000,
      restTotal: d.form ? 0 : d.reposManuel ? d.restSec : ex.cible?.reposSec ?? d.restSec,
    }));
    if (record) {
      setFreshRecord(set.id);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    } else {
      impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    }
  };

  const addSet = (ex: LiveExercise) => {
    const last = ex.sets[ex.sets.length - 1];
    const s: LiveSet = { id: uid(), weight: last?.weight ?? 0, reps: last?.reps ?? 10, done: false };
    updateExercise(ex.id, (e) => ({ ...e, sets: [...e.sets, s] }));
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
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
    const ex = draft?.exercises.find((e) => e.sets.some((s) => !s.done));
    if (ex) update((d) => ({ ...d, currentId: ex.id }));
    setFinishOpen(false);
  };

  const askSetAction = (ex: LiveExercise, index: number) => {
    appAlert(traduire("Série {0}", index + 1), undefined, [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Supprimer la série'), style: 'destructive', onPress: () => updateExercise(ex.id, (e) => ({ ...e, sets: e.sets.filter((_, i) => i !== index) })) },
    ]);
  };

  const moveExercise = (id: string, dir: -1 | 1) =>
    update((d) => {
      const i = d.exercises.findIndex((e) => e.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.exercises.length) return d;
      const list = [...d.exercises];
      [list[i], list[j]] = [list[j], list[i]];
      return { ...d, exercises: list };
    });

  const removeExercise = (id: string) => {
    appAlert(traduire('Supprimer cet exercice ?'), traduire('Ses séries seront retirées de la séance.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: () => {
          setMenuFor(null);
          update((d) => {
            const list = d.exercises.filter((e) => e.id !== id);
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
    const pending = (draft?.exercises ?? []).reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0);
    // series restantes qui ont des repetitions : les seules que « Tout valider » peut valider
    const pendingValid = (draft?.exercises ?? []).reduce((n, e) => n + e.sets.filter((s) => !s.done && s.reps > 0).length, 0);
    return {
      sets: done.length,
      pending,
      pendingValid,
      // regle unique du tonnage (lib/v2/trainingWeek) : series terminees, charge x repetitions, poids du corps exclu
      tonnage: tonnageOfSets(done.filter((s) => s.type !== 'warmup').map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 }))),
      records: done.filter((s) => s.record).length,
    };
  }, [draft]);

  const elapsedSec = draft ? Math.floor((now - draft.startedAt) / 1000) : 0;

  // 24 octobre 2026 : la seance en direct sur l'ecran verrouille et dans la Dynamic Island (lib/v2/widgets/activiteSeance.ts)
  const etatLive = useMemo((): EtatSeance | null => {
    if (!draft || draft.form || draft.editId) return null;
    const cur = draft.exercises.find((e) => e.id === draft.currentId) ?? draft.exercises[0];
    const titre = traduire(draftTitle(draft));
    if (!cur) return { titre, debutMs: draft.startedAt, libelle: titre, finReposMs: null, reposTotalS: 0, ensuite: '' };
    const i = cur.sets.findIndex((x) => !x.done);
    const nom = traduire(nomFr(cur.name));
    const libelle = i >= 0 ? traduire('{0}, série {1} sur {2}', nom, i + 1, cur.sets.length) : traduire('{0}, bouclé', nom);
    const suivant = i >= 0 ? null : draft.exercises.find((e) => e.id !== cur.id && e.sets.some((x) => !x.done));
    const ensuite = i >= 0 ? traduire('Ensuite : {0}, série {1}', nom, i + 1) : suivant ? traduire('Ensuite : {0}', traduire(nomFr(suivant.name))) : traduire('Dernier effort, bravo');
    // 25 octobre 2026 : boutons « Série faite » et « +15 s » dans la Dynamic Island (lib/v2/seance/actionsIle.ts)
    const textes: TextesIle = {
      serie: traduire('{0}, série {1} sur {2}'),
      ensuite: traduire('Ensuite : {0}, série {1}'),
      ensuiteExo: traduire('Ensuite : {0}'),
      fini: traduire('Séance bouclée'),
      bouton: traduire('Série faite'),
      plus15: traduire('+15 s'),
      reposFini: tRepos('timer.restEnded'),
    };
    const plan = planIle(draft, textes, (e) => traduire(nomFr(e.name)), rappelIle);
    return { titre, debutMs: draft.startedAt, libelle, finReposMs: draft.restEndsAt ?? null, reposTotalS: draft.restTotal, ensuite, plan };
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
        { text: 'Rester', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: () => { finished.current = true; setFinishOpen(false); router.back(); } },
      ]);
      return;
    }
    appAlert(traduire('Abandonner la séance ?'), traduire('Rien ne sera enregistré.'), [
      { text: traduire('Continuer la séance'), style: 'cancel' },
      {
        text: 'Abandonner',
        style: 'destructive',
        onPress: async () => {
          finished.current = true;
          setFinishOpen(false);
          await clearDraft();
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
          const setsData = done.map((s) => (s.type ? { weight: s.weight, reps: s.reps, type: s.type } : { weight: s.weight, reps: s.reps }));
          const best = bestSet(setsData)!;
          const recs = done.filter((s) => s.record);
          if (recs.length > 0) {
            const top = [...recs].sort((a, b) => epley(b.weight, b.reps) - epley(a.weight, a.reps))[0];
            const h = hist.map.get(normName(e.name));
            records.push({ name: e.name, weight: top.weight, reps: top.reps, kind: h && top.weight > h.bestWeight ? 'charge' : 'max' });
          }
          const out: Exercise = { ...(e.orig ?? {}), name: e.name, muscle_group: e.muscle, weight: best.weight, reps: best.reps, sets: setsData.length, setsData };
          if (e.notes && e.notes.trim()) out.notes = e.notes.trim();
          else delete out.notes;
          return out;
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
          duration_minutes: draft.form && det ? det.duration : Math.max(1, Math.round(elapsedSec / 60)),
          exercises: exercises.length ? exercises : undefined,
          muscles: muscles.length ? muscles.join(',') : undefined,
          notes: draft.notes.trim() || undefined,
          intensity: draft.intensity ?? undefined,
          source: 'manual',
        },
        { slotId: draft.slotId, title: draft.editId ? getSportName(draft.sport) : draftTitle(draft), records, editId: draft.editId, methode: 'live' },
      );
      setFinishOpen(false);
      if (draft.programme && !draft.editId) await marquerJourFait(draft.programme.id, draft.programme.jourId, result.id, draft.form && det ? det.date : undefined).catch(() => {});
      if (draft.maSeance && !draft.editId && exercises.length > 0) await marquerFaite(draft.maSeance, draft.form && det ? det.date : undefined).catch(() => {});
      if (draft.editId) {
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        router.back();
        return;
      }
      if (!draft.form) await clearDraft();
      terminerActiviteSeance();
      router.replace({ pathname: '/seance/fin' as any, params: { id: String(result.id), ...(draft.maSeance ? { maSeance: draft.maSeance } : {}) } });
    } catch (err) {
      finished.current = false;
      logger.error('Enregistrement de la seance impossible', err);
      appAlert('Oups', traduire('La séance n’a pas pu être enregistrée. Elle reste en cours, réessaie.'));
      savingRef.current = false;
      setSaving(false);
    }
  };

  // hors programme : la meme double progression que les programmes (calcul garde en memoire, pas a chaque seconde)
  const libreNom = current && !current.cible && !draft?.editId ? current.name : null;
  const libre = useMemo(() => (libreNom ? proposerLibre(seancesDeLExo(toutesSeances, libreNom, 2)) : null), [libreNom, toutesSeances]);

  if (!draft) {
    return <View style={{ flex: 1, backgroundColor: c.background }}><Stack.Screen options={{ gestureEnabled: false }} /></View>;
  }

  const title = draftTitle(draft);
  const restOn = !!draft.restEndsAt;
  // en direct : la barre d'action fixe du bas (valider, exercice suivant, terminer) prend sa place
  const barreOn = !draft.form && !restOn;
  const bottomSpace = insets.bottom + (restOn ? 110 : barreOn ? 130 : 30);
  const hCurrent = current ? hist.map.get(normName(current.name)) : undefined;
  const lastBest = hCurrent ? bestSet(hCurrent.lastSets) : null;
  const currentDone = current ? current.sets.length > 0 && current.sets.every((s) => s.done) : false;
  const nextEx = current ? draft.exercises.find((e, i) => i > draft.exercises.indexOf(current) && e.sets.some((s) => !s.done)) ?? draft.exercises.find((e) => e.id !== current.id && e.sets.some((s) => !s.done)) : undefined;
  const menuEx = draft.exercises.find((e) => e.id === menuFor) ?? null;
  const noteEx = draft.exercises.find((e) => e.id === noteFor) ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ gestureEnabled: false }} />

      {/* En-tete : retour (la seance reste en cours), titre, chrono, Terminer */}
      <View style={{ paddingTop: Math.max(insets.top, 24) + 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {draft.form ? (
          <Pressable onPress={abandon} accessibilityRole="button" accessibilityLabel={traduire("Fermer sans enregistrer")} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fillSubtle }}>
            <Icon name="close" size={18} strokeWidth={2.6} />
          </Pressable>
        ) : (
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={traduire("Réduire, la séance reste en cours")} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fillSubtle }}>
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
            <Ink size={26} weight="black" style={{ fontVariant: ['tabular-nums'] }}>{fmtClock(elapsedSec)}</Ink>
          </View>
        )}
        <Pressable onPress={() => setFinishOpen(true)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, justifyContent: 'center', backgroundColor: pressed ? c.accentPressed : c.accent })}>
          <Ink size={15} weight="extraBold" color={c.onAccent}>{draft.form ? traduire('Enregistrer') : traduire('Terminer')}</Ink>
        </Pressable>
      </View>

      {/* Avancement : une barre par exercice */}
      {draft.exercises.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 22, marginTop: 10 }} accessibilityLabel={traduire("Exercice {0} sur {1}", draft.exercises.indexOf(current!) + 1, draft.exercises.length)}>
          {draft.exercises.map((e) => {
            const isCur = e.id === current?.id;
            const all = e.sets.length > 0 && e.sets.every((s) => s.done);
            return (
              <Pressable key={e.id} onPress={() => update((d) => ({ ...d, currentId: e.id }))} accessibilityLabel={traduire("Aller à {0}", e.name)} style={{ flex: 1, paddingVertical: 8 }}>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: isCur ? c.accent : all ? c.ink : '#D5D2CA' }} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 8, paddingBottom: bottomSpace, gap: 10 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
        {!current ? (
          <EmptyStart
            image={sportImage(draft.sport, femme, 1)}
            recent={hist.recent.slice(0, 8).map((k) => hist.map.get(k)!).filter(Boolean)}
            onPick={(h) => addExercise(h.name, h.muscle)}
            onLibrary={() => setPickerOpen(true)}
          />
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4, marginTop: 4 }}>
              <View style={{ flex: 1, gap: 4 }}>
                {draft.exercises.length > 1 ? (
                  <Ink size={13} weight="extraBold" color={c.accent}>{traduire('EXERCICE {0} SUR {1}', draft.exercises.indexOf(current) + 1, draft.exercises.length)}</Ink>
                ) : null}
                <Ink size={30} weight="black" tight>{traduire(current.name)}</Ink>
                <Ink size={14} color={c.textSecondary}>
                  {lastBest && hCurrent ? (
                    <>
                      {traduire("La dernière fois, {0} : ", relativeDay(hCurrent.lastDate))}<Ink size={14} weight="extraBold">{lastBest.weight > 0 ? (lb ? traduire("{0} livres pour {1}", fmtNum(saisieDepuisKg(lastBest.weight, unite)), lastBest.reps) : traduire("{0} kilos pour {1}", fmtNum(saisieDepuisKg(lastBest.weight, unite)), lastBest.reps)) : traduire("{0} répétitions", lastBest.reps)}</Ink>
                    </>
                  ) : (
                    traduire('Première fois sur cet exercice. Ce que tu fais aujourd’hui devient ta référence.')
                  )}
                </Ink>
                {libre ? (
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
              </View>
              <Pressable onPress={() => setMenuFor(current.id)} accessibilityRole="button" accessibilityLabel={traduire("Options de l'exercice")} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fillSubtle }}>
                <Icon name="more" size={20} />
              </Pressable>
            </View>

            {/* 24 octobre 2026 : animation de l'exercice, si ses deux images existent */}
            <View style={{ alignItems: 'center' }}>
              <ExoDemo nom={current.name} taille={150} arrondi={22} />
            </View>

            {current.cible ? (
              <View style={{ marginHorizontal: 4, padding: 12, borderRadius: 14, backgroundColor: c.accentTint, gap: 3 }}>
                <Ink size={13} weight="extraBold" color={c.accent}>
                  {current.cible.secondes
                    ? traduire('Objectif : tenir {0} à {1} secondes, repos {2}. Note les secondes dans la colonne Répétitions.', current.cible.repsMin, current.cible.repsMax, libelleRepos(current.cible.reposSec))
                    : current.cible.repsMin === current.cible.repsMax
                    ? traduire('Objectif : {0} répétitions, repos {1}', current.cible.repsMin, libelleRepos(current.cible.reposSec))
                    : traduire('Objectif : {0} à {1} répétitions, repos {2}', current.cible.repsMin, current.cible.repsMax, libelleRepos(current.cible.reposSec))}
                </Ink>
                {current.cible.raison === 'monte' && current.cible.nouvelleCharge ? (
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
              <Pressable onPress={() => setNoteFor(current.id)} style={{ marginHorizontal: 4, padding: 12, borderRadius: 14, backgroundColor: c.goldTint }}>
                <Ink size={13} color={c.textSecondary}>{current.notes}</Ink>
              </Pressable>
            ) : null}

            <View style={{ flexDirection: 'row', paddingHorizontal: 8, marginTop: 6 }}>
              <Ink size={12} weight="bold" color={c.textMuted} style={{ width: 44 }}>{traduire("Série")}</Ink>
              <Ink size={12} weight="bold" color={c.textMuted} style={{ flex: 1, textAlign: 'center' }}>{lb ? 'Livres' : 'Kilos'}</Ink>
              <Ink size={12} weight="bold" color={c.textMuted} style={{ flex: 1, textAlign: 'center' }}>{traduire("Répétitions")}</Ink>
              <View style={{ width: 48 }} />
            </View>

            {current.sets.map((s, i) => {
              if (i === activeIndex) {
                return (
                  <View key={s.id} style={{ borderRadius: 24, backgroundColor: c.surface, borderWidth: 2, borderColor: c.ink, padding: 12, gap: 10, shadowColor: c.shadow, shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
                      <Ink size={16} weight="black" style={{ flex: 1 }}>{traduire("Série {0}", i + 1)}</Ink>
                      {s.prevWeight !== undefined ? <Ink size={12} weight="bold" color={c.textMuted} numberOfLines={1}>{traduire("la dernière fois {0}", setLabel({ weight: s.prevWeight, reps: s.prevReps ?? 0 }, unite))}</Ink> : null}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Stepper layout="stack" value={saisieDepuisKg(s.weight, unite)} step={lb ? 5 : 2} fine={lb ? 1 : 0.5} max={lb ? 1100 : 500} decimals unit={lb ? traduire('livres') : traduire('kilos')} size={38} button={50} hint={lb ? traduire('livres') : traduire('kilos')} onChange={(v) => setValue(current.id, s.id, { weight: kgDepuisSaisie(v, unite) })} />
                      </View>
                      <View style={{ width: 1, backgroundColor: c.border, marginVertical: 6 }} />
                      <View style={{ flex: 1 }}>
                        <Stepper layout="stack" value={s.reps} step={1} max={200} unit={traduire("répétitions")} size={38} button={50} hint={i > 0 && s.prevReps === undefined ? traduire("comme la série {0}", i) : traduire('répétitions')} onChange={(v) => setValue(current.id, s.id, { reps: v })} />
                      </View>
                    </View>
                    {/* en saisie apres coup, le bouton reste dans la carte ; en direct, il est dans la barre fixe du bas */}
                    {draft.form ? (
                      <Pressable
                        onPress={() => validate(current, i)}
                        disabled={s.reps <= 0}
                        accessibilityRole="button"
                        accessibilityLabel={traduire("Valider la série {0}", i + 1)}
                        style={({ pressed }) => ({ minHeight: 58, borderRadius: 18, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: s.reps <= 0 ? c.border : pressed ? c.accentPressed : c.accent })}
                      >
                        <Icon name="check" size={24} color={c.onAccent} strokeWidth={3} />
                        <Ink size={17} weight="extraBold" color={c.onAccent}>{traduire("Valider la série")}</Ink>
                      </Pressable>
                    ) : null}
                  </View>
                );
              }
              const pending = !s.done;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    if (s.done) setValue(current.id, s.id, { done: false, record: false });
                  }}
                  onLongPress={() => askSetAction(current, i)}
                  accessibilityRole="button"
                  accessibilityLabel={s.done ? traduire("Série {0} validée, {1}. Toucher pour la modifier", i + 1, setLabel(s, unite)) : traduire("Série {0} prévue, {1}", i + 1, setLabel(s, unite))}
                  style={{ flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingHorizontal: 8, borderRadius: 16, backgroundColor: pending ? 'transparent' : blancA(0.55), borderWidth: pending ? 1.5 : 0, borderStyle: 'dashed', borderColor: c.border }}
                >
                  <Ink size={16} weight="extraBold" color={c.textSecondary} style={{ width: 44, textAlign: 'center' }}>{i + 1}</Ink>
                  <Ink size={20} weight={pending ? 'bold' : 'black'} color={pending ? c.textMuted : c.ink} style={{ flex: 1, textAlign: 'center' }}>{fmtNum(saisieDepuisKg(s.weight, unite))}</Ink>
                  <Ink size={20} weight={pending ? 'bold' : 'black'} color={pending ? c.textMuted : c.ink} style={{ flex: 1, textAlign: 'center' }}>{s.reps}</Ink>
                  <View style={{ width: 48, alignItems: 'center' }}>
                    {s.done ? (
                      s.record ? (
                        <Hanko size={30} animate={freshRecord === s.id} />
                      ) : (
                        <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="check" size={16} color={c.background} strokeWidth={3} />
                        </View>
                      )
                    ) : null}
                  </View>
                </Pressable>
              );
            })}

            <AideBarre
              nom={current.name}
              chargeKg={(current.sets.find((x) => !x.done) ?? current.sets[current.sets.length - 1])?.weight}
              debut={!current.sets.some((x) => x.done)}
              unite={unite}
            />

            <Pressable onPress={() => addSet(current)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 46, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#B9B6AE', alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : 'transparent' })}>
              <Ink size={14} weight="bold" color={c.textSecondary}>{traduire("Ajouter une série")}</Ink>
            </Pressable>

            {currentDone ? (
              <View style={{ marginTop: 6, padding: 16, borderRadius: 22, backgroundColor: c.successTint, gap: 10 }}>
                <Ink size={17} weight="black" color={c.successText}>{traduire("Exercice bouclé.")}</Ink>
                {nextEx ? (
                  <Pressable onPress={() => update((d) => ({ ...d, currentId: nextEx.id }))} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 50, borderRadius: 16, backgroundColor: pressed ? c.textSecondary : c.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 })}>
                    <Ink size={15} weight="extraBold" color={c.background} numberOfLines={1}>{traduire("Suivant : {0}", nextEx.name)}</Ink>
                    <Icon name="chevron" size={18} color={c.background} />
                  </Pressable>
                ) : (
                  <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 50, borderRadius: 16, backgroundColor: pressed ? c.textSecondary : c.ink, alignItems: 'center', justifyContent: 'center' })}>
                    <Ink size={15} weight="extraBold" color={c.background}>{traduire("Ajouter un exercice")}</Ink>
                  </Pressable>
                )}
              </View>
            ) : null}

            {/* La suite de la seance */}
            {draft.exercises.length > 1 ? (
              <View style={{ marginTop: 14, gap: 8 }}>
                <Ink size={13} weight="bold" color={c.textMuted} style={{ paddingHorizontal: 4 }}>{traduire("Ta séance")}</Ink>
                {draft.exercises.map((e, i) => {
                  if (e.id === current.id) return null;
                  const doneCount = e.sets.filter((s) => s.done).length;
                  const all = doneCount === e.sets.length && e.sets.length > 0;
                  return (
                    <Pressable key={e.id} onPress={() => update((d) => ({ ...d, currentId: e.id }))} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, gap: 12, borderRadius: 18, backgroundColor: pressed ? c.fillSubtle : blancA(0.7), borderWidth: 1, borderColor: c.border, opacity: all ? 0.6 : 1 })}>
                      <ExoDemo nom={e.name} taille={52} arrondi={12} />
                      <Ink size={13} weight="extraBold" color={c.textMuted} style={{ width: 18 }}>{i + 1}</Ink>
                      <Ink size={15} weight="bold" color={all ? c.textMuted : c.ink} style={{ flex: 1 }} numberOfLines={1}>{traduire(e.name)}</Ink>
                      <Ink size={13} weight="bold" color={all ? c.successText : c.textMuted}>{all ? 'fait' : doneCount > 0 ? traduire("{0} sur {1}", doneCount, e.sets.length) : traduire("{0} séries", e.sets.length)}</Ink>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {/* un seul bouton Ajouter un exercice a la fois : celui de la carte Exercice boucle quand il n'y a pas de suite */}
            {currentDone && !nextEx ? null : <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button" style={({ pressed }) => ({ marginTop: 8, minHeight: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, backgroundColor: pressed ? c.fillSubtle : blancA(0.7), borderWidth: 1, borderColor: c.border })}>
              <Icon name="plus" size={20} />
              <Ink size={15} weight="bold" style={{ flex: 1 }}>{traduire("Ajouter un exercice")}</Ink>
            </Pressable>}
          </>
        )}

        {/* Reglages de la seance */}
        <View style={{ marginTop: 10, padding: 14, borderRadius: 20, backgroundColor: blancA(0.7), borderWidth: 1, borderColor: c.border, gap: 12 }}>
          {!draft.form ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="clock" size={20} color={c.textSecondary} />
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
              : activeIndex >= 0
                ? { quoi: 'valider', serie: activeIndex + 1, total: current.sets.length, detail: setLabel(current.sets[activeIndex], unite), possible: current.sets[activeIndex].reps > 0 }
                : nextEx
                  ? { quoi: 'suivant', nom: traduire(nomFr(nextEx.name)) }
                  : { quoi: 'terminer' }
          }
          aSuivre={activeIndex >= 0 && nextEx ? traduire(nomFr(nextEx.name)) : null}
          onValider={() => current && activeIndex >= 0 && validate(current, activeIndex)}
          onSuivant={() => nextEx && update((d) => ({ ...d, currentId: nextEx.id }))}
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
          onFinish={() => setTimeout(() => update((d) => ({ ...d, restEndsAt: null })), 1500)}
        />
      ) : null}

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        history={hist.map}
        recent={hist.recent}
        already={draft.exercises.map((e) => e.name)}
      />

      {/* Options d'un exercice */}
      <Sheet visible={!!menuEx} onClose={() => setMenuFor(null)} title={traduire(menuEx?.name)}>
        {menuEx ? (
          <View style={{ gap: 8 }}>
            <MenuRow icon="up" label={traduire("Monter dans la séance")} onPress={() => moveExercise(menuEx.id, -1)} disabled={draft.exercises[0]?.id === menuEx.id} />
            <MenuRow icon="down" label={traduire("Descendre dans la séance")} onPress={() => moveExercise(menuEx.id, 1)} disabled={draft.exercises[draft.exercises.length - 1]?.id === menuEx.id} />
            <MenuRow icon="pencil" label={menuEx.notes ? traduire('Modifier la note') : traduire('Ajouter une note')} onPress={() => { setMenuFor(null); setNoteFor(menuEx.id); }} />
            <MenuRow icon="trash" label={traduire("Supprimer l’exercice")} danger onPress={() => removeExercise(menuEx.id)} />
          </View>
        ) : null}
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
            <Pressable onPress={() => setNoteFor(null)} style={({ pressed }) => ({ minHeight: 52, borderRadius: 16, backgroundColor: pressed ? c.textSecondary : c.ink, alignItems: 'center', justifyContent: 'center' })}>
              <Ink size={16} weight="extraBold" color={c.background}>{traduire("Valider")}</Ink>
            </Pressable>
          </View>
        ) : null}
      </Sheet>

      {/* Fin de seance */}
      <Sheet visible={finishOpen} onClose={() => setFinishOpen(false)} title={draft.editId ? traduire('Enregistrer les changements ?') : draft.form ? traduire('Enregistrer la séance ?') : traduire('Terminer la séance ?')} scroll>
        <SportRibbon sport={draft.sport} femme={femme} sub={draft.label && draft.label !== getSportName(draft.sport) ? traduire(draft.label) : undefined} />
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
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {summary.pendingValid > 0 ? (
                <Pressable onPress={validateAll} accessibilityRole="button" accessibilityLabel={summary.pendingValid === 1 ? traduire('Valider la série restante') : traduire("Valider les {0} séries restantes", summary.pendingValid)} style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.accentPressed : c.accent })}>
                  <Ink size={14} weight="extraBold" color={c.onAccent}>{traduire("Tout valider")}</Ink>
                </Pressable>
              ) : null}
              <Pressable onPress={showPending} accessibilityRole="button" accessibilityLabel={traduire("Voir les séries à valider")} style={({ pressed }) => ({ flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : blancA(0.75), borderWidth: 1, borderColor: c.border })}>
                <Ink size={14} weight="extraBold">{traduire("Voir")}</Ink>
              </Pressable>
            </View>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat label={traduire("durée")} value={fmtMinutes(draft.form && draft.details ? draft.details.duration : elapsedSec / 60)} />
          <Stat label={traduire("séries")} value={String(summary.sets)} />
          {/* pas de « 0 kg soulevés » : le tonnage n'apparait que s'il y en a un (poids du corps exclu) */}
          {summary.tonnage > 0 ? <Stat label={accordSouleve(summary.tonnage, unite)} value={formatTonnage(summary.tonnage, unite)} /> : null}
        </View>
        {summary.records > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: c.accentTint }}>
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
                <Pressable key={m.id} onPress={() => toggleMuscle(m.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 12, justifyContent: 'center', backgroundColor: on ? c.indigo : blancA(0.75), borderWidth: on ? 0 : 1, borderColor: c.border }}>
                  <Ink size={13} weight="bold" color={on ? '#FFFFFF' : c.ink}>{traduire(m.name)}</Ink>
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
        <Pressable onPress={save} disabled={saving || (summary.sets === 0 && !draft.form)} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: summary.sets === 0 && !draft.form ? c.border : pressed ? c.accentPressed : c.accent, opacity: saving ? 0.6 : 1 })}>
          <Ink size={16} weight="extraBold" color={c.onAccent}>{saving ? 'Enregistrement...' : draft.editId ? traduire('Enregistrer les changements') : traduire('Enregistrer la séance')}</Ink>
        </Pressable>
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
      ? { label: traduire('Valider la série {0} sur {1}', etape.serie, etape.total), sous: etape.detail, icon: 'check' as const, onPress: onValider, fond: c.accent, texte: c.onAccent, actif: etape.possible }
      : etape.quoi === 'suivant'
        ? { label: traduire('Exercice suivant'), sous: etape.nom, icon: 'chevron' as const, onPress: onSuivant, fond: c.ink, texte: c.background, actif: true }
        : etape.quoi === 'terminer'
          ? { label: traduire('Terminer la séance'), sous: traduire('Tout est fait, bravo'), icon: 'check' as const, onPress: onTerminer, fond: c.accent, texte: c.onAccent, actif: true }
          : { label: traduire('Ajouter un exercice'), sous: '', icon: 'plus' as const, onPress: onAjouter, fond: c.accent, texte: c.onAccent, actif: true };
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, paddingBottom: bottom + 10, backgroundColor: c.background, borderTopWidth: 1, borderColor: c.border, gap: 8 }}>
      {aSuivre ? (
        <Pressable onPress={onSuivant} accessibilityRole="button" accessibilityLabel={traduire('Passer à {0}', aSuivre)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
          <Ink size={12} weight="bold" color={c.textMuted}>{traduire('À suivre')}</Ink>
          <Ink size={13} weight="extraBold" color={c.ink} numberOfLines={1} style={{ flex: 1 }}>{aSuivre}</Ink>
          <Ink size={12} weight="extraBold" color={c.accent}>{traduire('Passer')}</Ink>
          <Icon name="chevron" size={14} color={c.accent} />
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => {
          if (!principal.actif) return;
          impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
          principal.onPress();
        }}
        disabled={!principal.actif}
        accessibilityRole="button"
        accessibilityLabel={principal.sous ? `${principal.label}, ${principal.sous}` : principal.label}
        style={({ pressed }) => ({ minHeight: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, backgroundColor: !principal.actif ? c.border : pressed ? c.accentPressed : principal.fond, shadowColor: principal.fond, shadowOpacity: principal.actif ? 0.28 : 0, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: principal.actif ? 4 : 0 })}
      >
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={principal.icon} size={22} color={principal.texte} strokeWidth={3} />
        </View>
        <View style={{ flex: 1 }}>
          <Ink size={17} weight="black" color={principal.texte} numberOfLines={1}>{principal.label}</Ink>
          {principal.sous ? <Ink size={13} weight="bold" color={principal.texte} style={{ opacity: 0.8 }} numberOfLines={1}>{principal.sous}</Ink> : null}
        </View>
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
      <Ink size={22} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Ink>
      <Ink size={12} color={c.textMuted}>{label}</Ink>
    </View>
  );
}

function MenuRow({ icon, label, onPress, danger, disabled }: { icon: 'up' | 'down' | 'pencil' | 'trash'; label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const color = disabled ? c.textMuted : danger ? c.danger : c.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border, opacity: disabled ? 0.5 : 1 })}>
      <Icon name={icon} size={20} color={color} />
      <Ink size={15} weight="bold" color={color}>{label}</Ink>
    </Pressable>
  );
}

function EmptyStart({ image, recent, onPick, onLibrary }: { image: ReturnType<typeof sportImage>; recent: ExerciseHistory[]; onPick: (h: ExerciseHistory) => void; onLibrary: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ gap: 14, marginTop: 10 }}>
      <View style={{ height: 230, borderRadius: 28, backgroundColor: c.indigoTint, overflow: 'hidden', padding: 20 }}>
        {image ? <Image source={image} style={{ position: 'absolute', right: -20, bottom: -40, width: 200, height: 266 }} resizeMode="contain" /> : null}
        <View style={{ maxWidth: '62%', gap: 6 }}>
          <Ink size={26} weight="black" tight>{traduire("Premier exercice ?")}</Ink>
          <Ink size={14} color={c.textSecondary}>{traduire("Choisis-le, tes séries arrivent pré-remplies avec ta dernière fois.")}</Ink>
        </View>
        <Pressable onPress={onLibrary} accessibilityRole="button" style={({ pressed }) => ({ position: 'absolute', left: 20, bottom: 20, minHeight: 48, paddingHorizontal: 18, borderRadius: 16, justifyContent: 'center', backgroundColor: pressed ? c.accentPressed : c.accent })}>
          <Ink size={15} weight="extraBold" color={c.onAccent}>{traduire("Choisir un exercice")}</Ink>
        </Pressable>
      </View>
      {recent.length > 0 ? (
        <View style={{ gap: 8 }}>
          <Ink size={14} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Tes exercices récents")}</Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {recent.map((h) => (
              <Pressable key={h.name} onPress={() => onPick(h)} accessibilityRole="button" accessibilityLabel={traduire("Ajouter {0}", h.name)} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : blancA(0.75), borderWidth: 1, borderColor: c.border })}>
                <Ink size={14} weight="bold">{traduire(h.name)}</Ink>
                <Ink size={11} color={c.textMuted}>{niceGroup(h.muscle)}</Ink>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
