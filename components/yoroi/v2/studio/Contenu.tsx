/**
 * Studio, rubrique Contenu : les compteurs du contenu de YOROI et les controles de coherence,
 * lus dans lib/v2/creator/contentReport.generated.ts (ecrit par scripts/studio-content.mjs).
 * Puis les galeries de revue : images, sons, fenetres, cartes de partage, etats.
 */
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, Icon, Row } from '@/components/yoroi/v2/espace/ui';
import { CONTENT_CHECKS, CONTENT_COUNTS, CONTENT_REPORT_AT } from '@/lib/v2/creator/contentReport.generated';
import { Note, StudioSection, SubTitle } from './parts';
import { traduire, traduirePluriel, LOCALE } from '@/lib/i18n/tr';

export const GALERIES: { route: string; label: string; sub: string; icon: 'image' | 'bell' | 'frame' | 'share' | 'grid' }[] = [
  { route: '/studio/images', label: 'Galerie d’images', sub: traduire('Chaque illustration, par famille, en grand'), icon: 'image' },
  { route: '/studio/sons', label: 'Sons', sub: traduire('Chaque son, et la fin de round'), icon: 'bell' },
  { route: '/studio/fenetres', label: traduire('Fenêtres'), sub: 'Alertes, choix, saisies, feuilles', icon: 'frame' },
  { route: '/studio/partage', label: traduire('Cartes de partage'), sub: traduire('Toutes, au nom de Heny'), icon: 'share' },
  { route: '/studio/etats', label: traduire('États'), sub: traduire('Vides, chargements, erreur simulée'), icon: 'grid' },
];

export function Contenu() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const bad = CONTENT_CHECKS.filter((x) => !x.ok).length;

  return (
    <StudioSection
      id="contenu"
      icon="table"
      title={traduire("Contenu et revue")}
      sub={bad ? traduirePluriel(bad, bad > 1, "Compteurs, {0} contrôle à revoir, galeries", "Compteurs, {0} contrôles à revoir, galeries", bad) : traduire('Compteurs, contrôles, galeries')}
      keywords={traduire("contenu compteurs sports exercices techniques citations personnages scenes ornements carnet sons controles coherence galerie images sons fenetres partage etats")}
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
        {CONTENT_COUNTS.map((k) => (
          <View key={k.id} style={{ width: '31.5%', minHeight: 84, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 10, gap: 2, justifyContent: 'space-between' }}>
            <Ink size={24} weight="black" tight>{k.value.toLocaleString(LOCALE)}</Ink>
            <Ink size={11} weight="bold" color={c.textSecondary} numberOfLines={2}>{k.label}</Ink>
          </View>
        ))}
      </View>

      <SubTitle>{traduire("Contrôles de cohérence")}</SubTitle>
      <Card>
        {CONTENT_CHECKS.map((x, i) => (
          <View key={x.id} style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.divider }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: x.ok ? c.successTint : c.dangerTint, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
              <Icon name={x.ok ? 'check' : 'info'} size={15} color={x.ok ? c.successText : c.danger} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={14} weight="extraBold">{x.label}</Ink>
              <Ink size={12} color={x.ok ? c.textSecondary : c.danger}>{x.detail}</Ink>
            </View>
          </View>
        ))}
      </Card>
      <Note>{traduire("Relevé du {0}. Pour le refaire après un ajout : node scripts/studio-content.mjs, depuis le dossier de l’app.", CONTENT_REPORT_AT)}</Note>

      <SubTitle>{traduire("Galeries de revue")}</SubTitle>
      <Card>
        {GALERIES.map((g, i) => (
          <Row key={g.route} first={i === 0} icon={g.icon} label={g.label} sub={g.sub} onPress={() => router.push(g.route as never)} />
        ))}
      </Card>
    </StudioSection>
  );
}

export default Contenu;
