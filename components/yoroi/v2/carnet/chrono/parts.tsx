/**
 * Pieces des chronos v2 : reglage plus et moins, cartes de prereglage, barre de commandes,
 * feuille de fin (bilan, effort ressenti, enregistrer la seance).
 */
import React, { useRef } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ChoiceRow, Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { P, Press, tap, CIcon, BigButton } from '../ui';
import { useAccent } from '@/components/yoroi/v2/accueil/kit';
import { RPE_CHOICES } from '@/lib/v2/carnet/chrono';
import { blancA, paletteSombre } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

/** Reglage plus et moins, appui long pour aller vite. Une phase par ligne, pastille de sa couleur. */
export function SettingRow({ label, value, onMinus, onPlus, hint, accent = P.ink, dot }: { label: string; value: string; onMinus: () => void; onPlus: () => void; hint?: string; accent?: string; dot?: string }) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hold = (fn: () => void) => {
    fn();
    wait.current = setTimeout(() => {
      timer.current = setInterval(fn, 110);
    }, 420);
  };
  const release = () => {
    if (wait.current) clearTimeout(wait.current);
    if (timer.current) clearInterval(timer.current);
    wait.current = null;
    timer.current = null;
  };
  const btn = (icon: 'minus' | 'plus', fn: () => void, name: string) => (
    <Pressable
      onPress={() => tap()}
      onPressIn={() => hold(fn)}
      onPressOut={release}
      accessibilityRole="button"
      accessibilityLabel={`${name} ${label}`}
      hitSlop={4}
      style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 16, backgroundColor: pressed ? (paletteSombre() ? P.line : '#E2DFD8') : paletteSombre() ? P.line2 : '#F0EEE8', alignItems: 'center', justifyContent: 'center' })}
    >
      <CIcon name={icon} size={20} color={P.ink} width={2.6} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 64 }}>
      {dot ? <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: dot, marginRight: 6 }} /> : <View style={{ width: 16 }} />}
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={15} weight="bold" numberOfLines={2}>{label}</Ink>
        {hint ? <Ink size={12} weight="medium" color={P.muted} numberOfLines={2}>{hint}</Ink> : null}
      </View>
      {btn('minus', onMinus, traduire('Moins'))}
      {/* largeur fixe : chaque valeur garde la meme taille ("5 min" comme "1 min") */}
      <View style={{ width: 84, alignItems: 'center' }}>
        <Ink size={18} weight="black" color={accent} style={{ textAlign: 'center', fontVariant: ['tabular-nums'] }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {value}
        </Ink>
      </View>
      {btn('plus', onPlus, 'Plus')}
    </View>
  );
}

/** Interrupteur sur une ligne */
export function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { accent } = useAccent();
  return (
    <Press onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="bold">{label}</Ink>
          {hint ? <Ink size={12} weight="medium" color={P.muted}>{hint}</Ink> : null}
        </View>
        <View style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: value ? accent : paletteSombre() ? P.dashed : '#D5D2CA', padding: 3, alignItems: value ? 'flex-end' : 'flex-start' }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: P.white }} />
        </View>
      </View>
    </Press>
  );
}

/**
 * Cartes de prereglage en grille qui passe a la ligne : tout est visible, rien n'est coupe,
 * pas de defilement cache. columns : nombre de cartes par ligne.
 */
export function PresetStrip<T extends string | number>({ items, value, onPick, columns = 3 }: { items: { key: T; title: string; sub?: string }[]; value: T | null; onPick: (k: T) => void; columns?: number }) {
  const basis = `${Math.floor(100 / columns) - 3}%` as const;
  const { accent } = useAccent();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <View key={String(it.key)} style={{ flexBasis: basis, flexGrow: 1 }}>
            <Press onPress={() => onPick(it.key)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={it.sub ? `${it.title}, ${it.sub}` : it.title}>
              <View style={{ minHeight: it.sub ? 60 : 48, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, backgroundColor: on ? accent : P.white, borderWidth: 1, borderColor: on ? accent : P.line2, justifyContent: 'center' }}>
                <Ink size={15} weight="black" tight color={on ? P.white : P.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{traduire(it.title)}</Ink>
                {it.sub ? <Ink size={12} weight="bold" color={on ? (paletteSombre() ? P.white : 'rgba(255,255,255,0.78)') : P.muted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{traduire(it.sub)}</Ink> : null}
              </View>
            </Press>
          </View>
        );
      })}
    </View>
  );
}

