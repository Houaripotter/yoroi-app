/**
 * Studio, galerie des images : chaque illustration appelee par l'app (catalogue.generated.ts),
 * rangee par famille, avec le nom du fichier. Filtre par famille, par groupe et par genre, recherche.
 * Au toucher : l'image en grand sur fond clair, sur fond sombre et sur damier, dans un cadre
 * qui montre ses bords exacts (pour reperer une image coupee ou mal detouree).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, RoundButton } from '@/components/yoroi/v2/espace/ui';
import { CATALOGUE_IMAGES } from './catalogue.generated';
import type { ImageEntree, ImageFamille } from './catalogue.generated';
import { G, GalerieHeader, Pastille, PastilleRow } from './kit';
import { traduire } from '@/lib/i18n/tr';

const FAMILLES: { key: ImageFamille; label: string }[] = [
  { key: 'personnages', label: traduire('Personnages du monde') },
  { key: 'guerrier', label: traduire('Guerrier et guerrière') },
  { key: 'packs', label: traduire('Packs') },
  { key: 'scenes', label: traduire('Scènes') },
  { key: 'fonds', label: traduire('Fonds verticaux') },
  { key: 'ornements', label: traduire('Ornements') },
  { key: 'sports', label: traduire('Sports') },
  { key: 'carnet', label: traduire('Carnet') },
  { key: 'partage', label: traduire('Fonds de partage') },
  { key: 'sceaux', label: traduire('Sceaux') },
  { key: 'tampons', label: traduire('Tampons') },
  { key: 'logos', label: traduire('Logos') },
  { key: 'icones', label: traduire('Icônes') },
  { key: 'partenaires', label: traduire('Clubs') },
  { key: 'divers', label: traduire('Divers') },
  { key: 'anciens', label: traduire('Anciens avatars') },
];

type Genre = 'tous' | 'h' | 'f';

function genreOf(nom: string): 'h' | 'f' | null {
  if (/(^|_)h(_|\.)/.test(nom) || /_male|male_/.test(nom)) return 'h';
  if (/(^|_)f(_|\.)/.test(nom) || /female/.test(nom)) return 'f';
  return null;
}

function joli(s: string): string {
  const t = s.replace(/_/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

/** Dimensions reelles du fichier (en pixels), quand on peut les lire */
function useDims(src: ImageSourcePropType | null): { w: number; h: number } | null {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    setDims(null);
    if (!src) return;
    let alive = true;
    try {
      const resolve = (Image as unknown as { resolveAssetSource?: (s: ImageSourcePropType) => { width?: number; height?: number; uri?: string } | null }).resolveAssetSource;
      const r = typeof resolve === 'function' ? resolve(src) : null;
      if (r?.width && r?.height) {
        setDims({ w: r.width, h: r.height });
        return;
      }
      const uri = r?.uri ?? (typeof src === 'object' && src && 'uri' in src ? (src as { uri?: string }).uri : undefined) ?? (typeof src === 'string' ? src : undefined);
      if (uri) {
        Image.getSize(
          uri,
          (w, h) => {
            if (alive) setDims({ w, h });
          },
          () => undefined,
        );
      }
    } catch {
      // dimensions inconnues : le cadre reste carre
    }
    return () => {
      alive = false;
    };
  }, [src]);
  return dims;
}

function Damier({ w, h }: { w: number; h: number }) {
  return (
    <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <Pattern id="damier" width={16} height={16} patternUnits="userSpaceOnUse">
          <Rect x={0} y={0} width={16} height={16} fill="#FFFFFF" />
          <Rect x={0} y={0} width={8} height={8} fill="#D9D6CE" />
          <Rect x={8} y={8} width={8} height={8} fill="#D9D6CE" />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill="url(#damier)" />
    </Svg>
  );
}

