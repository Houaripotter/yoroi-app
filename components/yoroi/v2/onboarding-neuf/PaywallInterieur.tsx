/**
 * onboarding-neuf/PaywallInterieur.tsx
 *
 * Le paywall qu'on ouvre DANS l'app (Reglages, un contenu Premium, un mur), avec le design du nouvel onboarding,
 * copie d'INRO (components/onboarding-nuit/PaywallInterieur.tsx, 22 novembre 2026, demande de Houari) :
 * un bandeau photo arrondi avec une phrase, les formules en cartes cote a cote, la liste vraie de ce que Premium
 * ajoute (lib/v2/premium/offer.ts, PREMIUM_ROWS), ce qui reste gratuit, la vraie note des stores, puis la mention
 * legale, un bouton qui donne le vrai prix et les liens (confidentialite, conditions, contrat Apple, restaurer).
 *
 * Branche par app/paywall.tsx quand l'interrupteur du nouvel onboarding est allume
 * (lib/v2/onboarding/interrupteur.ts) ; sinon l'ancien paywall (components/yoroi/v2/premium/Paywall.tsx).
 *
 * La logique d'achat est celle de l'ancien paywall, sans changement : usePremium().purchase et restore
 * (context/PremiumContext.tsx n'est pas touche), memes evenements de mesure (paywallEvent), meme bienvenue Premium
 * apres l'achat (Welcome) et meme rappel 2 jours avant la fin de l'essai (scheduleTrialReminder). Un achat valide mais
 * pas encore actif propose de restaurer. Prix, periodes, essai et economie : toujours lus dans les offres du store.
 * La croix montre une fois l'offre de rattrapage, seulement si le store peut la vendre (lib/v2/premium/rattrapage.ts).
 * Apercu (/paywall?preview=1) : aucun achat, aucune restauration, prix d'exemple marques comme tels si le store ne
 * renvoie rien.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { PREMIUM_ROWS, FREE_FOREVER, storeRating, type PremiumRow } from '@/lib/v2/premium/offer';
import { paywallEvent } from '@/lib/v2/premium/events';
import { SOURCES, estSourcePremium, type SourcePaywall } from '@/lib/v2/premium/sources';
import { RATTRAPAGE_IOS_CODE_CREE, optionRattrapage, rattrapageDejaVu } from '@/lib/v2/premium/rattrapage';
import { scheduleTrialReminder, storeName } from '@/lib/v2/onboarding/trial';
import { PREVIEW_PURCHASE_MESSAGE } from '@/lib/v2/creator/purchasePreview';
import { getProfile } from '@/lib/database';
import { getEspace } from '@/lib/v2/espace';
import { safeOpenURL } from '@/lib/security/validators';
import { playLevelUpSound } from '@/lib/soundManager';
import { track } from '@/utils/telemetry';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { Welcome } from '@/components/yoroi/v2/premium/Paywall';
import { Alerte, Bouton, ND, Sticker, Txt } from './kit';
import { useFormules, usePremiumSur, type Formule } from './formules';
import { rattrapageVisible } from './parcours';
import { Rattrapage } from './Rattrapage';
import { FONT, PALETTE, PHOTOS, PaletteProvider, useNuit, type CleePhoto } from './theme';

const APPLE_EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const JOUR = 86400000;
/** Le rappel de fin d'essai part 2 jours avant (lib/v2/onboarding/trial.ts) */
const JOURS_RAPPEL = 2;

/** Les photos du bandeau, dans l'ordre (elles tournent en fondu) */
const BANDEAU: CleePhoto[] = ['photo_10', 'photo_11', 'photo_12', 'photo_13', 'photo_14'];

/** L'icone de chaque ligne de PREMIUM_ROWS */
const ICONES: Record<string, keyof typeof Ionicons.glyphMap> = {
  courbes: 'stats-chart-outline',
  analyses: 'analytics-outline',
  combat: 'trophy-outline',
  carnet: 'videocam-outline',
  photos: 'images-outline',
  monde: 'color-palette-outline',
};

type Fete = { essaiFin: Date | null; restaure: boolean };

