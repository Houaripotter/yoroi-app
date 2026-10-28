/**
 * Planning, vue competitions : tes competitions (compte a rebours), tes evenements enregistres
 * et le catalogue pour en trouver d'autres (recherche, region, categorie).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Competition } from '@/lib/database';
import { getFilteredEvents, getSportTagLabel } from '@/lib/eventsService';
import type { SportEvent } from '@/lib/eventsService';
import { getSportName } from '@/lib/sports';
import { logger } from '@/lib/security/logger';
import { daysFrom, isoOf, longDate } from '@/lib/v2/seances/sessionData';
import { Icon } from './Icon';
import { BigButton, Chip, ChipRow, EmptyState, SectionTitle, tap } from './ui';
import { ChargementBloc } from '@/components/yoroi/v2/chargement/Chargement';
import { P } from '@/components/yoroi/livePalette';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const SAVED_EVENTS_KEY = 'my_saved_events';
const EUROPE = new Set([
  'France', 'United Kingdom', 'Spain', 'Italy', 'Germany', 'Portugal', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway',
  'Denmark', 'Finland', 'Ireland', 'Poland', 'Czech Republic', 'Greece', 'Romania', 'Hungary', 'Croatia', 'Slovenia', 'Slovakia', 'Bulgaria',
  'Luxembourg', 'Estonia', 'Latvia', 'Lithuania', 'Cyprus', 'Malta', 'Iceland', 'Serbia', 'Ukraine', 'Belarus', 'Albania', 'Europe',
]);
type Region = 'france' | 'europe' | 'monde';
type Cat = 'all' | 'combat' | 'endurance' | 'force' | 'nature' | 'autre';
const CAT_LABEL: Record<Cat, string> = { all: traduire('Tout'), combat: traduire('Combat'), endurance: 'Endurance', force: 'Force', nature: traduire('Nature'), autre: 'Autres' };
const CAT_TINT: Record<string, string> = { combat: '#EEE1DF', endurance: '#E4EADB', force: '#E3E6EE', nature: '#E9E4D8', autre: '#E6E4DD' };

function eventParams(e: SportEvent) {
  return {
    id: e.id,
    title: e.title,
    date_start: e.date_start,
    city: e.location?.city || '',
    country: e.location?.country || '',
    full_address: e.location?.full_address || '',
    category: e.category,
    sport_tag: e.sport_tag,
    registration_link: e.registration_link || '',
    federation: e.federation || '',
    image_logo_url: e.image_logo_url || '',
  };
}

export function PlanEvents({ competitions }: { competitions: Competition[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const today = isoOf(new Date());
  const [saved, setSaved] = useState<SportEvent[]>([]);
  const [region, setRegion] = useState<Region>('france');
  const [cat, setCat] = useState<Cat>('all');
  const [query, setQuery] = useState('');
  const [catalog, setCatalog] = useState<SportEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(20);

  const loadSaved = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVED_EVENTS_KEY);
      setSaved(raw ? JSON.parse(raw) : []);
    } catch (e) {
      logger.error('Lecture des événements enregistrés impossible', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSaved();
    }, [loadSaved]),
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const filters: Parameters<typeof getFilteredEvents>[0] = { upcomingOnly: true, limit: 500 };
        if (region === 'france') filters.country = 'France';
        else if (region === 'europe') filters.limit = 1100;
        const events = await getFilteredEvents(filters);
        if (alive) setCatalog(events ?? []);
      } catch (e) {
        logger.error('Erreur chargement événements', e);
        if (alive) setCatalog([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [region]);

  useEffect(() => setShown(20), [region, cat, query]);

  const savedIds = useMemo(() => new Set(saved.map((e) => e.id)), [saved]);
  const toggleSave = async (e: SportEvent) => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    const next = savedIds.has(e.id) ? saved.filter((x) => x.id !== e.id) : [...saved, e];
    setSaved(next);
    try {
      await AsyncStorage.setItem(SAVED_EVENTS_KEY, JSON.stringify(next));
    } catch (err) {
      logger.error('Enregistrement de l’événement impossible', err);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((e) => {
      if (region === 'europe' && !EUROPE.has(e.location?.country ?? '')) return false;
      if (cat !== 'all' && e.category !== cat) return false;
      if (!q) return true;
      return [e.title, e.location?.city, e.location?.country, e.federation, getSportTagLabel(e.sport_tag)].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [catalog, region, cat, query]);

  const upcoming = competitions.filter((cp) => (cp.date ?? '').slice(0, 10) >= today).sort((a, b) => (a.date < b.date ? -1 : 1));
  const past = competitions.filter((cp) => (cp.date ?? '').slice(0, 10) < today).sort((a, b) => (a.date < b.date ? 1 : -1));
  const savedFuture = saved.filter((e) => (e.date_start ?? '').slice(0, 10) >= today).sort((a, b) => (a.date_start < b.date_start ? -1 : 1));

  const EventCard = ({ e }: { e: SportEvent }) => {
    const n = daysFrom(today, e.date_start.slice(0, 10));
    const on = savedIds.has(e.id);
    return (
      <Pressable
        onPress={() => { tap(); router.push({ pathname: '/event-detail', params: eventParams(e) } as any); }}
        accessibilityRole="button"
        accessibilityLabel={traduire(e.title)}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: pressed ? P.white : P.carte, borderWidth: 1, borderColor: c.divider })}
      >
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: CAT_TINT[e.category] ?? c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={16} weight="black" style={{ lineHeight: 18 }}>{n <= 0 ? 'J' : String(n)}</Ink>
          <Ink size={9} weight="bold" color={c.textSecondary} style={{ lineHeight: 11 }}>{n <= 0 ? 'jour' : n > 1 ? 'jours' : 'jour'}</Ink>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="extraBold" numberOfLines={2}>{traduire(e.title)}</Ink>
          <Ink size={12} color={c.textSecondary} numberOfLines={2}>{[longDate(e.date_start.slice(0, 10)), e.location?.city, e.location?.country !== 'France' ? e.location?.country : ''].filter(Boolean).join(', ')}</Ink>
          <Ink size={11} weight="bold" color={c.textMuted} numberOfLines={2}>{[getSportTagLabel(e.sport_tag), e.federation].filter(Boolean).join(', ')}</Ink>
        </View>
        <Pressable onPress={() => toggleSave(e)} accessibilityRole="button" accessibilityLabel={on ? traduire('Retirer de tes événements') : traduire('Garder cet événement')} hitSlop={6} style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ink : c.fillSubtle }}>
          <Icon name={on ? 'bookmarkOn' : 'bookmark'} size={19} color={on ? P.paper : c.ink} />
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      <SectionTitle title={traduire("Tes compétitions")} action={traduire("Ajouter")} onAction={() => router.push('/add-competition' as any)} />
      {upcoming.length === 0 ? (
        <EmptyState title={traduire("Aucune compétition prévue")} text={traduire("Ajoute ta prochaine échéance : le compte à rebours t’aidera à préparer ton camp et ta pesée.")} action={traduire("Ajouter une compétition")} onAction={() => router.push('/add-competition' as any)} />
      ) : (
        upcoming.map((cp, i) => {
          const n = daysFrom(today, cp.date.slice(0, 10));
          return (
            <Pressable
              key={cp.id}
              onPress={() => { tap(); router.push(`/competition-detail?id=${cp.id}` as any); }}
              accessibilityRole="button"
              accessibilityLabel={traduire("{0}, dans {1} jours", cp.nom, n)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, backgroundColor: i === 0 ? c.ink : P.carte, borderWidth: i === 0 ? 0 : 1, borderColor: c.divider, opacity: pressed ? 0.92 : 1 })}
            >
              <View style={{ alignItems: 'center', minWidth: 64 }}>
                <Ink size={i === 0 ? 40 : 30} weight="black" tight color={i === 0 ? c.goldLight : c.ink} style={{ lineHeight: i === 0 ? 42 : 32 }}>{n === 0 ? traduire('Jour J') : String(n)}</Ink>
                {n > 0 ? <Ink size={11} weight="bold" color={i === 0 ? c.onDarkSecondary : c.textMuted}>{n > 1 ? 'jours' : 'jour'}</Ink> : null}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={17} weight="extraBold" color={i === 0 ? c.background : c.ink} numberOfLines={2}>{sansTiret(traduire(cp.nom))}</Ink>
                <Ink size={12} color={i === 0 ? c.onDarkSecondary : c.textSecondary} numberOfLines={2}>{sansTiret([longDate(cp.date.slice(0, 10)), cp.lieu, getSportName(cp.sport), cp.categorie_poids].filter(Boolean).join(', '))}</Ink>
              </View>
              <Icon name="chevron" size={18} color={i === 0 ? c.onDarkSecondary : c.textMuted} />
            </Pressable>
          );
        })
      )}
      {past.length ? (
        <Pressable onPress={() => { tap(); router.push('/palmares' as any); }} accessibilityRole="button" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
          <Icon name="medal" size={18} color={c.goldDeep} />
          <Ink size={14} weight="extraBold" color={c.textSecondary}>{traduirePluriel(past.length, past.length > 1, "{0} compétition passée, voir ton palmarès", "{0} compétitions passées, voir ton palmarès", past.length)}</Ink>
        </Pressable>
      ) : null}

      {savedFuture.length ? (
        <>
          <SectionTitle title={traduire("Tes événements")} sub={traduire("ceux que tu as gardés")} />
          {savedFuture.map((e) => (
            <EventCard key={`s${e.id}`} e={e} />
          ))}
        </>
      ) : null}

      <SectionTitle title={traduire("Trouver une compétition")} sub={loading ? 'chargement...' : traduire("{0} à venir", filtered.length)} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, minHeight: 48, borderRadius: 16, backgroundColor: P.white, borderWidth: 1, borderColor: c.border }}>
        <Icon name="search" size={18} color={c.textMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder={traduire("Nom, ville, fédération...")} placeholderTextColor={c.textMuted} style={{ flex: 1, fontSize: 15, color: c.ink, paddingVertical: 10 }} returnKeyType="search" />
        {query ? (
          <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={traduire("Effacer la recherche")} hitSlop={10}>
            <Icon name="close" size={18} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <ChipRow>
        {(['france', 'europe', 'monde'] as Region[]).map((r) => (
          <Chip key={r} label={r === 'france' ? 'France' : r === 'europe' ? 'Europe' : 'Monde'} on={region === r} onPress={() => setRegion(r)} />
        ))}
      </ChipRow>
      <ChipRow>
        {(Object.keys(CAT_LABEL) as Cat[]).map((k) => (
          <Chip key={k} label={CAT_LABEL[k]} on={cat === k} onPress={() => setCat(k)} />
        ))}
      </ChipRow>
      {loading ? <ChargementBloc style={{ paddingVertical: 20 }} /> : null}
      {!loading && filtered.length === 0 ? <Ink size={14} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Aucun événement ne correspond. Essaie une autre région ou un autre mot.")}</Ink> : null}
      {filtered.slice(0, shown).map((e) => (
        <EventCard key={e.id} e={e} />
      ))}
      {filtered.length > shown ? <BigButton label={traduire("Voir plus d’événements")} tone="soft" onPress={() => setShown((n) => n + 20)} /> : null}
    </View>
  );
}
