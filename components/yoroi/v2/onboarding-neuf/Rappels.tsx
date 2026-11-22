/**
 * onboarding-neuf/Rappels.tsx
 *
 * L'equivalent de l'ecran des notifications d'INRO (components/onboarding-nuit/Fin.tsx, Notifs) : un iPhone
 * dessine, l'ecran verrouille a l'heure reelle, et les vraies notifications de YOROI qui tombent une a une, avec
 * leurs textes reels (lib/notificationService.ts et lib/weeklyRecapNotification.ts). Aucune valeur de sante :
 * YOROI l'interdit deja sur l'ecran verrouille (lib/v2/notifications/texte.ts).
 * « Plus tard » arrive en fondu apres 2 s. En apercu, la question du systeme est seulement montree.
 * Si les rappels sont refuses : « Sans rappels, tu rates ça » (RappelsRefus).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LOCALE, traduire } from '@/lib/i18n/tr';
import { Alerte, Bouton, Ecran, Haut, ND, Sticker, Titre, Txt, type Nav } from './kit';
import { FONT, ICONE_YOROI, PHOTOS, PHOTO_RAPPELS, useNuit } from './theme';
import type { NomSticker } from '@/components/yoroi/v2/stickers';

const pad = (n: number) => String(n).padStart(2, '0');
const VOILE = (a: number) => `rgba(0,0,0,${a})`;

/** L'heure du telephone, remise a jour au debut de chaque minute */
function useMaintenant(): Date {
  const [d, setD] = useState(() => new Date());
  useEffect(() => {
    let intervalle: ReturnType<typeof setInterval> | null = null;
    const premier = setTimeout(() => {
      setD(new Date());
      intervalle = setInterval(() => setD(new Date()), 60000);
    }, 60000 - (Date.now() % 60000) + 50);
    return () => {
      clearTimeout(premier);
      if (intervalle) clearInterval(intervalle);
    };
  }, []);
  return d;
}

type Notif = { titre: string; texte: string; quand: string };

/**
 * Seulement des notifications que YOROI envoie vraiment, avec leurs textes reels :
 *  - la pesee : lib/notificationService.ts (rappel de pesee)
 *  - la seance du jour : lib/notificationService.ts (rappel de seance)
 *  - le recap du dimanche : lib/weeklyRecapNotification.ts
 *  - l'eau : lib/notificationService.ts (hydratation)
 */
export function notifsReelles(): Notif[] {
  return [
    { titre: traduire('Ta pesée du jour'), texte: traduire('Au réveil, avant le petit déjeuner : c’est le bon moment.'), quand: traduire('maintenant') },
    { titre: traduire('C’est l’heure de ta séance'), texte: traduire('Ton créneau est arrivé. Même une séance courte compte.'), quand: traduire('il y a {0} min', 10) },
    { titre: traduire('Récap de ta semaine'), texte: traduire('Ton bilan des sept derniers jours t’attend dans YOROI.'), quand: traduire('il y a {0} min', 25) },
    { titre: traduire('Un verre d’eau ?'), texte: traduire('Une petite pause pour boire.'), quand: traduire('il y a {0} h', 1) },
  ];
}

/** Une notification iOS : verre floute, coins arrondis, vraie icone de YOROI */
function BulleNotif({ n, apparition }: { n: Notif; apparition: Animated.Value }) {
  return (
    <Animated.View
      style={{
        marginBottom: 9,
        opacity: apparition,
        transform: [
          { translateY: apparition.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) },
          { scale: apparition.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
        ],
      }}
    >
      <View style={f.bulle}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(40,44,60,0.55)' }]} />
        <Image source={ICONE_YOROI} style={f.bulleIcone} resizeMode="cover" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Txt style={f.bulleApp}>YOROI</Txt>
            <View style={{ flex: 1 }} />
            <Txt style={f.bulleQuand}>{n.quand}</Txt>
          </View>
          <Txt style={f.bulleTitre} numberOfLines={1}>{n.titre}</Txt>
          <Txt style={f.bulleTexte} numberOfLines={2}>{n.texte}</Txt>
        </View>
      </View>
    </Animated.View>
  );
}

