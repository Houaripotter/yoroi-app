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
 */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, PanResponder, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
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
import { DEFAULT_SPORTS, seanceRoute, sportImage, sportShortName, sportTint } from '@/lib/v2/seance/sportVisuals';
import { mainSport, shortcutSports } from '@/lib/v2/seances/weekSummary';
import { firstSport, sessionTitle } from '@/lib/v2/seances/sessionData';
import { localISO } from '@/lib/v2/accueil/hydration';
import { getSanteSource, syncNow } from '@/lib/v2/sante/data';
import { findNextSlot } from '@/components/yoroi/v2/seances/NextUp';
import type { NextSlot } from '@/components/yoroi/v2/seances/NextUp';
import { P } from '@/components/yoroi/livePalette';
import { TourAnchor } from '@/components/yoroi/v2/tour/TourAnchor';
import { saisieDirecte } from '@/lib/v2/nav/direct';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { chargerProgrammeActif, prochainJour, semaineDuProgramme } from '@/lib/v2/programmes/suivi';
import { routeDuCreneau } from '@/lib/v2/programmes/agenda';
import { routeDuJour } from '@/lib/v2/programmes/lancer';
import { chargerMesSeances } from '@/lib/v2/seance/mesSeances';

// 26 octobre 2026 : illustrations des cartes Poids et Mensurations (Gemini) ; le personnage en attendant
const IMG_PESEE: ImageSourcePropType | null = null;
const IMG_MESURES: ImageSourcePropType | null = null;

type Other = { key: string; title: string; sub: string; href: string; params?: Record<string, string> };