/** Bande de la seance : chaque phase a sa couleur et sa longueur reelle */
export function TimelineBand({ parts, height = 12 }: { parts: { seconds: number; color: string }[]; height?: number }) {
  const total = parts.reduce((s, p) => s + p.seconds, 0);
  if (total <= 0 || parts.length > 160) return null;
  return (
    <View style={{ flexDirection: 'row', height, borderRadius: height / 2, overflow: 'hidden', gap: 2 }}>
      {parts.map((p, i) => (
        <View key={i} style={{ flex: p.seconds / total, backgroundColor: p.color, minWidth: 2 }} />
      ))}
    </View>
  );
}

/** Commandes pendant le chrono : arreter, pause ou reprise, passer. Bien separees et legendees. */
export function ControlBar({ running, onToggle, onStop, onSkip, onReset, color, skipLabel = traduire('Passer') }: { running: boolean; onToggle: () => void; onStop: () => void; onSkip?: () => void; onReset?: () => void; color: string; skipLabel?: string }) {
  const side = (name: 'stop' | 'skip' | 'reset', label: string, fn: () => void) => (
    <View style={{ alignItems: 'center', gap: 6, width: 84 }}>
      <Press onPress={fn} accessibilityRole="button" accessibilityLabel={label} haptic="medium">
        <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: blancA(0.94), borderWidth: 1, borderColor: P.white, alignItems: 'center', justifyContent: 'center', shadowColor: P.ink, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
          <CIcon name={name} size={24} color={name === 'stop' ? P.danger : P.ink} />
        </View>
      </Press>
      <Ink size={12} weight="bold" color={P.ink2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Ink>
    </View>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 4 }}>
      {side('stop', traduire('Arrêter'), onStop)}
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Press onPress={onToggle} haptic="medium" accessibilityRole="button" accessibilityLabel={running ? traduire('Pause') : traduire('Reprendre')}>
          <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: color, alignItems: 'center', justifyContent: 'center', shadowColor: color, shadowOpacity: 0.32, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}>
            <CIcon name={running ? 'pause' : 'play'} size={36} color={P.white} />
          </View>
        </Press>
        <Ink size={12} weight="bold" color={P.ink2}>{running ? traduire('Pause') : traduire('Reprendre')}</Ink>
      </View>
      {onSkip ? side('skip', skipLabel, onSkip) : onReset ? side('reset', traduire('Phase à zéro'), onReset) : <View style={{ width: 84 }} />}
    </View>
  );
}

/** Pastille de phase : son nom en clair, dans sa couleur */
export function PhasePill({ text, color, soft }: { text: string; color: string; soft: string }) {
  return (
    <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 34, borderRadius: 17, backgroundColor: soft }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      <Ink size={14} weight="extraBold" color={color} numberOfLines={1}>{text}</Ink>
    </View>
  );
}

/** En-tete de phase lisible de loin : type de phase, puis son titre en grand */
export function PhaseHeader({ kind, title, sub, color, deep }: { kind: string; title: string; sub?: string; color: string; deep: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 6, paddingHorizontal: 16 }}>
      <PhasePill text={kind} color={color} soft="rgba(255,255,255,0.8)" />
      <Ink size={30} weight="black" tight color={deep} style={{ textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {title}
      </Ink>
      {sub ? <Ink size={16} weight="bold" color={P.ink2} style={{ textAlign: 'center' }} numberOfLines={2}>{sub}</Ink> : null}
    </View>
  );
}

