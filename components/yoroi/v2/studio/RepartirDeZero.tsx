/**
 * Studio, « Tout effacer et repartir de zéro » (26 octobre 2026). Houari : « un bouton qui efface tout, tout,
 * tout : l'app redémarre du début ». Deux temps : une fenêtre qui dit exactement ce qui part, puis le mot
 * EFFACER à écrire. L'effacement reprend effacerToutesMesDonnees() de lib/storage.ts (notifications,
 * appareils appairés, base SQLite compactée, copies de la démo, fichiers et cache, trousseau, AsyncStorage,
 * widgets, activité en direct, montre), puis efface aussi ce que lui garde exprès : le cache de l'abonnement
 * et le jeton du mode créateur avec ses essais. L'app repart alors par sa porte d'entrée (app/index.tsx),
 * qui ne trouve plus rien et ouvre l'onboarding comme après une installation neuve.
 */
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { effacerToutesMesDonnees } from '@/lib/storage';
import { CLES_SECURE_GARDEES, texteResteEnDehors } from '@/lib/effacementPlan';
import { CREATOR_SECURE_KEYS } from '@/lib/v2/creator/creatorStore';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import logger from '@/lib/security/logger';
import { useResetAll } from './Demo';
import { fold, ouvrirPorteEntree } from './parts';
import { traduire } from '@/lib/i18n/tr';

/** Le mot a ecrire pour confirmer */
export const motDeConfirmation = () => traduire('EFFACER');

/** Le mot ecrit correspond, sans tenir compte des accents, majuscules ni espaces autour */
export const motCorrect = (ecrit: string) => fold(ecrit.trim()) === fold(motDeConfirmation());

/**
 * Efface vraiment tout : l'effacement complet de l'app, plus le cache d'abonnement et le jeton créateur
 * qu'il garde volontairement. Chaque étape est tentée même si une précédente échoue.
 */
export async function effacerVraimentTout(): Promise<{ ok: boolean; echecs: string[] }> {
  const r = await effacerToutesMesDonnees();
  const echecs = [...r.echecs];
  for (const cle of [...CLES_SECURE_GARDEES, ...CREATOR_SECURE_KEYS]) {
    try {
      await SecureStore.deleteItemAsync(cle);
    } catch (e) {
      echecs.push(cle);
      logger.warn(`[Studio] clé ${cle} non effacée`, e);
    }
  }
  // filet : rien de ce qui aurait été réécrit entre deux étapes ne reste
  await AsyncStorage.clear().catch(() => echecs.push('réglages'));
  return { ok: echecs.length === 0, echecs };
}

/** Le texte de la première fenêtre : tout ce qui part, et ce qui reste hors de YOROI */
export function messageRepartirDeZero(demoActive: boolean): string {
  const parties = [
    traduire('Tout ce que YOROI garde sur ce téléphone part : séances, pesées, mensurations, photos, programmes, combats, réglages, sauvegardes locales, notifications, appareils appairés, widgets et montre.'),
    traduire('Ton jeton créateur et le cache de l’abonnement partent aussi : il faudra recoller le jeton pour rouvrir le Studio. Un abonnement payé reste chez Apple ou Google et revient tout seul.'),
    traduire('L’app redémarre sur l’onboarding, comme une installation neuve.'),
  ];
  if (demoActive) parties.push(traduire('Heny est chargée : la copie de tes vraies données part avec le reste.'));
  parties.push(texteResteEnDehors(Platform.OS));
  return parties.join('\n\n');
}

/** Première confirmation ; « Continuer » ouvre la fenêtre du mot à écrire */
export function demanderRepartirDeZero(demoActive: boolean, suite: () => void) {
  appAlert(traduire('Tout effacer et repartir de zéro ?'), messageRepartirDeZero(demoActive), [
    { text: traduire('Annuler'), style: 'cancel' },
    { text: traduire('Continuer'), style: 'destructive', onPress: suite },
  ]);
}

/**
 * Le bouton « Tout effacer et repartir de zéro », tout en bas du Studio (maquette A, 27 octobre 2026) :
 * rose très doux, contour fin, icône et libellé centrés. Le détail de ce qui part est dans la première fenêtre.
 */
export function CarteRepartirDeZero({ onPress }: { onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const encre = theme.isDark ? c.danger : '#B0282E';
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={traduire('Tout effacer et repartir de zéro. Efface toutes les données de l’app et redémarre sur l’onboarding.')}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, paddingHorizontal: 16, borderRadius: 18, backgroundColor: theme.isDark ? 'rgba(236,122,112,0.10)' : '#FCEDEE', borderWidth: 1, borderColor: theme.isDark ? 'rgba(236,122,112,0.32)' : '#F3C9CC', opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <Icon name="trash" size={16} color={encre} />
      <Ink size={14} weight="extraBold" color={encre}>{traduire('Tout effacer et repartir de zéro')}</Ink>
    </Pressable>
  );
}

