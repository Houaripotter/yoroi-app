/**
 * Hub de partage (refonte v2) : choisis la carte a partager. Chaque tuile montre un apercu
 * illustre de la carte (plaques, guerrier, gros chiffre).
 */
import React from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Image, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Enter, Glass, P, Press } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { Plate, figureFor, paletteOf } from '@/components/yoroi/v2/partage/cardKit';
import { useCardIdentity } from '@/lib/v2/partage/identity';
import { traduire } from '@/lib/i18n/tr';

const papier = paletteOf('papier');
const laque = paletteOf('laque');

type Tile = { id: string; title: string; text: string; route: string; dark?: boolean; visual: 'plates7' | 'month' | 'year' | 'session' | 'fighter' | 'wrapped' | 'duel' };

const TILES: Tile[] = [
  { id: 'session', title: traduire('Ma séance'), text: traduire('La dernière, en grand'), route: '/social-share/last-session', visual: 'session' },
  { id: 'week', title: traduire('Ma semaine'), text: traduire('Un rond par jour'), route: '/social-share/weekly-recap-v2', visual: 'plates7', dark: true },
  { id: 'month', title: traduire('Mon mois'), text: traduire('Tes jours en un regard'), route: '/social-share/monthly-recap-v2', visual: 'month', dark: true },
  { id: 'year', title: traduire('Mon année'), text: traduire('Ton compteur de jours'), route: '/social-share/year-counter-v2', visual: 'year' },
  { id: 'fighter', title: traduire('Carte de combattant'), text: traduire('Tes chiffres de combattant'), route: '/fighter-card', visual: 'fighter' },
  { id: 'wrapped', title: traduire('Bilan de l’année'), text: traduire('L’histoire de ton année'), route: '/wrapped', visual: 'wrapped', dark: true },
  { id: 'duel', title: traduire('Carte de duel'), text: traduire('Toi contre ton partenaire'), route: '/sparring-partners', visual: 'duel' },
];

export default function ShareHubScreen() {
  const { width } = useWindowDimensions();
  const id = useCardIdentity();
  const tileW = Math.floor((width - 44 - 12) / 2);
  const fig = figureFor({ personnage: id.personnage, rankIndex: id.rankIndex, genre: id.genre });

  const visual = (t: Tile) => {
    const p = t.dark ? laque : papier;
    switch (t.visual) {
      case 'plates7':
        return (
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {[1, 1, 0, 1, 1, 0, 0].map((on, i) => <Plate key={i} p={p} on={!!on} w={Math.floor((tileW - 44) / 7) - 2} />)}
          </View>
        );
      case 'month':
        return (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, width: tileW - 32 }}>
            {Array.from({ length: 21 }).map((_, i) => (
              <View key={i} style={{ width: Math.floor((tileW - 32 - 18) / 7), height: 14, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: [0, 2, 3, 6, 8, 9, 11, 13, 15, 16, 18, 20].includes(i) ? p.plate : 'transparent', borderWidth: [0, 2, 3, 6, 8, 9, 11, 13, 15, 16, 18, 20].includes(i) ? 0 : 1, borderStyle: 'dashed', borderColor: p.plateEmpty }} />
              </View>
            ))}
          </View>
        );
      case 'year':
        return (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, width: tileW - 40, justifyContent: 'center' }}>
            {Array.from({ length: 12 }).map((_, i) => <Plate key={i} p={p} on={i < 7} partial={i === 7} w={Math.floor((tileW - 40) / 6) - 4} />)}
          </View>
        );
      case 'wrapped':
        return <Glyph kind="laurier" size={60} color={p.gold} />;
      case 'duel':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image source={fig} style={{ width: tileW * 0.3, height: tileW * 0.42 }} resizeMode="contain" />
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={11} weight="black" color={P.onPrimary}>VS</Ink>
            </View>
            <Image source={fig} style={{ width: tileW * 0.3, height: tileW * 0.42, transform: [{ scaleX: -1 }], opacity: 0.55 }} resizeMode="contain" />
          </View>
        );
      default:
        return <Image source={fig} style={{ width: tileW * 0.6, height: tileW * 0.62 }} resizeMode="contain" />;
    }
  };

  return (
    <DetailScreen title={traduire("Partager")} subtitle={traduire("Des cartes faites pour tes stories")}>
      <Enter i={0}>
        <Press onPress={() => router.push('/mes-cartes' as any)} accessibilityRole="button" accessibilityLabel={traduire("Mes cartes")}>
        <View style={{ borderRadius: 26, overflow: 'hidden', height: 220 }}>
          <Image source={sceneMeta('dojo').image} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
          <Image source={fig} style={{ position: 'absolute', right: -6, bottom: 0, width: 170, height: 214 }} resizeMode="contain" />
          <View style={{ flex: 1, justifyContent: 'flex-end', padding: 14 }}>
            <Glass style={{ maxWidth: '64%', padding: 14, gap: 4 }}>
              <Ink size={20} weight="black" tight>{traduire("Mes cartes")}</Ink>
              <Ink size={13} weight="medium" color={P.ink2}>{traduire("Tes séances, tes pesées et tes semaines, prêtes à poster")}</Ink>
            </Glass>
          </View>
        </View>
        </Press>
      </Enter>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {TILES.map((t, i) => {
          const p = t.dark ? laque : papier;
          return (
            <Enter key={t.id} i={i + 1}>
              <Press onPress={() => router.push(t.route as any)} accessibilityRole="button" accessibilityLabel={traduire(t.title)}>
                <View style={{ width: tileW, height: tileW * 1.2, borderRadius: 22, overflow: 'hidden', backgroundColor: t.dark ? '#1D2029' : P.white, borderWidth: 1, borderColor: t.dark ? '#1D2029' : P.line2, padding: 14, justifyContent: 'space-between' }}>
                  <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: P.detail }} />
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{visual(t)}</View>
                  <View style={{ gap: 1 }}>
                    <Ink size={15} weight="black" tight color={p.ink} numberOfLines={2}>{traduire(t.title)}</Ink>
                    <Ink size={12} weight="medium" color={p.muted} numberOfLines={2}>{traduire(t.text)}</Ink>
                  </View>
                </View>
              </Press>
            </Enter>
          );
        })}
      </View>
    </DetailScreen>
  );
}
