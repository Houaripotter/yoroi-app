/**
 * Briques de l'onglet Progres, maquette C « Themes en onglets » (validee par Houari le 28 octobre 2026) :
 *  - les cinq themes en grosses pastilles avec leur sticker (Corps, Force, Cardio, Sante, Photos) ;
 *  - leur version compacte, collee en haut quand tu descends dans le detail ;
 *  - « Ta semaine en une phrase » et « Ta petite victoire du jour » (emprunt a la maquette A) ;
 *  - la phrase de chaque theme, les petites capitales colorees, les pastilles et les lignes de detail.
 * Fond #F5F6FB, cartes blanches, teintes pastel (creme, bleu, menthe, lilas, peche), stickers selon le reglage
 * Illustrations. Les phrases viennent de lib/v2/progres/phrasesProgres.ts (jamais sans chiffre reel).
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { Ink } from '../Ink';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { useIllustrations } from '../stickers';
import type { NomSticker } from '../stickers';
import { carteBlanche } from '../seance/pastel';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { usePremium } from '@/context/PremiumContext';
import { FREE_CHART_FALLBACK_DAYS, isPremiumPeriod } from '../charts/PeriodSwitch';
import type { PeriodOption } from '../charts/PeriodSwitch';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import type { Phrase, Victoire } from '@/lib/v2/progres/phrasesProgres';
import { traduire } from '@/lib/i18n/tr';

export type TeinteProgres = 'creme' | 'bleu' | 'menthe' | 'lilas' | 'peche';

/** fond, encre (petites capitales, texte du theme choisi) et plein (pastilles), clair puis sombre */
const TEINTES: Record<TeinteProgres, { fond: string; encre: string; plein: string; fondSombre: string; encreSombre: string }> = {
  creme: { fond: '#F6EEDD', encre: '#A57A1C', plein: '#F4C27A', fondSombre: '#3A3428', encreSombre: '#E8C66A' },
  bleu: { fond: '#E6ECF8', encre: '#3557D9', plein: '#9FB3F7', fondSombre: '#2A3557', encreSombre: '#B9C8FF' },
  menthe: { fond: '#E3F2EA', encre: '#1C6B45', plein: '#8FD9B6', fondSombre: '#22362D', encreSombre: '#8FD9B6' },
  lilas: { fond: '#EFE6F3', encre: '#8A3F78', plein: '#C9B3E6', fondSombre: '#352B3D', encreSombre: '#E3A3CB' },
  peche: { fond: '#FFE1D6', encre: '#B4471E', plein: '#F4A38C', fondSombre: '#3A2622', encreSombre: '#F0A58C' },
};

export function teinte(t: TeinteProgres): { fond: string; encre: string; plein: string } {
  const p = TEINTES[t];
  return paletteSombre() ? { fond: p.fondSombre, encre: p.encreSombre, plein: p.plein } : { fond: p.fond, encre: p.encre, plein: p.plein };
}

export const THEMES = ['Corps', 'Force', 'Cardio', 'Santé', 'Photos'] as const;
export type ThemeProgres = (typeof THEMES)[number];

export const THEME_INFO: Record<ThemeProgres, { teinte: TeinteProgres; sticker: NomSticker }> = {
  Corps: { teinte: 'creme', sticker: 'balance' },
  Force: { teinte: 'bleu', sticker: 'force' },
  Cardio: { teinte: 'menthe', sticker: 'chaussure' },
  Santé: { teinte: 'lilas', sticker: 'coeur' },
  Photos: { teinte: 'peche', sticker: 'appareil_photo' },
};

/** Le nom du theme dans la langue de l'app */
export function nomTheme(t: ThemeProgres): string {
  return traduire(t);
}

/** Petites capitales colorees (TON POIDS, TA COMPOSITION), avec une action a droite */
export function Capitales({ texte, couleur, style, action, onAction }: { texte: string; couleur: string; style?: StyleProp<ViewStyle>; action?: string; onAction?: () => void }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 22 }, style]}>
      <Ink size={11} weight="black" color={couleur} numberOfLines={2} style={{ letterSpacing: 1.4, flexShrink: 1 }}>
        {texte.toUpperCase()}
      </Ink>
      {action && onAction ? <LienDetail texte={action} onPress={onAction} /> : null}
    </View>
  );
}

