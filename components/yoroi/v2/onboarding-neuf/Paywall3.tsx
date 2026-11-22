/**
 * onboarding-neuf/Paywall3.tsx : les deux premiers temps du paywall, copies d'INRO (components/onboarding-nuit/Paywall3.tsx).
 *
 *   Ecran 1, la promesse : « On veut que tu essaies YOROI gratuitement. » si le store annonce un essai pour toi,
 *            sinon « Découvre tout YOROI, sans limite. ». Trois coches vraies (lib/v2/premium/offer.ts, PREMIUM_ROWS),
 *            ce qui reste gratuit (FREE_FOREVER), les lauriers or et la vraie note des stores. Le prix vient du store.
 *   Ecran 2, le rappel (seulement s'il y a un essai) : « On te prévient 2 jours avant la fin de ton essai », la frise
 *            Aujourd'hui, jour du rappel, debut de l'abonnement. Le rappel existe vraiment (scheduleTrialReminder,
 *            lib/v2/onboarding/trial.ts, 2 jours avant) ; la duree de l'essai vient du store.
 * Entree : fondu de 360 ms, sans rebond.
 * 22 novembre 2026 : apres une reprise depuis une autre app, une ligne sous le titre de l'ecran 1 : « Tes séances
 * {app} sont déjà dans YOROI » (le nom de l'app seulement s'il a ete reconnu). Rien ne change a l'achat ni aux prix.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Laurier } from '@/components/yoroi/v2/premium/Preuve';
import { FREE_FOREVER, formatMoney, storeRating } from '@/lib/v2/premium/offer';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { Bouton, ND, PhraseColoree, Txt, alpha } from './kit';
import type { EtatFormules } from './formules';
import { FONT, useNuit } from './theme';

function useEntree() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [v]);
  return v;
}

function Retour({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const T = useNuit();
  return (
    <Pressable onPress={onBack} hitSlop={14} style={[st.retour, { top: insets.top + 8 }]} accessibilityRole="button" accessibilityLabel={traduire('Retour')}>
      <Ionicons name="chevron-back" size={24} color={T.ink} />
    </Pressable>
  );
}

/** « 7 jours gratuits, puis le prix annuel (et son equivalent par mois) » : tout vient du store */
export function lignePrix(f: EtatFormules): string | null {
  const a = f.annuel;
  if (!a) return null;
  const parMois = a.info.price && a.info.currency ? formatMoney(Math.round((a.info.price / 12) * 100) / 100, a.info.currency) : null;
  if (a.essai) {
    return parMois
      ? traduirePluriel(a.essai.days, a.essai.days > 1, '{0} jour gratuit, puis {1} par an ({2} par mois)', '{0} jours gratuits, puis {1} par an ({2} par mois)', a.essai.days, a.info.priceString, parMois)
      : traduirePluriel(a.essai.days, a.essai.days > 1, '{0} jour gratuit, puis {1} par an', '{0} jours gratuits, puis {1} par an', a.essai.days, a.info.priceString);
  }
  return parMois ? traduire('{0} par an ({1} par mois)', a.info.priceString, parMois) : traduire('{0} par an', a.info.priceString);
}

/** « Tes séances {app} sont déjà dans YOROI », ou sans nom d'app quand on ne la connait pas */
export function ligneReprise(app: string | null): string {
  return app ? traduire('Tes séances {0} sont déjà dans YOROI', app) : traduire('Tes séances sont déjà dans YOROI');
}

