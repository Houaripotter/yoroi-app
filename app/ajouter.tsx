/**
 * Bouton + v2 (vague 39) : deux usages, dans cet ordre.
 * 1. Seance : tes sports favoris pour noter une seance faite en quelques touchers (mode seance faite,
 *    pas de chrono), Dicte ta seance mis en valeur, le creneau prevu aujourd'hui, Refaire ta derniere,
 *    (25 octobre 2026) Mes séances, tes seances enregistrees, Seance passee (date au choix), l'import de la montre quand Apple Sante ou Health Connect est relie,
 *    et le direct avec chrono en second. (24 octobre 2026) La seance du programme en cours en tete, sinon
 *    l'entree Programmes en bas de la carte.
 * 2. Corps : Pesee (poids) et Pesee par photo lue par ton IA (BALANCE 3, cote a cote), Balance connectee (composition, importee d'Apple Sante si relie),
 *    Mensurations, Photo de forme.
 * Le reste a sa vraie place (Sommeil et Eau dans « Ta forme du jour » de l'Accueil, Videos dans le
 * Carnet, Combat et Competition dans l'outil Combat et competition) et reste joignable ici dans
 * « Autre chose », replie.
 * 27 octobre 2026 (maquette choisie « Plus A, action principale ») : en haut le programme du jour en grande carte
 * lilas (ton personnage, ta semaine en mini barres, Démarrer) ; dessous trois tuiles pastel avec sticker (Séance,
 * Poids, Mensurations, les memes onglets qu'avant) ; puis « Note ta séance du jour » en pastilles avec sticker,
 * « Dicte ta séance » et « En direct », et « Autres façons » en liste fine. Sans programme : la meme carte propose
 * le creneau prevu aujourd'hui, sinon de choisir un programme. Memes actions, memes donnees, memes ancres de visite.
 * Ancienne version : _archive_ancien_design_2026-10-09/maquettes_choisies_2026-10-27/app/ajouter.tsx.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, PanResponder, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getProfile, getTrainings, getWeeklyPlan } from '@/lib/database';
import type { Training, WeeklyPlan } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { getEspace } from '@/lib/v2/espace';
import { fmtClock } from '@/lib/v2/seance/format';
import { loadDraft } from '@/lib/v2/seance/model';
import type { SeanceDraft } from '@/lib/v2/seance/model';
import { draftRoute, draftTitle } from '@/lib/v2/seance/resume';
import { DEFAULT_SPORTS, seanceRoute, sportImage, sportShortName } from '@/lib/v2/seance/sportVisuals';
import { mainSport, shortcutSports } from '@/lib/v2/seances/weekSummary';
import { firstSport, sessionTitle } from '@/lib/v2/seances/sessionData';
import { localISO } from '@/lib/v2/accueil/hydration';
import { getSanteSource, syncNow } from '@/lib/v2/sante/data';
import { findNextSlot } from '@/components/yoroi/v2/seances/NextUp';
import type { NextSlot } from '@/components/yoroi/v2/seances/NextUp';
import { P } from '@/components/yoroi/livePalette';
import { TourAnchor, registerTourScroller } from '@/components/yoroi/v2/tour/TourAnchor';
import { ecouterOngletPlus } from '@/lib/v2/visite/ongletPlus';
import { saisieDirecte } from '@/lib/v2/nav/direct';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { chargerProgrammeActif, joursDuProgramme, prochainJour, semaineDuProgramme } from '@/lib/v2/programmes/suivi';
import { routeDuCreneau } from '@/lib/v2/programmes/agenda';
import { resumeDuJour, routeDuJour } from '@/lib/v2/programmes/lancer';
import { chargerMesSeances } from '@/lib/v2/seance/mesSeances';
import { LETTRES_JOURS, semaineDe } from '@/lib/v2/sante/anneauxJours';
import { personnageImage } from '@/components/yoroi/v2/espace/assets';
import { useIdentite } from '@/lib/v2/espace/useIdentite';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';

// 26 octobre 2026 : illustrations des cartes Poids et Mensurations (Gemini) ; le personnage en attendant
const IMG_PESEE: ImageSourcePropType | null = null;
const IMG_MESURES: ImageSourcePropType | null = null;

type Other = { key: string; title: string; sub: string; href: string; params?: Record<string, string> };

/** Un jour de la semaine du programme, pour les mini barres */
type JourSemaine = { lettre: string; etat: 'fait' | 'jour' | 'prevu' | 'repos'; aujourdhui: boolean };

