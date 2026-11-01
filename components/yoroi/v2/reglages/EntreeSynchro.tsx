/**
 * La synchro entre tes appareils, en premiere ligne des Reglages (1er novembre 2026, Houari : « seule, pour donner
 * envie ; on voit le MacBook avec l'image, il tourne le carrousel et il voit l'iPad »).
 * Un carrousel lent : un portable (ecran et base), une tablette, un telephone, dessines en vues RN, sans logo ni
 * marque, qui montrent de vrais ecrans de YOROI rendus en mode demo (profil Malik, aucune donnee reelle :
 * assets/images/synchro/). Il defile seul et s'arrete des que tu le touches. A cote ou dessous : l'etat reel
 * (lu par la page Reglages dans peerSyncService, jamais demarre d'ici) et le bouton qui ouvre /sync-devices.
 * En grand ecran (iPad, Mac) : toute la largeur, les appareils plus grands, le texte a droite.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, View } from 'react-native';
import type { ImageSourcePropType, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const ECRANS = {
  mac: require('@/assets/images/synchro/mac_accueil.webp'),
  ipad: require('@/assets/images/synchro/ipad_seances.webp'),
  iphone: require('@/assets/images/synchro/iphone_accueil.webp'),
};
// proportions des captures (largeur / hauteur)
const RATIO = { mac: 1200 / 750, ipad: 1000 / 695, iphone: 480 / 1041 };
type Appareil = keyof typeof ECRANS;
const PAGES: { id: Appareil; legende: string }[] = [
  { id: 'mac', legende: 'Sur ton Mac' },
  { id: 'ipad', legende: 'Sur ton iPad' },
  { id: 'iphone', legende: 'Sur ton iPhone' },
];
const DELAI = 4500;

// Cadres neutres : un gris graphite pour le tour d'ecran, un aluminium doux pour la base
const BORD = '#1d2029';
const ALU = '#d9dde5';
const ALU_FONCE = '#b9bfca';
const OMBRE = { shadowColor: '#1b2340', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 } as const;

function Ecran({ source, largeur, hauteur, rayon }: { source: ImageSourcePropType; largeur: number; hauteur: number; rayon: number }) {
  return (
    <View style={{ width: largeur, height: hauteur, borderRadius: rayon, overflow: 'hidden', backgroundColor: '#f3f4f8' }}>
      <Image source={source} style={{ width: largeur, height: hauteur }} resizeMode="cover" accessibilityIgnoresInvertColors />
    </View>
  );
}

/** Le portable : l'ecran dans son tour sombre, puis la base plus large avec l'encoche d'ouverture */
function Portable({ hauteurMax, largeurMax }: { hauteurMax: number; largeurMax: number }) {
  const bord = 7;
  const base = 12;
  let le = Math.min(largeurMax * 0.9, ((hauteurMax - base - bord * 2 - 4) * RATIO.mac));
  le = Math.round(le);
  const he = Math.round(le / RATIO.mac);
  const lb = Math.round(Math.min(largeurMax, le + bord * 2) * 1.12);
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={[{ padding: bord, paddingTop: bord + 3, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: BORD }, OMBRE]}>
        <View style={{ position: 'absolute', top: 3, alignSelf: 'center', width: 4, height: 4, borderRadius: 2, backgroundColor: '#3a3f4c' }} />
        <Ecran source={ECRANS.mac} largeur={le} hauteur={he} rayon={3} />
      </View>
      <View style={[{ width: lb, height: base, backgroundColor: ALU, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: ALU_FONCE }, OMBRE]}>
        <View style={{ width: Math.round(lb * 0.16), height: 4, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: ALU_FONCE }} />
      </View>
    </View>
  );
}

