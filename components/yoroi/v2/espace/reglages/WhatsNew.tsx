/**
 * Nouveautes ouvertes depuis Reglages (ou le Studio createur, evenement SHOW_WHATS_NEW) :
 * depuis le 13 octobre 2026, c'est la visite guidee sur les vrais ecrans, avec la voix
 * (components/yoroi/v2/tour/VisiteGuidee.tsx). La presentation en diapositives est archivee.
 */
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { lancerVisite } from '@/components/yoroi/v2/tour/VisiteGuidee';

export function WhatsNewSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  useEffect(() => {
    if (!visible) return;
    onClose();
    lancerVisite(router);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
