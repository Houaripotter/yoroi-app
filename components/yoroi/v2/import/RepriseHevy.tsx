/**
 * « Tu viens de Hevy ? Ramène tout » (18 novembre 2026). Le parcours complet, le meme depuis l'onboarding (premier
 * ecran, components/yoroi/v2/onboarding/Accroche.tsx) et depuis l'onglet Seances (Importer, app/reprise-hevy.tsx) :
 *  1. le guide, illustre avec nos stickers (pas de captures d'une autre app) : sortir le fichier de Hevy ;
 *  2. le fichier choisi (selecteur de documents : YOROI ne recoit pas encore un fichier partage directement) ;
 *  3. la verification : ce qui a ete compris, ta routine (decocher une seance, la renommer, ou ne garder que
 *     l'historique), tes exercices (refuser une correspondance, choisir le muscle d'un exercice a toi) ;
 *  4. l'enregistrement : historique sans doublon, exercices a toi, routine (jamais a la place de ton programme en
 *     cours sans te demander) ;
 *  5. Bienvenue : ce qui est revenu.
 * Rien n'est envoye nulle part : le fichier est lu sur le telephone (lib/v2/import/repriseHevy.ts, pur et teste).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { BigButton, Glass } from '@/components/yoroi/v2/seances/ui';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { lireCarnet } from '@/lib/v2/import/carnet';
import type { SeanceLue } from '@/lib/v2/import/carnet';
import { reconnaitreExo } from '@/lib/v2/import/vocabulaire';
import {
  appliquerChoix,
  bilanReprise,
  correspondances,
  estAToi,
  MUSCLES_CHOIX,
  NOM_ROUTINE_HEVY,
  nomFinal,
  reconnaitreHevy,
  reconstruireRoutine,
  refusParDefaut,
  versMesSeances,
  versProgrammeHevy,
} from '@/lib/v2/import/repriseHevy';
import type { BilanReprise, Correspondance, Routine } from '@/lib/v2/import/repriseHevy';
import { enregistrerCarnet } from '@/lib/v2/import/enregistrerCarnet';
import { ajouterExosAToi, autreProgrammeEnCours, enregistrerRoutine, garderDansMesSeances, muscleBibliotheque, routineHevyExistante } from '@/lib/v2/import/enregistrerReprise';
import { programmeParId } from '@/lib/v2/programmes/catalogue';
import type { ProgrammePerso } from '@/lib/v2/programmes/monProgramme';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import type { ExoCherchable } from '@/lib/v2/seance/rechercheExo';
import { niceGroup } from '@/lib/v2/seance/format';
import { logger } from '@/lib/security/logger';
import { LOCALE, traduire, traduirePluriel } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

let BIBLIO: ExoCherchable[] | null = null;
const biblio = (): ExoCherchable[] =>
  (BIBLIO ??= EXERCISE_LIBRARY.filter((e) => e.category === 'musculation' || e.unit === 'reps').map((e, rang) => ({ name: e.name, autre: nomFr(e.name) !== e.name ? nomFr(e.name) : undefined, muscle: e.muscle, rang })));
const reconnaitre = (n: string) => reconnaitreHevy(n, (x) => reconnaitreExo(x, biblio()), biblio());

/** texte sur le bleu de l'accent (onPrimary est le bleu nuit du bouton pastel) */
const BLANC = '#FFFFFF';

/** Ce que l'onboarding garde de l'import : tes jours de seance (0 = lundi) */
export type FinReprise = { jours: number[]; seances: number };

/** « lundi » (16 novembre 2026 est un lundi) */
const nomJour = (d: number) => new Date(2026, 10, 16 + d, 12).toLocaleDateString(LOCALE, { weekday: 'long' });
const dateCourte = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
const nomExo = (n: string) => sansTiret(traduire(nomFr(n)));

const ETAPES: { sticker: NomSticker; texte: string }[] = [
  { sticker: 'profil', texte: 'Dans Hevy, ouvre ton Profil, puis les Réglages.' },
  { sticker: 'engrenage', texte: 'Touche Exporter et importer les données.' },
  { sticker: 'tableur', texte: 'Touche Exporter les séances : Hevy prépare un fichier CSV.' },
  { sticker: 'partager', texte: 'Enregistre le fichier dans Fichiers, ou envoie le toi.' },
  { sticker: 'telephone', texte: 'Reviens ici et choisis le fichier.' },
];

