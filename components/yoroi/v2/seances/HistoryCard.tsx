/**
 * Seance dans l'historique de l'onglet : illustration du sport, titre, jour et heure,
 * points cles (duree, volume ou series, rounds, distance, frequence cardiaque moyenne si la montre l'a enregistree),
 * marque « montre » si importee, tampon rouge si record. Appui : detail de la seance.
 * 3 novembre 2026 (Houari) : le meme sticker que Ton historique et Ta semaine (la chaussure pour la course, le gi pour
 * le JJB), dans le meme carre pastel (stickerDuSport, teinte de la famille du sport), au lieu de l'illustration
 * de sportImage (drapeau a damier, poing bande).
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Training } from '@/lib/database';
import { DOW_SHORT, MONTHS_SHORT, dateOf, familyOf, sessionTitle } from '@/lib/v2/seances/sessionData';
import { isImported, keyFacts, sourceLabel } from '@/lib/v2/seances/weekCompare';
import type { KeyFact } from '@/lib/v2/seances/weekCompare';
import { stickerDuSport } from './MonthMarks';
import { CarreSticker } from './kitA';
import type { TeinteA } from './kitA';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { Hanko, tap } from './ui';
import { P } from '@/components/yoroi/livePalette';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire, LANG, jourMois } from '@/lib/i18n/tr';

/** La teinte du carre du sticker, par famille de sport (comme app/history.tsx et app/ta-semaine.tsx) */
function teinteDe(sport: string | undefined): TeinteA {
  const f = familyOf(sport);
  if (f === 'muscu') return 'bleu';
  if (f === 'combat_sol') return 'lilas';
  if (f === 'combat_pied') return 'peche';
  if (f === 'cardio') return 'menthe';
  return 'creme';
}

const FACT_ICON: Record<KeyFact['kind'], IconName> = {
  duree: 'clock',
  volume: 'dumbbell',
  series: 'list',
  rounds: 'glove',
  distance: 'map',
  fc: 'heart',
  calories: 'flame',
};

export function HistoryCard({ t, stamps = 0, showMonth }: { t: Training; /** garde pour les appels : le sticker ne depend plus du genre */ femme?: boolean; stamps?: number; showMonth?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const d = dateOf(t.date);
  const day = LANG !== 'fr' ? `${DOW_SHORT[d.getDay()]} ${showMonth ? jourMois(d) : d.getDate()}` : `${DOW_SHORT[d.getDay()]} ${d.getDate()}${showMonth ? ` ${MONTHS_SHORT[d.getMonth()]}` : ''}`;
  const time = t.start_time ? (LANG === 'fr' ? t.start_time.slice(0, 5).replace(':', ' h ') : t.start_time.slice(0, 5)) : '';
  const when = sansTiret([day, time ? traduire('à {0}', time) : '', t.club_name].filter(Boolean).join(', '));
  const facts = keyFacts(t, useUnitePoids());
  const watch = isImported(t);
  const title = sansTiret(sessionTitle(t));

  return (
    <Pressable
      onPress={() => {
        if (!t.id) return;
        tap();
        router.push({ pathname: '/workout-detail', params: { id: String(t.id) } } as any);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${when}${facts.length ? `, ${facts.map((f) => f.text).join(', ')}` : ''}${watch ? traduire(", importée depuis {0}", sourceLabel(t)) : ''}${stamps > 0 ? traduire(', record battu') : ''}`}
      style={({ pressed }) => ({ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 20, backgroundColor: pressed ? P.white : P.carte, borderWidth: 1, borderColor: c.divider })}
    >
      <CarreSticker nom={stickerDuSport(t.sport, !!t.is_outdoor)} teinte={teinteDe(t.sport)} taille={52} rayon={16} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ gap: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Ink size={15} weight="extraBold" numberOfLines={2} style={{ flex: 1 }}>{title}</Ink>
            {stamps > 0 ? <Hanko size={22} /> : null}
          </View>
          <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2}>{when}</Ink>
        </View>
        {facts.length > 0 || watch ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 }}>
            {facts.map((f) => (
              <View key={f.kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name={FACT_ICON[f.kind]} size={13} color={c.textMuted} strokeWidth={2.4} />
                <Ink size={13} weight="extraBold">{traduire(f.text)}</Ink>
              </View>
            ))}
            {watch ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: c.fillSubtle }}>
                <Icon name="watch" size={12} color={c.indigo} strokeWidth={2.4} />
                <Ink size={11} weight="extraBold" color={c.indigo}>{traduire('montre')}</Ink>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
