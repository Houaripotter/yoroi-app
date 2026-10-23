/**
 * Briques de la page Personnages et scenes (16 octobre 2026, refonte de la presentation).
 * Houari : « tu peux mieux presenter la page des personnages ». Onglets en pastilles qui passent a la ligne
 * avec leur compteur, vignettes de meme taille sur 3 colonnes, personnage cadre de la tete aux pieds sur un fond
 * doux par categorie, equipe en contour indigo avec un badge, cadenas sobre si c'est Premium,
 * rangee de visages pour la teinte de peau (sans aucune etiquette d'origine).
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CheckIcon, DOJO, LockIcon } from '@/components/yoroi/v2/dojo/parts';
import { P, blancA } from '@/components/yoroi/livePalette';
import type { Gender } from '@/lib/v2/dojo/personnages';
import { cadrageBuste } from '@/lib/v2/espace/cadrageBuste';
import { traduire } from '@/lib/i18n/tr';

export function selection() {
  void Haptics.selectionAsync().catch(() => undefined);
}

/** Fond doux d'une famille de personnages, lu dans la palette vivante (clair ou sombre) */
export type FamilleFond = 'indigo' | 'or' | 'mousse' | 'rouge';
export function fondFamille(f: FamilleFond): string {
  return f === 'or' ? P.tuileOr : f === 'mousse' ? P.tuileMousse : f === 'rouge' ? P.tuileRouge : P.tuileIndigo;
}

/* ---------- onglets ---------- */

