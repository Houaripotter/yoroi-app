/**
 * Prochain entrainement prevu (planning), en consultation : un appui ouvre le planning.
 * Le lancement d'un creneau passe par le bouton + (zones d'action, vague 13) ; onStart reste optionnel.
 * Sans creneau : invitation a poser ta semaine type.
 * (vague 26) Un lien « Calendrier » ouvre le planning sur le mois, avec ou sans creneau.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { WeeklyPlan } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { formatDuration } from '@/lib/v2/trainingWeek';
import { PLAN_DAYS } from '@/lib/v2/seances/sessionData';
import { SportThumb } from './SessionRow';
import { Icon } from './Icon';
import { tap } from './ui';
import { P } from '@/components/yoroi/livePalette';
import { ombreBouton } from '@/components/yoroi/v2/accueil/kit';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { useTeinte } from './kitA';

export type NextSlot = { slot: WeeklyPlan; dayOffset: number };

/** Prochain creneau de travail a partir de maintenant (le creneau du jour reste propose tant qu'aucune seance n'est faite) */
export function findNextSlot(plan: WeeklyPlan[], doneToday: boolean): NextSlot | null {
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7;
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const work = plan.filter((p) => !p.is_rest_day);
  for (let k = 0; k < 7; k++) {
    const day = (todayIdx + k) % 7;
    const cands = work
      .filter((p) => p.day_of_week === day)
      .filter((p) => k > 0 || !doneToday || (p.time != null && p.time >= hhmm))
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
    if (cands.length) return { slot: cands[0], dayOffset: k };
  }
  return null;
}

function whenText(n: NextSlot): string {
  const day = n.dayOffset === 0 ? traduire('Aujourd’hui') : n.dayOffset === 1 ? traduire('Demain') : PLAN_DAYS[n.slot.day_of_week].charAt(0).toUpperCase() + PLAN_DAYS[n.slot.day_of_week].slice(1);
  return n.slot.time ? traduire("{0} à {1}", day, n.slot.time.slice(0, 5).replace(':', ' h ')) : day;
}

export function NextUp({
  next,
  femme,
  validated,
  slotsCount,
  onStart,
  onPlanning,
  onCreate,
  onCalendar,
}: {
  next: NextSlot | null;
  femme: boolean;
  validated: number;
  slotsCount: number;
  onStart?: (n: NextSlot) => void;
  onPlanning: () => void;
  onCreate: () => void;
  onCalendar?: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const lilas = useTeinte('lilas');

  const calendarLink = onCalendar ? (
    <Pressable
      onPress={() => { tap(); onCalendar(); }}
      accessibilityRole="link"
      accessibilityLabel={traduire("Ouvrir ton calendrier du mois")}
      hitSlop={6}
      style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 14, backgroundColor: pressed ? c.fillSubtle : c.fillSoft, alignSelf: 'flex-start' })}
    >
      <Icon name="calendar" size={17} color={c.accentText} />
      <Ink size={14} weight="extraBold" color={c.accentText}>{traduire("Calendrier")}</Ink>
    </Pressable>
  ) : null;

  if (slotsCount === 0 || !next) {
    const invite = (
      <Pressable
        onPress={() => { tap(); slotsCount === 0 ? onCreate() : onPlanning(); }}
        accessibilityRole="button"
        accessibilityLabel={slotsCount === 0 ? traduire('Créer ta semaine type') : traduire('Ouvrir le planning')}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22, backgroundColor: pressed ? P.bande : P.white, ...ombreBouton })}
      >
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="calendar" size={18} color={c.accentText} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="extraBold">{slotsCount === 0 ? traduire('Pose ta semaine type') : traduire('Rien de prévu cette semaine')}</Ink>
          <Ink size={13} color={c.textSecondary}>
            {slotsCount === 0 ? traduire('Lundi JJB à 19 h, jeudi muscu : ton prochain entraînement s’affiche ici.') : traduire('Ouvre ton planning pour ajouter un créneau.')}
          </Ink>
        </View>
        <Icon name="chevron" size={18} color={c.textMuted} />
      </Pressable>
    );
    if (!calendarLink) return invite;
    return (
      <View style={{ gap: 8 }}>
        {invite}
        {calendarLink}
      </View>
    );
  }

  const s = next.slot;
  const title = sansTiret(s.label || getSportName(s.sport));
  const sub = sansTiret([s.duration_minutes ? formatDuration(s.duration_minutes) : '', s.club_name].filter(Boolean).join(', '));

  return (
    <View style={{ borderRadius: 24, backgroundColor: P.white, padding: 12, gap: 12, shadowColor: '#1D2033', shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}>
      <Pressable onPress={() => { tap(); onPlanning(); }} accessibilityRole="button" accessibilityLabel={traduire("Prochain entraînement, {0}, {1}. Ouvrir le planning", title, whenText(next))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <SportThumb sport={s.sport} femme={femme} size={56} />
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={11} weight="extraBold" color={lilas.texte} style={{ letterSpacing: 1.2 }}>{traduire("Prochain entraînement").toLocaleUpperCase()}</Ink>
          <Ink size={15.5} weight="black" tight numberOfLines={2}>{title}</Ink>
          <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={2}>{[whenText(next), sub].filter(Boolean).join(', ')}</Ink>
        </View>
        <Icon name="chevron" size={18} color={c.textMuted} />
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {onStart ? (
          <BoutonPrincipal
            onPress={() => { tap(); onStart(next); }}
            haptique="none"
            accessibilityLabel={traduire("Commencer {0}", title)}
            label={traduire("Lancer ce créneau")}
            hauteur={48}
            rayon={15}
            tailleTexte={15}
            lignes={1}
            compact
            style={{ flex: 1 }}
            icone={(col) => <Icon name="play" size={16} color={col} fill={col} />}
          />
        ) : calendarLink ? (
          <View style={{ flex: 1 }}>{calendarLink}</View>
        ) : null}
        {/* 28 octobre 2026 (maquette A de l'onglet Seances) : sans bouton a gauche, les creneaux valides a gauche et le lien Planning a droite */}
        {!onStart && !calendarLink ? (
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 10, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider }}>
            <Ink size={12.5} weight="bold" color={c.textSecondary} style={{ flexShrink: 1 }}>
              {`${traduirePluriel(slotsCount, slotsCount > 1, "{0} sur {1} créneau", "{0} sur {1} créneaux", validated, slotsCount)} ${traduirePluriel(validated, validated > 1, "validé cette semaine", "validés cette semaine")}`}
            </Ink>
            <Pressable onPress={() => { tap(); onPlanning(); }} accessibilityRole="link" hitSlop={8} style={{ minHeight: 36, justifyContent: 'center' }}>
              <Ink size={13} weight="extraBold" color={c.accentText}>{traduire("Planning")}</Ink>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>
            <Ink size={12} weight="bold" color={c.textMuted} style={{ textAlign: 'right' }}>{traduirePluriel(slotsCount, slotsCount > 1, "{0} sur {1} créneau", "{0} sur {1} créneaux", validated, slotsCount)}</Ink>
            <Ink size={12} weight="bold" color={c.textMuted} style={{ textAlign: 'right' }}>{traduirePluriel(validated, validated > 1, "validé cette semaine", "validés cette semaine")}</Ink>
          </View>
        )}
      </View>
    </View>
  );
}
