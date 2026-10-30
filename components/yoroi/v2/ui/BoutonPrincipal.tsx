/**
 * Bouton principal partage de toute l'application (28 octobre 2026).
 * Houari adore le bouton de l'onboarding (commit 84a77e5f) et le veut partout :
 * degrade bleu nuit #23358F vers indigo #4256C9, texte blanc, ombre douce, hauteur 56, rayon 18.
 * Desactive : fond #E4E7F1, texte #7D8299, bien lisible. En sombre : le pastel du theme (primary), comme avant.
 * Les boutons secondaires (blanc ou pastel clair) ne passent pas par ici.
 */
import React from 'react';
import { ActivityIndicator, PixelRatio, Pressable, StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
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

/**
 * Taille du libelle (28 octobre 2026, fenetre « Revenir a tes donnees ? » du Studio).
 * Avant : adjustsFontSizeToFit natif. Sous la nouvelle architecture iOS, dans une rangee de boutons en flex 1,
 * le texte est d'abord mesure dans une largeur nulle ou minuscule, la police est reduite a ce moment la
 * et minimumFontScale n'est pas respecte : « Revenir » finissait a un tiers de sa taille.
 * Maintenant la taille est calculee ici, a partir de la largeur reelle du bouton :
 * taille normale tant que le texte tient, deux lignes avant de reduire, jamais sous 80 %.
 */
export const ECHELLE_MIN_LIBELLE = 0.8;
/** largeur moyenne d'un caractere en Archivo extra gras, en fraction de la taille de police (valeur prudente) */
const LARGEUR_CARACTERE = 0.6;
const LARGEUR_ESPACE = 0.28;
const PAS_ECHELLE = [1, 0.95, 0.9, 0.85, ECHELLE_MIN_LIBELLE];

function lignesNecessaires(texte: string, largeur: number, police: number): number {
  const espace = police * LARGEUR_ESPACE;
  let lignes = 1;
  let courante = 0;
  for (const mot of texte.trim().split(/\s+/)) {
    const l = mot.length * police * LARGEUR_CARACTERE;
    if (l > largeur) {
      // mot plus long que la ligne : il est coupe sur plusieurs lignes
      if (courante > 0) lignes += 1;
      lignes += Math.ceil(l / largeur) - 1;
      courante = l - (Math.ceil(l / largeur) - 1) * largeur;
    } else if (courante === 0) {
      courante = l;
    } else if (courante + espace + l <= largeur) {
      courante += espace + l;
    } else {
      lignes += 1;
      courante = l;
    }
  }
  return lignes;
}

/**
 * Taille de police du libelle pour une largeur disponible (en points).
 * Largeur inconnue (0, avant la premiere mesure) : taille normale, jamais de reduction a l'aveugle.
 */
export function tailleLibelle({
  texte,
  largeur,
  taille,
  lignes = 2,
  echelleSysteme = 1,
}: {
  texte: string;
  largeur: number;
  taille: number;
  lignes?: number;
  echelleSysteme?: number;
}): number {
  if (!texte || !(largeur > 0)) return taille;
  for (const e of PAS_ECHELLE) {
    if (lignesNecessaires(texte, largeur, taille * e * echelleSysteme) <= lignes) return Math.round(taille * e * 10) / 10;
  }
  return Math.round(taille * ECHELLE_MIN_LIBELLE * 10) / 10;
}

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
  /** nombre de lignes du libelle (2 par defaut). Le texte passe d'abord a la ligne, puis se reduit, jamais sous 80 %. */
  lignes?: number;
  haptique?: 'light' | 'medium' | 'none';
  /** style du cadre exterieur (flex, marges, largeur) */
  style?: StyleProp<ViewStyle>;
  /** style ajoute au bouton lui meme (alignement du contenu, padding) */
  styleBouton?: StyleProp<ViewStyle>;
  /**
   * Le fond remplit toute la hauteur du cadre (rangee de boutons de hauteurs differentes).
   * Par defaut : oui seulement si le cadre est etire par `style` (flex, flexGrow ou height), voir cadreEtire().
   */
  remplir?: boolean;
  testID?: string;
};

/**
 * 30 octobre 2026 (Houari : « un bloc bleu geant Commencer prend toute la page programme ») :
 * le fond du bouton avait toujours flexGrow 1, pour prendre la hauteur du voisin dans une rangee.
 * Sous Yoga (iOS, iPad, Mac), dans une colonne dont la hauteur n'est pas fixee (carte du haut de la page
 * programme, dans un ScrollView), ce flexGrow s'etirait sur toute la hauteur disponible : bouton geant,
 * et la page ne defilait plus jusqu'en bas. Maintenant le fond ne grandit que si le cadre lui meme est etire.
 */
export function cadreEtire(style: StyleProp<ViewStyle>): boolean {
  const s = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  return Number(s.flex) > 0 || Number(s.flexGrow) > 0 || (s.height !== undefined && s.height !== null && s.height !== 'auto');
}

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
  remplir,
  testID,
}: BoutonPrincipalProps) {
  const etire = remplir ?? cadreEtire(style);
  const { fort, fond, texte } = useCouleursBoutonPrincipal(disabled);
  const actif = !disabled && !loading;
  const [largeur, setLargeur] = React.useState(0);
  const padding = compact ? 12 : 18;
  const plat = StyleSheet.flatten(styleBouton) ?? {};
  const padG = Number(plat.paddingLeft ?? plat.paddingHorizontal ?? plat.padding ?? padding) || 0;
  const padD = Number(plat.paddingRight ?? plat.paddingHorizontal ?? plat.padding ?? padding) || 0;
  const place = largeur > 0 ? largeur - padG - padD - (icone ? 20 + (Number(plat.gap) || (compact ? 7 : 10)) : 0) : 0;
  const taille = label
    ? tailleLibelle({ texte: label, largeur: place, taille: tailleTexte, lignes, echelleSysteme: Math.min(PixelRatio.getFontScale() || 1, 1.4) })
    : tailleTexte;
  const surMesure = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== largeur) setLargeur(w);
  };
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
          onLayout={surMesure}
          style={[
            {
              // flexGrow seulement si le cadre est etire : dans une rangee, meme hauteur que le voisin (Annuler) ;
              // jamais dans une colonne libre, ou Yoga l'etirait sur toute la page (30 octobre 2026)
              ...(etire ? { flexGrow: 1 } : null),
              minHeight: hauteur,
              borderRadius: rayon,
              paddingHorizontal: padding,
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
                  testID={testID ? `${testID}-libelle` : 'bouton-principal-libelle'}
                  size={taille}
                  weight="extraBold"
                  color={texte}
                  numberOfLines={lignes}
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
