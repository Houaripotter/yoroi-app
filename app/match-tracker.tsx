/**
 * Suivi de match v2 : saisie a une main pendant ou apres un match de tournoi.
 * Chrono, score en direct, actions en plaques, annulation du dernier geste,
 * chronologie complete, resultat tamponne et historique des matchs.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { DeviceEventEmitter, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ink } from '@/components/yoroi/v2/Ink';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { plural, shortDate } from '@/lib/v2/combat/rounds';
import { Hanko as SealOr } from '@/components/yoroi/v2/seance/Hanko';
import { BigButton, BrushRing, Card, CIcon, D, Enter, Field, Glass, IconBtn, N, P, Press, Section, tap, V } from '@/components/yoroi/v2/combat/ui';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { useAlignedNow } from '@/lib/v2/carnet/useAlignedNow';
import { traduire } from '@/lib/i18n/tr';

type EventType = 'takedown' | 'guard_pass' | 'sweep' | 'mount' | 'back_control' | 'sub_attempt' | 'tap' | 'advantage' | 'penalty' | 'points_custom';
interface MatchEvent {
  id: string;
  timestamp: number;
  type: EventType;
  label: string;
  side: 'me' | 'opponent';
  points?: number;
}
interface MatchResult {
  winner: 'me' | 'opponent' | null;
  method: 'submission' | 'points' | 'decision' | 'disqualification' | null;
  myScore: number;
  oppScore: number;
  events: MatchEvent[];
  duration: number;
  notes: string;
  date?: string;
}
interface Action {
  type: EventType;
  label: string;
  short: string;
  points: number;
  side: 'me' | 'opponent';
}

const MY: Action[] = [
  { type: 'takedown', label: traduire('Amenée au sol'), short: traduire('Amenée'), points: 2, side: 'me' },
  { type: 'guard_pass', label: traduire('Passage de garde'), short: 'Passage', points: 3, side: 'me' },
  { type: 'sweep', label: 'Renversement', short: 'Renvers.', points: 2, side: 'me' },
  { type: 'mount', label: traduire('Montée'), short: traduire('Montée'), points: 4, side: 'me' },
  { type: 'back_control', label: traduire('Prise du dos'), short: 'Dos', points: 4, side: 'me' },
  { type: 'advantage', label: 'Avantage', short: 'Avantage', points: 1, side: 'me' },
  { type: 'sub_attempt', label: traduire('Tentative de soumission'), short: 'Tentative', points: 0, side: 'me' },
  { type: 'tap', label: traduire('Il tape'), short: traduire('Il tape'), points: 0, side: 'me' },
];
const OPP: Action[] = [
  { type: 'takedown', label: traduire('Amenée adverse'), short: traduire('Amenée'), points: 2, side: 'opponent' },
  { type: 'guard_pass', label: 'Passage adverse', short: 'Passage', points: 3, side: 'opponent' },
  { type: 'sweep', label: 'Renversement adverse', short: 'Renvers.', points: 2, side: 'opponent' },
  { type: 'penalty', label: traduire('Pénalité adverse'), short: traduire('Pénalité'), points: 1, side: 'opponent' },
  { type: 'sub_attempt', label: 'Tentative adverse', short: 'Tentative', points: 0, side: 'opponent' },
  { type: 'tap', label: 'Je tape', short: 'Je tape', points: 0, side: 'opponent' },
];

const STORAGE_KEY = '@yoroi_match_tracker';
async function loadMatches(): Promise<MatchResult[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? (v as MatchResult[]) : [];
  } catch {
    return [];
  }
}
async function saveMatch(m: MatchResult): Promise<void> {
  const list = await loadMatches();
  list.unshift({ ...m, date: new Date().toISOString() });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function ActionPlate({ a, onPress }: { a: Action; onPress: () => void }) {
  const me = a.side === 'me';
  const tapAction = a.type === 'tap';
  const bg = tapAction ? (me ? V : D) : P.white;
  const fg = tapAction ? P.white : me ? V : D;
  return (
    <Press onPress={onPress} haptic="none" accessibilityRole="button" accessibilityLabel={`${a.label}${a.points ? `, ${a.points} points` : ''}`} style={{ width: '31.5%' }}>
      <View style={{ height: 78, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: bg, borderWidth: tapAction ? 0 : 1.5, borderColor: `${fg}40`, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Ink size={15} weight="black" color={fg} numberOfLines={1}>
          {a.short}
        </Ink>
        {a.points > 0 ? (
          <View style={{ paddingHorizontal: 8, height: 20, borderRadius: 10, justifyContent: 'center', backgroundColor: fg }}>
            <Ink size={11} weight="black" color={P.white}>
              {`+${a.points}`}
            </Ink>
          </View>
        ) : (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 14, height: 3, backgroundColor: tapAction ? 'rgba(255,255,255,0.35)' : `${fg}30` }} />
        )}
      </View>
    </Press>
  );
}

export default function MatchTrackerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'setup' | 'live' | 'result'>('setup');
  const [start, setStart] = useState(0);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [me, setMe] = useState(0);
  const [opp, setOpp] = useState(0);
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<MatchResult[]>([]);
  const elapsed = useRef(0);

  useEffect(() => {
    loadMatches().then(setHistory);
  }, []);
  // horloge calee sur le debut du match : chaque seconde affichee dure une seconde pile
  const now = useAlignedNow(start || null, phase === 'live' && !!start);

  const add = useCallback(
    (a: Action) => {
      tap(a.side === 'me' ? 'medium' : 'light');
      const t = Date.now();
      const ev: MatchEvent = { id: `${t}_${Math.random()}`, timestamp: phase === 'live' && start ? Math.round((t - start) / 1000) : 0, type: a.type, label: a.label, side: a.side, points: a.points };
      setEvents((prev) => [...prev, ev]);
      if (a.points > 0) {
        if (a.side === 'me') setMe((s) => s + a.points);
        else setOpp((s) => s + a.points);
      }
      if (a.type === 'tap') tap('success');
    },
    [phase, start],
  );

  const undo = () => {
    const last = events[events.length - 1];
    if (!last) return;
    tap();
    setEvents((prev) => prev.slice(0, -1));
    if (last.points) {
      if (last.side === 'me') setMe((s) => Math.max(0, s - (last.points ?? 0)));
      else setOpp((s) => Math.max(0, s - (last.points ?? 0)));
    }
  };

  const end = () => {
    elapsed.current = start ? Math.round((Date.now() - start) / 1000) : 0;
    setPhase('result');
    tap('medium');
  };

  const save = async () => {
    const tapEv = events.find((e) => e.type === 'tap');
    const winner: MatchResult['winner'] = tapEv ? (tapEv.side === 'me' ? 'me' : 'opponent') : me > opp ? 'me' : opp > me ? 'opponent' : null;
    const m: MatchResult = { winner, method: tapEv ? 'submission' : winner ? 'points' : 'decision', myScore: me, oppScore: opp, events, duration: elapsed.current, notes };
    try {
      await saveMatch(m);
      setSaved(true);
      tap('success');
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      // navigation directe : retour tout de suite, la vibration de reussite confirme l'enregistrement
      if (router.canGoBack()) router.back();
      else router.replace('/' as any);
    } catch (e) {
      logger.error('Enregistrement du match impossible', e);
      appAlert(traduire('Enregistrement impossible'), traduire('Réessaie dans un instant.'));
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/' as any));
  const sec = start ? Math.max(0, Math.floor((now - start) / 1000 + 1e-6)) : 0;

  // ── Preparation ──
  if (phase === 'setup') {
    const wins = history.filter((h) => h.winner === 'me').length;
    return (
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 14 }}>
          <EnTete titre={traduire("Suivi de match")} sousTitre={traduire("Une main, des gros boutons, rien à écrire")} onRetour={back} style={{ marginHorizontal: -22, marginTop: -8 }} />
          <Glass style={{ alignItems: 'center', gap: 14, paddingVertical: 26 }}>
            <SealOr size={64} rotate={-8} color={P.goldDark} />
            <Ink size={22} weight="black" tight style={{ textAlign: 'center' }}>
              {traduire("Prêt à enregistrer ton match ?")}</Ink>
            <Ink size={14} color={P.ink2} style={{ textAlign: 'center' }}>
              {traduire("Touche une plaque à chaque action, pour toi ou pour ton adversaire. Le score se calcule tout seul.")}</Ink>
            <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 6 }}>
              <BigButton
                label={traduire("Lancer le chrono")}
                icon="play"
                onPress={() => {
                  setStart(Date.now());
                  setPhase('live');
                }}
              />
              <BigButton label={traduire("Noter un match déjà fini")} tone="light" icon="list" onPress={() => setPhase('live')} />
            </View>
          </Glass>
          {history.length > 0 ? (
            <>
              <Section title={traduire("Tes derniers matchs")} sub={traduire("{0} victoires sur {1}", wins, plural(history.length, 'match', 'matchs'))} />
              {history.slice(0, 10).map((h, i) => {
                const c = h.winner === 'me' ? V : h.winner === 'opponent' ? D : N;
                return (
                  <Enter key={`${h.date ?? i}_${i}`} i={Math.min(i, 8)}>
                    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 8, alignSelf: 'stretch', borderRadius: 4, backgroundColor: c }} />
                      <View style={{ flex: 1 }}>
                        <Ink size={16} weight="black" color={c}>
                          {h.winner === 'me' ? traduire('Victoire') : h.winner === 'opponent' ? traduire('Défaite') : traduire('Égalité')}
                          <Ink size={13} weight="bold" color={P.ink2}>
                            {h.method === 'submission' ? traduire(', par soumission') : h.method === 'points' ? traduire(', aux points') : ''}
                          </Ink>
                        </Ink>
                        <Ink size={12} weight="bold" color={P.muted}>
                          {[h.date ? shortDate(h.date, true) : null, h.duration ? fmt(h.duration) : null].filter(Boolean).join(', ')}
                        </Ink>
                      </View>
                      <Ink size={24} weight="black" tight>
                        {traduire("{0} à {1}", h.myScore, h.oppScore)}
                      </Ink>
                    </Card>
                  </Enter>
                );
              })}
            </>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  // ── En direct ──
  if (phase === 'live') {
    const lastEv = events[events.length - 1];
    return (
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconBtn icon="close" label={traduire("Quitter le match")} onPress={() => appAlert(traduire('Quitter le match ?'), traduire('Les actions notées seront perdues.'), [{ text: 'Rester', style: 'cancel' }, { text: 'Quitter', style: 'destructive', onPress: back }])} />
          <Press onPress={end} haptic="medium" accessibilityRole="button" accessibilityLabel={traduire("Terminer le match")}>
            <View style={{ height: 44, paddingHorizontal: 18, borderRadius: 14, backgroundColor: P.ink, justifyContent: 'center' }}>
              <Ink size={15} weight="extraBold" color={P.paper}>
                {traduire("Terminer")}</Ink>
            </View>
          </Press>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: 8 }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Ink size={14} weight="extraBold" color={V}>
              Moi
            </Ink>
            <Ink size={72} weight="black" tight color={V}>
              {String(me)}
            </Ink>
          </View>
          <View style={{ width: 110, height: 110, alignItems: 'center', justifyContent: 'center' }}>
            <BrushRing value={start ? (sec % 300) / 300 : 0} size={110} stroke={10} color={P.accent} />
            <View style={{ position: 'absolute', alignItems: 'center' }}>
              <Ink size={26} weight="black" tight>
                {start ? fmt(sec) : traduire('Après')}
              </Ink>
              <Ink size={11} weight="bold" color={P.muted}>
                {start ? 'chrono' : traduire('le match')}
              </Ink>
            </View>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Ink size={14} weight="extraBold" color={D}>
              Adversaire
            </Ink>
            <Ink size={72} weight="black" tight color={D}>
              {String(opp)}
            </Ink>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 30, gap: 12 }}>
          <Ink size={14} weight="extraBold" color={V}>
            {traduire("Mes actions")}</Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MY.map((a) => (
              <ActionPlate key={`me_${a.type}`} a={a} onPress={() => add(a)} />
            ))}
          </View>
          <Ink size={14} weight="extraBold" color={D} style={{ marginTop: 6 }}>
            Actions adverses
          </Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {OPP.map((a) => (
              <ActionPlate key={`op_${a.type}`} a={a} onPress={() => add(a)} />
            ))}
          </View>
          {lastEv ? (
            <Card style={{ gap: 10, marginTop: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Ink size={16} weight="black">
                  {traduire("Dernières actions")}</Ink>
                <Press onPress={undo} accessibilityRole="button" accessibilityLabel={traduire("Annuler la dernière action")}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#E6E4DD' }}>
                    <CIcon name="undo" size={16} color={P.ink} />
                    <Ink size={14} weight="extraBold">
                      {traduire("Annuler")}</Ink>
                  </View>
                </Press>
              </View>
              {events
                .slice(-5)
                .reverse()
                .map((ev) => (
                  <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ink size={12} weight="bold" color={P.muted} style={{ width: 40 }}>
                      {fmt(ev.timestamp)}
                    </Ink>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ev.side === 'me' ? V : D }} />
                    <Ink size={14} weight="bold" color={ev.side === 'me' ? V : D} style={{ flex: 1 }}>
                      {ev.label}
                    </Ink>
                    {ev.points ? (
                      <Ink size={13} weight="black" color={ev.side === 'me' ? V : D}>
                        {`+${ev.points}`}
                      </Ink>
                    ) : null}
                  </View>
                ))}
            </Card>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  // ── Resultat ──
  // Une soumission decide du match, sinon les points
  const firstTap = events.find((e) => e.type === 'tap');
  const myWin = firstTap ? firstTap.side === 'me' : me > opp;
  const oppWin = firstTap ? firstTap.side === 'opponent' : opp > me;
  const color = myWin ? V : oppWin ? D : N;
  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 110, gap: 14 }} keyboardShouldPersistTaps="handled">
        <IconBtn icon="back" label={traduire("Revenir au match")} onPress={() => setPhase('live')} />
        <Glass style={{ alignItems: 'center', gap: 8, paddingVertical: 26 }}>
          {myWin ? <SealOr size={72} rotate={-8} color={P.goldDark} /> : <Glyph kind={oppWin ? 'vague' : 'eventail'} size={60} color={color} />}
          <Ink size={28} weight="black" tight color={color}>
            {myWin ? traduire('Victoire') : oppWin ? traduire('Défaite') : traduire('Égalité')}
          </Ink>
          <Ink size={56} weight="black" tight>
            {traduire("{0} à {1}", me, opp)}
          </Ink>
          {elapsed.current > 0 ? (
            <Ink size={14} weight="bold" color={P.ink2}>
              {traduire("Durée {0}", fmt(elapsed.current))}
            </Ink>
          ) : null}
        </Glass>
        {events.length > 0 ? (
          <Card style={{ gap: 10 }}>
            <Ink size={18} weight="black" tight>
              {traduire("Le match en entier")}</Ink>
            {events.map((ev) => (
              <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ink size={12} weight="bold" color={P.muted} style={{ width: 40 }}>
                  {fmt(ev.timestamp)}
                </Ink>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ev.side === 'me' ? V : D }} />
                <Ink size={14} weight="bold" color={ev.side === 'me' ? V : D} style={{ flex: 1 }}>
                  {ev.label}
                </Ink>
                {ev.points ? (
                  <Ink size={13} weight="black" color={ev.side === 'me' ? V : D}>
                    {`+${ev.points}`}
                  </Ink>
                ) : null}
              </View>
            ))}
          </Card>
        ) : null}
        <Field label={traduire("Tes notes après le match")} value={notes} onChangeText={setNotes} multiline placeholder={traduire("Ce qui a marché, ce qui t'a surpris, ce que tu travailles ensuite")} />
      </ScrollView>
      <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 14 }}>
        <BigButton label={saved ? traduire('Match enregistré') : traduire('Enregistrer le match')} icon="check" tone={saved ? 'ink' : 'red'} onPress={save} disabled={saved} />
      </View>
    </View>
  );
}
