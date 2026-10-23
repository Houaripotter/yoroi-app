/**
 * Fiche d'un pack : ses 3 niveaux, la condition de chacun et ta progression.
 * Equiper si le pack est ouvert (Premium ou achat) ; sinon le bouton Premium.
 * Personnage du monde samourai : une grande illustration, le rang qui le debloque,
 * et Premium qui l'ouvre tout de suite.
 * 16 octobre 2026 (agent PACKS) : packs sport, legendes et Vie reelle ouverts avec Premium (isPackUnlocked), plus de
 * « bientot disponible » ; un pack Vie reelle montre une grande illustration homme ou femme, comme le monde samourai.
 */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BackHeader, Bar, CheckIcon, DOJO, LockIcon, tap } from '@/components/yoroi/v2/dojo/parts';
import { BreathingFigure } from '@/components/yoroi/v2/dojo/DojoHero';
import { usePremium } from '@/context/PremiumContext';
import { saveEspace } from '@/lib/v2/espace';
import { useArmure } from '@/lib/v2/dojo/useArmure';
import {
  PACKS_STORE_READY,
  getOwnedPacks,
  isPackUnlocked,
  levelCondition,
  mondeCondition,
  packDisplayName,
  packImage,
  unlockRankName,
  packById,
  packLevel,
  packSessions,
  parsePersonnage,
  personnageKey,
  memePersonnage,
} from '@/lib/v2/dojo/personnages';
import type { Gender, Level, PackDef } from '@/lib/v2/dojo/personnages';
import { RANKS } from '@/lib/v2/armure';
import { P, blancA } from '@/components/yoroi/livePalette';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';

