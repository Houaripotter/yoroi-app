/**
 * Liste datée des événements d'une mesure (chutes, alertes du cœur, ECG, humeur).
 * Ajout du 10 octobre 2026 : un événement se lit comme une ligne de journal, pas comme une courbe.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Press } from '@/components/yoroi/v2/accueil/kit';
import type { MetricDef } from '@/lib/v2/sante/metrics';
import type { HealthEvent } from '@/lib/v2/sante/data';
import { S } from './ui';
import { SanteIcon } from './SanteIcon';
import { traduire, LOCALE } from '@/lib/i18n/tr';

/** « 1 alerte », « 3 alertes », « 2 ECG » */
export function countLabel(n: number, unit: string): string {
  const v = Math.round(n);
  if (!unit) return String(v);
  return `${v} ${v > 1 ? unit : unit.replace(/s$/, '')}`;
}

function whenText(iso: string): { day: string; time: string } {
  // une date seule (compte du jour gardé sur le téléphone) n'a pas d'heure
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    const t = new Date(y, m - 1, d);
    return { day: t.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }), time: '' };
  }
  const t = new Date(iso);
  if (!Number.isFinite(t.getTime())) return { day: '', time: '' };
  const sameYear = t.getFullYear() === new Date().getFullYear();
  return {
    day: t.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', ...(sameYear ? {} : { year: 'numeric' }) }),
    time: t.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' }),
  };
}

/** Jour local AAAA-MM-JJ d'un événement */
export function eventDay(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const t = new Date(iso);
  if (!Number.isFinite(t.getTime())) return iso.slice(0, 10);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

const MOOD_COLORS = ['#C9C6BE', '#7B3B63', '#9A5B6E', '#B0898F', '#8B8D96', '#8FA36A', '#6E8C3A', '#4F6B28'];

export function EventList({ def, events, color, tint, emptyText }: { def: MetricDef; events: HealthEvent[]; color: string; tint: string; emptyText: string }) {
  const [all, setAll] = useState(false);
  if (events.length === 0) {
    return (
      <View style={{ minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 }}>
        <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: S.mossSoft, alignItems: 'center', justifyContent: 'center' }}>
          <SanteIcon name="check" size={22} color={S.mossText} width={2.6} />
        </View>
        <Ink size={14} weight="bold" color={S.ink2} style={{ textAlign: 'center', paddingHorizontal: 12 }}>
          {emptyText}
        </Ink>
      </View>
    );
  }
  const shown = all ? events : events.slice(0, 12);
  const isMood = def.key === 'humeur';
  return (
    <View style={{ gap: 0 }}>
      {shown.map((e, i) => {
        const w = whenText(e.date);
        const mood = isMood && e.value ? Math.max(1, Math.min(7, Math.round(e.value))) : 0;
        const dot = isMood ? MOOD_COLORS[mood] : color;
        return (
          <View
            key={`${e.date}-${i}`}
            accessible
            accessibilityLabel={`${w.day} ${w.time}, ${e.title}${e.detail ? `, ${e.detail}` : ''}`}
            style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: S.line2 }}
          >
            <View style={{ alignItems: 'center', width: 38 }}>
              <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: isMood ? '#F7F5F0' : tint, alignItems: 'center', justifyContent: 'center' }}>
                {isMood ? (
                  <Ink size={16} weight="black" color={dot}>
                    {String(mood)}
                  </Ink>
                ) : (
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dot }} />
                )}
              </View>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={15} weight="extraBold">
                {e.title}
              </Ink>
              <Ink size={12} weight="bold" color={S.ink2}>
                {[w.day, w.time].filter(Boolean).join(traduire(' à '))}
              </Ink>
              {e.detail ? (
                <Ink size={12} weight="medium" color={S.muted}>
                  {e.detail}
                </Ink>
              ) : null}
            </View>
          </View>
        );
      })}
      {events.length > shown.length || all ? (
        <Press onPress={() => setAll((v) => !v)} accessibilityRole="button" accessibilityLabel={all ? traduire('Voir moins') : traduire("Voir les {0} lignes", events.length)}>
          <View style={{ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: 1, borderTopColor: S.line2 }}>
            <Ink size={13} weight="extraBold" color={S.accent}>
              {all ? traduire('Voir moins') : traduire("Voir les {0} lignes", events.length)}
            </Ink>
            <SanteIcon name={all ? 'up' : 'down'} size={15} color={S.accent} />
          </View>
        </Press>
      ) : null}
    </View>
  );
}
