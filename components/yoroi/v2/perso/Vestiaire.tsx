/**
 * Vestiaire (27 octobre 2026) : l'ecran Ton personnage, partage par /settings/personnage et /avatar-selection
 * (l'accueil, le Studio et la Gamification ouvrent /avatar-selection, Reglages ouvre /settings/personnage ; le retour
 * revient a l'ecran d'origine, router.back d'EspaceScreen).
 * Ton personnage (vague 41) : ton personnage, ses rangs, le choix du personnage, sa silhouette, le rond de profil
 * et son contour (Aucun, Fin par defaut, Or, Indigo), applique a l'accueil, aux Reglages et au profil.
 * Vague 45 : trois univers (Japon, Classique ou Sans personnage, via choisirUnivers). Sans personnage,
 * la silhouette disparait et le rond montre ta photo ou tes initiales.
 * 27 octobre 2026, maquette B « Vestiaire » (refonte Pastel et Ciel) : en haut ton personnage en grand sur un socle
 * pastel devant ta scene en fond doux, son nom, son univers et ses 5 rangs ; puis un carrousel par univers et par pack
 * (memes choix qu'avant : choisirUnivers pour le Guerrier, le Sportif et Sans personnage, saveEspace avec l'univers Japon pour le
 * monde samourai debloque, comme la Boutique, la fiche du pack pour les autres) ; en bas la silhouette, le rond de profil et son contour.
 * Les anciennes versions des deux routes sont gardees dans _archive_ancien_design_2026-10-09/personnage_B_2026-10-27/.
 */
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, View, type ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { P } from '@/components/yoroi/livePalette';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, GUTTER, Icon } from '@/components/yoroi/v2/espace/ui';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { personnageImage, personnageNom } from '@/components/yoroi/v2/espace/assets';
import { imageDeTaScene, useEspaceAuRetour } from '@/components/yoroi/v2/espace/apercuScene';
import { ChoiceSheet, ValueRow } from '@/components/yoroi/v2/espace/reglages/parts';
import { syncIdentite } from '@/components/yoroi/v2/espace/identite';
import { resumeRond, styleRondDe } from '@/components/yoroi/v2/reglages/contour';
import { Groupe, TUILE } from '@/components/yoroi/v2/reglages/kit';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { useIdentite } from '@/lib/v2/espace/useIdentite';
import { saveEspace } from '@/lib/v2/espace';
import { writeOldAvatar } from '@/lib/v2/watchIdentity';
import { usePremium } from '@/context/PremiumContext';
import {
  MONDE_PERSONNAGES,
  PACKS,
  VIE_PERSONNAGES,
  classiqueImage,
  getOwnedPacks,
  guerrierImage,
  isPackUnlocked,
  memePersonnage,
  packDisplayName,
  packImage,
  packLevel,
  parsePersonnage,
  personnageKey,
  separerTeinte,
  type PackDef,
} from '@/lib/v2/dojo/personnages';
import { CATEGORIES_VIE, PACKS_VIE_PRETS } from '@/lib/v2/dojo/packsVie';
import { RANG_NOMS, UNIVERS_CHOIX, libelleConstruction } from '@/lib/v2/dojo/univers';
import { choisirUnivers, choixUniversDe, genreDuPersonnage } from '@/lib/v2/dojo/choisirUnivers';
import { SILHOUETTES, calculerSilhouetteAuto, silhouetteActive, silhouetteNom, type SilhouetteId, type SilhouetteMode } from '@/lib/v2/silhouette';
import { universAffiche } from './universAffiche';
import { traduire } from '@/lib/i18n/tr';

/* ---------- mesures de la maquette B ---------- */
const HERO_H = 290;
/** hauteur de la carte repliee, collee en haut pendant le defilement */
const HERO_MIN = 170;
const REPLI = HERO_H - HERO_MIN;
/** figure : hauteur et marge sous les pieds, carte ouverte puis repliee */
const FIG_H = [222, 116] as const;
const FIG_BAS = [36, 12] as const;
const VIGNETTE_W = 76;
const VIGNETTE_H = 92;
/** largeur du nom sous la vignette : un peu plus que la vignette, pour les noms longs sur 2 lignes */
const NOM_W = 84;
const RANG_W = 48;
const RANG_H = 56;
const RANG_COL = 58;

/** Une vignette du carrousel, decrite une fois puis dessinee par Vignette */
type Choix = {
  key: string;
  nom: string;
  image: ImageSourcePropType;
  fond: string;
  on: boolean;
  lock: boolean;
  onPress: () => void;
  a11y: string;
};

