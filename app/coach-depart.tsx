/**
 * Le départ avec ton coach (26 octobre 2026). Houari : « Quand je clique sur Coach, il y a un onboarding du coach
 * pour poser les questions : qu'est-ce que je veux, quand je suis disponible. S'il choisit plus tard, il peut le
 * faire dans Coach. Et il faut pouvoir changer de programme quand on veut. »
 * Une question par écran, de grandes cartes, « Plus tard » toujours en haut à droite :
 *  1. Qu'est-ce que tu veux ? (plusieurs objectifs, « Je n'y connais rien », « Je sais déjà quel programme je veux ») ;
 *  2. Depuis quand tu fais de la muscu ? (sauté pour « Je n'y connais rien ») ;
 *  3. Quand es-tu disponible ? (tes vrais jours, 0 = lundi ; aucun : YOROI choisit) ;
 *  4. Combien de temps par séance ? ;  5. Tu pratiques aussi un sport ? ;  6. Où tu t'entraînes ? ;
 *  7. Ton programme : le programme de base, pourquoi, ses modules, tes jours, « C'est parti ».
 * Le calcul est dans lib/v2/programmes/depart.ts (conseilDepart, sur conseillerProgramme de choix.ts).
 * Chemin liste : le programme dans la liste par type (modules.ts, GROUPES_PROGRAMMES), puis le même résultat.
 * Pas de question sur les douleurs : l'infirmerie demande la zone, le côté et l'intensité (lib/infirmaryService.ts),
 * une réponse rapide ici ne pourrait pas l'écrire proprement. Tes douleurs déclarées s'appliquent déjà au programme.
 * Paramètres : depuis=onboarding (fin de l'onboarding : un premier écran « Ton coach te prépare ton programme ? »),
 * chemin=liste (ouvre directement la liste), depuis=visite (la carte de l'accueil après la visite guidée : comme
 * l'onboarding pour les étapes connues, mais la sortie revient en arrière).
 * « Plus tard » note yoroi_coach_depart_v1 = 'plus_tard' (sauf si le départ a déjà été fait), « C'est parti » note 'fait'.
 * 26 octobre 2026 (revue de l'onboarding, Houari : « ne pose pas deux fois la même question ») : tes réponses de
 * l'onboarding (objectifs, jours, sports, lib/v2/programmes/profilCoach.ts) préremplissent le départ. Juste après
 * l'onboarding, les jours et le sport déjà connus sont sautés, et le premier écran rappelle ce que tu as déjà dit.
 * 26 octobre 2026 (retours de Houari sur le résultat) :
 *  - plusieurs objectifs : 2 ou 3 programmes « Pour toi » (propositionsDepart, depart.ts), chacun dit quels objectifs
 *    il couvre, par lui même ou par un module ; tu choisis, ou tu ouvres la liste complète ;
 *  - « Les conseils du coach » : une carte par objectif (pourquoi.ts), avec son module à ajouter « si tu veux » ;
 *  - « Pourquoi ? » sur chaque module et chaque conseil : la science en mots simples et les études (Pourquoi.tsx) ;
 *  - « C'est parti » enregistre le programme et ramène au coach : aucune séance ne se lance ici.
 * 27 octobre 2026 (Houari : « D'abord une page qui demande combien de jours tu veux t'entraîner, et selon ça tu
 * proposes ») : avant « Choisis ton programme », trois écrans au plus, préréglés avec ce qu'on sait déjà
 * (lib/v2/programmes/preselection.ts) : combien de jours par semaine, puis ton temps, ton niveau ou ton lieu s'ils
 * manquent ; tout est connu : « Ton profil » seul. La liste montre d'abord les programmes à ton nombre de jours,
 * classés par niveau, lieu et durée ; la puce « N jours » en haut ramène au choix des jours.
 * 27 octobre 2026, refonte (maquettes Coach-Objectif, Jours, Choix, Programme, « aperçus vivants ») : cartes pastel
 * (usePastel, Habillage.tsx), barre d'étapes fine avec « Étape N sur M », plus aucune grande carte indigo, boutons
 * pastel au texte bleu nuit. Style seulement : étapes, calculs et navigation inchangés.
 * Ancien rendu : _archive_ancien_design_2026-10-09/coach_2026-10-27/.
 * 27 octobre 2026, le Guide (maquettes Coach2-A, B et C-Guide, « Aide moi à choisir ») : sept questions, une par
 * écran, « Question N sur 7 », une bulle du coach, et l'encart « Ton programme pour l'instant » qui suit chaque réponse :
 *  1. Tu t'es déjà entraîné ? (remplace « Depuis quand tu fais de la muscu ? »)  2. Ton objectif  3. Tes jours
 *  4. Ton temps  5. Où tu t'entraînes, puis « Coche ce que tu as » (le matériel de Ma salle)
 *  6. Tu as mal quelque part en ce moment ? (pour ce programme seulement, rien n'est écrit dans l'infirmerie)
 *  7. Tu pratiques aussi un sport ?  Puis le résultat, avec « Une question ? » en bas.
 * La traduction des réponses pour les règles de choix.ts est dans lib/v2/programmes/guide.ts. Ancien rendu :
 * _archive_ancien_design_2026-10-09/coach_2026-10-27/avant_entree_coach2/.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { Capitales, ombrePastel, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInRight, LinearTransition } from 'react-native-reanimated';
import { GrilleModules } from '@/components/yoroi/v2/programmes/GrilleModules';
import { CarteConseilObjectif, FeuillePourquoi } from '@/components/yoroi/v2/programmes/Pourquoi';
import { POURQUOI_MODULE, conseilsDesObjectifs } from '@/lib/v2/programmes/pourquoi';
import type { Explication } from '@/lib/v2/programmes/pourquoi';
import { BarresNiveau, CarteChoix, CarteProgramme, HerosProgramme, ICONE_OBJECTIF, STICKER_OBJECTIF, ICONE_SPORT, MiniProgres, MiniSemaine, PuceConseil, PucesProgramme, RangeeJours, TuileChoix, TuilesJours, TuilesTemps, TypesProgrammes } from '@/components/yoroi/v2/programmes/ChoixVisuels';
import { FeuillePoidsDeDepart } from '@/components/yoroi/v2/programmes/PoidsDeDepart';
import { getProfile } from '@/lib/database';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
import { libelleNiveau, programmeParId, sportDuProgramme } from '@/lib/v2/programmes/catalogue';
import { etapesPreselection, joursLePlusProche, joursProposes, lieuDuMateriel, meilleureFamille, nombreDeProgrammes, trierFamille } from '@/lib/v2/programmes/preselection';
import type { EtapePre, Envies, QuestionPre } from '@/lib/v2/programmes/preselection';
import { DEBUTANT, OBJECTIFS_CHOIX } from '@/lib/v2/programmes/choix';
import type { ObjectifChoix } from '@/lib/v2/programmes/choix';
import { AUTRES_SPORTS, TEMPS_SEANCE, conseilDepart, ecrireDepart, lireDepart, objectifsAvecSport, propositionsDepart } from '@/lib/v2/programmes/depart';
import { etapesConnues, lireProfilCoach } from '@/lib/v2/programmes/profilCoach';
import type { ProfilCoach } from '@/lib/v2/programmes/profilCoach';
import { joursTexte } from '@/components/yoroi/v2/espace/JoursPicker';
import type { AutreSport, Proposition, TempsSeance } from '@/lib/v2/programmes/depart';
import { aDesJoursMarche, MINUTES_FIN } from '@/lib/v2/programmes/finSeance';
import { GROUPES_PROGRAMMES, moduleParId, modulesPossibles, moduleUtile, normaliserModules } from '@/lib/v2/programmes/modules';
import type { ModuleId } from '@/lib/v2/programmes/modules';
import { chargerMateriel, chargerProgrammeActif, demarrerProgramme, enregistrerMateriel, joursConseilles, materielDuLieu } from '@/lib/v2/programmes/suivi';
import { joursDuPlan, planParDefaut, planValide } from '@/lib/v2/programmes/planJours';
import { TesJours, semaineAffichee } from '@/components/yoroi/v2/programmes/TesJours';
import { ChoixDuree } from '@/components/yoroi/v2/programmes/GarderProgramme';
import { DUREES, joursDeLaLigne } from '@/lib/v2/programmes/semaineLibre';
import type { SemaineLibre } from '@/lib/v2/programmes/semaineLibre';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { Materiel, Niveau, Programme } from '@/lib/v2/programmes/types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { CarteMuscles } from '@/components/yoroi/v2/programmes/CarteMuscles';
import { QuestionsCoach } from '@/components/yoroi/v2/programmes/QuestionsCoach';
import { LectureRonde } from '@/components/yoroi/v2/programmes/Lecture';
import { DOULEURS_AUTRES, DOULEURS_PRINCIPALES, EXPERIENCES, basculerDouleur, niveauDuGuide, regionsDuGuide, reponsesDuGuide } from '@/lib/v2/programmes/guide';
import type { Douleur, Experience } from '@/lib/v2/programmes/guide';
import { EQUIPEMENTS } from '@/lib/v2/programmes/materiel';
import type { Equipement } from '@/lib/v2/programmes/materiel';
import { LIBELLE_REGION } from '@/lib/v2/programmes/blessures';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

type Etape = 'attente' | 'intro' | 'experience' | 'objectifs' | 'jours' | 'temps' | 'lieu' | 'douleur' | 'sport' | 'liste' | 'resultat'
  // 27 octobre 2026 : avant la liste (preselection.ts)
  | 'pjours' | 'ptemps' | 'pniveau' | 'plieu' | 'profil';

const ETAPE_PRE: Record<EtapePre, Etape> = { jours: 'pjours', temps: 'ptemps', niveau: 'pniveau', lieu: 'plieu', profil: 'profil' };
const QUIZ: Etape[] = ['intro', 'experience', 'objectifs', 'jours', 'temps', 'lieu', 'douleur', 'sport'];

const NIVEAUX: { key: Niveau; label: string }[] = [
  { key: 'debutant', label: 'Moins de 6 mois' },
  { key: 'intermediaire', label: '6 mois à 2 ans' },
  { key: 'confirme', label: 'Plus de 2 ans' },
];
const LIEUX: { key: Materiel; label: string; icone: IconName; sous: string; sticker: NomSticker }[] = [
  { key: 'salle', label: 'En salle', icone: 'dumbbell', sous: 'Machines, barres, poulies', sticker: 'musculation' },
  { key: 'halteres', label: 'À la maison, avec des haltères', icone: 'dumbbell', sous: 'Une paire, un banc ou une chaise', sticker: 'poids' },
  { key: 'maison', label: 'À la maison, sans matériel', icone: 'body', sous: 'Au poids du corps', sticker: 'tapis' },
];

/** 27 octobre 2026 : le sticker de chaque réponse à « Tu t'es déjà entraîné ? » */
const STICKER_EXPERIENCE: Record<Experience, NomSticker> = { jamais: 'debuter', longtemps: 'sablier', videos: 'videos', regulier: 'force_eclair' };
const ICONE_EXPERIENCE: Record<Experience, IconName> = { jamais: 'book', longtemps: 'clock', videos: 'play', regulier: 'bolt' };