export function Rappels({ nav, demander, onReponse, onPlusTard }: {
  nav: Nav;
  /** vrai parcours : la vraie question du systeme (sans elle, apercu : la question est seulement montree) */
  demander?: () => Promise<boolean>;
  /** la reponse (accepte ou refuse) fait avancer */
  onReponse: (accepte: boolean) => void;
  /** « Plus tard » : on continue sans rien activer */
  onPlusTard: () => void;
}) {
  const T = useNuit();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const maintenant = useMaintenant();
  const notifs = useMemo(notifsReelles, []);
  const [zoneH, setZoneH] = useState(0);
  const [alerte, setAlerte] = useState(false);
  const [plusTard, setPlusTard] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const apparitions = useRef(notifs.map(() => new Animated.Value(0))).current;
  const plusTardA = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const chute = Animated.stagger(1100, apparitions.map((a) => Animated.timing(a, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: ND })));
    const t1 = setTimeout(() => chute.start(), 450);
    const t2 = setTimeout(() => {
      setPlusTard(true);
      Animated.timing(plusTardA, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start();
    }, 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      chute.stop();
    };
  }, [apparitions, plusTardA]);

  const telL = Math.min(width - 96, 300);
  const telH = telL * 2.05;
  const petit = zoneH > 0 && zoneH < 430;
  const date = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }).format(maintenant);
  const heure = `${pad(maintenant.getHours())}:${pad(maintenant.getMinutes())}`;

  const activer = () => {
    if (!demander) {
      setAlerte(true);
      return;
    }
    if (occupe) return;
    setOccupe(true);
    void demander()
      .catch(() => false)
      .then((ok) => {
        setOccupe(false);
        onReponse(ok);
      });
  };

  return (
    <Ecran>
      <Haut etape={nav.etape} total={nav.total} progres={nav.progres} onBack={nav.onBack} onClose={nav.onClose} />
      <Titre sous={traduire('Active les rappels de pesée, de séance et ton bilan de la semaine.')} mot={traduire('séance')}>{traduire('Ne rate plus aucune séance')}</Titre>

      <View style={{ flex: 1, marginTop: 18, overflow: 'hidden' }} onLayout={(e) => setZoneH(e.nativeEvent.layout.height)}>
        <View style={[f.tel, { width: telL, height: telH, borderColor: T.line }]}>
          <View style={f.telEcran}>
            <Image source={PHOTOS[PHOTO_RAPPELS]} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <LinearGradient colors={[`${T.inter}CC`, VOILE(0.5), VOILE(0.72)]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
            <View style={f.ilot} />
            <Txt style={[f.ecranDate, petit && { marginTop: 34 }]}>{date}</Txt>
            <Txt style={[f.ecranHeure, petit && { fontSize: 46, lineHeight: 52 }]}>{heure}</Txt>
          </View>
        </View>
        <LinearGradient pointerEvents="none" colors={[`${T.bg}00`, T.bg]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.max(90, zoneH * 0.28) }} />
        <View style={{ position: 'absolute', left: 14, right: 14, top: petit ? 124 : 146 }} pointerEvents="none">
          {notifs.map((n, i) => (
            <BulleNotif key={n.titre} n={n} apparition={apparitions[i]} />
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 14) + 6 }}>
        <Animated.View style={{ opacity: plusTardA, alignSelf: 'center', marginBottom: 14 }} pointerEvents={plusTard ? 'auto' : 'none'}>
          <Pressable onPress={onPlusTard} hitSlop={10} accessibilityRole="button">
            <Txt style={{ fontFamily: FONT.texteMedium, fontSize: 14, color: T.sub }}>{traduire('Plus tard')}</Txt>
          </Pressable>
        </Animated.View>
        <Bouton label={traduire('Activer les rappels')} onPress={activer} chargement={occupe} />
      </View>

      {/* Apercu : la vraie question du systeme n'est pas posee, on la montre seulement */}
      <Alerte
        visible={alerte}
        titre={traduire('Autoriser « YOROI » à envoyer des notifications ?')}
        texte={traduire('Les notifications peuvent inclure des alertes, des sons et des pastilles. Tu peux les régler dans Réglages.')}
        boutons={[
          { label: traduire('Refuser'), onPress: () => onReponse(false) },
          { label: traduire('Autoriser'), principal: true, onPress: () => onReponse(true) },
        ]}
        onFerme={() => setAlerte(false)}
      />
    </Ecran>
  );
}

