/**
 * L'editeur du rond de profil (28 octobre 2026, Houari : « fais en un beau truc ») : l'ecran Photo et contour.
 * En haut ton rond en grand sur ta scene, en direct, qui rebondit doucement a chaque changement, et le resume du choix.
 * Dessous, quatre onglets pastel : Photo (fournie par l'ecran, avec sa logique), Forme (ta vraie photo dans chaque
 * forme), Contour (pastilles rondes par famille, puis Fine ou Epaisse), Deco (le carrousel des badges, avec Aucun).
 * Le choix actif : contour bleu nuit et coche. Tout tient a 375 de large.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { P } from '@/components/yoroi/livePalette';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import {
  BADGES,
  CONTOURS,
  EPAISSEURS,
  FAMILLES_BADGE,
  FAMILLES_CONTOUR,
  FORMES,
  RondCadre,
  teinteContour,
  type ContourRond,
  type EpaisseurRond,
  type FormeRond,
  type StyleRond,
} from '@/components/yoroi/v2/reglages/contour';
import { traduire } from '@/lib/i18n/tr';

export type OngletRond = 'photo' | 'forme' | 'contour' | 'deco';
export type ChangementRond = { contourRond?: ContourRond; formeRond?: FormeRond; epaisseurRond?: EpaisseurRond; badgeRond?: string };

const tap = () => selectionAsync().catch(() => {});

/** Titre de bloc en petites capitales colorees */
function Titre({ texte, couleur }: { texte: string; couleur: string }) {
  return (
    <Ink size={11.5} weight="extraBold" color={couleur} accessibilityRole="header" style={{ letterSpacing: 1.6, textTransform: 'uppercase' }}>
      {texte}
    </Ink>
  );
}

/** La petite coche bleu nuit des choix actifs */
function Coche({ size = 20 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: P.accent, borderWidth: 2, borderColor: P.pureWhite, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="check" size={size * 0.5} color={P.pureWhite} stroke={3.2} />
    </View>
  );
}

