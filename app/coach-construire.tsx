/**
 * « Je construis le mien » (27 octobre 2026), maquette choisie par Houari : Coach2-C-Construis, avec le choix par
 * muscle de Coach2-B-Construis (ChoixParMuscle.tsx). Un vrai outil, ouvert depuis le coach (« Créer mon programme »)
 * ou depuis la page de ton programme (« Modifier mon programme », paramètre id).
 *  - Ta semaine, du lundi au dimanche : toucher un jour l'ouvre ; repos ou une séance avec ses exercices.
 *  - Dans un jour : ajouter par muscle, chercher un exercice (ExercisePicker), reprendre une de tes séances
 *    (Mes séances), toucher un exercice pour régler ses séries, ses répétitions et son repos, le monter ou le retirer.
 *  - Le rappel, les jours de séance, à l'heure choisie (le réglage des rappels de séance, rappelProgramme.ts).
 *  - « Enregistrer » : ton programme devient le programme en cours (suivi.ts, suivreProgrammePerso), la séance du
 *    jour du coach et de l'accueil le suit. « Supprimer » l'archive après confirmation : tes séances faites restent.
 * Le modèle est dans lib/v2/programmes/monProgramme.ts.
 * 30 octobre 2026 : « Partir d'un modèle » en haut (Push Pull Legs, Upper Lower, Push Pull + Upper Lower...), les
 * programmes du catalogue remplissent les jours, modifiables ensuite (lib/v2/programmes/modelesSemaine.ts) ;
 * les idées de nom passent à la ligne au lieu d'être coupées au bord ; contenu limité à 720 points sur iPad et Mac.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
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
import { ombrePastel, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import type { FamillePastel } from '@/components/yoroi/v2/programmes/Habillage';
import { ChoixParMuscle, seriesTexte } from '@/components/yoroi/v2/programmes/ChoixParMuscle';
import { ExercisePicker } from '@/components/yoroi/v2/seance/ExercisePicker';
import { TimeField } from '@/components/yoroi/v2/notifications/parts';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { buildExerciseHistory } from '@/lib/v2/seance/history';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { chargerMesSeances } from '@/lib/v2/seance/mesSeances';
import type { MaSeance } from '@/lib/v2/seance/mesSeances';
import { programmeParId } from '@/lib/v2/programmes/catalogue';
import { modelesDisponibles, semaineDuModele, semaineEgaleAuModele } from '@/lib/v2/programmes/modelesSemaine';
import type { Programme } from '@/lib/v2/programmes/types';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import {
  avecExo, avecJour, deplacerExo, exoDepuisNom, joursDuPerso, nombreSeances, nouveauProgrammePerso, peutEnregistrer,
  programmePersoParId, reglerExo, sansExo, titreDeSeance, enregistrerProgrammePerso,
} from '@/lib/v2/programmes/monProgramme';
import type { ProgrammePerso, RappelPerso, SeancePerso } from '@/lib/v2/programmes/monProgramme';
import { appliquerRappelProgramme, lireRappelSeance } from '@/lib/v2/programmes/rappelProgramme';
import { HEURES_RAPPEL, estAutreHeure, libelleHeureRappel } from '@/lib/v2/programmes/rappel';
import { chargerProgrammeActif, suivreProgrammePerso, supprimerProgrammePerso } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { ExoProgramme } from '@/lib/v2/programmes/types';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { useConfirmerSortie } from '@/lib/v2/saisie/useConfirmerSortie';
import { logger } from '@/lib/security/logger';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const NOMS_SEANCE = ['Haut du corps', 'Bas du corps', 'Corps entier', 'Push', 'Pull', 'Jambes'];
const REPS: [number, number][] = [[5, 8], [8, 12], [10, 15], [15, 20]];
const SECONDES: [number, number][] = [[20, 30], [30, 45], [45, 60]];
const REPOS = [60, 90, 120, 180];
const majuscule = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);
/** Ce qui compte pour savoir si tu as changé quelque chose (les séances vides ne comptent pas) */
const empreinte = (x: ProgrammePerso, r: RappelPerso) => JSON.stringify([x.nom.trim(), x.semaine.map((s) => (s && s.exos.length ? s : null)), r.actif, r.heure]);
const nouveauVide: ProgrammePerso = { id: '', nom: '', semaine: [null, null, null, null, null, null, null], creeLe: '', modifieLe: '' };

