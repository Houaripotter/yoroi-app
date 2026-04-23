/**
 * YoroiText · Remplacement global de React Native's Text
 *
 * Ce fichier est injecté à la place de react-native/Libraries/Text/Text
 * via metro.config.js (resolveRequest).
 *
 * Il est un wrapper transparent : à scale=1.0 il se comporte exactement
 * comme le Text natif. Quand l'utilisateur change la taille de police
 * dans les Réglages, il multiplie tous les fontSize automatiquement.
 *
 * IMPORTANT : ce fichier ne doit PAS importer depuis 'react-native' de façon
 * à déclencher à nouveau l'alias Text (boucle infinie). Metro est configuré
 * pour exclure ce fichier de la redirection.
 */

import React from 'react';
// Ces imports ne passent PAS par l'alias (metro.config.js le garantit)
import { Text as RNText, StyleSheet } from 'react-native';
import type { TextProps } from 'react-native';
import { getCurrentFontScale } from '@/lib/fontScaleManager';

const YoroiText = React.forwardRef<any, TextProps>(function YoroiText(props, ref) {
  const scale = getCurrentFontScale();

  // Scale == 1.0 → wrapper totalement transparent, aucune surcharge
  if (scale === 1.0) {
    return React.createElement(RNText, Object.assign({}, props, { ref }));
  }

  // Flatten le style (gère les IDs StyleSheet ET les objets inline)
  const flat = props.style !== undefined
    ? (StyleSheet.flatten(props.style as any) as Record<string, any> | null)
    : null;

  if (flat && typeof flat.fontSize === 'number') {
    const scaledStyle = { ...flat, fontSize: Math.round(flat.fontSize * scale) };
    return React.createElement(RNText, Object.assign({}, props, { ref, style: scaledStyle }));
  }

  return React.createElement(RNText, Object.assign({}, props, { ref }));
});

YoroiText.displayName = 'Text';

export default YoroiText;
