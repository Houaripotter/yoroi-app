/**
 * « Je construis le mien » (27 octobre 2026), maquette choisie par Houari : Coach2-C-Construis, avec le choix par
 * muscle de Coach2-B-Construis (ChoixParMuscle.tsx). Un vrai outil, ouvert depuis le coach (« Créer mon programme »)
 * ou depuis la page de ton programme (« Modifier mon programme », paramètre id).
 *
 * 30 octobre 2026, refonte « Ta semaine en briques » (maquette validée : _propositions/ta_semaine_2026-10-30).
 * Houari : « je n'arrive pas à mettre le Push et le Pull deux fois par semaine, ni à faire PPL avec Upper Lower ».
 *  - Tes séances : une rangée de briques (Push, Pull, Jambes, Haut, Bas, Corps entier, un muscle, Abdos, Cardio,
 *    Mobilité, les tiennes). Toucher une brique ouvre ses exercices : un changement vaut pour tous les jours où
 *    elle est posée (lib/v2/programmes/briques.ts).
 *  - Ta semaine : sept cases compactes. Toucher un jour ouvre une feuille avec toutes les briques, rangées en
 *    Classiques, Par muscle, Cardio et abdos : un toucher pose la séance. Repos, Créer une séance, Depuis mes
 *    séances et Une séance d'un autre programme y sont aussi.
 *  - Partir d'un modèle : douze raccourcis aux titres complets, les quatre premiers d'abord
 *    (lib/v2/programmes/modelesSemaine.ts). Un modèle pose ses briques, tout reste modifiable.
 *  - Semaine A et Semaine B au dessus de ta semaine quand elles alternent ; les briques valent pour les deux.
 *  - Enregistrer en bas, pleine largeur, en couleur pleine ; il dit ce qui manque (« Pose au moins une séance »).
 *  - Le rappel, plus discret, en bas de page.
 * Enregistrer : ton programme devient le programme en cours (suivi.ts, suivreProgrammePerso). « Supprimer »
 * l'archive après confirmation : tes séances faites restent. Le modèle est dans lib/v2/programmes/monProgramme.ts.
 * Un programme archivé ne s'ouvre jamais ici : tu repars d'un programme neuf.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { PisteInterrupteur } from '@/components/yoroi/Interrupteur';
import Animated, { FadeIn, LinearTransition, ZoomIn } from 'react-native-reanimated';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { playBadgeSound } from '@/lib/soundManager';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { ombrePastel, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import type { FamillePastel, PastelCoach } from '@/components/yoroi/v2/programmes/Habillage';
import { ChoixParMuscle, seriesTexte } from '@/components/yoroi/v2/programmes/ChoixParMuscle';
import { ExercisePicker } from '@/components/yoroi/v2/seance/ExercisePicker';
import { ChoixFinCompact } from '@/components/yoroi/v2/programmes/ReglagesFin';
import { TimeField } from '@/components/yoroi/v2/notifications/parts';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { buildExerciseHistory } from '@/lib/v2/seance/history';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { chargerMesSeances } from '@/lib/v2/seance/mesSeances';
import type { MaSeance } from '@/lib/v2/seance/mesSeances';
import { chargerEcartes, nomsEcartes } from '@/lib/v2/seances/exercicesEcartes';
import { alternativesCardio } from '@/lib/v2/seances/cardioFin';
import { PROGRAMMES, programmeParId } from '@/lib/v2/programmes/catalogue';
import { MODELES_VISIBLES, joursDuModele, modelesDisponibles, nomCourt, seanceDepuisJour, semaineDuModele, semaineEgaleAuModele } from '@/lib/v2/programmes/modelesSemaine';
import type { ModeleSemaine } from '@/lib/v2/programmes/modelesSemaine';
import { BRIQUES, GROUPES_BRIQUES, MINUTES_CARDIO, briqueParId, briquesDuPerso, creerBrique, estExoCardio, joursAPrevenir, joursDeBrique, modifierBrique, poserBrique, seanceDeCle } from '@/lib/v2/programmes/briques';
import type { DefBrique, TeinteBrique } from '@/lib/v2/programmes/briques';
import {
  avecExo, deplacerExo, exoDepuisNom, joursDuPerso, nombreSeances, nouveauProgrammePerso, peutEnregistrer,
  programmePersoParId, reglerExo, sansExo, titreDeSeance, enregistrerProgrammePerso, CLE_PROGRAMMES_PERSO, semaineVide, joursDeSeancePerso,
} from '@/lib/v2/programmes/monProgramme';
import type { ProgrammePerso, RappelPerso, SeancePerso } from '@/lib/v2/programmes/monProgramme';
import { appliquerRappelProgramme, lireRappelSeance } from '@/lib/v2/programmes/rappelProgramme';
import { TamponValide } from '@/components/yoroi/v2/seances/TamponValide';
import { addDaysISO } from '@/lib/v2/seances/sessionData';
import { mondayOf } from '@/lib/v2/trainingWeek';
import { localISO } from '@/lib/v2/accueil/hydration';
import { HEURES_RAPPEL, estAutreHeure, libelleHeureRappel } from '@/lib/v2/programmes/rappel';
import { chargerProgrammeActif, enFileProgramme, suivreProgrammePerso, supprimerProgrammePerso } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { ExoProgramme, JourProgramme } from '@/lib/v2/programmes/types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { useConfirmerSortie } from '@/lib/v2/saisie/useConfirmerSortie';
import { logger } from '@/lib/security/logger';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const REPS: [number, number][] = [[5, 8], [8, 12], [10, 15], [15, 20]];
const SECONDES: [number, number][] = [[20, 30], [30, 45], [45, 60]];
const REPOS = [60, 90, 120, 180];
const majuscule = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);
/** Ce qui compte pour savoir si tu as changé quelque chose (les séances vides ne comptent pas) */
const plein = (l: readonly (SeancePerso | null)[] | undefined) => (l ?? []).map((s) => (s && s.exos.length ? s : null));
const empreinte = (x: ProgrammePerso, r: RappelPerso) => JSON.stringify([x.nom.trim(), plein(x.semaine), r.actif, r.heure, ...(x.semaineB ? [plein(x.semaineB)] : []), (x.briques ?? []).filter((s) => s.exos.length), ...(x.fin ? [x.fin] : [])]);
/** 30 octobre 2026 : la semaine B s'affiche à la place de A (et inversement) ; tout ce qui est enregistré repasse par A */
const echanger = (x: ProgrammePerso): ProgrammePerso => ({ ...x, semaine: x.semaineB ?? semaineVide(), semaineB: x.semaine });
const nouveauVide: ProgrammePerso = { id: '', nom: '', semaine: [null, null, null, null, null, null, null], creeLe: '', modifieLe: '' };
const AUCUN: ReadonlySet<string> = new Set();

/** Les séances des programmes du catalogue qu'on peut poser (des exercices, ni rounds ni cardio) */
const AUTRES_PROGRAMMES = PROGRAMMES
  .map((p) => ({ p, jours: p.jours.filter((j) => !j.rounds && !j.cardio && j.exos.length > 0) }))
  .filter((x) => x.jours.length > 0);

