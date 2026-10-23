/**
 * Studio, galerie des sons : chaque fichier de assets/sounds appele par lib/sounds.ts et lib/soundManager.ts,
 * avec lecture, duree et position, et la sequence de fin de round (claquettes, puis cloche 3 secondes plus tard).
 * Les lecteurs sont propres a cet ecran : ils ne touchent pas aux sons des chronos.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { Bloc, Bouton, GalerieScreen, Pastille, PastilleRow, Rubrique } from './kit';
import { P } from '@/components/yoroi/livePalette';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

type Son = { id: string; nom: string; fichier: string; ou: string; src: number };

const SONS: Son[] = [
  { id: 'clap', nom: 'Claquettes', fichier: 'clap10.mp3', ou: traduire('Les 10 dernières secondes d’un round (chrono, combat)'), src: require('@/assets/sounds/clap10.mp3') },
  { id: 'bell', nom: traduire('Cloche de fin de round'), fichier: 'bell_end.mp3', ou: traduire('Fin d’un round (chrono, combat)'), src: require('@/assets/sounds/bell_end.mp3') },
  { id: 'gong', nom: 'Gong', fichier: 'gong.mp3', ou: traduire('Chronos, séance de combat, premier lancement'), src: require('@/assets/sounds/gong.mp3') },
  { id: 'beep', nom: 'Bip', fichier: 'beep.mp3', ou: traduire('Décompte des chronos et fin du repos muscu'), src: require('@/assets/sounds/beep.mp3') },
  { id: 'levelup', nom: traduire('Montée de niveau'), fichier: 'level-up.mp3', ou: traduire('Premier lancement et passage à Premium'), src: require('@/assets/sounds/level-up.mp3') },
  { id: 'fanfare', nom: 'Fanfare', fichier: 'fanfare-badge.mp3', ou: traduire('Fin d’une séance enregistrée'), src: require('@/assets/sounds/fanfare-badge.mp3') },
  { id: 'victory', nom: traduire('Victoire'), fichier: 'victory.mp3', ou: traduire('Fin d’un chrono'), src: require('@/assets/sounds/victory.mp3') },
  { id: 'wizz', nom: 'Wizz', fichier: 'wizz.mp3', ou: traduire('Chrono'), src: require('@/assets/sounds/wizz.mp3') },
  { id: 'ring', nom: 'Sonnerie courte', fichier: 'ring.mp3', ou: traduire('Record, jeûne et récompenses'), src: require('@/assets/sounds/ring.mp3') },
  { id: 'recovery', nom: traduire('Récupération'), fichier: 'recovery.mp3', ou: traduire('Chargé, mais joué nulle part pour l’instant'), src: require('@/assets/sounds/recovery.mp3') },
];

function secondes(s: number | null | undefined): string {
  if (s === null || s === undefined || !Number.isFinite(s) || s <= 0) return '...';
  if (s < 10) return `${s.toFixed(1).replace('.', DECIMAL)} s`;
  if (s < 60) return `${Math.round(s)} s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m} min ${String(r).padStart(2, '0')}`;
}

function rejouer(p: AudioPlayer) {
  try {
    p.seekTo(0);
    p.play();
  } catch {
    // lecteur pas pret
  }
}

function arreter(p: AudioPlayer) {
  try {
    p.pause();
    p.seekTo(0);
  } catch {
    // rien a arreter
  }
}

function LigneSon({ son, first, stopAll }: { son: Son; first: boolean; stopAll: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const player = useAudioPlayer(son.src);
  const st = useAudioPlayerStatus(player);
  useEffect(() => {
    if (stopAll > 0) arreter(player);
  }, [stopAll, player]);
  const dur = st.duration;
  const pos = st.currentTime ?? 0;
  const prog = dur && dur > 0 ? Math.min(1, pos / dur) : 0;
  return (
    <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 8, borderTopWidth: first ? 0 : 1, borderTopColor: c.divider }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          onPress={() => {
            selectionAsync().catch(() => {});
            if (st.playing) arreter(player);
            else rejouer(player);
          }}
          accessibilityRole="button"
          accessibilityLabel={st.playing ? traduire("Arrêter {0}", son.nom) : traduire("Écouter {0}", son.nom)}
          style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, backgroundColor: st.playing ? c.accent : pressed ? c.fillSubtle : c.accentTint, alignItems: 'center', justifyContent: 'center' })}
        >
          {st.playing ? (
            <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: P.white }} />
          ) : (
            <View style={{ width: 0, height: 0, marginLeft: 4, borderTopWidth: 9, borderBottomWidth: 9, borderLeftWidth: 15, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: c.accent }} />
          )}
        </Pressable>
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={15} weight="extraBold" numberOfLines={1}>{traduire(son.nom)}</Ink>
          <Ink size={12} color={c.textMuted} numberOfLines={1}>{son.fichier}</Ink>
          <Ink size={12} color={c.textSecondary} numberOfLines={2}>{son.ou}</Ink>
        </View>
        <Ink size={14} weight="black" color={c.ink}>{secondes(dur)}</Ink>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: c.fillSoft, overflow: 'hidden', marginLeft: 60 }}>
        <View style={{ width: `${Math.round(prog * 100)}%`, height: 4, backgroundColor: c.accent }} />
      </View>
    </View>
  );
}

const DELAIS = [2, 3, 5];

/** Fin de round : claquettes, puis la cloche quelques secondes plus tard */
function SequenceFinDeRound({ stopAll }: { stopAll: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const clap = useAudioPlayer(SONS[0].src);
  const bell = useAudioPlayer(SONS[1].src);
  const [delai, setDelai] = useState(3);
  const [etape, setEtape] = useState<'repos' | 'claquettes' | 'cloche'>('repos');
  const [reste, setReste] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const nettoyer = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => () => nettoyer(), []);
  useEffect(() => {
    if (stopAll > 0) {
      nettoyer();
      arreter(clap);
      arreter(bell);
      setEtape('repos');
    }
  }, [stopAll, clap, bell]);

  const lancer = () => {
    nettoyer();
    arreter(bell);
    setEtape('claquettes');
    setReste(delai);
    rejouer(clap);
    for (let i = 1; i < delai; i++) timers.current.push(setTimeout(() => setReste(delai - i), i * 1000));
    timers.current.push(
      setTimeout(() => {
        setEtape('cloche');
        setReste(0);
        rejouer(bell);
      }, delai * 1000),
    );
    timers.current.push(setTimeout(() => setEtape('repos'), delai * 1000 + 3500));
  };

  const pas = [
    { k: 'claquettes', label: 'Claquettes', sub: 'clap10.mp3' },
    { k: 'cloche', label: 'Cloche', sub: traduire("bell_end.mp3, {0} s plus tard", delai) },
  ] as const;

  return (
    <Bloc>
      <Ink size={16} weight="black">{traduire("Séquence de fin de round")}</Ink>
      <Ink size={13} color={c.textSecondary}>{traduire("Les claquettes, puis la cloche. Écoute si l’enchaînement sonne juste.")}</Ink>
      <PastilleRow>
        {DELAIS.map((d) => (
          <Pastille key={d} label={traduire("Cloche {0} s après", d)} on={delai === d} onPress={() => setDelai(d)} />
        ))}
      </PastilleRow>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {pas.map((p) => {
          const on = etape === p.k;
          return (
            <View key={p.k} style={{ flex: 1, borderRadius: 16, padding: 12, gap: 2, backgroundColor: on ? c.accent : c.fillSoft }}>
              <Ink size={14} weight="extraBold" color={on ? '#FFFFFF' : c.ink}>{traduire(p.label)}</Ink>
              <Ink size={11} color={on ? 'rgba(255,255,255,0.85)' : c.textMuted} numberOfLines={2}>{p.sub}</Ink>
            </View>
          );
        })}
      </View>
      <Ink size={13} weight="bold" color={c.textSecondary} style={{ textAlign: 'center', minHeight: 18 }}>
        {etape === 'claquettes' ? traduire("Cloche dans {0} s", reste) : etape === 'cloche' ? traduire('La cloche sonne') : ' '}
      </Ink>
      <Bouton label={etape === 'repos' ? traduire('Lancer la séquence') : 'Relancer'} icon="timer" onPress={lancer} />
    </Bloc>
  );
}

export function SonsGalerie() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [stopAll, setStopAll] = useState(0);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }, []);

  return (
    <GalerieScreen title={traduire("Sons")} sub={traduire("{0} sons de l’app. Le téléphone joue même en mode silencieux ici.", SONS.length)}>
      <SequenceFinDeRound stopAll={stopAll} />
      <Rubrique title={traduire("Chaque son")} sub={traduire("Touche pour écouter, touche encore pour arrêter.")} />
      <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
        {SONS.map((s, i) => (
          <LigneSon key={s.id} son={s} first={i === 0} stopAll={stopAll} />
        ))}
      </View>
      <Pressable
        onPress={() => setStopAll((n) => n + 1)}
        accessibilityRole="button"
        accessibilityLabel={traduire("Tout arrêter")}
        style={({ pressed }) => ({ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: pressed ? c.fillSubtle : 'transparent' })}
      >
        <Icon name="close" size={16} color={c.textSecondary} />
        <Ink size={14} weight="extraBold" color={c.textSecondary}>{traduire("Tout arrêter")}</Ink>
      </Pressable>
    </GalerieScreen>
  );
}

export default SonsGalerie;
