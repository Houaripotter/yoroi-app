/**
 * Briques des ecrans de notifications (refonte v2) : carte de rappel repliable,
 * choix de l'heure, choix des jours, apercu de la notification telle qu'elle arrive.
 */
import React, { useEffect, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Platform, Pressable, Switch, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeIn } from 'react-native-reanimated';
import { selectionAsync } from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { P, blancA } from '@/components/yoroi/livePalette';

const NBSP = ' ';

/** Jours dans l'ordre francais (lundi d'abord), avec leur numero JavaScript (dimanche = 0). */
export const WEEK_DAYS: { js: number; short: string; name: string }[] = [
  { js: 1, short: 'L', name: 'lundi' },
  { js: 2, short: 'M', name: 'mardi' },
  { js: 3, short: 'M', name: 'mercredi' },
  { js: 4, short: 'J', name: 'jeudi' },
  { js: 5, short: 'V', name: 'vendredi' },
  { js: 6, short: 'S', name: 'samedi' },
  { js: 0, short: 'D', name: 'dimanche' },
];

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS = [1, 2, 3, 4, 5];

/** « 7 h » ou « 7 h 30 » */
export function sayTime(hhmm?: string | null): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':');
  const hh = parseInt(h, 10);
  if (!Number.isFinite(hh)) return hhmm;
  return !m || m === '00' ? `${hh}${NBSP}h` : `${hh}${NBSP}h${NBSP}${m}`;
}

/** Les jours choisis, en clair : « tous les jours », « en semaine », « lun., mer., ven. » */
export function sayDays(days: number[]): string {
  const set = new Set(days);
  if (set.size === 7) return 'tous les jours';
  if (set.size === 5 && WEEKDAYS.every((d) => set.has(d))) return 'en semaine';
  if (set.size === 2 && set.has(0) && set.has(6)) return 'le week-end';
  if (set.size === 1) {
    const d = WEEK_DAYS.find((x) => set.has(x.js));
    return d ? `le ${d.name}` : '';
  }
  return WEEK_DAYS.filter((d) => set.has(d.js)).map((d) => `${d.name.slice(0, 3)}.`).join(', ');
}

function toDate(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

function toHhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Prochaine date ou tombe un rappel (jours JavaScript, heure HH:mm). */
export function nextFire(days: number[], hhmm: string, from = new Date()): Date | null {
  if (!days.length) return null;
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  for (let i = 0; i < 8; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    d.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
    if (days.includes(d.getDay()) && d.getTime() > from.getTime()) return d;
  }
  return null;
}

/** « aujourd'hui à 18 h », « demain à 7 h », « jeudi à 19 h » */
export function sayWhen(d: Date, from = new Date()): string {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const diff = Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - start) / 86400000);
  const t = sayTime(toHhmm(d));
  if (diff === 0) return `aujourd’hui à ${t}`;
  if (diff === 1) return `demain à ${t}`;
  const name = WEEK_DAYS.find((x) => x.js === d.getDay())?.name ?? '';
  return `${name} à ${t}`;
}

function hap() {
  selectionAsync().catch(() => {});
}

/** Piste d'un interrupteur eteint : assez foncee pour ne pas avoir l'air desactivee. */
export const SWITCH_OFF = '#BDB8AD';

// ============================================
// HEURE
// ============================================

