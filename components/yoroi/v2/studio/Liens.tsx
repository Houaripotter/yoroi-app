/**
 * Studio, rubrique Liens : les consoles utiles a la publication de YOROI et ses fiches publiques.
 */
import React from 'react';
import { Linking } from 'react-native';
import { Card, Row } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { StudioSection, SubTitle } from './parts';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

type Lien = { label: string; sub: string; url: string; icon: IconName };

const CONSOLES: Lien[] = [
  { label: traduire('App Store Connect'), sub: traduire('Versions iOS, TestFlight, fiche de l’app'), url: 'https://appstoreconnect.apple.com', icon: 'upload' },
  { label: traduire('Google Play Console'), sub: traduire('Versions Android, tests, fiche de l’app'), url: 'https://play.google.com/console', icon: 'upload' },
  { label: traduire('RevenueCat'), sub: traduire('Abonnements, clients, Premium offert'), url: 'https://app.revenuecat.com', icon: 'crown' },
  { label: traduire('Sentry'), sub: traduire('Pas branché dans l’app pour l’instant'), url: 'https://sentry.io', icon: 'pulse' },
  { label: traduire('Expo'), sub: traduire('Builds EAS et mises à jour'), url: 'https://expo.dev', icon: 'code' },
];

const FICHES: Lien[] = [
  { label: traduire('Fiche App Store'), sub: traduire('apps.apple.com, id6757306612'), url: 'https://apps.apple.com/app/id6757306612', icon: 'star' },
  { label: traduire('Fiche Google Play'), sub: 'com.houari.yoroi', url: 'https://play.google.com/store/apps/details?id=com.houari.yoroi', icon: 'star' },
];

export function Liens() {
  const open = (url: string) => Linking.openURL(url).catch(() => appAlert(traduire('Oups'), traduire('Le lien ne s’est pas ouvert.')));
  return (
    <StudioSection id="liens" icon="globe" title={traduire("Liens")} sub={traduire("Consoles de publication et fiches des stores")} keywords="liens app store connect google play console revenuecat sentry expo fiche store">
      <Card>
        {CONSOLES.map((l, i) => (
          <Row key={l.url} first={i === 0} icon={l.icon} label={traduire(l.label)} sub={traduire(l.sub)} onPress={() => void open(l.url)} />
        ))}
      </Card>
      <SubTitle>{traduire("Fiches publiques")}</SubTitle>
      <Card>
        {FICHES.map((l, i) => (
          <Row key={l.url} first={i === 0} icon={l.icon} label={traduire(l.label)} sub={traduire(l.sub)} onPress={() => void open(l.url)} />
        ))}
      </Card>
    </StudioSection>
  );
}

export default Liens;
