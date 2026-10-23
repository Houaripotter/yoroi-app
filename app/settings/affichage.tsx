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

const FONT_LABELS = ['Petite', 'Normale', 'Grande', 'Très grande'];

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
    <EspaceScreen title="Affichage et icône" subtitle="La taille du texte et l’icône de l’app" gap={14}>
      <Card>
        <ValueRow first tint={TUILE.ardoise} icon="text" label="Taille du texte" value={FONT_LABELS[(fontSizeLevel ?? 2) - 1] ?? 'Normale'} onPress={() => setOpen(true)} />
        <ValueRow tint={TUILE.or} icon="frame" label="Icône de l’app" value={logoName} onPress={() => router.push('/logo-selection' as any)} />
      </Card>

      <ChoiceSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Taille du texte"
        subtitle="Pour toute l’app"
        options={([1, 2, 3, 4] as FontSizeLevel[]).map((lvl) => ({
          key: lvl,
          label: FONT_LABELS[lvl - 1],
          preview: (
            <View style={{ width: 44, alignItems: 'center' }}>
              <Ink size={12 + lvl * 3} weight="black" allowFontScaling={false}>Aa</Ink>
            </View>
          ),
        }))}
        value={(fontSizeLevel ?? 2) as FontSizeLevel}
        onChange={(v) => setFontSizeLevel(v)}
      />
    </EspaceScreen>
  );
}