function Carte({ children }: { children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  return <View style={{ borderRadius: 22, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: 14, gap: 12 }}>{children}</View>;
}

export function EditeurRond({ style: st, onChange, contenu, scene, prenom, resume, photo, ongletInitial = 'forme' }: {
  style: StyleRond;
  onChange: (patch: ChangementRond) => void;
  /** ce que montre le rond (ta photo, ton personnage ou tes initiales), pour une taille donnee */
  contenu: (S: number) => React.ReactNode;
  scene: ImageSourcePropType;
  prenom: string;
  resume: string;
  /** l'onglet Photo : ses boutons et leur logique viennent de l'ecran */
  photo: React.ReactNode;
  ongletInitial?: OngletRond;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { img } = useIllustrations();
  const [onglet, setOnglet] = useState<OngletRond>(ongletInitial);

  // le rond rebondit doucement a chaque changement (pas au premier affichage)
  const echelle = useSharedValue(1);
  const signature = `${st.contour}|${st.forme}|${st.epaisseur}|${st.badge ?? ''}`;
  const premier = useRef(true);
  useEffect(() => {
    if (premier.current) {
      premier.current = false;
      return;
    }
    echelle.value = withSequence(withTiming(0.92, { duration: 110 }), withSpring(1, { damping: 9, stiffness: 180 }));
  }, [signature, echelle]);
  const rebond = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));

  const choisir = (patch: ChangementRond) => {
    tap();
    onChange(patch);
  };

  const ONGLETS: { id: OngletRond; nom: string }[] = [
    { id: 'photo', nom: 'Photo' },
    { id: 'forme', nom: 'Forme' },
    { id: 'contour', nom: 'Contour' },
    { id: 'deco', nom: traduire('Déco') },
  ];

  return (
    <View style={{ gap: 14 }}>
      {/* 1. ton rond en grand, sur ta scene */}
      <View style={{ height: 262, borderRadius: 28, overflow: 'hidden', backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Image source={scene} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
        <LinearGradient colors={['rgba(245,246,251,0)', 'rgba(245,246,251,0.85)']} locations={[0.45, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <Animated.View style={[{ marginTop: -50 }, rebond]}>
          <RondCadre size={138} {...st} fond="scene" fill="#F2F1EC">
            {contenu(138)}
          </RondCadre>
        </Animated.View>
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 12, alignItems: 'center' }}>
          <View style={{ maxWidth: '100%', alignItems: 'center', gap: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: P.glass }}>
          <Ink size={17} weight="black" numberOfLines={1}>{prenom}</Ink>
          <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2} style={{ textAlign: 'center' }}>{resume}</Ink>
          </View>
        </View>
      </View>

      {/* 2. les onglets pastel */}
      <View style={{ flexDirection: 'row', backgroundColor: c.fillSubtle, borderRadius: 18, padding: 4 }} accessibilityRole="tablist">
        {ONGLETS.map((o) => {
          const on = o.id === onglet;
          return (
            <Pressable
              key={o.id}
              onPress={() => { if (!on) { tap(); setOnglet(o.id); } }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => ({ flex: 1, minHeight: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? P.primary : pressed ? c.surface : 'transparent' })}
            >
              <Ink size={13.5} weight="extraBold" color={on ? P.onPrimary : c.textSecondary} numberOfLines={1}>{o.nom}</Ink>
            </Pressable>
          );
        })}
      </View>

      {onglet === 'photo' ? photo : null}

      {/* Forme : ta vraie photo dans chaque forme */}
      {onglet === 'forme' ? (
        <Carte>
          <Titre texte={traduire('Forme')} couleur={P.etiquettePrune} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {FORMES.map((f) => {
              const on = f.id === st.forme;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => { if (!on) choisir({ formeRond: f.id }); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={traduire('Forme {0}', f.nom)}
                  style={({ pressed }) => ({ width: '24%', alignItems: 'center', gap: 6, paddingTop: 10, paddingBottom: 8, borderRadius: 18, borderWidth: 2, borderColor: on ? P.accent : 'transparent', backgroundColor: on ? c.accentTint : pressed ? c.fillSoft : P.bande, transform: [{ scale: pressed ? 0.97 : 1 }] })}
                >
                  <RondCadre size={58} contour={st.contour} forme={f.id} epaisseur={st.epaisseur} fond="papier" fill="#F2F1EC">
                    {contenu(58)}
                  </RondCadre>
                  <Ink size={11.5} weight={on ? 'extraBold' : 'bold'} color={on ? P.accent : c.textSecondary} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ textAlign: 'center', lineHeight: 14, minHeight: 28 }}>{f.nom}</Ink>
                  {on ? <View style={{ position: 'absolute', top: 4, right: 4 }}><Coche size={18} /></View> : null}
                </Pressable>
              );
            })}
          </View>
        </Carte>
      ) : null}

      {/* Contour : pastilles rondes par famille, puis l'epaisseur */}
      {onglet === 'contour' ? (
        <Carte>
          {FAMILLES_CONTOUR.map((fam, i) => (
            <View key={fam.id} style={{ gap: 8 }}>
              <Titre texte={fam.nom} couleur={[P.etiquettePrune, P.tuileMentheTexte, P.accent, P.tuileSableTexte][i % 4]} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 }}>
                {fam.ids.map((id) => {
                  const on = id === st.contour;
                  const t = teinteContour(id);
                  const nom = CONTOURS.find((x) => x.id === id)?.nom ?? id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => { if (!on) choisir({ contourRond: id }); }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`Contour ${nom}`}
                      style={({ pressed }) => ({ width: '20%', alignItems: 'center', gap: 4, transform: [{ scale: pressed ? 0.94 : 1 }] })}
                    >
                      <View style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 2.5, borderColor: on ? P.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', backgroundColor: t.couleur ?? c.fillSoft, borderWidth: id === 'blanc' || id === 'fin' || id === 'aucun' ? 1 : 0, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                          {t.degrade ? <LinearGradient colors={t.degrade} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} /> : null}
                          {id === 'aucun' ? <View style={{ width: 26, height: 2, borderRadius: 1, backgroundColor: c.textMuted, transform: [{ rotate: '-45deg' }] }} /> : null}
                          {id === 'fin' ? <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.surface }} /> : null}
                        </View>
                        {on ? <View style={{ position: 'absolute', right: -3, bottom: -3 }}><Coche size={18} /></View> : null}
                      </View>
                      <Ink size={11} weight={on ? 'extraBold' : 'bold'} color={on ? P.accent : c.textSecondary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{traduire(nom)}</Ink>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: c.divider }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <Titre texte={traduire('Épaisseur')} couleur={P.etiquettePrune} />
            <View style={{ flexDirection: 'row', backgroundColor: c.fillSubtle, borderRadius: 14, padding: 3 }}>
              {EPAISSEURS.map((ep) => {
                const on = ep.id === st.epaisseur;
                return (
                  <Pressable
                    key={ep.id}
                    onPress={() => { if (!on) choisir({ epaisseurRond: ep.id }); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on, disabled: st.contour === 'aucun' }}
                    accessibilityLabel={traduire('Épaisseur {0}', ep.nom)}
                    disabled={st.contour === 'aucun'}
                    style={({ pressed }) => ({ minWidth: 78, height: 34, borderRadius: 11, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? P.primary : pressed ? c.surface : 'transparent', opacity: st.contour === 'aucun' ? 0.45 : 1 })}
                  >
                    <Ink size={12.5} weight="extraBold" color={on ? P.onPrimary : c.textSecondary}>{ep.nom}</Ink>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Carte>
      ) : null}

      {/* Deco : les badges par famille, chacune en carrousel, et Aucun en haut */}
      {onglet === 'deco' ? (
        <Carte>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Titre texte={traduire('Badge')} couleur={P.tuileSableTexte} />
              <Ink size={12} color={c.textMuted}>{traduire('Un petit sticker posé en haut à droite de ton rond')}</Ink>
            </View>
            <Pressable
              onPress={() => { if (st.badge) choisir({ badgeRond: 'aucun' }); }}
              accessibilityRole="button"
              accessibilityState={{ selected: !st.badge }}
              accessibilityLabel={traduire('Sans badge')}
              hitSlop={6}
              style={({ pressed }) => ({ height: 34, paddingHorizontal: 12, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: !st.badge ? c.accentTint : pressed ? c.fillSoft : P.bande, borderWidth: 2, borderColor: !st.badge ? P.accent : c.divider })}
            >
              {!st.badge ? <Icon name="check" size={12} color={P.accent} stroke={3} /> : null}
              <Ink size={12.5} weight="extraBold" color={!st.badge ? P.accent : c.textSecondary}>{traduire('Sans badge')}</Ink>
            </Pressable>
          </View>
          {FAMILLES_BADGE.map((fam, i) => (
            <View key={fam.id} style={{ gap: 8 }}>
              <Titre texte={fam.nom} couleur={[P.accent, P.etiquettePrune, P.tuileSableTexte, P.tuileMentheTexte, P.etiquettePrune][i % 5]} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -14 }} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, gap: 10 }}>
                {BADGES.filter((x) => x.famille === fam.id).map((x) => {
                  const on = st.badge === x.id;
                  return (
                    <Pressable
                      key={x.id}
                      onPress={() => { if (!on) choisir({ badgeRond: x.id }); }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={traduire('Badge {0}', x.nom)}
                      style={({ pressed }) => ({ width: 64, alignItems: 'center', gap: 5, transform: [{ scale: pressed ? 0.95 : 1 }] })}
                    >
                      <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: on ? c.accentTint : P.bande, borderWidth: 2.5, borderColor: on ? P.accent : c.divider, alignItems: 'center', justifyContent: 'center' }}>
                        <Image source={img(x.id)} style={{ width: 42, height: 42 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                        {on ? <View style={{ position: 'absolute', right: -5, top: -5 }}><Coche size={20} /></View> : null}
                      </View>
                      <Ink size={11} weight={on ? 'extraBold' : 'bold'} color={on ? P.accent : c.textSecondary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{x.nom}</Ink>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ))}
        </Carte>
      ) : null}
    </View>
  );
}