/** La bulle du coach, une par question (maquettes Coach2-Guide) */
const BULLE: Partial<Record<Etape, string>> = {
  experience: 'Pour t’apprendre les gestes avant de charger.',
  objectifs: 'Tu peux en choisir plusieurs.',
  jours: 'Je place tes séances sur ta semaine.',
  temps: 'Ta séance rentre dans ton temps.',
  lieu: 'Que des exercices que tu peux faire.',
  douleur: 'Encore une question après celle là.',
  sport: 'Dernière question.',
};

export default function CoachDepart() {
  // 27 octobre 2026 : les couleurs pastel des maquettes Coach (Habillage.tsx, usePastel)
  const pa = usePastel();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ depuis?: string; chemin?: string }>();
  const depuisOnboarding = params.depuis === 'onboarding';
  // depuis=visite : la carte de l'accueil après la visite guidée. Comme l'onboarding (étapes déjà connues sautées,
  // réponses reprises), mais on revient en arrière en sortant
  const depuisVisite = params.depuis === 'visite';
  const commeOnboarding = depuisOnboarding || depuisVisite;

  // chemin=liste : on attend ce qu'on sait déjà (profil, programme, matériel) pour préparer les écrans avant la liste
  const [etape, setEtape] = useState<Etape>(commeOnboarding ? 'intro' : params.chemin === 'liste' ? 'attente' : 'experience');
  const [historique, setHistorique] = useState<Etape[]>([]);
  const [chemin, setChemin] = useState<'quiz' | 'liste'>(params.chemin === 'liste' ? 'liste' : 'quiz');
  const [objectifs, setObjectifs] = useState<ObjectifChoix[]>([]);
  const [niveau, setNiveau] = useState<Niveau | undefined>(undefined);
  const [jours, setJours] = useState<number[]>([]);
  const [temps, setTemps] = useState<TempsSeance>(60);
  const [sport, setSport] = useState<AutreSport>('non');
  const [lieu, setLieu] = useState<Materiel>('salle');
  const [groupe, setGroupe] = useState(GROUPES_PROGRAMMES[0].id);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleId[]>([]);
  const [joursRes, setJoursRes] = useState<number[]>([]);
  // 27 octobre 2026 : le jour de chaque séance, changé à la main pour ce programme (Tes jours) ; sinon tes jours dans l'ordre
  const [planPerso, setPlanPerso] = useState<{ id: string; plan: number[] } | null>(null);
  // 28 octobre 2026 : ta semaine libre pour ce programme (séances d'autres programmes, A et B), et ta durée
  const [semainePerso, setSemainePerso] = useState<{ id: string; semaine: SemaineLibre } | null>(null);
  const [dureeRes, setDureeRes] = useState<number | undefined>(undefined);
  const [minutes, setMinutes] = useState<number>(30);
  const [sansMarche, setSansMarche] = useState(false);
  const [guide, setGuide] = useState(false);
  const [femme, setFemme] = useState(false);
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  // ce que l'onboarding sait déjà (objectifs, jours, sport), repris ici sans reposer la question
  const [profil, setProfil] = useState<ProfilCoach | null>(null);
  // « Pourquoi ? » d'un module ou d'un conseil
  const [pourquoi, setPourquoi] = useState<Explication | null>(null);
  // avant la liste (27 octobre 2026) : les écrans montrés, les réponses données ici ou dans le questionnaire,
  // le nombre de jours voulu, l'écran où revenir après « Modifier », les autres programmes dépliés
  const [preSuite, setPreSuite] = useState<Etape[]>([]);
  const [repondu, setRepondu] = useState<QuestionPre[]>([]);
  const [nJours, setNJours] = useState<number | undefined>(undefined);
  const [retourVers, setRetourVers] = useState<Etape | null>(null);
  const [voirAutres, setVoirAutres] = useState(false);
  const [lieuSauve, setLieuSauve] = useState<Materiel | undefined>(undefined);
  const [charge, setCharge] = useState(false);
  // 27 octobre 2026, le Guide : ton expérience, tes douleurs, ton matériel coché (null : pas touché)
  const [experience, setExperience] = useState<Experience | null>(null);
  const [douleurs, setDouleurs] = useState<Douleur[]>([]);
  const [autreZone, setAutreZone] = useState(false);
  const [equip, setEquip] = useState<Equipement[] | null>(null);
  const [equipSauve, setEquipSauve] = useState<Equipement[] | null>(null);
  const illus = useIllustrations();

  useEffect(() => {
    getProfile().then((pr) => setFemme(pr?.avatar_gender === 'femme')).catch(() => {});
    const a = chargerProgrammeActif().then((x) => { setActif(x); return x; }).catch(() => { setActif(null); return null; });
    const m = chargerMateriel().then((x) => { setLieuSauve(lieuDuMateriel(x)); setEquipSauve(x); }).catch(() => {});
    const pc = lireProfilCoach().then((p) => {
      setProfil(p);
      if (p.objectifs.length) setObjectifs((l) => (l.length ? l : p.objectifs));
      // « Je n'y connais rien » à l'onboarding : « Jamais » est déjà coché au Guide
      if (p.objectifs.includes('debuter')) setExperience((e) => e ?? 'jamais');
      if (p.jours.length) setJours((l) => (l.length ? l : p.jours));
      if (p.sport) setSport(p.sport);
    });
    void Promise.all([a, m, pc]).finally(() => setCharge(true));
  }, []);
  const connues = profil && commeOnboarding ? etapesConnues(profil) : { jours: false, sport: false };
  const prerempli = !!profil?.objectifs.length;

  // 27 octobre 2026 : le Guide demande ton expérience (guide.ts) ; sans réponse (chemin liste), comme avant
  const debuter = experience ? niveauDuGuide(experience).debuter : objectifs.includes('debuter');
  const reponses = useMemo(
    () => (experience ? reponsesDuGuide({ experience, objectifs, jours, temps, sport, lieu }) : { objectifs, niveau: debuter ? undefined : niveau, jours, temps, sport, lieu }),
    [experience, objectifs, niveau, debuter, jours, temps, sport, lieu],
  );
  // aussi sans objectif : l'encart « Ton programme pour l'instant » suit chaque réponse
  const conseil = useMemo(() => (reponses.objectifs.length || experience ? conseilDepart(reponses) : null), [reponses, experience]);
  // plusieurs objectifs : 2 ou 3 programmes « Pour toi »
  const propositions = useMemo(() => (conseil ? propositionsDepart(reponses, conseil) : []), [conseil, reponses]);
  // les conseils du coach, un par objectif (ton sport compris)
  const conseils = useMemo(() => conseilsDesObjectifs(objectifsAvecSport(reponses.objectifs, sport)), [reponses, sport]);
  const regionsGuide = regionsDuGuide(douleurs);
  const prog = choisi ? programmeParId(choisi) ?? null : null;
  const possibles = prog ? modulesPossibles(prog) : [];
  // Tes jours du résultat : ton plan pour ce programme, sinon tes jours (ou les jours conseillés) dans l'ordre
  const finRes = sansMarche ? { choix: 'rien' as const, minutes, sansMarche: true } : null;
  const planRes = prog ? (planPerso?.id === prog.id ? planValide(prog, planPerso.plan, finRes) : null) ?? planParDefaut(prog, joursRes, joursConseilles, finRes) : null;
  const semaineRes = prog && semainePerso?.id === prog.id ? semainePerso.semaine : null;
  const joursSemaine = prog && semaineRes ? joursDeLaLigne(semaineRes, prog, 'a') : [];
  const joursEff = joursSemaine.length ? joursSemaine : planRes ? joursDuPlan(planRes) : joursRes;
  const img = sportImage(prog ? sportDuProgramme(prog) : 'musculation', femme, 1);

  // les étapes du questionnaire, pour la barre de progression
  // juste après l'onboarding, les jours et le sport déjà donnés ne sont pas redemandés
  const suiteQuiz: Etape[] = (['experience', 'objectifs', 'jours', 'temps', 'lieu', 'douleur', 'sport', 'resultat'] as Etape[]).filter(
    (e) => !(e === 'jours' && connues.jours) && !(e === 'sport' && connues.sport),
  );
  const suiteListe: Etape[] = [...preSuite, 'liste', 'resultat'];
  const suiteVue = chemin === 'liste' ? suiteListe : suiteQuiz;
  const rang = Math.max(0, suiteVue.indexOf(etape));

  const aller = (e: Etape) => {
    setHistorique((h) => [...h, etape]);
    setEtape(e);
  };
  const suivante = (apres: Etape) => {
    const i = suiteQuiz.indexOf(apres);
    const e = suiteQuiz[i + 1];
    if (e === 'resultat') ouvrirResultat('quiz');
    else if (e) aller(e);
  };

  /* ---------------- avant la liste (27 octobre 2026) : ce qu'on sait déjà, puis les écrans qui manquent ---------------- */
  const proposes = useMemo(() => joursProposes(), []);
  const marquer = (q: QuestionPre) => setRepondu((l) => (l.includes(q) ? l : [...l, q]));
  const niveauSu = debuter ? 'debutant' : niveau;
  /** Le nombre de jours déjà connu, ramené aux nombres du catalogue */
  const joursSus = (): number | undefined => {
    if (nJours !== undefined) return nJours;
    const n = jours.length ? jours.length : actif ? (actif.jours?.length || programmeParId(actif.id)?.joursParSemaine || 0) : 0;
    return n ? joursLePlusProche(n, proposes) : undefined;
  };
  const connus = (): Record<QuestionPre, boolean> => ({
    // tes jours de l'onboarding ou du questionnaire, ceux de ton programme, ou un nombre déjà choisi ici
    jours: joursSus() !== undefined,
    temps: repondu.includes('temps'),
    niveau: niveauSu !== undefined,
    lieu: repondu.includes('lieu') || lieuSauve !== undefined,
  });
  const envies = (): Envies | null => {
    if (nJours === undefined) return null;
    const k = connus();
    return {
      jours: nJours,
      niveau: k.niveau ? niveauSu : undefined,
      temps: k.temps ? temps : undefined,
      lieu: repondu.includes('lieu') ? lieu : lieuSauve,
    };
  };
  /** « Je sais déjà quel programme je veux », « Voir tous les programmes », chemin=liste */
  const ouvrirListe = (remplacer = false) => {
    const k = connus();
    const suite = etapesPreselection(k).map((e) => ETAPE_PRE[e]);
    setNJours(joursSus());
    // ton niveau, préréglé avec celui de ton programme en cours (la question reste posée)
    if (!k.niveau && actif) setNiveau(programmeParId(actif.id)?.niveau);
    if (!repondu.includes('lieu') && lieuSauve) setLieu(lieuSauve);
    setPreSuite(suite);
    setChemin('liste');
    setRetourVers(null);
    if (remplacer) setEtape(suite[0]);
    else aller(suite[0]);
  };
  useEffect(() => {
    if (charge && etape === 'attente') ouvrirListe(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charge]);
  /** Après un écran avant la liste : le suivant, la liste, ou l'écran d'où « Modifier » est parti */
  const [familleAuto, setFamilleAuto] = useState(false);
  // en arrivant sur la liste : la famille du programme le mieux classé pour toi (après le rendu, réponses à jour)
  useEffect(() => {
    if (etape !== 'liste' || !familleAuto) return;
    setFamilleAuto(false);
    const env = envies();
    if (env) setGroupe(meilleureFamille(env));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape, familleAuto]);
  const preSuivante = (depuis: Etape) => {
    if (retourVers) {
      const vers = retourVers;
      setRetourVers(null);
      setHistorique((h) => h.slice(0, -1));
      setVoirAutres(false);
      setEtape(vers);
      return;
    }
    const i = preSuite.indexOf(depuis);
    const e = preSuite[i + 1];
    if (e) {
      aller(e);
      return;
    }
    setFamilleAuto(true);
    setVoirAutres(false);
    aller('liste');
  };
  /** « Modifier » du profil ou la puce des jours de la liste : un écran, puis retour */
  const modifier = (e: Etape) => {
    tap();
    setRetourVers(etape);
    aller(e);
  };

  /** Le résultat : le programme du questionnaire ou celui de la liste, ses modules cochés, tes jours */
  const ouvrirResultat = (via: 'quiz' | 'liste', id?: string) => {
    const pid = via === 'quiz' ? conseil?.id : id;
    const p = pid ? programmeParId(pid) : null;
    if (!p) return;
    setChemin(via);
    setChoisi(p.id);
    setSansMarche(false);
    setMinutes(30);
    setModules(via === 'quiz' && conseil ? normaliserModules(conseil.modules) : []);
    // la liste : tes jours s'ils vont avec le nombre choisi, sinon les jours conseillés du programme
    const n = nJours ?? jours.length;
    setJoursRes(via === 'quiz' && conseil ? conseil.jours : jours.length && jours.length === n ? jours : joursConseilles(p.joursParSemaine));
    aller('resultat');
  };

  /** « Pour toi » : ce programme devient le résultat, avec ses modules et tes jours */
  const choisirProposition = (x: Proposition) => {
    if (x.id === choisi) return;
    tap();
    setChoisi(x.id);
    setModules(normaliserModules(x.modules));
    setJoursRes(x.jours);
  };

  /** « Te va aussi » : ce programme devient le résultat, avec les modules du conseil qui lui servent */
  const prendreAutre = (id: string) => {
    const p = programmeParId(id);
    if (!p) return;
    tap();
    setChoisi(id);
    setModules((l) => l.filter((m) => moduleUtile(p, m)));
    if (!jours.length) setJoursRes(joursConseilles(p.joursParSemaine));
  };

  const sortir = (vers: 'accueil' | 'coach') => {
    if (depuisVisite) {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)' as any);
    } else if (depuisOnboarding) router.replace(vers === 'coach' ? ('/coach' as any) : ('/(tabs)' as any));
    else if (router.canGoBack()) router.back();
    else router.replace('/coach' as any);
  };
  const plusTard = () => {
    tap();
    void lireDepart().then((e) => (e === 'fait' ? undefined : ecrireDepart('plus_tard'))).finally(() => sortir('accueil'));
  };
  const retour = () => {
    tap();
    const h = [...historique];
    const prec = h.pop();
    if (!prec) {
      plusTard();
      return;
    }
    setHistorique(h);
    if (QUIZ.includes(prec)) setChemin('quiz');
    setRetourVers(null);
    setEtape(prec);
  };

  const basculerObjectif = (k: ObjectifChoix) => {
    tap();
    setObjectifs((l) => (l.includes(k) ? l.filter((o) => o !== k) : [...l, k]));
  };
  const basculerJour = (d: number, liste: number[], fixer: (l: number[]) => void, garderUn: boolean) => {
    tap();
    const suite = liste.includes(d) ? liste.filter((x) => x !== d) : [...liste, d].sort((a, b) => a - b);
    if (garderUn && !suite.length) return;
    fixer(suite);
  };
  const basculerModule = (m: ModuleId) => {
    tap();
    setModules((l) => normaliserModules(l.includes(m) ? l.filter((x) => x !== m) : [...l, m]));
  };

  const garderMateriel = async () => {
    // 27 octobre 2026 : « Coche ce que tu as » au Guide, ton choix est gardé (Ma salle)
    if (chemin === 'quiz' && equip) {
      await enregistrerMateriel(equip);
      return;
    }
    // le questionnaire, ou ton lieu donné avant la liste
    if (chemin !== 'quiz' && !repondu.includes('lieu')) return;
    const m = await chargerMateriel().catch(() => null);
    if (m === null) await enregistrerMateriel(materielDuLieu(lieu));
  };

  const lancer = async () => {
    if (!prog) return;
    const go = async () => {
      await garderMateriel();
      const a = await demarrerProgramme(prog.id, joursEff, { choix: 'rien', minutes, ...(sansMarche ? { sansMarche: true } : {}) }, modules.filter((m) => possibles.some((x) => x.id === m)), planRes, { ...(chemin === 'quiz' ? { douleurs: regionsGuide } : {}), semaine: semaineRes, duree: dureeRes });
      if (!a) return;
      await ecrireDepart('fait');
      sortir('coach');
    };
    if (actif && actif.id !== prog.id) {
      const ancien = programmeParId(actif.id);
      appAlert(traduire('Changer de programme ?'), traduire('Tu suis « {0} ». Tes séances déjà faites restent dans ton historique.', traduire(ancien?.titre ?? '')), [
        { text: traduire('Annuler'), style: 'cancel' },
        { text: traduire('Changer'), onPress: () => void go() },
      ]);
      return;
    }
    await go();
  };

  const voirProgramme = () => {
    if (!prog) return;
    tap();
    void garderMateriel().finally(() => {
      if (depuisOnboarding) router.replace({ pathname: '/programmes/[id]' as any, params: { id: prog.id } });
      else router.push({ pathname: '/programmes/[id]' as any, params: { id: prog.id } });
    });
  };

  /* ------------------------------------------------ rendu ------------------------------------------------ */
  const titreEcran = (titre: string, pourquoi?: string) => (
    <View style={{ gap: 6, marginBottom: 4 }}>
      <Ink size={28} weight="black" color={pa.texte} accessibilityRole="header" style={{ lineHeight: 33 }}>{titre}</Ink>
      {pourquoi ? <Ink size={15} weight="bold" color={pa.texte2}>{pourquoi}</Ink> : null}
    </View>
  );
  const titreSection = (t: string) => <Ink size={16} weight="black" tight color={pa.texte} accessibilityRole="header" style={{ marginHorizontal: 2 }}>{t}</Ink>;

  /* ---------------- le Guide (27 octobre 2026) : l'encart « Ton programme pour l'instant », mis à jour à chaque réponse ---------------- */
  const equipVu: Equipement[] = equip ?? equipSauve ?? materielDuLieu(lieu);
  const questions: Etape[] = suiteQuiz.filter((e) => e !== 'resultat');
  const rangQuestion = questions.indexOf(etape);
  const apercu = (() => {
    if (chemin !== 'quiz' || rangQuestion < 0 || !conseil) return null;
    const pc = programmeParId(conseil.id);
    if (!pc) return null;
    // les réponses déjà données : les questions passées, et celle ci si elle est répondue
    const ici = etape === 'experience' ? !!experience : etape === 'objectifs' ? objectifs.some((o) => o !== 'debuter') : etape === 'douleur' ? douleurs.length > 0 : true;
    const faites = questions.slice(0, rangQuestion + (ici ? 1 : 0));
    const puces: string[] = [];
    for (const q of faites) {
      if (q === 'experience' && experience) puces.push(traduire(EXPERIENCES.find((x) => x.key === experience)?.label ?? ''));
      if (q === 'objectifs') {
        const o = objectifs.filter((x) => x !== 'debuter');
        if (o.length) puces.push(traduire(OBJECTIFS_CHOIX.find((x) => x.key === o[0])?.label ?? '') + (o.length > 1 ? ` +${o.length - 1}` : ''));
      }
      if (q === 'jours' && jours.length) puces.push(traduire('{0} jours', jours.length));
      if (q === 'temps') puces.push(traduire(TEMPS_SEANCE.find((x) => x.key === temps)?.label ?? ''));
      if (q === 'lieu') puces.push(traduire(LIEUX.find((x) => x.key === lieu)?.label ?? ''));
      if (q === 'douleur') puces.push(regionsGuide.length ? traduire('Ménage {0}', regionsGuide.map((r) => traduire(LIBELLE_REGION[r])).join(', ')) : traduire('Aucune douleur'));
      if (q === 'sport' && sport !== 'non') puces.push(traduire(AUTRES_SPORTS.find((x) => x.key === sport)?.label ?? ''));
    }
    const ligne = traduire('{0} j par semaine, {1} min', pc.joursParSemaine, pc.dureeMin);
    return (
      <Animated.View layout={LinearTransition.duration(240)} style={{ marginTop: 4, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, gap: 10, backgroundColor: pa.lilas.fond }} accessible accessibilityLabel={`${traduire('Ton programme pour l’instant')}, ${traduire(pc.titre)}, ${ligne}`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1 }}><Capitales texte={traduire('Ton programme pour l’instant')} couleur={pa.lilas.titre} /></View>
          {faites.length ? <Ink size={12} weight="extraBold" color={pa.lilas.titre}>{traduirePluriel(faites.length, faites.length > 1, '{0} réponse', '{0} réponses', faites.length)}</Ink> : null}
        </View>
        <Animated.View key={`${pc.id}${conseil.jours.join('')}`} entering={FadeIn.duration(320)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 64 }}>
            <MiniSemaine jours={conseil.jours} couleur={pa.lilas.barre} vide={pa.carte} hauteur={34} gap={2} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={16} weight="black" color={pa.texte} numberOfLines={2}>{traduire(pc.titre)}</Ink>
            <Ink size={13} weight="bold" color={pa.texte2} numberOfLines={3}>{ligne}</Ink>
          </View>
        </Animated.View>
        {puces.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {puces.filter(Boolean).map((t) => (
              <View key={t} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: pa.carte, maxWidth: '100%' }}>
                <Ink size={12} weight="extraBold" color={pa.texte} numberOfLines={1}>{t}</Ink>
              </View>
            ))}
          </View>
        ) : null}
      </Animated.View>
    );
  })();
  // la bulle du coach au dessus de chaque question
  const bulle = chemin === 'quiz' && rangQuestion >= 0 && BULLE[etape] ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      {illus.stickers ? (
        <View style={[{ width: 46, height: 46, borderRadius: 23, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center' }, ombrePastel(pa.ombre)]}>
          <Image source={illus.img('coach')} style={{ width: 36, height: 36 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
      ) : null}
      <View style={[{ flexShrink: 1, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, backgroundColor: pa.carte }, ombrePastel(pa.ombre)]}>
        <Ink size={13} weight="bold" color={pa.texte2}>{traduire(BULLE[etape]!)}</Ink>
      </View>
    </View>
  ) : null;

  let corps: React.ReactNode = null;
  let bas: React.ReactNode = null;

  if (etape === 'intro') {
    // les questions qui restent après l'onboarding (sans compter le résultat)
    const restantes = suiteQuiz.filter((e) => e !== 'resultat').length;
    const sportLabel = sport !== 'non' ? AUTRES_SPORTS.find((s) => s.key === sport)?.label : null;
    const deja: { icone: IconName; teinte: string; fond: string; t: string }[] = [];
    if (profil?.objectifs.length) {
      deja.push({ icone: ICONE_OBJECTIF[profil.objectifs[0]] ?? 'target', teinte: pa.bleu.titre, fond: pa.bleu.fond, t: profil.objectifs.map((o) => traduire(OBJECTIFS_CHOIX.find((x) => x.key === o)?.label ?? '')).filter(Boolean).join(', ') });
    }
    if (connues.jours) deja.push({ icone: 'calendar', teinte: pa.creme.titre, fond: pa.creme.fond, t: joursTexte(jours).replace(/^./, (x) => x.toUpperCase()) });
    if (connues.sport && sportLabel) deja.push({ icone: ICONE_SPORT[sport] ?? 'medal', teinte: pa.menthe.titre, fond: pa.menthe.fond, t: traduire(sportLabel) });
    corps = (
      <View style={{ gap: 16 }}>
        <Heros
          image={img}
          titre={traduire('Ton coach te prépare ton programme ?')}
          texte={deja.length ? traduirePluriel(restantes, restantes > 1, 'Il reprend tes réponses. Encore {0} question.', 'Il reprend tes réponses. Encore {0} questions.', restantes) : traduire('Quelques questions, moins d’une minute')}
        />
        {deja.length ? (
          <View style={[{ backgroundColor: pa.carte, borderRadius: 22, padding: 16, gap: 12 }, ombrePastel(pa.ombre)]}>
            {titreSection(traduire('Tu nous l’as déjà dit'))}
            {deja.map((x) => (
              <View key={x.t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: x.fond, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={x.icone} size={17} color={x.teinte} />
                </View>
                <Ink size={14} weight="extraBold" color={pa.texte} style={{ flex: 1 }} numberOfLines={2}>{x.t}</Ink>
                <Icon name="check" size={17} color={pa.menthe.titre} strokeWidth={3} />
              </View>
            ))}
            {connues.jours ? <MiniSemaine jours={jours} couleur={pa.bleu.barre} couleur2={pa.menthe.barre} vide={pa.ligne} hauteur={30} /> : null}
          </View>
        ) : null}
      </View>
    );
    bas = (
      <View style={{ gap: 10 }}>
        <BoutonPlein label={traduire('Oui, c’est parti')} onPress={() => { tap(); aller('experience'); }} />
        <BoutonDoux label={traduire('Plus tard')} onPress={plusTard} />
      </View>
    );
  }

  if (etape === 'objectifs') {
    corps = (
      <View style={{ gap: 12 }}>
        {titreEcran(traduire('Ton objectif ?'), prerempli ? traduire('Repris de tes réponses, ajuste si tu veux') : traduire('Plusieurs choix possibles'))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {OBJECTIFS_CHOIX.filter((o) => o.key !== 'debuter').map((o, k) => (
            <TuileChoix key={o.key} icone={ICONE_OBJECTIF[o.key] ?? 'target'} sticker={STICKER_OBJECTIF[o.key]} cle={o.key} teinte={k} label={traduire(o.label)} on={objectifs.includes(o.key)} onPress={() => basculerObjectif(o.key)} />
          ))}
        </View>
      </View>
    );
    corps = <View style={{ gap: 14 }}>{corps}{apercu}</View>;
    bas = objectifs.some((o) => o !== 'debuter') ? <BoutonPlein label={traduire('Suivant')} onPress={() => { tap(); suivante('objectifs'); }} /> : null;
  }

  if (etape === 'experience') {
    corps = (
      <View style={{ gap: 12 }}>
        {titreEcran(traduire('Tu t’es déjà entraîné ?'), traduire('Sois honnête, personne ne juge.'))}
        {EXPERIENCES.map((x, k) => (
          <CarteChoix
            key={x.key}
            role="radio"
            grand
            teinte={[2, 1, 3, 0][k]}
            icone={ICONE_EXPERIENCE[x.key]}
            sticker={STICKER_EXPERIENCE[x.key]}
            visuel={x.key === 'videos' ? () => <LectureRonde taille={30} /> : undefined}
            label={traduire(x.label)}
            sous={traduire(x.sous)}
            on={experience === x.key}
            onPress={() => {
              tap();
              setExperience(x.key);
              setNiveau(niveauDuGuide(x.key).niveau);
            }}
          />
        ))}
        {apercu}
        <Ink size={13} weight="bold" color={pa.texte2} style={{ marginHorizontal: 2, lineHeight: 18 }}>{traduire('Ensuite : ton objectif, tes jours, ton temps, ton matériel, une douleur éventuelle, ton sport.')}</Ink>
      </View>
    );
    bas = experience ? <BoutonPlein label={traduire('Suivant')} onPress={() => { tap(); suivante('experience'); }} /> : null;
  }

  if (etape === 'jours') {
    corps = (
      <View style={{ gap: 14 }}>
        {titreEcran(traduire('Tes jours disponibles'), traduire('Pour placer tes séances sur ta semaine'))}
        <RangeeJours jours={jours} onBasculer={(d) => basculerJour(d, jours, setJours, false)} />
        {/* TA SEMAINE : l'aperçu vivant des jours choisis (maquette Coach-Jours) */}
        <View style={{ backgroundColor: pa.bleu.fond, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Capitales texte={traduire('Ta semaine')} couleur={pa.bleu.titre} />
            {jours.length ? <Ink size={13} weight="extraBold" color={pa.bleu.encre}>{traduire('{0} jours par semaine', jours.length)}</Ink> : null}
          </View>
          <MiniSemaine jours={jours} couleur={pa.bleu.barre} couleur2={pa.menthe.barre} vide={pa.carte} hauteur={60} gap={6} />
        </View>
        {jours.length === 1 ? <Ink size={13} weight="bold" color={pa.texte2}>{traduire(DEBUTANT)}</Ink> : null}
        {jours.length === 7 ? <Ink size={13} weight="bold" color={pa.texte2}>{traduire('Sept jours : garde au moins un jour de repos, le repos fait aussi le muscle.')}</Ink> : null}
        <Pressable onPress={() => { tap(); setJours([]); suivante('jours'); }} accessibilityRole="button" hitSlop={6} style={({ pressed }) => ({ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
          <Ink size={14} weight="bold" color={pa.bleu.encre} style={{ textDecorationLine: 'underline' }}>{traduire('Je ne sais pas, choisis pour moi')}</Ink>
        </Pressable>
        {apercu}
      </View>
    );
    bas = jours.length ? <BoutonPlein label={traduire('Suivant')} onPress={() => { tap(); suivante('jours'); }} /> : null;
  }

  if (etape === 'temps') {
    corps = (
      <View style={{ gap: 14 }}>
        {titreEcran(traduire('Combien de temps par séance ?'), traduire('Pour des séances qui rentrent dans ton temps'))}
        <TuilesTemps options={TEMPS_SEANCE} valeur={temps} onChoisir={(t) => { tap(); setTemps(t); marquer('temps'); }} />
        {apercu}
      </View>
    );
    bas = <BoutonPlein label={traduire('Suivant')} onPress={() => { tap(); marquer('temps'); suivante('temps'); }} />;
  }

  if (etape === 'sport') {
    corps = (
      <View style={{ gap: 12 }}>
        {titreEcran(traduire('Tu pratiques aussi un sport ?'), traduire('Pour que ta muscu aide ton sport, sans te fatiguer'))}
        {AUTRES_SPORTS.map((s, k) => (
          <CarteChoix key={s.key} role="radio" icone={ICONE_SPORT[s.key] ?? 'medal'} teinte={k} label={traduire(s.label)} on={sport === s.key} onPress={() => { tap(); setSport(s.key); }} />
        ))}
        {apercu}
      </View>
    );
    bas = <BoutonPlein label={traduire('Voir mon programme')} onPress={() => { tap(); suivante('sport'); }} />;
  }

  if (etape === 'lieu') {
    corps = (
      <View style={{ gap: 12 }}>
        {titreEcran(traduire('Où tu t’entraînes ?'), traduire('Pour des exercices que tu peux vraiment faire'))}
        {LIEUX.map((l, k) => (
          <CarteChoix key={l.key} role="radio" grand icone={l.icone} sticker={l.sticker} teinte={k} label={traduire(l.label)} sous={traduire(l.sous)} on={lieu === l.key} onPress={() => { tap(); setLieu(l.key); setEquip(materielDuLieu(l.key)); }} />
        ))}
        {/* « Coche ce que tu as » : le matériel de Ma salle, préréglé selon le lieu (ou ce que tu as déjà coché) */}
        <View style={{ marginTop: 6 }}><Capitales texte={traduire('Coche ce que tu as')} couleur={pa.bleu.titre} /></View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EQUIPEMENTS.map((e) => {
            const liste = equipVu;
            const on = liste.includes(e.id);
            return (
              <Pressable
                key={e.id}
                onPress={() => { tap(); setEquip(on ? liste.filter((x) => x !== e.id) : [...liste, e.id]); }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={traduire(e.label)}
                style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: on ? pa.bouton : pressed ? pa.bleu.fond : pa.carte }, on ? null : ombrePastel(pa.ombre)]}
              >
                {on ? <Icon name="check" size={14} color={pa.surBouton} strokeWidth={3} /> : null}
                <Ink size={14} weight="extraBold" color={on ? pa.surBouton : pa.texte}>{traduire(e.label)}</Ink>
              </Pressable>
            );
          })}
        </View>
        {apercu}
      </View>
    );
    bas = <BoutonPlein label={traduire('Suivant')} onPress={() => { tap(); marquer('lieu'); if (!equip) setEquip(equipVu); suivante('lieu'); }} />;
  }

  if (etape === 'douleur') {
    const autres = DOULEURS_AUTRES.filter((d) => douleurs.includes(d.key));
    corps = (
      <View style={{ gap: 12 }}>
        {titreEcran(traduire('Tu as mal quelque part en ce moment ?'), traduire('Je remplace les exercices qui chargent cette zone. Ce n’est pas un diagnostic.'))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {DOULEURS_PRINCIPALES.map((d) => (
            <TuileDouleur key={d.key} label={traduire(d.label)} point={d.point} nulle={d.key === 'nulle'} on={douleurs.includes(d.key)} onPress={() => { tap(); setDouleurs((l) => basculerDouleur(l, d.key)); }} />
          ))}
        </View>
        <Pressable onPress={() => { tap(); setAutreZone((v) => !v); }} accessibilityRole="button" accessibilityState={{ expanded: autreZone || autres.length > 0 }} hitSlop={4} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
          <Ink size={14} weight="extraBold" color={pa.surBouton}>{traduire('Autre zone : {0}', DOULEURS_AUTRES.map((d) => traduire(d.label).replace(/^(la |le |l’|l')/i, '')).join(', '))}</Ink>
        </Pressable>
        {autreZone || autres.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -4 }}>
            {DOULEURS_AUTRES.map((d) => {
              const on = douleurs.includes(d.key);
              return (
                <Pressable key={d.key} onPress={() => { tap(); setDouleurs((l) => basculerDouleur(l, d.key)); }} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: on ? pa.bouton : pressed ? pa.bleu.fond : pa.carte }, on ? null : ombrePastel(pa.ombre)]}>
                  {on ? <Icon name="check" size={14} color={pa.surBouton} strokeWidth={3} /> : null}
                  <Ink size={14} weight="extraBold" color={on ? pa.surBouton : pa.texte}>{traduire(d.label)}</Ink>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {regionsGuide.length ? (
          <Pressable onPress={() => { tap(); router.push('/infirmary' as any); }} accessibilityRole="link" hitSlop={4} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, opacity: pressed ? 0.7 : 1 })}>
            <Ink size={14} weight="extraBold" color={pa.surBouton} style={{ flexShrink: 1 }}>{traduire('Préciser dans l’infirmerie')}</Ink>
            <Icon name="chevron" size={14} color={pa.surBouton} />
          </Pressable>
        ) : null}
        {apercu}
      </View>
    );
    bas = douleurs.length ? <BoutonPlein label={traduire('Suivant')} onPress={() => { tap(); suivante('douleur'); }} /> : null;
  }

  /* ---------------- avant la liste ---------------- */
  // « Continuer » : la réponse préréglée suffit ; un toucher sur une réponse passe aussi à la suite
  const continuer = (depuis: Etape, pret: boolean) => (pret ? <BoutonPlein label={traduire('Continuer')} onPress={() => { tap(); preSuivante(depuis); }} /> : null);
  const sousRepris = (su: boolean) => (su ? traduire('Repris de tes réponses, ajuste si tu veux') : undefined);

  if (etape === 'pjours') {
    corps = (
      <View style={{ gap: 14 }}>
        {titreEcran(traduire('Combien de jours par semaine ?'), sousRepris(joursSus() !== undefined && nJours === joursSus()) ?? traduire('Pour te montrer d’abord les programmes faits pour ta semaine'))}
        <TuilesJours
          options={proposes}
          valeur={nJours}
          nombre={nombreDeProgrammes}
          onChoisir={(n) => { tap(); setNJours(n); marquer('jours'); setTimeout(() => preSuivante('pjours'), 160); }}
        />
      </View>
    );
    bas = continuer('pjours', nJours !== undefined);
  }

  if (etape === 'ptemps') {
    corps = (
      <View style={{ gap: 14 }}>
        {titreEcran(traduire('Combien de temps par séance ?'), traduire('Pour des séances qui rentrent dans ton temps'))}
        <TuilesTemps options={TEMPS_SEANCE} valeur={temps} onChoisir={(t) => { tap(); setTemps(t); marquer('temps'); setTimeout(() => preSuivante('ptemps'), 160); }} />
      </View>
    );
    bas = <BoutonPlein label={traduire('Continuer')} onPress={() => { tap(); marquer('temps'); preSuivante('ptemps'); }} />;
  }

  if (etape === 'pniveau') {
    corps = (
      <View style={{ gap: 12 }}>
        {titreEcran(traduire('Depuis quand tu fais de la muscu ?'), traduire('Pour choisir un programme à ton niveau'))}
        {NIVEAUX.map((n, k) => (
          <CarteChoix
            key={n.key}
            role="radio"
            grand
            teinte={k}
            visuel={(_on, t) => <BarresNiveau n={k + 1} couleur={t.encre} vide={pa.carte} />}
            label={traduire(libelleNiveau(n.key))}
            sous={traduire(n.label)}
            on={niveauSu === n.key}
            onPress={() => {
              tap();
              setNiveau(n.key);
              // un niveau choisi ici remplace « Je n'y connais rien »
              if (n.key !== 'debutant' && debuter) setObjectifs((l) => l.filter((o) => o !== 'debuter'));
              marquer('niveau');
              setTimeout(() => preSuivante('pniveau'), 160);
            }}
          />
        ))}
      </View>
    );
    bas = continuer('pniveau', niveauSu !== undefined);
  }

  if (etape === 'plieu') {
    corps = (
      <View style={{ gap: 12 }}>
        {titreEcran(traduire('Où tu t’entraînes ?'), traduire('Pour des exercices que tu peux vraiment faire'))}
        {LIEUX.map((l, k) => (
          <CarteChoix key={l.key} role="radio" grand icone={l.icone} teinte={k} label={traduire(l.label)} on={lieu === l.key} onPress={() => { tap(); setLieu(l.key); marquer('lieu'); setTimeout(() => preSuivante('plieu'), 160); }} />
        ))}
      </View>
    );
    bas = <BoutonPlein label={traduire('Continuer')} onPress={() => { tap(); marquer('lieu'); preSuivante('plieu'); }} />;
  }

  if (etape === 'profil') {
    const lieuVu = repondu.includes('lieu') ? lieu : lieuSauve;
    const lignes: { cle: string; icone: IconName; teinte: string; fond: string; t: string; vers: Etape }[] = [
      { cle: 'jours', icone: 'calendar', teinte: pa.bleu.titre, fond: pa.bleu.fond, t: traduire('{0} jours par semaine', nJours ?? 0), vers: 'pjours' },
      { cle: 'temps', icone: 'clock', teinte: pa.creme.titre, fond: pa.creme.fond, t: traduire(TEMPS_SEANCE.find((x) => x.key === temps)?.label ?? ''), vers: 'ptemps' },
      { cle: 'niveau', icone: 'gauge', teinte: pa.menthe.titre, fond: pa.menthe.fond, t: niveauSu ? traduire(libelleNiveau(niveauSu)) : '', vers: 'pniveau' },
    ];
    if (lieuVu) {
      const l = LIEUX.find((x) => x.key === lieuVu);
      if (l) lignes.push({ cle: 'lieu', icone: l.icone, teinte: pa.lilas.titre, fond: pa.lilas.fond, t: traduire(l.label), vers: 'plieu' });
    }
    corps = (
      <View style={{ gap: 14 }}>
        {titreEcran(traduire('Ton profil'), traduire('Repris de tes réponses, ajuste si tu veux'))}
        <View style={[{ backgroundColor: pa.carte, borderRadius: 22, padding: 16, gap: 14 }, ombrePastel(pa.ombre)]}>
          {lignes.map((x) => (
            <View key={x.cle} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: x.fond, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={x.icone} size={17} color={x.teinte} />
              </View>
              <Ink size={15} weight="extraBold" color={pa.texte} style={{ flex: 1 }} numberOfLines={2}>{x.t}</Ink>
              <Pressable onPress={() => modifier(x.vers)} accessibilityRole="button" accessibilityLabel={`${traduire('Modifier')}, ${x.t}`} hitSlop={6} style={({ pressed }) => ({ minHeight: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: pressed ? pa.boutonAppui : pa.bouton })}>
                <Ink size={13} weight="extraBold" color={pa.surBouton}>{traduire('Modifier')}</Ink>
              </Pressable>
            </View>
          ))}
          <View style={{ backgroundColor: pa.bleu.fond, borderRadius: 16, padding: 10 }}>
            <MiniSemaine jours={joursConseilles(nJours ?? 0)} couleur={pa.bleu.barre} couleur2={pa.menthe.barre} vide={pa.carte} hauteur={34} gap={4} />
          </View>
        </View>
      </View>
    );
    bas = <BoutonPlein label={traduire('Continuer')} onPress={() => { tap(); preSuivante('profil'); }} />;
  }

  if (etape === 'liste') {
    const ids = (GROUPES_PROGRAMMES.find((g) => g.id === groupe)?.ids ?? []).filter((id) => !!programmeParId(id));
    const env = envies();
    // sans nombre de jours (ne devrait pas arriver) : la liste telle quelle
    const tri = env ? trierFamille(ids, env) : { premiers: ids.map((id) => programmeParId(id)!), exact: true, autres: [] };
    const premier = tri.premiers[0] ?? null;
    const ouvrir = (p: Programme) => { tap(); ouvrirResultat('liste', p.id); };
    corps = (
      <View style={{ gap: 14 }}>
        {titreEcran(traduire('Choisis ton programme'), traduire('Tu ajoutes tes modules juste après'))}
        {env ? (
          <Pressable
            onPress={() => modifier(preSuite[0] === 'profil' ? 'profil' : 'pjours')}
            accessibilityRole="button"
            accessibilityLabel={traduire('{0} jours par semaine', env.jours) + ', ' + traduire('Modifier')}
            hitSlop={6}
            style={({ pressed }) => ({ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: pressed ? pa.boutonAppui : pa.bouton })}
          >
            <Icon name="calendar" size={15} color={pa.surBouton} />
            <Ink size={14} weight="extraBold" color={pa.surBouton}>{traduire('{0} jours', env.jours)}</Ink>
            <Ink size={13} weight="bold" color={pa.surBouton}>{traduire('Modifier')}</Ink>
          </Pressable>
        ) : null}
        <TypesProgrammes groupes={GROUPES_PROGRAMMES} groupe={groupe} onChoisir={(id) => { tap(); setGroupe(id); setVoirAutres(false); }} />
        {!tri.exact ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: pa.creme.fond }}>
            <Icon name="target" size={16} color={pa.creme.titre} />
            <Ink size={13} weight="extraBold" color={pa.texte} style={{ flex: 1 }}>{traduire('Le plus proche de ce que tu veux')}</Ink>
          </View>
        ) : null}
        {premier ? (
          <HerosProgramme p={premier} image={sportImage(sportDuProgramme(premier), femme, 1)} onPress={() => ouvrir(premier)} />
        ) : null}
        {tri.premiers.slice(1).map((p, k) => (
          <CarteProgramme key={p.id} p={p} k={k} onPress={() => ouvrir(p)} />
        ))}
        {tri.autres.length ? (
          voirAutres ? (
            <View style={{ gap: 10, marginTop: 6 }}>
              {titreSection(traduire('Avec un autre nombre de jours'))}
              {tri.autres.map((p, k) => (
                <CarteProgramme key={p.id} p={p} k={k + 1} onPress={() => ouvrir(p)} />
              ))}
            </View>
          ) : (
            <Pressable onPress={() => { tap(); setVoirAutres(true); }} accessibilityRole="button" hitSlop={6} style={({ pressed }) => ({ alignSelf: 'center', minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: pressed ? 0.7 : 1 })}>
              <Ink size={14} weight="extraBold" color={pa.bleu.encre}>{traduire('Voir les autres programmes')}</Ink>
              <Icon name="chevron" size={14} color={pa.bleu.encre} />
            </Pressable>
          )
        ) : null}
      </View>
    );
  }

  if (etape === 'resultat' && prog) {
    const duConseil = chemin === 'quiz' && conseil && conseil.id === prog.id;
    const plusieurs = chemin === 'quiz' && propositions.length > 1;
    const autres = !plusieurs && chemin === 'quiz' && conseil?.autres.length ? [conseil.id, ...conseil.autres].filter((id) => id !== prog.id).slice(0, 2).map((id) => programmeParId(id)).filter((a): a is NonNullable<typeof a> => !!a) : [];
    const propChoisie = plusieurs ? propositions.find((x) => x.id === prog.id) : chemin === 'quiz' ? propositions[0] : undefined;
    corps = (
      <View style={{ gap: 18 }}>
        {plusieurs ? (
          <View style={{ gap: 12 }}>
            <View style={{ gap: 4 }}>
              {titreEcran(traduire('Pour toi'), traduire('{0} programmes pour tes objectifs. Choisis le tien.', propositions.length))}
            </View>
            {propositions.map((x) => {
              const px = programmeParId(x.id);
              if (!px) return null;
              return x.id === prog.id ? (
                <CarteResultat key={x.id} image={img} badge={x.conseille ? traduire('Conseillé pour toi') : traduire('Ton choix')} coche titre={traduire(px.titre)} texte={traduire(x.pourquoi)} jours={joursEff}>
                  <PucesCouvre couvre={x.couvre} surIndigo />
                  <View style={{ maxWidth: img ? '68%' : '100%' }}><PucesProgramme p={px} /></View>
                </CarteResultat>
              ) : (
                <CarteProposition key={x.id} p={px} x={x} onPress={() => choisirProposition(x)} />
              );
            })}
            <CarteChoix icone="list" teinte={1} label={traduire('Voir tous les programmes')} on={false} fleche onPress={() => { tap(); ouvrirListe(); }} />
          </View>
        ) : (
        <CarteResultat image={img} badge={duConseil ? traduire('Conseillé pour toi') : traduire('Ton programme')} titre={traduire(prog.titre)} texte={traduire(duConseil ? conseil!.pourquoi : prog.accroche)} jours={joursEff}>
          <View style={{ maxWidth: img ? '68%' : '100%' }} accessible accessibilityLabel={traduire('{0} j par semaine, {1} min', prog.joursParSemaine, prog.dureeMin)}>
            <PucesProgramme p={prog} />
          </View>
        </CarteResultat>
        )}

        {duConseil && conseil!.dureeTropLongue ? (
          <Ink size={13} weight="bold" color={pa.texte2}>{traduire('Moins de temps un jour ? La page du programme propose une séance express.')}</Ink>
        ) : null}
        {duConseil && conseil!.principeSport ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: pa.creme.fond }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="target" size={17} color={pa.creme.titre} />
            </View>
            <Ink size={13} weight="bold" color={pa.texte} style={{ flex: 1, lineHeight: 18 }}>{traduire(conseil!.principeSport!)}</Ink>
          </View>
        ) : null}

        {/* 27 octobre 2026 : Tes jours, la séance de chaque jour, préréglés avec tes jours (TesJours.tsx) */}
        {(() => {
          const v = semaineAffichee(null, prog, planRes, joursRes);
          return (
            <TesJours
              programme={prog}
              semaine={semaineRes ?? v.semaine}
              enBoucle={!semaineRes && v.enBoucle}
              fin={finRes}
              onSemaine={(sv) => setSemainePerso({ id: prog.id, semaine: sv })}
            />
          );
        })()}
        <View style={{ backgroundColor: pa.carte, borderRadius: 24, padding: 18 }}>
          <ChoixDuree valeur={dureeRes ?? (DUREES.includes(prog.semaines as 8) ? prog.semaines : undefined)} onChange={setDureeRes} />
        </View>

        {possibles.length ? (
          <View style={{ gap: 12 }}>
            {titreSection(traduire('Ajoute à ton programme'))}
            <GrilleModules possibles={possibles} modules={modules} onBasculer={basculerModule} onPourquoi={(m) => setPourquoi(POURQUOI_MODULE[m])} />
          </View>
        ) : null}

        {modules.includes('cardio') ? (
          <View style={{ gap: 10 }}>
            {titreSection(traduire('Durée du cardio'))}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MINUTES_FIN.map((m) => <Puce key={m} label={traduire('{0} min', m)} on={minutes === m} onPress={() => { tap(); setMinutes(m); }} />)}
            </View>
          </View>
        ) : null}

        {aDesJoursMarche(prog) ? (
          <View style={{ gap: 10 }}>
            {titreSection(traduire('Les séances de marche du programme'))}
            <View style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 16, backgroundColor: pa.ligne }}>
              <Segment label={traduire('Je les garde')} on={!sansMarche} onPress={() => { tap(); setSansMarche(false); }} />
              <Segment label={traduire('Je les retire')} on={sansMarche} onPress={() => { tap(); setSansMarche(true); }} />
            </View>
          </View>
        ) : null}

        {(duConseil && conseil!.guideDebutant) || (chemin === 'quiz' && niveauDuGuide(experience).gestes) ? (
          <CarteChoix icone="scale" teinte={2} label={traduire('Trouver ton poids de départ')} on={false} fleche onPress={() => { tap(); setGuide(true); }} />
        ) : null}

        {chemin === 'quiz' && conseils.length ? (
          <View style={{ gap: 10 }}>
            <View style={{ gap: 2 }}>
              {titreSection(traduire('Les conseils du coach'))}
              <Ink size={13} weight="bold" color={pa.texte2} style={{ marginHorizontal: 2 }}>{traduire('Pour chacun de tes objectifs, ce qui marche vraiment')}</Ink>
            </View>
            {conseils.map((x, k) => {
              const m = x.modules.find((id) => possibles.some((pm) => pm.id === id));
              const info = m ? moduleParId(m) : undefined;
              const parLuiMeme = !!propChoisie?.couvre.some((cv) => cv.objectif === x.objectif && cv.via === 'programme');
              // le programme le fait déjà lui même ; sinon son module, à ajouter si tu veux
              const ajout = parLuiMeme
                ? { label: '', etat: 'inclus' as const }
                : m && info
                  ? { label: info.label, etat: (modules.includes(m) ? 'ajoute' : 'possible') as 'ajoute' | 'possible', onBasculer: () => setModules((l) => normaliserModules(l.includes(m) ? l.filter((y) => y !== m) : [...l, m])) }
                  : undefined;
              return <CarteConseilObjectif key={x.objectif} conseil={x} k={k} onPourquoi={() => setPourquoi(x)} ajout={ajout} />;
            })}
          </View>
        ) : null}

        {autres.length ? (
          <View style={{ gap: 10 }}>
            {titreSection(traduire('Te va aussi'))}
            {autres.map((a, k) => (
              <CarteProgramme key={a.id} p={a} k={k + 1} onPress={() => prendreAutre(a.id)} />
            ))}
          </View>
        ) : null}

        {/* 27 octobre 2026 : « Une question ? », venues de l'accueil du coach (poids de départ, séries, charge, ton but) */}
        <QuestionsCoach />
      </View>
    );
    bas = (
      <View style={{ gap: 10 }}>
        <BoutonPlein grand icone="play" label={traduire('C’est parti')} onPress={() => { tap(); void lancer(); }} />
        <BoutonDoux label={traduire('Voir le programme')} onPress={voirProgramme} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: pa.page }}>
      {/* en-tête : retour, progression, Plus tard */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={retour} accessibilityRole="button" accessibilityLabel={traduire('Retour')} style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] }, ombrePastel(pa.ombre)]}>
          <Icon name="chevronLeft" size={18} color={pa.texte} />
        </Pressable>
        {chemin === 'quiz' && etape !== 'intro' && etape !== 'attente' ? (
          // 27 octobre 2026, le Guide : « Question N sur 7 », la barre pleine sur le résultat
          <View style={{ flex: 1, gap: 6 }} accessible accessibilityLabel={rangQuestion >= 0 ? traduire('Question {0} sur {1}', rangQuestion + 1, questions.length) : traduire('Ton programme')}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {questions.map((e, k) => (
                <View key={e} style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: rangQuestion < 0 || k <= rangQuestion ? pa.etape : pa.etapeVide }} />
              ))}
            </View>
            <Ink size={12} weight="bold" color={pa.texte2} numberOfLines={1}>{rangQuestion >= 0 ? traduire('Question {0} sur {1}', rangQuestion + 1, questions.length) : traduire('Ton programme')}</Ink>
          </View>
        ) : (
        <View style={{ flex: 1, gap: 6 }} accessible accessibilityLabel={traduire('Étape {0} sur {1}', rang + 1, suiteVue.length)}>
          {etape === 'intro' || etape === 'attente' ? null : (
            <>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {suiteVue.map((e, k) => (
                  <View key={e} style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: k <= rang ? pa.etape : pa.etapeVide }} />
                ))}
              </View>
              <Ink size={12} weight="bold" color={pa.texte2}>{traduire('Étape {0} sur {1}', rang + 1, suiteVue.length)}</Ink>
            </>
          )}
        </View>
        )}
        <Pressable onPress={plusTard} accessibilityRole="button" hitSlop={8} style={{ minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' }}>
          <Ink size={14} weight="bold" color={pa.texte2}>{traduire('Plus tard')}</Ink>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* 27 octobre 2026 : chaque question arrive en glissant doucement */}
        <Animated.View key={etape} entering={FadeInRight.duration(280)}>
          {bulle}
          {corps}
        </Animated.View>
      </ScrollView>

      {bas ? <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 14, backgroundColor: pa.page }}>{bas}</View> : null}

      <FeuillePoidsDeDepart visible={guide} onClose={() => setGuide(false)} />
      <FeuillePourquoi explication={pourquoi} onClose={() => setPourquoi(null)} />
    </View>
  );
}