export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => toDate(value));

  useEffect(() => {
    if (open) setDraft(toDate(value));
  }, [open, value]);

  return (
    <View>
      <Pressable
        onPress={() => {
          hap();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${sayTime(value)}. Modifier`}
        style={({ pressed }) => ({
          minHeight: 56,
          borderRadius: 16,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: pressed ? c.fillSoft : c.surface,
          borderWidth: 1,
          borderColor: c.border,
        })}
      >
        <Icon name="timer" size={20} color={c.accent} />
        <Ink size={14} weight="bold" color={c.textSecondary} style={{ flex: 1 }} numberOfLines={2}>
          {label}
        </Ink>
        <Ink size={22} weight="black" tight>
          {sayTime(value)}
        </Ink>
        <Icon name="chevron" size={16} color={c.textMuted} />
      </Pressable>
      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={draft}
          mode="time"
          is24Hour
          display="default"
          onChange={(e, d) => {
            setOpen(false);
            if (e.type !== 'dismissed' && d) onChange(toHhmm(d));
          }}
        />
      ) : null}
      {Platform.OS !== 'android' ? (
        <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
          <View style={{ alignItems: 'center' }}>
            <DateTimePicker value={draft} mode="time" display="spinner" is24Hour locale="fr-FR" minuteInterval={5} themeVariant="light" onChange={(_, d) => d && setDraft(d)} />
          </View>
          <Pressable
            onPress={() => {
              hap();
              onChange(toHhmm(draft));
              setOpen(false);
            }}
            accessibilityRole="button"
            style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, backgroundColor: pressed ? c.accentPressed : c.accent, alignItems: 'center', justifyContent: 'center' })}
          >
            <Ink size={16} weight="extraBold" color={c.onAccent}>{`Valider ${sayTime(toHhmm(draft))}`}</Ink>
          </Pressable>
        </Sheet>
      ) : null}
    </View>
  );
}

// ============================================
// JOURS
// ============================================

export function DaysPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const set = new Set(value);
  const presets: { label: string; days: number[] }[] = [
    { label: 'Tous les jours', days: EVERY_DAY },
    { label: 'En semaine', days: WEEKDAYS },
    { label: 'Week-end', days: [0, 6] },
  ];
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ink size={14} weight="bold" color={c.textSecondary} style={{ flex: 1 }}>
          Les jours
        </Ink>
        <Ink size={13} weight="extraBold" color={c.accent}>
          {sayDays(value)}
        </Ink>
      </View>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {WEEK_DAYS.map((d) => {
          const on = set.has(d.js);
          return (
            <Pressable
              key={d.js}
              onPress={() => {
                hap();
                const next = on ? value.filter((x) => x !== d.js) : [...value, d.js];
                // au moins un jour : sans jour, le rappel repartirait sur ses jours par defaut
                if (next.length) onChange(next.sort());
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={d.name}
              style={({ pressed }) => ({
                flex: 1,
                height: 44,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? c.accent : pressed ? c.fillSoft : c.surface,
                borderWidth: on ? 0 : 1,
                borderColor: c.border,
              })}
            >
              <Ink size={15} weight="black" color={on ? c.onAccent : c.textSecondary}>
                {d.short}
              </Ink>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {presets.map((p) => {
          const on = p.days.length === set.size && p.days.every((x) => set.has(x));
          return (
            <Pressable
              key={p.label}
              onPress={() => {
                hap();
                onChange([...p.days]);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => ({
                minHeight: 36,
                paddingHorizontal: 12,
                borderRadius: 18,
                justifyContent: 'center',
                backgroundColor: on ? c.accentTint : pressed ? c.fillSoft : 'transparent',
                borderWidth: 1,
                borderColor: on ? c.accentTint : c.border,
              })}
            >
              <Ink size={13} weight="bold" color={on ? c.accent : c.textSecondary}>
                {p.label}
              </Ink>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Choix parmi quelques valeurs (intervalle d'hydratation par exemple). */
export function ChoiceChips<T extends string | number>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ gap: 8 }}>
      <Ink size={14} weight="bold" color={c.textSecondary}>
        {label}
      </Ink>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => {
                hap();
                onChange(o.value);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 44,
                paddingHorizontal: 4,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? c.accent : pressed ? c.fillSoft : c.surface,
                borderWidth: on ? 0 : 1,
                borderColor: c.border,
              })}
            >
              <Ink size={14} weight="extraBold" color={on ? c.onAccent : c.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {o.label}
              </Ink>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Petite ligne interrupteur a l'interieur d'une carte (options d'un rappel). */
export function MiniToggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}>
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={14} weight="bold">{label}</Ink>
        {sub ? <Ink size={12} color={c.textMuted}>{sub}</Ink> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          hap();
          onChange(v);
        }}
        trackColor={{ false: SWITCH_OFF, true: c.accent }}
        thumbColor="#FFFFFF"
        {...({ activeThumbColor: '#FFFFFF' } as object)}
        ios_backgroundColor={SWITCH_OFF}
        accessibilityLabel={label}
      />
    </View>
  );
}

// ============================================
// APERCU
// ============================================

/** La notification telle qu'elle s'affiche sur l'ecran verrouille. */
export function NotifPreview({ title, body, when }: { title: string; body: string; when?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ gap: 6 }}>
      <Ink size={12} weight="bold" color={c.textMuted} style={{ paddingHorizontal: 2 }}>
        Aperçu
      </Ink>
      <View
        accessible
        accessibilityLabel={`Aperçu de la notification : ${title}. ${body}`}
        style={{
          flexDirection: 'row',
          gap: 10,
          padding: 12,
          borderRadius: 20,
          backgroundColor: blancA(0.95),
          borderWidth: 1,
          borderColor: '#FFFFFF',
          shadowColor: c.shadow,
          shadowOpacity: 0.1,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        }}
      >
        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: c.darkCard, alignItems: 'center', justifyContent: 'center' }}>
          <Glyph kind="sakura" size={22} color={c.goldLight} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ink size={12} weight="extraBold" color={c.textMuted} style={{ flex: 1 }}>
              YOROI
            </Ink>
            <Ink size={11} color={c.textMuted}>
              {when ?? 'maintenant'}
            </Ink>
          </View>
          <Ink size={14} weight="extraBold">{title}</Ink>
          <Ink size={13} color={c.textSecondary}>{body}</Ink>
        </View>
      </View>
    </View>
  );
}

// ============================================
// CARTE DE RAPPEL
// ============================================

export type NotifCardProps = {
  icon: IconName;
  title: string;
  /** resume concret quand c'est allume : « 7 h, en semaine » */
  summary: string;
  /** ce que fait le rappel, affiche quand il est eteint */
  pitch: string;
  on: boolean;
  onToggle: (v: boolean) => void;
  preview?: { title: string; body: string; when?: string };
  test?: { label: string; run: () => void };
  children?: React.ReactNode;
  index?: number;
};

export function NotifCard({ icon, title, summary, pitch, on, onToggle, preview, test, children, index = 0 }: NotifCardProps) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);
  const hasBody = !!children || !!preview || !!test;
  const expanded = on && open && hasBody;

  return (
    <Animated.View
      style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: expanded ? c.accent : c.border, overflow: 'hidden' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14, paddingRight: 12, paddingVertical: 12 }}>
        <Pressable
          onPress={() => {
            if (!on || !hasBody) return;
            hap();
            setOpen((v) => !v);
          }}
          disabled={!on || !hasBody}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${title}. ${on ? summary : 'Éteint'}${on && hasBody ? '. Régler' : ''}`}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}
        >
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: on ? c.accentTint : c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={21} color={on ? c.accent : c.textSecondary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={16} weight="extraBold">{title}</Ink>
            {on ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ink size={13} weight="bold" color={c.accent} style={{ flexShrink: 1 }}>
                  {summary}
                </Ink>
                {hasBody ? (
                  <View style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}>
                    <Icon name="chevron" size={13} color={c.accent} stroke={2.8} />
                  </View>
                ) : null}
              </View>
            ) : (
              <Ink size={13} color={c.textMuted}>{pitch}</Ink>
            )}
          </View>
        </Pressable>
        <Switch
          value={on}
          onValueChange={(v) => {
            hap();
            if (v) setOpen(true);
            onToggle(v);
          }}
          trackColor={{ false: SWITCH_OFF, true: c.accent }}
        thumbColor="#FFFFFF"
          {...({ activeThumbColor: '#FFFFFF' } as object)}
          ios_backgroundColor={SWITCH_OFF}
          accessibilityLabel={title}
        />
      </View>
      {expanded ? (
        <Animated.View entering={FadeIn.duration(220)} style={{ borderTopWidth: 1, borderColor: c.divider, padding: 14, gap: 14, backgroundColor: '#FAF9F6' }}>
          {children}
          {preview ? <NotifPreview title={preview.title} body={preview.body} when={preview.when} /> : null}
          {test ? (
            <Pressable
              onPress={() => {
                hap();
                test.run();
              }}
              accessibilityRole="button"
              style={({ pressed }) => ({ minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: c.border, backgroundColor: pressed ? c.fillSoft : c.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 })}
            >
              <Icon name="bell" size={17} color={c.accent} />
              <Ink size={14} weight="extraBold" color={c.accent}>{test.label}</Ink>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** Bouton rond « reglages » (roue dentee dessinee) pour l'en-tete. */
export function GearButton({ onPress, label }: { onPress: () => void; label: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        hap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: pressed ? P.white : blancA(0.86),
        borderWidth: 1,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: c.ink,
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
        transform: [{ scale: pressed ? 0.96 : 1 }],
      })}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" stroke={c.ink} strokeWidth={2.2} />
        <Path
          d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
          stroke={c.ink}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}