export default function Ajouter() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
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
  // fermer en glissant vers le bas (feuille en haut de son defilement) ou sur le cote
  const glisse = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const enHaut = useRef(true);
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
  const [prog, setProg] = useState<{ route: { pathname: string; params: Record<string, string> }; titre: string } | null>(null);
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
        setProg(s ? { route: routeDuJour(s.programme, s.jour, semaineDuProgramme(a!)), titre: traduire('Jour {0}, {1}', s.index + 1, traduire(s.jour.titre)) } : null);
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

  const stroke = { stroke: c.ink, strokeWidth: 2.2, fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const accentStroke = { ...stroke, stroke: c.accent };

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
  // Puces de sport : jamais sous le personnage (130 de large, cale a droite de la carte).
  const chipsRoom = width - 44 - 18 - (heroImg ? 124 : 18);
  const chipWidth = (s: string) => 28 + sportShortName(s).length * 8.2;
  const heroChips = favs.slice(0, 3).reduce<{ list: string[]; used: number }>((acc, s) => {
    const w = chipWidth(s) + (acc.list.length ? 6 : 0);
    if (acc.list.length === 0 || acc.used + w <= chipsRoom) return { list: [...acc.list, s], used: acc.used + w };
    return acc;
  }, { list: [], used: 0 }).list;
  const slotTitle = slot ? slot.slot.label || getSportName(slot.slot.sport) : '';
  const slotTime = slot?.slot.time ? traduire(" à {0}", slot.slot.time.slice(0, 5).replace(':', ' h ')) : '';

  const card = { borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' as const };

  return (
    <Pressable onPress={() => router.back()} style={{ flex: 1, backgroundColor: 'rgba(29,32,41,0.45)', justifyContent: 'flex-end' }} accessibilityLabel={traduire("Fermer")}>
      <Animated.View {...geste.panHandlers} style={{ transform: [{ translateX: glisse.x }, { translateY: glisse.y }] }}>
      <Pressable onPress={() => {}} style={{ backgroundColor: c.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 12, maxHeight: height * 0.92 }}>
        <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: 8 }} accessibilityLabel={traduire('Glisse vers le bas pour fermer')} />
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={(e) => { enHaut.current = e.nativeEvent.contentOffset.y <= 2; }} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 24, gap: 10 }}>
          <Ink size={24} weight="black" tight style={{ paddingHorizontal: 4, marginBottom: 2 }} accessibilityRole="header">{traduire("Enregistrer")}</Ink>

          {draft ? (
            <Pressable onPress={() => open(draftRoute(draft), { resume: '1' })} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 60, borderRadius: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.accentPressed : c.accent })}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.onAccent }} />
              <View style={{ flex: 1 }}>
                <Ink size={13} weight="bold" color={c.onAccent} style={{ opacity: 0.8 }}>{traduire("Séance en cours, {0}", fmtClock((Date.now() - draft.startedAt) / 1000))}</Ink>
                <Ink size={17} weight="black" color={c.onAccent} numberOfLines={2}>{traduire("Reprendre : {0}", draftTitle(draft))}</Ink>
              </View>
            </Pressable>
          ) : null}

          {/* 26 octobre 2026 : les trois entrees, dans l'ordre voulu par Houari : seance, mensurations, poids */}
          <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="tablist">
            {([
              { k: 'seance' as const, t: traduire('Séance'), d: 'M6.5 7v10M17.5 7v10M4 9.5v5M20 9.5v5M6.5 12h11' },
              { k: 'mesures' as const, t: traduire('Mensurations'), d: 'M3 9h18v6H3zM7 9v3M11 9v4M15 9v3M19 9v2' },
              { k: 'poids' as const, t: traduire('Poids'), d: 'M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM7.5 10a4.5 4.5 0 0 1 9 0z' },
            ]).map((o) => {
              const on = onglet === o.k;
              return (
                <Pressable
                  key={o.k}
                  onPress={() => { impactAsync(ImpactFeedbackStyle.Light).catch(() => {}); setOnglet(o.k); }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={o.t}
                  style={({ pressed }) => ({ flex: 1, minHeight: 74, borderRadius: 20, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: on ? c.accent : pressed ? c.fillSubtle : c.surface, borderWidth: on ? 0 : 1, borderColor: c.border })}
                >
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: on ? 'rgba(255,255,255,0.18)' : c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
                    <Svg width={16} height={16} viewBox="0 0 24 24"><Path d={o.d} {...stroke} stroke={on ? c.onAccent : c.accent} /></Svg>
                  </View>
                  <Ink size={14} weight="black" color={on ? c.onAccent : c.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{o.t}</Ink>
                </Pressable>
              );
            })}
          </View>

          {onglet === 'seance' ? (<>
          {/* 1. LA SEANCE : une seance faite en quelques touchers */}
          <TourAnchor id="ajouter.seance" style={{ height: 132, borderRadius: 24, backgroundColor: c.darkCard, overflow: 'hidden' }}>
            <Pressable onPress={() => open('/seance')} accessibilityRole="button" accessibilityLabel={traduire("Noter une séance faite, choisir le sport")} style={({ pressed }) => ({ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: pressed ? 0.9 : 1 })}>
              {heroImg ? <Image source={heroImg} style={{ position: 'absolute', right: -6, bottom: -56, width: 130, height: 176 }} resizeMode="contain" /> : null}
              <View style={{ position: 'absolute', left: 18, top: 18, gap: 3, maxWidth: '62%' }}>
                <Ink size={22} weight="black" tight color={c.onDark}>{traduire("Note ta séance")}</Ink>
                <Ink size={13} color={c.onDarkSecondary} numberOfLines={1}>{traduire("faite aujourd’hui, touche ton sport")}</Ink>
              </View>
            </Pressable>
            <View style={{ position: 'absolute', left: 18, bottom: 14, right: heroImg ? 124 : 18, flexDirection: 'row', gap: 6, overflow: 'hidden' }}>
              {heroChips.map((s) => (
                <Pressable key={s} onPress={() => noteSport(s)} accessibilityRole="button" accessibilityLabel={traduire("Noter une séance de {0} faite aujourd’hui", sportShortName(s))} hitSlop={4} style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', backgroundColor: pressed ? P.white : sportTint(s) })}>
                  <Ink size={13} weight="extraBold" color={c.ink}>{sportShortName(s)}</Ink>
                </Pressable>
              ))}
            </View>
          </TourAnchor>

          {/* 26 octobre 2026 (Houari : « revois le design, je veux la qualite ») : deux grandes entrees,
              ce qui est prevu aujourd'hui, puis les autres facons en grille, aeree */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => open('/quick-log')}
              accessibilityRole="button"
              accessibilityLabel={traduire("Dicte ta séance en une phrase")}
              style={({ pressed }) => ({ flex: 1, minHeight: 112, borderRadius: 22, padding: 14, justifyContent: 'space-between', backgroundColor: pressed ? c.fillSubtle : c.accentTint })}
            >
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={17} height={17} viewBox="0 0 24 24"><Path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" {...stroke} stroke={c.onAccent} /><Path d="M6 11a6 6 0 0 0 12 0M12 17v4" {...stroke} stroke={c.onAccent} /></Svg>
              </View>
              <View style={{ gap: 2 }}>
                <Ink size={17} weight="black" tight>{traduire("Dicte ta séance")}</Ink>
                <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2}>{traduire("ou colle tes notes")}</Ink>
              </View>
            </Pressable>
            <Pressable
              onPress={() => open('/seance', { live: '1' })}
              accessibilityRole="button"
              accessibilityLabel={traduire("En direct, démarrer avec le chrono")}
              style={({ pressed }) => ({ flex: 1, minHeight: 112, borderRadius: 22, padding: 14, justifyContent: 'space-between', backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}
            >
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={17} height={17} viewBox="0 0 24 24"><Circle cx={12} cy={13} r={8} {...accentStroke} /><Path d="M12 9v4l2.5 1.5M10 2.5h4" {...accentStroke} /></Svg>
              </View>
              <View style={{ gap: 2 }}>
                <Ink size={17} weight="black" tight>{traduire("En direct")}</Ink>
                <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2}>{traduire("avec le chrono et le repos")}</Ink>
              </View>
            </Pressable>
          </View>

          {prog || slot ? (
            <>
              <Label>{traduire("Aujourd’hui")}</Label>
              {prog ? (
                <CarteDuJour label={traduire("Ton programme")} titre={prog.titre} onPress={() => open(prog.route.pathname, prog.route.params)} />
              ) : null}
              {slot ? (
                <CarteDuJour label={traduire("Prévu aujourd’hui")} titre={`${slotTitle}${slotTime}`} onPress={startSlot} />
              ) : null}
            </>
          ) : null}

          <Label>{traduire("Autres façons")}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {last ? (
              <Tuile titre={traduire("Refaire ta dernière")} sous={sessionTitle(last)} onPress={repeatLast} icone={<Path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5" {...accentStroke} />} />
            ) : null}
            <Tuile
              titre={traduire("Mes séances")}
              sous={mesNoms.length === 0 ? traduire("à refaire en un appui") : mesNoms.slice(0, 2).join(', ')}
              onPress={() => open('/mes-seances')}
              icone={<Path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1z" {...accentStroke} />}
            />
            <Tuile titre={traduire("Séance passée")} sous={traduire("un autre jour")} onPress={() => open('/seance/deja-faite')} icone={<><Rect x={4} y={5.5} width={16} height={15} rx={3} {...accentStroke} /><Path d="M4 10h16M9 3.5v4M15 3.5v4" {...accentStroke} /></>} />
            <Tuile titre={traduire("Importer")} sous={traduire("tes notes, une autre app")} onPress={() => open('/importer-carnet')} icone={<Path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19h14" {...accentStroke} />} />
            <Tuile titre={traduire("Quoi faire ?")} sous={traduire("YOROI fait ta séance")} onPress={() => open('/programmes/zones')} icone={<Path d="M12 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM8 10h8l-1 5h-1.5l-.5 6h-2l-.5-6H9z" {...accentStroke} />} />
            {!prog ? (
              <Tuile titre={traduire("Programmes")} sous={traduire("PPL, Upper Lower...")} onPress={() => open('/programmes')} icone={<Path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" {...accentStroke} />} />
            ) : null}
            {provider ? (
              <Tuile
                titre={traduire("Ta montre")}
                sous={sync === 'idle' ? traduire('récupérer tes séances') : sync === 'busy' ? traduire('synchro en cours') : sync}
                onPress={syncWatch}
                icone={<><Rect x={6.5} y={6} width={11} height={12} rx={3} {...accentStroke} /><Path d="M9 6l.6-3h4.8l.6 3M9 18l.6 3h4.8l.6-3M12 10v2.5l1.5 1" {...accentStroke} /></>}
              />
            ) : null}
          </View>

          </>) : null}

          {/* 2. MENSURATIONS (26 octobre 2026 : meme style que « Note ta seance », que Houari adore) */}
          {onglet === 'mesures' ? (
            <Hero
              titre={traduire('Tes mensurations')}
              sous={traduire('taille, bras, cuisses, au ruban')}
              image={IMG_MESURES ?? heroImg}
              onPress={() => open('/add-measurement')}
              a11y={traduire('Ajouter mes mensurations')}
              puces={[
                { t: traduire('Mesurer'), on: () => open('/add-measurement'), fond: '#E3E9F3' },
                { t: traduire('Évolution'), on: () => open('/measurements-detail'), fond: '#E9E4D6' },
                { t: traduire('Photo'), on: () => open('/photos'), fond: '#E2EADB' },
              ]}
            />
          ) : null}

          {/* 3. POIDS : a la main, par photo de la balance, composition (meme style que « Note ta seance ») */}
          {onglet === 'poids' ? (
            <Hero
              titre={traduire('Ta pesée')}
              sous={traduire('ton poids du jour, ta composition')}
              image={IMG_PESEE ?? heroImg}
              onPress={() => open('/pesee')}
              a11y={traduire('Pesée, ton poids du jour')}
              puces={[
                { t: traduire('Poids'), on: () => open('/pesee'), fond: '#E3E9F3' },
                { t: traduire('Par photo'), on: () => open('/balance-photo'), fond: '#E9E4D6' },
                { t: traduire('Composition'), on: () => open('/body-composition'), fond: '#E2EADB' },
              ]}
            />
          ) : null}

          {/* 26 octobre 2026 (Houari : « Autre chose en bas, c'est moche ») : de petites puces, toujours visibles */}
          <Label>{traduire("Autre chose")}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {others.map((o) => (
              <Pressable
                key={o.key}
                onPress={() => open(o.href, o.params)}
                accessibilityRole="button"
                accessibilityLabel={`${o.title}, ${o.sub}`}
                style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}
              >
                <Ink size={14} weight="bold">{traduire(o.title)}</Ink>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Pressable>
      </Animated.View>
    </Pressable>
  );
}

function Label({ children }: { children: string }) {
  const { theme } = useYoroiTheme();
  return <Ink size={13} weight="extraBold" color={theme.colors.textSecondary} style={{ paddingHorizontal: 4, marginTop: 6, letterSpacing: 0.3 }}>{children}</Ink>;
}

/**
 * Grande carte illustree, dans le style de « Note ta seance » (Houari : « ca, c'est magnifique, ca donne envie ») :
 * fond indigo, titre, une ligne, des puces, l'illustration a droite.
 */
function Hero({ titre, sous, image, onPress, a11y, puces }: { titre: string; sous: string; image: ImageSourcePropType | null; onPress: () => void; a11y: string; puces: { t: string; on: () => void; fond: string }[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ height: 150, borderRadius: 24, backgroundColor: c.darkCard, overflow: 'hidden' }}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={({ pressed }) => ({ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: pressed ? 0.9 : 1 })}>
        {image ? <Image source={image} style={{ position: 'absolute', right: -6, bottom: -40, width: 136, height: 180 }} resizeMode="contain" /> : null}
        <View style={{ position: 'absolute', left: 18, top: 18, gap: 3, maxWidth: '62%' }}>
          <Ink size={22} weight="black" tight color={c.onDark}>{titre}</Ink>
          <Ink size={13} color={c.onDarkSecondary} numberOfLines={1}>{sous}</Ink>
        </View>
      </Pressable>
      <View style={{ position: 'absolute', left: 18, bottom: 14, right: image ? 124 : 18, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {puces.map((p) => (
          <Pressable key={p.t} onPress={p.on} accessibilityRole="button" hitSlop={4} style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 12, borderRadius: 12, justifyContent: 'center', backgroundColor: pressed ? '#FFFFFF' : p.fond })}>
            <Ink size={13} weight="extraBold" color={c.ink}>{p.t}</Ink>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Une entree de la grille « Autres facons » : icone, titre, une ligne de detail */
function Tuile({ titre, sous, onPress, icone }: { titre: string; sous: string; onPress: () => void; icone: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const w = (width - 44 - 10) / 2;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titre}, ${sous}`}
      style={({ pressed }) => ({ width: w, minHeight: 92, borderRadius: 20, padding: 13, gap: 8, justifyContent: 'space-between', backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}
    >
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={15} height={15} viewBox="0 0 24 24">{icone}</Svg>
      </View>
      <View style={{ gap: 2 }}>
        <Ink size={15} weight="extraBold" tight numberOfLines={1}>{titre}</Ink>
        <Ink size={12} weight="medium" color={c.textSecondary} numberOfLines={1}>{sous}</Ink>
      </View>
    </Pressable>
  );
}

/** Ce qui est prevu aujourd'hui : une grande ligne, un bouton lecture a droite */
function CarteDuJour({ label, titre, onPress }: { label: string; titre: string; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${titre}`}
      style={({ pressed }) => ({ minHeight: 72, borderRadius: 22, paddingLeft: 16, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.fillSubtle : c.accentTint })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={12} weight="black" color={c.accent} style={{ letterSpacing: 0.4 }}>{label.toLocaleUpperCase()}</Ink>
        <Ink size={17} weight="black" tight numberOfLines={2}>{titre}</Ink>
      </View>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M8 5v14l11-7z" fill={c.onAccent} /></Svg>
      </View>
    </Pressable>
  );
}

