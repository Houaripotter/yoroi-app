/**
 * Politique de confidentialite (refonte v2) : integree a l'app, sans dependance externe.
 * Texte refait le 13 octobre 2026 pour coller exactement au code.
 */
import React from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, EspaceScreen, Icon } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { useI18n } from '@/lib/I18nContext';
import { safeOpenURL } from '@/lib/security/validators';
import { lienConfidentialite } from '@/lib/appConfig';

import POLITIQUE from '@/data/politiqueConfidentialite.json';
import { mesureDisponible } from '@/utils/telemetry';
import { traduire, LANG } from '@/lib/i18n/tr';

/**
 * Le texte vit dans data/politiqueConfidentialite.json, partage avec la version web
 * (scripts/politique-html.mjs genere la page a publier). Une seule source, aucune divergence possible.
 * La section « mesure d'audience » n'apparait que lorsque la mesure est reellement branchee.
 */
type Section = { titre: string; icone: string; lignes: string[]; siMesure?: boolean };

function sections(langue: string): { number: string; title: string; icon: IconName; content: string[] }[] {
  const P = POLITIQUE as unknown as Record<string, unknown>;
  const liste = ((P[langue] ?? P.en) as Section[]).filter((x) => !x.siMesure || mesureDisponible());
  return liste.map((x, i) => ({ number: String(i + 1), title: x.titre, icon: x.icone as IconName, content: x.lignes }));
}

export default function PrivacyPolicyScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { language } = useI18n();
  const isFR = LANG === 'fr';
  const SECTIONS = sections(LANG);
  const LAST_UPDATE = (POLITIQUE.miseAJour as Record<string, string>)[LANG] ?? POLITIQUE.miseAJour.en;

  return (
    <EspaceScreen title={traduire('Confidentialité')}>
      <View style={{ borderRadius: 22, backgroundColor: c.carteDouce, padding: 20, gap: 8, overflow: 'hidden' }}>
        <Glyph kind="sakura" size={150} color={'rgba(35,53,143,0.07)'} style={{ position: 'absolute', right: -24, top: -34 }} />
        <Ink size={26} weight="black" tight color={c.ink}>{traduire('Politique de confidentialité')}</Ink>
        <Ink size={13} color={c.textSecondary}>{`${traduire('Dernière mise à jour')}${isFR ? ' : ' : ': '}${LAST_UPDATE}`}</Ink>
        <View style={{ alignSelf: 'flex-start', marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.goldLight, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Icon name="check" size={14} color={c.ink} stroke={3} />
          <Ink size={13} weight="extraBold">{traduire('Tes données de santé restent sur ton téléphone')}</Ink>
        </View>
      </View>

      {SECTIONS.map((section) => (
        <Card key={section.number} style={{ padding: 16, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={section.icon} size={18} color={c.accent} />
            </View>
            <Ink size={17} weight="black" tight style={{ flex: 1 }}>{`${section.number}. ${section.title}`}</Ink>
          </View>
          {section.content.map((line, idx) =>
            line.startsWith('• ') ? (
              <View key={idx} style={{ flexDirection: 'row', gap: 10, paddingLeft: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.detail, marginTop: 8 }} />
                <Ink size={14} color={c.textSecondary} style={{ flex: 1 }}>{line.slice(2)}</Ink>
              </View>
            ) : (
              <Ink key={idx} size={14} weight={idx === 0 ? 'bold' : 'medium'} color={idx === 0 ? c.ink : c.textSecondary}>{line}</Ink>
            ),
          )}
        </Card>
      ))}

      <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Icon name="mail" size={20} color={c.indigo} />
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={13} color={c.textMuted}>{traduire('Pour toute question')}</Ink>
          <Ink size={15} weight="extraBold" color={c.indigo} onPress={() => safeOpenURL('mailto:yoroiapp@hotmail.com')} accessibilityRole="link">yoroiapp@hotmail.com</Ink>
        </View>
      </Card>
      {/* 18 octobre 2026 : la version en ligne, sur yoroiapp.com (francais ou anglais selon la langue de l'app) */}
      <Ink size={14} weight="extraBold" color={c.indigo} style={{ textAlign: 'center', textDecorationLine: 'underline' }} onPress={() => void safeOpenURL(lienConfidentialite(language))} accessibilityRole="link">{traduire('Lire la politique sur yoroiapp.com')}</Ink>
      <Ink size={12} color={c.textMuted} style={{ textAlign: 'center' }}>{traduire('© 2026 YOROI. Tous droits réservés.')}</Ink>
    </EspaceScreen>
  );
}
