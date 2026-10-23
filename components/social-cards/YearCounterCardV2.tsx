/**
 * Carte « Mon année » (refonte v2) : seances de l'annee, guerrier du rang,
 * pastilles vers l'objectif annuel, series et clubs.
 * 18 octobre 2026 : on compte des seances, comme l'accueil et l'onglet Seances (avant : des jours compares a des seances visees).
 * L'objectif est celui de la semaine (le meme que l'accueil) fois 52.
 */
import React, { forwardRef } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { YearStats } from '@/lib/social-cards/useYearStats';
import { useCardIdentity } from '@/lib/v2/partage/identity';
import { StoryCard } from '@/components/yoroi/v2/partage/StoryCard';
import { Mini, Panel, PlateRow, cardWidthFor, figureFor, toVariant } from '@/components/yoroi/v2/partage/cardKit';
import { objectifTenu } from '@/lib/social-cards/compteurSeances';

export interface YearCounterCardV2Props {
  stats: YearStats;
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

export const YearCounterCardV2 = React.memo(forwardRef<View, YearCounterCardV2Props>(
  ({ stats, format, backgroundImage, backgroundType = 'black', username, weeklyGoal = 0, width: widthProp }, ref) => {
    const { width: sw } = useWindowDimensions();
    const id = useCardIdentity();
    const width = widthProp ?? cardWidthFor(sw);
    const variant = toVariant(backgroundType, !!backgroundImage);
    // 0 : pas d'objectif choisi, la carte montre seulement tes seances de l'annee
    const goal = weeklyGoal > 0 ? weeklyGoal * 52 : stats.yearlyGoal && stats.yearlyGoal > 0 ? stats.yearlyGoal : 0;
    const sessions = stats.totalSessions ?? stats.totalDays;
    const reached = objectifTenu(sessions, goal);
    const yearDays = stats.totalDaysInYear || 365;
    const clubs = (stats.activityBreakdown ?? []).slice(0, 3);
    return (
      <StoryCard
        ref={ref}
        variant={variant}
        width={width}
        square={format === 'square'}
        photo={backgroundImage}
        label={`Année ${stats.year}`}
        kicker="Mon année d'entraînement"
        name={username || id.name || undefined}
        big={sessions}
        bigUnit={sessions > 1 ? 'séances' : 'séance'}
        caption={goal > 0 ? `sur ${goal} visées` : `d’entraînement en ${stats.year}`}
        subCaption={goal <= 0 ? undefined : reached ? 'Objectif de l’année tenu' : `${Math.round(Math.min(100, (sessions / goal) * 100))} % du chemin`}
        figure={figureFor({ personnage: id.personnage, rankIndex: id.rankIndex, genre: id.genre })}
        rankKanji={id.rankKanji}
        rankName={id.rankName}
        stamp={reached ? 'record' : null}
        progress={(p) => (
          <>
            <PlateRow p={p} progress={goal > 0 ? sessions / goal : stats.totalDays / yearDays} count={12} w={Math.floor((width - 70) / 12) - 2} />
            <Ink size={11} weight="bold" color={p.muted}>Ton objectif de l’année</Ink>
          </>
        )}
        panel={(p) => (
          <Panel p={p} style={{ flexDirection: 'row', gap: 10 }}>
            <Mini p={p} onPanel value={`${stats.bestStreak} j`} label="Meilleure série" />
            <Mini p={p} onPanel value={`${stats.currentStreak} j`} label="Série en cours" accent={p.accent} />
            <Mini p={p} onPanel value={stats.busiestMonth?.daysActive ? stats.busiestMonth.month : 'À venir'} label="Mois le plus fort" />
          </Panel>
        )}
        extra={clubs.length > 0 ? (p) => (
          <View style={{ gap: 6 }}>
            {clubs.map((c, i) => (
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
YearCounterCardV2.displayName = 'YearCounterCardV2';

export default YearCounterCardV2;
