/**
 * Aide (sous-page de Reglages) : « Revoir la presentation » (14 octobre 2026 : le mini onboarding de la 3.0, /nouveautes?revoir=1),
 * « Revoir la visite guidee » (13 octobre 2026 : la visite sur les vrais ecrans,
 * avec la voix, remplace la presentation YOROI 3.0 et « Les bases de YOROI »), Savoir (regles et sources), la boite a idees et partager l'app. Vague 41 : Noter l'app est directement dans Reglages.
 */
import React from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, EspaceScreen } from '@/components/yoroi/v2/espace/ui';
import { ValueRow } from '@/components/yoroi/v2/espace/reglages/parts';
import { lancerVisite } from '@/components/yoroi/v2/tour/VisiteGuidee';
import { APP_VERSION } from '@/components/yoroi/v2/espace/reglages/version';
import { useCustomPopup } from '@/components/CustomPopup';
import { safeOpenURL } from '@/lib/security/validators';
import APP_CONFIG from '@/lib/appConfig';
import { partagerTexte } from '@/lib/v2/partage/texte';

export default function Aide() {
  const router = useRouter();
  const { showPopup, PopupComponent } = useCustomPopup();

  const mail = (subject: string) => {
    const s = encodeURIComponent(subject);
    const b = encodeURIComponent(`\n\n\nYOROI ${APP_VERSION}, ${Platform.OS === 'ios' ? 'iPhone' : 'Android'}`);
    safeOpenURL(`mailto:${APP_CONFIG.supportEmail}?subject=${s}&body=${b}`).then((ok) => {
      if (!ok) showPopup('Pas d’app mail', `Écris-nous directement à ${APP_CONFIG.supportEmail}`);
    });
  };

  // Le lien vient de constants/partage (store de la plateforme, ou le site quand il existera)
  const shareApp = () => {
    partagerTexte({ source: 'app', message: 'J’utilise YOROI pour suivre mon poids, mes séances et ma progression, 100 % hors ligne.' });
  };

  return (
    <EspaceScreen title="Aide et questions" subtitle="Comprendre YOROI et nous écrire">
      <Card>
        <ValueRow first icon="image" label="Revoir la présentation" sub="Personnage, Santé, scène, puis la visite" onPress={() => router.push('/nouveautes?revoir=1' as any)} />
        <ValueRow icon="spark" label="Revoir la visite guidée" sub="Je te montre l’app, écran par écran" onPress={() => lancerVisite(router)} />
        <ValueRow icon="doc" label="Savoir" sub="Règles des sports et sources scientifiques" onPress={() => router.push('/savoir' as any)} />
        {/* 18 octobre 2026 (Houari : « les sources des calculs doivent être visibles ») : un acces direct */}
        <ValueRow icon="doc" label="Sources scientifiques" sub="Les études derrière les calculs de YOROI" onPress={() => router.push('/scientific-sources' as any)} />
        <ValueRow icon="mail" label="Boîte à idées" sub="Une idée, un bug ? Écris-nous" onPress={() => mail('Idée pour YOROI')} />
        {/* 18 octobre 2026 : la page Aide et contact du site (questions frequentes, abonnement, donnees) */}
        <ValueRow icon="globe" label="Aide en ligne" sub="Achats, abonnement, données : les réponses" onPress={() => void safeOpenURL(APP_CONFIG.site.support)} />
        <ValueRow icon="share" label="Partager YOROI" sub="Avec un partenaire d’entraînement" onPress={shareApp} />
      </Card>
      <PopupComponent />
    </EspaceScreen>
  );
}
