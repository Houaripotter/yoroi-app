/**
 * Briques communes des galeries de revue du Studio (vague 23) : garde du mode createur,
 * ecran avec en-tete simple et retour, pastilles de filtre, petites cartes.
 * Ces ecrans ne sont relies a rien dans l'app : on y arrive seulement depuis le Studio.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Icon, RoundButton } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import { traduire } from '@/lib/i18n/tr';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';

export const G = 22;

function goBack(router: ReturnType<typeof useRouter>) {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)' as never);
}

/** Sans mode createur actif : un cadenas, rien d'autre n'est monte. Le jeton est reverifie a l'ouverture. */
export function GalerieGate({ children }: { children: React.ReactNode }) {
  const { ready, isCreator, recheck } = useCreatorMode();
  const [checked, setChecked] = useState(false);
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let alive = true;
    recheck()
      .catch(() => false)
      .finally(() => {
        if (alive) setChecked(true);
      });
    return () => {
      alive = false;
    };
  }, [recheck]);

  if (!ready || !checked) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
        <ChargementPetit />
      </View>
    );
  }
  if (!isCreator) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
          <RoundButton icon="back" label={traduire("Retour")} onPress={() => goBack(router)} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }} accessible accessibilityLabel={traduire("Verrouillé")}>
          <View style={{ width: 96, height: 96, borderRadius: 32, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="lock" size={42} color={c.textMuted} />
          </View>
        </View>
      </View>
    );
  }
  return <>{children}</>;
}

/** En-tete simple (16 octobre 2026) : barre compacte, retour rond et titre sur la meme ligne */
export function GalerieHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  const router = useRouter();
  return <EnTete titre={title} sousTitre={sub} droite={right} onRetour={() => goBack(router)} style={{ marginHorizontal: -G, marginTop: -8 }} />;
}

/** Ecran de galerie qui defile : en-tete puis contenu */
export function GalerieScreen({ title, sub, right, children, gap = 16, overlay }: { title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; gap?: number; overlay?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: G, paddingBottom: insets.bottom + 48, gap }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <GalerieHeader title={title} sub={sub} right={right} />
        {children}
      </ScrollView>
      {overlay}
    </View>
  );
}

/** Pastille de filtre (44 points de haut) */
export function Pastille({ label, on, onPress, count }: { label: string; on?: boolean; onPress: () => void; count?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : label}
      style={({ pressed }) => ({
        minHeight: 40,
        paddingHorizontal: 14,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: on ? c.primary : pressed ? c.fillSubtle : c.surface,
        borderWidth: 1,
        borderColor: on ? c.accent : c.border,
      })}
    >
      <Ink size={14} weight="extraBold" color={on ? c.onPrimary : c.ink}>{label}</Ink>
      {count !== undefined ? <Ink size={12} weight="bold" color={on ? 'rgba(255,255,255,0.8)' : c.textMuted}>{String(count)}</Ink> : null}
    </Pressable>
  );
}

/** Rangee de pastilles qui defile a l'horizontale, collee aux bords de l'ecran */
export function PastilleRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -G }} contentContainerStyle={{ paddingHorizontal: G, gap: 8 }}>
      {children}
    </ScrollView>
  );
}

/** Carte blanche */
export function Bloc({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return <View style={[{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 10 }, style]}>{children}</View>;
}

/** Titre de rubrique */
export function Rubrique({ title, sub }: { title: string; sub?: string }) {
  const { theme } = useYoroiTheme();
  return (
    <View style={{ gap: 2, paddingHorizontal: 4, marginTop: 6 }}>
      <Ink size={18} weight="black" tight>{title}</Ink>
      {sub ? <Ink size={13} color={theme.colors.textSecondary}>{sub}</Ink> : null}
    </View>
  );
}

/** Ligne qui ouvre quelque chose : pictogramme, libelle, precision, chevron */
export function Ligne({ icon, label, sub, onPress, first, danger }: { icon: IconName; label: string; sub?: string; onPress: () => void; first?: boolean; danger?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 60,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: pressed ? c.fillSubtle : 'transparent',
        borderTopWidth: first ? 0 : 1,
        borderTopColor: c.divider,
      })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: danger ? c.dangerTint : c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={danger ? c.danger : c.accent} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={15} weight="extraBold" color={danger ? c.danger : c.ink}>{label}</Ink>
        {sub ? <Ink size={12} color={c.textSecondary}>{sub}</Ink> : null}
      </View>
      <Icon name="chevron" size={16} color={c.textMuted} />
    </Pressable>
  );
}

/** Groupe de lignes dans une carte */
export function Lignes({ children }: { children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>{children}</View>;
}

/** Bouton plein (indigo) ou clair */
export function Bouton({ label, icon, onPress, light, disabled }: { label: string; icon?: IconName; onPress: () => void; light?: boolean; disabled?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  // 28 octobre 2026 : le bouton plein prend le bouton principal partage
  if (!light) {
    return <BoutonPrincipal label={label} onPress={onPress} disabled={disabled} hauteur={50} rayon={16} tailleTexte={15} haptique="light" icone={icon ? (col) => <Icon name={icon} size={18} color={col} stroke={2.4} /> : undefined} />;
  }
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        minHeight: 50,
        borderRadius: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: disabled ? 0.5 : 1,
        backgroundColor: light ? (pressed ? c.fillSubtle : c.surface) : pressed ? c.primaryPressed : c.primary,
        borderWidth: light ? 1 : 0,
        borderColor: c.border,
      })}
    >
      {icon ? <Icon name={icon} size={18} color={light ? c.ink : c.onPrimary} stroke={2.4} /> : null}
      <Ink size={15} weight="extraBold" color={light ? c.ink : c.onPrimary}>{label}</Ink>
    </Pressable>
  );
}