/* ------------------------------------------------ morceaux ------------------------------------------------ */

/**
 * La carte pastel du haut (maquette Coach-Programme) : dégradé très léger, un grand rond blanc, le personnage à
 * droite. Remplace la carte indigo du 26 octobre (archivée dans _archive_ancien_design_2026-10-09/coach_2026-10-27/).
 */
function CartePastel({ image, children, minHeight = 170 }: { image: ReturnType<typeof sportImage>; children: React.ReactNode; minHeight?: number }) {
  const pa = usePastel();
  return (
    <LinearGradient colors={pa.degrade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 28, overflow: 'hidden', padding: 18, gap: 10, minHeight, justifyContent: 'center' }}>
      <View pointerEvents="none" style={{ position: 'absolute', right: -30, bottom: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: pa.carte, opacity: 0.55 }} />
      {image ? <Image source={image} style={{ position: 'absolute', right: 6, bottom: 0, width: 124, height: Math.min(190, minHeight + 10) }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      {children}
    </LinearGradient>
  );
}

/** Le premier écran : « Ton coach » en petites capitales, la question, le personnage */
function Heros({ image, titre, texte }: { image: ReturnType<typeof sportImage>; titre: string; texte?: string }) {
  const pa = usePastel();
  return (
    <CartePastel image={image}>
      <View style={{ maxWidth: image ? '62%' : '100%', gap: 6 }}>
        <Capitales texte={traduire('Ton coach')} couleur={pa.bleu.titre} />
        <Ink size={24} weight="black" tight color={pa.bleu.encre} accessibilityRole="header">{titre}</Ink>
        {texte ? <Ink size={13} weight="bold" color={pa.texte2}>{texte}</Ink> : null}
      </View>
    </CartePastel>
  );
}

/** Le programme du résultat : « Conseillé pour toi » ou « Ton programme », le nom, pourquoi, la semaine, la courbe */
function CarteResultat({ image, badge, coche, titre, texte, jours, children }: { image: ReturnType<typeof sportImage>; badge: string; coche?: boolean; titre: string; texte: string; jours: readonly number[]; children?: React.ReactNode }) {
  const pa = usePastel();
  return (
    <CartePastel image={image} minHeight={220}>
      <View style={{ maxWidth: image ? '64%' : '100%', gap: 7 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {coche ? <Icon name="check" size={13} color={pa.bleu.titre} strokeWidth={3} /> : null}
          <View style={{ flexShrink: 1 }}><Capitales texte={badge} couleur={pa.bleu.titre} /></View>
        </View>
        <Ink size={23} weight="black" tight color={pa.bleu.encre} numberOfLines={3} accessibilityRole="header" style={{ lineHeight: 27 }}>{titre}</Ink>
        <Ink size={13} weight="bold" color={pa.texte2} numberOfLines={4} style={{ lineHeight: 18 }}>{texte}</Ink>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 2 }}>
          <View style={{ width: 84 }}>
            <MiniSemaine jours={jours} couleur={pa.bleu.barre} couleur2={pa.menthe.barre} vide={pa.carte} hauteur={30} gap={3} />
          </View>
          <MiniProgres largeur={84} hauteur={34} couleur={pa.bleu.titre} aire={pa.carte} point={pa.carte} />
        </View>
      </View>
      {children}
    </CartePastel>
  );
}

/** Les objectifs que couvre un programme : coche s'il le fait lui même, plus s'il passe par un module */
function PucesCouvre({ couvre, surIndigo }: { couvre: Proposition['couvre']; surIndigo?: boolean }) {
  const pa = usePastel();
  if (!couvre.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {couvre.map((x) => {
        const label = traduire(OBJECTIFS_CHOIX.find((o) => o.key === x.objectif)?.label ?? '');
        const mod = x.via === 'module' ? moduleParId(x.module!) : undefined;
        const texte = mod ? traduire('{0}, module {1}', label, traduire(mod.label)) : label;
        // sur la carte pastel du haut (surIndigo, nom gardé) : puces blanches ; sur une carte blanche : puces pastel
        const fond = surIndigo ? pa.carte : x.via === 'programme' ? pa.menthe.fond : pa.bleu.fond;
        const encre = x.via === 'programme' ? pa.menthe.titre : pa.bleu.encre;
        return (
          <View key={x.objectif} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: fond }}>
            <Icon name={x.via === 'programme' ? 'check' : 'plus'} size={12} color={encre} strokeWidth={3} />
            <Ink size={12} weight="extraBold" color={encre}>{texte}</Ink>
          </View>
        );
      })}
    </View>
  );
}