/**
 * Deuxième temps : écrire EFFACER, puis l'effacement et le redémarrage. Monté par app/creator-mode.tsx.
 * En cas d'échec partiel, l'app ne redémarre pas et le Studio reste ouvert pour relancer.
 */
export function FenetreRepartirDeZero({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  const router = useRouter();
  const { lock } = useCreatorMode();
  const resetAll = useResetAll();
  const [ecrit, setEcrit] = useState('');
  const [enCours, setEnCours] = useState(false);
  const pret = motCorrect(ecrit) && !enCours;

  const fermer = () => {
    if (enCours) return;
    setEcrit('');
    onClose();
  };

  const lancer = async () => {
    if (!pret) return;
    setEnCours(true);
    try {
      // les forçages d'aperçu gardés en mémoire (saison, horloge, paywall, captures, vue gratuite) tombent d'abord
      await resetAll(false).catch(() => '');
      const { ok, echecs } = await effacerVraimentTout();
      setEnCours(false);
      setEcrit('');
      onClose();
      if (!ok) {
        logger.warn(`[Studio] repartir de zéro incomplet : ${echecs.join(', ')}`);
        appAlert(traduire('Effacement incomplet'), traduire('Presque tout est effacé, mais une partie a résisté. Relance « Tout effacer et repartir de zéro » pour finir.'));
        return;
      }
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      // plus rien sur le téléphone : l'onboarding, comme au premier lancement (pas router.replace('/'), qui ouvrait l'accueil)
      ouvrirPorteEntree(router, '/onboarding');
      await lock().catch(() => undefined);
    } catch (e) {
      logger.error('[Studio] repartir de zéro', e);
      setEnCours(false);
      onClose();
      appAlert(traduire('Oups'), traduire('L’effacement s’est arrêté en route. Ferme et rouvre l’app, puis recommence.'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={fermer}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={fermer} accessibilityLabel={traduire('Fermer')} style={{ flex: 1, backgroundColor: 'rgba(24,32,58,0.5)', justifyContent: 'center', paddingHorizontal: 20 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: pal.carte, borderRadius: 26, padding: 20, gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="trash" size={26} color={c.danger} />
            </View>
            <View style={{ gap: 6 }}>
              <Ink size={22} weight="black" tight color={pal.texte}>{traduire('Dernière étape')}</Ink>
              <Ink size={14} weight="bold" color={pal.texte2} style={{ lineHeight: 20 }}>
                {traduire('Rien ne pourra être récupéré sur ce téléphone. Écris {0} pour confirmer.', motDeConfirmation())}
              </Ink>
            </View>
            <TextInput
              value={ecrit}
              onChangeText={setEcrit}
              placeholder={motDeConfirmation()}
              placeholderTextColor={pal.texte3}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              editable={!enCours}
              accessibilityLabel={traduire('Écris {0} pour confirmer', motDeConfirmation())}
              onSubmitEditing={() => void lancer()}
              style={{ minHeight: 54, borderRadius: 18, borderWidth: 1.5, borderColor: pret ? c.danger : c.border, backgroundColor: pal.page, paddingHorizontal: 16, fontSize: 18, fontWeight: '800', letterSpacing: 2, color: pal.texte }}
            />
            <Pressable
              onPress={() => void lancer()}
              disabled={!pret}
              accessibilityRole="button"
              accessibilityState={{ disabled: !pret, busy: enCours }}
              accessibilityLabel={traduire('Tout effacer maintenant')}
              style={({ pressed }) => ({ minHeight: 54, borderRadius: 27, backgroundColor: c.danger, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: !pret && !enCours ? 0.4 : pressed ? 0.88 : 1 })}
            >
              {enCours ? <ActivityIndicator color="#FFFFFF" /> : <Icon name="trash" size={18} color="#FFFFFF" />}
              <Ink size={16} weight="black" color="#FFFFFF">{enCours ? traduire('Effacement en cours') : traduire('Tout effacer maintenant')}</Ink>
            </Pressable>
            <Pressable onPress={fermer} disabled={enCours} accessibilityRole="button" accessibilityLabel={traduire('Annuler')} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={15} weight="extraBold" color={pal.texte2}>{traduire('Annuler')}</Ink>
            </Pressable>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
