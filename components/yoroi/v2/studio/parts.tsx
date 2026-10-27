/**
 * Briques du Studio YOROI : contexte partage (rubrique ouverte, recherche, demo chargee,
 * fenetres plein ecran, effacement complet), pages de rubrique, tuiles, pastilles, notes.
 * 26 octobre 2026 : habillage des pages Programmes et Coach (usePaletteProgramme) : fond bleu clair,
 * cartes blanches tres arrondies, carres d'icone teintes (indigo, orange, vert), grands titres.
 * Plus aucun accordeon : chaque rubrique est une tuile qui ouvre sa page d'un toucher.
 */
import React, { createContext, useContext, useState } from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { GUTTER, Icon } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import { traduire } from '@/lib/i18n/tr';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { paletteSombre } from '@/components/yoroi/livePalette';
import Svg, { Path } from 'react-native-svg';

// ===== Contexte du Studio =====

/** Fenetres plein ecran ouvertes par-dessus le Studio (donnees fictives, rien n'est ecrit) */
export type StudioOverlay =
  | { kind: 'chargement' }
  | { kind: 'rang'; rankIndex: number }
  | { kind: 'dan' }
  | { kind: 'plaque' }
  | { kind: 'sceaux' }
  | { kind: 'lune' }
  | { kind: 'bienvenue' };

export type StudioContextValue = {
  query: string;
  isOpen: (id: string) => boolean;
  toggle: (id: string) => void;
  openSection: (id: string) => void;
  onY: (id: string, y: number) => void;
  demoActive: boolean;
  /** relit l'etat de la demo (apres chargement ou retour des vraies donnees) */
  refreshDemo: () => void;
  show: (o: StudioOverlay) => void;
  /** « Tout effacer et repartir de zéro » : la premiere confirmation, puis le mot a ecrire */
  repartirDeZero: () => void;
};

const NOOP: StudioContextValue = {
  query: '',
  isOpen: () => true,
  toggle: () => undefined,
  openSection: () => undefined,
  onY: () => undefined,
  demoActive: false,
  refreshDemo: () => undefined,
  show: () => undefined,
  repartirDeZero: () => undefined,
};

export const StudioContext = createContext<StudioContextValue>(NOOP);
export const useStudio = () => useContext(StudioContext);

/** Recherche sans accents ni majuscules */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function matches(query: string, ...texts: (string | undefined)[]): boolean {
  const q = fold(query.trim());
  if (!q) return true;
  return q.split(/\s+/).every((w) => fold(texts.filter(Boolean).join(' ')).includes(w));
}

// ===== Page de rubrique =====

/**
 * Contenu d'une rubrique du Studio. Depuis le 26 octobre 2026 il n'y a plus d'accordeon : la rubrique
 * s'ouvre en page entiere depuis sa tuile (app/creator-mode.tsx, qui affiche le titre et le retour).
 * Titre, sous-titre et mots cles restent declares ici pour memoire, la tuile reprend les siens.
 */
export function StudioSection({ children }: { id: string; title: string; sub?: string; icon?: IconName; keywords?: string; children: React.ReactNode }) {
  return (
    <Animated.View entering={ENTREE} style={{ gap: 12 }}>
      {children}
    </Animated.View>
  );
}

/** Petit titre a l'interieur d'une rubrique */
export function SubTitle({ children }: { children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  return (
    <Ink size={13} weight="extraBold" color={theme.colors.textSecondary} style={{ paddingHorizontal: 4, marginTop: 4 }}>
      {children}
    </Ink>
  );
}

// ===== Tuiles =====

/** Grande tuile de raccourci (deux par ligne) */
export function Tile({ icon, label, sub, onPress, on }: { icon: IconName; label: string; sub?: string; onPress: () => void; on?: boolean }) {
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
        width: '48.5%',
        minHeight: 104,
        borderRadius: 22,
        padding: 14,
        gap: 8,
        backgroundColor: on ? c.primary : pressed ? c.fillSubtle : c.surface,
        borderWidth: 1,
        borderColor: on ? c.accent : c.border,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: on ? 'rgba(255,255,255,0.18)' : c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={20} color={on ? c.onPrimary : c.accent} />
      </View>
      <View style={{ gap: 1 }}>
        <Ink size={15} weight="extraBold" color={on ? '#FFFFFF' : c.ink} numberOfLines={2}>{label}</Ink>
        {sub ? <Ink size={12} color={on ? 'rgba(255,255,255,0.86)' : c.textMuted} numberOfLines={2}>{sub}</Ink> : null}
      </View>
    </Pressable>
  );
}

