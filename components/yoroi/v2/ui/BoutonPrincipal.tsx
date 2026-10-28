/**
 * Bouton principal partage de toute l'application (28 octobre 2026).
 * Houari adore le bouton de l'onboarding (commit 84a77e5f) et le veut partout :
 * degrade bleu nuit #23358F vers indigo #4256C9, texte blanc, ombre douce, hauteur 56, rayon 18.
 * Desactive : fond #E4E7F1, texte #7D8299, bien lisible. En sombre : le pastel du theme (primary), comme avant.
 * Les boutons secondaires (blanc ou pastel clair) ne passent pas par ici.
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';

export const BOUTON_PRINCIPAL = {
  debut: '#23358F',
  fin: '#4256C9',
  texte: '#FFFFFF',
  fondDesactive: '#E4E7F1',
  texteDesactive: '#7D8299',
} as const;

/** Couleurs du bouton principal pour le theme en cours (fond, texte), utile pour un bouton dessine a la main */
export function useCouleursBoutonPrincipal(disabled?: boolean) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const fort = !theme.isDark;
  if (!fort) return { fort, fond: c.primary, texte: c.onPrimary };
  return {
    fort,
    fond: disabled ? BOUTON_PRINCIPAL.fondDesactive : BOUTON_PRINCIPAL.debut,
    texte: disabled ? BOUTON_PRINCIPAL.texteDesactive : BOUTON_PRINCIPAL.texte,
  };
}

export type BoutonPrincipalProps = {
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** icone dessinee dans la couleur du texte */
  icone?: (couleur: string) => React.ReactNode;
  /** contenu sur mesure (titre et precision, etc.), dessine dans la couleur du texte */
  children?: (couleur: string) => React.ReactNode;
  hauteur?: number;
  rayon?: number;
  compact?: boolean;
  tailleTexte?: number;
  /** nombre de lignes du libelle (2 par defaut). Le texte se reduit pour tenir en entier : jamais de libelle coupe. */
  lignes?: number;
  haptique?: 'light' | 'medium' | 'none';
  /** style du cadre exterieur (flex, marges, largeur) */
  style?: StyleProp<ViewStyle>;
  /** style ajoute au bouton lui meme (alignement du contenu, padding) */
  styleBouton?: StyleProp<ViewStyle>;
  testID?: string;
};

export function BoutonPrincipal({
  label,
  onPress,
  disabled,
  loading,
  accessibilityLabel,
  accessibilityHint,
  icone,
  children,
  hauteur = 56,
  rayon = 18,
  compact,
  tailleTexte = 16.5,
  lignes = 2,
  haptique = 'medium',
  style,
  styleBouton,
  testID,
}: BoutonPrincipalProps) {
  const { fort, fond, texte } = useCouleursBoutonPrincipal(disabled);
  const actif = !disabled && !loading;
  return (
    <Pressable
      testID={testID}
      style={style}
      onPress={() => {
        if (!actif) return;
        if (haptique !== 'none') {
          try {
            Haptics.impactAsync(
              haptique === 'medium'
                ? Haptics.ImpactFeedbackStyle.Medium
                : Haptics.ImpactFeedbackStyle.Light,
            );
          } catch {
            // retour haptique indisponible : sans importance
          }
        }
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
    >
      {({ pressed }) => (
        <View
          style={[
            {
              minHeight: hauteur,
              borderRadius: rayon,
              paddingHorizontal: compact ? 12 : 18,
              flexDirection: 'row',
              gap: compact ? 7 : 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: fond,
              opacity: fort ? 1 : disabled ? 0.38 : 1,
            },
            fort && !disabled
              ? {
                  shadowColor: BOUTON_PRINCIPAL.debut,
                  shadowOpacity: 0.28,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 5,
                }
              : null,
            styleBouton,
            { transform: [{ scale: pressed && actif ? 0.97 : 1 }] },
          ]}
        >
          {fort && !disabled ? (
            <LinearGradient
              colors={[BOUTON_PRINCIPAL.debut, BOUTON_PRINCIPAL.fin]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, { borderRadius: rayon }]}
            />
          ) : null}
          {loading ? (
            <ActivityIndicator color={texte} />
          ) : children ? (
            children(texte)
          ) : (
            <>
              {icone ? icone(texte) : null}
              {label ? (
                <Ink
                  size={tailleTexte}
                  weight="extraBold"
                  color={texte}
                  numberOfLines={lignes}
                  adjustsFontSizeToFit
                  minimumFontScale={0.68}
                  style={{ flexShrink: 1, textAlign: 'center' }}
                >
                  {label}
                </Ink>
              ) : null}
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

/**
 * Habillage du bouton principal sans appui propre : pour la pastille d'action dessinee dans une carte
 * deja touchable (la carte entiere ouvre l'ecran). Meme degrade, meme texte blanc.
 */
export function HabillageBoutonPrincipal({
  children,
  style,
  rayon = 16,
}: {
  children: (couleur: string) => React.ReactNode;
  style?: StyleProp<ViewStyle>;
  rayon?: number;
}) {
  const { fort, fond, texte } = useCouleursBoutonPrincipal(false);
  return (
    <View
      style={[
        { borderRadius: rayon, backgroundColor: fond },
        fort
          ? {
              shadowColor: BOUTON_PRINCIPAL.debut,
              shadowOpacity: 0.24,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }
          : null,
        style,
      ]}
    >
      {fort ? (
        <LinearGradient
          colors={[BOUTON_PRINCIPAL.debut, BOUTON_PRINCIPAL.fin]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: rayon }]}
        />
      ) : null}
      {children(texte)}
    </View>
  );
}