/** L'habillage d'une brique : sa couleur franche, son fond, son sticker */
type Habit = { f: FamillePastel; sticker: NomSticker };
function familleDe(pa: PastelCoach, t: TeinteBrique): FamillePastel {
  if (t === 'nuit') return { fond: pa.choisi, titre: pa.coche, barre: pa.coche, barre2: pa.bordChoisi, encre: pa.coche };
  return pa[t];
}

export default function CoachConstruire() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pa = usePastel();
  const illus = useIllustrations();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [pp, setPp] = useState<ProgrammePerso>(() => nouveauProgrammePerso());
  // 30 octobre 2026 : la semaine montrée, A ou B (semaines qui alternent) ; « normal » est toujours ton programme dans l'ordre
  const [vue, setVue] = useState<'a' | 'b'>('a');
  const normal = vue === 'b' ? echanger(pp) : pp;
  const avecAB = !!normal.ab && !!normal.semaineB;
  const [existe, setExiste] = useState(false);
  const [pret, setPret] = useState(!id);
  // la brique ouverte (ses exercices), le jour dont la feuille est ouverte
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [feuille, setFeuille] = useState<number | null>(null);
  const [parMuscle, setParMuscle] = useState<string | null>(null);
  const [chercher, setChercher] = useState<string | null>(null);
  const [mesSeancesPour, setMesSeancesPour] = useState<number | null>(null);
  const [autresPour, setAutresPour] = useState<number | null>(null);
  const [aRegler, setARegler] = useState<{ cle: string; index: number } | null>(null);
  const [tousModeles, setTousModeles] = useState(false);
  const [ecartes, setEcartes] = useState<ReadonlySet<string>>(AUCUN);
  const [rappel, setRappel] = useState<RappelPerso>({ actif: false, heure: '18:00' });
  const [autreHeure, setAutreHeure] = useState(false);
  const [refuse, setRefuse] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [mesSeances, setMesSeances] = useState<MaSeance[]>([]);
  // ce qui était enregistré en ouvrant l'écran : en sortant sans enregistrer, on te demande
  const [depart, setDepart] = useState('');
  // la fête quand ton programme est prêt : son de badge, vibration de réussite
  const [fete, setFete] = useState<{ id: string; n: number; premier: string } | null>(null);
  // 1er novembre 2026 : abdos et cardio en fin de séance, touchés ici (sinon ceux du programme en cours restent)
  const [finTouchee, setFinTouchee] = useState(false);
  const historique = useMemo(() => buildExerciseHistory(trainings), [trainings]);
  // 31 octobre 2026 : les jours faits cette semaine, montrés seulement sur ton programme en cours
  const aujourdhuiIso = localISO();
  const lundiCourant = mondayOf(aujourdhuiIso);
  const suiviIci = !!actif && actif.id === pp.id;
  // ton programme en cours garde sa fin de séance (réglée aussi depuis sa page) tant que tu ne la changes pas ici
  const finVue = suiviIci && actif?.fin && !finTouchee ? actif.fin : pp.fin;
  const joursFaits = useMemo(() => new Set(trainings.map((t) => String(t.date ?? '').slice(0, 10)).filter((x) => x >= lundiCourant && x <= aujourdhuiIso)), [trainings, lundiCourant, aujourdhuiIso]);

  useEffect(() => {
    let vivant = true;
    chargerProgrammeActif().then((a) => { if (vivant) setActif(a); }).catch(() => {});
    getTrainings().then((t) => { if (vivant) setTrainings(t ?? []); }).catch(() => {});
    chargerMesSeances().then((l) => { if (vivant) setMesSeances(l.filter((s) => s.exos.length)); }).catch(() => {});
    // tes exercices écartés : les briques et les modèles les remplacent
    chargerEcartes().then((l) => { if (vivant) setEcartes(nomsEcartes(l)); }).catch(() => {});
    const r = lireRappelSeance();
    if (id) {
      Promise.all([programmePersoParId(id), r])
        .then(([x, rs]) => {
          if (!vivant) return;
          if (x && !x.archive) {
            setPp(x);
            setDepart(empreinte(x, x.rappel ?? rs));
            setExiste(true);
            setRappel(x.rappel ? { ...x.rappel } : rs);
            setAutreHeure(estAutreHeure((x.rappel ?? rs).heure));
          } else {
            setRappel(rs);
          }
        })
        .finally(() => { if (vivant) setPret(true); });
    } else {
      void r.then((rs) => { if (vivant) { setRappel(rs); setAutreHeure(estAutreHeure(rs.heure)); } });
    }
    return () => { vivant = false; };
  }, [id]);

  const n = nombreSeances(pp);
  const peut = peutEnregistrer(normal);
  const modifie = pret && empreinte(normal, rappel) !== (depart || empreinte(nouveauVide, rappel));
  // 28 octobre 2026 : le glissement retour de l'iPhone et le retour d'Android demandent aussi, comme la fleche
  const { laisserPartir } = useConfirmerSortie(modifie && peutEnregistrer(normal), {
    titre: traduire('Enregistrer ton programme ?'),
    message: traduire('Tu as fait des changements.'),
    enregistrer: () => enregistrer(),
  });
  const sortir = () => {
    tap();
    const go = () => { laisserPartir(); if (router.canGoBack()) router.back(); else router.replace('/coach' as any); };
    if (!modifie || !peut) { go(); return; }
    appAlert(traduire('Enregistrer ton programme ?'), traduire('Tu as fait des changements.'), [
      { text: traduire('Quitter sans enregistrer'), style: 'destructive', onPress: go },
      { text: traduire('Enregistrer'), onPress: () => void enregistrer() },
    ]);
  };

  /* ---------------------------------- les briques ---------------------------------- */
  const tiennes = useMemo(() => briquesDuPerso(pp), [pp]);
  const seanceCle = (cle: string): SeancePerso | undefined => seanceDeCle(pp, cle, ecartes);
  const changerBrique = (cle: string, f: (s: SeancePerso) => SeancePerso) => setPp((x) => modifierBrique(x, cle, f, ecartes));
  const habitDe = (cle: string, rang = 0): Habit => {
    const def = briqueParId(cle) ?? BRIQUES.find((b) => b.titre === seanceCle(cle)?.titre);
    if (def) return { f: familleDe(pa, def.teinte), sticker: def.sticker };
    const l: TeinteBrique[] = ['bleu', 'peche', 'menthe', 'lilas', 'creme'];
    return { f: familleDe(pa, l[rang % l.length]), sticker: 'carnet' };
  };
  // les briques à toi (pas du catalogue), dans l'ordre de ta semaine
  const aToi = tiennes.filter((x) => !briqueParId(x.cle));
  // la rangée : tes briques posées d'abord, puis tout le catalogue, puis tes autres briques
  const rangee = Array.from(new Set([...tiennes.filter((x) => x.jours.length > 0).map((x) => x.cle), ...BRIQUES.map((b) => b.id), ...aToi.map((x) => x.cle)]));

  const ouvrirBrique = (cle: string) => { tap(); setOuverte((o) => (o === cle ? null : cle)); };
  const basculerExo = (cle: string, e: ExoProgramme) => changerBrique(cle, (s) => {
    const i = s.exos.findIndex((x) => x.nom === e.nom);
    return i >= 0 ? sansExo(s, i) : avecExo(s, { ...e });
  });
  /** Un toucher dans la feuille : la brique va sur ce jour ; vide, ses exercices s'ouvrent tout de suite */
  const poser = (d: number, cle: string | null) => {
    tap();
    const s = cle ? seanceCle(cle) : null;
    setPp((x) => poserBrique(x, d, cle, ecartes));
    setFeuille(null);
    if (cle && (!s || !s.exos.length)) setOuverte(cle);
  };
  const creerEtPoser = (d: number | null, s: Omit<SeancePerso, 'brique' | 'sid'>) => {
    const r = creerBrique(pp, s);
    setPp(d === null ? r.pp : poserBrique(r.pp, d, r.cle, ecartes));
    if (!s.exos.length) setOuverte(r.cle);
    return r.cle;
  };
  // une feuille puis une autre : la première se ferme d'abord (deux feuilles ouvertes ensemble bloquent l'iPhone)
  const ensuite = (f: () => void) => { setFeuille(null); setTimeout(f, 380); };

  const enregistrer = async () => {
    if (occupe) return;
    if (!peut) {
      appAlert(traduire('Pose au moins une séance'), traduire('Touche un jour de ta semaine, puis choisis une séance.'));
      return;
    }
    const go = async () => {
      setOccupe(true);
      try {
        // 30 octobre 2026 : dans la file de tes programmes (suivi.ts), jamais en même temps qu'un autre enregistrement
        const sauve = await enFileProgramme(CLE_PROGRAMMES_PERSO, () => enregistrerProgrammePerso({ ...normal, rappel }));
        // 1er novembre 2026 : ta fin de séance (abdos, cardio) suit seulement si tu l'as changée ici
        await suivreProgrammePerso(finTouchee ? sauve : { ...sauve, fin: undefined });
        // 30 octobre 2026 : les jours de ta semaine B aussi ; chaque date suit ensuite ta semaine (joursPourRappels)
        const r = await appliquerRappelProgramme(rappel, joursDeSeancePerso(sauve));
        if (r === 'refuse') {
          setRefuse(true);
          setRappel((x) => ({ ...x, actif: false }));
        }
        const jours = joursDuPerso(sauve);
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        void playBadgeSound().catch(() => undefined);
        setDepart(empreinte(sauve, rappel));
        setExiste(true);
        setPp(sauve);
        setVue('a');
        setOuverte(null);
        setFete({ id: sauve.id, n: jours.length, premier: jours.length ? JOURS[jours[0]] : '' });
      } catch (e) {
        logger.error('[Coach] programme perso non enregistre', e);
        appAlert(traduire('Enregistrement impossible'), traduire('Réessaie dans un instant.'));
      } finally {
        setOccupe(false);
      }
    };
    if (actif && actif.id !== pp.id) {
      const ancien = programmeParId(actif.id);
      appAlert(traduire('Changer de programme ?'), traduire('Tu suis « {0} ». Tes séances déjà faites restent dans ton historique.', traduire(ancien?.titre ?? '')), [
        { text: traduire('Annuler'), style: 'cancel' },
        { text: traduire('Changer'), onPress: () => void go() },
      ]);
      return;
    }
    tap();
    await go();
  };

  const supprimer = () => {
    appAlert(traduire('Supprimer ce programme ?'), traduire('Tes séances déjà faites restent dans ton historique.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: () => {
          // 28 octobre 2026 : un echec est dit, et l'ecran reste ouvert (avant : on repartait comme si c'etait fait)
          void supprimerProgrammePerso(pp.id)
            .then(() => {
              laisserPartir();
              if (router.canGoBack()) router.back();
              else router.replace('/coach' as any);
            })
            .catch((e) => {
              logger.error('[Coach] programme perso non supprime', e);
              appAlert(traduire('Oups'), traduire('Ton programme n’a pas pu être supprimé, réessaie.'));
            });
        },
      },
    ]);
  };

  // partir d'un modèle : il pose ses briques sur ses jours ; si ta semaine a déjà des séances, on te demande avant
  const modeles = useMemo(() => modelesDisponibles(), []);
  const modelesMontres = tousModeles ? modeles : modeles.slice(0, MODELES_VISIBLES);
  const partirDuModele = (m: ModeleSemaine) => {
    const go = () => {
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      setOuverte(null);
      setPp((x) => ({ ...x, semaine: semaineDuModele(m, ecartes) }));
    };
    tap();
    if (!n || semaineEgaleAuModele(pp.semaine, m, ecartes)) { go(); return; }
    appAlert(traduire('Remplacer ta semaine ?'), traduire('Tes jours seront remplis avec ce modèle. Tu pourras tout changer ensuite.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Remplacer'), onPress: go },
    ]);
  };
  const joursTexte = (l: number[]) => (l.length === 6 && !l.includes(6) ? traduire('Du lundi au samedi') : l.length === 5 && !l.includes(5) && !l.includes(6) ? traduire('Du lundi au vendredi') : l.map((d) => traduire(JOURS_COURTS[d])).join(', '));

  const sOuverte = ouverte ? seanceCle(ouverte) : undefined;
  const reglage = aRegler ? seanceCle(aRegler.cle)?.exos[aRegler.index] ?? null : null;
  const sousBrique = (s: SeancePerso | undefined) => {
    if (!s || !s.exos.length) return traduire('À remplir');
    const c = s.exos.find(estExoCardio);
    if (c && s.exos.length === 1) return traduire('{0} min', c.minutes);
    return traduirePluriel(s.exos.length, s.exos.length > 1, '{0} exercice', '{0} exercices', s.exos.length);
  };

  if (!pret) return <View style={{ flex: 1, backgroundColor: pa.page }} />;

  /** Une tuile de brique dans la feuille du jour */
  const tuile = (cle: string, d: number, rang = 0) => {
    const s = seanceCle(cle);
    const h = habitDe(cle, rang);
    const ici = pp.semaine[d]?.brique === cle;
    const titre = traduire(s ? titreDeSeance(s) : briqueParId(cle)?.titre ?? '');
    return (
      <Pressable
        key={cle}
        onPress={() => poser(d, cle)}
        accessibilityRole="button"
        accessibilityState={{ selected: ici }}
        accessibilityLabel={`${titre}, ${sousBrique(s)}${ici ? `, ${traduire('Posée')}` : ''}`}
        style={({ pressed }) => ({ width: '31.6%', minHeight: 112, borderRadius: 20, padding: 9, gap: 4, justifyContent: 'space-between', backgroundColor: h.f.fond, borderWidth: 2.5, borderColor: ici ? h.f.titre : 'transparent', transform: [{ scale: pressed ? 0.96 : 1 }] })}
      >
        {illus.stickers ? <Image source={illus.img(h.sticker)} style={{ width: 46, height: 46 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <View style={{ height: 8 }} />}
        {ici ? (
          <View style={{ position: 'absolute', top: 7, right: 7, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: h.f.titre }}>
            <Ink size={11} weight="black" color={pa.surCoche}>{traduire('Posée')}</Ink>
          </View>
        ) : null}
        <View>
          <Ink size={14} weight="black" color={pa.texte} style={{ lineHeight: 17 }}>{titre}</Ink>
          <Ink size={12} weight="extraBold" color={h.f.titre}>{sousBrique(s)}</Ink>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: pa.page }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 120, width: '100%', maxWidth: 720, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        {/* en tête */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={sortir}
            accessibilityRole="button"
            accessibilityLabel={traduire('Retour')}
            style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.94 : 1 }] }, ombrePastel(pa.ombre)]}
          >
            <Icon name="chevronLeft" size={18} color={pa.texte} />
          </Pressable>
          <Ink size={24} weight="black" color={pa.texte} accessibilityRole="header" style={{ flex: 1, lineHeight: 29 }}>{existe ? traduire('Mon programme') : traduire('Je construis le mien')}</Ink>
        </View>

        {/* le nom, facultatif */}
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, marginTop: 14, paddingLeft: 10, paddingRight: 16, borderRadius: 22, backgroundColor: pa.carte }, ombrePastel(pa.ombre)]}>
          {illus.stickers ? <Image source={illus.img('crayon')} style={{ width: 32, height: 32 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
          <TextInput
            value={pp.nom}
            onChangeText={(t) => setPp((x) => ({ ...x, nom: t.slice(0, 40) }))}
            placeholder={traduire('Nom du programme, facultatif')}
            placeholderTextColor={pa.texte2}
            accessibilityLabel={traduire('Nom du programme')}
            returnKeyType="done"
            style={{ flex: 1, minHeight: 48, fontSize: 15, fontWeight: '700', color: pa.texte }}
          />
        </View>

        {/* A. TES SÉANCES : les briques */}
        <Titre sticker="barre" titre={traduire('Tes séances')} />
        <Ink size={13.5} weight="bold" color={pa.texte2} style={{ marginTop: 3, marginHorizontal: 1, lineHeight: 19 }}>
          {n ? traduire('Touche une séance pour changer ses exercices, partout où elle est posée.') : traduire('Touche une séance pour choisir ses exercices.')}
        </Ink>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginTop: 10 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 10 }}>
          {rangee.map((cle, k) => {
            const s = seanceCle(cle);
            const h = habitDe(cle, k);
            const ou = joursDeBrique(pp, cle);
            const on = ouverte === cle;
            const titre = traduire(s ? titreDeSeance(s) : briqueParId(cle)?.titre ?? '');
            return (
              <Pressable
                key={cle}
                onPress={() => ouvrirBrique(cle)}
                accessibilityRole="button"
                accessibilityState={{ expanded: on }}
                accessibilityLabel={`${titre}, ${sousBrique(s)}${ou.length ? `, ${ou.map((d) => traduire(JOURS[d])).join(', ')}` : ''}`}
                style={({ pressed }) => [{ width: 116, minHeight: 132, borderRadius: 22, padding: 10, paddingBottom: 12, gap: 6, justifyContent: 'space-between', backgroundColor: h.f.fond, borderWidth: 2.5, borderColor: on ? h.f.titre : 'transparent', transform: [{ scale: pressed ? 0.96 : 1 }] }, ombrePastel(pa.ombre)]}
              >
                {illus.stickers ? <Image source={illus.img(h.sticker)} style={{ width: 52, height: 52, marginLeft: -2, marginTop: -2 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <View style={{ height: 8 }} />}
                <View>
                  <Ink size={15} weight="black" color={pa.texte} style={{ lineHeight: 18 }}>{titre}</Ink>
                  <Ink size={12.5} weight="extraBold" color={s && s.exos.length ? h.f.titre : pa.texte2} style={{ marginTop: 2 }}>{sousBrique(s)}</Ink>
                  {ou.length ? <Ink size={12.5} weight="extraBold" color={h.f.titre}>{ou.map((d) => traduire(JOURS_COURTS[d])).join(', ')}</Ink> : null}
                </View>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => { tap(); creerEtPoser(null, { titre: traduire('Ma séance'), exos: [] }); }}
            accessibilityRole="button"
            accessibilityLabel={traduire('Créer une séance')}
            style={({ pressed }) => ({ width: 116, minHeight: 132, borderRadius: 22, padding: 10, paddingBottom: 12, justifyContent: 'space-between', backgroundColor: pressed ? pa.choisi : pa.carte, borderWidth: 2, borderStyle: 'dashed', borderColor: pa.bordChoisi })}
          >
            {illus.stickers ? <Image source={illus.img('crayon')} style={{ width: 52, height: 52, marginLeft: -2, marginTop: -2 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <View style={{ height: 8 }} />}
            <View>
              <Ink size={15} weight="black" color={pa.coche} style={{ lineHeight: 18 }}>{traduire('Créer une séance')}</Ink>
              <Ink size={12.5} weight="extraBold" color={pa.texte2} style={{ marginTop: 2 }}>{traduire('Tes exercices')}</Ink>
            </View>
          </Pressable>
        </ScrollView>

        {/* la brique ouverte : ses exercices, une seule fois pour tous ses jours */}
        {ouverte && sOuverte ? (
          <Animated.View entering={FadeIn.duration(220)} layout={LinearTransition.duration(220)} style={{ marginTop: 10 }}>
            <BriqueOuverte
              s={sOuverte}
              habit={habitDe(ouverte, Math.max(0, aToi.findIndex((x) => x.cle === ouverte)))}
              jours={joursDeBrique(pp, ouverte).map((d) => traduire(JOURS[d]))}
              ecartes={ecartes}
              onFermer={() => ouvrirBrique(ouverte)}
              onNom={(t) => changerBrique(ouverte, (s) => ({ ...s, titre: t || undefined }))}
              onRegler={(i) => { tap(); setARegler({ cle: ouverte, index: i }); }}
              onParMuscle={() => { tap(); setParMuscle(ouverte); }}
              onChercher={() => { tap(); setChercher(ouverte); }}
              onCardio={(r) => changerBrique(ouverte, (s) => ({ ...s, exos: s.exos.map((e) => (estExoCardio(e) ? { ...e, ...(r.nom ? { nom: r.nom } : {}), ...(r.minutes ? { minutes: r.minutes } : {}) } : e)) }))}
            />
          </Animated.View>
        ) : null}

        {/* B. TA SEMAINE : sept cases, un toucher ouvre la feuille du jour */}
        <Titre sticker="calendrier" titre={traduire('Ta semaine')} droite={n ? traduirePluriel(n, n > 1, '{0} séance', '{0} séances', n) : undefined} />
        {avecAB ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {(['a', 'b'] as const).map((l) => {
              const on = vue === l;
              return (
                <Pressable
                  key={l}
                  onPress={() => {
                    if (on) return;
                    tap();
                    setPp((x) => echanger(x));
                    setVue(l);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  style={({ pressed }) => [{ flex: 1, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pa.texte : pressed ? pa.choisi : pa.carte }, on ? null : ombrePastel(pa.ombre)]}
                >
                  <Ink size={14} weight="extraBold" color={on ? pa.page : pa.texte}>{l === 'a' ? traduire('Semaine A') : traduire('Semaine B')}</Ink>
                </Pressable>
              );
            })}
          </View>
        ) : null}
        <Ink size={13.5} weight="bold" color={pa.texte2} style={{ marginTop: avecAB ? 8 : 3, marginHorizontal: 1 }}>{traduire('Touche un jour pour y poser une séance.')}</Ink>
        <View style={{ gap: 7, marginTop: 10 }}>
          {JOURS.map((nomJour, d) => {
            const s = pp.semaine[d];
            // 31 octobre 2026 (Houari) : sur ton programme en cours, le jour fait cette semaine reçoit le tampon
            // « validé » (même sans séance prévue ce jour-là) ; un jour prévu passé sans séance s'efface
            const isoJour = addDaysISO(lundiCourant, d);
            const valide = suiviIci && joursFaits.has(isoJour);
            const manque = suiviIci && !!s && !valide && isoJour < aujourdhuiIso;
            const cle = s?.brique;
            const h = cle ? habitDe(cle, Math.max(0, aToi.findIndex((x) => x.cle === cle))) : null;
            const titre = s ? traduire(titreDeSeance(s)) : '';
            return (
              <Pressable
                key={d}
                onPress={() => { tap(); setFeuille(d); }}
                accessibilityRole="button"
                accessibilityLabel={`${s ? `${traduire(nomJour)}, ${titre}, ${sousBrique(s)}` : `${traduire(nomJour)}, ${traduire('Repos')}, ${traduire('Poser une séance')}`}${valide ? `, ${traduire('Validé')}` : ''}`}
                style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, borderRadius: 18, backgroundColor: pa.carte, opacity: manque ? 0.55 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, ombrePastel(pa.ombre)]}
              >
                {valide ? <TamponValide taille={30} delai={d * 70} style={{ right: -6, top: -9 }} /> : null}
                <Ink size={15} weight="black" color={pa.texte} style={{ width: 42 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{traduire(JOURS_COURTS[d])}</Ink>
                {s && h ? (
                  <View style={{ flex: 1, minHeight: 44, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6, paddingRight: 12, backgroundColor: h.f.titre }}>
                    {illus.stickers ? <Image source={illus.img(h.sticker)} style={{ width: 34, height: 34 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
                    <Ink size={16} weight="black" color={pa.surCoche} style={{ flex: 1, paddingLeft: illus.stickers ? 0 : 6 }} numberOfLines={2}>{titre}</Ink>
                    <Ink size={13} weight="extraBold" color={pa.surCoche}>{s.exos.length ? sousBrique(s) : traduire('À remplir')}</Ink>
                  </View>
                ) : (
                  <View style={{ flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {illus.stickers ? <Image source={illus.img('sommeil')} style={{ width: 30, height: 30 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
                    <Ink size={15.5} weight="extraBold" color={pa.texte} style={{ flex: 1 }}>{traduire('Repos')}</Ink>
                    <View style={{ borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: pa.choisi }}>
                      <Ink size={13.5} weight="black" color={pa.coche}>{traduire('+ Poser')}</Ink>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* C. PARTIR D'UN MODÈLE : des titres complets, jamais coupés */}
        <Titre sticker="seance_rapide" titre={traduire('Partir d’un modèle')} />
        <Ink size={13.5} weight="bold" color={pa.texte2} style={{ marginTop: 3, marginHorizontal: 1, lineHeight: 19 }}>{traduire('Il remplit ta semaine. Tu changes tout ensuite.')}</Ink>
        <View style={{ gap: 8, marginTop: 10 }}>
          {modelesMontres.map((m) => {
            const choisi = !!n && semaineEgaleAuModele(pp.semaine, m, ecartes);
            return (
              <Pressable
                key={m.id}
                onPress={() => partirDuModele(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: choisi }}
                accessibilityLabel={`${traduire('Partir d’un modèle')} : ${traduire(m.titre)}, ${joursTexte(joursDuModele(m))}`}
                style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 62, paddingLeft: 8, paddingRight: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: choisi ? pa.choisi : pressed ? pa.choisi : pa.carte, borderWidth: 2, borderColor: choisi ? pa.coche : 'transparent' }, ombrePastel(pa.ombre)]}
              >
                {illus.stickers ? <Image source={illus.img(m.sticker)} style={{ width: 42, height: 42 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
                <View style={{ flex: 1, paddingLeft: illus.stickers ? 0 : 6 }}>
                  <Ink size={15.5} weight="black" color={pa.texte} style={{ lineHeight: 19 }}>{traduire(m.titre)}</Ink>
                  <Ink size={12.5} weight="extraBold" color={choisi ? pa.coche : pa.texte2} style={{ marginTop: 2 }}>{choisi ? traduire('Ta semaine actuelle') : joursTexte(joursDuModele(m))}</Ink>
                </View>
              </Pressable>
            );
          })}
          {modeles.length > MODELES_VISIBLES ? (
            <Pressable onPress={() => { tap(); setTousModeles((v) => !v); }} accessibilityRole="button" accessibilityState={{ expanded: tousModeles }} style={({ pressed }) => ({ minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pa.choisi : 'transparent', borderWidth: 2, borderColor: pa.bordChoisi })}>
              <Ink size={14.5} weight="black" color={pa.coche}>{tousModeles ? traduire('Moins de modèles') : traduire('Voir tous les modèles ({0})', modeles.length)}</Ink>
            </Pressable>
          ) : null}
        </View>

        {/* E2. FIN DE SÉANCE (1er novembre 2026, Houari : « vérifie que l'app me demande ce que j'aime faire ») :
            abdos et cardio après tes séances de musculation, combien de fois, quel cardio, combien de temps */}
        <View style={{ marginTop: 18, gap: 10 }}>
          <Titre sticker="cardio_zone2" titre={traduire('Fin de séance')} />
          <Ink size={13} weight="bold" color={pa.texte2} style={{ marginHorizontal: 2 }}>{traduire('Abdos et cardio après tes séances de musculation')}</Ink>
          <ChoixFinCompact fin={finVue} onChange={(f) => { setFinTouchee(true); setPp((x) => ({ ...x, fin: f })); }} />
        </View>

        {/* F. LE RAPPEL : les jours de séance, à ton heure ; discret */}
        <View style={{ marginTop: 18, borderRadius: 18, backgroundColor: pa.carte, paddingLeft: 8, paddingRight: 14, paddingVertical: 4, gap: 8 }}>
          <Pressable
            onPress={() => { tap(); setRefuse(false); setRappel((x) => ({ ...x, actif: !x.actif })); }}
            accessibilityRole="switch"
            accessibilityState={{ checked: rappel.actif }}
            accessibilityLabel={traduire('Rappel à {0}, les jours de séance', libelleHeureRappel(rappel.heure).replace(/ /g, ' '))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 }}
          >
            {illus.stickers ? <Image source={illus.img('rappels')} style={{ width: 30, height: 30 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
            <Ink size={14} weight="extraBold" color={pa.texte} style={{ flex: 1, paddingLeft: illus.stickers ? 0 : 6 }}>{traduire('Rappel à {0}, les jours de séance', libelleHeureRappel(rappel.heure).replace(/ /g, ' '))}</Ink>
            <PisteInterrupteur on={rappel.actif} />
          </Pressable>
          {rappel.actif ? (
            <View style={{ gap: 8, paddingLeft: 6, paddingBottom: 10 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {HEURES_RAPPEL.map((h) => {
                  const on = !autreHeure && rappel.heure === h;
                  return (
                    <Pressable key={h} onPress={() => { tap(); setAutreHeure(false); setRappel((x) => ({ ...x, heure: h })); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: on || pressed ? pa.creme.fond : 'transparent', borderWidth: 1.5, borderColor: on ? pa.creme.barre : pa.creme.barre2 })}>
                      <Ink size={14} weight="extraBold" color={on ? pa.creme.encre : pa.texte}>{libelleHeureRappel(h).replace(/ /g, ' ')}</Ink>
                    </Pressable>
                  );
                })}
                <Pressable onPress={() => { tap(); setAutreHeure((v) => !v); }} accessibilityRole="button" accessibilityState={{ selected: autreHeure }} style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: autreHeure || pressed ? pa.creme.fond : 'transparent', borderWidth: 1.5, borderColor: autreHeure ? pa.creme.barre : pa.creme.barre2 })}>
                  <Ink size={14} weight="extraBold" color={autreHeure ? pa.creme.encre : pa.texte}>{traduire('Autre heure')}</Ink>
                </Pressable>
              </View>
              {autreHeure ? <TimeField label={traduire('Heure du rappel')} value={rappel.heure} onChange={(h) => setRappel((x) => ({ ...x, heure: h }))} /> : null}
            </View>
          ) : null}
          {refuse ? <Ink size={13} weight="bold" color={pa.peche.titre} style={{ paddingLeft: 6, paddingBottom: 10 }}>{traduire('Les notifications sont coupées pour YOROI : ouvre les réglages du téléphone.')}</Ink> : null}
        </View>

        {existe ? (
          <Pressable onPress={supprimer} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, marginTop: 14, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            <Ink size={14} weight="extraBold" color={pa.peche.titre}>{traduire('Supprimer ce programme')}</Ink>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* E. ENREGISTRER : collé en bas, pleine largeur, couleur pleine ; il dit ce qui manque */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: pa.page, shadowColor: pa.ombre, shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: -6 }, elevation: 8 }}>
        <Pressable
          onPress={() => void enregistrer()}
          accessibilityRole="button"
          accessibilityState={{ busy: occupe }}
          accessibilityLabel={peut ? traduire('Enregistrer') : traduire('Pose au moins une séance')}
          style={({ pressed }) => ({ width: '100%', maxWidth: 688, alignSelf: 'center', height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: peut ? pa.coche : pa.texte, transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          {occupe ? <ActivityIndicator color={pa.surCoche} /> : <Ink size={17} weight="black" color={peut ? pa.surCoche : pa.page}>{peut ? traduire('Enregistrer') : traduire('Pose au moins une séance')}</Ink>}
        </Pressable>
      </View>

      {/* LA FEUILLE DU JOUR : toutes les briques, un toucher pose la séance */}
      <Sheet visible={feuille !== null} onClose={() => setFeuille(null)} title={feuille !== null ? majuscule(traduire(JOURS[feuille])) : ''}>
        {feuille !== null ? (
          <View style={{ gap: 12, paddingBottom: 4 }}>
            <Ink size={13.5} weight="bold" color={pa.texte2} style={{ marginTop: -6, marginHorizontal: 4 }}>{traduire('Un toucher pose la séance sur ce jour.')}</Ink>
            {aToi.length ? (
              <View style={{ gap: 8 }}>
                <Ink size={15} weight="black" color={pa.texte} style={{ marginHorizontal: 4 }}>{traduire('Tes séances à toi')}</Ink>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{aToi.map((x, k) => tuile(x.cle, feuille, k))}</View>
              </View>
            ) : null}
            {GROUPES_BRIQUES.map((g) => (
              <View key={g.id} style={{ gap: 8 }}>
                <Ink size={15} weight="black" color={pa.texte} style={{ marginHorizontal: 4 }}>{traduire(g.titre)}</Ink>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{BRIQUES.filter((b: DefBrique) => b.groupe === g.id).map((b) => tuile(b.id, feuille))}</View>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => poser(feuille, null)} accessibilityRole="button" accessibilityState={{ selected: !pp.semaine[feuille] }} style={({ pressed }) => ({ flex: 1, minHeight: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, backgroundColor: pressed ? pa.choisi : pa.carte, borderWidth: 2.5, borderColor: !pp.semaine[feuille] ? pa.texte : 'transparent' })}>
                {illus.stickers ? <Image source={illus.img('sommeil')} style={{ width: 38, height: 38 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
                <Ink size={15} weight="black" color={pa.texte}>{traduire('Repos')}</Ink>
              </Pressable>
              <Pressable onPress={() => { tap(); const d = feuille; setFeuille(null); creerEtPoser(d, { titre: traduire('Ma séance'), exos: [] }); }} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, backgroundColor: pressed ? pa.choisi : pa.carte, borderWidth: 2, borderStyle: 'dashed', borderColor: pa.bordChoisi })}>
                {illus.stickers ? <Image source={illus.img('crayon')} style={{ width: 38, height: 38 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
                <Ink size={14.5} weight="black" color={pa.coche} style={{ flex: 1 }}>{traduire('Créer une séance')}</Ink>
              </Pressable>
            </View>
            {mesSeances.length ? (
              <LigneFeuille sticker="carnet" label={traduire('Depuis mes séances')} onPress={() => { tap(); const d = feuille; ensuite(() => setMesSeancesPour(d)); }} />
            ) : null}
            <LigneFeuille sticker="liste" label={traduire('Une séance d’un autre programme')} onPress={() => { tap(); const d = feuille; ensuite(() => setAutresPour(d)); }} />
          </View>
        ) : null}
      </Sheet>

      <ChoixParMuscle
        visible={parMuscle !== null}
        titre={parMuscle !== null ? traduire(titreDeSeance(seanceCle(parMuscle) ?? { exos: [] })) : ''}
        exos={parMuscle !== null ? seanceCle(parMuscle)?.exos ?? [] : []}
        onBasculer={(e) => { if (parMuscle !== null) basculerExo(parMuscle, e); }}
        onClose={() => setParMuscle(null)}
      />

      <ExercisePicker
        visible={chercher !== null}
        onClose={() => setChercher(null)}
        onPick={(nom, muscle) => {
          const cle = chercher;
          setChercher(null);
          if (cle !== null) changerBrique(cle, (s) => avecExo(s, exoDepuisNom(nom, muscle)));
        }}
        history={historique.map}
        recent={historique.recent}
        already={chercher !== null ? (seanceCle(chercher)?.exos ?? []).map((e) => e.nom) : []}
        titre={traduire('Chercher un exercice')}
      />

      {/* reprendre une de tes séances : ses exercices, ses séries et ses répétitions, posée sur le jour */}
      <Sheet visible={mesSeancesPour !== null} onClose={() => setMesSeancesPour(null)} title={traduire('Depuis mes séances')}>
        <View style={{ gap: 8 }}>
          {mesSeances.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => {
                tap();
                const d = mesSeancesPour;
                setMesSeancesPour(null);
                const exos = m.exos.map((e) => ({ ...exoDepuisNom(e.nom, e.muscle), series: e.series, repsMin: e.reps, repsMax: e.reps }));
                creerEtPoser(d, { titre: m.nom, exos });
              }}
              accessibilityRole="button"
              style={({ pressed }) => ({ minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, justifyContent: 'center', backgroundColor: pressed ? pa.choisi : pa.carte })}
            >
              <Ink size={15} weight="black" color={pa.texte}>{m.nom}</Ink>
              <Ink size={12.5} weight="bold" color={pa.texte2}>{traduirePluriel(m.exos.length, m.exos.length > 1, '{0} exercice', '{0} exercices', m.exos.length)}</Ink>
            </Pressable>
          ))}
        </View>
      </Sheet>

      {/* une séance d'un autre programme du catalogue, copiée comme une brique à toi */}
      <Sheet visible={autresPour !== null} onClose={() => setAutresPour(null)} title={traduire('Une séance d’un autre programme')}>
        <View style={{ gap: 14 }}>
          {AUTRES_PROGRAMMES.map(({ p, jours }) => (
            <View key={p.id} style={{ gap: 6 }}>
              <Ink size={14} weight="black" color={pa.texte2} style={{ marginHorizontal: 4 }}>{traduire(p.titre)}</Ink>
              {jours.map((j: JourProgramme) => (
                <Pressable
                  key={j.id}
                  onPress={() => {
                    tap();
                    const d = autresPour;
                    setAutresPour(null);
                    const s = seanceDepuisJour(j);
                    creerEtPoser(d, { titre: s.titre, exos: s.exos });
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, justifyContent: 'center', backgroundColor: pressed ? pa.choisi : pa.carte })}
                >
                  <Ink size={15} weight="black" color={pa.texte}>{traduire(nomCourt(j.titre))}</Ink>
                  <Ink size={12.5} weight="bold" color={pa.texte2}>{traduirePluriel(j.exos.length, j.exos.length > 1, '{0} exercice', '{0} exercices', j.exos.length)}</Ink>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      </Sheet>

      {/* la fête : ton programme est prêt */}
      <Modal visible={!!fete} transparent animationType="fade" onRequestClose={() => setFete(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(29,32,51,0.32)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          {fete ? (
            <Animated.View entering={ZoomIn.springify().damping(14)} style={[{ width: '100%', maxWidth: 360, borderRadius: 28, backgroundColor: pa.carte, padding: 22, alignItems: 'center', gap: 10 }, ombrePastel(pa.ombre)]}>
              {illus.stickers ? <Image source={illus.img('trophee')} style={{ width: 96, height: 96 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
              <Ink size={24} weight="black" color={pa.texte} style={{ textAlign: 'center', lineHeight: 29 }} accessibilityRole="header">{traduire('Ton programme est prêt')}</Ink>
              <Ink size={14} weight="bold" color={pa.texte2} style={{ textAlign: 'center', lineHeight: 20 }}>
                {traduirePluriel(fete.n, fete.n > 1, '{0} séance par semaine. Première séance {1}.', '{0} séances par semaine. Première séance {1}.', fete.n, traduire(fete.premier))}
              </Ink>
              <BoutonPrincipal
                onPress={() => { tap(); const id = fete.id; setFete(null); router.replace({ pathname: '/programmes/[id]' as any, params: { id } }); }}
                haptique="none"
                label={traduire('Voir mon programme')}
                hauteur={54}
                rayon={27}
                tailleTexte={16}
                style={{ alignSelf: 'stretch', marginTop: 8 }}
              />
              <Pressable onPress={() => { tap(); setFete(null); if (router.canGoBack()) router.back(); else router.replace('/coach' as any); }} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
                <Ink size={14} weight="extraBold" color={pa.surBouton}>{traduire('Retour au coach')}</Ink>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </Modal>

      {/* régler un exercice de la brique : séries, répétitions, repos, ordre ; vaut pour tous ses jours */}
      <Sheet visible={!!reglage} onClose={() => setARegler(null)} title={reglage ? sansTiret(traduire(nomFr(reglage.nom))) : ''}>
        {reglage && aRegler ? (
          <View style={{ gap: 16, paddingHorizontal: 2, paddingBottom: 6 }}>
            {/* revue du 30 octobre 2026 : brique posee sur plusieurs jours, le changement vaut partout (briques.ts) */}
            {joursAPrevenir(pp, aRegler.cle).length ? (
              <Ink size={13.5} weight="bold" color={pa.texte2} style={{ lineHeight: 19 }}>
                {traduire('Ce changement vaut pour tous ses jours : {0}.', joursAPrevenir(pp, aRegler.cle).map((j) => (j.b ? traduire('{0}, autre semaine', traduire(JOURS[j.d])) : traduire(JOURS[j.d]))).join(', '))}
              </Ink>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ink size={15} weight="black" color={pa.texte} style={{ flex: 1 }}>{traduire('Séries')}</Ink>
              <Rond label="−" a11y={traduire('Une série de moins')} onPress={() => changerBrique(aRegler.cle, (s) => reglerExo(s, aRegler.index, { series: reglage.series - 1 }))} />
              <Ink size={22} weight="black" color={pa.texte} style={{ minWidth: 34, textAlign: 'center' }}>{String(reglage.series)}</Ink>
              <Rond label="+" a11y={traduire('Une série de plus')} onPress={() => changerBrique(aRegler.cle, (s) => reglerExo(s, aRegler.index, { series: reglage.series + 1 }))} />
            </View>
            <View style={{ gap: 8 }}>
              <Ink size={15} weight="black" color={pa.texte}>{reglage.secondes ? traduire('Secondes par série') : traduire('Répétitions par série')}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(reglage.secondes ? SECONDES : REPS).map(([a, b]) => {
                  const on = reglage.repsMin === a && reglage.repsMax === b;
                  return <Choix key={`${a}${b}`} label={reglage.secondes ? traduire('{0} à {1} s', a, b) : traduire('{0} à {1}', a, b)} on={on} onPress={() => changerBrique(aRegler.cle, (s) => reglerExo(s, aRegler.index, { repsMin: a, repsMax: b }))} />;
                })}
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Ink size={15} weight="black" color={pa.texte}>{traduire('Repos entre les séries')}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {REPOS.map((r) => (
                  <Choix key={r} label={r < 120 ? traduire('{0} s', r) : traduire('{0} min', r / 60)} on={reglage.reposSec === r} onPress={() => changerBrique(aRegler.cle, (s) => ({ ...s, exos: s.exos.map((e, i) => (i === aRegler.index ? { ...e, reposSec: r } : e)) }))} />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Choix label={traduire('Monter')} on={false} desactive={aRegler.index === 0} onPress={() => { changerBrique(aRegler.cle, (s) => deplacerExo(s, aRegler.index, -1)); setARegler({ ...aRegler, index: aRegler.index - 1 }); }} />
              <Choix label={traduire('Descendre')} on={false} desactive={aRegler.index >= (seanceCle(aRegler.cle)?.exos.length ?? 0) - 1} onPress={() => { changerBrique(aRegler.cle, (s) => deplacerExo(s, aRegler.index, 1)); setARegler({ ...aRegler, index: aRegler.index + 1 }); }} />
            </View>
            <Pressable onPress={() => { tap(); changerBrique(aRegler.cle, (s) => sansExo(s, aRegler.index)); setARegler(null); }} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
              <Ink size={14} weight="extraBold" color={pa.peche.titre}>{traduire('Retirer de la séance')}</Ink>
            </Pressable>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

/** Le titre d'une section, avec son sticker */
function Titre({ sticker, titre, droite }: { sticker: NomSticker; titre: string; droite?: string }) {
  const pa = usePastel();
  const illus = useIllustrations();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 }}>
      {illus.stickers ? <Image source={illus.img(sticker)} style={{ width: 34, height: 34 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      <Ink size={21} weight="black" color={pa.texte} accessibilityRole="header" style={{ flex: 1 }}>{titre}</Ink>
      {droite ? <Ink size={14} weight="extraBold" color={pa.coche}>{droite}</Ink> : null}
    </View>
  );
}

/** Une ligne en bas de la feuille du jour (Depuis mes séances, Une séance d'un autre programme) */
function LigneFeuille({ sticker, label, onPress }: { sticker: NomSticker; label: string; onPress: () => void }) {
  const pa = usePastel();
  const illus = useIllustrations();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderRadius: 16, paddingLeft: 8, paddingRight: 14, backgroundColor: pressed ? pa.choisi : pa.carte })}>
      {illus.stickers ? <Image source={illus.img(sticker)} style={{ width: 32, height: 32 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      <Ink size={14.5} weight="extraBold" color={pa.coche} style={{ flex: 1, paddingLeft: illus.stickers ? 0 : 6 }}>{label}</Ink>
    </Pressable>
  );
}

/** La brique ouverte : son nom, ses exercices (ou son cardio et sa durée), les ajouts ; vaut pour tous ses jours */
function BriqueOuverte({ s, habit, jours, ecartes, onFermer, onNom, onRegler, onParMuscle, onChercher, onCardio }: {
  s: SeancePerso;
  habit: Habit;
  jours: string[];
  ecartes: ReadonlySet<string>;
  onFermer: () => void;
  onNom: (t: string) => void;
  onRegler: (i: number) => void;
  onParMuscle: () => void;
  onChercher: () => void;
  onCardio: (r: { nom?: string; minutes?: number }) => void;
}) {
  const pa = usePastel();
  const illus = useIllustrations();
  const f = habit.f;
  const cardio = s.exos.find(estExoCardio);
  const machines = cardio ? [cardio.nom, ...alternativesCardio(cardio.nom, ecartes, 7)] : [];
  return (
    <View style={{ borderRadius: 24, backgroundColor: f.fond, padding: 14, gap: 12, borderWidth: 2.5, borderColor: f.titre }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {illus.stickers ? <Image source={illus.img(habit.sticker)} style={{ width: 44, height: 44 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
        <TextInput
          value={s.titre ?? ''}
          onChangeText={(t) => onNom(t.slice(0, 40))}
          placeholder={traduire(titreDeSeance(s))}
          placeholderTextColor={pa.texte2}
          accessibilityLabel={traduire('Nom de la séance')}
          returnKeyType="done"
          style={{ flex: 1, minHeight: 44, fontSize: 18, fontWeight: '900', color: pa.texte }}
        />
        <Pressable onPress={onFermer} accessibilityRole="button" hitSlop={6} style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: pressed ? pa.choisi : pa.carte })}>
          <Ink size={13.5} weight="black" color={pa.coche}>{traduire('Fermer')}</Ink>
        </Pressable>
      </View>
      <Ink size={13} weight="extraBold" color={f.titre}>
        {jours.length ? traduire('Posée {0}. Un changement vaut pour tous ces jours.', jours.join(', ')) : traduire('Posée sur aucun jour. Touche un jour de ta semaine pour la poser.')}
      </Ink>

      {cardio ? (
        <View style={{ gap: 12 }}>
          <View style={{ gap: 8 }}>
            <Ink size={15} weight="black" color={pa.texte}>{traduire('Machine')}</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {machines.map((m) => <Choix key={m} label={traduire(m)} on={m === cardio.nom} onPress={() => onCardio({ nom: m })} />)}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Ink size={15} weight="black" color={pa.texte}>{traduire('Durée')}</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MINUTES_CARDIO.map((m) => <Choix key={m} label={traduire('{0} min', m)} on={cardio.minutes === m} onPress={() => onCardio({ minutes: m })} />)}
            </View>
          </View>
          <Ink size={13} weight="bold" color={pa.texte2}>{traduire('Pendant la séance : un chrono, et Remplacer ne propose que du cardio.')}</Ink>
        </View>
      ) : s.exos.length ? (
        <View style={{ gap: 2 }}>
          {s.exos.map((e, i) => (
            <Pressable key={`${e.nom}${i}`} onPress={() => onRegler(i)} accessibilityRole="button" accessibilityLabel={`${sansTiret(traduire(nomFr(e.nom)))}, ${seriesTexte(e)}, ${traduire('Régler')}`} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, borderRadius: 12, paddingHorizontal: 2, backgroundColor: pressed ? 'rgba(255,255,255,0.5)' : 'transparent' })}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={12} weight="black" color={f.titre}>{String(i + 1)}</Ink>
              </View>
              <Ink size={14.5} weight="bold" color={pa.texte} style={{ flex: 1 }} numberOfLines={2}>{sansTiret(traduire(nomFr(e.nom)))}</Ink>
              <Ink size={13} weight="extraBold" color={pa.texte2}>{seriesTexte(e)}</Ink>
            </Pressable>
          ))}
        </View>
      ) : (
        <Ink size={13} weight="bold" color={pa.texte2}>{traduire('Ajoute tes exercices : par muscle, ou en cherchant leur nom.')}</Ink>
      )}

      {cardio ? null : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <BoutonBlanc label={traduire('Ajouter par muscle')} onPress={onParMuscle} />
          <BoutonBlanc label={traduire('Chercher un exercice')} onPress={onChercher} />
        </View>
      )}
    </View>
  );
}

function BoutonBlanc({ label, onPress }: { label: string; onPress: () => void }) {
  const pa = usePastel();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ flex: 1, minHeight: 48, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pa.choisi : pa.carte }, ombrePastel(pa.ombre)]}>
      <Ink size={14} weight="extraBold" color={pa.coche} style={{ textAlign: 'center' }}>{label}</Ink>
    </Pressable>
  );
}

function Rond({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const pa = usePastel();
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={a11y} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pa.boutonAppui : pa.bouton })}>
      <Ink size={20} weight="black" color={pa.surBouton}>{label}</Ink>
    </Pressable>
  );
}

function Choix({ label, on, onPress, desactive }: { label: string; on: boolean; onPress: () => void; desactive?: boolean }) {
  const pa = usePastel();
  return (
    <Pressable
      onPress={() => { if (desactive) return; tap(); onPress(); }}
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled: !!desactive }}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pa.coche : pressed ? pa.choisi : pa.carte, borderWidth: 1.5, borderColor: on ? pa.coche : pa.ligne, opacity: desactive ? 0.4 : 1 })}
    >
      <Ink size={14} weight={on ? 'black' : 'bold'} color={on ? pa.surCoche : pa.texte}>{label}</Ink>
    </Pressable>
  );
}
