/**
 * Onglet Seances (vague 40) : ton planning en trois portes (semaine type, calendrier, clubs)
 * et tes competitions a venir avec leur compte a rebours. Consultation seulement :
 * l'ajout d'une seance passe par le bouton +.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Competition } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { P } from '@/components/yoroi/livePalette';
import { IllusImage } from './Decor';
import type { Illus } from './Decor';
import { Icon } from './Icon';
import { tap } from './ui';

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function daysUntil(iso: string, today: string): number {
  const a = new Date(today + 'T12:00:00').getTime();
  const b = new Date(iso.slice(0, 10) + 'T12:00:00').getTime();
  return Math.round((b - a) / 86400000);
}

/** Les trois portes du planning, en tuiles cote a cote */
export function PortesPlanning({ slotsCount, clubsHint }: { slotsCount: number; clubsHint?: string }) {
  const router = useRouter();
  const items: { key: string; title: string; sub: string; illus: Illus; href: string }[] = [
    { key: 'semaine', title: 'Créneaux', sub: slotsCount > 0 ? `${slotsCount} créneau${slotsCount > 1 ? 'x' : ''}` : 'à poser', illus: { tampon: 'frein_regularite' }, href: '/slots' },
    { key: 'planning', title: 'Planning', sub: 'jour par jour', illus: { tampon: 'frein_programme' }, href: '/planning' },
    { key: 'clubs', title: 'Clubs', sub: clubsHint ?? 'tes salles', illus: { tampon: 'objectif_combat' }, href: '/planning?tab=clubs' },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map((it) => (
        <Pressable
          key={it.key}
          onPress={() => {
            tap();
            router.push(it.href as any);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${it.title}, ${it.sub}`}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 112,
            borderRadius: 20,
            paddingHorizontal: 10,
            paddingVertical: 12,
            alignItems: 'center',
            gap: 6,
            backgroundColor: pressed ? P.white : P.carte,
            borderWidth: 1,
            borderColor: P.line,
          })}
        >
          <IllusImage illus={it.illus} size={40} rotate={-5} />
          <Ink size={14} weight="extraBold" numberOfLines={1} style={{ textAlign: 'center' }}>
            {it.title}
          </Ink>
          <Ink size={12} color={P.muted} numberOfLines={1} style={{ textAlign: 'center' }}>
            {it.sub}
          </Ink>
        </Pressable>
      ))}
    </View>
  );
}

/** Tes competitions a venir (trois au plus), sinon une invitation douce */
export function CompetitionsAVenir({ competitions, today }: { competitions: Competition[]; today: string }) {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const next = competitions
    .filter((x) => x.date.slice(0, 10) >= today && x.statut !== 'termine')
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(0, 3);

  if (next.length === 0) {
    return (
      <Pressable
        onPress={() => {
          tap();
          router.push('/planning?tab=competitions' as any);
        }}
        accessibilityRole="button"
        accessibilityLabel="Aucune compétition prévue, ouvrir tes compétitions"
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 22, backgroundColor: pressed ? P.white : P.carte, borderWidth: 1, borderStyle: 'dashed', borderColor: P.dashed })}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="extraBold">Aucune compétition prévue</Ink>
          <Ink size={13} color={c.textSecondary}>Ajoute ta prochaine échéance : son compte à rebours s’affichera ici.</Ink>
        </View>
        <Icon name="chevron" size={16} color={c.textMuted} />
      </Pressable>
    );
  }

  return (
    <View style={{ borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, paddingHorizontal: 14 }}>
      {next.map((cp, i) => {
        const d = daysUntil(cp.date, today);
        const dt = new Date(cp.date.slice(0, 10) + 'T12:00:00');
        const when = `${dt.getDate()} ${MOIS[dt.getMonth()]}`;
        const line = [getSportName(cp.sport), cp.lieu].filter(Boolean).join(', ');
        return (
          <Pressable
            key={cp.id ?? `${cp.nom}${cp.date}`}
            onPress={() => {
              tap();
              router.push((cp.id ? `/competition-detail?id=${cp.id}` : '/planning?tab=competitions') as any);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${cp.nom}, le ${when}, ${d === 0 ? 'aujourd’hui' : `dans ${d} jours`}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider }}
          >
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: i === 0 ? c.accent : P.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              {d === 0 ? (
                <Ink size={14} weight="black" color={i === 0 ? '#FFFFFF' : c.accent}>Jour J</Ink>
              ) : (
                <>
                  <Ink size={20} weight="black" tight color={i === 0 ? '#FFFFFF' : c.accent}>{String(d)}</Ink>
                  <Ink size={11} weight="bold" color={i === 0 ? 'rgba(255,255,255,0.85)' : c.accent} style={{ marginTop: -2 }}>{d > 1 ? 'jours' : 'jour'}</Ink>
                </>
              )}
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={15} weight="extraBold" numberOfLines={2}>{cp.nom}</Ink>
              <Ink size={12} color={c.textSecondary} numberOfLines={2}>{line ? `${when}, ${line}` : when}</Ink>
            </View>
            <Icon name="chevron" size={16} color={c.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );
}
