/**
 * Ecran d'un chrono en cours, commun aux Chronos et au chrono de sparring.
 * Lisible de loin : la phase en clair (Préparation, Round 2 sur 5, Repos, Série 3), le temps
 * restant en tres gros, la phase suivante, les pastilles des rounds, et une couleur par phase
 * (effort indigo, repos mousse, preparation or, 10 dernieres secondes en rouge soie).
 */
import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P, IconBtn, Press, CIcon } from '../ui';
import { ChronoRing } from './ChronoRing';
import { ControlBar, NextUp, PhaseHeader, SessionTrack } from './parts';
import { PHASE_COLORS } from '@/lib/v2/carnet/chrono';
import type { Phase } from '@/lib/v2/carnet/chrono';
import type { ChronoEngine, ChronoPhase } from '@/lib/v2/carnet/useChronoEngine';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { blancA } from '@/components/yoroi/livePalette';

/** Seuil des dernieres secondes en rouge : 10 s pour un vrai round, 3 s pour un effort court */
export function finalThreshold(p: ChronoPhase): number {
  return p.duration >= 30 ? 10 : 3;
}

/** Couleur de la phase en cours */
export function phaseColorKey(engine: ChronoEngine): Phase {
  const p = engine.phase;
  if (engine.status === 'finished' || !p) return 'fini';
  if (p.kind === 'prepa') return 'prepa';
  if (p.countUp) return 'effort';
  if (p.kind === 'repos') return engine.remaining <= 10 && p.duration > 15 && (!engine.next || engine.next.kind === 'effort') ? 'prepa' : 'repos';
  return engine.remaining <= finalThreshold(p) ? 'final' : 'effort';
}

/** 300 -> 5:00, 45 -> 45 (le temps qui descend sous la minute s'affiche en secondes, en tres gros) */
export function bigTime(seconds: number, countUp?: boolean): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  if (s < 60 && !countUp) return String(s);
  return `${m}:${String(r).padStart(2, '0')}`;
}

function kindLabel(engine: ChronoEngine, key: Phase): string {
  const p = engine.phase;
  if (engine.status === 'finished') return 'Terminé';
  if (engine.status === 'holding') return 'Round terminé';
  if (!p) return '';
  if (key === 'final') return `${engine.remaining} dernière${engine.remaining > 1 ? 's' : ''} seconde${engine.remaining > 1 ? 's' : ''}`;
  if (key === 'prepa' && p.kind === 'repos') return 'Prépare-toi, ça repart';
  if (p.kind === 'prepa') return 'Préparation';
  if (p.kind === 'repos') return 'Repos';
  return engine.status === 'paused' ? 'En pause' : 'Effort';
}

type Props = {
  engine: ChronoEngine;
  /** nom du chrono, en haut */
  name: string;
  focusMode: boolean;
  onToggleFocus?: () => void;
  /** arret confirme */
  onStop: () => void;
  confirmStop?: boolean;
  skipLabel?: string;
  canSkip?: boolean;
  onReset?: () => void;
  /** titre a la place de celui de la phase (fin du chrono...) */
  titleOverride?: string;
  subOverride?: string;
  /** texte "Ensuite" a la place de la phase suivante */
  nextOverride?: string | null;
  /** pastilles : faits, total, en cours */
  track?: { done: number; total: number; current?: number } | null;
  /** zone sous l'anneau (tour termine, resultats...) */
  children?: React.ReactNode;
  /** commandes a la place de la barre (fin du chrono) */
  footer?: React.ReactNode;
  /** moins et plus sur la phase en cours (repos muscu : 15 s) */
  adjust?: { onMinus: () => void; onPlus: () => void; step?: string } | null;
};