/** Ce qui vient ensuite */
export function NextUp({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, minHeight: 40, borderRadius: 20, backgroundColor: blancA(0.7), borderWidth: 1, borderColor: P.white, maxWidth: '92%' }}>
      <Ink size={13} weight="bold" color={P.muted}>{traduire("Ensuite")}</Ink>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Ink size={15} weight="extraBold" color={P.ink} numberOfLines={1} style={{ flexShrink: 1 }}>{text}</Ink>
    </View>
  );
}

/** Pastilles des rounds : faits, en cours, restants */
export function SessionTrack({ done, total, color, current }: { done: number; total: number; color: string; current?: number }) {
  if (total <= 1 || total > 40) return null;
  const gap = total > 16 ? 3 : 5;
  // segments horizontaux : une barre de rounds sur toute la largeur, lisible de loin
  const seg = Math.max(5, Math.min(38, Math.floor((300 - gap * (total - 1)) / total)));
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap }}>
        {Array.from({ length: total }).map((_, i) => {
          const isDone = i < done;
          const isCur = current != null && i === current - 1 && !isDone;
          return (
            <View
              key={i}
              style={{
                width: seg,
                height: 12,
                borderRadius: 6,
                backgroundColor: isDone ? color : isCur ? P.white : 'rgba(29,32,41,0.10)',
                borderWidth: isCur ? 2.5 : 0,
                borderColor: color,
              }}
            />
          );
        })}
      </View>
      <Ink size={13} weight="bold" color={P.ink2}>{done === 0 ? traduire("{0} à faire", total) : done >= total ? traduire('Tout est fait') : `${traduirePluriel(done, done > 1, "{0} fait", "{0} faits", done)}, ${traduirePluriel(total - done, total - done > 1, "{0} restant", "{0} restants", total - done)}`}</Ink>
    </View>
  );
}

/** Feuille de fin de chrono : bilan, effort ressenti, enregistrer la seance */
export function FinishSheet({
  visible,
  title,
  lines,
  rpe,
  onRpe,
  onSave,
  onRestart,
  onClose,
  saveLabel = traduire('Enregistrer la séance'),
  children,
}: {
  visible: boolean;
  title: string;
  lines: { label: string; value: string }[];
  rpe: number | null;
  onRpe: (v: number | null) => void;
  onSave: () => void;
  onRestart: () => void;
  onClose: () => void;
  saveLabel?: string;
  children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Sheet visible={visible} onClose={onClose} scroll>
      <View style={{ alignItems: 'center', gap: 6, paddingTop: 4 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: P.mossSoft, alignItems: 'center', justifyContent: 'center' }}>
          <CIcon name="check" size={32} color={P.mossText} width={3} />
        </View>
        <Ink size={26} weight="black" tight style={{ textAlign: 'center' }}>{title}</Ink>
        <Ink size={14} weight="medium" color={P.ink2} style={{ textAlign: 'center' }}>{traduire("Garde une trace de ta séance dans ton historique.")}</Ink>
      </View>
      {lines.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {lines.map((l) => (
            <View key={l.label} style={{ flexGrow: 1, flexBasis: '30%', borderRadius: 18, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, padding: 12, gap: 2 }}>
              <Ink size={12} weight="bold" color={P.ink2}>{traduire(l.label)}</Ink>
              <Ink size={22} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{l.value}</Ink>
            </View>
          ))}
        </View>
      ) : null}
      {children}
      <View style={{ gap: 8 }}>
        <Ink size={14} weight="bold" color={P.ink2} style={{ paddingHorizontal: 4 }}>{traduire("Comment c'était ?")}</Ink>
        <ChoiceRow options={RPE_CHOICES} value={rpe} onChange={onRpe} columns={4} />
      </View>
      <View style={{ gap: 10, paddingBottom: insets.bottom > 0 ? 0 : 6 }}>
        <BigButton label={saveLabel} icon="check" onPress={onSave} />
        <BigButton label={traduire("Recommencer")} tone="light" icon="refresh" onPress={onRestart} />
      </View>
    </Sheet>
  );
}
