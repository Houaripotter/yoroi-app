/**
 * onboarding-neuf/Sante.tsx : « Relie Apple Santé » (ou Health Connect) dans le design du nouvel onboarding.
 *
 * Memes textes et meme logique que l'ecran de l'ancien onboarding (components/yoroi/v2/onboarding/Sante.tsx, garde
 * tel quel pour l'ancien parcours et les nouveautes) : ce que YOROI lit, ce qu'il ecrit, que rien ne quitte le
 * telephone, la case des mesures avancees (seulement si elle est cochee) et l'etat de la demande pendant l'attente.
 * Seulement si Apple Santé ou Health Connect existe et n'est pas encore relie (parcours.ts).
 */

import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { texteEtape } from '@/components/yoroi/v2/onboarding/Sante';
import { ecouterEtatSante, lireEtatSante, type EtatSante } from '@/lib/v2/sante/importEtat';
import { CATEGORIES_SANTE, resumeDemande } from '@/lib/v2/sante/typesSante';
import { traduire } from '@/lib/i18n/tr';
import { Apparait, Bouton, Corps, Ecran, Haut, Sticker, Titre, Txt, alpha, type Nav } from './kit';
import { FONT, useNuit } from './theme';

export function Sante({ nav, occupe, onRelier, onPlusTard, plateforme = Platform.OS }: {
  nav: Nav;
  occupe: boolean;
  /** avance : les mesures avancees en plus, seulement si la case est cochee */
  onRelier: (avance: boolean) => void;
  onPlusTard: () => void;
  plateforme?: string;
}) {
  const T = useNuit();
  const insets = useSafeAreaInsets();
  const [avance, setAvance] = useState(false);
  const [etat, setEtat] = useState<EtatSante>(lireEtatSante());
  useEffect(() => ecouterEtatSante(setEtat), []);
  const android = plateforme === 'android';
  const nom = android ? 'Health Connect' : 'Apple Santé';
  const resume = resumeDemande(plateforme);
  const lit = android
    ? traduire('Ton poids et ta composition, tes pas, ton sommeil, ton cœur, l’eau et les repas, et les séances de ta montre.')
    : traduire('{0}. Les séances de ton Apple Watch ou de ta montre, avec leurs tracés.', resume.categories.map((x) => CATEGORIES_SANTE[x.cat].label).join(', '));
  const blocs: { sticker: NomSticker; titre: string; texte: string }[] = [
    { sticker: 'sante_appareils', titre: traduire('Ce que YOROI lit'), texte: lit },
    { sticker: 'coeur', titre: traduire('Ce que YOROI écrit'), texte: traduire('Tes pesées et ta masse grasse, ton eau, ton sommeil noté à la main et les séances que tu notes dans YOROI.') },
    { sticker: 'cle', titre: traduire('Rien ne quitte ton téléphone'), texte: traduire('Pas de compte, pas de serveur : tout reste entre YOROI et Santé, sur ce téléphone.') },
  ];
  const attente = occupe ? texteEtape(etat, nom) : null;
  return (
    <Ecran>
      <Haut etape={nav.etape} total={nav.total} progres={nav.progres} onBack={nav.onBack} onClose={nav.onClose} />
      <Titre mot={nom} sous={traduire('Ton suivi se remplit tout seul : tes pesées, tes pas, ton sommeil, ton cœur et les séances de ta montre arrivent sans rien saisir.')}>
        {traduire('Dernière étape : relie **{0}**', nom).replace(/\*\*/g, '')}
      </Titre>
      <Corps style={{ paddingTop: 18, gap: 10 }}>
        {blocs.map((b, n) => (
          <Apparait key={b.titre} rang={n}>
            <View style={[st.bloc, { backgroundColor: T.card, borderColor: T.line }]}>
              <Sticker nom={b.sticker} taille={40} />
              <View style={{ flex: 1 }}>
                <Txt style={[st.blocTitre, { color: T.ink }]}>{b.titre}</Txt>
                <Txt style={[st.blocTexte, { color: T.sub }]}>{b.texte}</Txt>
              </View>
            </View>
          </Apparait>
        ))}
        <Txt style={[st.note, { color: T.sub }]}>
          {android
            ? traduire('Dans la fenêtre qui suit, active ce que tu veux partager. Tu pourras changer d’avis dans Health Connect.')
            : traduire('Dans la fenêtre qui suit, touche « Tout activer », ou choisis une par une ({0} en lecture, {1} en écriture). Tu pourras changer d’avis dans l’app Santé.', resume.lecture, resume.ecriture)}
        </Txt>
        <Pressable
          onPress={() => setAvance((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: avance }}
          style={[st.case, { backgroundColor: avance ? alpha(T.acc, 0.06) : T.card, borderColor: avance ? T.acc : T.line }]}
        >
          <View style={[st.caseBox, { borderColor: avance ? T.acc : alpha(T.sub, 0.55), backgroundColor: avance ? T.acc : 'transparent' }]}>
            {avance ? <Ionicons name="checkmark" size={15} color={T.accInk} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Txt style={[st.blocTitre, { color: T.ink }]}>{traduire('Ajouter les mesures avancées')}</Txt>
            <Txt style={[st.blocTexte, { color: T.sub }]}>
              {android ? traduire('Glycémie et poussées de fauteuil, en plus.') : traduire('Marche et équilibre, alertes du cœur, électrocardiogramme et humeur, en plus.')}
            </Txt>
          </View>
        </Pressable>
        {attente ? (
          <Txt style={[st.note, { color: T.acc, fontFamily: FONT.texteSemi }]} accessibilityLiveRegion="polite">{attente}</Txt>
        ) : null}
      </Corps>
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 14) + 4 }}>
        <Pressable onPress={onPlusTard} disabled={occupe} hitSlop={10} style={{ alignSelf: 'center', marginBottom: 14 }} accessibilityRole="button">
          <Txt style={{ fontFamily: FONT.texteMedium, fontSize: 14, color: T.sub }}>{traduire('Plus tard')}</Txt>
        </Pressable>
        <Bouton label={traduire('Autoriser l’accès')} onPress={() => onRelier(avance)} chargement={occupe} />
      </View>
    </Ecran>
  );
}

const st = StyleSheet.create({
  bloc: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  blocTitre: { fontFamily: FONT.titreMedium, fontSize: 15, lineHeight: 20 },
  blocTexte: { fontFamily: FONT.texte, fontSize: 13, lineHeight: 18, marginTop: 2 },
  note: { fontFamily: FONT.texte, fontSize: 12.5, lineHeight: 17, paddingHorizontal: 4, marginTop: 2 },
  case: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  caseBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