/** Le sticker de chaque sport des pastilles « Note ta séance » (repli : force) */
const STICKER_SPORT: Record<string, NomSticker> = {
  musculation: 'musculation', powerlifting: 'barre', halterophilie: 'barre', street_workout: 'barre',
  jjb: 'jjb', grappling: 'jjb', judo: 'kimono', lutte: 'combat', mma: 'combat', sparring: 'sparring',
  boxe: 'gants', muay_thai: 'gants', kickboxing: 'gants', karate: 'kimono',
  running: 'course', marche: 'sport_marche', velo: 'sport_velo', cycling: 'sport_velo', natation: 'sport_nage', rameur: 'sport_pagaie',
  fitness: 'kettlebell', crossfit: 'kettlebell', hiit: 'energie', yoga: 'mobilite',
  football: 'sport_football', basketball: 'sport_ballon', volleyball: 'sport_volley', tennis: 'sport_raquette',
};
const stickerDuSport = (s: string): NomSticker => STICKER_SPORT[s] ?? 'force';

export default function Ajouter() {
  useYoroiTheme(); // se redessine quand le theme change (la palette P est vivante)
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const [draft, setDraft] = useState<SeanceDraft | null>(null);
  const [favs, setFavs] = useState<string[]>(DEFAULT_SPORTS.slice(0, 3));
  const [femme, setFemme] = useState(false);
  const [main, setMain] = useState<string>('musculation');
  const [slot, setSlot] = useState<NextSlot | null>(null);
  const [last, setLast] = useState<Training | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [sync, setSync] = useState<'idle' | 'busy' | string>('idle');
  // 26 octobre 2026 (Houari : « l'utilisateur se perd ») : trois entrees claires en haut, dans cet ordre,
  // et seulement les choix de celle qui est choisie en dessous
  const [onglet, setOnglet] = useState<'seance' | 'mesures' | 'poids'>('seance');
  // 27 octobre 2026 : la visite guidee montre chaque onglet du menu (lib/v2/visite/ongletPlus.ts)
  useEffect(() => ecouterOngletPlus(setOnglet), []);
  // fermer en glissant vers le bas (feuille en haut de son defilement) ou sur le cote
  const glisse = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const enHaut = useRef(true);
  // 28 octobre 2026 : la visite guidee fait defiler le menu jusqu'a ce qu'elle montre (Autres façons est plus bas)
  const defileRef = useRef<ScrollView>(null);
  const defileY = useRef(0);
  useEffect(
    () =>
      registerTourScroller('ajouter', {
        scrollBy: (dy) => defileRef.current?.scrollTo({ y: Math.max(0, defileY.current + dy), animated: true }),
        scrollToTop: () => defileRef.current?.scrollTo({ y: 0, animated: true }),
      }),
    [],
  );
  const fermer = () => router.back();
  const geste = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => (g.dy > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.4 && enHaut.current) || (Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6),
      onPanResponderMove: (_e, g) => {
        if (Math.abs(g.dx) > Math.abs(g.dy)) glisse.setValue({ x: g.dx, y: 0 });
        else glisse.setValue({ x: 0, y: Math.max(0, g.dy) });
      },
      onPanResponderRelease: (_e, g) => {
        const loin = g.dy > 120 || g.vy > 1.1 || Math.abs(g.dx) > 110 || Math.abs(g.vx) > 1.1;
        if (loin) {
          const versX = Math.abs(g.dx) > Math.abs(g.dy);
          Animated.timing(glisse, { toValue: versX ? { x: g.dx > 0 ? 600 : -600, y: 0 } : { x: 0, y: 900 }, duration: 180, useNativeDriver: true }).start(() => fermer());
        } else {
          Animated.spring(glisse, { toValue: { x: 0, y: 0 }, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(glisse, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start(),
    }),
  ).current;
  // 24 octobre 2026 : seance du programme en cours (lib/v2/programmes)
  const [prog, setProg] = useState<{ route: { pathname: string; params: Record<string, string> }; titre: string; resume: string; semaine: JourSemaine[] } | null>(null);
  const { armure } = useIdentite();
  const [personnage, setPersonnage] = useState<string | null>(null);
  const illus = useIllustrations();
  // 25 octobre 2026 : tes seances enregistrees (lib/v2/seance/mesSeances.ts)
  const [mesNoms, setMesNoms] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [d, espace, profile, trainings, plan] = await Promise.all([
          loadDraft(),
          getEspace(),
          getProfile().catch(() => null),
          getTrainings(90).catch(() => [] as Training[]),
          getWeeklyPlan().catch(() => [] as WeeklyPlan[]),
        ]);
        setDraft(d);
        setFemme(espace?.personnage?.startsWith('guerrier_f') || profile?.avatar_gender === 'femme');
        setPersonnage(espace?.personnage ?? null);
        const list = trainings ?? [];
        // sport principal : le premier favori, sinon le plus pratique
        setMain(mainSport(espace.sportsFavoris, list));
        setFavs(shortcutSports(espace.sportsFavoris, list, DEFAULT_SPORTS, 4));
        const today = localISO();
        const doneToday = list.some((t) => t.date.slice(0, 10) === today);
        const next = findNextSlot(plan ?? [], doneToday);
        setSlot(next && next.dayOffset === 0 && next.slot.id ? next : null);
        const sorted = [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id ?? 0) - (a.id ?? 0)));
        setLast(sorted[0]?.id ? sorted[0] : null);
      } catch {
        // le menu reste utilisable avec les valeurs par defaut
      }
    })();
    chargerProgrammeActif()
      .then((a) => {
        const s = a ? prochainJour(a) : null;
        if (!a || !s) {
          setProg(null);
          return;
        }
        const sem = semaineDuProgramme(a);
        // la semaine en mini barres : faite, aujourd'hui, prevue, repos (lundi a dimanche)
        const auj = localISO();
        const jours = joursDuProgramme(a, s.programme);
        const semaine: JourSemaine[] = semaineDe(auj).map((iso, i) => {
          const fait = a.faits.some((f) => f.date === iso);
          const prevu = jours.includes(i);
          return { lettre: LETTRES_JOURS[i], aujourdhui: iso === auj, etat: fait ? 'fait' : iso === auj && prevu ? 'jour' : prevu ? 'prevu' : 'repos' };
        });
        setProg({ route: routeDuJour(s.programme, s.jour, sem), titre: traduire('Jour {0}, {1}', s.index + 1, traduire(s.jour.titre)), resume: resumeDuJour(s.jour, sem), semaine });
      })
      .catch(() => setProg(null));
    chargerMesSeances()
      .then((l) => setMesNoms(l.map((s) => s.nom)))
      .catch(() => setMesNoms([]));
    // Apple Sante ou Health Connect relie : l'import de la montre et de la balance apparait
    getSanteSource()
      .then((s) => setProvider(s.mode === 'live' ? s.provider : null))
      .catch(() => setProvider(null));
  }, []);

  // 15 octobre 2026 (navigation directe) : la feuille est REMPLACEE par l'ecran choisi, en un seul geste.
  // Avant : router.back() puis router.push() 120 ms plus tard, on voyait l'Accueil revenir avant la page.
  // Le retour depuis l'ecran ouvert ramene a l'Accueil, pas a la feuille.
  const open = (href: string, params?: Record<string, string>) => {
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    // 26 octobre 2026 (Houari : « quand j'appuie sur retour, ca quitte le + ») : l'ecran s'ouvre PAR DESSUS
    // la feuille ; le retour ramene au +, pas a l'Accueil
    router.push(params ? { pathname: href as any, params } : (href as any));
  };

  // une seance faite : la saisie du sport en mode « seance faite » (jour, heure, duree, details), sans chrono
  const noteSport = (s: string) => open(seanceRoute(s), { sport: s, form: '1' });

  // creneau prevu aujourd'hui : meme lancement que l'ancien bouton de l'onglet Seances
  const startSlot = () => {
    if (!slot) return;
    const s = slot.slot;
    // vague 37 : le creneau se note (seance faite, sans chrono) ; le direct reste dans « En direct »
    const params: Record<string, string> = { slotId: String(s.id), prefillSport: s.sport, date: localISO(), form: '1' };
    if (s.club_id) params.prefillClubId = String(s.club_id);
    if (s.time) params.prefillTime = s.time;
    if (s.duration_minutes) params.prefillDuration = String(s.duration_minutes);
    // creneau du programme : la prochaine seance du programme (lib/v2/programmes/agenda.ts)
    void routeDuCreneau(s.id).then((r) => {
      if (r) return open(r.pathname, { ...params, ...r.params });
      // le sport est connu : la saisie du sport tout de suite, sans l'ecran relais /seance
      const d = saisieDirecte(s.sport, params);
      if (d) open(d.pathname, d.params);
      else open('/seance', params);
    });
  };

  const repeatLast = () => {
    if (!last?.id) return;
    const s = firstSport(last.sport) || 'musculation';
    open(seanceRoute(s), { sport: s, repeatId: String(last.id), form: '1' });
  };

  // la montre : on relance la synchro d'Apple Sante ici, le menu reste ouvert pour voir le resultat
  const syncWatch = async () => {
    if (sync === 'busy') return;
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    setSync('busy');
    try {
      const before = (await getTrainings(14).catch(() => [] as Training[])).length;
      const ok = await syncNow();
      const after = (await getTrainings(14).catch(() => [] as Training[])).length;
      const n = Math.max(0, after - before);
      if (ok) notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      setSync(!ok ? traduire('La synchro n’a pas marché, réessaie.') : n === 0 ? traduire('Rien de nouveau depuis ta montre.') : traduirePluriel(n, n > 1, "{0} séance récupérée.", "{0} séances récupérées.", n));
    } catch {
      setSync(traduire('La synchro n’a pas marché, réessaie.'));
    }
  };

  const others: Other[] = [
    { key: 'sommeil', title: traduire('Sommeil'), sub: traduire('aussi sur l’Accueil, Ta forme du jour'), href: '/sleep-input' },
    { key: 'eau', title: 'Eau', sub: traduire('aussi sur l’Accueil, Ta forme du jour'), href: '/hydration' },
    { key: 'video', title: traduire('Vidéo'), sub: traduire('aussi dans le Carnet'), href: '/training-journal', params: { tab: 'videos', add: '1' } },
    { key: 'combat', title: traduire('Combat'), sub: traduire('un résultat en compétition'), href: '/seance/match' },
    { key: 'competition', title: traduire('Compétition'), sub: traduire('ta prochaine date'), href: '/add-competition' },
  ];

  const heroImg = sportImage(main, femme, 1);
  // 27 octobre 2026 : ton personnage (celui de ton accueil), sinon l'illustration de ton sport principal
  const perso = personnage ? personnageImage(personnage, armure?.rank.index ?? 0, femme ? 'f' : 'h') : heroImg;
  const slotTitle = slot ? slot.slot.label || getSportName(slot.slot.sport) : '';
  const slotTime = slot?.slot.time ? traduire(" à {0}", slot.slot.time.slice(0, 5).replace(':', ' h ')) : '';
  const pastilles = favs.slice(0, 3);

  // la grande carte du haut : ton programme, sinon le creneau prevu aujourd'hui, sinon choisir un programme
  const carte = prog
    ? { label: traduire('Ton programme, aujourd’hui'), titre: prog.titre, sous: prog.resume, bouton: traduire('Démarrer'), semaine: prog.semaine, onPress: () => open(prog.route.pathname, prog.route.params) }
    : slot
      ? { label: traduire('Prévu aujourd’hui'), titre: `${slotTitle}${slotTime}`, sous: traduire('ton créneau de la semaine'), bouton: traduire('Démarrer'), semaine: null, onPress: startSlot }
      : { label: traduire('Ton programme'), titre: traduire('Suis un programme'), sous: traduire('PPL, Upper Lower...'), bouton: traduire('Choisir'), semaine: null, onPress: () => open('/programmes') };

  const autres: { key: string; titre: string; sous: string; sticker: NomSticker; onPress: () => void }[] = [
    ...(prog && slot ? [{ key: 'slot', titre: traduire('Prévu aujourd’hui'), sous: `${slotTitle}${slotTime}`, sticker: 'calendrier' as NomSticker, onPress: startSlot }] : []),
    ...(last ? [{ key: 'refaire', titre: traduire('Refaire ta dernière'), sous: sessionTitle(last), sticker: 'repeter' as NomSticker, onPress: repeatLast }] : []),
    { key: 'mes', titre: traduire('Mes séances'), sous: mesNoms.length === 0 ? traduire('à refaire en un appui') : mesNoms.slice(0, 2).join(', '), sticker: 'carnet', onPress: () => open('/mes-seances') },
    { key: 'passee', titre: traduire('Séance passée'), sous: traduire('un autre jour'), sticker: 'calendrier', onPress: () => open('/seance/deja-faite') },
    { key: 'importer', titre: traduire('Importer'), sous: traduire('tes notes, une autre app'), sticker: 'donnees', onPress: () => open('/importer-carnet') },
    { key: 'quoi', titre: traduire('Quoi faire ?'), sous: traduire('YOROI fait ta séance'), sticker: 'zones_corps', onPress: () => open('/programmes/zones') },
    ...(provider
      ? [{ key: 'montre', titre: traduire('Ta montre'), sous: sync === 'idle' ? traduire('récupérer tes séances') : sync === 'busy' ? traduire('synchro en cours') : sync, sticker: 'sante_appareils' as NomSticker, onPress: syncWatch }]
      : []),
  ];

  const ombre = { shadowColor: '#1D2033', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 };

  return (
    <Pressable onPress={() => router.back()} style={{ flex: 1, backgroundColor: 'rgba(29,32,41,0.45)', justifyContent: 'flex-end' }} accessibilityLabel={traduire("Fermer")}>
      <Animated.View {...geste.panHandlers} style={{ transform: [{ translateX: glisse.x }, { translateY: glisse.y }] }}>
      <Pressable onPress={() => {}} style={{ backgroundColor: P.paper, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, maxHeight: height * 0.92 }}>
        <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: P.pastelEteint, marginBottom: 14 }} accessibilityLabel={traduire('Glisse vers le bas pour fermer')} />
        <ScrollView ref={defileRef} bounces={false} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={(e) => { defileY.current = e.nativeEvent.contentOffset.y; enHaut.current = e.nativeEvent.contentOffset.y <= 2; }} contentContainerStyle={{ paddingHorizontal: MARGE, paddingBottom: insets.bottom + 24 }}>
          <Ink size={26} weight="black" tight style={{ marginBottom: 14 }} accessibilityRole="header">{traduire("Enregistrer")}</Ink>

          {draft ? (
            <Pressable onPress={() => open(draftRoute(draft), { resume: '1' })} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 60, borderRadius: 22, paddingHorizontal: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? P.primaryPressed : P.primary })}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: P.onPrimary }} />
              <View style={{ flex: 1 }}>
                <Ink size={13} weight="bold" color={P.onPrimary} style={{ opacity: 0.8 }}>{traduire("Séance en cours, {0}", fmtClock((Date.now() - draft.startedAt) / 1000))}</Ink>
                <Ink size={17} weight="black" color={P.onPrimary} numberOfLines={2}>{traduire("Reprendre : {0}", draftTitle(draft))}</Ink>
              </View>
            </Pressable>
          ) : null}

          {/* 1. L'action principale : ton programme du jour, en grande carte lilas */}
          <TourAnchor id="ajouter.jour" rayon={26}>
            <CarteDuJour {...carte} image={perso} largeur={width - 2 * MARGE} />
          </TourAnchor>

          {/* 2. Les trois onglets, en tuiles pastel avec sticker (memes onglets qu'avant, ordre de la maquette) */}
          <TourAnchor id="ajouter.onglets" rayon={22} style={{ flexDirection: 'row', gap: 10, marginTop: 14 }} accessibilityRole="tablist">
            {([
              { k: 'seance' as const, t: traduire('Séance'), st: 'musculation' as NomSticker, fond: P.primary, texte: P.onPrimary },
              { k: 'poids' as const, t: traduire('Poids'), st: 'balance' as NomSticker, fond: P.tuileMentheFond, texte: P.tuileMentheTexte },
              { k: 'mesures' as const, t: traduire('Mensurations'), st: 'metre_ruban' as NomSticker, fond: P.tuileSableFond, texte: P.tuileSableTexte },
            ]).map((o) => {
              const on = onglet === o.k;
              return (
                <Pressable
                  key={o.k}
                  onPress={() => { impactAsync(ImpactFeedbackStyle.Light).catch(() => {}); setOnglet(o.k); }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={o.t}
                  style={({ pressed }) => ({ flex: 1, height: 92, borderRadius: 22, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: o.fond, borderWidth: 2, borderColor: on ? o.texte : 'transparent', opacity: pressed ? 0.85 : 1 })}
                >
                  <Image source={illus.img(o.st)} style={{ width: 38, height: 38 }} resizeMode="contain" />
                  <Ink size={13.5} weight="black" color={o.texte} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ paddingHorizontal: 6 }}>{o.t}</Ink>
                </Pressable>
              );
            })}
          </TourAnchor>

          {onglet === 'seance' ? (<>
          {/* 3. Note ta seance du jour : tes sports en pastilles avec sticker */}
          <TourAnchor id="ajouter.seance" rayon={23} style={{ marginTop: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Ink size={15} weight="black" accessibilityRole="header">{traduire("Note ta séance du jour")}</Ink>
              <Pressable onPress={() => open('/seance')} accessibilityRole="button" accessibilityLabel={traduire("Noter une séance faite, choisir le sport")} hitSlop={10}>
                <Ink size={13} weight="extraBold" color={P.accentText}>{traduire("Autre sport")}</Ink>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              {pastilles.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => noteSport(s)}
                  accessibilityRole="button"
                  accessibilityLabel={traduire("Noter une séance de {0} faite aujourd’hui", sportShortName(s))}
                  style={({ pressed }) => ({ flex: 1, height: 46, borderRadius: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8, backgroundColor: pressed ? P.line2 : P.white, ...ombre })}
                >
                  <Image source={illus.img(stickerDuSport(s))} style={{ width: 22, height: 22 }} resizeMode="contain" />
                  <Ink size={14} weight="black" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ flexShrink: 1 }}>{sportShortName(s)}</Ink>
                </Pressable>
              ))}
            </View>
          </TourAnchor>

          {/* 4. Dicte ta seance et En direct */}
          <TourAnchor id="ajouter.facons" rayon={22} style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Facon titre={traduire("Dicte ta séance")} sous={traduire("ou colle tes notes")} sticker={illus.img('noter')} a11y={traduire("Dicte ta séance en une phrase")} onPress={() => open('/quick-log')} />
            <Facon titre={traduire("En direct")} sous={traduire("avec le chrono et le repos")} sticker={illus.img('chrono')} a11y={traduire("En direct, démarrer avec le chrono")} onPress={() => open('/seance', { live: '1' })} />
          </TourAnchor>

          {/* 5. Autres facons : une liste fine, petit sticker, titre, detail, chevron */}
          <Ink size={15} weight="black" style={{ marginTop: 18 }} accessibilityRole="header">{traduire("Autres façons")}</Ink>
          <TourAnchor id="ajouter.autres" rayon={22} style={{ marginTop: 8, backgroundColor: P.white, borderRadius: 22, paddingHorizontal: 14, ...ombre }}>
            {autres.map((o, i) => (
              <Pressable
                key={o.key}
                onPress={o.onPress}
                accessibilityRole="button"
                accessibilityLabel={`${o.titre}, ${o.sous}`}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 9, borderBottomWidth: i < autres.length - 1 ? 1 : 0, borderColor: P.line2, opacity: pressed ? 0.7 : 1 })}
              >
                <Image source={illus.img(o.sticker)} style={{ width: 26, height: 26 }} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Ink size={14.5} weight="black" numberOfLines={1}>{o.titre}</Ink>
                  <Ink size={12} weight="bold" color={P.ink2} numberOfLines={1}>{o.sous}</Ink>
                </View>
                {o.key === 'montre' && sync === 'busy' ? <ActivityIndicator size="small" color={P.chevron} /> : <Chevron />}
              </Pressable>
            ))}
          </TourAnchor>
          </>) : null}

          {/* MENSURATIONS (meme style de grande carte, en sable) */}
          {onglet === 'mesures' ? (
            <TourAnchor id="ajouter.detail" rayon={26} style={{ marginTop: 14 }}>
            <Hero
              titre={traduire('Tes mensurations')}
              sous={traduire('taille, bras, cuisses, au ruban')}
              image={IMG_MESURES ?? illus.img('metre_ruban')}
              fond={P.tuileSableFond}
              texte={P.tuileSableTexte}
              onPress={() => open('/add-measurement')}
              a11y={traduire('Ajouter mes mensurations')}
              puces={[
                { t: traduire('Mesurer'), on: () => open('/add-measurement') },
                { t: traduire('Évolution'), on: () => open('/measurements-detail') },
                { t: traduire('Photo'), on: () => open('/photos') },
              ]}
            />
            </TourAnchor>
          ) : null}

          {/* POIDS : a la main, par photo de la balance, composition (en menthe) */}
          {onglet === 'poids' ? (
            <TourAnchor id="ajouter.detail" rayon={26} style={{ marginTop: 14 }}>
            <Hero
              titre={traduire('Ta pesée')}
              sous={traduire('ton poids du jour, ta composition')}
              image={IMG_PESEE ?? illus.img('balance')}
              fond={P.tuileMentheFond}
              texte={P.tuileMentheTexte}
              onPress={() => open('/pesee')}
              a11y={traduire('Pesée, ton poids du jour')}
              puces={[
                { t: traduire('Poids'), on: () => open('/pesee') },
                { t: traduire('Par photo'), on: () => open('/balance-photo') },
                { t: traduire('Composition'), on: () => open('/body-composition') },
              ]}
            />
            </TourAnchor>
          ) : null}

          {/* Autre chose : de petites pilules blanches, toujours visibles */}
          <Ink size={15} weight="black" style={{ marginTop: 18 }} accessibilityRole="header">{traduire("Autre chose")}</Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {others.map((o) => (
              <Pressable
                key={o.key}
                onPress={() => open(o.href, o.params)}
                accessibilityRole="button"
                accessibilityLabel={`${o.title}, ${o.sub}`}
                style={({ pressed }) => ({ height: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center', backgroundColor: pressed ? P.line2 : P.white, ...ombre })}
              >
                <Ink size={14} weight="extraBold">{traduire(o.title)}</Ink>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Pressable>
      </Animated.View>
    </Pressable>
  );
}

/** Marge laterale de la feuille (maquette : 18) */
const MARGE = 18;

function Chevron() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M9 6l6 6-6 6" stroke={P.chevron} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/**
 * La grande carte du haut (maquette Plus A) : degrade lilas, etiquette prune, titre, detail, la semaine en mini
 * barres, le bouton blanc Démarrer, et ton personnage en bas a droite.
 */
function CarteDuJour({ label, titre, sous, bouton, semaine, onPress, image, largeur }: { label: string; titre: string; sous: string; bouton: string; semaine: JourSemaine[] | null; onPress: () => void; image: ImageSourcePropType | null; largeur: number }) {
  const couleur = (e: JourSemaine['etat']) => (e === 'fait' ? P.semaineFaite : e === 'jour' ? P.semaineJour : e === 'prevu' ? P.semainePrevue : P.semaineRepos);
  return (
    <LinearGradient colors={[P.programmeFond, P.programmeFond2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 26, padding: 16, overflow: 'hidden' }}>
      {image ? <Image source={image} style={{ position: 'absolute', right: -6, bottom: -20, width: 120, height: 150 }} resizeMode="contain" accessible={false} /> : null}
      <View style={{ maxWidth: Math.min(220, largeur - 32 - 110) }}>
        <Ink size={11} weight="black" color={P.etiquettePrune} style={{ letterSpacing: 1.6 }}>{label.toLocaleUpperCase()}</Ink>
        <Ink size={19} weight="black" style={{ marginTop: 6, lineHeight: 24 }} numberOfLines={2}>{titre}</Ink>
        <Ink size={12.5} weight="bold" color={P.ink2} style={{ marginTop: 4 }} numberOfLines={2}>{sous}</Ink>
      </View>
      {semaine ? (
        <View style={{ flexDirection: 'row', gap: 5, marginTop: 12, alignItems: 'flex-end' }} accessible accessibilityLabel={traduire('Ta semaine : {0} séances faites sur {1} prévues', semaine.filter((j) => j.etat === 'fait').length, semaine.filter((j) => j.etat !== 'repos').length)}>
          {semaine.map((j, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 3 }}>
              <View style={{ height: 22, justifyContent: 'flex-end' }}>
                <View style={{ width: 22, height: j.etat === 'repos' ? 6 : 22, borderRadius: 6, backgroundColor: j.aujourdhui && j.etat === 'repos' ? P.semainePrevue : couleur(j.etat) }} />
              </View>
              <Ink size={9.5} weight="black" color={j.aujourdhui ? P.ink : P.ink2}>{j.lettre}</Ink>
            </View>
          ))}
        </View>
      ) : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${bouton}, ${titre}`}
        style={({ pressed }) => ({ alignSelf: 'flex-start', marginTop: 14, height: 48, paddingHorizontal: 22, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: pressed ? P.line2 : P.white, shadowColor: '#1D2033', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 })}
      >
        <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M7 4l13 8-13 8z" fill={P.accentText} /></Svg>
        <Ink size={15} weight="black" color={P.accentText}>{bouton}</Ink>
      </Pressable>
    </LinearGradient>
  );
}

/** Dicte ta seance, En direct : une carte blanche, sticker, titre, une ligne */
function Facon({ titre, sous, sticker, a11y, onPress }: { titre: string; sous: string; sticker: ImageSourcePropType; a11y: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => ({ flex: 1, minHeight: 104, borderRadius: 22, padding: 14, justifyContent: 'space-between', backgroundColor: pressed ? P.line2 : P.white, shadowColor: '#1D2033', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 })}
    >
      <Image source={sticker} style={{ width: 34, height: 34 }} resizeMode="contain" />
      <View style={{ gap: 2, marginTop: 8 }}>
        <Ink size={15.5} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{titre}</Ink>
        <Ink size={12} weight="bold" color={P.ink2} numberOfLines={2}>{sous}</Ink>
      </View>
    </Pressable>
  );
}

/**
 * Grande carte des onglets Poids et Mensurations : l'aplat pastel de sa tuile, titre, une ligne, des pilules
 * blanches, et le sticker a droite.
 */
function Hero({ titre, sous, image, fond, texte, onPress, a11y, puces }: { titre: string; sous: string; image: ImageSourcePropType | null; fond: string; texte: string; onPress: () => void; a11y: string; puces: { t: string; on: () => void }[] }) {
  return (
    <View style={{ minHeight: 150, borderRadius: 26, backgroundColor: fond, overflow: 'hidden', padding: 16 }}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={({ pressed }) => ({ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: pressed ? 0.9 : 1 })}>
        {image ? <Image source={image} style={{ position: 'absolute', right: 14, top: 16, width: 92, height: 92 }} resizeMode="contain" /> : null}
      </Pressable>
      <View pointerEvents="none" style={{ gap: 4, maxWidth: '62%' }}>
        <Ink size={19} weight="black" tight color={texte}>{titre}</Ink>
        <Ink size={12.5} weight="bold" color={P.ink2} numberOfLines={2}>{sous}</Ink>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 16 }}>
        {puces.map((p) => (
          <Pressable key={p.t} onPress={p.on} accessibilityRole="button" hitSlop={4} style={({ pressed }) => ({ height: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center', backgroundColor: pressed ? P.line2 : P.white })}>
            <Ink size={13.5} weight="black" color={texte}>{p.t}</Ink>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
