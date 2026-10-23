/**
 * Affichage et icone (audit 43) : la taille du texte et l'icone de l'app, sortis de la page Reglages pour la raccourcir.
 * Memes reglages qu'avant : useTheme().setFontSizeLevel pour le texte, /logo-selection pour l'icone.
 */
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, EspaceScreen } from '@/components/yoroi/v2/espace/ui';
import { ChoiceSheet, ValueRow } from '@/components/yoroi/v2/espace/reglages/parts';
import { TUILE } from '@/components/yoroi/v2/reglages/kit';
import { useTheme } from '@/lib/ThemeContext';
import type { FontSizeLevel } from '@/lib/fontScaleManager';
import { getSelectedLogo, LOGO_OPTIONS } from '@/lib/storage';
import { traduire } from '@/lib/i18n/tr';

const FONT_LABELS = [traduire('Petite'), traduire('Normale'), traduire('Grande'), traduire('Très grande')];

export default function AffichageEtIcone() {
  const router = useRouter();
  const { fontSizeLevel, setFontSizeLevel } = useTheme();
  const [open, setOpen] = useState(false);
  const [logoName, setLogoName] = useState<string | undefined>(undefined);

  // au retour du choix de l'icone : on relit son nom
  useFocusEffect(
    useCallback(() => {
      getSelectedLogo()
        .then((l) => setLogoName(LOGO_OPTIONS.find((o) => o.id === l)?.name ?? 'Classique'))
        .catch(() => setLogoName(undefined));
    }, []),
  );

  return (
    <EspaceScreen title={traduire("Affichage et icône")} subtitle={traduire("La taille du texte et l’icône de l’app")} gap={14}>
      <Card>
        <ValueRow first tint={TUILE.ardoise} icon="text" label={traduire("Taille du texte")} value={FONT_LABELS[(fontSizeLevel ?? 2) - 1] ?? traduire('Normale')} onPress={() => setOpen(true)} />
        <ValueRow tint={TUILE.or} icon="frame" label={traduire("Icône de l’app")} value={logoName} onPress={() => router.push('/logo-selection' as any)} />
      </Card>

      <ChoiceSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={traduire("Taille du texte")}
        subtitle={traduire("Pour toute l’app")}
        options={([1, 2, 3, 4] as FontSizeLevel[]).map((lvl) => ({
          key: lvl,
          label: FONT_LABELS[lvl - 1],
          preview: (
            <View style={{ width: 44, alignItems: 'center' }}>
              <Ink size={12 + lvl * 3} weight="black" allowFontScaling={false}>{traduire("Aa")}</Ink>
            </View>
          ),
        }))}
        value={(fontSizeLevel ?? 2) as FontSizeLevel}
        onChange={(v) => setFontSizeLevel(v)}
      />
    </EspaceScreen>
  );
}
