/**
 * Bouton + v2 (vague 39) : deux usages, dans cet ordre.
 * 1. Seance : tes sports favoris pour noter une seance faite en quelques touchers (mode seance faite,
 *    pas de chrono), Dicte ta seance mis en valeur, le creneau prevu aujourd'hui, Refaire ta derniere,
 *    Seance passee (date au choix), l'import de la montre quand Apple Sante ou Health Connect est relie,
 *    et le direct avec chrono en second.
 * 2. Corps : Pesee (poids) et Pesee par photo lue par ton IA (BALANCE 3, cote a cote), Balance connectee (composition, importee d'Apple Sante si relie),
 *    Mensurations, Photo de forme.
 * Le reste a sa vraie place (Sommeil et Eau dans « Ta forme du jour » de l'Accueil, Videos dans le
 * Carnet, Combat et Competition dans l'outil Combat et competition) et reste joignable ici dans
 * « Autre chose », replie.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
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
  const [more, setMore] = useState(false);

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
    router.replace(params ? { pathname: href as any, params } : (href as any));
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
    // le sport est connu : la saisie du sport tout de suite, sans l'ecran relais /seance
    const d = saisieDirecte(s.sport, params);
    if (d) open(d.pathname, d.params);
    else open('/seance', params);
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
      <Pressable onPress={() => {}} style={{ backgroundColor: c.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 12, maxHeight: height * 0.92 }}>
        <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: 8 }} />
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 24, gap: 10 }}>
          <Ink size={24} weight="black" tight style={{ paddingHorizontal: 4, marginBottom: 2 }} accessibilityRole="header">{traduire("Enregistrer")}</Ink>

          {draft ? (
            <Pressable onPress={() => open(draftRoute(draft), { resume: '1' })} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 60, borderRadius: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? c.accentPressed : c.accent })}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.onAccent }} />
              <View style={{ flex: 1 }}>
                <Ink size={13} weight="bold" color={c.onAccent} style={{ opacity: 0.8 }}>{traduire("Séance en cours, {0}", fmtClock((Date.now() - draft.startedAt) / 1000))}</Ink>
                <Ink size={17} weight="black" color={c.onAccent} numberOfLines={2}>{`Reprendre : ${draftTitle(draft)}`}</Ink>
              </View>
            </Pressable>
          ) : null}

          {/* 1. LA SEANCE : une seance faite en quelques touchers */}
          <Label>{traduire("Séance")}</Label>
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

          {/* Dicte ta seance : une phrase, un ecran de verification */}
          <Pressable
            onPress={() => open('/quick-log')}
            accessibilityRole="button"
            accessibilityLabel={traduire("Dicte ta séance en une phrase")}
            style={({ pressed }) => ({ minHeight: 78, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: pressed ? c.fillSubtle : c.accentTint, borderWidth: 1, borderColor: c.accent + '33' })}
          >
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" {...stroke} stroke={c.onAccent} /><Path d="M6 11a6 6 0 0 0 12 0M12 17v4" {...stroke} stroke={c.onAccent} /></Svg>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={18} weight="black" tight>{traduire("Dicte ta séance")}</Ink>
              <Ink size={13} color={c.textSecondary} numberOfLines={2}>{traduire("« JJB 1 h 30 ce soir, intense, 6 rounds »")}</Ink>
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M9 6l6 6-6 6" {...accentStroke} /></Svg>
          </Pressable>

          <View style={card}>
            {slot ? (
              <QuickRow first label={traduire("Prévu aujourd’hui")} title={`${slotTitle}${slotTime}`} onPress={startSlot} icon={<Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M7 4.5v15l13-7.5z" fill={c.accent} /></Svg>} />
            ) : null}
            {last ? (
              <QuickRow first={!slot} label={traduire("Refaire ta dernière")} title={sessionTitle(last)} onPress={repeatLast} icon={<Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5" {...accentStroke} /></Svg>} />
            ) : null}
            <QuickRow first={!slot && !last} label={traduire("Séance passée")} title={traduire("Un autre jour, date au choix")} onPress={() => open('/seance/deja-faite')} icon={<Svg width={18} height={18} viewBox="0 0 24 24"><Rect x={4} y={5.5} width={16} height={15} rx={3} {...accentStroke} /><Path d="M4 10h16M9 3.5v4M15 3.5v4" {...accentStroke} /></Svg>} />
            {provider ? (
              <QuickRow
                label={traduire("Ta montre, via {0}", provider)}
                title={sync === 'idle' ? traduire('Récupérer tes séances') : sync === 'busy' ? 'Synchro en cours...' : sync}
                onPress={syncWatch}
                right={sync === 'busy' ? <ActivityIndicator color={c.accent} /> : undefined}
                icon={<Svg width={18} height={18} viewBox="0 0 24 24"><Rect x={6.5} y={6} width={11} height={12} rx={3} {...accentStroke} /><Path d="M9 6l.6-3h4.8l.6 3M9 18l.6 3h4.8l.6-3M12 10v2.5l1.5 1" {...accentStroke} /></Svg>}
              />
            ) : null}
            <QuickRow label="En direct" title={traduire("Démarrer avec le chrono")} onPress={() => open('/seance', { live: '1' })} icon={<Svg width={18} height={18} viewBox="0 0 24 24"><Circle cx={12} cy={13} r={8} {...accentStroke} /><Path d="M12 9v4l2.5 1.5M10 2.5h4" {...accentStroke} /></Svg>} />
          </View>

          {/* 2. LE CORPS */}
          <Label>Corps</Label>
          {/* BALANCE 3 : la pesee a la main et la pesee par photo lue par ton IA, cote a cote, bien visibles */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={() => open('/pesee')}
              accessibilityRole="button"
              accessibilityLabel={traduire("Pesée, ton poids du jour")}
              style={({ pressed }) => ({ flex: 1, minHeight: 112, borderRadius: 22, padding: 14, gap: 10, backgroundColor: pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: c.border })}
            >
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z" {...stroke} /><Path d="M7.5 10a4.5 4.5 0 0 1 9 0z" {...stroke} /><Path d="M12 10l1.6-2.6" {...stroke} /></Svg>
              </View>
              <View style={{ gap: 2 }}>
                <Ink size={18} weight="black" tight>{traduire("Pesée")}</Ink>
                <Ink size={12} color={c.textSecondary} numberOfLines={2}>{traduire("ton poids du jour")}</Ink>
              </View>
            </Pressable>
            <Pressable
              onPress={() => open('/balance-photo')}
              accessibilityRole="button"
              accessibilityLabel={traduire("Pesée par photo, ton IA lit l’écran de ta balance")}
              style={({ pressed }) => ({ flex: 1, minHeight: 112, borderRadius: 22, padding: 14, gap: 10, backgroundColor: pressed ? c.fillSubtle : c.accentTint, borderWidth: 1, borderColor: c.accent + '33' })}
            >
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M4 8h3l2-3h6l2 3h3v11H4z" {...stroke} stroke={c.onAccent} /><Circle cx={12} cy={13} r={3.5} {...stroke} stroke={c.onAccent} /></Svg>
              </View>
              <View style={{ gap: 2 }}>
                <Ink size={18} weight="black" tight numberOfLines={1}>{traduire("Par photo")}</Ink>
                <Ink size={12} color={c.textSecondary} numberOfLines={2}>{traduire("ton IA lit ta balance")}</Ink>
              </View>
            </Pressable>
          </View>
          <View style={card}>
            <QuickRow
              first
              soft
              label={provider ? traduire("Composition importée {0}{1}", /^[AEIOUH]/.test(provider) ? 'd’' : 'de ', provider) : traduire('Composition, connectée ou à la main')}
              title="Balance"
              onPress={() => open('/body-composition')}
              icon={<Svg width={20} height={20} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={9} {...stroke} /><Path d="M12 3a9 9 0 0 1 9 9h-9z" {...stroke} /></Svg>}
            />
            <QuickRow soft label={traduire("Taille, bras, cuisses")} title="Mensurations" onPress={() => open('/add-measurement')} icon={<Svg width={20} height={20} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={8} {...stroke} /><Path d="M12 4v4M4 12h4M16 12h4M12 16v4" {...stroke} /></Svg>} />
            <QuickRow soft label={traduire("Avant, après, même cadrage")} title={traduire("Photo de forme")} onPress={() => open('/photos')} icon={<Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M4 8h3l2-3h6l2 3h3v11H4z" {...stroke} /><Circle cx={12} cy={13} r={3.5} {...stroke} /></Svg>} />
          </View>

          {/* Le reste a sa vraie place ; ici, replie, pour ne rien perdre */}
          <Pressable
            onPress={() => { impactAsync(ImpactFeedbackStyle.Light).catch(() => {}); setMore((m) => !m); }}
            accessibilityRole="button"
            accessibilityState={{ expanded: more }}
            accessibilityLabel={traduire("Autre chose : sommeil, eau, vidéo, combat, compétition")}
            style={({ pressed }) => ({ minHeight: 50, marginTop: 4, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.7 : 1 })}
          >
            <View style={{ flex: 1 }}>
              <Ink size={15} weight="extraBold" color={c.textSecondary}>Autre chose</Ink>
              {!more ? <Ink size={12} color={c.textMuted} numberOfLines={1}>{traduire("sommeil, eau, vidéo, combat, compétition")}</Ink> : null}
            </View>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d={more ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} {...stroke} stroke={c.textSecondary} /></Svg>
          </Pressable>
          {more ? (
            <View style={card}>
              {others.map((o, i) => (
                <Pressable
                  key={o.key}
                  onPress={() => open(o.href, o.params)}
                  accessibilityRole="button"
                  accessibilityLabel={`${o.title}, ${o.sub}`}
                  style={({ pressed }) => ({ minHeight: 52, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider, backgroundColor: pressed ? c.fillSubtle : 'transparent' })}
                >
                  <View style={{ flex: 1 }}>
                    <Ink size={15} weight="extraBold">{o.title}</Ink>
                    <Ink size={12} color={c.textSecondary} numberOfLines={1}>{o.sub}</Ink>
                  </View>
                  <Svg width={14} height={14} viewBox="0 0 24 24"><Path d="M9 6l6 6-6 6" {...stroke} stroke={c.textMuted} /></Svg>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

function Label({ children }: { children: string }) {
  const { theme } = useYoroiTheme();
  return <Ink size={13} weight="extraBold" color={theme.colors.textSecondary} style={{ paddingHorizontal: 4, marginTop: 6, letterSpacing: 0.3 }}>{children}</Ink>;
}

function QuickRow({ first, soft, label, title, onPress, icon, right }: { first?: boolean; soft?: boolean; label: string; title: string; onPress: () => void; icon: React.ReactNode; right?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${title}`}
      style={({ pressed }) => ({ minHeight: 56, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: first ? 0 : 1, borderColor: c.divider, backgroundColor: pressed ? c.fillSubtle : 'transparent' })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: soft ? c.fillSoft : c.accentTint, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1, gap: 1, flexDirection: soft ? 'column-reverse' : 'column' }}>
        <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={1}>{label}</Ink>
        <Ink size={15} weight="extraBold" numberOfLines={2}>{title}</Ink>
      </View>
      {right}
    </Pressable>
  );
}