/** La tablette en paysage, tour regulier et coins tres arrondis */
function Tablette({ hauteurMax, largeurMax }: { hauteurMax: number; largeurMax: number }) {
  const bord = Math.max(7, Math.round(hauteurMax * 0.035));
  const le = Math.round(Math.min(largeurMax * 0.9, (hauteurMax - bord * 2) * RATIO.ipad));
  const he = Math.round(le / RATIO.ipad);
  return (
    <View style={[{ padding: bord, borderRadius: bord + 12, backgroundColor: BORD }, OMBRE]}>
      <View style={{ position: 'absolute', left: Math.round(bord / 2) - 2, top: '50%', width: 4, height: 4, borderRadius: 2, backgroundColor: '#3a3f4c' }} />
      <Ecran source={ECRANS.ipad} largeur={le} hauteur={he} rayon={10} />
    </View>
  );
}

/** Le telephone debout, avec son ilot en haut */
function Telephone({ hauteurMax }: { hauteurMax: number }) {
  const bord = 5;
  const he = Math.round(hauteurMax - bord * 2);
  const le = Math.round(he * RATIO.iphone);
  return (
    <View style={[{ padding: bord, borderRadius: 26, backgroundColor: BORD }, OMBRE]}>
      {/* la capture descend sous l'ilot, comme sous la barre d'etat d'un vrai telephone */}
      <View style={{ width: le, height: he, borderRadius: 21, overflow: 'hidden', backgroundColor: '#f3f4f8' }}>
        <Image source={ECRANS.iphone} style={{ width: le, height: Math.round(le / RATIO.iphone), marginTop: 20 }} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>
      <View style={{ position: 'absolute', top: bord + 6, alignSelf: 'center', width: Math.round(le * 0.3), height: 9, borderRadius: 5, backgroundColor: BORD }} />
    </View>
  );
}

