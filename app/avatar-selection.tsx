/**
 * Ton personnage (sous-page de Reglages) : guerrier ou guerriere, les personnages du monde
 * samourai et l'acces aux packs. Vague 13 : plus de rang ni d'XP ici, l'evolution de l'armure
 * se regarde dans le Dojo (/dojo/rangs).
 * Vague 45 : trois univers. Japon (le Guerrier, la Guerriere), Classique (le Sportif, la Sportive, gratuits
 * comme le Guerrier) et Sans personnage. Chaque choix passe par choisirUnivers : le Guerrier remet l'univers
 * Japon, le Sportif met l'univers Classique (scene et personnage suivent, l'XP et le rang ne bougent pas).
 */
import React from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { useRouter } from 'expo-router';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EspaceScreen, Icon, LockBadge, SectionTitle } from '@/components/yoroi/v2/espace/ui';
import { GuerrierPicker } from '@/components/yoroi/v2/espace/Pickers';
import { PACKS, packLevel, sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { useIdentite } from '@/lib/v2/espace/useIdentite';
import { choisirPersonnage } from '@/lib/v2/espace/personnage';
import { usePremium } from '@/context/PremiumContext';
import { MONDE_PERSONNAGES, classiqueImage, isPackUnlocked, packDisplayName, packImage, parsePersonnage, personnageKey } from '@/lib/v2/dojo/personnages';
import { UNIVERS_CHOIX } from '@/lib/v2/dojo/univers';
import { choisirUnivers, genreDuPersonnage, type ChoixUnivers } from '@/lib/v2/dojo/choisirUnivers';
import { traduire } from '@/lib/i18n/tr';

const phraseUnivers = (id: ChoixUnivers) => UNIVERS_CHOIX.find((u) => u.id === id)?.phrase;

export default function TonPersonnage() {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { espace } = useEspace();
  const { profile, armure } = useIdentite();
  const rankIndex = armure?.rank.index ?? 0;
  // vague 45 : genre de la cle (Guerrier ou Sportif), sinon celui du profil (garde aussi sans personnage)
  const genre: 'h' | 'f' = genreDuPersonnage(espace.personnage, profile?.avatar_gender);
  const { isPremium } = usePremium();
  const kind = parsePersonnage(espace.personnage).kind;
  const estGuerrier = espace.personnage === 'guerrier_h' || espace.personnage === 'guerrier_f';

  // le Guerrier remet l'univers Japon (choisirUnivers garde aussi le genre du profil)
  const pick = async (p: 'guerrier_h' | 'guerrier_f') => {
    await choisirUnivers('japon', p === 'guerrier_f' ? 'f' : 'h');
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
  };
  // le Sportif ou la Sportive met l'univers Classique ; « Sans personnage » aussi, sans figure
  const pickClassique = async (g: 'h' | 'f') => {
    await choisirUnivers('classique', g);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
  };
  const pickAucun = async () => {
    await choisirUnivers('aucun', genre);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
  };

  const carteClassique = (g: 'h' | 'f', label: string) => {
    const on = espace.personnage === `classique_${g}`;
    return (
      <Pressable
        key={g}
        onPress={() => { selectionAsync().catch(() => {}); void pickClassique(g); }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: on }}
        style={{ flex: 1, height: 250, borderRadius: 22, overflow: 'hidden', borderWidth: on ? 3 : 1, borderColor: on ? c.accent : c.border, backgroundColor: on ? c.accentTint : c.fillSoft, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 12 }}
      >
        <Image source={classiqueImage(g, rankIndex)} style={{ position: 'absolute', top: 6, width: '100%', height: 206 }} resizeMode="contain" />
        <View style={{ backgroundColor: on ? c.accent : c.surface, borderWidth: on ? 0 : 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
          <Ink size={14} weight="extraBold" color={on ? '#FFFFFF' : c.ink}>{label}</Ink>
        </View>
        {on ? <View style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} color="#FFFFFF" stroke={3} /></View> : null}
      </Pressable>
    );
  };
  const aucunOn = kind === 'aucun';

  return (
    <EspaceScreen title={traduire("Ton personnage")} subtitle={traduire("Il décore ton accueil et ton rond de profil.")}>
      <SectionTitle title="Japon" sub={phraseUnivers('japon')} />
      <GuerrierPicker value={espace.personnage} rankIndex={rankIndex} onPick={pick} height={290} />
      {kind === 'pack' || (kind === 'guerrier' && !estGuerrier) ? (
        <Ink size={13} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Ton personnage actuel vient d’un pack ou du monde samouraï. Choisis le guerrier ou la guerrière pour y revenir.")}</Ink>
      ) : null}

      {/* vague 45 : l'univers Classique, gratuit comme le Guerrier */}
      <SectionTitle title="Classique" sub={phraseUnivers('classique')} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {carteClassique('h', 'Sportif')}
        {carteClassique('f', 'Sportive')}
      </View>

      {/* vague 45 : sans personnage, la scene seule */}
      <Pressable
        onPress={() => { selectionAsync().catch(() => {}); void pickAucun(); }}
        accessibilityRole="button"
        accessibilityLabel={traduire("Sans personnage. {0}", phraseUnivers('aucun') ?? '')}
        accessibilityState={{ selected: aucunOn }}
        style={{ height: 120, borderRadius: 22, overflow: 'hidden', borderWidth: aucunOn ? 3 : 1, borderColor: aucunOn ? c.accent : c.border, backgroundColor: c.fillSoft }}
      >
        <Image source={sceneMeta('classique_salle_jour').image} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
        <View style={{ position: 'absolute', left: 12, bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ backgroundColor: aucunOn ? c.accent : c.surface, borderWidth: aucunOn ? 0 : 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
            <Ink size={14} weight="extraBold" color={aucunOn ? '#FFFFFF' : c.ink}>{traduire("Sans personnage")}</Ink>
          </View>
        </View>
        {aucunOn ? <View style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} color="#FFFFFF" stroke={3} /></View> : null}
      </Pressable>
      <Ink size={13} color={c.textSecondary} style={{ paddingHorizontal: 4, marginTop: -4 }}>{phraseUnivers('aucun')}</Ink>

      <SectionTitle title={traduire("Le monde samouraï")} sub={isPremium ? traduire('Six figures du Japon féodal, toutes à toi avec Premium') : traduire('Six figures du Japon féodal, à débloquer dans le Dojo')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -22 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 10 }}>
        {MONDE_PERSONNAGES.map((p) => {
          const key = personnageKey(p, genre);
          const on = espace.personnage === key;
          const unlocked = isPackUnlocked(p, [], rankIndex, isPremium);
          const name = packDisplayName(p, genre);
          return (
            <Pressable
              key={p.id}
              onPress={() => {
                if (unlocked) {
                  void choisirPersonnage(key).then(() => notificationAsync(NotificationFeedbackType.Success).catch(() => {}));
                } else {
                  router.push({ pathname: '/dojo/pack', params: { id: p.id } } as any);
                }
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${name}, ${on ? traduire('ton personnage') : unlocked ? traduire('touche pour le choisir') : traduire('à débloquer dans le Dojo')}`}
              style={{ width: 160, borderRadius: 22, backgroundColor: p.fond, borderWidth: on ? 3 : 1, borderColor: on ? c.accent : c.border, padding: 10, gap: 4 }}
            >
              <Image source={packImage(p, genre)} style={{ width: '100%', height: 200 }} resizeMode="contain" />
              {!unlocked ? <View style={{ position: 'absolute', top: 8, right: 8 }}><LockBadge size={24} /></View> : null}
              <Ink size={14} weight="extraBold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{name}</Ink>
              <Ink size={12} weight="bold" color={on ? c.accent : unlocked ? c.successText : c.textMuted}>{on ? traduire('Ton personnage') : unlocked ? traduire('Choisir') : traduire('À débloquer')}</Ink>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionTitle title={traduire("Les légendes")} sub={traduire("Des personnages en trois niveaux, dans la boutique du dojo")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -22 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 10 }}>
        {PACKS.map((p) => {
          const on = espace.personnage === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => router.push('/dojo/boutique' as any)}
              accessibilityRole="button"
              accessibilityLabel={traduire("{0}, voir dans la boutique", p.nom)}
              style={{ width: 150, borderRadius: 22, backgroundColor: c.surface, borderWidth: on ? 3 : 1, borderColor: on ? c.accent : c.border, padding: 12, gap: 6 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Ink size={14} weight="extraBold" numberOfLines={1} style={{ flex: 1 }}>{traduire(p.nom)}</Ink>
              </View>
              <Image source={p.images[on ? packLevel(rankIndex) - 1 : 0]} style={{ width: '100%', height: 150 }} resizeMode="contain" />
              <Ink size={12} weight="bold" color={on ? c.accent : c.textMuted}>{on ? traduire('Ton personnage') : traduire('Voir le pack')}</Ink>
            </Pressable>
          );
        })}
      </ScrollView>
    </EspaceScreen>
  );
}
