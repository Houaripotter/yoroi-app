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
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { Cercles, usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { GrilleModules } from '@/components/yoroi/v2/programmes/GrilleModules';
import { CarteConseilObjectif, FeuillePourquoi } from '@/components/yoroi/v2/programmes/Pourquoi';
import { POURQUOI_MODULE, conseilsDesObjectifs } from '@/lib/v2/programmes/pourquoi';
import type { Explication } from '@/lib/v2/programmes/pourquoi';
import { BarresNiveau, CarteChoix, CarteProgramme, HerosProgramme, ICONE_OBJECTIF, ICONE_SPORT, PointsSemaine, PucesProgramme, RangeeJours, TuileChoix, TuilesJours, TuilesTemps, TypesProgrammes } from '@/components/yoroi/v2/programmes/ChoixVisuels';
import { FeuillePoidsDeDepart } from '@/components/yoroi/v2/programmes/PoidsDeDepart';
import { getProfile } from '@/lib/database';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
import { libelleNiveau, programmeParId, sportDuProgramme } from '@/lib/v2/programmes/catalogue';
import { etapesPreselection, joursLePlusProche, joursProposes, lieuDuMateriel, meilleureFamille, nombreDeProgrammes, trierFamille } from '@/lib/v2/programmes/preselection';
import type { EtapePre, Envies, QuestionPre } from '@/lib/v2/programmes/preselection';
import { DEBUTANT, OBJECTIFS_CHOIX } from '@/lib/v2/programmes/choix';
import type { ObjectifChoix } from '@/lib/v2/programmes/choix';
import { conseilJours } from '@/lib/v2/programmes/coach';
import { AUTRES_SPORTS, TEMPS_SEANCE, conseilDepart, ecrireDepart, lireDepart, objectifsAvecSport, propositionsDepart } from '@/lib/v2/programmes/depart';
import { etapesConnues, lireProfilCoach } from '@/lib/v2/programmes/profilCoach';
import type { ProfilCoach } from '@/lib/v2/programmes/profilCoach';
import { joursTexte } from '@/components/yoroi/v2/espace/JoursPicker';
import type { AutreSport, Proposition, TempsSeance } from '@/lib/v2/programmes/depart';
import { aDesJoursMarche, MINUTES_FIN } from '@/lib/v2/programmes/finSeance';
import { GROUPES_PROGRAMMES, moduleParId, modulesPossibles, moduleUtile, normaliserModules } from '@/lib/v2/programmes/modules';
import type { ModuleId } from '@/lib/v2/programmes/modules';
import { chargerMateriel, chargerProgrammeActif, demarrerProgramme, enregistrerMateriel, joursConseilles, materielDuLieu } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { Materiel, Niveau, Programme } from '@/lib/v2/programmes/types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

type Etape = 'attente' | 'intro' | 'objectifs' | 'niveau' | 'jours' | 'temps' | 'sport' | 'lieu' | 'liste' | 'resultat'
  // 27 octobre 2026 : avant la liste (preselection.ts)
  | 'pjours' | 'ptemps' | 'pniveau' | 'plieu' | 'profil';

const ETAPE_PRE: Record<EtapePre, Etape> = { jours: 'pjours', temps: 'ptemps', niveau: 'pniveau', lieu: 'plieu', profil: 'profil' };
const QUIZ: Etape[] = ['intro', 'objectifs', 'niveau', 'jours', 'temps', 'sport', 'lieu'];

const NIVEAUX: { key: Niveau; label: string }[] = [
  { key: 'debutant', label: 'Moins de 6 mois' },
  { key: 'intermediaire', label: '6 mois à 2 ans' },
  { key: 'confirme', label: 'Plus de 2 ans' },
];
const LIEUX: { key: Materiel; label: string; icone: IconName }[] = [
  { key: 'salle', label: 'En salle', icone: 'dumbbell' },
  { key: 'halteres', label: 'À la maison, avec des haltères', icone: 'dumbbell' },
  { key: 'maison', label: 'À la maison, sans matériel', icone: 'body' },
];

export default function CoachDepart() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ depuis?: string; chemin?: string }>();
  const depuisOnboarding = params.depuis === 'onboarding';
  // depuis=visite : la carte de l'accueil après la visite guidée. Comme l'onboarding (étapes déjà connues sautées,
  // réponses reprises), mais on revient en arrière en sortant
  const depuisVisite = params.depuis === 'visite';
  const commeOnboarding = depuisOnboarding || depuisVisite;

  // chemin=liste : on attend ce qu'on sait déjà (profil, programme, matériel) pour préparer les écrans avant la liste
  const [etape, setEtape] = useState<Etape>(commeOnboarding ? 'intro' : params.chemin === 'liste' ? 'attente' : 'objectifs');
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

  useEffect(() => {
    getProfile().then((pr) => setFemme(pr?.avatar_gender === 'femme')).catch(() => {});
    const a = chargerProgrammeActif().then((x) => { setActif(x); return x; }).catch(() => { setActif(null); return null; });
    const m = chargerMateriel().then((x) => setLieuSauve(lieuDuMateriel(x))).catch(() => {});
    const pc = lireProfilCoach().then((p) => {
      setProfil(p);
      if (p.objectifs.length) setObjectifs((l) => (l.length ? l : p.objectifs));
      if (p.jours.length) setJours((l) => (l.length ? l : p.jours));
      if (p.sport) setSport(p.sport);
    });
    void Promise.all([a, m, pc]).finally(() => setCharge(true));
  }, []);
  const connues = profil && commeOnboarding ? etapesConnues(profil) : { jours: false, sport: false };
  const prerempli = !!profil?.objectifs.length;

  const debuter = objectifs.includes('debuter');
  const courseSeule = objectifs.length === 1 && objectifs[0] === 'course';
  const conseil = useMemo(
    () => (objectifs.length ? conseilDepart({ objectifs, niveau: debuter ? undefined : niveau, jours, temps, sport, lieu }) : null),
    [objectifs, niveau, debuter, jours, temps, sport, lieu],
  );
  // plusieurs objectifs : 2 ou 3 programmes « Pour toi »
  const propositions = useMemo(
    () => (conseil ? propositionsDepart({ objectifs, niveau: debuter ? undefined : niveau, jours, temps, sport, lieu }, conseil) : []),
    [conseil, objectifs, niveau, debuter, jours, temps, sport, lieu],
  );
  // les conseils du coach, un par objectif (ton sport compris)
  const conseils = useMemo(() => conseilsDesObjectifs(objectifsAvecSport(objectifs, sport)), [objectifs, sport]);
  const prog = choisi ? programmeParId(choisi) ?? null : null;
  const possibles = prog ? modulesPossibles(prog) : [];
  const img = sportImage(prog ? sportDuProgramme(prog) : 'musculation', femme, 1);

  // les étapes du questionnaire, pour la barre de progression
  // juste après l'onboarding, les jours et le sport déjà donnés ne sont pas redemandés
  const suiteQuiz: Etape[] = (['objectifs', 'niveau', 'jours', 'temps', 'sport', 'lieu', 'resultat'] as Etape[]).filter(
    (e) => !(e === 'niveau' && debuter) && !(e === 'jours' && connues.jours) && !(e === 'sport' && connues.sport),
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
    // le questionnaire, ou ton lieu donné avant la liste
    if (chemin !== 'quiz' && !repondu.includes('lieu')) return;
    const m = await chargerMateriel().catch(() => null);
    if (m === null) await enregistrerMateriel(materielDuLieu(lieu));
  };

  const lancer = async () => {
    if (!prog) return;
    const go = async () => {
      await garderMateriel();
      const a = await demarrerProgramme(prog.id, joursRes, { choix: 'rien', minutes, ...(sansMarche ? { sansMarche: true } : {}) }, modules.filter((m) => possibles.some((x) => x.id === m)));
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
      <Ink size={28} weight="black" tight color={pal.texte} accessibilityRole="header">{titre}</Ink>
      {pourquoi ? <Ink size={14} weight="bold" color={pal.texte2}>{pourquoi}</Ink> : null}
    </View>
  );
  const titreSection = (t: string) => <Ink size={18} weight="black" tight color={pal.texte} accessibilityRole="header">{t}</Ink>;

  let corps: React.ReactNode = null;
  let bas: React.ReactNode = null;

  if (etape === 'intro') {
    // les questions qui restent après l'onboarding (sans compter le résultat)
    const restantes = suiteQuiz.filter((e) => e !== 'resultat').length;
    const sportLabel = sport !== 'non' ? AUTRES_SPORTS.find((s) => s.key === sport)?.label : null;
    const deja: { icone: IconName; teinte: string; fond: string; t: string }[] = [];
    if (profil?.objectifs.length) {
      deja.push({ icone: ICONE_OBJECTIF[profil.objectifs[0]] ?? 'target', teinte: pal.indigo, fond: pal.teinte, t: profil.objectifs.map((o) => traduire(OBJECTIFS_CHOIX.find((x) => x.key === o)?.label ?? '')).filter(Boolean).join(', ') });
    }
    if (connues.jours) deja.push({ icone: 'calendar', teinte: pal.orange, fond: pal.orangeTint, t: joursTexte(jours).replace(/^./, (x) => x.toUpperCase()) });
    if (connues.sport && sportLabel) deja.push({ icone: ICONE_SPORT[sport] ?? 'medal', teinte: pal.vert, fond: pal.vertTint, t: traduire(sportLabel) });
    corps = (
      <View style={{ gap: 16 }}>
        <Heros
          image={img}
          titre={traduire('Ton coach te prépare ton programme ?')}
          texte={deja.length ? traduirePluriel(restantes, restantes > 1, 'Il reprend tes réponses. Encore {0} question.', 'Il reprend tes réponses. Encore {0} questions.', restantes) : traduire('Quelques questions, moins d’une minute')}
        />
        {deja.length ? (
          <View style={{ backgroundColor: pal.carte, borderRadius: 24, padding: 16, gap: 12 }}>
            {titreSection(traduire('Tu nous l’as déjà dit'))}
            {deja.map((x) => (
              <View key={x.t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: x.fond, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={x.icone} size={20} color={x.teinte} />
                </View>
                <Ink size={14} weight="extraBold" color={pal.texte} style={{ flex: 1 }} numberOfLines={2}>{x.t}</Ink>
                <Icon name="check" size={18} color={pal.vert} />
              </View>
            ))}
            {connues.jours ? <PointsSemaine jours={jours} plein={pal.indigo} vide={pal.anneau} taille={16} /> : null}
          </View>
        ) : null}
      </View>
    );
    bas = (
      <View style={{ gap: 10 }}>
        <BoutonPlein label={traduire('Oui, c’est parti')} onPress={() => { tap(); aller('objectifs'); }} />
        <BoutonDoux label={traduire('Plus tard')} onPress={plusTard} />
      </View>
    );
  }

  if (etape === 'objectifs') {
    corps = (
      <View style={{ gap: 12 }}>
        <Heros image={img} titre={traduire('Ton objectif ?')} texte={prerempli ? traduire('Repris de tes réponses, ajuste si tu veux') : traduire('Plusieurs choix possibles')} />
        <CarteChoix grand role="checkbox" icone="book" teinte={0} label={traduire('Je n’y connais rien')} sous={traduire('YOROI te guide pas à pas')} on={debuter} onPress={() => basculerObjectif('debuter')} />
        <CarteChoix icone="list" teinte={1} label={traduire('Je sais déjà quel programme je veux')} on={false} fleche onPress={() => { tap(); ouvrirListe(); }} />
        <View style={{ marginTop: 8 }}>{titreSection(traduire('Tes objectifs'))}</View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {OBJECTIFS_CHOIX.filter((o) => o.key !== 'debuter').map((o, k) => (
            <TuileChoix key={o.key} icone={ICONE_OBJECTIF[o.key] ?? 'target'} teinte={k} label={traduire(o.label)} on={objectifs.includes(o.key)} onPress={() => basculerObjectif(o.key)} />
          ))}
        </View>
      </View>
    );
    bas = objectifs.length ? <BoutonPlein label={traduire('Suivant')} onPress={() => { tap(); suivante('objectifs'); }} /> : null;
  }

  if (etape === 'niveau') {
    const choix = courseSeule
      ? [{ key: 'debutant' as Niveau, label: 'Non, pas encore' }, { key: 'intermediaire' as Niveau, label: 'Oui' }]
      : NIVEAUX;
    corps = (
      <View style={{ gap: 12 }}>
        {titreEcran(courseSeule ? traduire('Tu cours déjà 30 minutes sans t’arrêter ?') : traduire('Depuis quand tu fais de la muscu ?'), traduire('Pour choisir un programme à ton niveau'))}
        {choix.map((n, k) => (
          <CarteChoix
            key={n.key}
            role="radio"
            grand
            teinte={courseSeule ? (k === 0 ? 1 : 2) : k}
            icone={courseSeule ? (k === 0 ? 'close' : 'check') : undefined}
            visuel={courseSeule ? undefined : (on, t) => <BarresNiveau n={k + 1} couleur={on ? '#FFFFFF' : t.encre} vide={on ? 'rgba(255,255,255,0.3)' : pal.carte} />}
            label={traduire(n.label)}
            on={niveau === n.key}
            onPress={() => { tap(); setNiveau(n.key); setTimeout(() => suivante('niveau'), 160); }}
          />
        ))}
      </View>
    );
  }

  if (etape === 'jours') {
    corps = (
      <View style={{ gap: 14 }}>
        {titreEcran(traduire('Tes jours disponibles'), traduire('Pour placer tes séances sur ta semaine'))}
        <View style={{ backgroundColor: pal.carte, borderRadius: 24, paddingHorizontal: 12, paddingVertical: 18 }}>
          <RangeeJours jours={jours} onBasculer={(d) => basculerJour(d, jours, setJours, false)} />
        </View>
        {jours.length === 1 ? <Ink size={13} weight="bold" color={pal.texte2}>{traduire(DEBUTANT)}</Ink> : null}
        {jours.length === 7 ? <Ink size={13} weight="bold" color={pal.texte2}>{traduire('Sept jours : garde au moins un jour de repos, le repos fait aussi le muscle.')}</Ink> : null}
        <CarteChoix icone="calendar" teinte={2} label={traduire('Je ne sais pas, choisis pour moi')} on={false} fleche onPress={() => { tap(); setJours([]); suivante('jours'); }} />
      </View>
    );
    bas = jours.length ? <BoutonPlein label={traduire('Suivant')} onPress={() => { tap(); suivante('jours'); }} /> : null;
  }

  if (etape === 'temps') {
    corps = (
      <View style={{ gap: 14 }}>
        {titreEcran(traduire('Combien de temps par séance ?'), traduire('Pour des séances qui rentrent dans ton temps'))}
        <TuilesTemps options={TEMPS_SEANCE} valeur={temps} onChoisir={(t) => { tap(); setTemps(t); marquer('temps'); setTimeout(() => suivante('temps'), 160); }} />
      </View>
    );
    bas = <BoutonPlein label={traduire('Suivant')} onPress={() => { tap(); marquer('temps'); suivante('temps'); }} />;
  }

  if (etape === 'sport') {
    corps = (
      <View style={{ gap: 12 }}>
        {titreEcran(traduire('Tu pratiques aussi un sport ?'), traduire('Pour que ta muscu aide ton sport, sans te fatiguer'))}
        {AUTRES_SPORTS.map((s, k) => (
          <CarteChoix key={s.key} role="radio" icone={ICONE_SPORT[s.key] ?? 'medal'} teinte={k} label={traduire(s.label)} on={sport === s.key} onPress={() => { tap(); setSport(s.key); setTimeout(() => suivante('sport'), 160); }} />
        ))}
      </View>
    );
    bas = <BoutonPlein label={traduire('Suivant')} onPress={() => { tap(); suivante('sport'); }} />;
  }

  if (etape === 'lieu') {
    corps = (
      <View style={{ gap: 12 }}>
        {titreEcran(traduire('Où tu t’entraînes ?'), traduire('Pour des exercices que tu peux vraiment faire'))}
        {LIEUX.map((l, k) => (
          <CarteChoix key={l.key} role="radio" grand icone={l.icone} teinte={k} label={traduire(l.label)} on={lieu === l.key} onPress={() => { tap(); setLieu(l.key); }} />
        ))}
      </View>
    );
    bas = <BoutonPlein label={traduire('Voir mon programme')} onPress={() => { tap(); marquer('lieu'); ouvrirResultat('quiz'); }} />;
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
            visuel={(on, t) => <BarresNiveau n={k + 1} couleur={on ? '#FFFFFF' : t.encre} vide={on ? 'rgba(255,255,255,0.3)' : pal.carte} />}
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
      { cle: 'jours', icone: 'calendar', teinte: pal.indigo, fond: pal.teinte, t: traduire('{0} jours par semaine', nJours ?? 0), vers: 'pjours' },
      { cle: 'temps', icone: 'clock', teinte: pal.orange, fond: pal.orangeTint, t: traduire(TEMPS_SEANCE.find((x) => x.key === temps)?.label ?? ''), vers: 'ptemps' },
      { cle: 'niveau', icone: 'gauge', teinte: pal.vert, fond: pal.vertTint, t: niveauSu ? traduire(libelleNiveau(niveauSu)) : '', vers: 'pniveau' },
    ];
    if (lieuVu) {
      const l = LIEUX.find((x) => x.key === lieuVu);
      if (l) lignes.push({ cle: 'lieu', icone: l.icone, teinte: pal.indigo, fond: pal.teinte, t: traduire(l.label), vers: 'plieu' });
    }
    corps = (
      <View style={{ gap: 14 }}>
        {titreEcran(traduire('Ton profil'), traduire('Repris de tes réponses, ajuste si tu veux'))}
        <View style={{ backgroundColor: pal.carte, borderRadius: 24, padding: 16, gap: 14 }}>
          {lignes.map((x) => (
            <View key={x.cle} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: x.fond, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={x.icone} size={20} color={x.teinte} />
              </View>
              <Ink size={15} weight="extraBold" color={pal.texte} style={{ flex: 1 }} numberOfLines={2}>{x.t}</Ink>
              <Pressable onPress={() => modifier(x.vers)} accessibilityRole="button" accessibilityLabel={`${traduire('Modifier')}, ${x.t}`} hitSlop={6} style={({ pressed }) => ({ minHeight: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: pressed ? pal.anneau : pal.teinte })}>
                <Ink size={13} weight="extraBold" color={pal.accent}>{traduire('Modifier')}</Ink>
              </Pressable>
            </View>
          ))}
          <PointsSemaine jours={joursConseilles(nJours ?? 0)} plein={pal.indigo} vide={pal.anneau} taille={16} />
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
            style={({ pressed }) => ({ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: pressed ? pal.anneau : pal.teinte })}
          >
            <Icon name="calendar" size={16} color={pal.accent} />
            <Ink size={14} weight="extraBold" color={pal.accent}>{traduire('{0} jours', env.jours)}</Ink>
            <Icon name="chevron" size={14} color={pal.accent} />
          </Pressable>
        ) : null}
        <TypesProgrammes groupes={GROUPES_PROGRAMMES} groupe={groupe} onChoisir={(id) => { tap(); setGroupe(id); setVoirAutres(false); }} />
        {!tri.exact ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 20, backgroundColor: pal.orangeTint }}>
            <Icon name="target" size={18} color={pal.orange} />
            <Ink size={13} weight="extraBold" color={pal.texte} style={{ flex: 1 }}>{traduire('Le plus proche de ce que tu veux')}</Ink>
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
              <Ink size={14} weight="extraBold" color={pal.texte2}>{traduire('Voir les autres programmes')}</Ink>
              <Icon name="chevron" size={14} color={pal.texte2} />
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
                <View key={x.id} style={{ borderRadius: 28, backgroundColor: pal.indigo, overflow: 'hidden', padding: 20, gap: 10, minHeight: 230 }}>
                  <Cercles />
                  {img ? <Image source={img} style={{ position: 'absolute', right: -6, bottom: 0, width: 128, height: 176 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
                  <View style={{ maxWidth: img ? '66%' : '100%', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 }}>
                      <Icon name="check" size={13} color="#FFFFFF" strokeWidth={3} />
                      <Ink size={12} weight="extraBold" color={c.onDark}>{x.conseille ? traduire('Conseillé pour toi') : traduire('Ton choix')}</Ink>
                    </View>
                    <Ink size={24} weight="black" tight color={c.onDark} numberOfLines={3} accessibilityRole="header">{traduire(px.titre)}</Ink>
                    <Ink size={13} weight="bold" color={c.onDarkSecondary} numberOfLines={3} style={{ lineHeight: 18 }}>{traduire(x.pourquoi)}</Ink>
                    <PointsSemaine jours={joursRes} plein="#FFFFFF" vide="rgba(255,255,255,0.2)" taille={20} />
                  </View>
                  <PucesCouvre couvre={x.couvre} surIndigo />
                  <View style={{ maxWidth: img ? '68%' : '100%' }}><PucesProgramme p={px} /></View>
                </View>
              ) : (
                <CarteProposition key={x.id} p={px} x={x} onPress={() => choisirProposition(x)} />
              );
            })}
            <CarteChoix icone="list" teinte={1} label={traduire('Voir tous les programmes')} on={false} fleche onPress={() => { tap(); ouvrirListe(); }} />
          </View>
        ) : (
        <View style={{ borderRadius: 28, backgroundColor: pal.indigo, overflow: 'hidden', padding: 20, gap: 10, minHeight: 230 }}>
          <Cercles />
          {img ? <Image source={img} style={{ position: 'absolute', right: -6, bottom: 0, width: 136, height: 184 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
          <View style={{ maxWidth: img ? '64%' : '100%', gap: 8 }}>
            <View style={{ alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 }}>
              <Ink size={12} weight="extraBold" color={c.onDark}>{duConseil ? traduire('Conseillé pour toi') : traduire('Ton programme')}</Ink>
            </View>
            <Ink size={24} weight="black" tight color={c.onDark} numberOfLines={3} accessibilityRole="header">{traduire(prog.titre)}</Ink>
            <Ink size={13} weight="bold" color={c.onDarkSecondary} numberOfLines={4} style={{ lineHeight: 18 }}>{traduire(duConseil ? conseil!.pourquoi : prog.accroche)}</Ink>
            <View style={{ marginTop: 2 }}>
              <PointsSemaine jours={joursRes} plein="#FFFFFF" vide="rgba(255,255,255,0.2)" taille={20} />
            </View>
          </View>
          <View style={{ maxWidth: img ? '68%' : '100%' }} accessible accessibilityLabel={traduire('{0} j par semaine, {1} min', prog.joursParSemaine, prog.dureeMin)}>
            <PucesProgramme p={prog} />
          </View>
        </View>
        )}

        {duConseil && conseil!.dureeTropLongue ? (
          <Ink size={13} weight="bold" color={pal.texte2}>{traduire('Moins de temps un jour ? La page du programme propose une séance express.')}</Ink>
        ) : null}
        {duConseil && conseil!.principeSport ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: pal.carte }}>
            <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: pal.orangeTint, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="target" size={22} color={pal.orange} />
            </View>
            <Ink size={13} weight="bold" color={pal.texte} style={{ flex: 1, lineHeight: 18 }}>{traduire(conseil!.principeSport!)}</Ink>
          </View>
        ) : null}

        <View style={{ gap: 12, backgroundColor: pal.carte, borderRadius: 24, padding: 16 }}>
          {titreSection(traduire('Tes jours'))}
          <RangeeJours jours={joursRes} onBasculer={(d) => basculerJour(d, joursRes, setJoursRes, true)} />
          <Ink size={12} weight="bold" color={pal.texte2}>{conseilJours(prog.joursParSemaine, joursRes.length)}</Ink>
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Puce label={traduire('Je les garde')} on={!sansMarche} onPress={() => { tap(); setSansMarche(false); }} />
              <Puce label={traduire('Je les retire')} on={sansMarche} onPress={() => { tap(); setSansMarche(true); }} />
            </View>
          </View>
        ) : null}

        {duConseil && conseil!.guideDebutant ? (
          <CarteChoix icone="scale" teinte={2} label={traduire('Trouver ton poids de départ')} on={false} fleche onPress={() => { tap(); setGuide(true); }} />
        ) : null}

        {chemin === 'quiz' && conseils.length ? (
          <View style={{ gap: 10 }}>
            <View style={{ gap: 2 }}>
              {titreSection(traduire('Les conseils du coach'))}
              <Ink size={13} weight="bold" color={pal.texte2}>{traduire('Pour chacun de tes objectifs, ce qui marche vraiment')}</Ink>
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
    <View style={{ flex: 1, backgroundColor: pal.page }}>
      {/* en-tête : retour, progression, Plus tard */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={retour} accessibilityRole="button" accessibilityLabel={traduire('Retour')} style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, backgroundColor: pal.carte, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] })}>
          <Icon name="chevronLeft" size={20} color={pal.texte} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center' }} accessible accessibilityLabel={traduire('Étape {0} sur {1}', rang + 1, suiteVue.length)}>
          {etape === 'intro' || etape === 'attente'
            ? null
            : suiteVue.map((e, k) => (
                <View key={e} style={{ height: 6, flex: 1, maxWidth: 34, borderRadius: 3, backgroundColor: k <= rang ? pal.indigo : pal.anneau }} />
              ))}
        </View>
        <Pressable onPress={plusTard} accessibilityRole="button" hitSlop={8} style={{ minHeight: 46, paddingHorizontal: 6, justifyContent: 'center' }}>
          <Ink size={14} weight="extraBold" color={pal.texte2}>{traduire('Plus tard')}</Ink>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {corps}
      </ScrollView>

      {bas ? <View style={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 14, backgroundColor: pal.page }}>{bas}</View> : null}

      <FeuillePoidsDeDepart visible={guide} onClose={() => setGuide(false)} />
      <FeuillePourquoi explication={pourquoi} onClose={() => setPourquoi(null)} />
    </View>
  );
}