/** L'ecran entier (fournisseurs de la palette et des marges), comme ApercuPaywallInterieur d'INRO */
export function PaywallInterieurEcran(props: {
  origine?: SourcePaywall;
  compteur?: number | null;
  apercu: boolean;
  onFini: (how: 'free' | 'premium') => void;
}) {
  return (
    <SafeAreaProvider>
      <PaletteProvider value={PALETTE}>
        <View style={{ flex: 1, backgroundColor: PALETTE.bg }}>
          <StatusBar barStyle="dark-content" backgroundColor={PALETTE.bg} />
          <PaywallInterieur {...props} />
        </View>
      </PaletteProvider>
    </SafeAreaProvider>
  );
}

export function PaywallInterieur({ origine, compteur = null, apercu, onFini }: {
  /** d'ou vient le paywall (mur Premium, reglages...), pour la mesure et la phrase du bandeau */
  origine?: SourcePaywall;
  /** compteur reel passe par le mur (photos deja prises...), null sinon */
  compteur?: number | null;
  apercu: boolean;
  onFini: (how: 'free' | 'premium') => void;
}) {
  const T = useNuit();
  const insets = useSafeAreaInsets();
  const premium = usePremiumSur();
  const formules = useFormules(apercu);
  const src: SourcePaywall = origine ?? 'app';
  const mur = estSourcePremium(origine) ? SOURCES[origine] : null;
  const store = storeName();
  const note = storeRating();
  const dejaPremium = !apercu && !!premium?.isPremium;

  // ===== La vue, comptee une fois, et les offres relues (comme l'ancien paywall) =====
  useEffect(() => {
    paywallEvent('affichage', { source: src, apercu });
    if (!apercu) void premium?.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== La formule choisie : l'annuel d'office =====
  const [choix, setChoix] = useState<Formule['id']>('annuel');
  const selection = formules.formules.find((f) => f.id === choix) ?? formules.formules[0] ?? null;
  const essai = selection?.essai ?? null;
  const rappelPossible = essai ? essai.end.getTime() - JOURS_RAPPEL * JOUR > Date.now() + 3600000 : false;
  const choisir = (f: Formule) => {
    if (f.id === selection?.id) return;
    Haptics.selectionAsync().catch(() => undefined);
    setChoix(f.id);
    paywallEvent('choix_formule', { source: src, formule: f.info.kind, produit: f.info.productId });
  };

  // ===== Ton genre et ton personnage, pour la bienvenue Premium =====
  const [moi, setMoi] = useState<{ genre: 'h' | 'f'; personnage: string | null }>({ genre: 'h', personnage: null });
  useEffect(() => {
    let vivant = true;
    Promise.all([Promise.resolve().then(() => getProfile()).catch(() => null), Promise.resolve().then(() => getEspace()).catch(() => null)]).then(([p, e]) => {
      if (vivant) setMoi({ genre: p?.avatar_gender === 'femme' ? 'f' : 'h', personnage: e?.personnage ?? null });
    });
    return () => {
      vivant = false;
    };
  }, []);

  // ===== Offre de rattrapage : une fois par appareil, seulement si le store peut la vendre =====
  const [rattrapageVu, setRattrapageVu] = useState<boolean | null>(null);
  useEffect(() => {
    let vivant = true;
    void rattrapageDejaVu().then((v) => vivant && setRattrapageVu(v));
    return () => {
      vivant = false;
    };
  }, []);
  const rattrapagePossible =
    !dejaPremium &&
    rattrapageVisible({
      dejaVue: rattrapageVu,
      storePret: !!premium?.isStoreReady,
      plateforme: Platform.OS,
      optionAndroid: !!optionRattrapage(formules.annuel?.pkg.raw ?? null),
      codeIos: RATTRAPAGE_IOS_CODE_CREE,
      apercu,
    });
  const [offre, setOffre] = useState(false);
  const offreVue = useRef(false);
  const mesureRattrapage = useMemo(
    () => ({
      rattrapage: (quoi: 'vue' | 'tap' | 'ok' | 'refus') => {
        if (apercu) return;
        const nom = quoi === 'vue' ? 'rattrapage_vue' : quoi === 'tap' ? 'rattrapage_tap' : quoi === 'ok' ? 'rattrapage_ok' : 'rattrapage_refus';
        track(nom, { source: src });
      },
    }),
    [apercu, src],
  );

  // ===== Fermer, acheter, restaurer =====
  const [occupe, setOccupe] = useState(false);
  const [fete, setFete] = useState<Fete | null>(null);
  const [alerte, setAlerte] = useState<{ titre: string; texte?: string; restaurer?: boolean } | null>(null);

  const fermer = () => {
    if (dejaPremium) {
      onFini('premium');
      return;
    }
    if (!offreVue.current && rattrapagePossible) {
      setOffre(true);
      return;
    }
    paywallEvent('continuer_gratuit', { source: src, via: 'fermer' });
    onFini('free');
  };

  const feter = (f: Fete) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    void playLevelUpSound();
    setOffre(false);
    setFete(f);
  };

  const restaurer = async () => {
    if (apercu) {
      setAlerte({ titre: traduire('Aperçu'), texte: PREVIEW_PURCHASE_MESSAGE });
      return;
    }
    if (!premium || occupe) return;
    setOccupe(true);
    const r = await premium.restore();
    setOccupe(false);
    paywallEvent('restauration', { source: src, resultat: r.success ? (r.restored ? 'retrouve' : 'aucun') : 'erreur' });
    if (r.success && r.restored) feter({ essaiFin: null, restaure: true });
    else if (r.success) setAlerte({ titre: traduire('Aucun achat trouvé'), texte: traduire('Aucun abonnement actif n’est associé à ce compte {0}.', store) });
    else if (r.error) setAlerte({ titre: traduire('Restauration impossible'), texte: r.error });
  };

  const acheter = async () => {
    if (!selection || occupe) return;
    paywallEvent('appui_bouton', { source: src, formule: selection.info.kind, essai: Boolean(essai) });
    if (apercu) {
      setAlerte({ titre: traduire('Aperçu'), texte: PREVIEW_PURCHASE_MESSAGE });
      return;
    }
    if (!premium) {
      setAlerte({ titre: traduire('Boutique indisponible'), texte: traduire('Les offres ne sont pas encore chargées. Vérifie ta connexion et réessaie.') });
      return;
    }
    setOccupe(true);
    const r = await premium.purchase(selection.pkg);
    setOccupe(false);
    if (r.success) {
      paywallEvent('achat_reussi', { source: src, formule: selection.info.kind, essai: Boolean(essai) });
      feter({ essaiFin: essai?.end ?? null, restaure: false });
      return;
    }
    if (r.cancelled) {
      paywallEvent('achat_annule', { source: src, formule: selection.info.kind });
      // annule sur la feuille du store : l'offre, une fois
      if (!offreVue.current && rattrapagePossible) setOffre(true);
      return;
    }
    paywallEvent('achat_erreur', { source: src, formule: selection.info.kind, raison: r.needsRestore ? 'acces_inactif' : 'erreur' });
    if (r.needsRestore) setAlerte({ titre: traduire('Achat validé, Premium pas encore actif'), texte: r.error, restaurer: true });
    else if (r.error) setAlerte({ titre: traduire('Achat impossible'), texte: r.error });
  };

  const reessayer = () => {
    if (formules.statut === 'loading') return;
    paywallEvent('appui_bouton', { source: src, formule: 'aucune', essai: false, offres: formules.statut });
    if (!apercu) void premium?.reloadOffers();
  };

  const finFete = async () => {
    const fin = fete?.essaiFin ?? null;
    // l'autorisation des notifications n'est demandee qu'ici, apres l'achat et la bienvenue (comme avant)
    if (fin && rappelPossible) {
      if (apercu) await Notifications.requestPermissionsAsync().catch(() => undefined);
      else await scheduleTrialReminder(fin);
    }
    setFete(null);
    onFini('premium');
  };

  const conditions = () => router.push('/terms' as never);
  const confidentialite = () => router.push('/privacy-policy' as never);

  // ===== Les photos du bandeau tournent, en fondu =====
  const fondus = useRef(BANDEAU.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const [photo, setPhoto] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhoto((p) => (p + 1) % BANDEAU.length), 3200);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    Animated.parallel(fondus.map((v, i) => Animated.timing(v, { toValue: i === photo ? 1 : 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }))).start();
  }, [photo, fondus]);

  // la page monte du bas, sans rebond
  const entree = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entree, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [entree]);

  // ===== Textes =====
  const titre = mur ? mur.libelle : traduire('Découvre tout {0}, sans limite.', 'YOROI');
  const sousTitre = mur ? mur.phrase(compteur) : traduire('Tes courbes, tes analyses, ton combat, tes photos et tout le monde samouraï.');
  const libelleBouton = !selection
    ? formules.statut === 'unavailable' && !formules.exemple
      ? traduire('Abonnement indisponible ici')
      : traduire('Réessayer')
    : essai
      ? traduire('Commencer mon essai gratuit')
      : traduire('Obtenir {0} pour {1}', selection.info.duration || selection.info.short, selection.info.priceString);
  const lignePrix = !selection
    ? formules.statut === 'loading'
      ? traduire('Chargement des prix du store')
      : formules.statut === 'unavailable'
        ? traduire('L’abonnement passe par {0}, il n’est pas disponible sur cette version de l’app.', store)
        : traduire('Les prix n’ont pas pu se charger, vérifie ta connexion puis réessaie.')
    : essai
      ? traduirePluriel(essai.days, essai.days > 1, '{0} jour d’essai gratuit', '{0} jours d’essai gratuit', essai.days) + traduire(', puis {0}', `${selection.info.priceString} ${selection.info.per}`)
      : null;
  const mention = traduire(
    'Le paiement est débité sur ton compte {0} {1}. L’abonnement se renouvelle automatiquement au même prix, sauf résiliation au moins 24 heures avant la fin de la période en cours. Tu le gères et tu le résilies à tout moment dans les réglages de ton compte {2}. Supprimer l’app ne l’annule pas.',
    store,
    essai ? traduire('à la fin de l’essai gratuit') : traduire('à la confirmation de l’achat'),
    store,
  );

  if (dejaPremium && !fete) {
    return (
      <View style={[s.fond, { backgroundColor: T.bg, paddingTop: insets.top + 60, paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
        <Pressable onPress={fermer} hitSlop={12} style={[s.croix, { top: insets.top + 4 }]} accessibilityRole="button" accessibilityLabel={traduire('Fermer')}>
          <Ionicons name="close" size={22} color={T.sub} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
          <View style={[s.dejaRond, { backgroundColor: T.card, borderColor: T.line }]}>
            <Ionicons name="star" size={34} color={T.or} />
          </View>
          <Txt style={[s.dejaTitre, { color: T.ink }]}>{traduire('Ton accès Premium est actif')}</Txt>
          <Txt style={[s.dejaSous, { color: T.sub }]}>{traduire('Tout ce qui est marqué Premium est ouvert dès maintenant.')}</Txt>
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <Bouton label={traduire('Continuer')} onPress={() => onFini('premium')} />
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[s.fond, { backgroundColor: T.bg, opacity: entree, transform: [{ translateY: entree.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
      <Pressable onPress={fermer} hitSlop={12} style={[s.croix, { top: insets.top + 4 }]} accessibilityRole="button" accessibilityLabel={traduire('Fermer')}>
        <Ionicons name="close" size={22} color={T.sub} />
      </Pressable>
      {apercu ? (
        <View style={[s.apercu, { top: insets.top + 10, backgroundColor: T.acc }]} pointerEvents="none">
          <Ionicons name="eye-outline" size={13} color={T.accInk} />
          <Txt style={[s.apercuTxt, { color: T.accInk }]} numberOfLines={1}>{formules.exemple ? traduire('Aperçu, prix d’exemple') : traduire('Aperçu, sans achat')}</Txt>
        </View>
      ) : null}

      {/* sur iPad, le paywall reste une colonne de 640 au plus, centree */}
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 46, paddingBottom: 20, width: '100%', maxWidth: 640, alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        <View style={s.bandeau}>
          {BANDEAU.map((p, i) => (
            <Animated.View key={p} style={[StyleSheet.absoluteFill, { opacity: fondus[i] }]}>
              <Image source={PHOTOS[p]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </Animated.View>
          ))}
          <LinearGradient colors={['rgba(0,0,0,0.38)', 'rgba(0,0,0,0.64)']} style={StyleSheet.absoluteFill} />
          <Txt style={s.bandeauTitre} accessibilityRole="header">{titre}</Txt>
          <Txt style={s.bandeauSous}>{sousTitre}</Txt>
        </View>

        {formules.formules.length ? (
          <View style={s.cartes}>
            {formules.formules.map((f) => (
              <CarteFormule key={f.id} f={f} actif={f.id === selection?.id} onPress={() => choisir(f)} />
            ))}
          </View>
        ) : (
          <View style={[s.sansOffre, { backgroundColor: T.card, borderColor: T.line }]} accessibilityLiveRegion="polite">
            <Sticker nom="sablier" taille={34} />
            <View style={{ flex: 1 }}>
              <Txt style={[s.sansOffreTitre, { color: T.ink }]}>
                {formules.statut === 'loading' ? traduire('Chargement des offres') : formules.statut === 'unavailable' ? traduire('Prix indisponibles ici') : traduire('Prix momentanément indisponibles')}
              </Txt>
              {formules.statut === 'loading' ? null : (
                <Txt style={[s.sansOffreSous, { color: T.sub }]}>
                  {formules.statut === 'unavailable' ? traduire('L’abonnement passe par {0}.', store) : traduire('Rien n’a été débité. Touche Réessayer en bas.')}
                </Txt>
              )}
            </View>
          </View>
        )}

        {note ? (
          <View style={s.note} accessible accessibilityLabel={traduirePluriel(note.total, note.total > 1, '{0} sur {1} · {2} note', '{0} sur {1} · {2} notes', note.note, note.stores, note.total)}>
            <Txt style={[s.noteChiffre, { color: T.ink }]}>{note.note}</Txt>
            {[0, 1, 2, 3, 4].map((k) => <Ionicons key={k} name="star" size={14} color={T.or} />)}
            <Txt style={[s.noteSous, { color: T.sub }]}>{traduirePluriel(note.total, note.total > 1, '· {0} note', '· {0} notes', note.total)}</Txt>
          </View>
        ) : null}

        <View style={{ marginTop: 8 }}>
          {PREMIUM_ROWS.map((r) => (
            <Avantage key={r.id} r={r} />
          ))}
        </View>
        <Txt style={[s.gratuit, { color: T.sub }]}>{FREE_FOREVER}</Txt>
      </ScrollView>

      <View style={[s.bas, { paddingBottom: Math.max(insets.bottom, 12), width: '100%', maxWidth: 640, alignSelf: 'center', borderTopColor: T.line }]}>
        <Txt style={[s.mention, { color: T.sub }]}>{mention}</Txt>
        <Bouton
          label={libelleBouton}
          onPress={() => (selection ? void acheter() : reessayer())}
          actif={!!selection || !(formules.statut === 'unavailable' && !formules.exemple)}
          chargement={occupe || (!selection && formules.statut === 'loading')}
        />
        {lignePrix ? <Txt style={[s.lignePrix, { color: T.sub }]} numberOfLines={2}>{lignePrix}</Txt> : null}
        <View style={s.liens}>
          <Lien label={traduire('Confidentialité')} onPress={confidentialite} />
          <Lien label={traduire('Conditions')} onPress={conditions} />
          {Platform.OS === 'ios' ? <Lien label={traduire('Contrat de licence Apple')} onPress={() => void safeOpenURL(APPLE_EULA_URL)} /> : null}
          <Lien label={traduire('Restaurer')} onPress={() => void restaurer()} bouton />
        </View>
      </View>

      {offre ? (
        <Rattrapage
          formules={formules}
          apercu={apercu}
          mesure={mesureRattrapage}
          onAchat={() => {
            offreVue.current = true;
            feter({ essaiFin: null, restaure: false });
          }}
          onFermer={() => {
            offreVue.current = true;
            setOffre(false);
            // l'offre refusee depuis la croix : le paywall se ferme
            paywallEvent('continuer_gratuit', { source: src, via: 'fermer' });
            onFini('free');
          }}
          onConditions={conditions}
        />
      ) : null}

      {fete ? (
        <Welcome genre={moi.genre} personnage={moi.personnage} restored={fete.restaure} trialEnd={fete.essaiFin} reminder={!!fete.essaiFin && rappelPossible} onDone={() => void finFete()} />
      ) : null}

      <Alerte
        visible={!!alerte}
        titre={alerte?.titre ?? ''}
        texte={alerte?.texte}
        boutons={
          alerte?.restaurer
            ? [{ label: traduire('Plus tard') }, { label: traduire('Restaurer mes achats'), principal: true, onPress: () => void restaurer() }]
            : [{ label: traduire('J’ai compris'), principal: true }]
        }
        onFerme={() => setAlerte(null)}
      />
    </Animated.View>
  );
}

/** Une formule en carte : l'annuel avec son economie et « Populaire », le mensuel a cote. Tout vient du store. */
function CarteFormule({ f, actif, onPress }: { f: Formule; actif: boolean; onPress: () => void }) {
  const T = useNuit();
  const tete = f.economie ? traduire('Économise {0} %', f.economie) : f.info.short;
  // « 1 an » : le chiffre en grand, l'unite dessous ; sans duree, le nom court
  const [nombre, ...reste] = (f.info.duration || f.info.short).split(' ');
  return (
    <Pressable
      onPress={onPress}
      style={[s.carte, { borderColor: actif ? T.acc : T.line, backgroundColor: T.bg }]}
      accessibilityRole="radio"
      accessibilityState={{ selected: actif }}
      accessibilityLabel={`${f.info.name}, ${f.info.priceString} ${f.info.per}`}
    >
      <View style={[s.tete, { backgroundColor: actif ? T.acc : T.card }]}>
        <Txt style={[s.teteTxt, { color: actif ? T.accInk : T.sub }]} numberOfLines={1}>{tete}</Txt>
      </View>
      <View style={s.corps}>
        <Txt style={[s.nombre, { color: T.ink }]}>{nombre}</Txt>
        {reste.length ? <Txt style={[s.unite, { color: T.ink }]}>{reste.join(' ')}</Txt> : null}
        <Txt style={[s.prix, { color: T.ink }]} numberOfLines={1} adjustsFontSizeToFit>{`${f.info.priceString} ${f.info.per}`}</Txt>
        {f.parSemaine ? <Txt style={[s.parSemaine, { color: T.sub }]} numberOfLines={1}>{`${f.parSemaine} ${traduire('par semaine')}`}</Txt> : null}
        {f.essai ? (
          <View style={s.essai}>
            <Ionicons name="gift-outline" size={13} color={T.acc} />
            <Txt style={[s.essaiTxt, { color: T.acc }]} numberOfLines={1}>{traduirePluriel(f.essai.days, f.essai.days > 1, '{0} jour d’essai gratuit', '{0} jours d’essai gratuit', f.essai.days)}</Txt>
          </View>
        ) : null}
      </View>
      {f.id === 'annuel' ? (
        <View style={[s.populaire, { backgroundColor: actif ? T.acc : T.line }]}>
          <Txt style={[s.populaireTxt, { color: actif ? T.accInk : T.sub }]}>{traduire('Populaire')}</Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Une ligne vraie de ce que Premium ajoute (lib/v2/premium/offer.ts, PREMIUM_ROWS) */
function Avantage({ r }: { r: PremiumRow }) {
  const T = useNuit();
  return (
    <View style={s.ligne}>
      <View style={[s.rond, { backgroundColor: T.mute }]}>
        <Ionicons name={ICONES[r.id] ?? 'checkmark-outline'} size={17} color={T.acc} />
      </View>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Txt style={[s.lTitre, { color: T.ink }]}>{r.label}</Txt>
        <Txt style={[s.lSous, { color: T.sub }]}>{r.sub}</Txt>
      </View>
      <Ionicons name="checkmark" size={20} color={T.acc} />
    </View>
  );
}

function Lien({ label, onPress, bouton = false }: { label: string; onPress: () => void; bouton?: boolean }) {
  const T = useNuit();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole={bouton ? 'button' : 'link'} accessibilityLabel={label} style={{ minHeight: 30, justifyContent: 'center' }}>
      <Txt style={[s.lien, { color: T.sub }]}>{label}</Txt>
    </Pressable>
  );
}

const s = StyleSheet.create({
  fond: { flex: 1 },
  croix: { position: 'absolute', right: 14, zIndex: 5, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  apercu: { position: 'absolute', alignSelf: 'center', zIndex: 4, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, maxWidth: 240 },
  apercuTxt: { fontFamily: FONT.texteSemi, fontSize: 11.5, flexShrink: 1 },
  bandeau: { height: 140, borderRadius: 18, overflow: 'hidden', marginHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  bandeauTitre: { fontFamily: FONT.titre, fontSize: 22, lineHeight: 27, color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 22, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 } },
  bandeauSous: { fontFamily: FONT.texteMedium, fontSize: 13.5, lineHeight: 18, color: 'rgba(255,255,255,0.94)', textAlign: 'center', paddingHorizontal: 22, marginTop: 6, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 1 } },
  cartes: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 18 },
  carte: { flex: 1, borderRadius: 14, borderWidth: 2, overflow: 'hidden' },
  tete: { paddingVertical: 6, paddingHorizontal: 6, alignItems: 'center' },
  teteTxt: { fontFamily: FONT.texteSemi, fontSize: 12 },
  corps: { alignItems: 'center', paddingTop: 10, paddingBottom: 28, paddingHorizontal: 6 },
  nombre: { fontFamily: FONT.titre, fontSize: 26, lineHeight: 30 },
  unite: { fontFamily: FONT.titreBold, fontSize: 16, lineHeight: 20 },
  prix: { fontFamily: FONT.texteSemi, fontSize: 13.5, marginTop: 6 },
  parSemaine: { fontFamily: FONT.texte, fontSize: 12, marginTop: 2 },
  essai: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  essaiTxt: { fontFamily: FONT.texteSemi, fontSize: 11.5 },
  populaire: { position: 'absolute', bottom: -1, alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 3, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  populaireTxt: { fontFamily: FONT.texteSemi, fontSize: 11 },
  sansOffre: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 18, borderRadius: 14, borderWidth: 1, padding: 14 },
  sansOffreTitre: { fontFamily: FONT.titreMedium, fontSize: 14.5 },
  sansOffreSous: { fontFamily: FONT.texte, fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  note: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 14 },
  noteChiffre: { fontFamily: FONT.titre, fontSize: 16, marginRight: 2 },
  noteSous: { fontFamily: FONT.texte, fontSize: 12.5, marginLeft: 2 },
  ligne: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, marginHorizontal: 20 },
  rond: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  lTitre: { fontFamily: FONT.titreMedium, fontSize: 14.5, lineHeight: 19 },
  lSous: { fontFamily: FONT.texte, fontSize: 12.5, lineHeight: 17, marginTop: 1 },
  gratuit: { fontFamily: FONT.texte, fontSize: 12.5, lineHeight: 17, textAlign: 'center', marginTop: 10, paddingHorizontal: 28 },
  bas: { paddingHorizontal: 18, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  mention: { fontFamily: FONT.texte, fontSize: 9.5, lineHeight: 13, textAlign: 'center', marginBottom: 10, paddingHorizontal: 4 },
  lignePrix: { fontFamily: FONT.texte, fontSize: 12.5, textAlign: 'center', marginTop: 8 },
  liens: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 18, marginTop: 6 },
  lien: { fontFamily: FONT.texte, fontSize: 11.5, textDecorationLine: 'underline' },
  dejaRond: { width: 76, height: 76, borderRadius: 38, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dejaTitre: { fontFamily: FONT.titre, fontSize: 25, lineHeight: 31, marginTop: 20, textAlign: 'center' },
  dejaSous: { fontFamily: FONT.texte, fontSize: 15, lineHeight: 21, marginTop: 8, textAlign: 'center' },
});