export function TileGrid({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>{children}</View>;
}

/** Les trois teintes des tuiles, prises a la palette des pages Programmes et Coach */
export type TonTuile = 'indigo' | 'orange' | 'vert' | 'rouge' | 'creme' | 'bleu' | 'lilas' | 'menthe' | 'peche';

/**
 * 27 octobre 2026 soir (Houari : « plus de grandes cartes bleu nuit pleines ») : les pastels de l'accueil (creme,
 * bleu, lilas, menthe, peche), fonds fixes et encre foncee fixe, un peu plus sourds en theme sombre.
 */
const PASTELS: Record<'creme' | 'bleu' | 'lilas' | 'menthe' | 'peche', { fond: string; fondSombre: string; encre: string; piste: string }> = {
  creme: { fond: '#F6EEDD', fondSombre: '#3A3428', encre: '#A57A1C', piste: '#E3CC93' },
  bleu: { fond: '#E6ECF8', fondSombre: '#26304A', encre: '#3557D9', piste: '#A9BEF0' },
  lilas: { fond: '#EFE6F3', fondSombre: '#352B3D', encre: '#8A3F78', piste: '#D6B6CE' },
  menthe: { fond: '#E3F2EA', fondSombre: '#22362D', encre: '#1C6B45', piste: '#9FD3B4' },
  peche: { fond: '#FBE6D9', fondSombre: '#3D2C24', encre: '#B4552A', piste: '#F2BFA3' },
};

/** Fond et encre d'un pastel : encre foncee fixe sur le fond clair, encre claire du theme sur le fond sombre */
export function pastelTuile(ton: keyof typeof PASTELS): { fond: string; titre: string; texte: string; texte2: string; piste: string } {
  const p = PASTELS[ton];
  const sombre = paletteSombre();
  return { fond: sombre ? p.fondSombre : p.fond, titre: p.encre, texte: sombre ? '#F2F3F8' : '#1D2033', texte2: sombre ? 'rgba(242,243,248,0.72)' : 'rgba(29,32,51,0.62)', piste: p.piste };
}

export type TonPastel = keyof typeof PASTELS;

const estPastel = (ton: TonTuile): ton is keyof typeof PASTELS => ton in PASTELS;

function useTeinte(ton: TonTuile) {
  const pal = usePaletteProgramme();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  if (estPastel(ton)) {
    const p = pastelTuile(ton);
    return { fond: p.fond, encre: p.titre };
  }
  if (ton === 'orange') return { fond: pal.orangeTint, encre: pal.orange };
  if (ton === 'vert') return { fond: pal.vertTint, encre: pal.vert };
  if (ton === 'rouge') return { fond: c.dangerTint, encre: c.danger };
  return { fond: pal.teinte, encre: pal.accent };
}

const ombre = (couleur: string): ViewStyle => ({ shadowColor: couleur, shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 });

/**
 * Petite tuile d'action du Studio, trois par ligne : carre d'icone teinte, libelle court et l'etat actuel
 * en dessous (« Halloween forcé », « Chargée »...). Allumee, elle prend l'indigo (ou sa couleur propre :
 * orange d'Halloween, vert de Noël).
 */
export function ActionTile({ icon, label, state, onPress, on, color, busy, disabled, ton = 'indigo', sticker }: { icon: IconName; label: string; state: string; onPress: () => void; on?: boolean; color?: string; busy?: boolean; disabled?: boolean; ton?: TonTuile; sticker?: NomSticker }) {
  const pal = usePaletteProgramme();
  const t = useTeinte(ton);
  const illus = useIllustrations();
  const fill = color ?? pal.indigo;
  // 27 octobre 2026 soir : avec un sticker, la tuile reste claire (pastel), allumee elle prend juste un contour
  const doux = !!sticker && illus.stickers;
  const p = doux && estPastel(ton) ? pastelTuile(ton) : null;
  const plein = on && !doux;
  const gridWidth = useContext(GridWidth);
  const w = gridWidth > 0 ? Math.floor((gridWidth - GRID_GAP * 2) / 3) : undefined;
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, disabled: !!disabled, busy: !!busy }}
      accessibilityLabel={`${label}, ${state}`}
      style={({ pressed }) => [
        {
          width: w ?? '31%',
          minHeight: 122,
          borderRadius: 22,
          paddingHorizontal: 11,
          paddingVertical: 13,
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
          backgroundColor: plein ? fill : p ? p.fond : pal.carte,
          borderWidth: doux ? 2 : 0,
          borderColor: doux && on ? color ?? t.encre : 'transparent',
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        p ? null : ombre(pal.indigo),
      ]}
    >
      {doux ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Image source={illus.img(sticker!)} style={{ width: 46, height: 46, opacity: busy ? 0.5 : 1 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          {on ? <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 2, backgroundColor: color ?? t.encre }} /> : null}
        </View>
      ) : (
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: plein ? 'rgba(255,255,255,0.2)' : t.fond, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={busy ? 'sync' : icon} size={20} color={plein ? '#FFFFFF' : color ?? t.encre} />
        </View>
      )}
      <Ink size={14} weight="black" tight color={plein ? '#FFFFFF' : p ? p.texte : pal.texte} numberOfLines={2} style={{ lineHeight: 17 }}>{label}</Ink>
      <Ink size={11.5} weight="bold" color={plein ? 'rgba(255,255,255,0.9)' : p ? p.texte2 : pal.texte3} numberOfLines={2} style={{ lineHeight: 14 }}>{busy ? traduire('Un instant') : state}</Ink>
    </Pressable>
  );
}

