/**
 * Carte « Mon mois » (refonte v2) : calendrier du mois en petites plaques, gros chiffre
 * des jours actifs, meilleure semaine, clubs, guerrier du rang.
 */
import React, { forwardRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { MonthStats } from '@/lib/social-cards/useMonthStats';
import { useCardIdentity } from '@/lib/v2/partage/identity';
import { StoryCard } from '@/components/yoroi/v2/partage/StoryCard';
import { Mini, Panel, cardWidthFor, figureFor, toVariant } from '@/components/yoroi/v2/partage/cardKit';

export interface MonthlyRecapCardV2Props {
  stats: MonthStats;
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

export const MonthlyRecapCardV2 = React.memo(forwardRef<View, MonthlyRecapCardV2Props>(
  ({ stats, format, backgroundImage, backgroundType = 'black', username, width: widthProp }, ref) => {
    const { width: sw } = useWindowDimensions();
    const id = useCardIdentity();
    const width = widthProp ?? cardWidthFor(sw);
    const variant = toVariant(backgroundType, !!backgroundImage);
    // Lundi en premier : decalage du premier jour
    const first = stats.calendar[0];
    const offset = first ? (first.dayOfWeek + 6) % 7 : 0;
    const cells: ({ day: number; isActive: boolean; isToday: boolean } | null)[] = [
      ...Array.from({ length: offset }).map(() => null),
      ...stats.calendar.map((d) => ({ day: d.day, isActive: d.isActive, isToday: d.isToday })),
    ];
    const cell = Math.floor((width - 80) / 7) - 4;
    const w = stats.evolution?.weight;
    const topClub = (stats.clubTrainings ?? [])[0];
    return (
      <StoryCard
        ref={ref}
        variant={variant}
        width={width}
        square={format === 'square'}
        photo={backgroundImage}
        label={`${stats.monthName} ${stats.year}`}
        kicker={`Mon mois de ${stats.monthName.toLowerCase()}`}
        name={username || id.name || undefined}
        big={stats.activeDays}
        bigUnit="jours"
        caption={`${stats.totalTrainings} séance${stats.totalTrainings > 1 ? 's' : ''} sur ${stats.totalDays} jours`}
        subCaption={stats.bestWeek?.daysActive ? `Meilleure semaine : ${stats.bestWeek.daysActive} jours` : undefined}
        figure={figureFor({ personnage: id.personnage, rankIndex: id.rankIndex, genre: id.genre })}
        rankKanji={id.rankKanji}
        rankName={id.rankName}
        stamp={stats.activeDays >= 12 ? 'record' : null}
        progress={(p) => (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {cells.map((c, i) => (
              // vague 47 : un rond par jour (fait = plein, a faire = pointilles), a la place des plaques
              <View key={i} style={{ width: cell, height: Math.round(cell * 0.7), alignItems: 'center', justifyContent: 'center' }}>
                {c ? (
                  <View style={{ width: Math.round(cell * 0.66), height: Math.round(cell * 0.66), borderRadius: 999, backgroundColor: c.isActive ? p.plate : 'transparent', borderWidth: c.isActive && !c.isToday ? 0 : 1.4, borderStyle: c.isActive || c.isToday ? 'solid' : 'dashed', borderColor: c.isToday ? p.accent : p.plateEmpty, alignItems: 'center', justifyContent: 'center' }}>
                    <Ink size={9} weight="bold" color={c.isActive ? (variant === 'laque' ? '#1D2029' : '#FFFFFF') : p.muted}>{c.day}</Ink>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}
        panel={(p) => (
          <Panel p={p} style={{ flexDirection: 'row', gap: 10 }}>
            <Mini p={p} onPanel value={`${Math.round(stats.percentage)} %`} label="Mois rempli" />
            <Mini p={p} onPanel value={`${id.weekStreak}`} label="Semaines réussies" accent={p.accent} />
            <Mini p={p} onPanel value={w ? `${w.change > 0 ? '+' : ''}${w.change.toFixed(1).replace('.', ',')} kg` : topClub ? `${topClub.count}` : `${stats.totalTrainings}`} label={w ? 'Poids' : topClub ? topClub.clubName : 'Séances'} />
          </Panel>
        )}
      />
    );
  },
));
MonthlyRecapCardV2.displayName = 'MonthlyRecapCardV2';

export default MonthlyRecapCardV2;
