/**
 * onboarding-neuf/PaywallOffre.tsx : l'ecran 3 du paywall, l'offre, copie d'INRO (components/onboarding-nuit/Fin.tsx,
 * Paywall, variante « offre »).
 *
 * La feuille monte du bas (depuis 25 % de la hauteur, 340 ms). Grande photo en haut (photo 18), voile noir en haut
 * pour le logo et en bas ou la carte se pose. Petit chevron pour fermer, YOROI au centre. « Choisis ta formule », la
 * vraie note et 2 vrais avis (les deux plus courts) dans des bulles sur la photo. Les formules en carrousel
 * horizontal (aimante) : l'annuel en premier et choisi d'office, badge « Populaire », prix par semaine en gros, prix
 * total en petit, pastille d'economie (calculee), essai avec une icone cadeau. En bas : « Rien à payer aujourd'hui »,
 * la date du premier paiement, comment annuler, la mention legale de YOROI, le bouton, « Continuer gratuitement »
 * et les liens.
 *
 * Prix, essai, economie : toujours lus dans les offres du store (formules.ts). Achat : usePremium().purchase, comme
 * le paywall actuel. En apercu du Studio, la feuille d'achat d'Apple est simulee par une fenetre centree.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LiensLegaux } from '@/components/yoroi/v2/premium/LiensLegaux';
import { storeRating } from '@/lib/v2/premium/offer';
import { AVIS_STORES } from '@/lib/v2/premium/preuveSociale';
import { paywallEvent } from '@/lib/v2/premium/events';
import { longDate, storeName } from '@/lib/v2/onboarding/trial';
import { jourMois, traduire, traduirePluriel } from '@/lib/i18n/tr';
import { Alerte, Bouton, ND, Txt, alpha } from './kit';
import { usePremiumSur, type EtatFormules, type Formule } from './formules';
import { FONT, ICONE_YOROI, PHOTOS, PHOTO_PAYWALL, useNuit } from './theme';

const SUR_PHOTO = '#FFFFFF';
const SUR_PHOTO_DOUX = 'rgba(255,255,255,0.8)';
const VOILE = (a: number) => `rgba(0,0,0,${a})`;

/** Les deux avis les plus courts, mot pour mot */
const AVIS_PAYWALL = [...AVIS_STORES].sort((a, b) => a.texte.length - b.texte.length).slice(0, 2);

/** La date du premier paiement : aujourd'hui plus les jours d'essai lus dans le store */
export function datePaiement(fin: Date): string {
  return jourMois(fin, false, 'long');
}

export type ResultatAchat = { essaiFin: Date | null };