/** Titre de rangee en petites capitales colorees */
function TitreRangee({ titre, couleur }: { titre: string; couleur: string }) {
  return (
    <Ink size={11.5} weight="extraBold" color={couleur} accessibilityRole="header" style={{ letterSpacing: 1.6, textTransform: 'uppercase', paddingHorizontal: 4 }}>
      {titre}
    </Ink>
  );
}

/** La pastille de coche (choisi) ou de cadenas (verrouille) en haut a droite d'une vignette */
function Pastille({ lock }: { lock: boolean }) {
  return (
    <View
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: lock ? P.tuileSableFond : P.primary,
        borderWidth: 1.5,
        borderColor: P.pureWhite,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={lock ? 'lock' : 'check'} size={11} color={lock ? P.tuileSableTexte : P.onPrimary} stroke={2.8} />
    </View>
  );
}

function Vignette({ v }: { v: Choix }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={v.onPress}
      accessibilityRole="button"
      accessibilityLabel={v.a11y}
      accessibilityState={{ selected: v.on }}
      style={({ pressed }) => ({ width: NOM_W, alignItems: 'center', gap: 6, transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      <View
        style={{
          width: VIGNETTE_W,
          height: VIGNETTE_H,
          borderTopLeftRadius: VIGNETTE_W / 2,
          borderTopRightRadius: VIGNETTE_W / 2,
          borderBottomLeftRadius: 18,
          borderBottomRightRadius: 18,
          backgroundColor: v.fond,
          borderWidth: 3,
          borderColor: v.on ? c.accent : 'transparent',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <Image source={v.image} style={{ width: 58, height: 82, opacity: v.lock ? 0.5 : 1 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        {v.on || v.lock ? <Pastille lock={!v.on && v.lock} /> : null}
      </View>
      <Ink size={11.5} weight="extraBold" color={v.on ? c.accent : v.lock ? c.textSecondary : c.ink} numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        ellipsizeMode="clip"
        style={{ width: NOM_W, minHeight: 28, textAlign: 'center', lineHeight: 14 }}
      >
        {v.nom}
      </Ink>
    </Pressable>
  );
}

/** Un carrousel horizontal, colle aux bords de l'ecran, la premiere vignette alignee sur la marge */
function Rangee({ titre, sub, couleur, items }: { titre: string; sub?: string; couleur: string; items: Choix[] }) {
  const { theme } = useYoroiTheme();
  if (!items.length) return null;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <TitreRangee titre={titre} couleur={couleur} />
        {sub ? <Ink size={12} color={theme.colors.textMuted} style={{ paddingHorizontal: 4 }}>{sub}</Ink> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -GUTTER }} contentContainerStyle={{ paddingHorizontal: GUTTER - (NOM_W - VIGNETTE_W) / 2, gap: 8 }}>
        {items.map((v) => (
          <Vignette key={v.key} v={v} />
        ))}
      </ScrollView>
    </View>
  );
}

export function Vestiaire() {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { espace: espaceDirect, update } = useEspace();
  // la scene et le personnage choisis dans un autre ecran (fiche d'un pack) apparaissent des le retour
  const espace = useEspaceAuRetour(espaceDirect);
  const { profile, armure } = useIdentite();
  const { isPremium } = usePremium();
  const [owned, setOwned] = useState<string[]>([]);
  const [picker, setPicker] = useState<null | 'silhouette'>(null);
  const go = (href: string) => router.push(href as any);

  useEffect(() => {
    syncIdentite(profile?.profile_photo ?? null).catch(() => {});
  }, [profile?.profile_photo]);
  useEffect(() => {
    void getOwnedPacks().then(setOwned);
  }, []);

  const rankIndex = armure?.rank.index ?? 0;
  // vague 45 : le genre de la cle (Guerrier ou Sportif), sinon celui du profil (garde aussi sans personnage)
  const genre: 'h' | 'f' = genreDuPersonnage(espace.personnage, profile?.avatar_gender);
  const choixUnivers = choixUniversDe(espace);
  const sansPerso = choixUnivers === 'aucun';
  const actuel = parsePersonnage(espace.personnage);
  // l'univers affiche suit le personnage (le monde samourai toujours Japon, le Sportif jamais les rangs Japon)
  const univers = universAffiche(espace.personnage, espace.univers);
  const universNom = UNIVERS_CHOIX.find((u) => u.id === (sansPerso ? 'aucun' : univers))?.nom ?? 'Japon';
  const perso = personnageImage(espace.personnage, rankIndex, genre);
  const sceneImage = imageDeTaScene(espace.scene);
  const hasPhoto = !!profile?.profile_photo;
  // sans personnage, la photo des qu'elle existe, sinon tes initiales (meme regle que l'accueil)
  const identite = (espace.identite === 'photo' || sansPerso) && hasPhoto ? 'photo' : 'personnage';
  const rondInitiales = identite !== 'photo' && sansPerso;
  // 28 octobre 2026 : forme, contour, epaisseur et badge du rond, avec la photo comme avec le personnage
  const styleRond = styleRondDe(espace);

  // silhouette : jamais de chiffre ni de mot blessant
  const silMode: SilhouetteMode = espace.silhouette ?? 'classique';
  const silActive = silhouetteActive(silMode, espace.silhouetteAuto);
  // vague 45 : la silhouette vaut pour le Guerrier et pour le Sportif (memes regles)
  const estClassique = espace.personnage === 'classique_h' || espace.personnage === 'classique_f';
  const estGuerrier = espace.personnage === 'guerrier_h' || espace.personnage === 'guerrier_f' || estClassique;
  const silValue = silMode === 'classique' ? traduire('Non') : silMode === 'auto' ? (silActive ? `Auto, ${silhouetteNom(silActive)}` : traduire('Auto')) : silhouetteNom(silMode as SilhouetteId);
  const silSub = silMode === 'auto' && !silActive ? traduire('Ajoute ta taille et une pesée') : undefined;
  const miniGuerrier = (sil: SilhouetteId | null) => (
    <Image source={estClassique ? classiqueImage(genre, rankIndex, sil) : guerrierImage(genre, rankIndex, sil)} style={{ width: 66, height: 88 }} resizeMode="contain" accessibilityIgnoresInvertColors />
  );

  /* ---------- les 5 rangs : l'armure (ou la tenue) reelle de chaque rang ---------- */
  const imageDuRang = (i: number): ImageSourcePropType => {
    if (actuel.kind === 'pack' && actuel.pack.kind === 'legende') return packImage(actuel.pack, genre, packLevel(actuel.pack, i, {}), actuel.teinte ?? null);
    if (actuel.kind === 'classique' || (actuel.kind !== 'guerrier' && univers === 'classique')) return classiqueImage(genre, i);
    return guerrierImage(genre, i);
  };
  const rangActuel = RANG_NOMS[univers][Math.max(0, Math.min(4, rankIndex))];
  const sousTitre =
    actuel.kind === 'guerrier' || actuel.kind === 'classique'
      ? traduire('Rang {0} sur 5, {1}. {2}.', rankIndex + 1, rangActuel, libelleConstruction(univers))
      : traduire('Rang {0} sur 5, {1}.', rankIndex + 1, rangActuel);

  /* ---------- les choix, memes actions qu'avant ---------- */
  const succes = () => notificationAsync(NotificationFeedbackType.Success).catch(() => {});
  // le Guerrier remet l'univers Japon, le Sportif l'univers Classique (choisirUnivers garde aussi le genre du profil)
  const choixGuerrier = (g: 'h' | 'f'): Choix => {
    const on = espace.personnage === `guerrier_${g}`;
    const nom = g === 'f' ? traduire('Guerrière') : traduire('Guerrier');
    return {
      key: `guerrier_${g}`, nom, image: guerrierImage(g, rankIndex), fond: g === 'f' ? P.programmeFond : P.tuileIndigo, on, lock: false,
      a11y: on ? traduire('{0}, ton personnage', nom) : nom,
      onPress: () => { selectionAsync().catch(() => {}); void choisirUnivers('japon', g).then(succes); },
    };
  };
  const choixClassique = (g: 'h' | 'f'): Choix => {
    const on = espace.personnage === `classique_${g}`;
    const nom = g === 'f' ? 'Sportive' : 'Sportif';
    return {
      key: `classique_${g}`, nom, image: classiqueImage(g, rankIndex), fond: g === 'f' ? P.tuileSableFond : P.tuileMentheFond, on, lock: false,
      a11y: on ? traduire('{0}, ton personnage', nom) : nom,
      onPress: () => { selectionAsync().catch(() => {}); void choisirUnivers('classique', g).then(succes); },
    };
  };
  // monde samourai : choisi s'il est debloque, sinon sa fiche (comme avant) ; packs : leur fiche, qui equipe
  const choixPack = (p: PackDef): Choix => {
    const key = personnageKey(p, genre);
    const on = memePersonnage(espace.personnage, key);
    const lock = !isPackUnlocked(p, p.kind === 'monde' ? [] : owned, rankIndex, isPremium);
    const nom = packDisplayName(p, genre);
    const teinte = on ? separerTeinte(espace.personnage).teinte : null;
    return {
      key: p.id, nom, image: packImage(p, genre, on ? packLevel(p, rankIndex, {}) : 1, teinte), fond: p.fond, on, lock,
      a11y: `${nom}, ${on ? traduire('ton personnage') : lock ? traduire('à débloquer dans le Dojo') : traduire('touche pour le choisir')}`,
      onPress: () => {
        selectionAsync().catch(() => {});
        if (p.kind === 'monde' && !lock) {
          // comme la Boutique : le monde samourai remet l'univers Japon (rangs Ashigaru a Shogun) ; la montre suit
          void saveEspace({ personnage: key, univers: 'japon' })
            .then(() => writeOldAvatar(key))
            .then(succes)
            .catch(() => {});
        } else {
          router.push({ pathname: '/dojo/pack', params: { id: p.id } } as any);
        }
      },
    };
  };
  const vieDe = (cat: string) => VIE_PERSONNAGES.filter((p) => PACKS_VIE_PRETS.find((v) => v.id === p.id)?.categorie === cat);
  const COULEURS_RANGEES = [P.tuileMentheTexte, P.accent, P.etiquettePrune, P.tuileSableTexte, P.heart, P.mossText];
  const phraseUnivers = (id: 'japon' | 'classique' | 'aucun') => UNIVERS_CHOIX.find((u) => u.id === id)?.phrase;
  const rangees: { id: string; titre: string; sub?: string; items: Choix[] }[] = [
    { id: 'japon', titre: 'Japon', sub: phraseUnivers('japon'), items: [choixGuerrier('h'), choixGuerrier('f')] },
    { id: 'classique', titre: 'Classique', sub: phraseUnivers('classique'), items: [choixClassique('h'), choixClassique('f')] },
    {
      id: 'monde',
      titre: traduire('Le monde samouraï'),
      sub: isPremium ? traduire('Six figures du Japon féodal, toutes à toi avec Premium') : traduire('Six figures du Japon féodal, à débloquer dans le Dojo'),
      items: MONDE_PERSONNAGES.map(choixPack),
    },
    ...CATEGORIES_VIE.map((cat) => ({ id: cat.id, titre: cat.nom, items: vieDe(cat.id).map(choixPack) })),
    { id: 'legendes', titre: traduire('Les légendes'), items: PACKS.filter((p) => p.kind === 'legende').map(choixPack) },
    { id: 'sport', titre: traduire('Les packs sport'), items: PACKS.filter((p) => p.kind === 'sport').map(choixPack) },
  ];
  const pickAucun = () => {
    selectionAsync().catch(() => {});
    void choisirUnivers('aucun', genre).then(succes);
  };

  /* ---------- la carte collee en haut, qui se replie au defilement ---------- */
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const heroStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, REPLI], [HERO_H, HERO_MIN], Extrapolation.CLAMP),
  }));
  const figStyle = useAnimatedStyle(() => ({
    height: interpolate(scrollY.value, [0, REPLI], [FIG_H[0], FIG_H[1]], Extrapolation.CLAMP),
    bottom: interpolate(scrollY.value, [0, REPLI], [FIG_BAS[0], FIG_BAS[1]], Extrapolation.CLAMP),
  }));
  // l'ombre au sol suit les pieds et se resserre avec la figure
  const solStyle = useAnimatedStyle(() => ({
    bottom: interpolate(scrollY.value, [0, REPLI], [FIG_BAS[0] + 12, FIG_BAS[1] + 8], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(scrollY.value, [0, REPLI], [1, 0.62], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <EnTete
        titre={traduire('Ton personnage')}
        onRetour={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as any))}
        zoneSure
        defile={false}
        fond={c.background}
      />
      <View style={{ flex: 1 }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8 + HERO_H + 20, paddingHorizontal: GUTTER, paddingBottom: insets.bottom + 40, gap: 14 }}
      >
      {/* son nom, son univers et ses 5 rangs */}
      <View style={{ alignItems: 'center', gap: 2, marginTop: -2 }}>
        <Ink size={22} weight="extraBold" tight style={{ textAlign: 'center' }}>{personnageNom(espace.personnage)}</Ink>
        <Ink size={12.5} weight="bold" color={c.textSecondary} style={{ textAlign: 'center' }}>
          {sansPerso ? UNIVERS_CHOIX.find((u) => u.id === 'aucun')?.phrase : sousTitre}
        </Ink>
      </View>
      {!sansPerso ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }} accessibilityRole="summary" accessibilityLabel={sousTitre}>
          {RANG_NOMS[univers].map((nom, i) => {
            const fait = i <= rankIndex;
            const courant = i === rankIndex;
            return (
              <View key={nom} style={{ width: RANG_COL, alignItems: 'center', gap: 4 }}>
                <View
                  style={{
                    width: RANG_W, height: RANG_H, borderRadius: 16, overflow: 'hidden',
                    backgroundColor: fait ? c.surface : c.divider,
                    borderWidth: courant ? 2 : 1, borderColor: courant ? c.accent : fait ? c.border : 'transparent',
                    alignItems: 'center', justifyContent: 'flex-end',
                  }}
                >
                  <Image source={imageDuRang(i)} style={{ width: 34, height: 50, opacity: fait ? 1 : 0.4 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                  {!fait ? (
                    <View style={{ position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="lock" size={9} color={c.textMuted} stroke={2.8} />
                    </View>
                  ) : null}
                </View>
                <Ink size={10.5} weight="extraBold" color={courant ? c.accent : fait ? c.textSecondary : c.textMuted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                  {nom}
                </Ink>
              </View>
            );
          })}
        </View>
      ) : null}

      {actuel.kind === 'pack' ? (
        <Ink size={12} color={c.textMuted} style={{ textAlign: 'center', paddingHorizontal: 12 }}>
          {traduire('Ton personnage actuel vient d’un pack ou du monde samouraï. Choisis le guerrier ou la guerrière pour y revenir.')}
        </Ink>
      ) : null}

      {/* vague 45 : sans personnage, la scene seule, en tete de liste, pour qui ne veut aucune figure */}
      <Pressable
        onPress={pickAucun}
        accessibilityRole="button"
        accessibilityLabel={traduire('Sans personnage. {0}', UNIVERS_CHOIX.find((u) => u.id === 'aucun')?.phrase ?? '')}
        accessibilityState={{ selected: sansPerso }}
        style={({ pressed }) => ({
          flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 22,
          backgroundColor: pressed ? c.fillSoft : c.surface, borderWidth: sansPerso ? 2 : 1, borderColor: sansPerso ? c.accent : c.border,
        })}
      >
        <View style={{ width: 64, height: 48, borderRadius: 14, overflow: 'hidden', backgroundColor: c.fillSoft }}>
          <Image source={sceneImage} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={14} weight="extraBold" color={sansPerso ? c.accent : c.ink}>{traduire('Sans personnage')}</Ink>
          <Ink size={12} color={c.textSecondary} numberOfLines={1}>{UNIVERS_CHOIX.find((u) => u.id === 'aucun')?.phrase}</Ink>
        </View>
        <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: sansPerso ? P.primary : 'transparent', borderWidth: sansPerso ? 0 : 1.5, borderColor: c.border }}>
          {sansPerso ? <Icon name="check" size={12} color={P.onPrimary} stroke={3} /> : null}
        </View>
      </Pressable>
      <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4, marginTop: -4 }}>
        {traduire('Ton XP et ton rang restent les mêmes')}
      </Ink>

      {/* un carrousel par univers et par pack */}
      <View style={{ gap: 18, marginTop: 6 }}>
        {rangees.map((r, i) => (
          <Rangee key={r.id} titre={r.titre} sub={r.sub} couleur={COULEURS_RANGEES[i % COULEURS_RANGEES.length]} items={r.items} />
        ))}
      </View>

      {/* la silhouette et le rond de profil */}
      <Groupe title={!sansPerso && estGuerrier ? traduire('Silhouette et rond de profil') : traduire('Rond de profil')} />
      <Card>
        {/* vague 45 : la silhouette existe seulement pour le Guerrier et le Sportif, la ligne disparait sinon */}
        {!sansPerso && estGuerrier ? <ValueRow first tint={TUILE.bleu} icon="shield" label={traduire('Silhouette selon ton corps')} value={silValue} sub={silSub} onPress={() => setPicker('silhouette')} /> : null}
        {/* 28 octobre 2026 : tout le rond (photo, forme, contour, badge) se regle dans Photo et contour */}
        <ValueRow
          first={sansPerso || !estGuerrier}
          tint={TUILE.mousse}
          icon="camera"
          label={traduire('Ton rond de profil')}
          sub={resumeRond(styleRond, identite === 'photo' ? 'photo' : rondInitiales ? 'initiales' : 'personnage')}
          onPress={() => go('/settings/photo')}
        />
      </Card>

      <ChoiceSheet
        visible={picker === 'silhouette'}
        onClose={() => setPicker(null)}
        title={traduire('Silhouette selon ton corps')}
        subtitle={estClassique ? traduire('Même tenue, même personnage : seule la silhouette change') : traduire('Même armure, même personnage : seule la silhouette change')}
        options={[
          { key: 'classique' as SilhouetteMode, label: traduire('Dessin classique'), sub: traduire('Le personnage d’origine'), preview: miniGuerrier(null) },
          { key: 'auto' as SilhouetteMode, label: traduire('Automatique'), sub: traduire('Il suit tes pesées et évolue avec toi'), preview: miniGuerrier(silMode === 'auto' ? silActive : null) },
          // equilibree est le dessin classique : pas deux choix pour la meme image
          ...SILHOUETTES.filter((sil) => sil.id !== 'equilibree').map((sil) => ({ key: sil.id as SilhouetteMode, label: sil.nom, sub: sil.phrase, preview: miniGuerrier(sil.id) })),
        ]}
        value={silMode === 'equilibree' ? 'classique' : silMode}
        onChange={(v) => {
          if (v === 'auto') {
            calculerSilhouetteAuto(genre)
              .then((auto) => update(auto ? { silhouette: 'auto', silhouetteAuto: auto } : { silhouette: 'auto' }))
              .catch(() => {});
          } else {
            update({ silhouette: v }).catch(() => {});
          }
        }}
      />
      </Animated.ScrollView>
      {/* le personnage choisi, colle en haut : il change sous tes yeux pendant que tu parcours la liste */}
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 8, paddingBottom: 6, paddingHorizontal: GUTTER, backgroundColor: c.background }}>
      <Animated.View style={[{ borderRadius: 30, overflow: 'hidden', backgroundColor: P.programmeFond }, heroStyle]}>
        <Image source={sceneImage} style={{ position: 'absolute', width: '100%', height: '100%', opacity: sansPerso ? 1 : 0.32 }} resizeMode="cover" accessibilityIgnoresInvertColors />
        {!sansPerso ? (
          <>
            <LinearGradient colors={[P.programmeFond + 'B3', P.programmeFond2]} locations={[0, 0.82]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
            {/* ombre douce au sol : deux ellipses tres legeres, sans bord */}
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, height: 0, alignItems: 'center' }, solStyle]}>
              <View style={{ position: 'absolute', top: -80, width: 160, height: 160, borderRadius: 80, backgroundColor: P.ink, opacity: 0.045, transform: [{ scaleY: 0.11 }] }} />
              <View style={{ position: 'absolute', top: -46, width: 92, height: 92, borderRadius: 46, backgroundColor: P.ink, opacity: 0.07, transform: [{ scaleY: 0.13 }] }} />
            </Animated.View>
            <Animated.Image
              source={perso}
              style={[{ position: 'absolute', left: 0, right: 0, width: '100%' }, figStyle]}
              resizeMode="contain"
              accessibilityLabel={traduire('Ton personnage, {0}', personnageNom(espace.personnage))}
            />
          </>
        ) : null}
        <View style={{ position: 'absolute', top: 14, left: 14, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: P.glass, justifyContent: 'center' }}>
          <Ink size={11} weight="extraBold" color={P.etiquettePrune} style={{ letterSpacing: 1.4, textTransform: 'uppercase' }}>{universNom}</Ink>
        </View>
        <Pressable
          onPress={() => { selectionAsync().catch(() => {}); router.navigate('/(tabs)' as any); }}
          accessibilityRole="button"
          accessibilityLabel={traduire('Voir dans ma scène')}
          hitSlop={8}
          style={({ pressed }) => ({
            position: 'absolute', top: 14, right: 14, height: 30, paddingHorizontal: 12, borderRadius: 15,
            backgroundColor: pressed ? c.fillSoft : P.pureWhite, flexDirection: 'row', alignItems: 'center', gap: 6,
            shadowColor: c.shadow, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
          })}
        >
          <Icon name="eye" size={14} color={c.accent} stroke={2.4} />
          <Ink size={12} weight="extraBold" color={c.accent}>{traduire('Voir dans ma scène')}</Ink>
        </Pressable>
      </Animated.View>
      </View>
      </View>
    </View>
  );
}

export default Vestiaire;