/** L'image dans un cadre pointille qui suit exactement ses bords, sur un fond donne */
function Panneau({ entree, fond, label, maxW, ratio }: { entree: ImageEntree; fond: 'clair' | 'sombre' | 'damier'; label: string; maxW: number; ratio: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const maxH = 320;
  let w = maxW - 32;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  const bg = fond === 'sombre' ? '#14161E' : fond === 'clair' ? '#F2F1EC' : '#FFFFFF';
  const trait = fond === 'sombre' ? 'rgba(242,241,236,0.75)' : c.accent;
  const coin = fond === 'sombre' ? '#F2F1EC' : c.accent;
  const C = 12;
  return (
    <View style={{ gap: 8 }}>
      <Ink size={13} weight="extraBold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{label}</Ink>
      <View style={{ borderRadius: 22, backgroundColor: bg, borderWidth: 1, borderColor: fond === 'sombre' ? '#14161E' : c.border, paddingVertical: 22, alignItems: 'center', overflow: 'hidden' }}>
        {fond === 'damier' ? <Damier w={maxW} h={h + 44} /> : null}
        <View style={{ width: w + 2, height: h + 2, borderWidth: 1, borderStyle: 'dashed', borderColor: trait }}>
          <Image source={entree.src} style={{ width: w, height: h }} resizeMode="contain" accessibilityIgnoresInvertColors />
          {/* equerres aux quatre coins : les bords du fichier */}
          <View pointerEvents="none" style={{ position: 'absolute', left: -3, top: -3, width: C, height: C, borderLeftWidth: 3, borderTopWidth: 3, borderColor: coin }} />
          <View pointerEvents="none" style={{ position: 'absolute', right: -3, top: -3, width: C, height: C, borderRightWidth: 3, borderTopWidth: 3, borderColor: coin }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: -3, bottom: -3, width: C, height: C, borderLeftWidth: 3, borderBottomWidth: 3, borderColor: coin }} />
          <View pointerEvents="none" style={{ position: 'absolute', right: -3, bottom: -3, width: C, height: C, borderRightWidth: 3, borderBottomWidth: 3, borderColor: coin }} />
        </View>
      </View>
    </View>
  );
}

function Apercu({ liste, index, onIndex, onClose }: { liste: ImageEntree[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const entree = index !== null ? liste[index] ?? null : null;
  const dims = useDims(entree?.src ?? null);
  const ratio = dims && dims.h > 0 ? dims.w / dims.h : 1;
  const maxW = Math.min(width, 520) - G * 2;
  const n = liste.length;
  const go = (d: number) => {
    if (index === null || n === 0) return;
    onIndex((index + d + n) % n);
  };
  return (
    <Modal visible={entree !== null} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {entree ? (
        <View style={{ flex: 1, backgroundColor: c.background }}>
          <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <RoundButton icon="close" label={traduire("Fermer l’aperçu")} onPress={onClose} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Ink size={13} weight="bold" color={c.textSecondary}>{traduire("{0} sur {1}", (index ?? 0) + 1, n)}</Ink>
            </View>
            <RoundButton icon="back" label={traduire("Image précédente")} onPress={() => go(-1)} />
            <RoundButton icon="chevron" label={traduire("Image suivante")} onPress={() => go(1)} />
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: G, paddingTop: 14, paddingBottom: insets.bottom + 40, gap: 16, alignItems: 'stretch', maxWidth: 520 + G * 2, width: '100%', alignSelf: 'center' }}>
            <View style={{ gap: 4 }}>
              <Ink size={20} weight="black" tight selectable>{traduire(entree.nom)}</Ink>
              <Ink size={12} color={c.textMuted} selectable>{entree.chemin}</Ink>
              <Ink size={12} weight="bold" color={c.textSecondary}>
                {dims ? `${dims.w} x ${dims.h} pixels` : traduire('Taille du fichier inconnue ici')}
              </Ink>
            </View>
            <Panneau entree={entree} fond="clair" label={traduire("Sur fond clair")} maxW={maxW} ratio={ratio} />
            <Panneau entree={entree} fond="sombre" label={traduire("Sur fond sombre")} maxW={maxW} ratio={ratio} />
            <Panneau entree={entree} fond="damier" label={traduire("Sur damier (la transparence se voit)")} maxW={maxW} ratio={ratio} />
            <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>
              {traduire("Le pointillé suit les bords exacts du fichier. Un personnage qui touche le pointillé est coupé ; un halo clair sur le fond sombre trahit un détourage raté.")}</Ink>
          </ScrollView>
        </View>
      ) : null}
    </Modal>
  );
}

const COLS = 3;
const GAP = 10;

