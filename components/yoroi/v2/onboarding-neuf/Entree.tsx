/**
 * onboarding-neuf/Entree.tsx
 *
 * L'ecran d'entree, copie d'INRO (components/onboarding-nuit/Entree.tsx) : un fond qui bouge comme une video,
 * fait de 9 plans (photos 1 a 9) de 2 300 ms chacun, fondu de 380 ms, zoom lent et leger glissement en lineaire.
 * Le plan d'avant reste dessous le temps du fondu. Voile noir en haut et en bas pour lire le logo et les boutons.
 * En haut : YOROI en blanc et la phrase. En bas : le bouton blanc « Commencer », les deux liens de l'ancien
 * premier ecran (la sauvegarde, la reprise depuis une autre app, sans aucun nom d'app), « Restaurer mes achats »
 * et la ligne des conditions. En haut a gauche, la langue de l'app (code seulement, pas de drapeau emoji).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LANG, LANGUES_ACTIVES, LANGUES_INFO, choisirLangue, jourMois, traduire, type Lang } from '@/lib/i18n/tr';
import { Alerte, Bouton, ND, Sticker, Txt, vibre } from './kit';
import { FONT, PHOTOS, PLANS_ENTREE, useNuit } from './theme';

/** Le mouvement de chaque plan : zoom de `de` a `a`, glissement de 0 a dx */
const MOUVEMENTS: { de: number; a: number; dx: number }[] = [
  { de: 1.04, a: 1.16, dx: -14 },
  { de: 1.05, a: 1.18, dx: 10 },
  { de: 1.14, a: 1.03, dx: -10 },
  { de: 1.15, a: 1.04, dx: 0 },
  { de: 1.03, a: 1.13, dx: 0 },
  { de: 1.14, a: 1.04, dx: -12 },
  { de: 1.04, a: 1.14, dx: 10 },
  { de: 1.13, a: 1.03, dx: -8 },
  { de: 1.04, a: 1.14, dx: 8 },
];

/** Duree d'un plan, et du fondu qui l'amene */
export const PLAN_MS = 2300;
export const FONDU_MS = 380;

function Plan({ index, width, height }: { index: number; width: number; height: number }) {
  const m = MOUVEMENTS[index % MOUVEMENTS.length];
  const fondu = useRef(new Animated.Value(0)).current;
  const mouvement = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fondu, { toValue: 1, duration: FONDU_MS, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start();
    Animated.timing(mouvement, { toValue: 1, duration: PLAN_MS + FONDU_MS * 2, easing: Easing.linear, useNativeDriver: ND }).start();
  }, [fondu, mouvement]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fondu }]}>
      <Animated.View
        style={{
          width,
          height,
          transform: [
            { scale: mouvement.interpolate({ inputRange: [0, 1], outputRange: [m.de, m.a] }) },
            { translateX: mouvement.interpolate({ inputRange: [0, 1], outputRange: [0, m.dx] }) },
          ],
        }}
      >
        <Image source={PHOTOS[PLANS_ENTREE[index % PLANS_ENTREE.length]]} style={{ width, height }} resizeMode="cover" />
      </Animated.View>
    </Animated.View>
  );
}

export type OffreSauvegarde = { modifiedAt: number; onRetrouver: () => void; onZero: () => void };

