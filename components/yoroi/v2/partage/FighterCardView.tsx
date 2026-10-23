/**
 * Carte de combattant (refonte v2) : guerrier du rang, nom, discipline, chiffres cles,
 * progression vers le rang suivant en plaques kozane. Format 4:5 pour les publications.
 */
import React, { forwardRef } from 'react';
import { Image, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { RANKS } from '@/lib/v2/armure';
import { rangNom } from '@/lib/v2/dojo/univers';
import type { CardIdentity } from '@/lib/v2/partage/identity';
import { CardFoot, CardFrame, CardTop, Ground, Mini, Panel, PlateRow, RankTag, Stamp, figureFor, paletteOf } from './cardKit';
import type { CardVariant } from './cardKit';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

export type FighterData = {
  name: string;
  weight: number;
  height: number;
  totalTrainings: number;
  totalMinutes: number;
  discipline: string;
  disciplineId?: string;
  joinDate: string;
  weightLost: number;
  goals?: { done: number; target: number; percent: number } | null;
};

export const FighterCardView = forwardRef<View, { data: FighterData; id: CardIdentity; variant: CardVariant; photo?: string | null; width: number }>(
  ({ data, id, variant, photo, width }, ref) => {
    const height = Math.round(width * 1.25);
    const p = paletteOf(variant);
    const pad = Math.round(width * 0.055);
    const isPhoto = variant === 'photo' && !!photo;
    const next = RANKS[id.rankIndex + 1];
    const figW = width * 0.46;
    const hours = Math.round(data.totalMinutes / 60);
    return (
      <CardFrame ref={ref} variant={variant} width={width} height={height} photo={photo}>
        <View style={{ flex: 1, paddingTop: pad, paddingBottom: pad * 0.8, paddingLeft: pad + 4, paddingRight: pad, gap: 8 }}>
          <CardTop p={p} label={traduire("Carte de combattant")} />
          <View style={{ flex: 1, minHeight: 0, overflow: 'hidden', justifyContent: 'flex-end' }}>
            {!isPhoto ? (
              <View pointerEvents="none" style={{ position: 'absolute', right: -pad * 0.4, top: 0, bottom: 0, width: figW, alignItems: 'center', justifyContent: 'flex-end' }}>
                <Image source={figureFor({ personnage: id.personnage, rankIndex: id.rankIndex, genre: id.genre })} style={{ width: figW, flex: 1 }} resizeMode="contain" />
                <View style={{ marginTop: -8 }}><Ground width={figW * 0.8} color={variant === 'papier' ? '#D9D5CB' : 'rgba(255,255,255,0.18)'} /></View>
              </View>
            ) : null}
            <View style={{ maxWidth: isPhoto ? '100%' : width * 0.54, gap: 6 }}>
              <Ink size={Math.round(width * 0.09)} weight="black" tight color={p.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{data.name}</Ink>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <RankTag p={p} kanji={id.rankKanji} name={id.rankName} />
                {data.weightLost > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Stamp p={p} size={22} />
                    <Ink size={12} weight="extraBold" color={p.ink} numberOfLines={1}>{traduire("{0} kg en moins", String(data.weightLost).replace('.', DECIMAL))}</Ink>
                  </View>
                ) : null}
              </View>
              <Ink size={17} weight="black" color={p.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{data.discipline}</Ink>
            </View>
          </View>

          <View style={{ gap: 4 }}>
            <PlateRow p={p} progress={id.rankProgress} count={10} w={Math.min(24, Math.floor((width - 70) / 10) - 2)} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Ink size={11} weight="bold" color={p.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>{next ? `En route vers ${rangNom(next.index)}` : traduire('Rang suprême atteint')}</Ink>
              <Ink size={11} weight="bold" color={p.muted} numberOfLines={1}>{traduire("Depuis {0}", data.joinDate)}</Ink>
            </View>
          </View>

          <Panel p={p} style={{ gap: 8, paddingVertical: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Mini p={p} onPanel value={data.weight > 0 ? `${String(data.weight).replace('.', DECIMAL)} kg` : traduire('À peser')} label="Poids" />
              <Mini p={p} onPanel value={data.height > 0 ? `${data.height} cm` : traduire('À saisir')} label="Taille" />
              <Mini p={p} onPanel value={`${id.weekStreak}`} label={traduire("Semaines réussies")} accent={p.accent} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Mini p={p} onPanel value={`${data.totalTrainings}`} label={traduire("Séances")} />
              <Mini p={p} onPanel value={`${hours} h`} label={traduire("D’entraînement")} />
              <Mini p={p} onPanel value={`${id.sealsCount}`} label="Sceaux" accent={p.gold === '#A8832F' ? '#A8832F' : undefined} />
            </View>
            {data.goals && data.goals.target > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ink size={10} weight="bold" color={p.panelInk2} numberOfLines={1}>{traduire("Objectifs de la semaine")}</Ink>
                <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(139,141,150,0.25)', overflow: 'hidden' }}>
                  <View style={{ width: `${Math.min(100, data.goals.percent)}%`, height: 6, backgroundColor: p.accent }} />
                </View>
                <Ink size={10} weight="black" color={p.panelInk} numberOfLines={1}>{traduire("{0} sur {1}", data.goals.done, data.goals.target)}</Ink>
              </View>
            ) : null}
          </Panel>

          <CardFoot p={p} compact />
        </View>
      </CardFrame>
    );
  },
);
FighterCardView.displayName = 'FighterCardView';