export function PaywallOffre({ formules, apercu, onAchat, onFermer, onAnnule, onConditions, onConfidentialite, onReessayer }: {
  formules: EtatFormules;
  apercu: boolean;
  /** achat ou essai reussi (ou restaure) */
  onAchat: (r: ResultatAchat) => void;
  /** le chevron et « Continuer gratuitement » : l'offre de rattrapage si elle est possible, sinon la fin */
  onFermer: () => void;
  /** l'achat annule sur la feuille de paiement : l'offre de rattrapage si elle est possible */
  onAnnule: () => void;
  onConditions: () => void;
  onConfidentialite: () => void;
  onReessayer: () => void;
}) {
  const T = useNuit();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const premium = usePremiumSur();
  const note = storeRating();

  const entree = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entree, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
    paywallEvent('affichage', { source: 'onboarding', apercu });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liste = formules.formules;
  const carteL = Math.min(width - 84, 350);
  const ecart = 12;
  const pas = carteL + ecart;
  const marge = (width - carteL) / 2;
  const carteH = 172;
  const [choix, setChoix] = useState(0);
  const defile = useRef<ScrollView>(null);
  const selection: Formule | undefined = liste[Math.min(choix, Math.max(0, liste.length - 1))];
  const surDefilement = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(liste.length - 1, Math.round(e.nativeEvent.contentOffset.x / pas)));
    if (i !== choix) {
      setChoix(i);
      const f = liste[i];
      if (f) paywallEvent('choix_formule', { source: 'onboarding', formule: f.info.kind, apercu });
    }
  };
  const viser = (i: number) => {
    setChoix(i);
    defile.current?.scrollTo({ x: i * pas, animated: true });
  };

  const [hBas, setHBas] = useState(300 + Math.max(insets.bottom, 12));
  const carteHaut = Math.max(insets.top + 250, height - hBas - carteH - 10);
  const photoH = carteHaut + carteH * 0.5;

  const [attente, setAttente] = useState(false);
  const [feuille, setFeuille] = useState(false);
  const [alerte, setAlerte] = useState<{ titre: string; texte?: string } | null>(null);
  const essai = selection?.essai ?? null;

  const acheter = async () => {
    if (!selection || attente) return;
    paywallEvent('appui_bouton', { source: 'onboarding', formule: selection.info.kind, essai: Boolean(essai), apercu });
    if (apercu) {
      setFeuille(true);
      return;
    }
    if (!premium) {
      setAlerte({ titre: traduire('Boutique indisponible'), texte: traduire('Les offres ne sont pas encore chargées. Vérifie ta connexion et réessaie.') });
      return;
    }
    setAttente(true);
    const r = await premium.purchase(selection.pkg);
    setAttente(false);
    if (r.success) {
      paywallEvent('achat_reussi', { source: 'onboarding', formule: selection.info.kind, essai: Boolean(essai) });
      onAchat({ essaiFin: essai?.end ?? null });
      return;
    }
    if (r.cancelled) {
      paywallEvent('achat_annule', { source: 'onboarding', formule: selection.info.kind });
      onAnnule();
      return;
    }
    paywallEvent('achat_erreur', { source: 'onboarding', formule: selection.info.kind, raison: r.needsRestore ? 'acces_inactif' : 'erreur' });
    setAlerte({ titre: r.needsRestore ? traduire('Achat validé, Premium pas encore actif') : traduire('Achat impossible'), texte: r.error });
  };

  const restaurer = async () => {
    if (apercu) {
      setAlerte({ titre: traduire('Aperçu'), texte: traduire('Aperçu, aucun achat possible.') });
      return;
    }
    if (!premium || attente) return;
    setAttente(true);
    const r = await premium.restore();
    setAttente(false);
    paywallEvent('restauration', { source: 'onboarding', resultat: r.success ? (r.restored ? 'retrouve' : 'aucun') : 'erreur' });
    if (r.success && r.restored) onAchat({ essaiFin: null });
    else if (r.success) setAlerte({ titre: traduire('Aucun achat trouvé'), texte: traduire('Aucun abonnement actif n’est associé à ce compte {0}.', storeName()) });
    else setAlerte({ titre: traduire('Restauration impossible'), texte: r.error });
  };

  const store = Platform.OS === 'android' ? 'Google Play' : 'App Store';
  const mention = traduire(
    'Le paiement est débité sur ton compte {0} {1}. L’abonnement se renouvelle automatiquement au même prix, sauf résiliation au moins 24 heures avant la fin de la période en cours. Tu le gères et tu le résilies à tout moment dans les réglages de ton compte {2}. Supprimer l’app ne l’annule pas.',
    store,
    essai ? traduire('à la fin de l’essai gratuit') : traduire('à la confirmation de l’achat'),
    store,
  );

  return (
    <Animated.View style={{ flex: 1, backgroundColor: T.bg, transform: [{ translateY: entree.interpolate({ inputRange: [0, 1], outputRange: [height * 0.25, 0] }) }], opacity: entree.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }) }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: photoH, overflow: 'hidden' }}>
        <Image source={PHOTOS[PHOTO_PAYWALL]} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        <LinearGradient
          colors={[VOILE(0.92), VOILE(0.55), VOILE(0.05), VOILE(0.05), VOILE(0.6), VOILE(0.85)]}
          locations={[0, 0.14, 0.32, 0.5, 0.78, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={{ paddingTop: insets.top + 4, height: insets.top + 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
        <Pressable onPress={onFermer} hitSlop={14} style={{ width: 36, height: 36, justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel={traduire('Fermer')}>
          <Ionicons name="chevron-down" size={26} color={SUR_PHOTO_DOUX} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt style={f.logo}>YOROI</Txt>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <Txt style={f.titre}>{traduire('Choisis ta formule')}</Txt>

      <View style={{ position: 'absolute', left: 20, right: 20, top: carteHaut - 190, alignItems: 'center' }} pointerEvents="none">
        {note ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt style={f.note}>{note.note}</Txt>
            {[0, 1, 2, 3, 4].map((k) => <Ionicons key={k} name="star" size={15} color={T.or} />)}
            <Txt style={f.noteSous}>{traduirePluriel(note.total, note.total > 1, '· {0} note', '· {0} notes', note.total)}</Txt>
          </View>
        ) : null}
        {AVIS_PAYWALL.map((a) => (
          <View key={a.pseudo} style={f.avisBulle}>
            <Txt style={f.avisTxt} numberOfLines={3}>{`« ${a.texte} »`}</Txt>
            <Txt style={f.avisNom}>{`${a.pseudo} · ${a.store}`}</Txt>
          </View>
        ))}
      </View>

      <View style={{ position: 'absolute', top: carteHaut, left: 0, right: 0, height: carteH }}>
        {liste.length ? (
          <ScrollView
            ref={defile}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={pas}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: marge, gap: ecart }}
            onScroll={surDefilement}
            scrollEventThrottle={16}
          >
            {liste.map((x, i) => {
              const on = i === choix;
              return (
                <Pressable
                  key={x.id}
                  onPress={() => viser(i)}
                  style={[f.carte, { width: carteL, height: carteH, backgroundColor: T.bg, borderColor: on ? T.acc : T.line }, on && { borderWidth: 1.5 }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${x.info.short}, ${x.info.priceString} ${x.info.per}`}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Txt style={[f.badge, { color: x.id === 'annuel' ? T.acc : T.sub, flex: 1 }]}>{x.id === 'annuel' ? traduire('Populaire') : x.info.short}</Txt>
                    {on ? <Ionicons name="checkmark-circle" size={24} color={T.acc} /> : <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: T.line }} />}
                  </View>
                  <Txt style={[f.carteJour, { color: T.ink }]} numberOfLines={1} adjustsFontSizeToFit>
                    {x.parSemaine ?? x.info.priceString}
                    <Txt style={[f.carteJourUnite, { color: T.sub }]}>{x.parSemaine ? ` ${traduire('par semaine')}` : ` ${x.info.per}`}</Txt>
                  </Txt>
                  <Txt style={[f.cartePrix, { color: T.sub }]} numberOfLines={1}>{`${x.info.duration} · ${x.info.priceString} ${x.info.per}`}</Txt>
                  <View style={{ flex: 1 }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    {x.essai ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                        <Ionicons name="gift-outline" size={16} color={T.acc} />
                        <Txt numberOfLines={1} style={[f.carteEssai, { color: T.acc, flexShrink: 1 }]}>{traduirePluriel(x.essai.days, x.essai.days > 1, '{0} jour d’essai gratuit', '{0} jours d’essai gratuit', x.essai.days)}</Txt>
                      </View>
                    ) : (
                      <View />
                    )}
                    {x.economie != null ? (
                      <View style={[f.pilule, { backgroundColor: T.acc }]}>
                        <Txt style={[f.piluleTxt, { color: T.accInk }]}>{`-${x.economie} %`}</Txt>
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <View style={[f.carte, { marginHorizontal: marge, width: carteL, height: carteH, backgroundColor: T.bg, borderColor: T.line, alignItems: 'center', justifyContent: 'center' }]}>
            <Txt style={[f.cartePrix, { color: T.sub, textAlign: 'center' }]}>
              {formules.statut === 'loading' ? traduire('Chargement des offres…') : traduire('Les offres ne sont pas encore chargées. Vérifie ta connexion et réessaie.')}
            </Txt>
          </View>
        )}
      </View>

      <View onLayout={(e) => setHBas(Math.round(e.nativeEvent.layout.height))} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) }}>
        {selection && essai ? (
          <>
            <Txt style={[f.essai, { color: T.ink }]} numberOfLines={1} adjustsFontSizeToFit>{traduire('Rien à payer aujourd’hui')}</Txt>
            <Txt style={[f.total, { color: T.sub, marginTop: 2 }]} numberOfLines={1} adjustsFontSizeToFit>{traduire('Premier paiement le {0} : {1}', datePaiement(essai.end), selection.info.priceString)}</Txt>
          </>
        ) : selection ? (
          <Txt style={[f.total, { color: T.ink }]} numberOfLines={1} adjustsFontSizeToFit>{`${selection.info.priceString} ${selection.info.per}`}</Txt>
        ) : null}
        {selection ? <Txt style={[f.total, { color: T.sub, marginTop: 2, fontSize: 12.5 }]} numberOfLines={2}>{traduire('Annule quand tu veux dans les réglages de ton compte {0}.', store)}</Txt> : null}
        <Txt style={[f.mention, { color: T.sub }]}>{mention}</Txt>
        <View style={{ marginTop: 10 }}>
          {selection ? (
            <Bouton label={traduire('Continuer')} onPress={() => void acheter()} chargement={attente} />
          ) : (
            <Bouton label={traduire('Réessayer')} onPress={onReessayer} chargement={formules.statut === 'loading'} />
          )}
        </View>
        <Pressable onPress={onFermer} hitSlop={6} style={{ alignSelf: 'center', marginTop: 8, minHeight: 32, justifyContent: 'center' }} accessibilityRole="button">
          <Txt style={[f.gratuit, { color: T.sub }]}>{traduire('Continuer gratuitement')}</Txt>
        </Pressable>
        <LiensLegaux
          size={11.5}
          liens={[
            { label: traduire('Confidentialité'), onPress: onConfidentialite },
            { label: traduire('Conditions'), onPress: onConditions },
            { label: traduire('Restaurer'), onPress: () => void restaurer(), role: 'button' },
          ]}
        />
      </View>

      {/* apercu : la feuille de paiement d'Apple, simulee par une fenetre centree */}
      <Alerte
        visible={feuille}
        titre={traduire('Achat in-app')}
        boutons={[
          { label: traduire('Annuler'), onPress: () => setTimeout(onAnnule, 220) },
          { label: traduire('Acheter'), principal: true, onPress: () => setTimeout(() => onAchat({ essaiFin: essai?.end ?? null }), 220) },
        ]}
        onFerme={() => setFeuille(false)}
        illustration={<Image source={ICONE_YOROI} style={{ width: 56, height: 56, borderRadius: 13, alignSelf: 'center', marginBottom: 12 }} />}
      >
        <Txt style={{ fontFamily: FONT.texteSemi, fontSize: 15, color: T.ink, textAlign: 'center', marginTop: 8 }}>{`YOROI Premium · ${selection?.info.short ?? ''}`}</Txt>
        <Txt style={{ fontFamily: FONT.texte, fontSize: 13, color: T.sub, textAlign: 'center', marginTop: 4 }}>
          {essai ? traduire('Essai gratuit jusqu’au {0}', longDate(essai.end)) : `${selection?.info.priceString ?? ''} ${selection?.info.per ?? ''}`}
        </Txt>
        <Txt style={{ fontFamily: FONT.texte, fontSize: 12, color: alpha(T.sub, 0.9), textAlign: 'center', marginTop: 6 }}>{traduire('Aperçu, aucun achat possible.')}</Txt>
      </Alerte>

      <Alerte visible={!!alerte} titre={alerte?.titre ?? ''} texte={alerte?.texte} boutons={[{ label: traduire('J’ai compris'), principal: true }]} onFerme={() => setAlerte(null)} />
    </Animated.View>
  );
}

const f = StyleSheet.create({
  logo: { fontFamily: FONT.titre, fontSize: 34, lineHeight: 42, letterSpacing: 2, color: SUR_PHOTO, textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 2 } },
  titre: { fontFamily: FONT.titre, fontSize: 29, lineHeight: 34, letterSpacing: -0.4, color: SUR_PHOTO, textAlign: 'center', marginTop: 6, paddingHorizontal: 24 },
  note: { fontFamily: FONT.titre, fontSize: 22, color: SUR_PHOTO },
  noteSous: { fontFamily: FONT.texteMedium, fontSize: 13, color: SUR_PHOTO },
  avisBulle: { marginTop: 8, alignSelf: 'stretch', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: VOILE(0.45) },
  avisTxt: { fontFamily: FONT.texte, fontSize: 13, lineHeight: 18, color: SUR_PHOTO },
  avisNom: { fontFamily: FONT.texteSemi, fontSize: 11.5, color: SUR_PHOTO_DOUX, marginTop: 3 },
  carte: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  badge: { fontFamily: FONT.texteSemi, fontSize: 13, height: 18 },
  carteJour: { fontFamily: FONT.titre, fontSize: 36, lineHeight: 42, letterSpacing: -1, marginTop: 4 },
  carteJourUnite: { fontFamily: FONT.texteSemi, fontSize: 16, letterSpacing: 0 },
  cartePrix: { fontFamily: FONT.texteMedium, fontSize: 14, marginTop: 2 },
  carteEssai: { fontFamily: FONT.texteSemi, fontSize: 14 },
  pilule: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  piluleTxt: { fontFamily: FONT.texteSemi, fontSize: 14 },
  essai: { fontFamily: FONT.titreBold, fontSize: 19, textAlign: 'center' },
  total: { fontFamily: FONT.texteMedium, fontSize: 14, textAlign: 'center' },
  mention: { fontFamily: FONT.texte, fontSize: 9.5, lineHeight: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 8 },
  gratuit: { fontFamily: FONT.texteSemi, fontSize: 13.5, textDecorationLine: 'underline' },
});
