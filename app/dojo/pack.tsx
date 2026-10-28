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
import { traduire, LOCALE } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

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
    if (l === 1) return { value: has ? 1 : 0, label: has ? traduire('à toi') : traduire('avec Premium') };
    if (pack.kind === 'legende') {
      const target = l === 2 ? 2 : 3;
      const reached = rankIndex >= target;
      // condition remplie mais pack pas encore a toi : le dire clairement, sans « atteint » a cote d'un cadenas
      const label = reached ? (has ? traduire('débloqué par ton rang') : traduire('débloqué par ton rang, disponible avec le pack')) : traduire("encore {0} XP", Math.max(0, RANKS[target].minXp - (snap?.state.xp ?? 0)).toLocaleString(LOCALE));
      return { value: reached ? 1 : (snap?.state.xp ?? 0) / RANKS[target].minXp, label };
    }
    const target = l === 2 ? 25 : 100;
    const reached = sessions >= target;
    const label = reached ? (has ? traduire('débloqué par tes séances') : traduire('débloqué par tes séances, disponible avec le pack')) : traduire("{0} / {1} séances", Math.min(sessions, target), target);
    return { value: Math.min(1, sessions / target), label };
  };

  const equip = () => {
    if (equipped) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    // 27 octobre 2026 : comme la Boutique, un personnage du monde samourai remet l'univers Japon
    void saveEspace(monde ? { personnage: key, univers: 'japon' } : { personnage: key });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 14 }} showsVerticalScrollIndicator={false}>
        <BackHeader
          title={monde || vie ? packDisplayName(pack, gender) : pack.name}
          subtitle={pack.kind === 'sport' ? 'Pack sport' : monde ? traduire('Monde samouraï') : vie ? traduire("Pack {0}, vie réelle", pack.name) : traduire('Légende')}
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
                    <Ink size={13} weight={gender === g ? 'extraBold' : 'bold'} color={gender === g ? c.ink : c.textSecondary}>{g === 'h' ? traduire('Homme') : traduire('Femme')}</Ink>
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
                <Ink size={12} weight="extraBold" color={c.goldDeep}>{traduire("Premium")}</Ink>
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
                    <Image source={pack.images[gender][l - 1]} style={{ width: '100%', height: 190, opacity: unlocked ? 1 : 0.9 }} resizeMode="contain" accessibilityLabel={traduire("{0}, niveau {1}", pack.name, l)} />
                  ) : (
                    <Image source={pack.images[gender][l - 1]} style={{ width: '100%', height: 190, opacity: 0.28, tintColor: '#6B6E78' }} resizeMode="contain" accessibilityLabel={traduire("{0}, niveau {1}, pas encore gagné", pack.name, l)} />
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {unlocked ? <CheckIcon size={14} /> : l > 1 ? <LockIcon size={14} /> : null}
                  <Ink size={14} weight="extraBold" color="#1D2029">{traduire("Niveau {0}", l)}</Ink>
                </View>
                <Ink size={11} color="#4A4E5A" style={{ textAlign: 'center' }} numberOfLines={3}>{levelCondition(pack, l)}</Ink>
                {l > 1 ? (
                  <View style={{ alignSelf: 'stretch', paddingHorizontal: 6, gap: 3 }}>
                    <Bar progress={pr.value} color={c.accent} height={4} track="rgba(29,32,41,0.08)" />
                    <Ink size={10} color={pr.value >= 1 && !has ? '#4F6B28' : '#6B6E78'} style={{ textAlign: 'center' }}>{traduire(pr.label)}</Ink>
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
              ? [traduire('Homme et femme inclus'), (pack.unlockRank ?? 0) <= 0 ? traduire('Offert dès le départ') : traduire("Débloqué au rang {0}", unlockRankName(pack)), traduire('Ouvert tout de suite avec Premium')]
              : vie
                ? [traduire('Homme et femme inclus'), traduire('Ouvert avec Premium'), traduire('Sa scène assortie dans Personnages et scènes, quand elle existe')]
                : [pack.kind === 'sport' ? traduire('Homme et femme inclus') : traduire('Évolue avec ton rang, quel que soit ton sport'), traduire('Ouvert avec Premium'), traduire('Les niveaux 2 et 3 se gagnent en t’entraînant')]),
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
              ? traduire('Le prix s’affiche depuis la boutique de ton téléphone.')
              : traduire('Ce pack s’ouvre avec Premium, comme les autres personnages Premium.')}
          </Ink>
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', left: 22, right: 22, bottom: insets.bottom + 14 }}>
        {has ? (
          <BoutonPrincipal onPress={equip} disabled={equipped} label={equipped ? traduire('Équipé') : traduire('Équiper ce personnage')} tailleTexte={16} />
        ) : (
          <BoutonPrincipal
            onPress={() => {
              tap();
              ouvrirPaywall('personnages');
            }}
            haptique="none"
            accessibilityLabel={monde ? traduire("Débloquer avec Premium, ou atteins le rang {0}", unlockRankName(pack)) : traduire('Débloquer avec Premium')}
            label={traduire("Débloquer avec Premium")}
            tailleTexte={16}
            icone={(col) => <LockIcon size={18} color={col} />}
          />
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
            <Ink size={12} weight="extraBold" color={c.goldDeep}>{traduire("Rang {0}", unlockRankName(pack))}</Ink>
          </View>
        ) : null}
      </View>
      <View style={{ backgroundColor: P.white, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {unlocked ? <CheckIcon size={18} /> : <LockIcon size={18} />}
          <Ink size={15} weight="extraBold" style={{ flex: 1 }}>{unlocked ? traduire('À toi, prêt à équiper') : traduire("Débloqué {0}", mondeCondition(pack))}</Ink>
        </View>
        {!unlocked && !reached ? (
          <View style={{ gap: 4 }}>
            <Bar progress={progress} color={c.accent} height={6} track="rgba(29,32,41,0.08)" />
            <Ink size={12} color={c.textMuted}>{traduire("Encore {0} XP avant le rang {1}", left.toLocaleString(LOCALE), unlockRankName(pack))}</Ink>
          </View>
        ) : null}
      </View>
    </View>
  );
}