/** Une proposition « Pour toi » non choisie : carte blanche, sa semaine en barres, ce qu'elle couvre ; toucher la choisit */
function CarteProposition({ p, x, onPress }: { p: Programme; x: Proposition; onPress: () => void }) {
  const pa = usePastel();
  const titre = traduire(p.titre);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: false }}
      accessibilityLabel={[x.conseille ? traduire('Conseillé pour toi') : '', titre, traduire('{0} jours', p.joursParSemaine), traduire('{0} min', p.dureeMin)].filter(Boolean).join(', ')}
      style={({ pressed }) => [{ borderRadius: 22, padding: 16, gap: 12, backgroundColor: pressed ? pa.choisi : pa.carte }, ombrePastel(pa.ombre)]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 70 }}>
          <MiniSemaine jours={joursConseilles(p.joursParSemaine)} couleur={pa.peche.barre} vide={pa.ligne} hauteur={34} gap={2} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          {x.conseille ? <PuceConseil texte={traduire('Conseillé pour toi')} /> : null}
          <Ink size={15} weight="black" tight color={pa.texte} numberOfLines={2}>{titre}</Ink>
          <Ink size={12} weight="bold" color={pa.texte2}>{traduire('{0} j par semaine, {1} min', p.joursParSemaine, p.dureeMin)}</Ink>
        </View>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: pa.bordChoisi }} />
      </View>
      <PucesCouvre couvre={x.couvre} />
    </Pressable>
  );
}

