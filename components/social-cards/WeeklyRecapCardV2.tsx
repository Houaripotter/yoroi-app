/**
 * Carte « Ma semaine » (refonte v2) : une plaque kozane par jour, lacee de soie doree
 * quand tu t'es entraine, gros chiffre des jours actifs, guerrier du rang.
 */
import React, { forwardRef } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { WeekStats } from '@/lib/social-cards/useWeekStats';
import { useCardIdentity } from '@/lib/v2/partage/identity';
import { StoryCard } from '@/components/yoroi/v2/partage/StoryCard';
import { Mini, Panel, Plate, cardWidthFor, figureFor, toVariant } from '@/components/yoroi/v2/partage/cardKit';
import { libelleObjectifSeances, objectifTenu } from '@/lib/social-cards/compteurSeances';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

export interface WeeklyRecapCardV2Props {
  stats: WeekStats;
  format: 'stories' | 'square';
  backgroundImage?: string;
  backgroundType?: 'photo' | 'black' | 'white';
  username?: string;
  weeklyGoal?: number;
  isLandscape?: boolean;
  userAvatar?: any;
  profilePhoto?: string | null;
  rank?: string;
  userLevel?: number;
  width?: number;
}

const MONTHS = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];

export const WeeklyRecapCardV2 = React.memo(forwardRef<View, WeeklyRecapCardV2Props>(
  ({ stats, format, backgroundImage, backgroundType = 'black', username, weeklyGoal, width: widthProp }, ref) => {
    const { width: sw } = useWindowDimensions();
    const id = useCardIdentity();
    const width = widthProp ?? cardWidthFor(sw);
    const variant = toVariant(backgroundType, !!backgroundImage);
    // 0 : pas d'objectif choisi, la carte ne montre pas d'objectif
    const goal = weeklyGoal && weeklyGoal > 0 ? weeklyGoal : id.weeklyGoal || 0;
    // 18 octobre 2026 : l'objectif se compte en seances, comme l'accueil et l'onglet Seances (avant : en jours actifs)
    const held = objectifTenu(stats.totalSessions, goal);
    const start = new Date(stats.weekStart);
    const end = new Date(stats.weekEnd);
    // 18 octobre (audit) : semaine a cheval sur deux mois, « du 29 sept. au 5 oct. » (avant : « du 29 au 5 oct. »)
    const range = start.getMonth() === end.getMonth() ? traduire("{0} au {1} {2}", start.getDate(), end.getDate(), MONTHS[end.getMonth()] ?? '') : traduire("{0} {1} au {2} {3}", start.getDate(), MONTHS[start.getMonth()] ?? '', end.getDate(), MONTHS[end.getMonth()] ?? '');
    const plateW = Math.floor((width - 80) / 7) - 4;
    const w = stats.evolution?.weight;
    return (
      <StoryCard
        ref={ref}
        variant={variant}
        width={width}
        square={format === 'square'}
        photo={backgroundImage}
        label={traduire("Semaine {0}", stats.weekNumber)}
        kicker={traduire("Ma semaine, du {0}", range)}
        name={username || id.name || undefined}
        big={stats.activeDays}
        bigUnit="/ 7"
        caption={traduirePluriel(stats.totalSessions, stats.totalSessions > 1, "{0} séance cette semaine", "{0} séances cette semaine", stats.totalSessions)}
        subCaption={held ? traduire('Semaine réussie, la série grandit') : libelleObjectifSeances(goal)}
        figure={figureFor({ personnage: id.personnage, rankIndex: id.rankIndex, genre: id.genre })}
        rankKanji={id.rankKanji}
        rankName={id.rankName}
        stamp={held ? 'record' : null}
        progress={(p) => (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {stats.calendar.map((d, i) => (
              <View key={i} style={{ alignItems: 'center', gap: 4 }}>
                <Plate p={p} on={d.isActive} w={plateW} />
                <Ink size={10} weight={d.isToday ? 'black' : 'bold'} color={d.isToday ? p.accent : p.muted}>{d.dayName}</Ink>
              </View>
            ))}
          </View>
        )}
        panel={(p) => (
          <Panel p={p} style={{ flexDirection: 'row', gap: 10 }}>
            <Mini p={p} onPanel value={`${id.weekStreak}`} label={traduire("Semaines réussies")} accent={p.accent} />
            <Mini p={p} onPanel value={stats.bestDay?.dayName ?? traduire('À venir')} label={traduire("Meilleur jour")} />
            <Mini p={p} onPanel value={w ? `${w.change > 0 ? '+' : ''}${w.change.toFixed(1).replace('.', DECIMAL)} kg` : `${Math.round(stats.percentage)} %`} label={w ? 'Poids' : traduire('Semaine remplie')} />
          </Panel>
        )}
        extra={stats.clubs.length > 0 ? (p) => (
          <View style={{ gap: 6 }}>
            {stats.clubs.slice(0, 3).map((c, i) => (
              <View key={`${c.clubName}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {c.clubLogo ? <Image source={c.clubLogo} style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: '#FFFFFF' }} resizeMode="contain" /> : <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: p.accent }} />}
                <Ink size={12} weight="bold" color={p.ink} numberOfLines={1} style={{ flex: 1 }}>{c.clubName}</Ink>
                <Ink size={12} weight="black" color={p.ink}>{c.count}</Ink>
              </View>
            ))}
          </View>
        ) : undefined}
      />
    );
  },
));
WeeklyRecapCardV2.displayName = 'WeeklyRecapCardV2';

export default WeeklyRecapCardV2;