/* ================================================================ ecran 1 */
export function Promesse({ formules, onNext, onBack, onReessayer, reprise }: {
  formules: EtatFormules;
  onNext: () => void;
  onBack: () => void;
  onReessayer: () => void;
  /** apres une reprise depuis une autre app : le nom de l'app d'origine s'il est connu */
  reprise?: { app: string | null } | null;
}) {
  const T = useNuit();
  const insets = useSafeAreaInsets();
  const entree = useEntree();
  const essai = formules.annuel?.essai ?? null;
  const note = storeRating();
  const sansOffre = !formules.formules.length;
  const coches: { titre: string; mt: string; sous: string; ms: string }[] = [
    { titre: traduire('Tes courbes en entier'), mt: traduire('en entier'), sous: traduire('Poids, mesures, force et santé, sur 6 mois, 1 an et tout ton historique'), ms: traduire('tout ton historique') },
    { titre: traduire('Tes analyses'), mt: traduire('analyses'), sous: traduire('Ton poids projeté, ton radar de performance et ton bilan en PDF'), ms: traduire('radar de performance') },
    { titre: traduire('Tout le monde samouraï'), mt: traduire('samouraï'), sous: traduire('Toutes les scènes et tous les personnages, sans attendre'), ms: traduire('sans attendre') },
  ];
  const [avant = '', apres = ''] = (essai ? traduire('On veut que tu essaies {0} gratuitement.', '\u0000') : traduire('Découvre tout {0}, sans limite.', '\u0000')).split('\u0000');
  const prix = lignePrix(formules);
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Retour onBack={onBack} />
      <Animated.ScrollView style={{ flex: 1, opacity: entree }} contentContainerStyle={[st.page, { paddingTop: insets.top + 52 }]} showsVerticalScrollIndicator={false}>
        <Txt style={[st.titre, { color: T.ink }]}>
          {avant}
          <Txt style={{ color: T.acc }}>YOROI</Txt>
          {apres}
        </Txt>
        {reprise ? (
          <View style={[st.reprise, { backgroundColor: alpha(T.acc, 0.08), borderColor: alpha(T.acc, 0.25) }]}>
            <Ionicons name="checkmark-circle" size={18} color={T.acc} />
            <Txt style={[st.repriseTxt, { color: T.acc }]} numberOfLines={2}>{ligneReprise(reprise.app)}</Txt>
          </View>
        ) : null}
        <View style={st.coches}>
          {coches.map((c) => (
            <View key={c.titre} style={st.coche}>
              <View style={[st.rond, { backgroundColor: T.acc }]}>
                <Ionicons name="checkmark" size={16} color={T.accInk} />
              </View>
              <PhraseColoree phrase={c.titre} mot={c.mt} couleur={T.acc} style={[st.cocheTitre, { color: T.ink }]} />
              <PhraseColoree phrase={c.sous} mot={c.ms} couleur={T.acc} style={[st.cocheSous, { color: T.sub }]} />
            </View>
          ))}
        </View>
        <Txt style={[st.gratuit, { color: T.sub }]}>{FREE_FOREVER}</Txt>
        {note ? (
          <View style={st.notes}>
            <View style={st.etoilesLigne}>
              <Laurier height={44} color={T.orFonce} />
              <View style={st.etoiles}>
                {[0, 1, 2, 3, 4].map((k) => <Ionicons key={k} name="star" size={21} color={T.or} />)}
              </View>
              <Laurier height={44} color={T.orFonce} mirrored />
            </View>
            <Txt style={[st.notesTxt, { color: T.sub }]}>{traduirePluriel(note.total, note.total > 1, '{0} sur {1} · {2} note', '{0} sur {1} · {2} notes', note.note, note.stores, note.total)}</Txt>
          </View>
        ) : null}
      </Animated.ScrollView>
      <View style={[st.bas, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
        {essai ? (
          <View style={st.rien}>
            <Ionicons name="checkmark" size={20} color={T.acc} />
            <Txt style={[st.rienTxt, { color: T.ink }]}>{traduire('Rien à payer aujourd’hui')}</Txt>
          </View>
        ) : null}
        {sansOffre && formules.statut !== 'loading' ? (
          <Bouton label={traduire('Réessayer')} onPress={onReessayer} />
        ) : (
          <Bouton label={essai ? traduire('Essayer gratuitement') : traduire('Continuer')} onPress={onNext} chargement={sansOffre && formules.statut === 'loading'} />
        )}
        {prix ? <Txt style={[st.prix, { color: T.sub }]}>{prix}</Txt> : null}
        {formules.exemple ? <Txt style={[st.prix, { color: T.sub, marginTop: 4 }]}>{traduire('Aperçu, prix d’exemple')}</Txt> : null}
      </View>
    </View>
  );
}

/* ================================================================ ecran 2 */
/** Le jour du rappel : 2 jours avant la fin de l'essai (comme scheduleTrialReminder), null si l'essai est trop court */
export function jourDuRappel(essaiJours: number): number | null {
  const j = essaiJours - 2;
  return j >= 1 ? j : null;
}

export function Rappel({ essaiJours, onNext, onBack }: { essaiJours: number; onNext: () => void; onBack: () => void }) {
  const T = useNuit();
  const insets = useSafeAreaInsets();
  const entree = useEntree();
  const jour = jourDuRappel(essaiJours);
  const etapes: { quand: string; titre: string; sous: string; icone: keyof typeof Ionicons.glyphMap }[] = [
    { quand: traduire('Aujourd’hui'), titre: traduire('Accès complet'), sous: traduire('Rien à payer aujourd’hui.'), icone: 'lock-open-outline' },
    ...(jour ? [{ quand: traduire('Jour {0}', jour), titre: traduire('Rappel'), sous: traduire('On te prévient que ton essai se termine bientôt.'), icone: 'notifications-outline' as const }] : []),
    { quand: traduire('Jour {0}', essaiJours), titre: traduire('Début de l’abonnement'), sous: traduire('Annulable à tout moment.'), icone: 'star-outline' },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <Retour onBack={onBack} />
      <Animated.View style={[st.rappel, { paddingTop: insets.top + 64, paddingBottom: Math.max(insets.bottom, 14) + 6, opacity: entree }]}>
        <Txt style={[st.titre, { color: T.ink }]}>
          {jour ? traduire('On te prévient 2 jours avant la fin de ton essai') : traduirePluriel(essaiJours, essaiJours > 1, '{0} jour pour tout essayer', '{0} jours pour tout essayer', essaiJours)}
        </Txt>
        <View style={st.frise}>
          {etapes.map((e, n) => (
            <View key={e.quand} style={st.ligne}>
              <View style={st.rail}>
                <View style={[st.puce, { backgroundColor: n === 0 ? T.acc : T.card, borderColor: n === 0 ? T.acc : T.line }]}>
                  <Ionicons name={e.icone} size={17} color={n === 0 ? T.accInk : T.ink} />
                </View>
                {n < etapes.length - 1 ? <View style={[st.trait, { backgroundColor: T.line }]} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: 26 }}>
                <Txt style={[st.quand, { color: T.sub }]}>{e.quand}</Txt>
                <Txt style={[st.etapeTitre, { color: T.ink }]}>{e.titre}</Txt>
                <Txt style={[st.etapeSous, { color: T.sub }]}>{e.sous}</Txt>
              </View>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <Bouton label={traduire('Continuer')} onPress={onNext} />
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  retour: { position: 'absolute', left: 12, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  page: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 12 },
  titre: { fontFamily: FONT.titre, fontSize: 27, lineHeight: 32, letterSpacing: -0.4, textAlign: 'center' },
  coches: { marginTop: 22, gap: 14 },
  reprise: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8, marginTop: 14, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, maxWidth: '100%' },
  repriseTxt: { flexShrink: 1, fontFamily: FONT.texteSemi, fontSize: 14, lineHeight: 18, textAlign: 'center' },
  coche: { alignItems: 'center', gap: 4, paddingHorizontal: 6 },
  rond: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  cocheTitre: { fontFamily: FONT.titreBold, fontSize: 17.5, lineHeight: 22, textAlign: 'center' },
  cocheSous: { fontFamily: FONT.texte, fontSize: 13.5, lineHeight: 18, textAlign: 'center' },
  gratuit: { fontFamily: FONT.texte, fontSize: 12.5, lineHeight: 17, textAlign: 'center', marginTop: 16, paddingHorizontal: 10 },
  notes: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 14 },
  etoilesLigne: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  etoiles: { flexDirection: 'row', gap: 4 },
  notesTxt: { fontFamily: FONT.texte, fontSize: 13, marginTop: 8, textAlign: 'center' },
  bas: { paddingHorizontal: 22 },
  rien: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, marginTop: 6 },
  rienTxt: { fontFamily: FONT.texteSemi, fontSize: 16.5 },
  prix: { fontFamily: FONT.texte, fontSize: 12.5, textAlign: 'center', marginTop: 12 },
  rappel: { flex: 1, paddingHorizontal: 22 },
  frise: { marginTop: 36 },
  ligne: { flexDirection: 'row', gap: 14 },
  rail: { alignItems: 'center', width: 40 },
  puce: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  trait: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
  quand: { fontFamily: FONT.texteSemi, fontSize: 13, letterSpacing: 0.2 },
  etapeTitre: { fontFamily: FONT.titreBold, fontSize: 18, marginTop: 2 },
  etapeSous: { fontFamily: FONT.texte, fontSize: 14, lineHeight: 19, marginTop: 2 },
});