export function ActiveChrono({ engine, name, focusMode, onToggleFocus, onStop, confirmStop, skipLabel, canSkip = true, onReset, titleOverride, subOverride, nextOverride, track, children, footer, adjust }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const key = phaseColorKey(engine);
  const pc = PHASE_COLORS[key];
  const p = engine.phase;
  const running = engine.status === 'running';
  const ringSize = Math.min(width - 32, height * (focusMode ? 0.56 : height < 720 ? 0.36 : 0.42), 420);
  const time = engine.status === 'finished' && !p?.countUp ? '0:00' : bigTime(engine.display, p?.countUp);
  const under = p && !p.countUp && engine.display < 60 && engine.status !== 'finished' ? 'secondes' : p?.countUp ? `sur ${bigTime(p.duration, true)}` : undefined;
  const beat = running && !!p && !p.countUp && engine.remaining > 0 && engine.remaining <= 3;

  const next = nextOverride !== undefined ? nextOverride : engine.next ? engine.next.short : engine.status === 'finished' ? null : 'Fin du chrono';

  const askStop = () => {
    if (!confirmStop || engine.status === 'finished') {
      onStop();
      return;
    }
    appAlert('Arrêter le chrono ?', 'Le chrono repart de zéro.', [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Arrêter', style: 'destructive', onPress: onStop },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: pc.soft }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        <View style={{ width: 44 }} />
        <Ink size={15} weight="extraBold" color={P.ink2} numberOfLines={1} style={{ flexShrink: 1, textAlign: 'center' }}>{name}</Ink>
        {onToggleFocus ? <IconBtn name="eye" label={focusMode ? 'Quitter le mode épuré' : 'Mode épuré : juste le temps'} onPress={onToggleFocus} tone={focusMode ? 'ink' : 'glass'} /> : <View style={{ width: 44 }} />}
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'space-evenly', paddingVertical: 8 }}>
        {focusMode ? (
          <Ink size={22} weight="black" tight color={pc.deep} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ paddingHorizontal: 20 }}>{titleOverride ?? p?.title ?? ''}</Ink>
        ) : (
          <PhaseHeader kind={kindLabel(engine, key)} title={titleOverride ?? p?.title ?? ''} sub={subOverride ?? p?.sub} color={pc.main} deep={pc.deep} />
        )}

        <ChronoRing size={ringSize} progress={engine.progress} color={pc.main} soft="rgba(255,255,255,0.6)" time={time} sub={under} digitColor={key === 'final' ? pc.deep : P.ink} beat={beat} beatKey={engine.remaining} big={focusMode} />

        {adjust && (running || engine.status === 'paused') ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <AdjustBtn icon="minus" text={adjust.step ?? '15 s'} label={`Moins ${adjust.step ?? '15 s'} de repos`} onPress={adjust.onMinus} />
            <AdjustBtn icon="plus" text={adjust.step ?? '15 s'} label={`Plus ${adjust.step ?? '15 s'} de repos`} onPress={adjust.onPlus} />
          </View>
        ) : null}

        {!focusMode ? (
          <View style={{ alignItems: 'center', gap: 12, alignSelf: 'stretch' }}>
            {next ? <NextUp text={next} color={engine.next ? PHASE_COLORS[engine.next.kind === 'repos' ? 'repos' : engine.next.kind === 'prepa' ? 'prepa' : 'effort'].main : P.ink} /> : null}
            {track ? <SessionTrack done={Math.max(0, track.done)} total={track.total} color={pc.main} current={track.current} /> : null}
          </View>
        ) : null}

        {children}
      </View>

      <View style={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 20 }}>
        {footer ?? (
          <ControlBar
            running={running}
            onToggle={running ? engine.pause : engine.resume}
            onStop={askStop}
            onSkip={canSkip ? engine.skip : undefined}
            onReset={onReset}
            color={pc.main}
            skipLabel={skipLabel}
          />
        )}
      </View>
    </View>
  );
}

/** Bouton moins ou plus sur la phase en cours, gros et lisible */
function AdjustBtn({ icon, text, label, onPress }: { icon: 'minus' | 'plus'; text: string; label: string; onPress: () => void }) {
  return (
    <Press onPress={onPress} haptic="medium" accessibilityRole="button" accessibilityLabel={label}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 54, minWidth: 124, paddingHorizontal: 18, borderRadius: 27, backgroundColor: blancA(0.92), borderWidth: 1, borderColor: P.white, justifyContent: 'center' }}>
        <CIcon name={icon} size={20} color={P.ink} width={2.8} />
        <Ink size={18} weight="black" tight>{text}</Ink>
      </View>
    </Press>
  );
}
