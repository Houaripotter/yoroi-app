/**
 * Style des widgets (13 octobre, Houari : « je préfère largement le A, mais est-ce qu'on peut faire les 3,
 * comme ça les utilisateurs choisissent, mais par défaut A ? »). Trois vignettes, A cochee par defaut, puis
 * l'apercu du style choisi en clair et en sombre. Le choix passe aux widgets iPhone, iPad et Android
 * (lib/v2/widgets/style.ts, module natif YoroiWidgets setStyle) et ils sont redessines tout de suite.
 * Ouvert depuis Reglages, groupe Ton style, ligne « Style des widgets ».
 */
import React from 'react';
import { Image, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, EspaceScreen, GUTTER, Icon } from '@/components/yoroi/v2/espace/ui';
import { STYLES_WIDGETS, setStyleWidgets, useStyleWidgets, type StyleWidgets } from '@/lib/v2/widgets/style';
import { traduire } from '@/lib/i18n/tr';

const APERCUS: Record<StyleWidgets, { clair: number; sombre: number }> = {
  A: { clair: require('@/assets/widgets/apercu_a_clair.jpg'), sombre: require('@/assets/widgets/apercu_a_sombre.jpg') },
  B: { clair: require('@/assets/widgets/apercu_b_clair.jpg'), sombre: require('@/assets/widgets/apercu_b_sombre.jpg') },
  C: { clair: require('@/assets/widgets/apercu_c_clair.jpg'), sombre: require('@/assets/widgets/apercu_c_sombre.jpg') },
};

export default function StyleDesWidgets() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const sombre = !!theme.isDark;
  const style = useStyleWidgets();
  const { width } = useWindowDimensions();
  // trois vignettes sur la largeur de la carte, jamais coupees a 375 points
  const interieur = Math.min(560, width) - GUTTER * 2 - 24;
  const tuile = Math.floor((interieur - 20) / 3);
  const apercu = Math.floor((interieur - 12) / 2);
  const choisi = STYLES_WIDGETS.find((s) => s.id === style) ?? STYLES_WIDGETS[0];

  const choisir = (id: StyleWidgets) => {
    if (id === style) return;
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    setStyleWidgets(id).catch(() => {});
  };

  return (
    <EspaceScreen title={traduire("Style des widgets")} subtitle={traduire("Sur ton écran d’accueil et ton écran verrouillé")} gap={14}>
      <Card>
        <View style={{ padding: 12, flexDirection: 'row', gap: 10 }}>
          {STYLES_WIDGETS.map((s) => {
            const actif = s.id === style;
            return (
              <Pressable
                key={s.id}
                onPress={() => choisir(s.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: actif }}
                accessibilityLabel={`${s.nom}${s.id === 'A' ? traduire(', par défaut') : ''}`}
                style={({ pressed }) => ({ width: tuile, gap: 6, opacity: pressed ? 0.85 : 1 })}
              >
                <View style={{ width: tuile, height: tuile, borderRadius: 18, borderWidth: 2.5, borderColor: actif ? c.accent : 'transparent', padding: 2 }}>
                  <Image
                    source={sombre ? APERCUS[s.id].sombre : APERCUS[s.id].clair}
                    style={{ width: '100%', height: '100%', borderRadius: 14 }}
                    resizeMode="cover"
                    accessibilityIgnoresInvertColors
                  />
                  {actif ? (
                    <View style={{ position: 'absolute', bottom: -6, right: -6, width: 24, height: 24, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.surface }}>
                      <Icon name="check" size={13} color={c.onPrimary} stroke={3} />
                    </View>
                  ) : null}
                </View>
                <View style={{ gap: 1 }}>
                  <Ink size={13} weight="bold" color={actif ? c.ink : c.textSecondary} numberOfLines={2}>{traduire(s.nom)}</Ink>
                  {s.id === 'A' ? <Ink size={11} color={c.textMuted} numberOfLines={1}>{traduire("Par défaut")}</Ink> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <View style={{ padding: 12, gap: 10 }}>
          <View style={{ gap: 2, paddingHorizontal: 2 }}>
            <Ink size={16} weight="black">{traduire(choisi.nom)}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire(choisi.phrase)}</Ink>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {(['clair', 'sombre'] as const).map((m) => (
              <View key={m} style={{ width: apercu, gap: 6, alignItems: 'center' }}>
                <Image source={APERCUS[choisi.id][m]} style={{ width: apercu, height: apercu, borderRadius: 18 }} resizeMode="cover" accessibilityIgnoresInvertColors />
                <Ink size={12} weight="bold" color={c.textMuted}>{m === 'clair' ? 'En clair' : 'En sombre'}</Ink>
              </View>
            ))}
          </View>
        </View>
      </Card>

      <View style={{ paddingHorizontal: 6, gap: 6 }}>
        <Ink size={13} color={c.textSecondary}>{traduire("Tes widgets changent tout de suite, en clair comme en sombre.")}</Ink>
        {Platform.OS === 'ios' ? (
          <Ink size={13} color={c.textSecondary}>{traduire("Pour un seul widget : appui long sur le widget, Modifier le widget, puis Style.")}</Ink>
        ) : null}
      </View>
    </EspaceScreen>
  );
}