/** 19 octobre 2026 : familleInitiale ouvre la galerie sur une famille (le Studio ouvre ainsi « Personnages du monde » d'un toucher) */
export function ImagesGalerie({ familleInitiale }: { familleInitiale?: string } = {}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [famille, setFamille] = useState<ImageFamille | 'toutes'>(() => FAMILLES.find((f) => f.key === familleInitiale)?.key ?? 'toutes');
  const [groupe, setGroupe] = useState<string>('');
  const [genre, setGenre] = useState<Genre>('tous');
  const [query, setQuery] = useState('');
  const [ouvert, setOuvert] = useState<number | null>(null);

  const comptes = useMemo(() => {
    const m = new Map<ImageFamille, number>();
    CATALOGUE_IMAGES.forEach((e) => m.set(e.famille, (m.get(e.famille) ?? 0) + 1));
    return m;
  }, []);

  const groupes = useMemo(() => {
    if (famille === 'toutes') return [];
    const set = new Set<string>();
    CATALOGUE_IMAGES.forEach((e) => {
      if (e.famille === famille && e.groupe) set.add(e.groupe);
    });
    return Array.from(set).sort();
  }, [famille]);

  const avecGenre = famille === 'sports' || famille === 'guerrier' || famille === 'personnages' || famille === 'anciens';

  const liste = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOGUE_IMAGES.filter((e) => {
      if (famille !== 'toutes' && e.famille !== famille) return false;
      if (groupe && e.groupe !== groupe) return false;
      if (avecGenre && genre !== 'tous' && genreOf(e.nom) !== genre) return false;
      if (q && !e.chemin.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [famille, groupe, genre, query, avecGenre]);

  const inner = Math.min(width, 640) - G * 2;
  const tile = Math.floor((inner - GAP * (COLS - 1)) / COLS);

  const choisirFamille = (f: ImageFamille | 'toutes') => {
    setFamille(f);
    setGroupe('');
    setGenre('tous');
  };

  const entete = (
    <View style={{ gap: 14, paddingBottom: 14 }}>
      <GalerieHeader title={traduire("Images")} sub={traduire("{0} illustrations appelées par l’app. Touche une image pour la voir en grand.", CATALOGUE_IMAGES.length)} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
        <Icon name="search" size={18} color={c.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={traduire("Chercher un fichier (ninja, chateau, jjb...)")}
          placeholderTextColor={c.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, fontSize: 15, color: c.ink, paddingVertical: 10 }}
          accessibilityLabel={traduire("Chercher un fichier")}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel={traduire("Effacer la recherche")} hitSlop={10}>
            <Icon name="close" size={16} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>
      <PastilleRow>
        <Pastille label={traduire("Toutes")} count={CATALOGUE_IMAGES.length} on={famille === 'toutes'} onPress={() => choisirFamille('toutes')} />
        {FAMILLES.filter((f) => (comptes.get(f.key) ?? 0) > 0).map((f) => (
          <Pastille key={f.key} label={traduire(f.label)} count={comptes.get(f.key)} on={famille === f.key} onPress={() => choisirFamille(f.key)} />
        ))}
      </PastilleRow>
      {avecGenre ? (
        <PastilleRow>
          <Pastille label={traduire("Homme et femme")} on={genre === 'tous'} onPress={() => setGenre('tous')} />
          <Pastille label={traduire("Homme")} on={genre === 'h'} onPress={() => setGenre('h')} />
          <Pastille label={traduire("Femme")} on={genre === 'f'} onPress={() => setGenre('f')} />
        </PastilleRow>
      ) : null}
      {groupes.length > 1 ? (
        <PastilleRow>
          <Pastille label={traduire("Tous les groupes")} on={groupe === ''} onPress={() => setGroupe('')} />
          {groupes.map((g) => (
            <Pastille key={g} label={joli(g)} on={groupe === g} onPress={() => setGroupe(g)} />
          ))}
        </PastilleRow>
      ) : null}
      <Ink size={13} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>
        {liste.length === 0 ? traduire('Aucune image ne correspond.') : liste.length === 1 ? '1 image' : `${liste.length} images`}
      </Ink>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FlatList
        data={liste}
        keyExtractor={(e) => e.chemin}
        numColumns={COLS}
        key={`cols${COLS}`}
        ListHeaderComponent={entete}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: G, paddingBottom: insets.bottom + 48, width: '100%', maxWidth: 640, alignSelf: 'center' }}
        columnWrapperStyle={{ gap: GAP }}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        initialNumToRender={18}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => {
              selectionAsync().catch(() => {});
              setOuvert(index);
            }}
            accessibilityRole="button"
            accessibilityLabel={traduire("Voir {0} en grand", item.nom)}
            style={({ pressed }) => ({ width: tile, gap: 5, opacity: pressed ? 0.85 : 1 })}
          >
            <View style={{ width: tile, height: tile, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <Image source={item.src} style={{ width: tile - 12, height: tile - 12 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </View>
            <Ink size={11} weight="bold" numberOfLines={2} style={{ paddingHorizontal: 2 }}>{traduire(item.nom)}</Ink>
            {item.groupe ? <Ink size={10} color={c.textMuted} numberOfLines={1} style={{ paddingHorizontal: 2, marginTop: -4 }}>{joli(item.groupe)}</Ink> : null}
          </Pressable>
        )}
      />
      <Apercu liste={liste} index={ouvert} onIndex={setOuvert} onClose={() => setOuvert(null)} />
    </View>
  );
}

export default ImagesGalerie;
