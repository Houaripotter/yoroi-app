/**
 * Carte de duel (refonte v2) : toi face a ton partenaire de sparring.
 * Format carre, bilan victoires, nuls, defaites en gros chiffres, dernieres seances en plaques kozane,
 * techniques favorites, ceintures, logo YOROI.
 */
import React from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getSportName } from '@/lib/sports';
import { useCardIdentity } from '@/lib/v2/partage/identity';
import { CardFoot, CardFrame, CardTop, Panel, Plate, Stamp, figureFor, paletteOf, toVariant } from '@/components/yoroi/v2/partage/cardKit';
import { traduire } from '@/lib/i18n/tr';

const BELT_COLORS: Record<string, string> = {
  blanche: '#FFFFFF', bleue: '#2C4A84', violette: '#6B3FA0', marron: '#7A4A22', noire: '#1D2029',
  grise: '#8B8D96', jaune: '#E3C47B', orange: '#D9822B', verte: '#6E8C3A', rouge: '#B0282E',
};

function beltColor(belt?: string): string | null {
  if (!belt) return null;
  return BELT_COLORS[belt.toLowerCase().trim()] ?? null;
}

export interface DuelCardProps {
  myName: string;
  myBelt?: string;
  opponentName: string;
  opponentBelt?: string;
  wins: number;
  losses: number;
  draws: number;
  totalRounds: number;
  topMethodGiven?: string;
  topMethodTaken?: string;
  lastSessions: ('win' | 'loss' | 'draw')[];
  backgroundType: 'dark' | 'light' | 'photo';
  backgroundImage?: string;
  sport?: string;
  width?: number;
}

export const DuelCard = React.memo(
  React.forwardRef<View, DuelCardProps>(
    ({ myName, myBelt, opponentName, opponentBelt, wins, losses, draws, totalRounds, topMethodGiven, topMethodTaken, lastSessions, backgroundType, backgroundImage, sport, width: widthProp }, ref) => {
      const { width: sw } = useWindowDimensions();
      const id = useCardIdentity();
      const width = widthProp ?? Math.min(sw - 40, 375);
      const variant = toVariant(backgroundType, !!backgroundImage);
      const p = paletteOf(variant);
      const total = wins + losses + draws;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
      const last8 = lastSessions.slice(0, 8);
      const pad = Math.round(width * 0.055);
      const sportLabel = sport ? (getSportName(sport) ?? sport) : 'Sparring';
      const figure = figureFor({ personnage: id.personnage, rankIndex: id.rankIndex, genre: id.genre, sport });
      const ahead = wins > losses;

      const side = (name: string, belt: string | undefined, align: 'flex-start' | 'flex-end') => {
        const bc = beltColor(belt);
        return (
          <View style={{ flex: 1, alignItems: align, gap: 4 }}>
            <Ink size={17} weight="black" tight color={p.ink} numberOfLines={1} style={{ textAlign: align === 'flex-end' ? 'right' : 'left' }}>{name}</Ink>
            {bc ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 34, height: 8, borderRadius: 2, backgroundColor: bc, borderWidth: bc === '#FFFFFF' ? 1 : 0, borderColor: p.line }}>
                  <View style={{ position: 'absolute', right: 5, top: 0, bottom: 0, width: 7, backgroundColor: bc === '#1D2029' ? p.accent : '#1D2029' }} />
                </View>
                <Ink size={10} weight="bold" color={p.muted}>{traduire("Ceinture {0}", belt)}</Ink>
              </View>
            ) : null}
          </View>
        );
      };

      return (
        <CardFrame ref={ref} variant={variant} width={width} height={width} photo={backgroundImage} radius={26}>
          <View style={{ flex: 1, paddingTop: pad, paddingBottom: pad * 0.8, paddingLeft: pad + 4, paddingRight: pad, gap: 10 }}>
            <CardTop p={p} label={sportLabel} size={0.9} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {side(myName || id.name || 'Moi', myBelt, 'flex-start')}
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={12} weight="black" color="#FFFFFF">VS</Ink>
              </View>
              {side(opponentName, opponentBelt, 'flex-end')}
            </View>

            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
                <Count value={wins} label={traduire("Victoires")} color={p.accent} muted={p.muted} />
                <Count value={draws} label={traduire("Nuls")} color={p.ink2} muted={p.muted} />
                <Count value={losses} label={traduire("Défaites")} color={p.ink} muted={p.muted} />
              </View>
              {variant !== 'photo' ? <Image source={figure} style={{ width: width * 0.26, height: width * 0.32 }} resizeMode="contain" /> : null}
              {ahead && total >= 3 ? <View style={{ position: 'absolute', right: width * 0.2, top: -4 }}><Stamp p={p} size={40} /></View> : null}
            </View>

            {last8.length > 0 ? (
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {last8.map((r, i) => (
                    r === 'win' ? <Plate key={i} p={p} on w={20} /> : r === 'draw' ? <Plate key={i} p={p} on={false} partial w={20} /> : <Plate key={i} p={p} on={false} w={20} />
                  ))}
                </View>
                <Ink size={10} weight="bold" color={p.muted}>{traduire("Dernières séances, de la plus récente à la plus ancienne")}</Ink>
              </View>
            ) : null}

            <Panel p={p} style={{ flexDirection: 'row', gap: 10, paddingVertical: 9 }}>
              <View style={{ flex: 1 }}>
                <Ink size={18} weight="black" color={p.panelInk}>{`${winRate} %`}</Ink>
                <Ink size={10} weight="bold" color={p.panelInk2}>{traduire("de victoires sur {0} rounds", totalRounds)}</Ink>
              </View>
              {topMethodGiven || topMethodTaken ? (
                <View style={{ flex: 1.3, gap: 2 }}>
                  {topMethodGiven ? <Ink size={11} weight="extraBold" color={p.panelInk} numberOfLines={1}>{`Arme : ${topMethodGiven}`}</Ink> : null}
                  {topMethodTaken ? <Ink size={11} weight="bold" color={p.panelInk2} numberOfLines={1}>{traduire("À surveiller : {0}", topMethodTaken)}</Ink> : null}
                </View>
              ) : null}
            </Panel>

            <CardFoot p={p} compact />
          </View>
        </CardFrame>
      );
    }
  )
);
DuelCard.displayName = 'DuelCard';

function Count({ value, label, color, muted }: { value: number; label: string; color: string; muted: string }) {
  return (
    <View>
      <Ink size={44} weight="black" tight color={color} style={{ lineHeight: 46 }}>{value}</Ink>
      <Ink size={10} weight="bold" color={muted}>{label}</Ink>
    </View>
  );
}

export default DuelCard;
