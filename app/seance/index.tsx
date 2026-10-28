/**
 * On s'entraine (maquette S1) : la seance en cours a reprendre, le programme du jour en grand,
 * la grille des sports illustres (tes favoris d'abord), la recherche dans tous les sports
 * et l'ajout d'une seance deja faite.
 * Accepte aussi les parametres de l'ancienne saisie : editId (ouvre la bonne saisie en modification),
 * sport ou prefillSport (ouvre directement la saisie du sport), slotId, date, time, duration, clubId...
 * Vague 37 (Houari : « generalement c'est quand la seance est terminee qu'il ajoute ce qu'il a fait ») :
 * par defaut, « Noter une séance faite » : ton sport ouvre sa saisie apres coup (jour et heure, duree, ressenti,
 * puis les details du sport : exercices et series en musculation, rounds en JJB), sans chrono ; ta montre ou
 * Apple Sante en un toucher quand elle est reliee. « En direct, avec le chrono » devient le second choix
 * (parametre live=1 pour l'ouvrir directement).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { ActivityIndicator, Image, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { fontStyle } from '@/components/yoroi/fonts';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seance/Icon';
import { getProfile, getSlotOccurrences, getTrainingById, getTrainings, getWeeklyPlan, getWeeklyPlanById } from '@/lib/database';
import { dayLabel } from '@/components/yoroi/v2/seance/Details';
import { readParams, toQuery, wantsForm } from '@/lib/v2/seance/params';
import { repairDoubleEncodedRounds } from '@/lib/v2/seance/edit';
import type { Training, WeeklyPlan } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { SPORTS, getSportName } from '@/lib/sports';
import { getEspace } from '@/lib/v2/espace';
import { getSanteSource, syncNow } from '@/lib/v2/sante/data';
import { fmtClock, fmtMinutes, relativeDay } from '@/lib/v2/seance/format';
import { normName } from '@/lib/v2/seance/history';
import { clearDraft, loadDraft } from '@/lib/v2/seance/model';
import type { SeanceDraft } from '@/lib/v2/seance/model';
import { draftRoute, draftTitle } from '@/lib/v2/seance/resume';
import { slotWeekStart } from '@/lib/v2/seance/save';
import { DEFAULT_SPORTS, seanceKindFor, seanceRoute, sportImage, sportShortName, sportTint } from '@/lib/v2/seance/sportVisuals';
import { useNow } from '@/lib/v2/seance/useNow';
import { routeDuCreneau } from '@/lib/v2/programmes/agenda';
import { P, blancA } from '@/components/yoroi/livePalette';
import { OMBRE_CARTE, carteBlanche } from '@/components/yoroi/v2/seance/pastel';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { HabillageBoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

type Hero = {
  over: string;
  title: string;
  sub: string;
  sport: string;
  cta: string;
  go: () => void;
};

const KIND_LABEL = { muscu: 'séries et charges', combat: 'rounds et chrono', cardio: 'chrono, distance, cardio' } as const;

export default function OnSentraine() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [draft, setDraft] = useState<SeanceDraft | null>(null);
  const [slots, setSlots] = useState<WeeklyPlan[]>([]);
  const [last, setLast] = useState<Training | null>(null);
  const [sports, setSports] = useState<string[]>(DEFAULT_SPORTS);
  const [femme, setFemme] = useState(false);
  const [query, setQuery] = useState('');
  const now = useNow(1000, !!draft);
  const raw = useLocalSearchParams();
  const params = useMemo(() => readParams(raw), []); // eslint-disable-line react-hooks/exhaustive-deps
  // un lien avec un sport, une seance a modifier ou un creneau ouvre directement la bonne saisie
  const [forwarding, setForwarding] = useState(!!(params.editId || params.sport || params.slotId));
  const later = !!params.date && wantsForm(params);
  // vague 37 : noter une seance faite par defaut ; le chrono en direct est le second choix
  const [direct, setDirect] = useState(() => {
    const v = Array.isArray(raw.live) ? raw.live[0] : raw.live;
    return v === '1' && !later;
  });
  const [provider, setProvider] = useState<string | null>(null);
  const [sync, setSync] = useState<'idle' | 'busy' | string>('idle');
  useEffect(() => {
    getSanteSource()
      .then((s) => setProvider(s.mode === 'live' ? s.provider : null))
      .catch(() => setProvider(null));
  }, []);
  const syncWatch = async () => {
    if (sync === 'busy') return;
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    setSync('busy');
    try {
      const before = (await getTrainings(14).catch(() => [] as Training[])).length;
      const ok = await syncNow();
      const after = (await getTrainings(14).catch(() => [] as Training[])).length;
      const n = Math.max(0, after - before);
      setSync(!ok ? traduire('La synchro n’a pas marché, réessaie.') : n === 0 ? traduire('Rien de nouveau depuis ta montre.') : traduirePluriel(n, n > 1, "{0} séance récupérée.", "{0} séances récupérées.", n));
    } catch {
      setSync(traduire('La synchro n’a pas marché, réessaie.'));
    }
  };

  useEffect(() => {
    repairDoubleEncodedRounds().catch(() => {});
  }, []);

  useEffect(() => {
    if (!forwarding) return;
    (async () => {
      try {
        let sport = params.sport;
        if (params.editId) {
          const t = await getTrainingById(params.editId);
          sport = t?.sport;
        } else if (!sport && params.slotId) {
          const [slot, r] = await Promise.all([getWeeklyPlanById(params.slotId), routeDuCreneau(params.slotId)]);
          // creneau cree par « Dans mon planning » : il ouvre la prochaine seance du programme (lib/v2/programmes/agenda.ts)
          if (r) {
            router.replace({ pathname: r.pathname as any, params: { ...toQuery(params), ...r.params, slotId: String(params.slotId) } });
            return;
          }
          sport = slot?.sport;
        }
        if (sport) {
          const main = sport.split(',')[0].trim();
          router.replace({ pathname: seanceRoute(main) as any, params: { ...toQuery(params), sport } });
          return;
        }
      } catch (err) {
        logger.warn('Ouverture directe de la saisie impossible', err);
      }
      setForwarding(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const [d, plan, trainings, espace, profile, occ] = await Promise.all([
            loadDraft(),
            getWeeklyPlan().catch(() => [] as WeeklyPlan[]),
            getTrainings(120).catch(() => [] as Training[]),
            getEspace(),
            getProfile().catch(() => null),
            getSlotOccurrences(slotWeekStart()).catch(() => []),
          ]);
          setDraft(d);
          setFemme(profile?.avatar_gender === 'femme');
          const today = (new Date().getDay() + 6) % 7;
          const done = new Set(occ.filter((o) => o.status === 'validated' || o.status === 'cancelled').map((o) => o.weekly_plan_id));
          const todays = (plan ?? [])
            .filter((p) => p.day_of_week === today && !p.is_rest_day && !(p.id && done.has(p.id)))
            .sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'));
          setSlots(todays);
          const list = trainings ?? [];
          setLast(list.find((t) => (t.exercises ?? []).some((e) => e && e.name && (e.weight || e.reps))) ?? list[0] ?? null);
          // tes favoris, puis les sports que tu pratiques, puis les classiques
          const counts = new Map<string, number>();
          list.forEach((t) => counts.set(t.sport, (counts.get(t.sport) ?? 0) + 1));
          const practiced = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([s]) => s).filter((s) => SPORTS.some((x) => x.id === s));
          const ordered: string[] = [];
          for (const s of [...espace.sportsFavoris, ...practiced, ...DEFAULT_SPORTS]) if (!ordered.includes(s) && SPORTS.some((x) => x.id === s)) ordered.push(s);
          setSports(ordered.slice(0, 9));
        } catch (err) {
          logger.error('Chargement de l’écran séance impossible', err);
        }
      })();
    }, []),
  );

  const go = (sport: string, extra: Record<string, string> = {}) => {
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    // les parametres recus (jour, heure, duree, club...) suivent jusqu'a la saisie
    // vague 37 : sans « En direct », la saisie s'ouvre en mode « seance faite » (form=1), sans chrono
    const ouvrir = (pathname: string, p: Record<string, string>) =>
      router.push({ pathname: pathname as any, params: { ...toQuery(params), ...extra, ...(direct ? {} : { form: '1' }), ...p } });
    // creneau du programme : la prochaine seance du programme (lib/v2/programmes/agenda.ts)
    if (extra.slotId) {
      void routeDuCreneau(Number(extra.slotId)).then((r) => (r ? ouvrir(r.pathname, r.params) : ouvrir(seanceRoute(sport), { sport })));
      return;
    }
    ouvrir(seanceRoute(sport), { sport });
  };

  const hero: Hero | null = useMemo(() => {
    const slot = slots.find((s) => {
      if (!s.time) return true;
      const [h, m] = s.time.split(':').map(Number);
      const d = new Date();
      return h * 60 + m + (s.duration_minutes ?? 60) >= d.getHours() * 60 + d.getMinutes();
    }) ?? slots[0];
    if (slot) {
      const extra: Record<string, string> = { label: slot.label || getSportName(slot.sport) };
      if (slot.id) extra.slotId = String(slot.id);
      if (slot.session_type && seanceKindFor(slot.sport) === 'combat') extra.type = slot.session_type;
      const subParts = [slot.duration_minutes ? `environ ${fmtMinutes(slot.duration_minutes)}` : '', slot.club_name ?? ''].filter(Boolean);
      return {
        over: slot.time ? traduire("Ton créneau de {0}", slot.time.slice(0, 5)) : traduire('Ton créneau du jour'),
        title: slot.label || getSportName(slot.sport),
        sub: subParts.join(', ') || KIND_LABEL[seanceKindFor(slot.sport)],
        sport: slot.sport,
        cta: direct ? traduire('Commencer') : traduire('Noter cette séance'),
        go: () => go(slot.sport, extra),
      };
    }
    if (last && (last.exercises ?? []).length > 0 && seanceKindFor(last.sport) === 'muscu') {
      const n = (last.exercises ?? []).length;
      return {
        over: `Comme ${relativeDay(last.date)}`,
        title: traduire(`Refaire ta séance`),
        sub: traduirePluriel(n, n > 1, "{0} exercice{1}", "{0} exercices{1}", n, last.duration_minutes ? `, environ ${fmtMinutes(last.duration_minutes)}` : ''),
        sport: last.sport,
        cta: direct ? traduire('Commencer') : traduire('Noter cette séance'),
        go: () => go(last.sport, { repeatId: String(last.id) }),
      };
    }
    // premiere seance : pas de carte en plus, la grille des sports suffit (un seul chemin)
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, last, direct]);

  const results = useMemo(() => {
    const q = normName(query);
    if (!q) return [];
    return SPORTS.filter((s) => normName(s.name).includes(q) || normName(s.id).includes(q)).slice(0, 12);
  }, [query]);

  const tile = Math.floor((width - 44 - 20) / 3);
  if (forwarding) return <View style={{ flex: 1, backgroundColor: c.background }} />;
  const heroImg: ImageSourcePropType | null = hero ? sportImage(hero.sport, femme, 1) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <EnTete titre={direct ? traduire('On s’entraîne') : traduire('Noter une séance')} onRetour={() => router.back()} style={{ marginHorizontal: -22, marginTop: -8 }} />

        {/* vague 37 : le choix par defaut, noter apres coup ; le direct (chrono) en second */}
        {!later ? (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', padding: 4, borderRadius: 18, backgroundColor: c.fillSubtle, gap: 4 }} accessibilityRole="tablist">
              {[
                { on: !direct, label: traduire('Séance faite'), a11y: traduire('Noter une séance faite'), v: false },
                { on: direct, label: traduire('En direct, chrono'), a11y: traduire('Démarrer en direct, avec le chrono'), v: true },
              ].map((o) => (
                <Pressable
                  key={o.label}
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
                    setDirect(o.v);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: o.on }}
                  accessibilityLabel={o.a11y}
                  style={{ flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: o.on ? c.surface : 'transparent', ...(o.on ? OMBRE_CARTE : {}) }}
                >
                  <Ink size={14} weight="extraBold" color={o.on ? c.ink : c.textSecondary} numberOfLines={1}>{traduire(o.label)}</Ink>
                </Pressable>
              ))}
            </View>
            <Ink size={13} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>
              {direct ? traduire('Le chrono démarre quand tu touches ton sport.') : traduire('Touche ton sport : le jour, l’heure, la durée et ton ressenti, puis les détails si tu veux (exercices et séries, rounds).')}
            </Ink>
          </View>
        ) : null}


        {later && params.date ? (
          <View style={{ borderRadius: 24, padding: 18, backgroundColor: c.carteDouce, gap: 4 }}>
            <Ink size={13} weight="extraBold" color={c.accentText}>{traduire("Séance à ajouter")}</Ink>
            <Ink size={24} weight="black" tight>{dayLabel(params.date)}</Ink>
            <Ink size={14} color={c.textSecondary}>{traduire("Choisis le sport, tu règles l’heure et la durée ensuite.")}</Ink>
          </View>
        ) : null}

        {/* Seance en cours */}
        {draft && !later ? (
          <View style={{ borderRadius: 24, padding: 16, backgroundColor: c.carteDouce, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.detail }} />
              <Ink size={14} weight="extraBold" color={c.accentText} style={{ flex: 1 }}>{traduire("Séance en cours")}</Ink>
              <Ink size={18} weight="black" style={{ fontVariant: ['tabular-nums'] }}>{fmtClock((now - draft.startedAt) / 1000)}</Ink>
            </View>
            <Ink size={22} weight="black" tight>{draftTitle(draft)}</Ink>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => router.push({ pathname: draftRoute(draft) as any, params: { resume: '1' } })} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? blancA(0.75) : c.surface })}>
                <Ink size={15} weight="black" color={c.onPrimary}>{traduire("Reprendre")}</Ink>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await clearDraft();
                  setDraft(null);
                }}
                accessibilityRole="button"
                style={{ minHeight: 50, paddingHorizontal: 16, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: blancA(0.5) }}
              >
                <Ink size={14} weight="bold" color={c.textSecondary}>{traduire("Abandonner")}</Ink>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Programme du jour, ou ta derniere seance a refaire */}
        {hero && !later ? (
          <Pressable onPress={hero.go} accessibilityRole="button" accessibilityLabel={`${hero.over}, ${hero.title}. ${hero.cta}`} style={({ pressed }) => ({ height: 168, borderRadius: 26, backgroundColor: P.programmeFond, overflow: 'hidden', transform: [{ scale: pressed ? 0.985 : 1 }] })}>
            {heroImg ? <Image source={heroImg} style={{ position: 'absolute', right: -10, bottom: -66, width: 165, height: 220 }} resizeMode="contain" /> : null}
            <View style={{ position: 'absolute', left: 18, top: 18, maxWidth: width * 0.55, gap: 3 }}>
              <Ink size={13} weight="extraBold" color={P.etiquettePrune}>{hero.over}</Ink>
              <Ink size={24} weight="black" tight numberOfLines={2}>{traduire(hero.title)}</Ink>
              <Ink size={13} weight="bold" color={c.textSecondary} numberOfLines={1}>{traduire(hero.sub)}</Ink>
            </View>
            <HabillageBoutonPrincipal style={{ position: 'absolute', left: 18, bottom: 16, minHeight: 46, paddingHorizontal: 18, justifyContent: 'center' }}>
              {(col) => <Ink size={15} weight="black" color={col}>{hero.cta}</Ink>}
            </HabillageBoutonPrincipal>
          </Pressable>
        ) : null}

        {slots.length > 1 && !later ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {slots.map((s) => (
              <Pressable key={s.id ?? s.sport} onPress={() => go(s.sport, { label: s.label || getSportName(s.sport), ...(s.id ? { slotId: String(s.id) } : {}) })} style={({ pressed }) => [carteBlanche(c.surface, c.divider), { minHeight: 50, paddingHorizontal: 14, borderRadius: 16, justifyContent: 'center', opacity: pressed ? 0.85 : 1 }]}>
                <Ink size={14} weight="extraBold">{s.label || getSportName(s.sport)}</Ink>
                {s.time ? <Ink size={12} color={c.textMuted}>{s.time.slice(0, 5)}</Ink> : null}
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <Ink size={14} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{hero && !later ? traduire('Ou choisis ton sport') : traduire('Choisis ton sport')}</Ink>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {sports.map((s) => {
            const img = sportImage(s, femme, 0);
            return (
              <Pressable key={s} onPress={() => go(s)} accessibilityRole="button" accessibilityLabel={getSportName(s)} style={({ pressed }) => ({ width: tile, height: 150, borderRadius: 22, backgroundColor: sportTint(s), overflow: 'hidden', paddingTop: 8, paddingHorizontal: 10, paddingBottom: 10, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                {/* l'illustration vit dans sa zone, le nom dessous sur une ligne : jamais l'une sur l'autre */}
                <View style={{ flex: 1, marginBottom: 4, alignItems: 'center', justifyContent: 'center' }}>
                  {img ? (
                    <Image source={img} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                  ) : (
                    <Ink weight="black" size={64} color="rgba(29,32,41,0.08)">{sportShortName(s).charAt(0)}</Ink>
                  )}
                </View>
                <Ink size={Math.max(11, Math.min(15, Math.floor((tile - 20) / (Math.max(1, sportShortName(s).length) * 0.6))))} weight="extraBold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{sportShortName(s)}</Ink>
              </Pressable>
            );
          })}
        </View>

        {/* 28 octobre 2026 : en direct, les sprints guidés (app/seance/sprints.tsx) */}
        {direct && !later ? (
          <Pressable onPress={() => { impactAsync(ImpactFeedbackStyle.Light).catch(() => {}); router.push('/seance/sprints' as any); }} accessibilityRole="button" accessibilityLabel={traduire('Sprints guidés, échauffement, sprints et récupération')} style={({ pressed }) => [carteBlanche(c.surface, c.divider), { minHeight: 64, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12, opacity: pressed ? 0.85 : 1 }]}>
            <Icon name="bolt" size={22} color={c.accent} />
            <View style={{ flex: 1 }}>
              <Ink size={15} weight="extraBold">{traduire('Sprints guidés')}</Ink>
              <Ink size={12} color={c.textMuted}>{traduire('Échauffement, sprints, récupération, la voix te guide')}</Ink>
            </View>
            <Icon name="chevron" size={18} color={c.textMuted} />
          </Pressable>
        ) : null}

        {/* Recherche dans tous les sports */}
        <View style={{ ...carteBlanche(c.surface, c.divider), height: 52, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
          <Icon name="search" size={20} color={c.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={traduire("Un autre sport ? Tennis, natation, yoga...")}
            placeholderTextColor={c.textMuted}
            autoCorrect={false}
            accessibilityLabel={traduire("Chercher un sport")}
            style={[fontStyle('bold'), { flex: 1, fontSize: 15, color: c.ink, paddingVertical: 0 }]}
          />
        </View>
        {results.length > 0 ? (
          <View style={{ gap: 6 }}>
            {results.map((s) => (
              <Pressable key={s.id} onPress={() => go(s.id)} accessibilityRole="button" style={({ pressed }) => [carteBlanche(c.surface, c.divider), { minHeight: 56, borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.85 : 1 }]}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: sportTint(s.id), borderWidth: 1, borderColor: c.border }} />
                <View style={{ flex: 1 }}>
                  <Ink size={15} weight="extraBold">{traduire(s.name)}</Ink>
                  <Ink size={12} color={c.textMuted}>{KIND_LABEL[seanceKindFor(s.id)]}</Ink>
                </View>
                <Icon name="chevron" size={18} color={c.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : query.trim() ? (
          <Ink size={14} color={c.textMuted} style={{ paddingHorizontal: 4 }}>{traduire("Aucun sport ne correspond. Essaie un autre mot.")}</Ink>
        ) : null}

        {/* vague 37 : ta montre, en un toucher, quand elle est reliee */}
        {!later && !direct && provider ? (
          <Pressable onPress={syncWatch} accessibilityRole="button" accessibilityLabel={traduire("Récupérer tes séances depuis {0}", provider)} style={({ pressed }) => [carteBlanche(c.surface, c.divider), { minHeight: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, opacity: pressed ? 0.85 : 1 }]}>
            <Icon name="clock" size={22} color={c.accent} />
            <View style={{ flex: 1 }}>
              <Ink size={12} weight="bold" color={c.textMuted}>{traduire("Ta montre, via {0}", provider)}</Ink>
              <Ink size={15} weight="extraBold" numberOfLines={2}>{sync === 'idle' ? traduire('Récupérer tes séances') : sync === 'busy' ? 'Synchro en cours...' : sync}</Ink>
            </View>
            {sync === 'busy' ? <ActivityIndicator color={c.accent} /> : <Icon name="chevron" size={18} color={c.textMuted} />}
          </Pressable>
        ) : null}

        {!later ? <Pressable onPress={() => router.push('/seance/deja-faite' as any)} accessibilityRole="button" style={({ pressed }) => [carteBlanche(c.surface, c.divider), { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, opacity: pressed ? 0.85 : 1 }]}>
          <Icon name="clock" size={22} />
          <Ink size={15} weight="bold" style={{ flex: 1 }}>{traduire("Saisie rapide : sport, durée, ressenti")}</Ink>
          <Icon name="chevron" size={18} color={c.textMuted} />
        </Pressable> : null}
      </ScrollView>
    </View>
  );
}
