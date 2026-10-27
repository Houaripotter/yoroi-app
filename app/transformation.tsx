/**
 * Transformation v2 (vague 39) : le comparateur avant et apres.
 * Trois modes (glisser, cote a cote, fondu), zoom a deux doigts synchronise,
 * par defaut la plus ancienne et la plus recente de la meme pose, bandeau de vignettes pour changer,
 * ecart de poids et duree en clair, carte a partager dessinee sur le telephone.
 * NUIT 14 : chaque photo a son propre cadrage (bouton Ajuster : pincer, glisser, double toucher, grille),
 * enregistre par paire dans AsyncStorage (lib/v2/photos/cadrage.ts) et repris sur la carte a partager.
 * 17 octobre 2026 : bouton « Créer ma carte avant après » vers l'atelier des cartes, avec la paire choisie ici.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Pressable, Share, View, useWindowDimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { requestPermissionsAsync, saveToLibraryAsync } from 'expo-media-library';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { DetailHeader, EmptyInvite, GhostButton, GUTTER, IconButton, Pills, PrimaryButton, StatStrip, tapLight } from '@/components/yoroi/v2/progres/ui';
import { ComparateurCadre, useImageSize } from '@/components/yoroi/v2/photos/ComparateurCadre';
import type { Cote, ModeComparaison as CompareMode } from '@/components/yoroi/v2/photos/ComparateurCadre';
import { alignerPareil, cadreFor, clampCadre, CADRAGE_KEY, defaultCadre, emptyStore, parseStore, serializeStore, withCadre } from '@/lib/v2/photos/cadrage';
import type { Cadre, CadrageStore, Dims } from '@/lib/v2/photos/cadrage';
import { CarteAvantApres } from '@/components/yoroi/v2/photos/CarteAvantApres';
import { signaturePartage } from '@/constants/partage';
import { noterPartage } from '@/lib/v2/partage/mesure';
import { Sheet } from '@/components/yoroi/v2/progres/Sheet';
import { usePhotosData } from '@/lib/v2/progres/useProgresData';
import type { Photo } from '@/lib/storage';
import { daysDiff } from '@/lib/v2/progres/format';
import { dateCourte, dureeTexte, ecartLibelle, ecartTexte, kg, paireParDefaut, poseOf, POSES, trierAnciennesDabord } from '@/lib/v2/photos/outils';
import type { Pose } from '@/lib/v2/photos/outils';
import { logger } from '@/lib/security/logger';
import { carteAvantApresDirecte } from '@/lib/v2/nav/direct';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

type Filtre = Pose | 'toutes';
type Cible = 'avant' | 'apres';

const MODES: { value: CompareMode; label: string }[] = [
  { value: 'glisser', label: traduire('Curseur') },
  { value: 'cote', label: traduire('Côte à côte') },
  { value: 'fondu', label: traduire('Fondu') },
];

const CONSIGNE: Record<CompareMode, string> = {
  glisser: traduire('Glisse le curseur de gauche à droite.'),
  cote: traduire('Tes deux photos, l’une à côté de l’autre.'),
  fondu: traduire('Glisse vers la droite : l’après apparaît sur l’avant.'),
};

export default function TransformationScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { photos, loading } = usePhotosData();
  const asc = useMemo(() => trierAnciennesDabord(photos ?? []), [photos]);
  const [filtre, setFiltre] = useState<Filtre>('toutes');
  const [mode, setMode] = useState<CompareMode>('glisser');
  const [ids, setIds] = useState<{ avant: string; apres: string } | null>(null);
  const [cible, setCible] = useState<Cible>('avant');
  const [shareOpen, setShareOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const cardRef = useRef<View>(null);
  const [reglage, setReglage] = useState<Cote | null>(null);
  const [transparence, setTransparence] = useState(false);
  const [store, setStore] = useState<CadrageStore>(emptyStore);
  const storeRef = useRef<CadrageStore>(store);

  useEffect(() => {
    AsyncStorage.getItem(CADRAGE_KEY)
      .then((raw) => {
        const s = parseStore(raw);
        storeRef.current = s;
        setStore(s);
      })
      .catch(() => {});
  }, []);
  const saveStore = useCallback((s: CadrageStore) => {
    storeRef.current = s;
    setStore(s);
    AsyncStorage.setItem(CADRAGE_KEY, serializeStore(s)).catch((err) => logger.error('Enregistrement du cadrage impossible', err));
  }, []);

  const pa0 = ids ? asc.find((p) => p.id === ids.avant) : undefined;
  const pb0 = ids ? asc.find((p) => p.id === ids.apres) : undefined;
  const ordered = pa0 && pb0 && (pa0.date < pb0.date || (pa0.date === pb0.date && pa0.created_at <= pb0.created_at)) ? [pa0, pb0] : [pb0, pa0];
  const sizeA = useImageSize(ordered[0]?.file_uri);
  const sizeB = useImageSize(ordered[1]?.file_uri);

  const counts = useMemo(() => {
    const m: Record<Pose, number> = { face: 0, profil: 0, dos: 0 };
    asc.forEach((p) => {
      const k = poseOf(p);
      if (k) m[k] += 1;
    });
    return m;
  }, [asc]);
  const pool = useMemo(() => (filtre === 'toutes' ? asc : asc.filter((p) => poseOf(p) === filtre)), [asc, filtre]);

  // paire par defaut (et apres un changement de filtre) : la plus ancienne et la plus recente de la meme pose
  useEffect(() => {
    const valid = ids && pool.some((p) => p.id === ids.avant) && pool.some((p) => p.id === ids.apres);
    if (valid) return;
    const pair = paireParDefaut(asc, filtre === 'toutes' ? null : filtre);
    setIds(pair ? { avant: pair[0].id, apres: pair[1].id } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asc, filtre]);

  if (!loading && asc.length < 2) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <DetailHeader title={traduire("Ta transformation")} />
        <EmptyInvite
          style={{ margin: GUTTER }}
          title={traduire("Il faut deux photos")}
          text={asc.length === 1 ? traduire('Ta première photo est dans le coffre. Reprends-en une dans quelques semaines, même cadrage, et compare ici.') : traduire('Prends une photo aujourd’hui, puis une autre dans quelques semaines. Tu les verras ici côte à côte, au doigt.')}
          cta={traduire("Ouvrir mes photos")}
          onPress={() => router.push('/photos' as any)}
        />
      </View>
    );
  }
  const pa = ids ? asc.find((p) => p.id === ids.avant) : undefined;
  const pb = ids ? asc.find((p) => p.id === ids.apres) : undefined;
  if (!pa || !pb) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  // l'avant est toujours la plus ancienne des deux
  const [a, b] = pa.date < pb.date || (pa.date === pb.date && pa.created_at <= pb.created_at) ? [pa, pb] : [pb, pa];
  const weightDiff = a.weight && b.weight ? b.weight - a.weight : null;
  const days = Math.abs(daysDiff(a.date.slice(0, 10), b.date.slice(0, 10)));
  const frameW = width - GUTTER * 2;
  const h = Math.round(frameW * 1.3);
  const dimsA: Dims = { w: frameW, h, iw: sizeA.iw, ih: sizeA.ih };
  const dimsB: Dims = { w: frameW, h, iw: sizeB.iw, ih: sizeB.ih };
  const cadres = {
    avant: clampCadre(cadreFor(store, a.id, b.id, a.id) ?? defaultCadre(dimsA), dimsA),
    apres: clampCadre(cadreFor(store, a.id, b.id, b.id) ?? defaultCadre(dimsB), dimsB),
  };
  const onCadre = (cote: Cote, cd: Cadre) => {
    const p = cote === 'avant' ? a : b;
    saveStore(withCadre(storeRef.current, a.id, b.id, p.id, clampCadre(cd, cote === 'avant' ? dimsA : dimsB)));
  };
  const alignerAutre = () => {
    tapLight();
    const from: Cote = reglage ?? 'avant';
    const to: Cote = from === 'avant' ? 'apres' : 'avant';
    const next = alignerPareil(cadres[from], from === 'avant' ? dimsA : dimsB, to === 'avant' ? dimsA : dimsB);
    saveStore(withCadre(storeRef.current, a.id, b.id, (to === 'avant' ? a : b).id, next));
  };
  const shotA = { uri: a.file_uri, date: a.date, weight: a.weight };
  const shotB = { uri: b.file_uri, date: b.date, weight: b.weight };
  const poseA = poseOf(a);
  const poseB = poseOf(b);
  const posesDiff = !!poseA && !!poseB && poseA !== poseB;

  const pick = (p: Photo) => {
    tapLight();
    if (!ids) return;
    const other = cible === 'avant' ? b : a;
    if (p.id === other.id) {
      // meme photo que l'autre : on echange
      setIds({ avant: b.id, apres: a.id });
      return;
    }
    const next = cible === 'avant' ? { avant: p.id, apres: b.id } : { avant: a.id, apres: p.id };
    setIds(next);
  };

  const doShare = async () => {
    noterPartage('avant_apres');
    try {
      if (!cardRef.current) return;
      const uri = await captureRef(cardRef, { format: 'jpg', quality: 0.92, width: 1080 });
      setShareOpen(false);
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      if (await isAvailableAsync()) await shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: traduire('Ton avant et après') });
      else {
        const res = await Share.share({ url: uri, message: signaturePartage() });
        if (res.action === Share.sharedAction) noterPartage('avant_apres', true);
      }
    } catch (err) {
      logger.error('Partage de la comparaison impossible', err);
      setShareOpen(false);
      setNotice(traduire('L’image n’a pas pu être créée, réessaie.'));
    }
  };

  const doSave = async () => {
    try {
      if (!cardRef.current) return;
      const uri = await captureRef(cardRef, { format: 'jpg', quality: 0.92, width: 1080 });
      setShareOpen(false);
      const { status } = await requestPermissionsAsync();
      if (status === 'granted') {
        await saveToLibraryAsync(uri);
        notificationAsync(NotificationFeedbackType.Success).catch(() => {});
        setNotice(traduire('Image enregistrée dans ta galerie.'));
      } else setNotice(traduire('Autorise l’accès à ta galerie dans les réglages pour enregistrer l’image.'));
    } catch (err) {
      logger.error('Enregistrement dans la galerie impossible', err);
      setShareOpen(false);
      setNotice(traduire('Enregistrement impossible, réessaie.'));
    }
  };

  const filterItems: { value: Filtre; label: string }[] = [
    { value: 'toutes', label: traduire('Toutes') },
    ...POSES.filter((p) => counts[p.value] >= 1).map((p) => ({ value: p.value as Filtre, label: p.label })),
  ];
  const thumbW = 66;
  const cardW = Math.min(width - 48 - 16, 340);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView scrollEnabled={!reglage} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <DetailHeader
          title={traduire("Ta transformation")}
          sub={reglage ? traduire('Règle chaque photo : pince pour zoomer, glisse pour la placer.') : CONSIGNE[mode]}
          right={
            <IconButton label={traduire("Partager la comparaison")} onPress={() => setShareOpen(true)}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M12 15V4M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" stroke={c.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </IconButton>
          }
        />

        {reglage ? (
          <View style={{ paddingHorizontal: GUTTER, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pills
              items={[
                { value: 'avant' as Cote, label: traduire('Avant') },
                { value: 'apres' as Cote, label: traduire('Après') },
              ]}
              value={reglage}
              onChange={(v) => setReglage(v)}
            />
            <View style={{ flex: 1 }} />
            <PrimaryButton label={traduire("Terminé")} onPress={() => { tapLight(); setReglage(null); setTransparence(false); }} style={{ height: 44, paddingHorizontal: 18 }} />
          </View>
        ) : (
          <View style={{ paddingHorizontal: GUTTER, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Pills items={MODES} value={mode} onChange={(v) => setMode(v)} />
            </View>
          </View>
        )}

        <View style={{ paddingHorizontal: GUTTER, marginTop: 12 }}>
          <ComparateurCadre before={shotA} after={shotB} width={frameW} height={h} mode={mode} sizes={{ avant: sizeA, apres: sizeB }} cadres={cadres} reglage={reglage} transparence={transparence} onCadre={onCadre} />
          {reglage ? (
            <>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <GhostButton label={transparence ? traduire('Sans transparence') : traduire('Transparence')} onPress={() => setTransparence((t) => !t)} style={{ flex: 1 }} />
                <GhostButton label={traduire("Aligner pareil")} onPress={alignerAutre} style={{ flex: 1 }} />
              </View>
              <Ink size={12} color={c.textSecondary} style={{ marginTop: 8 }}>
                {reglage === 'avant' ? traduire("Les lignes t’aident à mettre épaules, nombril et hanches à la même hauteur. Touche deux fois pour revenir. « Aligner pareil » donne le même cadrage à la photo après.") : traduire("Les lignes t’aident à mettre épaules, nombril et hanches à la même hauteur. Touche deux fois pour revenir. « Aligner pareil » donne le même cadrage à la photo avant.")}
              </Ink>
            </>
          ) : (
            <>
              <GhostButton label={traduire("Ajuster le cadrage de chaque photo")} onPress={() => { tapLight(); setReglage('avant'); }} style={{ marginTop: 10 }} />
              <Ink size={12} color={c.textSecondary} style={{ marginTop: 8 }}>{traduire("Une photo en pied, l’autre en buste ? Ajuste : zoome et place chaque photo pour qu’elles se répondent. Le réglage est gardé.")}</Ink>
            </>
          )}
        </View>

        {days === 0 ? (
          <View style={{ marginHorizontal: GUTTER, marginTop: 18, padding: 16, borderRadius: 20, backgroundColor: c.accentTint, gap: 4 }}>
            <Ink size={15} weight="extraBold">{traduire("Ces deux photos sont du même jour")}</Ink>
            <Ink size={13} color={c.textSecondary}>
              {asc.length > 2 && daysDiff(asc[0].date.slice(0, 10), asc[asc.length - 1].date.slice(0, 10)) > 0
                ? traduire('Choisis une photo plus ancienne dans le bandeau ci-dessous pour voir ton chemin.')
                : traduire('Reprends une photo dans 3 ou 4 semaines, même lumière et même cadrage : c’est là que la différence se verra.')}
            </Ink>
          </View>
        ) : (
          <StatStrip
            style={{ marginHorizontal: GUTTER, marginTop: 18 }}
            items={[
              weightDiff === null ? { value: 'Sans poids', label: traduire('pas de poids sur ces photos') } : { value: ecartTexte(weightDiff), label: ecartLibelle(weightDiff) },
              { value: dureeTexte(days), label: traduire("entre les deux photos{0}", days >= 21 ? `, ${days} jours` : '') },
            ]}
          />
        )}
        {posesDiff ? (
          <Ink size={12} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: GUTTER, marginTop: 8 }}>
            {traduire("Attention : ces deux photos n’ont pas la même pose.")}</Ink>
        ) : null}

        <Ink size={17} weight="black" tight style={{ paddingHorizontal: GUTTER, marginTop: 26 }}>{traduire("Choisir les photos")}</Ink>
        {filterItems.length > 1 ? (
          <View style={{ paddingHorizontal: GUTTER, marginTop: 10 }}>
            <Pills items={filterItems} value={filtre} onChange={(v) => setFiltre(v)} />
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: GUTTER, marginTop: 12 }}>
          {([
            { k: 'avant' as Cible, p: a, word: traduire('Avant') },
            { k: 'apres' as Cible, p: b, word: traduire('Après') },
          ]).map((o) => {
            const on = cible === o.k;
            return (
              <Pressable key={o.k} onPress={() => { tapLight(); setCible(o.k); }} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={traduire("Changer la photo {0}", o.word.toLowerCase())} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 18, backgroundColor: on ? c.accentTint : P.carte, borderWidth: 2, borderColor: on ? c.accent : c.divider }}>
                <Image source={{ uri: o.p.file_uri }} style={{ width: 40, height: 54, borderRadius: 9 }} resizeMode="cover" />
                <View style={{ flex: 1 }}>
                  <Ink size={14} weight="extraBold" color={on ? c.accent : c.ink}>{o.word}</Ink>
                  <Ink size={12} color={c.textSecondary} numberOfLines={1}>{dateCourte(o.p.date.slice(0, 10))}</Ink>
                  {o.p.weight ? <Ink size={12} color={c.textSecondary} numberOfLines={1}>{kg(o.p.weight)}</Ink> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
        <Ink size={12} color={c.textSecondary} style={{ paddingHorizontal: GUTTER, marginTop: 8 }}>
          {cible === 'avant' ? traduire("Touche une vignette pour la mettre en avant.") : traduire("Touche une vignette pour la mettre en après.")}
        </Ink>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 8 }} style={{ marginTop: 10 }}>
          {pool.map((p) => {
            const isA = p.id === a.id;
            const isB = p.id === b.id;
            return (
              <Pressable key={p.id} onPress={() => pick(p)} accessibilityRole="button" accessibilityLabel={traduire("Photo du {0}{1}", dateCourte(p.date.slice(0, 10)), isA ? traduire(', en avant') : isB ? traduire(', en après') : '')} style={{ width: thumbW, gap: 4 }}>
                <View>
                  <Image source={{ uri: p.file_uri }} style={{ width: thumbW, height: thumbW * 1.33, borderRadius: 12, borderWidth: isA || isB ? 3 : 0, borderColor: c.accent, opacity: isA || isB ? 1 : 0.85 }} resizeMode="cover" />
                  {isA || isB ? (
                    <View style={{ position: 'absolute', left: 4, bottom: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 7, backgroundColor: c.primary }}>
                      <Ink size={10} weight="extraBold" color={c.onPrimary}>{isA ? traduire('Avant') : traduire('Après')}</Ink>
                    </View>
                  ) : null}
                </View>
                <Ink size={11} weight="bold" color={c.textSecondary} numberOfLines={1}>{dateCourte(p.date.slice(0, 10))}</Ink>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: GUTTER, marginTop: 18 }}>
          <GhostButton
            label={traduire("Tout le chemin")}
            onPress={() => {
              tapLight();
              const pair = paireParDefaut(asc, filtre === 'toutes' ? null : filtre);
              if (pair) setIds({ avant: pair[0].id, apres: pair[1].id });
            }}
            style={{ flex: 1 }}
          />
          <PrimaryButton label={traduire("Partager")} onPress={() => setShareOpen(true)} style={{ flex: 1, height: 54 }} />
        </View>
        {asc.length >= 2 ? (
          <GhostButton label={traduire("Créer ma carte avant après")} onPress={() => { tapLight(); router.push(carteAvantApresDirecte(ids) as never); }} style={{ marginHorizontal: GUTTER, marginTop: 10 }} />
        ) : null}
        <Ink size={13} color={c.textSecondary} style={{ paddingHorizontal: GUTTER, marginTop: 14 }}>
          {traduire("Même lumière, même cadrage, même heure : c’est ce qui rend la comparaison juste.")}</Ink>
      </ScrollView>

      <Sheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        title={traduire("Ton avant et après")}
        text={traduire("L’image est créée sur ton téléphone. Elle ne le quitte que si tu la partages.")}
        actions={[
          { label: traduire('Partager'), tone: 'accent', onPress: doShare },
          { label: traduire('Enregistrer dans ma galerie'), tone: 'ink', onPress: doSave },
          { label: traduire('Annuler'), onPress: () => setShareOpen(false) },
        ]}
      >
        <View style={{ alignItems: 'center' }}>
          <CarteAvantApres ref={cardRef} before={shotA} after={shotB} width={cardW} cadres={cadres} sizes={{ avant: sizeA, apres: sizeB }} />
        </View>
      </Sheet>
      <Sheet visible={!!notice} onClose={() => setNotice(null)} title={notice ?? ''} actions={[{ label: traduire('D’accord'), tone: 'ink', onPress: () => setNotice(null) }]} />
    </View>
  );
}
