/**
 * Studio, galerie des bibliotheques d'exercices libres (RepDB, Free Exercise DB, Everkinetic) :
 * tous les exercices, lus en ligne, avec leur animation, la recherche et le detail.
 * Reserve au mode createur : rien de cela n'est visible ni livre pour le public.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { DemoPaire } from '@/components/yoroi/v2/seance/ExoDemo';
import { SearchField } from '@/components/yoroi/v2/studio/parts';
import { G, GalerieHeader, Pastille, PastilleRow } from './kit';
import { INFOS, chargerBibliotheque, filtrer } from '@/lib/v2/studio/bibliothequesLibres';
import type { Bibliotheque, ExoLibre } from '@/lib/v2/studio/bibliothequesLibres';
import { traduire } from '@/lib/i18n/tr';

const ORDRE: Bibliotheque[] = ['repdb', 'photos', 'dessins'];
const BLANC = '#FFFFFF';

export function ExercicesLibresGalerie() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [biblio, setBiblio] = useState<Bibliotheque>('repdb');
  const [listes, setListes] = useState<Partial<Record<Bibliotheque, ExoLibre[]>>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [seulementYoroi, setSeulementYoroi] = useState(false);
  const [ouvert, setOuvert] = useState<ExoLibre | null>(null);

  useEffect(() => {
    let vivant = true;
    if (listes[biblio]) return;
    setErreur(null);
    chargerBibliotheque(biblio)
      .then((l) => vivant && setListes((x) => ({ ...x, [biblio]: l })))
      .catch(() => vivant && setErreur(traduire('Pas de connexion : la bibliothèque se lit en ligne.')));
    return () => {
      vivant = false;
    };
  }, [biblio, listes]);

  const tout = listes[biblio];
  const visibles = useMemo(() => (tout ? filtrer(tout, q, seulementYoroi) : []), [tout, q, seulementYoroi]);
  const info = INFOS[biblio];
  const carte = Math.floor((width - G * 2 - 12) / 2);
  const contenir = biblio !== 'photos';

  const entete = (
    <View style={{ gap: 12, marginBottom: 12 }}>
      <GalerieHeader title={traduire('Bibliothèques d’exercices')} sub={traduire('Gratuites, en ligne, visibles seulement en mode créateur')} />
      <PastilleRow>
        {ORDRE.map((b) => (
          <Pastille key={b} label={INFOS[b].nom} on={biblio === b} count={listes[b]?.length} onPress={() => setBiblio(b)} />
        ))}
      </PastilleRow>
      <View style={{ borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 14, gap: 4 }}>
        <Ink size={14} weight="extraBold">{traduire(info.licence)}</Ink>
        {info.mention ? <Ink size={13} color={c.textSecondary}>{info.mention}</Ink> : null}
      </View>
      <SearchField value={q} onChange={setQ} placeholder={traduire('Chercher : bench, curl, squat...')} label={traduire('Chercher un exercice')} />
      <PastilleRow>
        <Pastille label={traduire('Tous')} on={!seulementYoroi} onPress={() => setSeulementYoroi(false)} />
        <Pastille label={traduire('Déjà dans YOROI')} on={seulementYoroi} count={tout ? tout.filter((e) => e.yoroi).length : undefined} onPress={() => setSeulementYoroi(true)} />
      </PastilleRow>
      {tout ? <Ink size={13} color={c.textSecondary}>{traduire('{0} exercices affichés', visibles.length)}</Ink> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <FlatList
        data={visibles}
        keyExtractor={(e) => e.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: G, paddingBottom: insets.bottom + 48, gap: 12 }}
        ListHeaderComponent={entete}
        ListEmptyComponent={
          erreur ? (
            <Ink size={15} color={c.textSecondary}>{erreur}</Ink>
          ) : !tout ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={c.accent} />
            </View>
          ) : (
            <Ink size={15} color={c.textSecondary}>{traduire('Aucun exercice trouvé.')}</Ink>
          )
        }
        initialNumToRender={8}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setOuvert(item)}
            accessibilityRole="button"
            accessibilityLabel={item.nom}
            style={({ pressed }) => ({ width: carte, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden', opacity: pressed ? 0.85 : 1 })}
          >
            <DemoPaire images={item.images.map((uri) => ({ uri }))} label={item.nom} largeur={carte} hauteur={carte} arrondi={0} bordure={false} contenir={contenir} fond={BLANC} />
            <View style={{ padding: 10, gap: 2 }}>
              <Ink size={13} weight="extraBold" numberOfLines={2}>{item.nom}</Ink>
              {item.yoroi ? (
                <Ink size={11} weight="bold" color={c.accent} numberOfLines={1}>{traduire(item.yoroi)}</Ink>
              ) : (
                <Ink size={11} color={c.textMuted} numberOfLines={1}>{item.materiel}</Ink>
              )}
            </View>
          </Pressable>
        )}
      />
      <Modal visible={!!ouvert} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOuvert(null)}>
        {ouvert ? (
          <View style={{ flex: 1, backgroundColor: c.background }}>
            <ScrollView contentContainerStyle={{ padding: G, paddingBottom: insets.bottom + 40, gap: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <Pressable onPress={() => setOuvert(null)} accessibilityRole="button" accessibilityLabel={traduire('Fermer')} hitSlop={10} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }}>
                  <Icon name="close" size={18} color={c.ink} />
                </Pressable>
              </View>
              <DemoPaire images={ouvert.images.map((uri) => ({ uri }))} label={ouvert.nom} largeur={width - G * 2} hauteur={Math.min(360, width - G * 2)} arrondi={24} contenir={contenir} fond={BLANC} />
              <View style={{ gap: 4 }}>
                <Ink size={22} weight="black" tight>{ouvert.nom}</Ink>
                {ouvert.autres.length ? <Ink size={13} color={c.textSecondary}>{ouvert.autres.join(' · ')}</Ink> : null}
                {ouvert.yoroi ? <Ink size={14} weight="bold" color={c.accent}>{traduire('Dans YOROI : {0}', traduire(ouvert.yoroi))}</Ink> : null}
              </View>
              <Ink size={14} color={c.textSecondary}>{[ouvert.materiel, ...ouvert.muscles].filter(Boolean).join(' · ')}</Ink>
              {ouvert.description ? <Ink size={15}>{ouvert.description}</Ink> : null}
              {ouvert.etapes.map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                  <Ink size={14} weight="black" color={c.accent}>{String(i + 1)}</Ink>
                  <Ink size={15} style={{ flex: 1 }}>{t}</Ink>
                </View>
              ))}
              {info.mention ? <Ink size={12} color={c.textMuted}>{info.mention}</Ink> : null}
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}