export default function Pack() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { isPremium } = usePremium();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const pack = packById(String(id ?? '')) ?? packById('boxe')!;
  const { snap, espace } = useArmure();
  const current = parsePersonnage(espace.personnage);
  const [gender, setGender] = useState<Gender>(current.gender);
  const [owned, setOwned] = useState<string[]>([]);

  useEffect(() => {
    void getOwnedPacks().then(setOwned);
  }, []);

  const rankIndex = snap?.state.rank.index ?? 0;
  const monde = pack.kind === 'monde';
  const vie = pack.kind === 'vie';
  const has = isPackUnlocked(pack, owned, rankIndex, isPremium);
  const counts = snap?.state.sportCounts ?? {};
  const level = packLevel(pack, rankIndex, counts);
  const sessions = packSessions(pack, counts);
  const key = personnageKey(pack, gender);
  // 16 octobre 2026 : la teinte de peau ne change pas le personnage equipe (cle 'pompier_h.peau_foncee')
  const equipped = memePersonnage(espace.personnage, key);

  const progressFor = (l: Level): { value: number; label: string } => {
    if (l === 1) return { value: has ? 1 : 0, label: has ? 'à toi' : 'avec Premium' };
    if (pack.kind === 'legende') {
      const target = l === 2 ? 2 : 3;
      const reached = rankIndex >= target;
      // condition remplie mais pack pas encore a toi : le dire clairement, sans « atteint » a cote d'un cadenas
      const label = reached ? (has ? 'débloqué par ton rang' : 'débloqué par ton rang, disponible avec le pack') : `encore ${Math.max(0, RANKS[target].minXp - (snap?.state.xp ?? 0)).toLocaleString('fr-FR')} XP`;
      return { value: reached ? 1 : (snap?.state.xp ?? 0) / RANKS[target].minXp, label };
    }
    const target = l === 2 ? 25 : 100;
    const reached = sessions >= target;
    const label = reached ? (has ? 'débloqué par tes séances' : 'débloqué par tes séances, disponible avec le pack') : `${Math.min(sessions, target)} / ${target} séances`;
    return { value: Math.min(1, sessions / target), label };
  };

  const equip = () => {
    if (equipped) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    void saveEspace({ personnage: key });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 14 }} showsVerticalScrollIndicator={false}>
        <BackHeader
          title={monde || vie ? packDisplayName(pack, gender) : pack.name}
          subtitle={pack.kind === 'sport' ? 'Pack sport' : monde ? 'Monde samouraï' : vie ? `Pack ${pack.name}, vie réelle` : 'Légende'}
          right={
            pack.kind === 'sport' || monde || vie ? (
              <View style={{ flexDirection: 'row', backgroundColor: c.fillSubtle, borderRadius: 14, padding: 3 }}>
                {(['h', 'f'] as Gender[]).map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => {
                      void Haptics.selectionAsync().catch(() => undefined);
                      setGender(g);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: gender === g }}
                    style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 11, justifyContent: 'center', backgroundColor: gender === g ? P.white : 'transparent' }}
                  >
                    <Ink size={13} weight={gender === g ? 'extraBold' : 'bold'} color={gender === g ? c.ink : c.textSecondary}>{g === 'h' ? 'Homme' : 'Femme'}</Ink>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
        />

        <Ink size={14} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{pack.tagline}</Ink>

        {monde ? (
          <MondeHero pack={pack} gender={gender} unlocked={has} rankIndex={rankIndex} xp={snap?.state.xp ?? 0} />
        ) : vie ? (
          <View style={{ height: 420, borderRadius: 26, borderWidth: 1, borderColor: c.border, backgroundColor: pack.fond, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Animated.View key={gender} entering={FadeIn.duration(320)}>
              <BreathingFigure source={packImage(pack, gender)} width={300} height={400} label={packDisplayName(pack, gender)} />
            </Animated.View>
            {!has ? (
              <View style={{ position: 'absolute', right: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: blancA(0.9) }}>
                <LockIcon size={14} color={DOJO.gold} />
                <Ink size={12} weight="extraBold" color={c.goldDeep}>Premium</Ink>
              </View>
            ) : null}
          </View>
        ) : (
        <View style={{ borderRadius: 26, borderWidth: 1, borderColor: c.border, backgroundColor: pack.fond, paddingVertical: 16, paddingHorizontal: 10, flexDirection: 'row', gap: 6 }}>
          {([1, 2, 3] as Level[]).map((l) => {
            const unlocked = has && l <= level;
            const pr = progressFor(l);
            return (
              <View key={l} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <View style={{ width: '100%', height: 190, alignItems: 'center', justifyContent: 'flex-end' }}>
                  {unlocked || l === 1 ? (
                    <Image source={pack.images[gender][l - 1]} style={{ width: '100%', height: 190, opacity: unlocked ? 1 : 0.9 }} resizeMode="contain" accessibilityLabel={`${pack.name}, niveau ${l}`} />
                  ) : (
                    <Image source={pack.images[gender][l - 1]} style={{ width: '100%', height: 190, opacity: 0.28, tintColor: '#6B6E78' }} resizeMode="contain" accessibilityLabel={`${pack.name}, niveau ${l}, pas encore gagné`} />
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {unlocked ? <CheckIcon size={14} /> : l > 1 ? <LockIcon size={14} /> : null}
                  <Ink size={14} weight="extraBold" color="#1D2029">Niveau {l}</Ink>
                </View>
                <Ink size={11} color="#4A4E5A" style={{ textAlign: 'center' }} numberOfLines={3}>{levelCondition(pack, l)}</Ink>
                {l > 1 ? (
                  <View style={{ alignSelf: 'stretch', paddingHorizontal: 6, gap: 3 }}>
                    <Bar progress={pr.value} color={c.accent} height={4} track="rgba(29,32,41,0.08)" />
                    <Ink size={10} color={pr.value >= 1 && !has ? '#4F6B28' : '#6B6E78'} style={{ textAlign: 'center' }}>{pr.label}</Ink>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
        )}

        <View style={{ backgroundColor: P.white, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, gap: 10 }}>
          {[
            ...(monde
              ? ['Homme et femme inclus', (pack.unlockRank ?? 0) <= 0 ? 'Offert dès le départ' : `Débloqué au rang ${unlockRankName(pack)}`, 'Ouvert tout de suite avec Premium']
              : vie
                ? ['Homme et femme inclus', 'Ouvert avec Premium', 'Sa scène assortie dans Personnages et scènes, quand elle existe']
                : [pack.kind === 'sport' ? 'Homme et femme inclus' : 'Évolue avec ton rang, quel que soit ton sport', 'Ouvert avec Premium', 'Les niveaux 2 et 3 se gagnent en t’entraînant']),
          ].map((t) => (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <CheckIcon size={18} />
              <Ink size={14} color={c.textSecondary}>{t}</Ink>
            </View>
          ))}
        </View>

        {!has && !monde ? (
          <Ink size={13} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>
            {PACKS_STORE_READY
              ? 'Le prix s’affiche depuis la boutique de ton téléphone.'
              : 'Ce pack s’ouvre avec Premium, comme les autres personnages Premium.'}
          </Ink>
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 14 }}>
        {has ? (
          <Pressable
            onPress={equip}
            disabled={equipped}
            accessibilityRole="button"
            style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, backgroundColor: equipped ? c.fillSubtle : pressed ? c.accentPressed : c.accent, alignItems: 'center', justifyContent: 'center' })}
          >
            <Ink size={16} weight="extraBold" color={equipped ? c.textSecondary : c.onAccent}>{equipped ? 'Équipé' : 'Équiper ce personnage'}</Ink>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              tap();
              ouvrirPaywall('personnages');
            }}
            accessibilityRole="button"
            accessibilityLabel={monde ? `Débloquer avec Premium, ou atteins le rang ${unlockRankName(pack)}` : 'Débloquer avec Premium'}
            style={({ pressed }) => ({ minHeight: 56, borderRadius: 18, backgroundColor: pressed ? c.accentPressed : c.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 })}
          >
            <LockIcon size={18} color={c.onAccent} />
            <Ink size={16} weight="extraBold" color={c.onAccent}>Débloquer avec Premium</Ink>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Personnage du monde : grande illustration et chemin vers son rang */
function MondeHero({ pack, gender, unlocked, rankIndex, xp }: { pack: PackDef; gender: Gender; unlocked: boolean; rankIndex: number; xp: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const target = Math.max(0, Math.min(RANKS.length - 1, pack.unlockRank ?? 0));
  const reached = rankIndex >= target;
  const progress = target <= 0 ? 1 : Math.min(1, xp / RANKS[target].minXp);
  const left = Math.max(0, RANKS[target].minXp - xp);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ height: 420, borderRadius: 26, borderWidth: 1, borderColor: c.border, backgroundColor: pack.fond, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
        <Animated.View key={gender} entering={FadeIn.duration(320)}>
          <BreathingFigure source={packImage(pack, gender)} width={300} height={400} label={packDisplayName(pack, gender)} />
        </Animated.View>
        {!unlocked ? (
          <View style={{ position: 'absolute', right: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: blancA(0.9) }}>
            <LockIcon size={14} color={DOJO.gold} />
            <Ink size={12} weight="extraBold" color={c.goldDeep}>{`Rang ${unlockRankName(pack)}`}</Ink>
          </View>
        ) : null}
      </View>
      <View style={{ backgroundColor: P.white, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {unlocked ? <CheckIcon size={18} /> : <LockIcon size={18} />}
          <Ink size={15} weight="extraBold" style={{ flex: 1 }}>{unlocked ? 'À toi, prêt à équiper' : `Débloqué ${mondeCondition(pack)}`}</Ink>
        </View>
        {!unlocked && !reached ? (
          <View style={{ gap: 4 }}>
            <Bar progress={progress} color={c.accent} height={6} track="rgba(29,32,41,0.08)" />
            <Ink size={12} color={c.textMuted}>{`Encore ${left.toLocaleString('fr-FR')} XP avant le rang ${unlockRankName(pack)}`}</Ink>
          </View>
        ) : null}
      </View>
    </View>
  );
}
