/**
 * onboarding-neuf/Rattrapage.tsx : l'offre de rattrapage, copie d'INRO (components/onboarding-nuit/Fin.tsx, Rattrapage).
 *
 * Voile noir a 50 %, la feuille monte du bas (360 ms, sans rebond) ; on peut la tirer vers le bas pour la fermer
 * (plus de 140 points, ou un geste rapide). Mosaique : photos 3, 7 et 16 en haut, 17 a gauche et 1 a droite au
 * milieu, l'icone de YOROI et son nom au centre. « Ton offre unique », « 30 % DE RÉDUCTION », le sticker alerte et
 * « Cette offre ne sera plus disponible une fois fermée ! », l'encadre de l'offre (prix par semaine, ancien prix barre,
 * nouveau prix la premiere annee), le bouton, la ligne du renouvellement et les liens. La croix ferme pour de bon.
 *
 * Une seule fois par appareil (lib/v2/premium/rattrapage.ts), et seulement si le store peut la vendre (la regle est
 * dans parcours.ts, rattrapageVisible). Prix lus dans les offres reelles, jamais ecrits en dur.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, Easing, Image, PanResponder, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { safeOpenURL } from '@/lib/security/validators';
import { RATTRAPAGE_POURCENT, acheterRattrapage, marquerRattrapageVu, prixRattrapage } from '@/lib/v2/premium/rattrapage';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { Alerte, Bouton, Sticker, Txt } from './kit';
import { usePremiumSur, type EtatFormules } from './formules';
import type { Mesure } from './mesure';
import { FONT, ICONE_YOROI, MOSAIQUE_RATTRAPAGE, PHOTOS, useNuit } from './theme';

const VOILE = (a: number) => `rgba(0,0,0,${a})`;

export function Rattrapage({ formules, apercu, mesure, onAchat, onFermer, onConditions }: {
  formules: EtatFormules;
  apercu: boolean;
  /** la mesure de l'offre (onboarding : creerMesure ; paywall de l'app : source de l'ouverture) */
  mesure: Pick<Mesure, 'rattrapage'>;
  onAchat: () => void;
  /** la croix (ou la feuille tiree vers le bas) : ferme pour de bon */
  onFermer: () => void;
  onConditions: () => void;
}) {
  const T = useNuit();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const premium = usePremiumSur();
  const premiumRef = useRef(premium);
  premiumRef.current = premium;
  const annuel = formules.annuel;
  const prix = prixRattrapage({ plateforme: Platform.OS, rawAnnuel: annuel?.pkg.raw ?? null, prixAnnuel: annuel?.info.price ?? null, devise: annuel?.info.currency ?? null });
  const ancien = annuel?.info.priceString ?? null;

  const y = useRef(new Animated.Value(height)).current;
  const fermeture = useRef(false);
  useEffect(() => {
    Animated.timing(y, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    if (!apercu) {
      mesure.rattrapage('vue');
      // « Cette offre ne sera plus disponible une fois fermée » doit etre vrai : elle ne revient plus jamais
      void marquerRattrapageVu();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [occupe, setOccupe] = useState(false);
  const [feuille, setFeuille] = useState(false);
  const [alerte, setAlerte] = useState<{ titre: string; texte?: string } | null>(null);

  const fermer = () => {
    if (fermeture.current) return;
    fermeture.current = true;
    if (!apercu) mesure.rattrapage('refus');
    Animated.timing(y, { toValue: height, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => onFermer());
  };

  // iPhone : au retour de l'App Store, on relit l'abonnement ; actif, c'est un achat, sinon on ferme pour de bon
  const attenteRetour = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active' || !attenteRetour.current) return;
      attenteRetour.current = false;
      void (async () => {
        setOccupe(true);
        await premiumRef.current?.refresh().catch(() => undefined);
        await new Promise((r) => setTimeout(r, 600));
        setOccupe(false);
        if (premiumRef.current?.isPremium) {
          mesure.rattrapage('ok');
          onAchat();
        } else fermer();
      })();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acheter = async () => {
    if (apercu) {
      setFeuille(true);
      return;
    }
    if (occupe) return;
    mesure.rattrapage('tap');
    setOccupe(true);
    const r = await acheterRattrapage({ plateforme: Platform.OS, rawAnnuel: annuel?.pkg.raw ?? null, ouvrir: (url) => safeOpenURL(url) });
    if (r.ouvert) {
      attenteRetour.current = true;
      setOccupe(false);
      return;
    }
    if (r.success) {
      await premium?.refresh().catch(() => undefined);
      setOccupe(false);
      mesure.rattrapage('ok');
      onAchat();
      return;
    }
    setOccupe(false);
    if (r.error) setAlerte({ titre: traduire('Achat impossible'), texte: r.error === 'offre_absente' || r.error === 'store_absent' ? traduire('Les offres ne sont pas encore chargées. Vérifie ta connexion et réessaie.') : r.error });
  };

  const restaurer = async () => {
    if (apercu) {
      setAlerte({ titre: traduire('Aperçu'), texte: traduire('Aperçu, aucun achat possible.') });
      return;
    }
    if (!premium || occupe) return;
    setOccupe(true);
    const r = await premium.restore();
    setOccupe(false);
    if (r.success && r.restored) onAchat();
    else if (r.success) setAlerte({ titre: traduire('Aucun achat trouvé'), texte: traduire('Aucun abonnement actif n’est associé à ce compte {0}.', Platform.OS === 'android' ? 'Google Play' : 'App Store') });
    else setAlerte({ titre: traduire('Restauration impossible'), texte: r.error });
  };

  const geste = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.4,
      onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 140 || g.vy > 0.9) fermer();
        else Animated.timing(y, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        Animated.timing(y, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      },
    }),
  ).current;

  const g = 8;
  const colC = Math.round(width * 0.27);
  const colM = width - 2 * colC - 2 * g;
  // 21 novembre 2026 : un peu plus basses qu'INRO, l'encadre de l'offre tient en entier sur un iPhone de 852 points
  const l1 = Math.round(height * 0.19);
  const l2 = Math.round(height * 0.16) - 14;
  const compact = height < 800;
  const DESCENTE = 12;
  const icone = Math.min(76, l2 - 44);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: VOILE(0.5), opacity: y.interpolate({ inputRange: [0, height], outputRange: [1, 0], extrapolate: 'clamp' }) }]} />
      <Animated.View {...geste.panHandlers} style={[st.feuille, { backgroundColor: T.bg, transform: [{ translateY: y }] }]}>
        <View style={{ height: l1 + g + l2, marginTop: DESCENTE }}>
          <View style={{ flexDirection: 'row', gap: g, height: l1 }}>
            <Image source={PHOTOS[MOSAIQUE_RATTRAPAGE.haut[0]]} resizeMode="cover" style={[st.tuile, { width: colC, height: l1, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]} />
            <Image source={PHOTOS[MOSAIQUE_RATTRAPAGE.haut[1]]} resizeMode="cover" style={[st.tuile, { width: colM, height: l1, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]} />
            <Image source={PHOTOS[MOSAIQUE_RATTRAPAGE.haut[2]]} resizeMode="cover" style={[st.tuile, { width: colC, height: l1, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]} />
          </View>
          <View style={{ flexDirection: 'row', gap: g, height: l2, marginTop: g }}>
            <Image source={PHOTOS[MOSAIQUE_RATTRAPAGE.gauche]} resizeMode="cover" style={[st.tuile, { width: colC, height: l2 }]} />
            <View style={{ width: colM, height: l2, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={ICONE_YOROI} style={{ width: icone, height: icone, borderRadius: icone * 0.23 }} />
              <Txt style={[st.mosaiqueNom, { color: T.ink }]}>YOROI</Txt>
            </View>
            <Image source={PHOTOS[MOSAIQUE_RATTRAPAGE.droite]} resizeMode="cover" style={[st.tuile, { width: colC, height: l2 }]} />
          </View>
          <Pressable onPress={fermer} hitSlop={12} style={[st.croix, { top: insets.top + 4 - DESCENTE }]} accessibilityRole="button" accessibilityLabel={traduire('Fermer l’offre')}>
            <Ionicons name="close" size={14} color="rgba(255,255,255,0.9)" />
          </Pressable>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: compact ? 12 : 22, alignItems: 'center' }}>
          <Txt style={[st.offreSur, { color: T.ink }]}>{traduire('Ton offre unique')}</Txt>
          <Txt style={[st.offre, { color: T.acc }, compact && { fontSize: 38, lineHeight: 42 }]} numberOfLines={2} adjustsFontSizeToFit>{traduire('{0} % DE RÉDUCTION', RATTRAPAGE_POURCENT)}</Txt>
          <View style={{ flex: 1, minHeight: 8 }} />
          <View style={st.alerte}>
            <Sticker nom="alerte" taille={24} />
            <Txt style={[st.alerteTxt, { color: T.ink }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{traduire('Cette offre ne sera plus disponible une fois fermée !')}</Txt>
          </View>
          <View style={[st.encadre, { borderColor: T.ink }]}>
            <View style={[st.encadreTete, { backgroundColor: T.ink }]}>
              <Txt style={[st.encadreTeteTxt, { color: T.bg }]}>{traduire('TON OFFRE EXCLUSIVE')}</Txt>
            </View>
            <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Txt style={[st.encadreTitre, { color: T.ink, flex: 1 }]}>{traduire('YOROI Premium · 1 an')}</Txt>
                <View style={[st.pilule, { backgroundColor: T.acc }]}>
                  <Txt style={[st.piluleTxt, { color: T.accInk }]}>{`-${RATTRAPAGE_POURCENT} %`}</Txt>
                </View>
              </View>
              {prix.parSemaine ? (
                <Txt style={[st.carteJour, { color: T.ink }]} numberOfLines={1} adjustsFontSizeToFit>
                  {prix.parSemaine}
                  <Txt style={[st.carteJourUnite, { color: T.sub }]}>{` ${traduire('par semaine')}`}</Txt>
                </Txt>
              ) : null}
              <Txt style={[st.cartePrix, { color: T.sub }]}>
                {ancien ? <Txt style={{ textDecorationLine: 'line-through' }}>{ancien}</Txt> : null}
                {ancien ? '  ' : ''}
                <Txt style={{ color: T.ink, fontFamily: FONT.texteSemi }}>{prix.premiereAnnee ?? ''}</Txt>
                {prix.premiereAnnee ? ` ${traduire('la première année')}` : ''}
              </Txt>
              {prix.essaiJours ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <Ionicons name="gift-outline" size={16} color={T.acc} />
                  <Txt style={[st.carteEssai, { color: T.acc }]}>{traduirePluriel(prix.essaiJours, prix.essaiJours > 1, '{0} jour d’essai gratuit', '{0} jours d’essai gratuit', prix.essaiJours)}</Txt>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: Math.max(insets.bottom, 12) + 4 }}>
          {occupe ? (
            <View style={[st.attente, { backgroundColor: T.mute }]}>
              <ActivityIndicator color={T.ink} />
            </View>
          ) : (
            <Bouton label={traduire('Continuer')} onPress={() => void acheter()} />
          )}
          {ancien ? <Txt style={[st.renouvelle, { color: T.ink }]}>{traduire('Se renouvelle à {0} par an après la première année', ancien)}</Txt> : null}
          <View style={st.liens}>
            <Pressable onPress={onConditions} hitSlop={8} accessibilityRole="link">
              <Txt style={[st.lien, { color: T.sub }]}>{traduire('Conditions de paiement')}</Txt>
            </Pressable>
            <Pressable onPress={() => void restaurer()} hitSlop={8} accessibilityRole="button">
              <Txt style={[st.lien, { color: T.sub }]}>{traduire('Restaurer les achats')}</Txt>
            </Pressable>
          </View>
        </View>

        <Alerte
          visible={feuille}
          titre={traduire('Achat in-app')}
          boutons={[
            { label: traduire('Annuler') },
            { label: traduire('Acheter'), principal: true, onPress: () => setTimeout(onAchat, 220) },
          ]}
          onFerme={() => setFeuille(false)}
          illustration={<Image source={ICONE_YOROI} style={{ width: 56, height: 56, borderRadius: 13, alignSelf: 'center', marginBottom: 12 }} />}
        >
          <Txt style={{ fontFamily: FONT.texteSemi, fontSize: 15, color: T.ink, textAlign: 'center', marginTop: 8 }}>{traduire('YOROI Premium · 1 an')}</Txt>
          <Txt style={{ fontFamily: FONT.texte, fontSize: 13, color: T.sub, textAlign: 'center', marginTop: 4 }}>{traduire('-{0} % la première année', RATTRAPAGE_POURCENT)}</Txt>
          <Txt style={{ fontFamily: FONT.texte, fontSize: 12, color: T.sub, textAlign: 'center', marginTop: 6 }}>{traduire('Aperçu, aucun achat possible.')}</Txt>
        </Alerte>
        <Alerte visible={!!alerte} titre={alerte?.titre ?? ''} texte={alerte?.texte} boutons={[{ label: traduire('J’ai compris'), principal: true }]} onFerme={() => setAlerte(null)} />
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  feuille: { flex: 1, borderTopLeftRadius: 14, borderTopRightRadius: 14, overflow: 'hidden' },
  tuile: { borderRadius: 10 },
  mosaiqueNom: { fontFamily: FONT.titre, fontSize: 22, letterSpacing: 2, marginTop: 8 },
  croix: { position: 'absolute', right: 12, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  offreSur: { fontFamily: FONT.texteMedium, fontSize: 20 },
  offre: { fontFamily: FONT.titre, fontSize: 42, lineHeight: 46, letterSpacing: -0.6, textAlign: 'center', marginTop: 4 },
  alerte: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14, paddingHorizontal: 4 },
  alerteTxt: { flexShrink: 1, fontFamily: FONT.texteMedium, fontSize: 15.5, lineHeight: 20, textAlign: 'center' },
  encadre: { alignSelf: 'stretch', borderRadius: 12, borderWidth: 2, overflow: 'hidden' },
  encadreTete: { paddingVertical: 6, alignItems: 'center' },
  encadreTeteTxt: { fontFamily: FONT.titreBold, fontSize: 12.5, letterSpacing: 0.6 },
  encadreTitre: { fontFamily: FONT.titreBold, fontSize: 17 },
  pilule: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  piluleTxt: { fontFamily: FONT.titreBold, fontSize: 17 },
  carteJour: { fontFamily: FONT.titre, fontSize: 32, lineHeight: 38, letterSpacing: -1, marginTop: 4 },
  carteJourUnite: { fontFamily: FONT.texteSemi, fontSize: 16, letterSpacing: 0 },
  cartePrix: { fontFamily: FONT.texteMedium, fontSize: 14, marginTop: 2 },
  carteEssai: { fontFamily: FONT.texteSemi, fontSize: 14 },
  attente: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  renouvelle: { fontFamily: FONT.texte, fontSize: 12, textAlign: 'center', marginTop: 10 },
  liens: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 8 },
  lien: { fontFamily: FONT.texte, fontSize: 11.5, textDecorationLine: 'underline' },
});