export function EntreeSynchro({ grand, nbAppareils, appaire, relie, onPress }: {
  /** grand ecran : toute la largeur, appareils plus grands, texte a droite */
  grand: boolean;
  /** appareils appaires connus (0 tant que la liste n'est pas chargee) */
  nbAppareils: number;
  /** au moins un appareil appaire, lu dans le coffre */
  appaire: boolean;
  /** un appareil appaire est relie en ce moment */
  relie: boolean;
  onPress: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  const [largeur, setLargeur] = useState(0);
  const [page, setPage] = useState(0);
  const [arrete, setArrete] = useState(false);
  const defile = useRef<ScrollView>(null);

  const hauteur = grand ? 400 : 250;
  const hDevice = hauteur - 52;

  // defilement automatique lent, coupe pour de bon des que tu touches le carrousel
  useEffect(() => {
    if (arrete || !largeur) return;
    const t = setInterval(() => {
      setPage((p) => {
        const n = (p + 1) % PAGES.length;
        defile.current?.scrollTo({ x: n * largeur, animated: true });
        return n;
      });
    }, DELAI);
    return () => clearInterval(t);
  }, [arrete, largeur]);

  const surLayout = (e: LayoutChangeEvent) => setLargeur(Math.round(e.nativeEvent.layout.width));
  const finDefilement = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!largeur) return;
    setPage(Math.max(0, Math.min(PAGES.length - 1, Math.round(e.nativeEvent.contentOffset.x / largeur))));
  };
  const allerA = (i: number) => {
    setArrete(true);
    setPage(i);
    defile.current?.scrollTo({ x: i * largeur, animated: true });
  };

  const ok = nbAppareils > 0 || appaire || relie;
  const etat = nbAppareils > 0
    ? traduirePluriel(nbAppareils, nbAppareils > 1, 'Relié à {0} appareil', 'Relié à {0} appareils', nbAppareils)
    : ok
      ? traduire('Appareils reliés')
      : traduire('Pas encore relié');
  const bouton = ok ? traduire('Voir mes appareils') : traduire('Relier mes appareils');

  const carrousel = (
    <View style={{ flex: grand ? 1.6 : undefined }}>
      <View
        onLayout={surLayout}
        onTouchStart={() => setArrete(true)}
        style={{ height: hauteur, borderRadius: 20, overflow: 'hidden', backgroundColor: c.fillSoft }}
      >
        {largeur ? (
          <ScrollView
            ref={defile}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScrollBeginDrag={() => setArrete(true)}
            onMomentumScrollEnd={finDefilement}
            scrollEventThrottle={16}
          >
            {PAGES.map((p) => (
              <View key={p.id} style={{ width: largeur, height: hauteur, alignItems: 'center', justifyContent: 'center', paddingTop: 10 }} accessible accessibilityLabel={traduire(p.legende)}>
                <View style={{ height: hDevice, alignItems: 'center', justifyContent: 'flex-end' }}>
                  {p.id === 'mac' ? <Portable hauteurMax={hDevice} largeurMax={largeur - 28} /> : p.id === 'ipad' ? <Tablette hauteurMax={hDevice} largeurMax={largeur - 28} /> : <Telephone hauteurMax={hDevice} />}
                </View>
                <Ink size={12} weight="bold" color={c.textSecondary} style={{ marginTop: 10 }}>{traduire(p.legende)}</Ink>
              </View>
            ))}
          </ScrollView>
        ) : null}
      </View>
      {/* les points de pagination */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {PAGES.map((p, i) => (
          <Pressable key={p.id} onPress={() => allerA(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={traduire(p.legende)}>
            <View style={{ width: i === page ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i === page ? c.accent : c.border }} />
          </Pressable>
        ))}
      </View>
    </View>
  );

  const pastille = (sticker: 'hors_ligne' | 'cadenas', texte: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingLeft: 6, paddingRight: 10, borderRadius: 14, backgroundColor: c.fillSoft }}>
      <Image source={illus.img(sticker)} style={{ width: 22, height: 22 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      <Ink size={12} weight="bold" color={c.ink}>{texte}</Ink>
    </View>
  );

  const titre = (
    <View style={{ gap: 4 }}>
      <Ink size={grand ? 24 : 19} weight="black" tight color={c.ink}>{traduire('Tes données sur tous tes appareils')}</Ink>
      <Ink size={grand ? 14 : 12.5} weight="bold" color={c.textSecondary}>
        {Platform.OS === 'android' ? traduire('Sans internet, chiffré') : traduire('iPhone, iPad et Mac, sans internet, chiffré')}
      </Ink>
    </View>
  );

  const action = (
    <View style={{ gap: 12 }}>
      {grand ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {pastille('hors_ligne', traduire('Sans internet'))}
          {pastille('cadenas', traduire('Chiffré'))}
        </View>
      ) : null}
      <View style={{ flexDirection: grand ? 'column' : 'row', alignItems: grand ? 'flex-start' : 'center', gap: 10 }}>
        <View style={{ flex: grand ? undefined : 1, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: ok ? c.successText : c.textMuted }} />
          <Ink size={13.5} weight="bold" color={ok ? c.successText : c.textSecondary} numberOfLines={1}>{etat}</Ink>
        </View>
        <Pressable
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
            onPress();
          }}
          accessibilityRole="button"
          accessibilityLabel={bouton}
          style={({ pressed }) => ({ paddingVertical: 11, paddingHorizontal: grand ? 24 : 16, borderRadius: 14, backgroundColor: c.accent, alignSelf: grand ? 'flex-start' : 'auto', alignItems: 'center', transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <Ink size={14} weight="black" color={c.onAccent}>{bouton}</Ink>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ borderRadius: 24, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: grand ? 18 : 12, gap: 12 }}>
      {grand ? (
        <View style={{ flexDirection: 'row', gap: 22, alignItems: 'center' }}>
          {carrousel}
          <View style={{ flex: 1, gap: 18 }}>
            {titre}
            {action}
          </View>
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: 4 }}>{titre}</View>
          {carrousel}
          <View style={{ paddingHorizontal: 4 }}>{action}</View>
        </>
      )}
    </View>
  );
}