export function Entree({ onStart, onSauvegarde, onReprise, onRestaurerAchats, onConditions, onConfidentialite, onClose, restauration = false, offre, planDepart = 0 }: {
  onStart: () => void;
  /** « J'ai déjà une sauvegarde » : la liste des sauvegardes (ou le selecteur de fichiers) */
  onSauvegarde?: () => void;
  /** « Tu viens d'une autre app de muscu ? Ramène tout » (jamais en apercu ni en mode retour) */
  onReprise?: () => void;
  onRestaurerAchats: () => void;
  onConditions: () => void;
  onConfidentialite: () => void;
  /** apercu du Studio : la croix ferme l'apercu */
  onClose?: () => void;
  /** une restauration de sauvegarde est en cours */
  restauration?: boolean;
  /** premier lancement : une sauvegarde iCloud a ete trouvee */
  offre?: OffreSauvegarde;
  /** captures : le plan a montrer en premier */
  planDepart?: number;
}) {
  const T = useNuit();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [langues, setLangues] = useState(false);
  const [offreVisible, setOffreVisible] = useState(!!offre);
  useEffect(() => setOffreVisible(!!offre), [offre]);

  // On garde le plan d'avant sous le nouveau, le temps du fondu.
  const [plans, setPlans] = useState<{ cle: number; index: number }[]>([{ cle: planDepart, index: planDepart }]);
  const compteur = useRef(planDepart);
  const entree = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entree, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [entree]);

  useEffect(() => {
    const t = setInterval(() => {
      compteur.current += 1;
      const n = compteur.current;
      setPlans((cur) => [cur[cur.length - 1], { cle: n, index: n % PLANS_ENTREE.length }]);
    }, PLAN_MS);
    return () => clearInterval(t);
  }, []);

  // Les photos des plans sont chargees a l'avance, pour eviter un flash (rien sur le web)
  useEffect(() => {
    if (typeof Image.resolveAssetSource !== 'function') return;
    PLANS_ENTREE.forEach((p) => {
      try {
        const src = Image.resolveAssetSource(PHOTOS[p] as number);
        if (src?.uri) void Image.prefetch(src.uri).catch(() => undefined);
      } catch {
        // une photo non prechargee s'affiche quand meme, un peu plus tard
      }
    });
  }, []);

  const e = useMemo(
    () =>
      StyleSheet.create({
        haut: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
        marque: { fontFamily: FONT.titre, fontSize: 52, lineHeight: 60, letterSpacing: 2, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 16, textShadowOffset: { width: 0, height: 2 } },
        phrase: { fontFamily: FONT.texteSemi, fontSize: 14.5, lineHeight: 20, color: '#FFFFFF', textAlign: 'center', marginTop: 4, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 10 },
        langue: { position: 'absolute', left: 14, flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 11, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
        langueCode: { fontFamily: FONT.texteSemi, fontSize: 12.5, color: '#FFFFFF', letterSpacing: 0.4 },
        voile: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
        fenetre: { width: '100%', maxWidth: 380, borderRadius: 24, backgroundColor: '#FFFFFF', paddingTop: 18, paddingBottom: 8, overflow: 'hidden' },
        fenetreTitre: { fontFamily: FONT.titre, fontSize: 20, color: T.ink, textAlign: 'center', marginBottom: 10 },
        ligne: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 11 },
        ligneCode: { width: 30, fontFamily: FONT.texteSemi, fontSize: 12.5, color: T.sub },
        ligneNom: { flex: 1, fontFamily: FONT.texteMedium, fontSize: 16, color: T.ink, textAlign: 'left', writingDirection: 'ltr' },
        croix: { position: 'absolute', right: 14, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
        bas: { position: 'absolute', left: 22, right: 22, bottom: 0 },
        legal: { fontFamily: FONT.texte, fontSize: 11.5, lineHeight: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
        lien: { fontFamily: FONT.texteSemi, textDecorationLine: 'underline', color: '#FFFFFF' },
        secondaire: { fontFamily: FONT.texteSemi, fontSize: 13.5, color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 8 },
        discret: { fontFamily: FONT.texteMedium, fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
      }),
    [T],
  );

  const choisir = (code: Lang) => {
    setLangues(false);
    if (code === LANG) return;
    vibre.choix();
    void choisirLangue(code);
  };

  // La phrase des conditions est traduite en entier, les deux liens gardent leur place dans chaque langue
  const legal = traduire('En continuant, tu confirmes avoir 13 ans ou plus et tu acceptes nos {0} et notre {1}.', '\u0000', '\u0001');

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        {plans.map((p) => (
          <Plan key={p.cle} index={p.index} width={width} height={height} />
        ))}
      </View>
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
        locations={[0, 0.28, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Animated.View style={[e.haut, { top: insets.top + height * 0.08, opacity: entree }]} pointerEvents="none">
        <Txt style={e.marque} accessibilityRole="header">YOROI</Txt>
        <Txt style={e.phrase}>{traduire('Ton poids, tes séances, tes progrès. Sur ton téléphone.')}</Txt>
      </Animated.View>

      <Pressable
        onPress={() => {
          vibre.choix();
          setLangues(true);
        }}
        hitSlop={10}
        style={[e.langue, { top: insets.top + 8 }]}
        accessibilityRole="button"
        accessibilityLabel={LANGUES_INFO[LANG].nom}
      >
        <Ionicons name="globe-outline" size={14} color="#FFFFFF" />
        <Txt style={e.langueCode}>{LANGUES_INFO[LANG].code}</Txt>
        <Ionicons name="chevron-down" size={13} color="rgba(255,255,255,0.85)" />
      </Pressable>

      <Modal visible={langues} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setLangues(false)}>
        <Pressable style={e.voile} onPress={() => setLangues(false)} accessibilityRole="button" accessibilityLabel={traduire('Fermer')}>
          <Pressable style={[e.fenetre, { maxHeight: height * 0.72 }]} onPress={() => undefined}>
            <Txt style={e.fenetreTitre}>{traduire('Langue')}</Txt>
            <ScrollView showsVerticalScrollIndicator={false}>
              {LANGUES_ACTIVES.map((code) => {
                const actif = code === LANG;
                return (
                  <Pressable
                    key={code}
                    onPress={() => choisir(code)}
                    style={({ pressed }) => [e.ligne, actif && { backgroundColor: T.card }, pressed && { opacity: 0.6 }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: actif }}
                  >
                    <Txt style={e.ligneCode}>{LANGUES_INFO[code].code}</Txt>
                    <Txt numberOfLines={1} style={[e.ligneNom, actif && { fontFamily: FONT.texteSemi }]}>{LANGUES_INFO[code].nom}</Txt>
                    {actif ? <Ionicons name="checkmark-circle" size={20} color={T.acc} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {onClose ? (
        <Pressable onPress={onClose} hitSlop={12} style={[e.croix, { top: insets.top + 6 }]} accessibilityRole="button" accessibilityLabel={traduire('Fermer l’aperçu')}>
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.85)" />
        </Pressable>
      ) : null}

      <Animated.View style={[e.bas, { paddingBottom: Math.max(insets.bottom, 14) + 6, opacity: entree }]}>
        <Bouton label={traduire('Commencer')} onPress={onStart} fond="#FFFFFF" encre={T.ink} />
        {onSauvegarde ? (
          <Pressable onPress={restauration ? undefined : onSauvegarde} hitSlop={8} style={{ alignSelf: 'center', marginTop: 16, paddingVertical: 2 }} accessibilityRole="button">
            <Txt style={e.secondaire}>{restauration ? traduire('Restauration en cours') : traduire('J’ai déjà une sauvegarde')}</Txt>
          </Pressable>
        ) : null}
        {onReprise ? (
          <Pressable onPress={onReprise} hitSlop={8} style={{ alignSelf: 'center', marginTop: 12, paddingVertical: 2 }} accessibilityRole="button">
            <Txt style={e.secondaire}>{traduire('Tu viens d’une autre app de muscu ? Ramène tout')}</Txt>
          </Pressable>
        ) : null}
        <Pressable onPress={onRestaurerAchats} hitSlop={10} style={{ alignSelf: 'center', marginTop: 12, marginBottom: 12, paddingVertical: 2 }} accessibilityRole="button">
          <Txt style={e.discret}>{traduire('Restaurer mes achats')}</Txt>
        </Pressable>
        <Txt style={e.legal}>
          {legal.split(/([\u0000\u0001])/).map((m, i) =>
            m === '\u0000' ? (
              <Txt key={i} style={[e.legal, e.lien]} onPress={onConditions} accessibilityRole="link">{traduire('Conditions d’utilisation')}</Txt>
            ) : m === '\u0001' ? (
              <Txt key={i} style={[e.legal, e.lien]} onPress={onConfidentialite} accessibilityRole="link">{traduire('Politique de confidentialité')}</Txt>
            ) : (
              m
            ),
          )}
        </Txt>
      </Animated.View>

      {/* premier lancement : la sauvegarde iCloud trouvee, dans une fenetre centree */}
      {offre ? (
        <Alerte
          visible={offreVisible}
          titre={traduire('Retrouver tes données du {0} ?', jourMois(new Date(offre.modifiedAt), true, 'long'))}
          texte={traduire('Ta dernière sauvegarde YOROI est dans ton iCloud. Tes séances, tes pesées et ton Dojo reviennent sur ce téléphone.')}
          boutons={[
            { label: traduire('Commencer à zéro'), onPress: offre.onZero },
            { label: traduire('Retrouver'), principal: true, onPress: offre.onRetrouver },
          ]}
          onFerme={() => setOffreVisible(false)}
          illustration={<Sticker nom="sauvegarde" taille={72} style={{ alignSelf: 'center', marginBottom: 10 }} />}
        />
      ) : null}
    </View>
  );
}