/** Si les rappels sont refuses : ce qu'on rate, en trois lignes vraies */
export function RappelsRefus({ nav, onActiver }: { nav: Nav; onActiver: () => void }) {
  const T = useNuit();
  const insets = useSafeAreaInsets();
  const lignes: { sticker: NomSticker; titre: string; sous: string }[] = [
    { sticker: 'balance', titre: traduire('Ta pesée, au même moment'), sous: traduire('Au réveil, pour une courbe plus juste.') },
    { sticker: 'chrono', titre: traduire('Ta séance du jour'), sous: traduire('À l’heure que tu choisis, les jours où tu t’entraînes.') },
    { sticker: 'bilan', titre: traduire('Ton bilan du dimanche'), sous: traduire('Le récap de ta semaine, le dimanche soir.') },
  ];
  return (
    <Ecran>
      <Haut etape={nav.etape} total={nav.total} progres={nav.progres} onBack={nav.onBack} onClose={nav.onClose} />
      <Titre sous={traduire('Tu peux les activer plus tard dans les réglages de ton téléphone.')} mot={traduire('rappels')}>{traduire('Sans rappels, tu rates ça')}</Titre>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 22, gap: 12 }}>
        {lignes.map((r) => (
          <View key={r.titre} style={[f.rate, { backgroundColor: T.card, borderColor: T.line }]}>
            <Sticker nom={r.sticker} taille={42} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontFamily: FONT.texteSemi, fontSize: 15.5, color: T.ink }}>{r.titre}</Txt>
              <Txt style={{ fontFamily: FONT.texte, fontSize: 13, lineHeight: 18, color: T.sub, marginTop: 2 }}>{r.sous}</Txt>
            </View>
          </View>
        ))}
      </View>
      <View style={{ paddingHorizontal: 24, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 14) + 6 }}>
        <Pressable onPress={nav.onNext} hitSlop={10} style={{ alignSelf: 'center', marginBottom: 14 }} accessibilityRole="button">
          <Txt style={{ fontFamily: FONT.texteMedium, fontSize: 14, color: T.sub }}>{traduire('Plus tard')}</Txt>
        </Pressable>
        <Bouton label={traduire('Activer quand même')} onPress={onActiver} />
      </View>
    </Ecran>
  );
}

const f = StyleSheet.create({
  tel: { alignSelf: 'center', borderRadius: 50, borderWidth: 2, padding: 5, backgroundColor: '#000000' },
  telEcran: { flex: 1, borderRadius: 44, overflow: 'hidden' },
  ilot: { position: 'absolute', top: 11, alignSelf: 'center', width: 92, height: 27, borderRadius: 14, backgroundColor: '#000000' },
  ecranDate: { fontFamily: FONT.texteSemi, fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 48 },
  ecranHeure: { fontFamily: FONT.titreBold, fontSize: 56, lineHeight: 62, letterSpacing: -1.5, color: '#FFFFFF', textAlign: 'center' },
  bulle: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 13, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  bulleIcone: { width: 42, height: 42, borderRadius: 10 },
  bulleApp: { fontFamily: FONT.texteSemi, fontSize: 12, letterSpacing: 0.3, color: 'rgba(255,255,255,0.78)' },
  bulleQuand: { fontFamily: FONT.texte, fontSize: 12, color: 'rgba(255,255,255,0.78)', marginLeft: 6 },
  bulleTitre: { fontFamily: FONT.texteSemi, fontSize: 15, color: '#FFFFFF', marginTop: 1 },
  bulleTexte: { fontFamily: FONT.texte, fontSize: 14, lineHeight: 18.5, color: '#FFFFFF', opacity: 0.94 },
  rate: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, borderWidth: 1, padding: 16 },
});