/**
 * Grande tuile coloree des raccourcis (deux par ligne), comme les choix de la page Coach : fond teinte,
 * rond blanc pour l'icone, grand libelle et etat. Allumee, elle passe en indigo.
 */
export function TuileRaccourci({ icon, label, state, onPress, on, busy, ton = 'indigo', sticker }: { icon: IconName; label: string; state: string; onPress: () => void; on?: boolean; busy?: boolean; ton?: TonTuile; sticker?: NomSticker }) {
  const pal = usePaletteProgramme();
  const t = useTeinte(ton);
  const illus = useIllustrations();
  // 27 octobre 2026 soir : carte pastel, sticker en haut a gauche, texte fonce ; allumee : un contour et une pastille, plus de bleu nuit plein
  if (sticker && illus.stickers) {
    const p = estPastel(ton) ? pastelTuile(ton) : { fond: t.fond, titre: t.encre, texte: pal.texte, texte2: pal.texte2 };
    return (
      <Pressable
        onPress={() => {
          selectionAsync().catch(() => {});
          onPress();
        }}
        disabled={busy}
        accessibilityRole="button"
        accessibilityState={{ selected: !!on, busy: !!busy }}
        accessibilityLabel={`${label}, ${state}`}
        style={({ pressed }) => ({
          width: '48.5%',
          minHeight: 148,
          padding: 16,
          borderRadius: 26,
          backgroundColor: p.fond,
          borderWidth: 2,
          borderColor: on ? p.titre : 'transparent',
          gap: 10,
          justifyContent: 'space-between',
          overflow: 'hidden',
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Image source={illus.img(sticker)} style={{ width: 60, height: 60, opacity: busy ? 0.5 : 1 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          {on ? (
            <View style={{ height: 22, paddingHorizontal: 9, borderRadius: 11, backgroundColor: p.titre, justifyContent: 'center' }}>
              <Ink size={10.5} weight="black" color="#FFFFFF" style={{ letterSpacing: 0.4 }}>{traduire('ACTIF')}</Ink>
            </View>
          ) : null}
        </View>
        <View style={{ gap: 3 }}>
          <Ink size={16} weight="black" tight color={p.texte} numberOfLines={2}>{label}</Ink>
          <Ink size={12} weight="bold" color={p.texte2} numberOfLines={2}>{busy ? traduire('Un instant') : state}</Ink>
        </View>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, busy: !!busy }}
      accessibilityLabel={`${label}, ${state}`}
      style={({ pressed }) => ({
        width: '48.5%',
        minHeight: 148,
        padding: 16,
        borderRadius: 26,
        backgroundColor: on ? pal.indigo : t.fond,
        gap: 10,
        justifyContent: 'space-between',
        overflow: 'hidden',
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {on ? <View pointerEvents="none" style={{ position: 'absolute', right: -40, top: -50, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.08)' }} /> : null}
      <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: on ? 'rgba(255,255,255,0.18)' : pal.carte, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={busy ? 'sync' : icon} size={23} color={on ? '#FFFFFF' : t.encre} />
      </View>
      <View style={{ gap: 3 }}>
        <Ink size={16} weight="black" tight color={on ? '#FFFFFF' : pal.texte} numberOfLines={2}>{label}</Ink>
        <Ink size={12} weight="bold" color={on ? 'rgba(255,255,255,0.88)' : pal.texte2} numberOfLines={2}>{busy ? traduire('Un instant') : state}</Ink>
      </View>
    </Pressable>
  );
}

/** Tuile d'une rubrique (deux par ligne) : carte blanche, carre d'icone teinte, titre, ce qu'on y trouve, fleche */
export function TuileRubrique({ icon, title, sub, onPress, ton = 'indigo', sticker }: { icon: IconName; title: string; sub: string; onPress: () => void; ton?: TonTuile; sticker?: NomSticker }) {
  const pal = usePaletteProgramme();
  const t = useTeinte(ton);
  const illus = useIllustrations();
  const avecSticker = !!sticker && illus.stickers;
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${sub}`}
      style={({ pressed }) => [
        { width: '48.5%', minHeight: 140, padding: 15, borderRadius: 24, backgroundColor: pal.carte, gap: 10, justifyContent: 'space-between', opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ombre(pal.indigo),
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {avecSticker ? (
          <Image source={illus.img(sticker!)} style={{ width: 50, height: 50 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        ) : (
          <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={22} color={t.encre} />
          </View>
        )}
        <Icon name="chevron" size={16} color={pal.texte3} />
      </View>
      <View style={{ gap: 2 }}>
        <Ink size={15.5} weight="black" tight color={pal.texte} numberOfLines={2}>{title}</Ink>
        <Ink size={11.5} weight="bold" color={pal.texte3} numberOfLines={3} style={{ lineHeight: 15 }}>{sub}</Ink>
      </View>
    </Pressable>
  );
}

/** Grille de deux colonnes (raccourcis et rubriques) */
export function GrilleDeux({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>{children}</View>;
}

/** Titre d'un groupe du tableau de bord */
export function TitreGroupe({ children, sous }: { children: string; sous?: string }) {
  const pal = usePaletteProgramme();
  return (
    <View style={{ paddingHorizontal: 4, marginTop: 8, gap: 1 }}>
      <Ink size={20} weight="black" tight color={pal.texte} accessibilityRole="header">{children}</Ink>
      {sous ? <Ink size={12.5} weight="bold" color={pal.texte2}>{sous}</Ink> : null}
    </View>
  );
}

const GRID_GAP = 8;
const GridWidth = createContext(0);

/** Grille de trois colonnes pour les ActionTile (la largeur est mesuree, les tuiles se calent dessus) */
export function ActionGrid({ children }: { children: React.ReactNode }) {
  const [width, setWidth] = useState(0);
  return (
    <GridWidth.Provider value={width}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: GRID_GAP, rowGap: GRID_GAP }}>
        {children}
      </View>
    </GridWidth.Provider>
  );
}

// ===== Maquette A, tableau de bord (27 octobre 2026) =====

/** Taille unique des stickers des cartes de carrousel, et des tuiles d'interrupteur */
export const TAILLE_STICKER_CARTE = 34;
export const TAILLE_STICKER_BASCULE = 30;
const LARGEUR_CARTE = 108;
const HAUTEUR_CARTE = 92;

/** Interrupteur pastel, purement visuel : la tuile entiere porte le toucher et l'etat */
export function Interrupteur({ on, piste }: { on: boolean; piste: string }) {
  const eteint = paletteSombre() ? 'rgba(255,255,255,0.18)' : '#D6DAE6';
  return (
    <View pointerEvents="none" style={{ width: 38, height: 22, borderRadius: 11, backgroundColor: on ? piste : eteint, justifyContent: 'center' }}>
      <View style={{ position: 'absolute', top: 3, left: on ? 19 : 3, width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 }} />
    </View>
  );
}

/** Tuile pastel a interrupteur (trois par ligne) : sticker, interrupteur, nom, etat court */
export function TuileBascule({ label, state, on, ton, sticker, busy, accessibilityHint, onPress }: { label: string; state: string; on: boolean; ton: TonPastel; sticker: NomSticker; busy?: boolean; accessibilityHint?: string; onPress: () => void }) {
  const p = pastelTuile(ton);
  const illus = useIllustrations();
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={busy}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, busy: !!busy }}
      accessibilityLabel={`${label}, ${accessibilityHint ?? state}`}
      style={({ pressed }) => ({ flex: 1, minHeight: 108, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 12, gap: 8, backgroundColor: p.fond, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Image source={illus.img(sticker)} style={{ width: TAILLE_STICKER_BASCULE, height: TAILLE_STICKER_BASCULE, opacity: busy ? 0.5 : 1 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <Interrupteur on={on} piste={p.piste} />
      </View>
      <Ink size={13} weight="black" tight color={p.texte} numberOfLines={2} style={{ lineHeight: 16 }}>{label}</Ink>
      <Ink size={11} weight="bold" color={p.texte2} numberOfLines={2} style={{ lineHeight: 14 }}>{busy ? traduire('Un instant') : state}</Ink>
    </Pressable>
  );
}

/** Rangee des trois tuiles a interrupteur, marges egales */
export function RangeeBascules({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 8 }}>{children}</View>;
}

/** Carte blanche d'un carrousel : sticker en haut, nom en bas ; allumee, un contour et une pastille de la couleur de la section */
export function CarteOutil({ label, state, sticker, icon, on, busy, couleur, onPress }: { label: string; state?: string; sticker?: NomSticker; icon: IconName; on?: boolean; busy?: boolean; couleur: string; onPress: () => void }) {
  const pal = usePaletteProgramme();
  const illus = useIllustrations();
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, busy: !!busy }}
      accessibilityLabel={state ? `${label}, ${state}` : label}
      style={({ pressed }) => [
        { width: LARGEUR_CARTE, height: HAUTEUR_CARTE, borderRadius: 18, padding: 10, backgroundColor: pal.carte, justifyContent: 'space-between', borderWidth: 2, borderColor: on ? couleur : 'transparent', opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ombre(pal.indigo),
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        {sticker ? (
          <Image source={illus.img(sticker)} style={{ width: TAILLE_STICKER_CARTE, height: TAILLE_STICKER_CARTE, opacity: busy ? 0.5 : 1 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        ) : (
          <View style={{ width: TAILLE_STICKER_CARTE, height: TAILLE_STICKER_CARTE, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={busy ? 'sync' : icon} size={22} color={couleur} />
          </View>
        )}
        {on ? <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 2, backgroundColor: couleur }} /> : null}
      </View>
      <Ink size={12.5} weight="black" tight color={pal.texte} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85} style={{ lineHeight: 15 }}>{busy ? traduire('Un instant') : label}</Ink>
    </Pressable>
  );
}

/** Une section du tableau de bord : petit titre en capitales de couleur, « Tout voir » a droite, carrousel horizontal qui deborde jusqu'au bord */
export function SectionCarrousel({ titre, couleur, onToutVoir, children }: { titre: string; couleur: string; onToutVoir: () => void; children: React.ReactNode }) {
  const pal = usePaletteProgramme();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
        <Ink size={11.5} weight="black" color={couleur} style={{ letterSpacing: 1.4 }} accessibilityRole="header">{titre.toLocaleUpperCase()}</Ink>
        <Pressable
          onPress={() => {
            selectionAsync().catch(() => {});
            onToutVoir();
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`${traduire('Tout voir')}, ${titre}`}
        >
          <Ink size={12} weight="extraBold" color={pal.accent}>{traduire('Tout voir')}</Ink>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -GUTTER, overflow: 'visible' }} contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 2, paddingBottom: 12, gap: 8 }}>
        {children}
      </ScrollView>
    </View>
  );
}

// ===== Pastilles =====

/** Pastille de choix (44 points de haut) */
export function Chip({ label, on, onPress, accessibilityLabel, disabled }: { label: string; on?: boolean; onPress: () => void; accessibilityLabel?: string; disabled?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => ({ minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1, backgroundColor: on ? c.primary : pressed ? c.fillSubtle : c.fillSoft })}
    >
      <Ink size={14} weight="extraBold" color={on ? c.onPrimary : c.ink}>{label}</Ink>
    </Pressable>
  );
}

export function ChipWrap({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;
}

/** Pastille d'etat (en-tete du Studio) */
export function StatePill({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'gold' | 'moss' | 'danger' }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const map = {
    accent: { bg: c.accentTint, fg: c.accent },
    gold: { bg: c.goldTint, fg: c.goldDeep },
    moss: { bg: c.successTint, fg: c.successText },
    danger: { bg: c.dangerTint, fg: c.danger },
  } as const;
  const m = map[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: m.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: m.fg }} />
      <Ink size={12} weight="extraBold" color={m.fg}>{label}</Ink>
    </View>
  );
}

// ===== Divers =====

/** Petite note explicative */
export function Note({ children, tone }: { children: React.ReactNode; tone?: 'muted' | 'warn' }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Ink size={12} color={tone === 'warn' ? c.danger : c.textMuted} style={{ paddingHorizontal: 4, lineHeight: 17 }}>
      {children}
    </Ink>
  );
}

/** Ligne libelle et valeur, en lecture seule */
export function KV({ label, value, first, mono, right }: { label: string; value: string; first?: boolean; mono?: boolean; right?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: first ? 0 : 1, borderTopColor: c.divider }}>
      <Ink size={13} color={c.textSecondary} style={{ flex: 1 }}>{label}</Ink>
      <Ink size={14} weight="extraBold" style={{ flexShrink: 1, textAlign: 'right', fontVariant: mono ? ['tabular-nums'] : undefined }} selectable>{value}</Ink>
      {right}
    </View>
  );
}

/** Champ de recherche */
export function SearchField({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const b = couleursListe();
  return (
    // 27 octobre 2026 nuit, maquette B : champ gris, sans ombre ni contour
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42, borderRadius: 14, backgroundColor: b.recherche, paddingHorizontal: 14 }}>
      <Icon name="search" size={16} color={b.sous} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={b.sous}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        accessibilityLabel={label}
        style={{ flex: 1, fontSize: 14, fontWeight: '600', color: c.ink, paddingVertical: 10 }}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel={traduire("Effacer la recherche")} hitSlop={8} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={16} color={b.sous} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Demande de confirmation (une seule) */
export function confirm(title: string, message: string, okLabel: string, onOk: () => void, destructive = false) {
  appAlert(title, message, [
    { text: traduire('Annuler'), style: 'cancel' },
    { text: okLabel, style: destructive ? 'destructive' : 'default', onPress: onOk },
  ]);
}

/** Deux confirmations de suite, pour ce qui ne se rattrape pas */
export function confirmTwice(first: { title: string; message: string; ok: string }, second: { title: string; message: string; ok: string }, onOk: () => void) {
  confirm(first.title, first.message, first.ok, () => confirm(second.title, second.message, second.ok, onOk, true), true);
}

/** Bouton d'action compact a droite d'une ligne */
export function SmallAction({ label, onPress, danger, disabled }: { label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? c.dangerTint : pressed ? c.fillSubtle : c.accentTint, opacity: disabled ? 0.45 : 1 })}
    >
      <Ink size={13} weight="extraBold" color={danger ? c.danger : c.accent}>{label}</Ink>
    </Pressable>
  );
}

// ===== Maquette B, liste elegante (27 octobre 2026 nuit) =====
/**
 * Houari trouve la maquette A (carrousels) trop compliquee : chaque section devient une carte blanche groupee,
 * comme les Reglages d'iOS en plus joli. Chaque ligne : sticker de 32, titre, sous titre court, puis interrupteur
 * pastel ou chevron, separateurs fins. Memes marges partout : 14 dans la carte, 12 entre sticker et texte.
 */

/** Couleurs de la liste, claires ou sombres */
export function couleursListe() {
  const sombre = paletteSombre();
  return sombre
    ? { carte: 'rgba(255,255,255,0.07)', trait: 'rgba(255,255,255,0.09)', titre: 'rgba(242,243,248,0.62)', texte: '#F2F3F8', sous: 'rgba(242,243,248,0.62)', chevron: 'rgba(242,243,248,0.4)', recherche: 'rgba(255,255,255,0.09)', eteint: 'rgba(255,255,255,0.18)' }
    : { carte: '#FFFFFF', trait: '#ECEEF5', titre: '#646985', texte: '#1D2033', sous: '#646985', chevron: '#A8ADC4', recherche: '#E9EBF3', eteint: '#D6DAE6' };
}

export const TAILLE_STICKER_LIGNE = 32;
const PADDING_CARTE_LISTE = 14;

/** Une section : petit titre gris en capitales, puis la carte blanche qui groupe ses lignes */
export function SectionListe({ titre, children }: { titre: string; children: React.ReactNode }) {
  const b = couleursListe();
  const lignes = React.Children.toArray(children).filter(Boolean);
  if (!lignes.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <Ink size={11.5} weight="extraBold" color={b.titre} style={{ letterSpacing: 1.3, paddingLeft: 6 }} accessibilityRole="header">{titre.toLocaleUpperCase()}</Ink>
      <View style={{ backgroundColor: b.carte, borderRadius: 20, paddingHorizontal: PADDING_CARTE_LISTE, shadowColor: '#1D2033', shadowOpacity: paletteSombre() ? 0 : 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
        {lignes.map((l, i) => (
          <View key={(l as React.ReactElement).key ?? i} style={i === 0 ? undefined : { borderTopWidth: 1, borderTopColor: b.trait }}>
            {l}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Interrupteur pastel de la maquette B (46 x 28), purement visuel : la ligne entiere porte le toucher */
export function InterrupteurListe({ on, piste }: { on: boolean; piste: string }) {
  const b = couleursListe();
  return (
    <View pointerEvents="none" style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: on ? piste : b.eteint }}>
      <View style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 }} />
    </View>
  );
}

/**
 * Une ligne d'outil : sticker, titre, sous titre (l'etat actuel), puis interrupteur ou chevron.
 * Allumee sans interrupteur (saison forcee, Heny...), un point de couleur se pose avant le chevron.
 */
export function LigneOutil({ label, sous, sticker, icon, couleur, on, busy, bascule, onPress }: { label: string; sous?: string; sticker?: NomSticker; icon: IconName; couleur?: string; on?: boolean; busy?: boolean; bascule?: TonPastel; onPress: () => void }) {
  const b = couleursListe();
  const illus = useIllustrations();
  const encre = couleur ?? pastelTuile('bleu').titre;
  return (
    <Pressable
      onPress={() => {
        selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={busy}
      accessibilityRole={bascule ? 'switch' : 'button'}
      accessibilityState={bascule ? { checked: !!on, busy: !!busy } : { selected: !!on, busy: !!busy }}
      accessibilityLabel={sous ? `${label}, ${sous}` : label}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 9, opacity: pressed ? 0.6 : 1 })}
    >
      {sticker ? (
        <Image source={illus.img(sticker)} style={{ width: TAILLE_STICKER_LIGNE, height: TAILLE_STICKER_LIGNE, opacity: busy ? 0.5 : 1 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : (
        <View style={{ width: TAILLE_STICKER_LIGNE, height: TAILLE_STICKER_LIGNE, borderRadius: 16, backgroundColor: encre, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={17} color="#FFFFFF" />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Ink size={14.5} weight="extraBold" color={b.texte} numberOfLines={1}>{label}</Ink>
        {sous || busy ? <Ink size={12} weight="bold" color={b.sous} numberOfLines={2} style={{ lineHeight: 16 }}>{busy ? traduire('Un instant') : sous}</Ink> : null}
      </View>
      {bascule ? (
        <InterrupteurListe on={!!on} piste={pastelTuile(bascule).piste} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: encre }} /> : null}
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M9 6l6 6-6 6" stroke={b.chevron} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      )}
    </Pressable>
  );
}

/**
 * 27 octobre 2026 nuit : ouvre la porte d'entree voulue en fermant tout le reste. Jamais router.replace('/') :
 * l'adresse « / » est aussi celle de l'accueil des onglets (app/(tabs)/index.tsx), qui s'ouvrait a la place de la
 * decision d'ouverture (app/index.tsx) : « Première installation » et « Tout effacer » tombaient sur l'accueil.
 */
export function ouvrirPorteEntree(router: { canDismiss: () => boolean; dismissAll: () => void; replace: (href: never) => void }, cible: '/onboarding' | '/(tabs)'): void {
  try {
    if (router.canDismiss()) router.dismissAll();
  } catch {
    // rien a fermer
  }
  router.replace(cible as never);
}