/** Pastilles de meme largeur, 3 par rangee : tout se lit, rien n'est coupe */
export function Onglets<T extends string>({ items, value, onChange, largeur }: { items: { id: T; label: string; count: number }[]; value: T; onChange: (id: T) => void; largeur: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <Pressable
            key={it.id}
            onPress={() => {
              if (on) return;
              selection();
              onChange(it.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${it.label}, ${it.count}`}
            style={({ pressed }) => ({
              width: largeur,
              minHeight: 40,
              paddingHorizontal: 8,
              borderRadius: 14,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              backgroundColor: on ? c.accent : c.surface,
              borderWidth: 1,
              borderColor: on ? c.accent : c.border,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Ink size={13.5} weight={on ? 'extraBold' : 'bold'} color={on ? c.onAccent : c.ink} numberOfLines={1} style={{ flexShrink: 1 }}>{traduire(it.label)}</Ink>
            <Ink size={12} weight="bold" color={on ? c.onAccent : c.textMuted} style={{ opacity: on ? 0.8 : 1 }}>{String(it.count)}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- homme, femme ---------- */

export function GenreBascule({ value, onChange }: { value: Gender; onChange: (g: Gender) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.fillSubtle, borderRadius: 14, padding: 3 }}>
      {(['h', 'f'] as Gender[]).map((g) => {
        const on = value === g;
        return (
          <Pressable
            key={g}
            onPress={() => {
              if (on) return;
              selection();
              onChange(g);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 14, borderRadius: 11, justifyContent: 'center', backgroundColor: on ? c.surface : 'transparent', transform: [{ scale: pressed ? 0.97 : 1 }] })}
          >
            <Ink size={13} weight={on ? 'extraBold' : 'bold'} color={on ? c.ink : c.textSecondary}>{g === 'h' ? traduire('Homme') : traduire('Femme')}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- teinte de peau : des visages, sans etiquette ---------- */

/**
 * Visage rond tire de l'illustration en pied (600 x 800, tete vers 12,5 % de la hauteur).
 * Le centre de la tete a l'horizontale vient de la mesure du cadrage en buste (lib/v2/espace/cadrageBuste.ts),
 * le milieu de l'image pour une image pas encore mesuree.
 */
export function Visage({ source, size = 40, fond }: { source: ImageSourcePropType; size?: number; fond: string }) {
  const h = size * 5;
  const w = h * 0.75;
  const cb = cadrageBuste(source);
  const cx = Math.max(0.3, Math.min(0.7, (0.5 - cb.l) / cb.w));
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: fond }}>
      <Image source={source} style={{ position: 'absolute', width: w, height: h, left: size / 2 - w * cx, top: size / 2 - h * 0.125 }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

export function Teintes<T extends string>({ options, value, onChange, fond }: { options: { id: T; source: ImageSourcePropType }[]; value: T; onChange: (id: T) => void; fond: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  if (options.length < 2) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => {
              if (on) return;
              selection();
              onChange(o.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={traduire("Teinte {0} sur {1}", i + 1, options.length)}
            hitSlop={4}
            style={({ pressed }) => ({ padding: 2, borderRadius: 24, borderWidth: 2, borderColor: on ? c.accent : 'transparent', transform: [{ scale: pressed ? 0.94 : 1 }] })}
          >
            <Visage source={o.source} size={36} fond={fond} />
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- titre de groupe ---------- */

export function GroupeTitre({ titre, count }: { titre: string; count?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 2, marginTop: 6 }}>
      <Ink size={16} weight="black" accessibilityRole="header">{titre}</Ink>
      {count !== undefined ? <Ink size={13} weight="bold" color={c.textMuted}>{String(count)}</Ink> : null}
    </View>
  );
}

/* ---------- vignette d'un personnage ---------- */

export type EtatVignette = { equipe: boolean; regarde: boolean; verrou: boolean; note?: string | null };

export function Vignette({
  width,
  source,
  nom,
  fond,
  etat,
  onPress,
  onLongPress,
  label,
  vide,
}: {
  width: number;
  source?: ImageSourcePropType;
  nom: string;
  fond: string;
  etat: EtatVignette;
  onPress: () => void;
  onLongPress?: () => void;
  label: string;
  /** « Sans personnage » : une image de scene en fond, pas de figure */
  vide?: ImageSourcePropType;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const h = Math.round(width * 1.2);
  const bord = etat.equipe ? c.accent : etat.regarde ? DOJO.gold : 'transparent';
  const note = etat.equipe ? traduire('Équipé') : etat.note ?? '';
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected: etat.equipe }}
      accessibilityLabel={label}
      style={({ pressed }) => ({ width, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <View style={{ height: h, borderRadius: 18, borderWidth: 2.5, borderColor: bord, padding: 2 }}>
        <View style={{ flex: 1, borderRadius: 14, backgroundColor: fond, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
          {vide ? <Image source={vide} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors /> : null}
          {source ? <Image source={source} style={{ width: '104%', height: '104%' }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
          {etat.verrou ? (
            <View style={{ position: 'absolute', top: 6, left: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: blancA(0.92), alignItems: 'center', justifyContent: 'center' }}>
              <LockIcon size={13} color={c.goldDeep} />
            </View>
          ) : null}
          {etat.equipe ? (
            <View style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <CheckIcon size={15} color={c.onAccent} />
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ paddingHorizontal: 3, paddingTop: 4, paddingBottom: 6 }}>
        <Ink size={13} weight="extraBold" numberOfLines={2} style={{ lineHeight: 16 }}>{nom}</Ink>
        {note ? (
          <Ink size={11.5} weight="bold" color={etat.equipe ? c.accent : c.textMuted} numberOfLines={1}>{note}</Ink>
        ) : null}
      </View>
    </Pressable>
  );
}

/* ---------- vignette d'une scene ---------- */

export function VignetteScene({ width, source, nom, etat, onPress, label }: { width: number; source: ImageSourcePropType; nom: string; etat: EtatVignette; onPress: () => void; label: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const h = Math.round(width * 0.66);
  const bord = etat.equipe ? c.accent : etat.regarde ? DOJO.gold : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: etat.equipe }}
      accessibilityLabel={label}
      style={({ pressed }) => ({ width, transform: [{ scale: pressed ? 0.97 : 1 }] })}
    >
      <View style={{ height: h, borderRadius: 18, borderWidth: 2.5, borderColor: bord, padding: 2 }}>
        <View style={{ flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: c.fillSubtle }}>
          <Image source={source} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
          {etat.verrou ? (
            <View style={{ position: 'absolute', top: 6, left: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: blancA(0.92), alignItems: 'center', justifyContent: 'center' }}>
              <LockIcon size={13} color={c.goldDeep} />
            </View>
          ) : null}
          {etat.equipe ? (
            <View style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <CheckIcon size={15} color={c.onAccent} />
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ paddingHorizontal: 3, paddingTop: 4, paddingBottom: 6 }}>
        <Ink size={13} weight="extraBold" numberOfLines={1}>{nom}</Ink>
        {etat.equipe || etat.note ? (
          <Ink size={11.5} weight="bold" color={etat.equipe ? c.accent : c.textMuted} numberOfLines={1}>{etat.equipe ? 'Choisie' : etat.note}</Ink>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Grille reguliere : les vignettes posees en rangees de n colonnes */
export function Grille({ children, gap = 10 }: { children: React.ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: gap, rowGap: 4 }}>{children}</View>;
}
