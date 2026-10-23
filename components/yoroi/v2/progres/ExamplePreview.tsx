/**
 * Apercu en filigrane pour les ecrans vides de Progres : le vrai graphique,
 * nourri de donnees d'exemple, voile et marque « exemple », puis une seule action.
 * Quand l'action est un ajout (pesee, seance, mesure), passe plusHint : un repere vers le bouton +
 * remplace le bouton, car le + est la seule zone pour ajouter (vague 13).
 * L'exemple ne capte aucun toucher et ne peut pas etre pris pour tes donnees.
 */
import React from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { PlusHint } from '../PlusHint';
import { GUTTER, PrimaryButton } from './ui';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

/** Etiquette « exemple » bien visible, posee au-dessus de l'apercu (jamais sur la courbe) */
export function ExampleTag({ text = traduire('Exemple') }: { text?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        height: 32,
        borderRadius: 16,
        backgroundColor: P.carte,
        borderWidth: 1.5,
        borderColor: c.border,
        shadowColor: '#1D2029',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
      }}
    >
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" stroke={c.textSecondary} strokeWidth={2.2} strokeLinejoin="round" />
        <Path d="M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" stroke={c.textSecondary} strokeWidth={2.2} />
      </Svg>
      <Ink size={13} weight="extraBold" color={c.textSecondary}>
        {text}
      </Ink>
    </View>
  );
}

type Props = {
  /** Le graphique d'exemple, rendu voile et inerte */
  children: React.ReactNode;
  /** Phrase courte, sans chiffre */
  title: string;
  text: string;
  cta?: string;
  onPress?: () => void;
  /** Repere vers le bouton + a la place du bouton (ajout) */
  plusHint?: string;
  /** Le graphique occupe toute la largeur (sinon il garde les marges) */
  bleed?: boolean;
  /** Opacite de l'apercu */
  dim?: number;
  /** Texte de l'etiquette */
  tag?: string;
  /** Le parent fournit deja les marges */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ExamplePreview({ children, title, text, cta, onPress, plusHint, bleed, dim = 0.38, tag, flush, style }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={style}>
      <View accessible accessibilityLabel={traduire("{0} : aperçu de ce que tu verras, ce ne sont pas tes données", tag ?? traduire('Exemple'))} style={{ paddingHorizontal: bleed || flush ? 0 : GUTTER }}>
        <View pointerEvents="none" style={{ flexDirection: 'row', paddingHorizontal: bleed ? GUTTER : 0, marginBottom: 10 }}>
          <ExampleTag text={tag} />
        </View>
        <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ opacity: dim }}>
          {children}
        </View>
      </View>
      <View style={{ paddingHorizontal: flush ? 0 : GUTTER, marginTop: 18, gap: 6 }}>
        <Ink size={20} weight="black" tight>
          {title}
        </Ink>
        <Ink size={14} color={c.textSecondary}>
          {text}
        </Ink>
        {plusHint ? (
          <PlusHint text={plusHint} style={{ marginTop: 10 }} />
        ) : cta && onPress ? (
          <PrimaryButton label={cta} onPress={onPress} style={{ marginTop: 10 }} />
        ) : null}
      </View>
    </View>
  );
}
