/**
 * Studio, « Nouvel utilisateur » : le petit bandeau permanent pendant la vue, et le retour à tes données.
 * Monté une fois, par CreatorGuard (app/_layout.tsx), au dessus de tous les écrans, onboarding et paywall compris
 * (iOS : FullWindowOverlay, comme les fenêtres de l'app). Il ne dépend ni du mode créateur ni d'aucun réglage :
 * son seul témoin est la copie de tes données (lib/v2/creator/nouvelUtilisateur.ts). Pendant la vue, tout achat et
 * toute restauration sont refusés (verrou d'aperçu des achats, comme le paywall du Studio).
 * Si l'app a été fermée pendant la vue, au relancement une fenêtre propose de revenir.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, DeviceEventEmitter, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { Ink } from '@/components/yoroi/v2/Ink';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { usePremium } from '@/context/PremiumContext';
import { holdPurchasePreview } from '@/lib/v2/creator/purchasePreview';
import { setDevClockOffset } from '@/lib/v2/creator/devClock';
import { requestArmureCatchup } from '@/lib/v2/armure';
import { ESPACE_CHANGED_EVENT, getEspace } from '@/lib/v2/espace';
import { CLE_VUE_GRATUITE, ErreurVue, EVENEMENT_VUE } from '@/lib/v2/creator/nouvelUtilisateur';
import { serviceNouvelUtilisateur } from '@/lib/v2/creator/nouvelUtilisateurAppareil';
import { logger } from '@/lib/security/logger';
import { ouvrirPorteEntree } from './parts';
import { traduire } from '@/lib/i18n/tr';

const EVENEMENTS_DONNEES = ['YOROI_DATA_CHANGED', 'YOROI_PARTNERS_CHANGED', 'YOROI_PROFILE_CHANGED', 'YOROI_DEMO_CHANGED'];

/** Vrai si la vue a été lancée depuis l'ouverture de l'app (sinon, au relancement, on propose de revenir) */
let lanceeDansCetteSession = false;
export function marquerLanceeDansCetteSession() {
  lanceeDansCetteSession = true;
}

/** Tous les écrans relisent leurs données, et Ton espace (scène, personnage) est relu tel qu'enregistré */
export async function rafraichirToutLEcran(): Promise<void> {
  EVENEMENTS_DONNEES.forEach((e) => DeviceEventEmitter.emit(e));
  try {
    DeviceEventEmitter.emit(ESPACE_CHANGED_EVENT, await getEspace());
  } catch {
    // sans importance : l'écran se relira à la prochaine ouverture
  }
}

export async function vueNouvelUtilisateurActive(): Promise<boolean> {
  try {
    return (await serviceNouvelUtilisateur().etat()).actif;
  } catch {
    return false;
  }
}

export const messageErreurVue = (e: unknown) => (e instanceof ErreurVue ? e.message : traduire('L’opération s’est arrêtée en route. Tes vraies données restent dans leur copie : réessaie.'));

/** Remet tes données (vérifiées), puis l'app repart par sa porte d'entrée */
export function useRevenirAMesDonnees() {
  const router = useRouter();
  const { setSimulateFreeUser } = usePremium();
  return useCallback(async (): Promise<boolean> => {
    try {
      const r = await serviceNouvelUtilisateur().revenir();
      setSimulateFreeUser((await AsyncStorage.getItem(CLE_VUE_GRATUITE).catch(() => null)) === 'true');
      setDevClockOffset(0);
      await requestArmureCatchup().catch(() => undefined);
      await rafraichirToutLEcran();
      DeviceEventEmitter.emit(EVENEMENT_VUE, false);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      ouvrirPorteEntree(router, '/(tabs)');
      appAlert(
        traduire('Tes vraies données sont de retour'),
        r.rien
          ? traduire('Rien n’avait encore été effacé : tout était resté en place.')
          : traduire('{0} tables, {1} lignes et {2} réglages remis et vérifiés un par un.', r.tables, r.lignes, r.cles),
      );
      return true;
    } catch (e) {
      logger.error('[Studio] retour de la vue nouvel utilisateur', e);
      appAlert(traduire('Retour pas encore fait'), messageErreurVue(e));
      return false;
    }
  }, [router, setSimulateFreeUser]);
}

export function BandeauNouvelUtilisateur() {
  const insets = useSafeAreaInsets();
  const revenir = useRevenirAMesDonnees();
  const [actif, setActif] = useState(false);
  const [occupe, setOccupe] = useState(false);

  const relire = useCallback(async () => {
    const a = await vueNouvelUtilisateurActive();
    setActif(a);
    return a;
  }, []);

  useEffect(() => {
    let vivant = true;
    // au lancement : si la vue tournait quand l'app a été fermée, on propose de revenir
    const t = setTimeout(() => {
      relire()
        .then((a) => {
          if (!vivant || !a || lanceeDansCetteSession) return;
          appAlert(
            traduire('Tu es encore en vue nouvel utilisateur'),
            traduire('L’app a été fermée pendant la vue. Tes vraies données sont toujours de côté, en sécurité. Tu reviens maintenant ?'),
            [
              { text: traduire('Rester'), style: 'cancel', onPress: () => marquerLanceeDansCetteSession() },
              { text: traduire('Revenir à mes données'), onPress: () => void lancerRetour() },
            ],
          );
        })
        .catch(() => undefined);
    }, 1500);
    const sub = DeviceEventEmitter.addListener(EVENEMENT_VUE, (v: boolean) => setActif(!!v));
    const app = AppState.addEventListener('change', (s) => {
      if (s === 'active') void relire();
    });
    return () => {
      vivant = false;
      clearTimeout(t);
      sub.remove();
      app.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relire]);

  // pendant la vue, aucun achat ni aucune restauration ne part vers le store
  useEffect(() => (actif ? holdPurchasePreview() : undefined), [actif]);

  const lancerRetour = async () => {
    setOccupe(true);
    try {
      if (await revenir()) setActif(false);
    } finally {
      setOccupe(false);
    }
  };

  const demander = () => {
    if (occupe) return;
    selectionAsync().catch(() => {});
    appAlert(traduire('Revenir à tes données ?'), traduire('Tout ce que tu as fait comme nouvel utilisateur est effacé, et tes vraies données reviennent telles qu’avant, vérifiées une par une.'), [
      { text: traduire('Rester'), style: 'cancel' },
      { text: traduire('Revenir'), onPress: () => void lancerRetour() },
    ]);
  };

  if (!actif) return null;

  const corps = (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: Math.max(insets.top, 8) + 2, left: 0, right: 0, alignItems: 'center' }}>
      <Pressable
        onPress={demander}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={traduire('Vue nouvel utilisateur. Touche pour revenir à tes données.')}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 26, paddingHorizontal: 11, borderRadius: 13, backgroundColor: 'rgba(29,32,51,0.78)', opacity: pressed ? 0.85 : 1 })}
      >
        {occupe ? <ActivityIndicator size="small" color="#FFFFFF" /> : <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#9FB0F5' }} />}
        <Ink size={11.5} weight="extraBold" color="#FFFFFF">{occupe ? traduire('Retour en cours') : traduire('Vue nouvel utilisateur, touche pour revenir')}</Ink>
      </Pressable>
    </View>
  );

  if (Platform.OS === 'ios') return <FullWindowOverlay>{corps}</FullWindowOverlay>;
  return corps;
}

export default BandeauNouvelUtilisateur;
