/**
 * La citation du jour mise en forme (17 octobre 2026). Trois styles dessines pour YOROI, au choix dans Personnaliser
 * (lib/v2/accueil/styleCitation.ts), le pinceau par defaut :
 *   pinceau : la citation en lettres franches et espacees, un trait de pinceau qui s'affine de chaque cote
 *   takeda  : la citation en Shippori Mincho, filets or qui s'effacent, le losange de Takeda de chaque cote
 *   sceau   : la citation en Shippori Mincho indigo, filets indigo, un petit sceau carre de chaque cote
 * Deux tailles : la ligne de l'accueil (une ligne, 20 points de haut, jamais coupee a 375 points) et le grand titre
 * de la feuille du conseil du jour (meme typographie, meme ornement, sur deux lignes au plus).
 * Le decor est en or, indigo ou ardoise ; le texte reste en encre ou en indigo du theme (contraste AA).
 */
import React from 'react';
import { View } from 'react-native';
import Reanimated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { isLoaded as policeChargee } from 'expo-font';
import { fontFamilies } from '@/components/yoroi/fonts';
import { Ink } from '@/components/yoroi/v2/Ink';
import { paletteSombre } from '@/components/yoroi/livePalette';
import type { StyleCitation } from '@/lib/v2/accueil/styleCitation';
import { P } from './kit';

/** hauteur de la ligne de l'accueil : une ligne de texte, sans carte ni fond ni bordure */
export const HAUTEUR_CITATION = 20;

/** Couleur du decor de chaque style (jamais du texte) */
function orCitation(): string {
  return paletteSombre() ? '#D8B562' : '#9A7424';
}
function indigoCitation(): string {
  return paletteSombre() ? '#8FA8DE' : '#2C4A84';
}
function ardoiseCitation(): string {
  return paletteSombre() ? '#8D9CC2' : '#5D6D94';
}
export function decorCitation(style: StyleCitation): string {
  return style === 'takeda' ? orCitation() : style === 'sceau' ? indigoCitation() : ardoiseCitation();
}

/** Police de titre : Shippori Mincho (deja chargee pour l'app), sinon la police systeme */
function policeCitation(): { fontFamily?: string; fontWeight?: '800' } {
  try {
    if (policeChargee(fontFamilies.kanji)) return { fontFamily: fontFamilies.kanji };
  } catch {
    // police systeme
  }
  return { fontWeight: '800' };
}

/** Un filet qui s'efface vers l'exterieur */
function Filet({ couleur, vers, largeur }: { couleur: string; vers: 'gauche' | 'droite'; largeur?: number }) {
  return (
    <LinearGradient
      colors={vers === 'gauche' ? [couleur + '00', couleur] : [couleur, couleur + '00']}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={largeur ? { width: largeur, height: 1 } : { flex: 1, minWidth: 14, height: 1 }}
    />
  );
}

/** Le losange de Takeda (quatre losanges poses en losange), dessine pour YOROI */
function Hishi({ couleur, taille = 9 }: { couleur: string; taille?: number }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 10 10">
      <Path d="M5 0.4 L6.9 2.3 L5 4.2 L3.1 2.3 Z M5 5.8 L6.9 7.7 L5 9.6 L3.1 7.7 Z M2.3 3.1 L4.2 5 L2.3 6.9 L0.4 5 Z M7.7 3.1 L9.6 5 L7.7 6.9 L5.8 5 Z" fill={couleur} />
    </Svg>
  );
}

/** Un petit sceau carre, pose de biais, avec son cadre interieur en reserve (l'encre du tampon) */
function Sceau({ couleur, taille = 9 }: { couleur: string; taille?: number }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 10 10">
      <Rect x={1.6} y={1.6} width={6.8} height={6.8} rx={1.1} fill={couleur} transform="rotate(45 5 5)" />
      <Rect x={3.3} y={3.3} width={3.4} height={3.4} rx={0.4} fill="none" stroke={P.paper} strokeWidth={0.8} transform="rotate(45 5 5)" />
    </Svg>
  );
}

/**
 * Un trait de pinceau : il s'attaque franc pres du texte et s'affine vers l'exterieur, avec une veine de papier
 * (les poils secs du pinceau). vers = cote du texte.
 */