export default function CoachConstruire() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pa = usePastel();
  const illus = useIllustrations();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [pp, setPp] = useState<ProgrammePerso>(() => nouveauProgrammePerso());
  const [existe, setExiste] = useState(false);
  const [pret, setPret] = useState(!id);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [parMuscle, setParMuscle] = useState<number | null>(null);
  const [chercher, setChercher] = useState<number | null>(null);
  const [mesSeancesPour, setMesSeancesPour] = useState<number | null>(null);
  const [aRegler, setARegler] = useState<{ jour: number; index: number } | null>(null);
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
  const historique = useMemo(() => buildExerciseHistory(trainings), [trainings]);

  useEffect(() => {
    let vivant = true;
    chargerProgrammeActif().then((a) => { if (vivant) setActif(a); }).catch(() => {});
    getTrainings().then((t) => { if (vivant) setTrainings(t ?? []); }).catch(() => {});
    chargerMesSeances().then((l) => { if (vivant) setMesSeances(l.filter((s) => s.exos.length)); }).catch(() => {});
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
  const modifie = pret && empreinte(pp, rappel) !== (depart || empreinte(nouveauVide, rappel));
  // 28 octobre 2026 : le glissement retour de l'iPhone et le retour d'Android demandent aussi, comme la fleche
  const { laisserPartir } = useConfirmerSortie(modifie && peutEnregistrer(pp), {
    titre: traduire('Enregistrer ton programme ?'),
    message: traduire('Tu as fait des changements.'),
    enregistrer: () => enregistrer(),
  });
  const sortir = () => {
    tap();
    const go = () => { laisserPartir(); if (router.canGoBack()) router.back(); else router.replace('/coach' as any); };
    if (!modifie || !peutEnregistrer(pp)) { go(); return; }
    appAlert(traduire('Enregistrer ton programme ?'), traduire('Tu as fait des changements.'), [
      { text: traduire('Quitter sans enregistrer'), style: 'destructive', onPress: go },
      { text: traduire('Enregistrer'), onPress: () => void enregistrer() },
    ]);
  };
  const jourDe = (d: number): SeancePerso | null => pp.semaine[d] ?? null;
  const changerJour = (d: number, s: SeancePerso | null) => setPp((x) => avecJour(x, d, s));
  const basculerExo = (d: number, e: ExoProgramme) => {
    const s = jourDe(d) ?? { exos: [] };
    const i = s.exos.findIndex((x) => x.nom === e.nom);
    changerJour(d, i >= 0 ? sansExo(s, i) : avecExo(s, { ...e }));
  };
  const ouvrirJour = (d: number) => {
    tap();
    if (ouvert === d) {
      if (!(jourDe(d)?.exos.length)) changerJour(d, null);
      setOuvert(null);
      return;
    }
    if (!jourDe(d)) changerJour(d, { exos: [] });
    // le jour qu'on quitte, resté vide, redevient un repos
    if (ouvert !== null && !(jourDe(ouvert)?.exos.length)) changerJour(ouvert, null);
    setOuvert(d);
  };
  const mettreAuRepos = (d: number) => {
    const s = jourDe(d);
    const go = () => { changerJour(d, null); setOuvert(null); };
    if (!s || !s.exos.length) { tap(); go(); return; }
    appAlert(traduire('Repos ce jour ?'), traduire('Les exercices de ce jour seront retirés de ta semaine.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Mettre au repos'), style: 'destructive', onPress: go },
    ]);
  };

  const enregistrer = async () => {
    if (occupe) return;
    if (!peutEnregistrer(pp)) {
      appAlert(traduire('Ajoute au moins un exercice'), traduire('Touche un jour, puis ajoute tes exercices par muscle ou en cherchant.'));
      return;
    }
    const go = async () => {
      setOccupe(true);
      try {
        const sauve = await enregistrerProgrammePerso({ ...pp, rappel });
        await suivreProgrammePerso(sauve);
        const r = await appliquerRappelProgramme(rappel, joursDuPerso(sauve));
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

  const teintes: FamillePastel[] = [pa.bleu, pa.peche, pa.menthe, pa.lilas, pa.creme];
  const teinteDu = (d: number) => {
    // une teinte par séance, dans l'ordre de la semaine
    const rangSeance = pp.semaine.slice(0, d).filter((s) => s && s.exos.length).length;
    return teintes[rangSeance % teintes.length];
  };
  // partir d'un modèle : il remplit les sept jours ; si ta semaine a déjà des exercices, on te demande avant
  const modeles = useMemo(() => modelesDisponibles(), []);
  const partirDuModele = (m: Programme) => {
    const go = () => {
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      setOuvert(null);
      setPp((x) => ({ ...x, semaine: semaineDuModele(m) }));
    };
    tap();
    if (!n || semaineEgaleAuModele(pp.semaine, m)) { go(); return; }
    appAlert(traduire('Remplacer ta semaine ?'), traduire('Tes jours seront remplis avec ce modèle. Tu pourras tout changer ensuite.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Remplacer'), onPress: go },
    ]);
  };
  const reglage = aRegler ? jourDe(aRegler.jour)?.exos[aRegler.index] ?? null : null;
  const sRegle = aRegler ? jourDe(aRegler.jour) : null;

  if (!pret) return <View style={{ flex: 1, backgroundColor: pa.page }} />;

  return (
    <View style={{ flex: 1, backgroundColor: pa.page }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, width: '100%', maxWidth: 720, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
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
        <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, marginTop: 16, paddingHorizontal: 16, borderRadius: 22, backgroundColor: pa.carte }, ombrePastel(pa.ombre)]}>
          <Icon name="edit" size={16} color={pa.texte2} />
          <TextInput
            value={pp.nom}
            onChangeText={(t) => setPp((x) => ({ ...x, nom: t.slice(0, 40) }))}
            placeholder={traduire('Nom du programme, facultatif')}
            placeholderTextColor={pa.texte3}
            accessibilityLabel={traduire('Nom du programme')}
            returnKeyType="done"
            style={{ flex: 1, minHeight: 48, fontSize: 15, fontWeight: '700', color: pa.texte }}
          />
        </View>

        {/* PARTIR D'UN MODÈLE : un programme du catalogue remplit tes jours, tu changes tout ensuite */}
        <View style={{ marginTop: 20, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {illus.stickers ? <Image source={illus.img('calendrier')} style={{ width: 34, height: 34 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
            <Ink size={20} weight="black" color={pa.texte} accessibilityRole="header" style={{ flex: 1 }}>{traduire('Partir d’un modèle')}</Ink>
          </View>
          <Ink size={13} weight="bold" color={pa.texte2} style={{ marginHorizontal: 1 }}>{traduire('Touche un modèle : il remplit ta semaine, tu changes tout ensuite.')}</Ink>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginTop: 10 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 10 }}>
          {modeles.map((m, k) => (
            <CarteModele
              key={m.programme.id}
              programme={m.programme}
              sticker={m.sticker}
              f={[pa.bleu, pa.peche, pa.menthe, pa.lilas, pa.creme][k % 5]}
              choisi={!!n && semaineEgaleAuModele(pp.semaine, m.programme)}
              onPress={() => partirDuModele(m.programme)}
            />
          ))}
        </ScrollView>

        {/* TA SEMAINE */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 }}>
          <Ink size={22} weight="black" color={pa.texte} accessibilityRole="header" style={{ flex: 1 }}>{traduire('Ta semaine')}</Ink>
          <BoutonPrincipal
            onPress={() => void enregistrer()}
            haptique="none"
            loading={occupe}
            label={traduire('Enregistrer')}
            hauteur={44}
            rayon={22}
            tailleTexte={15}
            lignes={1}
            styleBouton={{ opacity: peutEnregistrer(pp) ? 1 : 0.55 }}
          />
        </View>
        <Ink size={13} weight="bold" color={pa.texte2} style={{ marginTop: 2, marginBottom: 10, marginHorizontal: 1 }}>
          {n ? traduirePluriel(n, n > 1, '{0} séance, touche un jour pour le remplir', '{0} séances, touche un jour pour le remplir', n) : traduire('Touche un jour pour le remplir')}
        </Ink>

        <View style={{ gap: 8 }}>
          {JOURS.map((nomJour, d) => {
            const s = jourDe(d);
            const plein = !!s && s.exos.length > 0;
            const f = teinteDu(d);
            if (ouvert === d && s) {
              return (
                <Animated.View key={d} entering={FadeIn.duration(220)} layout={LinearTransition.duration(220)}>
                <JourOuvert
                  key={d}
                  jour={majuscule(traduire(nomJour))}
                  s={s}
                  f={f}
                  onFermer={() => ouvrirJour(d)}
                  onNom={(t) => changerJour(d, { ...s, titre: t || undefined })}
                  onRegler={(i) => { tap(); setARegler({ jour: d, index: i }); }}
                  onParMuscle={() => { tap(); setParMuscle(d); }}
                  onChercher={() => { tap(); setChercher(d); }}
                  onMesSeances={mesSeances.length ? () => { tap(); setMesSeancesPour(d); } : undefined}
                  onRepos={() => mettreAuRepos(d)}
                />
                </Animated.View>
              );
            }
            return (
              <Animated.View key={d} layout={LinearTransition.duration(220)}>
              <Pressable
                onPress={() => ouvrirJour(d)}
                accessibilityRole="button"
                accessibilityLabel={plein ? `${traduire(nomJour)}, ${traduire(titreDeSeance(s!))}, ${traduirePluriel(s!.exos.length, s!.exos.length > 1, '{0} exercice', '{0} exercices', s!.exos.length)}` : `${traduire(nomJour)}, ${traduire('Repos')}, ${traduire('Ajouter une séance')}`}
                style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: plein ? f.fond : pa.carte, transform: [{ scale: pressed ? 0.98 : 1 }] }, plein ? null : ombrePastel(pa.ombre)]}
              >
                <Ink size={15} weight="extraBold" color={plein ? f.titre : pa.texte2} style={{ width: 90 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{majuscule(traduire(nomJour))}</Ink>
                {plein ? (
                  <>
                    {illus.stickers ? <Image source={illus.img('musculation')} style={{ width: 32, height: 32 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
                    <Ink size={15} weight="black" color={pa.texte} style={{ flex: 1 }} numberOfLines={2}>{traduire(titreDeSeance(s!))}</Ink>
                    <Ink size={13} weight="extraBold" color={pa.texte2}>{traduirePluriel(s!.exos.length, s!.exos.length > 1, '{0} exercice', '{0} exercices', s!.exos.length)}</Ink>
                  </>
                ) : (
                  <>
                    <Ink size={15} weight="bold" color={pa.texte3} style={{ flex: 1 }}>{traduire('Repos')}</Ink>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: pa.page, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="plus" size={16} color={pa.texte3} strokeWidth={2.6} />
                    </View>
                  </>
                )}
              </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* LE RAPPEL : les jours de séance, à ton heure */}
        <View style={{ marginTop: 12, borderRadius: 22, backgroundColor: pa.creme.fond, paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}>
          <Pressable
            onPress={() => { tap(); setRefuse(false); setRappel((x) => ({ ...x, actif: !x.actif })); }}
            accessibilityRole="switch"
            accessibilityState={{ checked: rappel.actif }}
            accessibilityLabel={traduire('Rappel à {0}, les jours de séance', libelleHeureRappel(rappel.heure).replace(/ /g, '\u00A0'))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}
          >
            {illus.stickers ? <Image source={illus.img('rappels')} style={{ width: 34, height: 34 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <Icon name="clock" size={20} color={pa.creme.titre} />}
            <Ink size={15} weight="extraBold" color={pa.texte} style={{ flex: 1 }}>{traduire('Rappel à {0}, les jours de séance', libelleHeureRappel(rappel.heure).replace(/ /g, '\u00A0'))}</Ink>
            <View style={{ width: 50, height: 30, borderRadius: 15, padding: 3, backgroundColor: rappel.actif ? pa.creme.barre : pa.ligne, alignItems: rappel.actif ? 'flex-end' : 'flex-start' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' }} />
            </View>
          </Pressable>
          {rappel.actif ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {HEURES_RAPPEL.map((h) => {
                  const on = !autreHeure && rappel.heure === h;
                  return (
                    <Pressable key={h} onPress={() => { tap(); setAutreHeure(false); setRappel((x) => ({ ...x, heure: h })); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: on ? pa.carte : pressed ? pa.carte : 'transparent', borderWidth: 1.5, borderColor: on ? pa.creme.barre : pa.creme.barre2 })}>
                      <Ink size={14} weight="extraBold" color={on ? pa.creme.encre : pa.texte2}>{libelleHeureRappel(h).replace(/ /g, '\u00A0')}</Ink>
                    </Pressable>
                  );
                })}
                <Pressable onPress={() => { tap(); setAutreHeure((v) => !v); }} accessibilityRole="button" accessibilityState={{ selected: autreHeure }} style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: autreHeure || pressed ? pa.carte : 'transparent', borderWidth: 1.5, borderColor: autreHeure ? pa.creme.barre : pa.creme.barre2 })}>
                  <Ink size={14} weight="extraBold" color={autreHeure ? pa.creme.encre : pa.texte2}>{traduire('Autre heure')}</Ink>
                </Pressable>
              </View>
              {autreHeure ? <TimeField label={traduire('Heure du rappel')} value={rappel.heure} onChange={(h) => setRappel((x) => ({ ...x, heure: h }))} /> : null}
            </>
          ) : null}
          {refuse ? <Ink size={13} weight="bold" color={pa.peche.titre}>{traduire('Les notifications sont coupées pour YOROI : ouvre les réglages du téléphone.')}</Ink> : null}
        </View>

        {existe ? (
          <Pressable onPress={supprimer} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, marginTop: 18, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            <Ink size={14} weight="extraBold" color={pa.peche.titre}>{traduire('Supprimer ce programme')}</Ink>
          </Pressable>
        ) : null}
      </ScrollView>

      <ChoixParMuscle
        visible={parMuscle !== null}
        titre={parMuscle !== null ? `${majuscule(traduire(JOURS[parMuscle]))}, ${traduire(titreDeSeance(jourDe(parMuscle) ?? { exos: [] }))}` : ''}
        exos={parMuscle !== null ? jourDe(parMuscle)?.exos ?? [] : []}
        onBasculer={(e) => { if (parMuscle !== null) basculerExo(parMuscle, e); }}
        onClose={() => setParMuscle(null)}
      />

      <ExercisePicker
        visible={chercher !== null}
        onClose={() => setChercher(null)}
        onPick={(nom, muscle) => {
          const d = chercher;
          setChercher(null);
          if (d !== null) changerJour(d, avecExo(jourDe(d), exoDepuisNom(nom, muscle)));
        }}
        history={historique.map}
        recent={historique.recent}
        already={chercher !== null ? (jourDe(chercher)?.exos ?? []).map((e) => e.nom) : []}
        titre={traduire('Chercher un exercice')}
      />

      {/* reprendre une de tes séances : ses exercices, ses séries et ses répétitions */}
      <Sheet visible={mesSeancesPour !== null} onClose={() => setMesSeancesPour(null)} title={traduire('Depuis mes séances')}>
        <View style={{ gap: 8 }}>
          {mesSeances.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => {
                tap();
                const d = mesSeancesPour;
                setMesSeancesPour(null);
                if (d === null) return;
                const exos = m.exos.map((e) => ({ ...exoDepuisNom(e.nom, e.muscle), series: e.series, repsMin: e.reps, repsMax: e.reps }));
                changerJour(d, { titre: m.nom, exos });
              }}
              accessibilityRole="button"
              style={({ pressed }) => ({ minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, justifyContent: 'center', backgroundColor: pressed ? pa.choisi : pa.page })}
            >
              <Ink size={15} weight="black" color={pa.texte}>{m.nom}</Ink>
              <Ink size={12.5} weight="bold" color={pa.texte2}>{traduirePluriel(m.exos.length, m.exos.length > 1, '{0} exercice', '{0} exercices', m.exos.length)}</Ink>
            </Pressable>
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

      {/* régler un exercice : séries, répétitions, repos, ordre */}
      <Sheet visible={!!reglage} onClose={() => setARegler(null)} title={reglage ? sansTiret(traduire(nomFr(reglage.nom))) : ''}>
        {reglage && sRegle && aRegler ? (
          <View style={{ gap: 16, paddingHorizontal: 2, paddingBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Ink size={15} weight="black" color={pa.texte} style={{ flex: 1 }}>{traduire('Séries')}</Ink>
              <Rond label="−" a11y={traduire('Une série de moins')} onPress={() => changerJour(aRegler.jour, reglerExo(sRegle, aRegler.index, { series: reglage.series - 1 }))} />
              <Ink size={22} weight="black" color={pa.texte} style={{ minWidth: 34, textAlign: 'center' }}>{String(reglage.series)}</Ink>
              <Rond label="+" a11y={traduire('Une série de plus')} onPress={() => changerJour(aRegler.jour, reglerExo(sRegle, aRegler.index, { series: reglage.series + 1 }))} />
            </View>
            <View style={{ gap: 8 }}>
              <Ink size={15} weight="black" color={pa.texte}>{reglage.secondes ? traduire('Secondes par série') : traduire('Répétitions par série')}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(reglage.secondes ? SECONDES : REPS).map(([a, b]) => {
                  const on = reglage.repsMin === a && reglage.repsMax === b;
                  return <Choix key={`${a}${b}`} label={reglage.secondes ? traduire('{0} à {1} s', a, b) : traduire('{0} à {1}', a, b)} on={on} onPress={() => changerJour(aRegler.jour, reglerExo(sRegle, aRegler.index, { repsMin: a, repsMax: b }))} />;
                })}
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Ink size={15} weight="black" color={pa.texte}>{traduire('Repos entre les séries')}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {REPOS.map((r) => (
                  <Choix key={r} label={r < 120 ? traduire('{0} s', r) : traduire('{0} min', r / 60)} on={reglage.reposSec === r} onPress={() => changerJour(aRegler.jour, { ...sRegle, exos: sRegle.exos.map((e, i) => (i === aRegler.index ? { ...e, reposSec: r } : e)) })} />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Choix label={traduire('Monter')} on={false} desactive={aRegler.index === 0} onPress={() => { changerJour(aRegler.jour, deplacerExo(sRegle, aRegler.index, -1)); setARegler({ ...aRegler, index: aRegler.index - 1 }); }} />
              <Choix label={traduire('Descendre')} on={false} desactive={aRegler.index >= sRegle.exos.length - 1} onPress={() => { changerJour(aRegler.jour, deplacerExo(sRegle, aRegler.index, 1)); setARegler({ ...aRegler, index: aRegler.index + 1 }); }} />
            </View>
            <Pressable onPress={() => { tap(); changerJour(aRegler.jour, sansExo(sRegle, aRegler.index)); setARegler(null); }} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
              <Ink size={14} weight="extraBold" color={pa.peche.titre}>{traduire('Retirer de la séance')}</Ink>
            </Pressable>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

/** Le jour ouvert (maquette Coach2-C-Construis) : ses exercices numérotés, les deux boutons d'ajout, le nom, le repos */
function JourOuvert({ jour, s, f, onFermer, onNom, onRegler, onParMuscle, onChercher, onMesSeances, onRepos }: {
  jour: string;
  s: SeancePerso;
  f: FamillePastel;
  onFermer: () => void;
  onNom: (t: string) => void;
  onRegler: (i: number) => void;
  onParMuscle: () => void;
  onChercher: () => void;
  onMesSeances?: () => void;
  onRepos: () => void;
}) {
  const pa = usePastel();
  const titre = traduire(titreDeSeance(s));
  return (
    <View style={{ borderRadius: 24, backgroundColor: f.fond, padding: 14, gap: 12 }}>
      <Pressable onPress={onFermer} accessibilityRole="button" accessibilityState={{ expanded: true }} accessibilityLabel={`${jour}, ${titre}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 }}>
        <Ink size={15} weight="extraBold" color={f.titre} style={{ width: 90 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{jour}</Ink>
        <Ink size={16} weight="black" color={pa.texte} style={{ flex: 1 }} numberOfLines={2}>{s.exos.length ? titre : traduire('Nouvelle séance')}</Ink>
        {s.exos.length ? <Ink size={13} weight="extraBold" color={pa.texte2}>{traduirePluriel(s.exos.length, s.exos.length > 1, '{0} exercice', '{0} exercices', s.exos.length)}</Ink> : null}
      </Pressable>

      {/* le nom de la séance : des idées en un toucher */}
      {/* 30 octobre 2026 : les idées passent à la ligne, plus aucune coupée au bord de la carte */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {NOMS_SEANCE.map((x) => {
          const on = s.titre === x;
          return (
            <Pressable key={x} onPress={() => { tap(); onNom(on ? '' : x); }} accessibilityRole="button" accessibilityState={{ selected: on }} style={({ pressed }) => ({ minHeight: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: 'center', backgroundColor: on ? pa.carte : pressed ? pa.carte : 'rgba(255,255,255,0.55)', borderWidth: 1.5, borderColor: on ? f.titre : 'transparent' })}>
              <Ink size={13} weight="extraBold" color={on ? f.titre : pa.texte2}>{traduire(x)}</Ink>
            </Pressable>
          );
        })}
      </View>

      {s.exos.length ? (
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

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <BoutonBlanc label={traduire('Ajouter par muscle')} onPress={onParMuscle} />
        <BoutonBlanc label={traduire('Chercher un exercice')} onPress={onChercher} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
        {onMesSeances ? (
          <Pressable onPress={onMesSeances} accessibilityRole="button" hitSlop={4} style={({ pressed }) => ({ minHeight: 40, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            <Ink size={13} weight="extraBold" color={pa.surBouton}>{traduire('Depuis mes séances')}</Ink>
          </Pressable>
        ) : <View />}
        <Pressable onPress={onRepos} accessibilityRole="button" hitSlop={4} style={({ pressed }) => ({ minHeight: 40, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
          <Ink size={13} weight="extraBold" color={pa.texte2}>{traduire('Repos ce jour')}</Ink>
        </Pressable>
      </View>
    </View>
  );
}

/** Une carte de modèle : son sticker, le nom du programme, ses séances par semaine ; cochée tant que ta semaine est la sienne */
function CarteModele({ programme, sticker, f, choisi, onPress }: { programme: Programme; sticker: NomSticker; f: FamillePastel; choisi: boolean; onPress: () => void }) {
  const pa = usePastel();
  const illus = useIllustrations();
  const titre = traduire(programme.titre);
  const sous = traduire('{0} séances par semaine', programme.joursParSemaine);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: choisi }}
      accessibilityLabel={`${traduire('Partir d’un modèle')} : ${titre}, ${sous}`}
      style={({ pressed }) => [{ width: 164, minHeight: 168, borderRadius: 24, padding: 14, gap: 8, justifyContent: 'space-between', backgroundColor: f.fond, borderWidth: 2, borderColor: choisi ? f.titre : 'transparent', transform: [{ scale: pressed ? 0.96 : 1 }] }, ombrePastel(pa.ombre)]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {illus.stickers ? (
          <Image source={illus.img(sticker)} style={{ width: 58, height: 58, marginLeft: -4, marginTop: -4 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        ) : (
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: pa.carte, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="dumbbell" size={20} color={f.titre} />
          </View>
        )}
        {choisi ? (
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: f.titre, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={15} color="#FFFFFF" strokeWidth={3} />
          </View>
        ) : null}
      </View>
      <View style={{ gap: 4 }}>
        <Ink size={15} weight="black" color={pa.texte} numberOfLines={3} style={{ lineHeight: 19 }}>{titre}</Ink>
        <Ink size={12} weight="extraBold" color={f.titre} numberOfLines={1}>{sous}</Ink>
      </View>
    </Pressable>
  );
}

function BoutonBlanc({ label, onPress }: { label: string; onPress: () => void }) {
  const pa = usePastel();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ flex: 1, minHeight: 48, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? pa.choisi : pa.carte }, ombrePastel(pa.ombre)]}>
      <Ink size={14} weight="extraBold" color={pa.surBouton} style={{ textAlign: 'center' }}>{label}</Ink>
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
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? pa.choisi : pressed ? pa.bleu.fond : pa.page, borderWidth: 1.5, borderColor: on ? pa.bordChoisi : pa.ligne, opacity: desactive ? 0.4 : 1 })}
    >
      <Ink size={14} weight={on ? 'extraBold' : 'bold'} color={on ? pa.bleu.encre : pa.texte}>{label}</Ink>
    </Pressable>
  );
}
