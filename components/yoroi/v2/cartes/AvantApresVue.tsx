/**
 * Carte Avant apres (17 octobre 2026) : tes deux photos de corps cote a cote, dans les trois formats
 * (en Story les photos sont hautes : un corps en entier tient sans etre coupe, la tete comprise). Sur chaque photo, « Avant » ou « Après », sa date et son poids
 * s'il y a une pesee a 3 jours pres. En bas : le temps ecoule, l'ecart de poids s'il existe, la signature.
 * Pas de personnage, pas de decor : les photos parlent. Une photo floutee le reste sur la carte.
 */
import React from 'react';
import { Image, View } from 'react-native';
import type { TextStyle } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { FontWeightKey } from '@/components/yoroi/tokens';
import { dateAvantApres, lignesPoids } from '@/lib/v2/cartes/avantApres';
import { dureeTexte } from '@/lib/v2/photos/outils';
import type { CarteData, OptionsCarte, PhotoCarte } from '@/lib/v2/cartes/types';
import { traduire } from '@/lib/i18n/tr';

type Couleurs = { fond: string; ink: string; muted: string; accent: string; vide: string; etiquette: string; etiquetteInk: string; etiquetteMuted: string };

export function couleursAvantApres(sombre: boolean): Couleurs {
  return sombre
    ? { fond: '#14161F', ink: '#F2F1EC', muted: 'rgba(242,241,236,0.66)', accent: '#8FA8DE', vide: '#232633', etiquette: 'rgba(20,22,31,0.82)', etiquetteInk: '#F2F1EC', etiquetteMuted: 'rgba(242,241,236,0.74)' }
    : { fond: '#F2F1EC', ink: '#1D2029', muted: '#6B6E78', accent: '#2C4A84', vide: '#E2DFD6', etiquette: 'rgba(242,241,236,0.9)', etiquetteInk: '#1D2029', etiquetteMuted: '#4A4D57' };
}

/** Force du flou : assez pour que rien ne se reconnaisse, comme dans ton coffre */
export const FLOU = 28;

function T({ children, size, weight = 'medium', color, style }: { children: React.ReactNode; size: number; weight?: FontWeightKey; color: string; style?: TextStyle }) {
  return (
    <Ink size={size} weight={weight} color={color} allowFontScaling={false} maxFontSizeMultiplier={1} numberOfLines={1} style={style}>
      {children}
    </Ink>
  );
}

function Photo({ p, mot, poids, flou, k, compact }: { p: PhotoCarte; mot: string; poids: string | null; flou: boolean; k: Couleurs; compact: boolean }) {
  return (
    <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: k.vide }}>
      {p.uri ? <Image source={{ uri: p.uri }} blurRadius={flou ? FLOU : 0} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} resizeMode="cover" /> : null}
      {flou && p.uri ? <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: k.vide, opacity: 0.35 }} /> : null}
      <View style={{ position: 'absolute', left: 8, bottom: 8, maxWidth: '88%', borderRadius: 11, paddingHorizontal: 9, paddingVertical: compact ? 5 : 6, backgroundColor: k.etiquette, gap: 1 }}>
        <T size={compact ? 13 : 15} weight="black" color={k.etiquetteInk}>{mot}</T>
        <T size={compact ? 10.5 : 11.5} weight="bold" color={k.etiquetteMuted}>{dateAvantApres(p.date)}</T>
        {poids ? <T size={compact ? 10.5 : 11.5} weight="bold" color={k.etiquetteInk}>{poids}</T> : null}
      </View>
    </View>
  );
}

export function AvantApresVue({ d, o, H, signature }: { d: CarteData; o: OptionsCarte; H: number; signature: React.ReactNode }) {
  const x = d.avantApres;
  const k = couleursAvantApres(o.sombre);
  if (!x) return null;
  const story = o.format === 'story';
  const carre = o.format === 'carre';
  const poids = lignesPoids(d, o.masque);
  const temps = x.jours > 0 ? dureeTexte(x.jours) : traduire('Le même jour');
  const flou = !!o.flou;
  const gros = carre ? 24 : story ? 32 : 28;
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, right: 0, height: H, backgroundColor: k.fond, paddingTop: story ? 34 : carre ? 14 : 18, paddingHorizontal: carre ? 14 : 16, paddingBottom: story ? 16 : 12 }}>
      <T size={carre ? 17 : 20} weight="black" color={k.ink} style={{ letterSpacing: -0.6, marginBottom: carre ? 8 : 10 }}>{traduire("Avant, après")}</T>
      <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
        <Photo p={x.avant} mot={traduire("Avant")} poids={poids.avant} flou={flou} k={k} compact={carre} />
        <Photo p={x.apres} mot={traduire("Après")} poids={poids.apres} flou={flou} k={k} compact={carre} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 18, marginTop: carre ? 8 : 12, marginBottom: carre ? 8 : 12 }}>
        <View style={{ flexShrink: 1 }}>
          <T size={gros} weight="black" color={k.accent} style={{ letterSpacing: -1 }}>{temps}</T>
          <T size={carre ? 11 : 12} weight="bold" color={k.muted}>{x.jours > 0 ? traduire('entre les deux photos') : traduire('deux photos du même jour')}</T>
        </View>
        {poids.ecart ? (
          <View style={{ flexShrink: 1 }}>
            <T size={gros} weight="black" color={k.ink} style={{ letterSpacing: -1 }}>{poids.ecart}</T>
            <T size={carre ? 11 : 12} weight="bold" color={k.muted}>{o.masque === 'pourcentage' ? traduire('de mon poids') : traduire('sur la balance')}</T>
          </View>
        ) : null}
      </View>
      {signature}
    </View>
  );
}