function TraitPinceau({ couleur, vers, largeur, hauteur = 5 }: { couleur: string; vers: 'gauche' | 'droite'; largeur?: number; hauteur?: number }) {
  return (
    <View style={[largeur ? { width: largeur } : { flex: 1, minWidth: 18 }, { height: hauteur, transform: vers === 'gauche' ? [{ scaleX: -1 }] : [] }]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 10" preserveAspectRatio="none">
        <Path d="M0.4 5.2 C1 2.4 3.6 1.4 8 1.5 C30 1.9 62 3.4 99.6 5.3 C64 6.6 30 7.9 8 8.4 C3.4 8.5 0.9 7.6 0.4 5.2 Z" fill={couleur} />
        <Path d="M12 4.6 C34 4.5 58 4.9 82 5.3" stroke={P.paper} strokeWidth={0.7} strokeLinecap="round" fill="none" opacity={0.55} />
      </Svg>
    </View>
  );
}

function Motif({ style, couleur, taille }: { style: StyleCitation; couleur: string; taille?: number }) {
  return style === 'takeda' ? <Hishi couleur={couleur} taille={taille} /> : <Sceau couleur={couleur} taille={taille} />;
}

function texteStyle(style: StyleCitation, grand: boolean) {
  if (style === 'pinceau') {
    return { weight: 'black' as const, color: P.ink, extra: { letterSpacing: grand ? 0.3 : 0.55 } };
  }
  return { weight: undefined, color: style === 'sceau' ? indigoCitation() : P.ink, extra: { letterSpacing: 0.25, ...policeCitation() } };
}

/** La ligne de l'accueil : une ligne, centree, le decor de chaque cote */
export function CitationDuJour({ texte, style }: { texte: string; style: StyleCitation }) {
  const decor = decorCitation(style);
  const t = texteStyle(style, false);
  return (
    // un seul moment de mouvement : la citation apparait en fondu (le reglage « reduire les animations » le coupe)
    <Reanimated.View entering={FadeIn.duration(700).delay(250).reduceMotion(ReduceMotion.System)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: HAUTEUR_CITATION, gap: style === 'pinceau' ? 9 : 7 }}>
        {style === 'pinceau' ? <TraitPinceau couleur={decor} vers="gauche" /> : <Filet couleur={decor} vers="gauche" />}
        {style === 'pinceau' ? null : <Motif style={style} couleur={decor} />}
        <Ink size={style === 'pinceau' ? 12.5 : 13} weight={t.weight} color={t.color} numberOfLines={1} style={{ textAlign: 'center', lineHeight: HAUTEUR_CITATION, flexShrink: 1, ...t.extra }}>
          {texte}
        </Ink>
        {style === 'pinceau' ? null : <Motif style={style} couleur={decor} />}
        {style === 'pinceau' ? <TraitPinceau couleur={decor} vers="droite" /> : <Filet couleur={decor} vers="droite" />}
      </View>
    </Reanimated.View>
  );
}

/** Le grand titre de la feuille du conseil : meme typographie, meme ornement, deux lignes au plus */
export function CitationGrande({ texte, style }: { texte: string; style: StyleCitation }) {
  const decor = decorCitation(style);
  const t = texteStyle(style, true);
  return (
    <View style={{ alignItems: 'center', gap: 12 }} accessible accessibilityRole="header" accessibilityLabel={texte}>
      {style === 'pinceau' ? null : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Filet couleur={decor} vers="gauche" largeur={54} />
          <Motif style={style} couleur={decor} taille={12} />
          <Filet couleur={decor} vers="droite" largeur={54} />
        </View>
      )}
      <Ink size={style === 'pinceau' ? 23 : 25} weight={t.weight} color={t.color} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} style={{ textAlign: 'center', lineHeight: style === 'pinceau' ? 30 : 34, ...t.extra }}>
        {texte}
      </Ink>
      {style === 'pinceau' ? (
        // un seul trait de pinceau sous la phrase, attaque a gauche, qui s'affine vers la droite
        <TraitPinceau couleur={decor} vers="droite" largeur={150} hauteur={8} />
      ) : null}
    </View>
  );
}
