/**
 * Studio, « Nouvel utilisateur » (27 octobre 2026) : voir l'app exactement comme quelqu'un qui vient de
 * l'installer, sans rien perdre. Une confirmation qui dit tout, puis :
 *  1. tes vraies données sont copiées et vérifiées (lib/v2/creator/nouvelUtilisateur.ts), sinon rien ne se passe ;
 *  2. l'app est vidée et repart par sa porte d'entrée : onboarding, paywall en vue gratuite (aucun achat possible),
 *     puis l'app vide ;
 *  3. le bandeau du haut (BandeauNouvelUtilisateur.tsx) te ramène à tes données, vérifiées.
 * Heny chargée : refus expliqué, avec le retour à tes données d'abord.
 */
import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { usePremium } from '@/context/PremiumContext';
import { isDemoDataActive } from '@/lib/demoDataService';
import { EVENEMENT_VUE, messageDemo } from '@/lib/v2/creator/nouvelUtilisateur';
import { serviceNouvelUtilisateur } from '@/lib/v2/creator/nouvelUtilisateurAppareil';
import { logger } from '@/lib/security/logger';
import { DeviceEventEmitter } from 'react-native';
import { backToRealData, useResetAll } from './Demo';
import { marquerLanceeDansCetteSession, messageErreurVue, rafraichirToutLEcran, useRevenirAMesDonnees, vueNouvelUtilisateurActive } from './BandeauNouvelUtilisateur';
import { ouvrirPorteEntree } from './parts';
import { traduire } from '@/lib/i18n/tr';

export { vueNouvelUtilisateurActive, useRevenirAMesDonnees };

/** Ce que dit la confirmation, avant de lancer */
export function messageNouvelUtilisateur(): string {
  return [
    traduire('Tes vraies données sont copiées sur ce téléphone puis vérifiées une par une : profil, séances, pesées, mensurations, réglages, scène, personnage, XP du Dojo. Si la copie n’est pas parfaite, rien n’est effacé.'),
    traduire('L’app repart vide, comme une installation neuve : onboarding complet, paywall en version gratuite (aucun achat possible), accueil vide et Dojo au rang de départ.'),
    traduire('Un petit bandeau en haut de l’écran te ramène à tes données à tout moment, même après avoir fermé l’app.'),
    traduire('Pendant la vue, passe l’étape Apple Santé : une pesée saisie pourrait y être écrite pour de vrai.'),
  ].join('\n\n');
}

export const MESSAGE_PENDANT_LA_VUE = () => traduire('La vue nouvel utilisateur est en cours. Reviens d’abord à tes données avec le bandeau du haut.');

export function useNouvelUtilisateur(options: { onDemoChange?: () => void } = {}) {
  const router = useRouter();
  const resetAll = useResetAll();
  const { setSimulateFreeUser } = usePremium();
  const revenir = useRevenirAMesDonnees();
  const { onDemoChange } = options;

  const lancer = useCallback(async () => {
    try {
      // les forçages d'aperçu tombent d'abord (saison, horloge, captures, variantes du paywall)
      await resetAll(false).catch(() => '');
      const r = await serviceNouvelUtilisateur().lancer();
      marquerLanceeDansCetteSession();
      setSimulateFreeUser(true);
      await rafraichirToutLEcran();
      DeviceEventEmitter.emit(EVENEMENT_VUE, true);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      logger.info(`[Studio] vue nouvel utilisateur : ${r.tables} tables, ${r.lignes} lignes, ${r.cles} réglages de côté`);
      ouvrirPorteEntree(router, '/onboarding');
    } catch (e) {
      logger.error('[Studio] vue nouvel utilisateur', e);
      appAlert(traduire('Vue nouvel utilisateur pas lancée'), messageErreurVue(e));
    }
  }, [resetAll, router, setSimulateFreeUser]);

  const confirmer = useCallback(() => {
    appAlert(traduire('Voir l’app comme un nouvel utilisateur ?'), messageNouvelUtilisateur(), [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Lancer'), onPress: () => void lancer() },
    ]);
  }, [lancer]);

  /** Le toucher sur l'outil du Studio */
  const demander = useCallback(async () => {
    if (await vueNouvelUtilisateurActive()) {
      appAlert(traduire('Vue nouvel utilisateur en cours'), traduire('Tes vraies données sont de côté. Tu reviens maintenant ?'), [
        { text: traduire('Rester'), style: 'cancel' },
        { text: traduire('Revenir à mes données'), onPress: () => void revenir() },
      ]);
      return;
    }
    if (await isDemoDataActive().catch(() => false)) {
      appAlert(traduire('Heny est chargée'), messageDemo(), [
        { text: traduire('Annuler'), style: 'cancel' },
        {
          text: traduire('Revenir à mes données d’abord'),
          onPress: () =>
            void backToRealData()
              .then(() => {
                onDemoChange?.();
                confirmer();
              })
              .catch(() => appAlert(traduire('Oups'), traduire('Le retour à tes données n’a pas abouti. Heny reste chargée, tes vraies données restent de côté.'))),
        },
      ]);
      return;
    }
    confirmer();
  }, [confirmer, onDemoChange, revenir]);

  return { demander, revenir };
}