/**
 * apercu : rien n'est lu ni ecrit (apercu du Studio, mode createur). demo : un export deja lu, pour les rendus et
 * l'apercu (l'ecran s'ouvre a l'etape demandee, sans rien enregistrer).
 */
export function RepriseHevy({ depuisOnboarding = false, apercu = false, demo, onFermer, onFini }: { depuisOnboarding?: boolean; apercu?: boolean; demo?: { texte: string; etape: 'verif' | 'bienvenue' }; onFermer: () => void; onFini: (r: FinReprise) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const illus = useIllustrations();
  const [etape, setEtape] = useState<'guide' | 'verif' | 'enregistrement' | 'bienvenue'>('guide');
  const [brut, setBrut] = useState<SeanceLue[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lecture, setLecture] = useState(false);
  const [refus, setRefus] = useState<Set<string>>(new Set());
  const [muscles, setMuscles] = useState<Record<string, string>>({});
  const [decochees, setDecochees] = useState<Set<string>>(new Set());
  const [nom, setNom] = useState(traduire(NOM_ROUTINE_HEVY));
  const [garderRoutine, setGarderRoutine] = useState(true);
  const [toutVoir, setToutVoir] = useState(false);
  const [existante, setExistante] = useState<ProgrammePerso | null>(null);
  const [progres, setProgres] = useState({ fait: 0, total: 0 });
  const [fin, setFin] = useState<{ bilan: BilanReprise; dejaLa: number; routine: 'ab' | 'semaine' | 'mes' | null; nbRoutine: number; sansPlace: number; jours: number[] } | null>(null);

  useEffect(() => {
    if (apercu) return;
    routineHevyExistante().then((p) => {
      setExistante(p);
      // un deuxieme import sert d'habitude a l'historique : la routine deja la n'est pas touchee d'office
      if (p) setGarderRoutine(false);
    }, () => {});
  }, [apercu]);

  useEffect(() => {
    if (!demo) return;
    const lu = lireCarnet(demo.texte).seances;
    setRefus(refusParDefaut(correspondances(lu, reconnaitre, muscleBibliotheque)));
    setBrut(lu);
    setEtape(demo.etape === 'bienvenue' ? 'bienvenue' : 'verif');
  }, [demo]);

  const liste: Correspondance[] = useMemo(() => (brut ? correspondances(brut, reconnaitre, muscleBibliotheque) : []), [brut]);
  const finales = useMemo(() => (brut ? appliquerChoix(brut, liste, refus) : []), [brut, liste, refus]);
  const routine: Routine = useMemo(() => reconstruireRoutine(finales), [finales]);
  // les exercices que YOROI relie (ou propose de relier) a un des siens
  const reliees = liste.filter((c2) => !!c2.propose && c2.propose !== c2.saisi);
  const aToi = liste.filter((c2) => estAToi(c2, refus));
  const muscleDe = (c2: Correspondance) => muscles[c2.saisi] ?? c2.muscle;
  const sansMuscle = aToi.filter((c2) => !muscleDe(c2));
  const gardees = routine.seances.filter((s) => !decochees.has(s.cle));
  // demo : l'ecran Bienvenue avec ce que la reprise aurait enregistre
  useEffect(() => {
    if (demo?.etape !== 'bienvenue' || !finales.length || fin) return;
    const nb = routine.seances.length;
    setFin({ bilan: bilanReprise(finales), dejaLa: 0, routine: routine.rythme === 'ab' ? 'ab' : routine.rythme === 'semaine' ? 'semaine' : nb ? 'mes' : null, nbRoutine: nb, sansPlace: 0, jours: [] });
  }, [demo, finales, routine, fin]);

  const choisirFichier = async () => {
    if (apercu) return;
    setErreur(null);
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'], copyToCacheDirectory: true });
      if (r.canceled || !r.assets?.[0]) return;
      setLecture(true);
      const t = await FileSystem.readAsStringAsync(r.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      const lu = lireCarnet(t);
      const hevy = lu.seances.length > 0 && lu.seances.every((s) => s.cle.startsWith('hevy:'));
      if (!hevy) {
        setErreur(traduire('Ce fichier ne ressemble pas à l’export des séances de Hevy. Dans Hevy, choisis Exporter les séances, puis réessaie.'));
        return;
      }
      const l = correspondances(lu.seances, reconnaitre, muscleBibliotheque);
      setRefus(refusParDefaut(l));
      setBrut(lu.seances);
      setEtape('verif');
    } catch (e) {
      logger.warn('[RepriseHevy] fichier illisible', e);
      setErreur(traduire('Fichier illisible. Réessaie avec le fichier exporté depuis Hevy.'));
    } finally {
      setLecture(false);
    }
  };

  const basculerRefus = (saisi: string) => setRefus((s) => {
    const n = new Set(s);
    if (n.has(saisi)) n.delete(saisi);
    else n.add(saisi);
    return n;
  });

  const toutReprendre = async () => {
    if (!brut || apercu) return;
    const avecProgramme = garderRoutine && routine.rythme !== 'aucun' && gardees.length > 0;
    const muscleFinal = (n: string) => muscleBibliotheque(n) ?? (() => {
      const c2 = liste.find((x) => nomFinal(x, refus) === n);
      return c2 ? muscleDe(c2) : null;
    })();
    const pp = avecProgramme ? versProgrammeHevy(routine, { nom, garder: (k) => !decochees.has(k), muscleDe: muscleFinal }) : null;
    const lancer = async (suivre: boolean) => {
      setEtape('enregistrement');
      setProgres({ fait: 0, total: finales.length });
      try {
        const b = await enregistrerCarnet(finales, (fait, total) => setProgres({ fait, total }));
        const ajout = await ajouterExosAToi(aToi.map((c2) => ({ nom: nomFinal(c2, refus), muscle: muscleDe(c2) })));
        let quoi: 'ab' | 'semaine' | 'mes' | null = null;
        let nb = 0;
        let jours: number[] = [];
        if (pp) {
          const s = await enregistrerRoutine(pp, { suivre, remplacerId: existante?.id ?? null });
          if (s) {
            quoi = s.ab ? 'ab' : 'semaine';
            nb = gardees.length;
            jours = Array.from(new Set([...s.semaine, ...(s.semaineB ?? [])].map((x, i) => (x ? i % 7 : -1)).filter((d) => d >= 0))).sort();
          }
        } else if (garderRoutine && routine.rythme === 'aucun' && gardees.length) {
          nb = await garderDansMesSeances(versMesSeances(routine, (k) => !decochees.has(k), muscleFinal));
          if (nb) quoi = 'mes';
        }
        setFin({ bilan: bilanReprise(finales), dejaLa: b.dejaLa, routine: quoi, nbRoutine: nb, sansPlace: ajout.sansPlace, jours });
        setEtape('bienvenue');
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      } catch (e) {
        logger.error('[RepriseHevy] reprise interrompue', e);
        appAlert(traduire('Enregistrement impossible'), traduire('Réessaie dans un instant.'));
        setEtape('verif');
      }
    };
    if (!pp) return void lancer(false);
    // 18 novembre 2026 : ton programme en cours n'est jamais remplace sans toi
    const autre = await autreProgrammeEnCours(existante?.id);
    if (!autre) return void lancer(true);
    const titre = programmeParId(autre)?.titre ?? '';
    appAlert(traduire('Tu suis déjà un programme'), traduire('Tu suis « {0} ». Ta routine Hevy le remplace, ou tu gardes les deux ? Rien n’est effacé.', traduire(titre)), [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Garder les deux'), onPress: () => void lancer(false) },
      { text: traduire('Remplacer'), onPress: () => void lancer(true) },
    ]);
  };

  const terminer = () => onFini({ jours: fin?.jours ?? [], seances: fin?.bilan.seances ?? 0 });

  const sticker = (n: NomSticker, t = 44) => <Image source={illus.img(n)} style={{ width: t, height: t }} resizeMode="contain" accessibilityIgnoresInvertColors />;

  const phraseRoutine = (): string => {
    const n = gardees.length;
    const noms = gardees.map((s) => s.titre).join(', ');
    if (routine.rythme === 'ab') return traduirePluriel(n, n > 1, 'On a trouvé {0} séance : {1}, en semaine A et semaine B', 'On a trouvé {0} séances : {1}, en semaine A et semaine B', n, noms);
    if (routine.rythme === 'semaine') return traduirePluriel(n, n > 1, 'On a trouvé {0} séance : {1}, chaque semaine', 'On a trouvé {0} séances : {1}, chaque semaine', n, noms);
    return traduirePluriel(n, n > 1, 'On a trouvé {0} séance qui revient : {1}', 'On a trouvé {0} séances qui reviennent : {1}', n, noms);
  };

  const sousSeance = (s: Routine['seances'][number]): string => {
    const quand = s.jour === null ? traduirePluriel(s.fois, s.fois > 1, 'faite {0} fois', 'faite {0} fois', s.fois) : nomJour(s.jour);
    const semaine = s.semaine === 'A' ? traduire('Semaine A') : s.semaine === 'B' ? traduire('Semaine B') : routine.rythme === 'aucun' ? '' : traduire('Chaque semaine');
    const exos = traduirePluriel(s.exos.length, s.exos.length > 1, '{0} exercice', '{0} exercices', s.exos.length);
    return [semaine, quand, exos].filter(Boolean).join(', ');
  };

  /* ---------------------------------- les ecrans ---------------------------------- */

  const guide = (
    <>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 6 }}>
        {sticker('carnet', 92)}
        <Ink size={26} weight="black" tight style={{ textAlign: 'center' }} accessibilityRole="header">{traduire('Ramène tout depuis Hevy')}</Ink>
        <Ink size={15} color={c.textSecondary} style={{ textAlign: 'center', lineHeight: 21 }}>{traduire('Tes séances, ta routine, tes exercices à toi et tes records. Tout reste sur ton téléphone.')}</Ink>
      </View>
      <Glass style={{ gap: 14, padding: 18 }}>
        {ETAPES.map((e, i) => (
          <View key={e.sticker} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View>
              {sticker(e.sticker, 46)}
              <View style={{ position: 'absolute', right: -4, top: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={12} weight="black" color={BLANC}>{String(i + 1)}</Ink>
              </View>
            </View>
            <Ink size={15} weight="bold" style={{ flex: 1, lineHeight: 20 }}>{traduire(e.texte)}</Ink>
          </View>
        ))}
      </Glass>
      <Ink size={12} color={c.textMuted} style={{ lineHeight: 17 }}>{traduire('Les noms des menus peuvent changer un peu selon ta version de Hevy. Le fichier ne quitte pas ton téléphone : YOROI le lit ici, sans connexion.')}</Ink>
      {erreur ? <Ink size={14} weight="bold" color={c.danger}>{erreur}</Ink> : null}
    </>
  );

  const carteExo = (x: Correspondance) => {
    const relie = !estAToi(x, refus);
    return (
      <View key={x.saisi} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={14} weight="extraBold" numberOfLines={2}>{x.saisi}</Ink>
          <Ink size={12} color={relie ? c.textSecondary : c.textMuted} numberOfLines={2}>
            {relie ? traduire('relié à {0}', nomExo(x.propose as string)) : traduire('YOROI propose {0}', nomExo(x.propose as string))}
          </Ink>
        </View>
        <Pressable onPress={() => basculerRefus(x.saisi)} accessibilityRole="button" accessibilityState={{ selected: relie }} hitSlop={6} style={({ pressed }) => ({ minHeight: 36, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: relie ? c.border : c.accent, backgroundColor: pressed ? c.fillSubtle : 'transparent' })}>
          <Ink size={12} weight="extraBold" color={relie ? c.textSecondary : c.accent}>{relie ? traduire('Garder mon nom') : traduire('Relier')}</Ink>
        </Pressable>
      </View>
    );
  };

  const choixMuscle = (x: Correspondance) => {
    const m = muscleDe(x);
    return (
      <View key={x.saisi} style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ink size={14} weight="extraBold" style={{ flex: 1 }} numberOfLines={2}>{x.saisi}</Ink>
          {m ? <Ink size={12} weight="bold" color={c.accent}>{niceGroup(m)}</Ink> : null}
        </View>
        {!x.muscle ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {MUSCLES_CHOIX.map((g) => {
              const on = m === g;
              return (
                <Pressable key={g} onPress={() => setMuscles((v) => ({ ...v, [x.saisi]: g }))} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 34, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? c.accent : c.fillSubtle }}>
                  <Ink size={12} weight="extraBold" color={on ? BLANC : c.textSecondary}>{niceGroup(g)}</Ink>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    );
  };

  const verif = brut ? (
    <>
      <Glass style={{ gap: 6, padding: 18 }}>
        <Ink size={12} weight="black" color={c.accent} style={{ letterSpacing: 0.6 }}>{traduire('CE QUE YOROI A COMPRIS')}</Ink>
        <Ink size={22} weight="black" tight>{traduirePluriel(finales.length, finales.length > 1, '{0} séance', '{0} séances', finales.length)}</Ink>
        {finales.length ? <Ink size={13} color={c.textSecondary}>{traduire('du {0} au {1}', dateCourte(finales[0].date), dateCourte(finales[finales.length - 1].date))}</Ink> : null}
      </Glass>

      <Glass style={{ gap: 10, padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {sticker('calendrier', 40)}
          <Ink size={18} weight="black" tight style={{ flex: 1 }}>{traduire('Ta routine')}</Ink>
        </View>
        {routine.seances.length ? (
          <>
            <Ink size={15} weight="bold" style={{ lineHeight: 21 }}>{phraseRoutine()}</Ink>
            {routine.rythme === 'aucun' ? <Ink size={13} color={c.textSecondary} style={{ lineHeight: 18 }}>{traduire('Tes jours changent d’une semaine à l’autre : pas de planning deviné. Tes séances iront dans Mes séances, prêtes à relancer.')}</Ink> : null}
            {routine.seances.map((s) => {
              const on = !decochees.has(s.cle);
              return (
                <Pressable key={s.cle} onPress={() => setDecochees((d) => { const n = new Set(d); if (n.has(s.cle)) n.delete(s.cle); else n.add(s.cle); return n; })} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider, opacity: garderRoutine ? 1 : 0.45 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: on ? c.accent : c.border, backgroundColor: on ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Ink size={15} weight="black" color={BLANC}>✓</Ink> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Ink size={15} weight="extraBold" numberOfLines={1}>{s.titre}</Ink>
                    <Ink size={12} color={c.textMuted}>{sousSeance(s)}</Ink>
                  </View>
                </Pressable>
              );
            })}
            {routine.rythme !== 'aucun' && garderRoutine ? (
              <View style={{ gap: 4, paddingTop: 6 }}>
                <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('Nom de ta routine')}</Ink>
                <TextInput value={nom} onChangeText={setNom} maxLength={40} style={{ minHeight: 46, borderRadius: 14, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.surface, paddingHorizontal: 14, color: c.ink, fontSize: 15 }} accessibilityLabel={traduire('Nom de ta routine')} />
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4 }}>
              {[true, false].map((v) => {
                const on = garderRoutine === v;
                const label = v ? (routine.rythme === 'aucun' ? traduire('Garder mes séances') : existante ? traduire('Mettre à jour ma routine') : traduire('Créer ma routine')) : traduire('Juste l’historique');
                return (
                  <Pressable key={String(v)} onPress={() => setGarderRoutine(v)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1.5, borderColor: on ? c.accent : c.border, backgroundColor: on ? c.accentTint : 'transparent' }}>
                    <Ink size={13} weight="extraBold" color={on ? c.accent : c.textSecondary} style={{ textAlign: 'center' }}>{label}</Ink>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <Ink size={14} color={c.textSecondary}>{traduire('Pas de séance qui revient sur tes 12 dernières semaines : on garde ton historique, tu construiras ta routine ensuite.')}</Ink>
        )}
      </Glass>

      {reliees.length ? (
        <Glass style={{ gap: 4, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
            {sticker('musculation', 40)}
            <View style={{ flex: 1 }}>
              <Ink size={18} weight="black" tight>{traduire('Tes exercices')}</Ink>
              <Ink size={12} color={c.textMuted}>{traduire('Relié : ton historique rejoint l’exercice de YOROI. Garder mon nom : il reste à toi.')}</Ink>
            </View>
          </View>
          {(toutVoir ? reliees : reliees.slice(0, 8)).map(carteExo)}
          {reliees.length > 8 && !toutVoir ? (
            <Pressable onPress={() => setToutVoir(true)} accessibilityRole="button" style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={13} weight="extraBold" color={c.accent}>{traduire('Voir les {0} exercices', reliees.length)}</Ink>
            </Pressable>
          ) : null}
        </Glass>
      ) : null}

      {aToi.length ? (
        <Glass style={{ gap: 4, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
            {sticker('reglage_machine', 40)}
            <View style={{ flex: 1 }}>
              <Ink size={18} weight="black" tight>{traduirePluriel(aToi.length, aToi.length > 1, '{0} exercice à toi', '{0} exercices à toi', aToi.length)}</Ink>
              <Ink size={12} color={c.textMuted}>{sansMuscle.length ? traduire('Gardés avec ton nom. Choisis le muscle principal de ceux qu’on ne devine pas.') : traduire('Gardés avec ton nom, avec leur historique et leurs records.')}</Ink>
            </View>
          </View>
          {[...sansMuscle, ...aToi.filter((x) => muscleDe(x) && !sansMuscle.includes(x))].slice(0, toutVoir ? 999 : 12).map(choixMuscle)}
        </Glass>
      ) : null}
    </>
  ) : null;

  const bienvenue = fin ? (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 10 }}>
        {sticker('trophee', 104)}
        <Ink size={28} weight="black" tight style={{ textAlign: 'center' }} accessibilityRole="header">{traduire('Bienvenue, tout est là')}</Ink>
      </View>
      <Glass style={{ gap: 14, padding: 18 }}>
        {[
          { s: 'carnet' as NomSticker, t: traduirePluriel(fin.bilan.seances, fin.bilan.seances > 1, '{0} séance récupérée', '{0} séances récupérées', fin.bilan.seances) },
          { s: 'musculation' as NomSticker, t: traduirePluriel(fin.bilan.exercices, fin.bilan.exercices > 1, '{0} exercice dont {1} à toi', '{0} exercices dont {1} à toi', fin.bilan.exercices, fin.bilan.aToi) },
          { s: 'records' as NomSticker, t: traduirePluriel(fin.bilan.records, fin.bilan.records > 1, '{0} record', '{0} records', fin.bilan.records) },
          ...(fin.routine ? [{ s: 'calendrier' as NomSticker, t: fin.routine === 'ab' ? traduire('Ta routine en semaine A et B') : fin.routine === 'semaine' ? traduirePluriel(fin.nbRoutine, fin.nbRoutine > 1, 'Ta routine, {0} séance par semaine', 'Ta routine, {0} séances par semaine', fin.nbRoutine) : traduirePluriel(fin.nbRoutine, fin.nbRoutine > 1, '{0} séance dans Mes séances', '{0} séances dans Mes séances', fin.nbRoutine) }] : []),
        ].map((l) => (
          <View key={l.s} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {sticker(l.s, 40)}
            <Ink size={17} weight="extraBold" style={{ flex: 1 }}>{l.t}</Ink>
          </View>
        ))}
      </Glass>
      {fin.dejaLa > 0 ? <Ink size={13} color={c.textSecondary}>{traduirePluriel(fin.dejaLa, fin.dejaLa > 1, '{0} était déjà dans YOROI, gardée une seule fois.', '{0} étaient déjà dans YOROI, gardées une seule fois.', fin.dejaLa)}</Ink> : null}
      {fin.sansPlace > 0 ? <Ink size={13} color={c.textSecondary}>{traduire('{0} exercices à toi restent dans ton historique, sans être ajoutés à tes machines : la liste est pleine.', fin.sansPlace)}</Ink> : null}
    </View>
  ) : null;

  const bas = etape === 'guide'
    ? <BigButton label={lecture ? traduire('Lecture') : traduire('Choisir le fichier Hevy')} icon="download" onPress={() => void choisirFichier()} />
    : etape === 'verif'
      ? <BigButton label={traduire('Tout reprendre')} icon="check" onPress={() => void toutReprendre()} />
      : etape === 'enregistrement'
        ? (
          <View style={{ minHeight: 56, borderRadius: 18, backgroundColor: c.primary, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={c.onPrimary} />
            <Ink size={16} weight="extraBold" color={c.onPrimary}>{traduire('{0} sur {1}', progres.fait, progres.total)}</Ink>
          </View>
        )
        : <BigButton label={depuisOnboarding ? traduire('Continuer') : traduire('Voir mes séances')} onPress={terminer} />;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 14 }} keyboardShouldPersistTaps="handled">
        <EnTete
          titre={etape === 'bienvenue' ? traduire('Reprise terminée') : traduire('Reprise depuis Hevy')}
          onRetour={etape === 'verif' ? () => setEtape('guide') : etape === 'enregistrement' ? () => {} : etape === 'bienvenue' ? terminer : onFermer}
          repli="/(tabs)/seances"
          style={{ marginHorizontal: -22, marginTop: -8 }}
        />
        {etape === 'guide' ? guide : etape === 'bienvenue' ? bienvenue : verif}
      </ScrollView>
      <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 16 }}>{bas}</View>
    </View>
  );
}

export default RepriseHevy;
