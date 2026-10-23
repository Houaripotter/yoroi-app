/**
 * Bienvenue des anciens utilisateurs, montree une seule fois en plein ecran dans le Dojo :
 * YOROI a change, ton historique a ete converti avec les nouvelles regles, ton rang ne
 * descend pas. Puis ce que la reprise a recupere, le rang, les sceaux et le sport principal.
 * Uniquement des chiffres calcules par lib/v2/armure.ts.
 */
import React from 'react';
import { Image, Modal, Pressable, ScrollView, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { WelcomeSummary } from '@/lib/v2/armure';
import { CheckIcon, formatXp } from './parts';
import { beltFor } from '@/lib/v2/dojo/belts';
import { imageCoffre } from './OuvertureCoffre';

type Props = {
  visible: boolean;
  summary: WelcomeSummary | null;
  image: ImageSourcePropType;
  scene: ImageSourcePropType;
  onClose: () => void;
};

const plural = (n: number, one: string, many: string) => `${formatXp(n)} ${n > 1 ? many : one}`;

export function Bienvenue({ visible, summary, image, scene, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  if (!summary) return null;

  const rows: { key: string; label: string }[] = [];
  if (summary.seances > 0) rows.push({ key: 'seances', label: plural(summary.seances, 'séance', 'séances') });
  if (summary.pesees > 0) rows.push({ key: 'pesees', label: plural(summary.pesees, 'jour de pesée', 'jours de pesée') });
  if (summary.records > 0) rows.push({ key: 'records', label: plural(summary.records, 'record personnel', 'records personnels') });
  if (summary.semaines > 0) rows.push({ key: 'semaines', label: plural(summary.semaines, 'semaine réussie', 'semaines réussies') });
  if (summary.quetesXp > 0) rows.push({ key: 'quetes', label: `${formatXp(summary.quetesXp)} XP de tes quêtes et défis` });
  if (summary.badges > 0) rows.push({ key: 'badges', label: `${plural(summary.badges, 'ancien badge', 'anciens badges')}, ${formatXp(summary.badgesXp)} XP` });

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          <View style={{ height: 300 + insets.top, overflow: 'hidden' }}>
            <Image source={scene} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
            <LinearGradient colors={['rgba(242,241,236,0)', 'rgba(242,241,236,0)', c.background]} locations={[0, 0.6, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' }}>
              <Image source={image} style={{ width: 200, height: 260 }} resizeMode="contain" accessibilityLabel="Ton personnage" />
            </View>
          </View>

          <View style={{ paddingHorizontal: 22, gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Ink size={30} weight="black" tight accessibilityRole="header">YOROI a changé</Ink>
              <Ink size={15} color={c.textSecondary} style={{ lineHeight: 21 }}>Nouvelle app, nouveaux rangs, nouvelle façon de gagner de l’XP. Tout ton historique a été converti avec ces nouvelles règles.</Ink>
              <Ink size={15} color={c.textSecondary} style={{ lineHeight: 21 }}>Rien de ton travail n’est perdu, et ton rang ne descend jamais.</Ink>
              <Ink size={15} weight="bold" style={{ lineHeight: 21 }}>Tes défis et ton rang sont maintenant ici, dans le Dojo. L’accueil garde ton poids et tes séances.</Ink>
            </View>

            {rows.length ? (
              <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, gap: 12 }}>
                <Ink size={13} weight="extraBold" color={c.textMuted}>Repris pour toi</Ink>
                {rows.map((r) => (
                  <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <CheckIcon size={20} color={c.accent} />
                    <Ink size={15} weight="bold" style={{ flex: 1 }}>{r.label}</Ink>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: c.accentTint, borderRadius: 18, padding: 14, gap: 2 }}>
                <Ink size={12} weight="extraBold" color={c.accent}>Ton rang</Ink>
                <Ink size={19} weight="black" tight>{summary.rankTitle}</Ink>
                <Ink size={12} color={c.textSecondary}>{summary.rankKept ? `${formatXp(summary.xp)} XP, rang d’avant gardé` : `${formatXp(summary.xp)} XP`}</Ink>
              </View>
              <View style={{ flex: 1, backgroundColor: c.goldTint, borderRadius: 18, padding: 14, gap: 2 }}>
                <Ink size={12} weight="extraBold" color={c.goldDeep}>Tes sceaux</Ink>
                <Ink size={19} weight="black" tight>{String(summary.seals)}</Ink>
                <Ink size={12} color={c.textSecondary}>{summary.seals > 1 ? 'déjà mérités' : 'déjà mérité'}</Ink>
              </View>
            </View>

            {/* vague 47 : la nouveaute de chaque jour, pour que les anciens la decouvrent tout de suite */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.goldTint, borderRadius: 18, padding: 14 }}>
              <Image source={imageCoffre(false, false)} style={{ width: 64, height: 64 }} resizeMode="contain" />
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={12} weight="extraBold" color={c.goldDeep}>Nouveau, chaque jour</Ink>
                <Ink size={16} weight="black">Un coffre à ouvrir</Ink>
                <Ink size={13} color={c.textSecondary}>Une séance, une pesée ou un verre d’eau, et il s’ouvre. Plus ta série dure, plus il rapporte.</Ink>
              </View>
            </View>

            {summary.mainSport ? (
              <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 14, gap: 2 }}>
                <Ink size={12} weight="extraBold" color={c.textMuted}>Ton sport principal</Ink>
                <Ink size={17} weight="black">{`${summary.mainSport.name}, niveau ${beltFor(summary.mainSport.count).belt.name}`}</Ink>
                <Ink size={13} color={c.textSecondary}>{plural(summary.mainSport.count, 'séance', 'séances')}</Ink>
              </View>
            ) : null}
          </View>
        </ScrollView>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 20, backgroundColor: c.background }}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Entrer dans le Dojo"
            style={({ pressed }) => ({ height: 56, borderRadius: 18, backgroundColor: pressed ? c.accentPressed : c.accent, alignItems: 'center', justifyContent: 'center' })}
          >
            <Ink size={16} weight="extraBold" color={c.onAccent}>Entrer dans le Dojo</Ink>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default Bienvenue;