/** « Chaque mesure › » : un petit lien bleu nuit, zone d'appui de 44 points */
export function LienDetail({ texte, onPress, couleur }: { texte: string; onPress: () => void; couleur?: string }) {
  const { theme } = useYoroiTheme();
  const col = couleur ?? theme.colors.accentText;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={texte} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 2, opacity: pressed ? 0.6 : 1 })}>
      <Ink size={13} weight="extraBold" color={col} numberOfLines={1}>
        {texte}
      </Ink>
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Path d="M9 6l6 6-6 6" stroke={col} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}

/** Pastille de couleur (« 210 g de moins par semaine », « 4 paliers sur 4 ») */
export function Pastille({ texte, t = 'menthe', style }: { texte: string; t?: TeinteProgres; style?: StyleProp<ViewStyle> }) {
  const c = teinte(t);
  return (
    <View style={[{ flexShrink: 1, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: c.fond }, style]}>
      <Ink size={12} weight="extraBold" color={c.encre} numberOfLines={2}>
        {texte}
      </Ink>
    </View>
  );
}

export function Chevron({ couleur, taille = 16 }: { couleur: string; taille?: number }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      <Path d="M9 6l6 6-6 6" stroke={couleur} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Une ligne de detail : le sticker dans un carre pastel, le titre, la phrase dessous, une valeur ou une pastille a droite */
export function LigneDetail({ sticker, fond, titre, sous, valeur, extra, dessous, premiere, onPress, a11y }: { sticker: NomSticker; fond?: string; titre: string; sous?: string | null; valeur?: string | null; extra?: React.ReactNode; /** sous la phrase (une pastille qui ne doit pas serrer le titre, en allemand par exemple) */ dessous?: React.ReactNode; premiere?: boolean; onPress?: () => void; a11y?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              selectionAsync().catch(() => {});
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={a11y ?? [titre, sous, valeur].filter(Boolean).join(', ')}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8, borderTopWidth: premiere ? 0 : 1, borderColor: c.divider, opacity: pressed ? 0.7 : 1 })}
    >
      {fond ? (
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: fond, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={illus.img(sticker)} style={{ width: 28, height: 28 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
      ) : (
        <Image source={illus.img(sticker)} style={{ width: 34, height: 34 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Ink size={15} weight="extraBold" numberOfLines={2}>
          {titre}
        </Ink>
        {sous ? (
          <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={3}>
            {sous}
          </Ink>
        ) : null}
        {dessous ? <View style={{ flexDirection: 'row', marginTop: 4 }}>{dessous}</View> : null}
      </View>
      {extra}
      {valeur ? (
        <Ink size={16} weight="extraBold" numberOfLines={1}>
          {valeur}
        </Ink>
      ) : null}
      {onPress ? <Chevron couleur={c.textMuted} /> : null}
    </Pressable>
  );
}

/** Carte blanche fine (coins de 24, ombre douce) */
export function CarteB({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  return <View style={[carteBlanche(theme.colors.surface, theme.colors.border), { borderRadius: 24, paddingHorizontal: 14, paddingVertical: 4 }, style]}>{children}</View>;
}

/** Les cinq themes en grosses pastilles : le choisi dans sa teinte, cercle de son encre ; les autres en blanc */
export function TuilesThemes({ choisi, onChoisir, style }: { choisi: ThemeProgres; onChoisir: (t: ThemeProgres) => void; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const illus = useIllustrations();
  return (
    <View style={[{ flexDirection: 'row', gap: 6 }, style]} accessibilityRole="tablist">
      {THEMES.map((t) => {
        const on = t === choisi;
        const k = teinte(THEME_INFO[t].teinte);
        return (
          <Pressable
            key={t}
            onPress={() => onChoisir(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={nomTheme(t)}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 0,
              height: 78,
              borderRadius: 22,
              borderWidth: 2,
              borderColor: on ? k.encre : c.surface,
              backgroundColor: on ? k.fond : c.surface,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              paddingHorizontal: 3,
              opacity: pressed ? 0.85 : 1,
              shadowColor: '#1D2033',
              shadowOpacity: on ? 0.08 : 0.04,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: on ? 3 : 1,
            })}
          >
            <Image source={illus.img(THEME_INFO[t].sticker)} style={{ width: 32, height: 32 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            <Ink size={12.5} weight="extraBold" color={on ? k.encre : c.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
              {nomTheme(t)}
            </Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

/** La barre collee en haut quand tu descends : le titre, puis les cinq themes en petites pastilles */
export function BarreThemesCollee({ choisi, onChoisir, haut }: { choisi: ThemeProgres; onChoisir: (t: ThemeProgres) => void; haut: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ paddingTop: haut + 8, paddingBottom: 10, paddingHorizontal: 16, backgroundColor: paletteSombre() ? 'rgba(16,19,27,0.97)' : 'rgba(245,246,251,0.97)', borderBottomWidth: 1, borderColor: paletteSombre() ? '#242935' : '#E6E8F1' }}>
      <Ink size={15} weight="extraBold" style={{ textAlign: 'center', marginBottom: 8 }} accessibilityRole="header">
        {traduire('Progrès')}
      </Ink>
      <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="tablist">
        {THEMES.map((t) => {
          const on = t === choisi;
          const k = teinte(THEME_INFO[t].teinte);
          return (
            <Pressable
              key={t}
              onPress={() => onChoisir(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={nomTheme(t)}
              hitSlop={{ top: 5, bottom: 5 }}
              style={({ pressed }) => ({ flex: 1, minWidth: 0, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, backgroundColor: on ? k.fond : c.surface, opacity: pressed ? 0.8 : 1 })}
            >
              <Ink size={12} weight="extraBold" color={on ? k.encre : c.textSecondary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                {nomTheme(t)}
              </Ink>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Le texte d'une phrase, son chiffre en couleur s'il y en a un */
export function TextePhrase({ phrase, size = 17, couleurChiffre }: { phrase: Phrase; size?: number; couleurChiffre: string }) {
  const i = phrase.chiffre ? phrase.texte.indexOf(phrase.chiffre) : -1;
  return (
    <Ink size={size} weight="extraBold" style={{ lineHeight: Math.round(size * 1.33), letterSpacing: -0.2 }}>
      {i < 0 ? (
        phrase.texte
      ) : (
        <>
          {phrase.texte.slice(0, i)}
          <Ink size={size} weight="extraBold" color={couleurChiffre}>
            {phrase.chiffre}
          </Ink>
          {phrase.texte.slice(i + (phrase.chiffre?.length ?? 0))}
        </>
      )}
    </Ink>
  );
}

/** Ta semaine en une phrase, et dessous ta petite victoire du jour (maquette A) */
export function CarteSemaine({ phrase, victoire, style }: { phrase: Phrase; victoire: Victoire | null; style?: StyleProp<ViewStyle> }) {
  const sombre = paletteSombre();
  const illus = useIllustrations();
  const creme = teinte('creme');
  const peche = teinte('peche');
  return (
    <LinearGradient
      colors={sombre ? ['#3A3428', '#3A2A24'] : ['#F6EEDD', '#FFE9DE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={[{ borderRadius: 28, paddingHorizontal: 16, paddingTop: 14, paddingBottom: victoire ? 12 : 16 }, style]}
    >
      <Capitales texte={traduire('Ta semaine en une phrase')} couleur={creme.encre} />
      <View style={{ marginTop: 6 }}>
        <TextePhrase phrase={phrase} size={18} couleurChiffre={peche.encre} />
      </View>
      {victoire ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, borderRadius: 18, paddingVertical: 7, paddingLeft: 8, paddingRight: 12, backgroundColor: sombre ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.75)' }}>
          <Image source={illus.img('noter')} style={{ width: 28, height: 28 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Ink size={10.5} weight="black" color={creme.encre} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ letterSpacing: 1.1 }}>
              {traduire('Ta petite victoire du jour').toUpperCase()}
            </Ink>
            <Ink size={13.5} weight="extraBold" numberOfLines={2}>
              {victoire.texte}
            </Ink>
          </View>
        </View>
      ) : null}
    </LinearGradient>
  );
}

/** La phrase d'un theme (TON CORPS EN UNE PHRASE), dans sa teinte */
export function PhraseTheme({ t, titre, phrase, style }: { t: TeinteProgres; titre: string; phrase: Phrase; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const k = teinte(t);
  return (
    <View style={[{ borderRadius: 24, backgroundColor: k.fond, paddingHorizontal: 16, paddingVertical: 14 }, style]}>
      <Capitales texte={titre} couleur={k.encre} />
      <View style={{ marginTop: 6 }}>
        <TextePhrase phrase={phrase} size={17} couleurChiffre={theme.colors.ink} />
      </View>
    </View>
  );
}

/**
 * Composition du corps aux teintes harmonisees de Progres (maquette C) : bleu pour le muscle, peche pour la graisse,
 * creme pour l'os, bleu d'eau pour l'eau. Plus de violet sature ni d'orange criard. barre : les aplats de la barre et
 * les pastilles ; trait : les petites courbes (un cran plus soutenu, lisible sur blanc).
 */
export const CORPS_PASTEL = {
  get barre() {
    return paletteSombre() ? { muscle: '#7F95E0', graisse: '#E08F78', os: '#D9B060', eau: '#6FB0CC' } : { muscle: '#9FB3F7', graisse: '#F4A38C', os: '#F4C27A', eau: '#9FCFE6' };
  },
  get trait() {
    return paletteSombre() ? { muscle: '#8FA8F0', graisse: '#F0A58C', os: '#E8C66A', eau: '#7CC3E0' } : { muscle: '#5B78E6', graisse: '#E58466', os: '#C9A24A', eau: '#6FB7D6' };
  },
};

/** La couleur pastel d'une courbe du corps par sa cle (null : on garde la sienne) */
export function couleurPastelCorps(key: string): string | null {
  const t = CORPS_PASTEL.trait;
  if (key === 'muscle' || key === 'muscleKg' || key === 'lean') return t.muscle;
  if (key === 'fat' || key === 'fatKg' || key === 'visceral') return t.graisse;
  if (key === 'water') return t.eau;
  if (key === 'bone') return t.os;
  return null;
}

function Cadenas({ couleur }: { couleur: string }) {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={10} rx={3} stroke={couleur} strokeWidth={2.8} />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={couleur} strokeWidth={2.8} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Le choix de la periode en pastel (maquette C) : une piste gris bleute, la periode choisie en pastille blanche.
 * Meme regle Premium que PeriodSwitch (1 an et Tout restent Premium, cadenas et paywall), meme repli en gratuit.
 */
export function SelecteurPeriode({ value, onChange, options, style }: { value: number; onChange: (v: number) => void; options: PeriodOption[]; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const sombre = paletteSombre();
  const { isPremium, isLoading } = usePremium();
  const lockOn = !isPremium && !isLoading;
  React.useEffect(() => {
    if (lockOn && isPremiumPeriod(value)) {
      const repli = options.find((o) => o.value === FREE_CHART_FALLBACK_DAYS) ?? options.find((o) => !isPremiumPeriod(o.value));
      if (repli) onChange(repli.value);
    }
  }, [lockOn, value, options, onChange]);
  return (
    <View style={[{ height: 40, padding: 4, borderRadius: 20, flexDirection: 'row', gap: 2, backgroundColor: sombre ? c.fillSoft : '#EEF1FA' }, style]} accessibilityRole="tablist">
      {options.map((p) => {
        const verrou = lockOn && isPremiumPeriod(p.value);
        const on = p.value === value && !verrou;
        return (
          <Pressable
            key={p.label}
            onPress={() => {
              selectionAsync().catch(() => {});
              if (verrou) {
                ouvrirPaywall('periode_longue');
                return;
              }
              onChange(p.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${p.value ? traduire('Période {0}', traduire(p.label)) : traduire('Tout l’historique')}${verrou ? traduire(', avec Premium') : ''}`}
            hitSlop={{ top: 4, bottom: 4 }}
            style={{
              flex: 1,
              borderRadius: 16,
              flexDirection: 'row',
              gap: 3,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: on ? c.surface : 'transparent',
              shadowColor: '#23358F',
              shadowOpacity: on ? 0.12 : 0,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: on ? 2 : 0,
            }}
          >
            {verrou ? <Cadenas couleur={c.textMuted} /> : null}
            <Ink size={12.5} weight={on ? 'extraBold' : 'bold'} color={on ? c.accentText : verrou ? c.textMuted : c.textSecondary} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {traduire(p.label)}
            </Ink>
          </Pressable>
        );
      })}
    </View>
  );
}
