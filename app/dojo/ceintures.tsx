/**
 * Tes niveaux de pratique : un par sport, selon le nombre de seances.
 * Novice 0, Initie 10, Motive 25, Solide 50, Assidu 75, Aguerri 100, Chevronne 150,
 * Redoutable 200, Veteran 275, Maitre 365 (source : lib/v2/dojo/belts.ts).
 * (Route historique /dojo/ceintures conservee. Ce ne sont pas des grades officiels.)
 */
import React from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import Animated from 'react-native-reanimated';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { BackHeader, Bar, LevelPlate, tap } from '@/components/yoroi/v2/dojo/parts';
import { BELTS } from '@/lib/v2/dojo/belts';
import { useArmure } from '@/lib/v2/dojo/useArmure';
import { PACKS, parsePersonnage, THEME_IMAGES } from '@/lib/v2/dojo/personnages';
import { universDe } from '@/lib/v2/dojo/dojoAffichage';
import { P } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

export default function Ceintures() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { snap, espace } = useArmure();
  const belts = snap?.belts ?? [];
  const gender = parsePersonnage(espace.personnage).gender;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 12 }} showsVerticalScrollIndicator={false}>
        <BackHeader title={traduire("Tes niveaux de pratique")} scene={universDe(espace) === 'classique' ? THEME_IMAGES.classique_salle_jour : THEME_IMAGES.salle} subtitle={traduire("Un par sport, selon tes séances")} />

        <View style={{ backgroundColor: P.white, borderWidth: 1, borderColor: c.border, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 10, marginTop: 6, gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {BELTS.map((b) => (
              <View key={b.id} style={{ flex: 1, alignItems: 'center', gap: 6 }} accessible accessibilityLabel={traduire("Niveau {0} à {1} séances", b.name, b.min)}>
                <LevelPlate color={b.color} edge={b.edge} size={22} />
                <Ink size={11} weight="extraBold" color={c.textSecondary}>{b.min}</Ink>
              </View>
            ))}
          </View>
          <Ink size={12} color={c.textMuted} style={{ textAlign: 'center', paddingHorizontal: 6 }}>
            {traduire("{0}. Ce ne sont pas des grades : ton vrai grade se note dans ton profil.", BELTS.map((b) => b.name).join(', '))}</Ink>
        </View>

        {belts.length ? (
          <Animated.View entering={ENTREE} style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { v: String(belts.length), l: belts.length > 1 ? traduire('sports pratiqués') : traduire('sport pratiqué') },
              { v: String(belts.reduce((n, b) => n + b.count, 0)), l: traduire('séances au total') },
              { v: [...belts].sort((a, b) => b.count - a.count)[0].belt.name, l: traduire('ton meilleur niveau') },
            ].map((x) => (
              <View key={x.l} style={{ flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 12, gap: 2 }}>
                <Ink size={x.v.length > 6 ? 16 : 20} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{x.v}</Ink>
                <Ink size={11} weight="bold" color={c.textMuted} numberOfLines={2}>{x.l}</Ink>
              </View>
            ))}
          </Animated.View>
        ) : null}

        {belts.length === 0 ? (
          <View style={{ backgroundColor: P.white, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 20, gap: 12, alignItems: 'flex-start' }}>
            <LevelPlate color="#FFFFFF" edge="#D9D3CA" size={34} />
            <Ink size={18} weight="black">{traduire("Ton premier niveau t’attend")}</Ink>
            <Ink size={14} color={c.textSecondary}>{traduire('Chaque sport a son niveau. Il monte tout seul avec tes séances\u00A0: Initié à 10, Motivé à 25, Maître à 365.')}</Ink>
            <BoutonPrincipal
              onPress={() => {
                tap();
                router.push('/ajouter' as any);
              }}
              haptique="none"
              label={traduire("Enregistrer une séance")}
              tailleTexte={16}
              style={{ alignSelf: 'stretch' }}
            />
          </View>
        ) : null}

        {belts.map((b, i) => {
          const pack = PACKS.find((p) => p.kind === 'sport' && p.sports.includes(b.sport));
          const lvl = b.count >= 100 ? 3 : b.count >= 25 ? 2 : 1;
          const barColor = b.belt.id === 'blanche' ? (b.next?.color ?? '#E8C33A') : b.belt.color;
          return (
            <Animated.View key={b.sport} style={{ backgroundColor: P.white, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {pack ? (
                  <View style={{ width: 72, height: 92, borderRadius: 16, backgroundColor: pack.fond, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <Image source={pack.images[gender][lvl - 1]} style={{ width: 72, height: 90 }} resizeMode="contain" />
                  </View>
                ) : (
                  <View style={{ width: 72, height: 92, borderRadius: 16, backgroundColor: '#EEF0F7', alignItems: 'center', justifyContent: 'center' }}>
                    <LevelPlate color={b.belt.color} edge={b.belt.edge} size={30} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 3 }}>
                  <Ink size={17} weight="extraBold" numberOfLines={2}>{traduire(b.sportName)}</Ink>
                  <Ink size={13} color={c.textSecondary}>{traduirePluriel(b.count, b.count > 1, "Niveau {0}, {1} séance", "Niveau {0}, {1} séances", b.belt.name, b.count)}</Ink>
                </View>
                <LevelPlate color={b.belt.color} edge={b.belt.edge} size={26} />
              </View>
              <Bar progress={b.progress} color={barColor} />
              <Ink size={13} color={c.textSecondary}>
                {b.next ? traduirePluriel(b.remaining, b.remaining > 1, "Encore {0} séance pour le niveau {1}", "Encore {0} séances pour le niveau {1}", b.remaining, b.next.name) : traduire('Niveau Maître\u00A0: le sommet de ce sport')}
              </Ink>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}