/** Puce de choix court (durée du cardio) : choisie, bleu très pâle avec un bord doux */
function Puce({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const pa = usePastel();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pa.choisi : pressed ? pa.bleu.fond : pa.carte, borderWidth: 1.5, borderColor: on ? pa.bordChoisi : pa.ligne })}
    >
      <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? pa.bleu.encre : pa.texte}>{label}</Ink>
    </Pressable>
  );
}

/** Une moitié du contrôle segmenté (séances de marche, maquette Coach-Programme) */
function Segment({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const pa = usePastel();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [{ flex: 1, minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pa.carte : 'transparent', opacity: pressed ? 0.8 : 1 }, on ? ombrePastel(pa.ombre) : null]}
    >
      <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? pa.bleu.encre : pa.texte2}>{label}</Ink>
    </Pressable>
  );
}

/** Le bouton principal du bas : le bouton partage (28 octobre 2026, degrade bleu nuit, texte blanc) */
function BoutonPlein({ label, onPress, grand, icone }: { label: string; onPress: () => void; grand?: boolean; icone?: IconName }) {
  return (
    <BoutonPrincipal onPress={onPress} haptique="none" label={label} hauteur={grand ? 58 : 56} rayon={29} tailleTexte={grand ? 17 : 16} icone={icone ? (col) => <Icon name={icone} size={17} color={col} /> : undefined} />
  );
}

