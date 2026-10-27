/**
 * Derniere etape du parcours de seance (refonte v2) : proteger ses donnees avec une sauvegarde.
 * YOROI fonctionne sans serveur, les donnees ne vivent que sur ce telephone.
 */
import React, { useState } from 'react';
import { Modal, View } from 'react-native';
import { router } from 'expo-router';
import { exportDataToJSON } from '@/lib/exportService';
import { successHaptic } from '@/lib/haptics';
import ratingService from '@/lib/ratingService';
import { RatingPopup } from '@/components/RatingPopup';
import { logger } from '@/lib/security/logger';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Glass, P, Press, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Icon as EIcon } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { Stamp, paletteOf } from '@/components/yoroi/v2/partage/cardKit';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'archive', title: traduire('Crée un dossier'), text: traduire('Appelle-le Yoroi_Backup dans ton cloud.') },
  { icon: 'download', title: traduire('Génère ta sauvegarde'), text: traduire('Un seul fichier avec tout ton historique.') },
  { icon: 'upload', title: traduire('Range-la dans ton cloud'), text: traduire('Tu ne perdras plus rien, même en changeant de téléphone.') },
];

export default function BackupStepScreen() {
  const [isExporting, setIsExporting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showRatingPopup, setShowRatingPopup] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportDataToJSON();
      successHaptic();
      setShowSuccessModal(true);
    } catch (error) {
      logger.error('Erreur export:', error);
      appAlert(traduire('Sauvegarde impossible'), traduire('Tes données n’ont pas pu être exportées. Vérifie les autorisations et réessaie.'), [
        { text: traduire('Annuler'), style: 'cancel' },
        { text: traduire('Réessayer'), onPress: handleExport },
      ]);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFinish = async () => {
    tap('medium');
    const hasRated = await ratingService.hasRated();
    if (!hasRated) router.replace('/(tabs)?showRating=true' as any);
    else router.replace('/(tabs)');
  };

  const handleRatingClose = () => {
    setShowRatingPopup(false);
    ratingService.onPopupDismissed();
    router.replace('/(tabs)');
  };

  const handleRated = () => {
    setShowRatingPopup(false);
    ratingService.onRated();
    router.replace('/(tabs)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <DetailScreen
        title={traduire("Sauvegarde tes données")}
        subtitle={traduire("Tes données vivent sur ce téléphone, nulle part ailleurs")}
        footer={
          <View style={{ gap: 10 }}>
            <BigButton label={isExporting ? traduire('Génération en cours') : traduire('Générer ma sauvegarde')} icon="shield" onPress={handleExport} disabled={isExporting} />
            <BigButton label={traduire("Terminer")} tone="light" onPress={handleFinish} />
          </View>
        }
      >
        <Glass style={{ alignItems: 'center', gap: 12, paddingVertical: 26, backgroundColor: 'rgba(255,255,255,0.92)' }}>
          <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: P.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center' }}>
              <EIcon name="shield" size={32} color={P.onPrimary} stroke={2.4} />
            </View>
          </View>
          <Ink size={15} weight="bold" color={P.ink2} style={{ textAlign: 'center', paddingHorizontal: 10 }}>
            {traduire("YOROI fonctionne sans serveur pour respecter ta vie privée. Une sauvegarde te protège en cas de perte ou de vol.")}</Ink>
        </Glass>

        <Card style={{ gap: 14 }}>
          {STEPS.map((s, i) => (
            <View key={s.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                <EIcon name={s.icon} size={20} color={P.indigo} />
              </View>
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="extraBold">{`${i + 1}. ${s.title}`}</Ink>
                <Ink size={13} color={P.ink2}>{traduire(s.text)}</Ink>
              </View>
            </View>
          ))}
        </Card>
        <View style={{ height: 120 }} />
      </DetailScreen>

      <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(29,32,41,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: '100%', maxWidth: 380, backgroundColor: P.paper, borderRadius: 28, padding: 22, gap: 14, alignItems: 'center' }}>
            <Stamp p={paletteOf('papier')} size={64} />
            <Ink size={26} weight="black" tight style={{ textAlign: 'center' }}>{traduire("Sauvegarde prête")}</Ink>
            <Ink size={14} color={P.ink2} style={{ textAlign: 'center' }}>{traduire("Tes données sont protégées en cas de perte, de vol ou de changement de téléphone.")}</Ink>
            <Ink size={13} weight="bold" color={P.muted} style={{ textAlign: 'center' }}>{traduire("Range le fichier dans ton cloud préféré : iCloud, Google Drive ou Dropbox.")}</Ink>
            <Press onPress={() => { setShowSuccessModal(false); successHaptic(); }} accessibilityRole="button" accessibilityLabel={traduire("Parfait")} style={{ alignSelf: 'stretch' }}>
              <View style={{ height: 56, borderRadius: 18, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={16} weight="extraBold" color={P.onPrimary}>{traduire("Parfait")}</Ink>
              </View>
            </Press>
          </View>
        </View>
      </Modal>

      <RatingPopup visible={showRatingPopup} onClose={handleRatingClose} onRated={handleRated} actionType="session" />
    </View>
  );
}
