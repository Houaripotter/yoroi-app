// ============================================
// YOROI : Font Scale Manager
//
// 1. Stocke le multiplicateur global (_currentScale)
// 2. Patche React.createElement + react/jsx-runtime
//    pour intercepter TOUS les <Text> et <TextInput>
//    et multiplier leur fontSize automatiquement.
//
// Le patch s'installe UNE SEULE FOIS à l'import du
// module (avant tout render React).
// ============================================

import React from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';

export type FontSizeLevel = 1 | 2 | 3 | 4;

export const FONT_SIZE_SCALES: Record<FontSizeLevel, number> = {
  1: 0.75,
  2: 1.0,
  3: 1.12,
  4: 1.22,
};

export const FONT_SIZE_LABELS: Record<FontSizeLevel, string> = {
  1: 'S',
  2: 'M',
  3: 'L',
  4: 'XL',
};

export const STORAGE_KEY_FONT_SIZE = 'yoroi_font_size_level_v1';

// ── Référence au multiplicateur courant ─────────────────────────────────────
let _currentScale = 1.0;

export function getCurrentFontScale(): number {
  return _currentScale;
}

export function applyFontScale(scale: number): void {
  _currentScale = scale;
}

// ── Capture les refs Text/TextInput AVANT tout patch ────────────────────────
const _TextRef = Text;
const _TextInputRef = TextInput;

// ── Transforme un style en appliquant le scale sur fontSize ─────────────────
function _scaleStyle(style: any): any {
  if (!style) return style;
  if (Array.isArray(style)) return style.map(_scaleStyle);
  const flat: any = StyleSheet.flatten(style);
  if (flat && typeof flat.fontSize === 'number') {
    return { ...flat, fontSize: Math.round(flat.fontSize * _currentScale) };
  }
  return style;
}

// ── Transforme les props si le composant est un Text ─────────────────────────
function _transformProps(type: any, props: any): any {
  if (
    _currentScale === 1.0 ||
    props == null ||
    props.style == null ||
    (type !== _TextRef && type !== _TextInputRef)
  ) {
    return props;
  }
  const scaledStyle = _scaleStyle(props.style);
  if (scaledStyle === props.style) return props;
  return { ...props, style: scaledStyle };
}

// ── Installation du patch (appelé une seule fois à l'import) ─────────────────
let _patched = false;

function _installPatch(): void {
  if (_patched) return;
  _patched = true;

  // 1. React.createElement (JSX transform classique ou appels directs)
  try {
    const _origCreate = React.createElement;
    (React as any).createElement = function (type: any, props: any, ...rest: any[]) {
      return _origCreate(type, _transformProps(type, props), ...rest);
    };
  } catch (_) {}

  // 2. react/jsx-runtime, utilisé par babel-preset-expo (JSX automatique)
  //    Metro compile <Text style={...}> en _jsxRuntime.jsx(Text, {...})
  //    → la propriété est accédée à CHAQUE appel, donc le patch s'applique.
  try {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const rt: any = require('react/jsx-runtime');
    if (typeof rt.jsx === 'function') {
      const _origJsx = rt.jsx;
      rt.jsx = function (type: any, props: any, key?: any) {
        return _origJsx(type, _transformProps(type, props), key);
      };
    }
    if (typeof rt.jsxs === 'function') {
      const _origJsxs = rt.jsxs;
      rt.jsxs = function (type: any, props: any, key?: any) {
        return _origJsxs(type, _transformProps(type, props), key);
      };
    }
  } catch (_) {}

  // 3. react/jsx-dev-runtime (Expo Go / Metro en développement)
  try {
    const devRt: any = require('react/jsx-dev-runtime');
    if (typeof devRt.jsxDEV === 'function') {
      const _origJsxDev = devRt.jsxDEV;
      devRt.jsxDEV = function (type: any, props: any, key?: any, ...rest: any[]) {
        return _origJsxDev(type, _transformProps(type, props), key, ...rest);
      };
    }
  } catch (_) {}
}

// Installer immédiatement à l'import du module
_installPatch();
