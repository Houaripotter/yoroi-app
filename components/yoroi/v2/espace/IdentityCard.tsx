/**
 * Carte d'identite du guerrier : sa scene, son personnage, son prenom, ses sports et son rang.
 * Vague 45 : nom du rang selon l'univers (rangNom) ; « Sans personnage » : la scene seule, initiales sans photo.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { Profile } from '@/lib/database';
import type { ArmureState } from '@/lib/v2/armure';
import type { Espace } from '@/lib/v2/espace';
import { getSportName } from '@/lib/sports';
import { personnageImage } from './assets';
import { imageDeTaScene } from './apercuScene';
import { Icon, Plaque } from './ui';
import { P } from '@/components/yoroi/livePalette';
import { RondInitiales } from './RondInitiales';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { rangNom } from '@/lib/v2/dojo/univers';
import { universDe } from '@/lib/v2/dojo/dojoAffichage';
import { BusteRond } from '@/components/yoroi/v2/espace/BusteRond';

type Props = {
  profile: Profile | null;
  armure: ArmureState | null;
  espace: Espace;
  onPress?: () => void;
  height?: number;
};

function shortSport(id: string): string {
  const n = getSportName(id);
  return n.length > 14 ? n.split(' ')[0] : n;
}

export function IdentityCard({ profile, armure, espace, onPress, height = 300 }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  // 27 octobre 2026 : ta vraie scene, comme sur l'accueil
  const scene = { image: imageDeTaScene(espace.scene) };
  const rankIndex = armure?.rank.index ?? 0;
  const fallback = profile?.avatar_gender === 'femme' ? 'f' : 'h';
  const perso = personnageImage(espace.personnage, rankIndex, fallback);
  const name = profile?.name?.trim() || '';
  const sansPerso = !aUnPersonnage(espace.personnage);
  const showPhoto = (espace.identite === 'photo' || sansPerso) && !!profile?.profile_photo;

  const xp = armure?.xp ?? 0;
  const next = armure?.rank.nextMinXp ?? null;
  const min = armure?.rank.minXp ?? 0;
  const ratio = next ? Math.max(0, Math.min(1, (xp - min) / (next - min))) : 1;
  const filled = Math.round(ratio * 10);
  const sports = espace.sportsFavoris.slice(0, 3);

  return (
    <Pressable
      onPress={onPress ? () => { selectionAsync().catch(() => {}); onPress(); } : undefined}
      accessibilityRole="button"
      accessibilityLabel="Ton profil"
      style={({ pressed }) => ({ height, borderRadius: 26, overflow: 'hidden', backgroundColor: c.fillSoft, transform: [{ scale: pressed ? 0.99 : 1 }] })}
    >
      <Image source={scene.image} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
      {sansPerso ? null : <Image source={perso} style={{ position: 'absolute', right: -6, bottom: 54, width: 190, height: 250 }} resizeMode="contain" />}

      <View style={{ position: 'absolute', left: 14, top: 14, flexDirection: 'row', gap: 6 }}>
        <View style={{ backgroundColor: c.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Plaque on width={12} gold />
          <Ink size={13} weight="extraBold" color={c.background}>{rangNom(rankIndex, universDe(espace))}</Ink>
        </View>
      </View>

      <View style={{ position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: P.white, padding: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 54, height: 54, borderRadius: 27, overflow: 'hidden', backgroundColor: c.goldTint, borderWidth: 2, borderColor: c.gold, alignItems: 'center', justifyContent: 'center' }}>
            {showPhoto ? (
              <Image source={{ uri: profile!.profile_photo! }} style={{ width: '100%', height: '100%' }} />
            ) : sansPerso ? (
              <RondInitiales size={54} nom={name} />
            ) : (
              <BusteRond source={perso} />
            )}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={24} weight="black" tight numberOfLines={1}>{name || (sansPerso ? 'Ton prénom' : 'Ton guerrier')}</Ink>
            {sports.length ? (
              <Ink size={13} weight="bold" color={c.textSecondary} numberOfLines={1}>{sports.map(shortSport).join(', ')}</Ink>
            ) : (
              <Ink size={13} weight="bold" color={c.accent}>{name ? 'Choisis tes sports' : 'Donne-lui un prénom'}</Ink>
            )}
          </View>
          {onPress ? <Icon name="chevron" size={18} color={c.textMuted} /> : null}
        </View>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <View key={i} style={{ flex: 1, height: 8, borderRadius: 2, backgroundColor: i < filled ? c.ink : c.fillSubtle, borderBottomWidth: i < filled ? 2 : 0, borderColor: c.accent }} />
            ))}
          </View>
          <Ink size={12} weight="bold" color={c.textMuted}>
            {next ? `${xp} XP, encore ${next - xp} pour le rang suivant` : `${xp} XP, rang le plus haut atteint`}
          </Ink>
        </View>
      </View>
    </Pressable>
  );
}