/* ------------------------------------------------ morceaux ------------------------------------------------ */

/** La carte indigo du premier écran, le personnage à droite */
function Heros({ image, titre, texte }: { image: ReturnType<typeof sportImage>; titre: string; texte?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  return (
    <View style={{ borderRadius: 28, backgroundColor: pal.indigo, overflow: 'hidden', padding: 20, minHeight: 170, justifyContent: 'center' }}>
      <Cercles />
      {image ? <Image source={image} style={{ position: 'absolute', right: 0, bottom: 0, width: 128, height: 170 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      <View style={{ maxWidth: image ? '62%' : '100%', gap: 6 }}>
        <Ink size={12} weight="extraBold" color={c.onDarkSecondary}>{traduire('Ton coach')}</Ink>
        <Ink size={24} weight="black" tight color={c.onDark} accessibilityRole="header">{titre}</Ink>
        {texte ? <Ink size={13} weight="bold" color={c.onDarkSecondary}>{texte}</Ink> : null}
      </View>
    </View>
  );
}

/** Les objectifs que couvre un programme : coche s'il le fait lui même, plus s'il passe par un module */
function PucesCouvre({ couvre, surIndigo }: { couvre: Proposition['couvre']; surIndigo?: boolean }) {
  const pal = usePaletteProgramme();
  if (!couvre.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {couvre.map((x) => {
        const label = traduire(OBJECTIFS_CHOIX.find((o) => o.key === x.objectif)?.label ?? '');
        const mod = x.via === 'module' ? moduleParId(x.module!) : undefined;
        const texte = mod ? traduire('{0}, module {1}', label, traduire(mod.label)) : label;
        const fond = surIndigo ? 'rgba(255,255,255,0.16)' : x.via === 'programme' ? pal.vertTint : pal.teinte;
        const encre = surIndigo ? '#FFFFFF' : x.via === 'programme' ? pal.vert : pal.accent;
        return (
          <View key={x.objectif} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: fond }}>
            <Icon name={x.via === 'programme' ? 'check' : 'plus'} size={12} color={encre} strokeWidth={3} />
            <Ink size={12} weight="extraBold" color={encre}>{texte}</Ink>
          </View>
        );
      })}
    </View>
  );
}

/** Une proposition « Pour toi » non choisie : carte blanche, ses jours, ce qu'elle couvre ; toucher la choisit */
function CarteProposition({ p, x, onPress }: { p: Programme; x: Proposition; onPress: () => void }) {
  const pal = usePaletteProgramme();
  const titre = traduire(p.titre);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: false }}
      accessibilityLabel={[x.conseille ? traduire('Conseillé pour toi') : '', titre, traduire('{0} jours', p.joursParSemaine), traduire('{0} min', p.dureeMin)].filter(Boolean).join(', ')}
      style={({ pressed }) => ({ borderRadius: 24, padding: 16, gap: 12, backgroundColor: pressed ? pal.teinte : pal.carte })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 58, height: 58, borderRadius: 19, backgroundColor: pal.teinte, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={22} weight="black" tight color={pal.accent}>{String(p.joursParSemaine)}</Ink>
          <Ink size={10} weight="extraBold" color={pal.accent}>{traduire('jours')}</Ink>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          {x.conseille ? <Ink size={11} weight="extraBold" color={pal.accent}>{traduire('Conseillé pour toi')}</Ink> : null}
          <Ink size={16} weight="black" tight color={pal.texte} numberOfLines={2}>{titre}</Ink>
          <Ink size={12} weight="bold" color={pal.texte2}>{traduire('{0} min', p.dureeMin)}</Ink>
        </View>
        <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: pal.anneau }} />
      </View>
      <PucesCouvre couvre={x.couvre} />
    </Pressable>
  );
}

/** Puce de choix court (groupe de programmes, durée du cardio) */
function Puce({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pal.indigo : pressed ? pal.teinte : pal.carte })}
    >
      <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? c.onDark : pal.texte}>{label}</Ink>
    </Pressable>
  );
}

function BoutonPlein({ label, onPress, grand, icone }: { label: string; onPress: () => void; grand?: boolean; icone?: IconName }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: grand ? 62 : 56, borderRadius: 999, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: pal.indigo, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], shadowColor: pal.indigo, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 })}
    >
      {icone ? <Icon name={icone} size={18} color={c.onDark} /> : null}
      <Ink size={grand ? 18 : 16} weight="black" color={c.onDark}>{label}</Ink>
    </Pressable>
  );
}

function BoutonDoux({ label, onPress }: { label: string; onPress: () => void }) {
  const pal = usePaletteProgramme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pal.teinte : pal.carte })}>
      <Ink size={15} weight="extraBold" color={pal.indigo}>{label}</Ink>
    </Pressable>
  );
}