function BoutonDoux({ label, onPress }: { label: string; onPress: () => void }) {
  const pa = usePastel();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pa.bleu.fond : pa.carte, borderWidth: 1, borderColor: pa.ligne })}>
      <Ink size={15} weight="extraBold" color={pa.bleu.encre}>{label}</Ink>
    </Pressable>
  );
}

/**
 * Une réponse à « Tu as mal quelque part ? » (maquette Coach2-C-Guide) : deux par ligne, la petite silhouette avec
 * le point rouge sur la zone, ou la coche verte de « Nulle part ». Choisie : bleu très pâle, bord doux, coche.
 */
function TuileDouleur({ label, point, nulle, on, onPress }: { label: string; point?: [number, number]; nulle?: boolean; on: boolean; onPress: () => void }) {
  const pa = usePastel();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        { width: '47%', flexGrow: 1, minHeight: 84, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: on ? pa.choisi : pa.carte, borderWidth: 1.5, borderColor: on ? pa.bordChoisi : 'transparent', transform: [{ scale: pressed ? 0.97 : 1 }] },
        on ? null : ombrePastel(pa.ombre),
      ]}
    >
      <View style={{ width: 34, alignItems: 'center' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {nulle ? (
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: pa.menthe.barre, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={18} color="#FFFFFF" strokeWidth={3.4} />
          </View>
        ) : (
          <CarteMuscles vue="face" largeur={34} muscles={false} point={point} />
        )}
      </View>
      <Ink size={15} weight="black" color={pa.texte} numberOfLines={3} style={{ flex: 1, paddingRight: on ? 18 : 0 }}>{label}</Ink>
      {on ? <View style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: pa.coche, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={12} color={pa.surCoche} strokeWidth={3.2} /></View> : null}
    </Pressable>
  );
}
