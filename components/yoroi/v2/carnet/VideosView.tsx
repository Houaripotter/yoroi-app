/**
 * Videos du carnet (vague 16) : tes videos d'exemple (exercice, muscle, technique) importees de ta galerie
 * ou ajoutees par lien. Filtre par rangement, recherche, vignettes en grille, lecture en un appui,
 * appui long pour renommer, ranger autrement ou supprimer.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, View, useWindowDimensions } from 'react-native';
import { safeOpenURL } from '@/lib/security/validators';
import { VIDEOS_CHANGED_EVENT, kindOf, listVideos, placeOf, removeVideo } from '@/lib/v2/carnet/videos';
import type { CarnetVideo } from '@/lib/v2/carnet/videos';
import { P, Field, Enter } from './ui';
import { BlockHead, CarnetEmpty, FilterChips, Summary } from './nav';
import { VideoTile } from './videos/Thumb';
import { PlayerModal } from './videos/PlayerModal';
import { AddVideoSheet } from './videos/AddVideoSheet';
import { ChargementBloc } from '@/components/yoroi/v2/chargement/Chargement';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

/** Liste du module conservee pour les anciens appelants */
export const MUSCLE_OPTIONS = [
  { label: 'Pectoraux', key: 'Pectoraux' },
  { label: traduire('Dos'), key: 'Dos' },
  { label: 'Épaules', key: 'Épaules' },
  { label: 'Biceps', key: 'Biceps' },
  { label: 'Triceps', key: 'Triceps' },
  { label: 'Jambes', key: 'Jambes' },
  { label: 'Fessiers', key: 'Fessiers' },
  { label: 'Mollets', key: 'Mollets' },
  { label: traduire('Abdos / Core'), key: 'Abdos / Core' },
  { label: 'Avant-bras', key: 'Avant-bras' },
];

/** Ouvre une video : dans YOROI si elle est sur le telephone, dans son application si c'est un lien */
export async function openVideo(v: CarnetVideo, play: (v: CarnetVideo) => void) {
  if (!v.isUrl) {
    play(v);
    return;
  }
  const ok = await safeOpenURL(v.uri);
  if (!ok) appAlert(traduire('Impossible d’ouvrir'), traduire('Installe l’application ou ouvre ce lien dans ton navigateur.'));
}

type Props = {
  refreshKey: number;
  /** change a chaque appui sur le bouton Ajouter de l'en-tete */
  addKey?: number;
};

export function VideosView({ refreshKey, addKey = 0 }: Props) {
  const { width } = useWindowDimensions();
  const [videos, setVideos] = useState<CarnetVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CarnetVideo | null>(null);
  const [playing, setPlaying] = useState<CarnetVideo | null>(null);

  const load = useCallback(async () => {
    try {
      setVideos(await listVideos());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(VIDEOS_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);
  useEffect(() => {
    if (addKey > 0) setAdding(true);
  }, [addKey]);

  const keyOf = (v: CarnetVideo) => (kindOf(v) === 'muscle' ? 'muscle' : v.sport ? `sport_${v.sport}` : 'autre');

  const chips = useMemo(() => {
    const m = new Map<string, { key: string; label: string; count: number }>();
    videos.forEach((v) => {
      const k = keyOf(v);
      const label = k === 'muscle' ? 'Muscles' : k === 'autre' ? traduire('Sans rangement') : v.sportLabel || traduire('Sport');
      if (!m.has(k)) m.set(k, { key: k, label, count: 0 });
      m.get(k)!.count++;
    });
    const rest = Array.from(m.values()).sort((a, b) => (a.key === 'autre' ? 1 : b.key === 'autre' ? -1 : a.key === 'muscle' ? -1 : b.key === 'muscle' ? 1 : b.count - a.count));
    return [{ key: 'all', label: traduire('Toutes'), count: videos.length }, ...rest];
  }, [videos]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videos.filter((v) => (filter === 'all' || keyOf(v) === filter) && (q === '' || v.title.toLowerCase().includes(q) || placeOf(v).toLowerCase().includes(q)));
  }, [videos, filter, query]);

  const sections = useMemo(() => {
    if (filter !== 'muscle') return [{ title: '', items: list }];
    const m = new Map<string, CarnetVideo[]>();
    list.forEach((v) => {
      const p = placeOf(v);
      if (!m.has(p)) m.set(p, []);
      m.get(p)!.push(v);
    });
    return Array.from(m.entries()).map(([title, items]) => ({ title, items }));
  }, [list, filter]);

  const stats = useMemo(() => {
    const muscles = new Set(videos.filter((v) => kindOf(v) === 'muscle').map(placeOf)).size;
    const tech = videos.filter((v) => kindOf(v) === 'technique').length;
    return { muscles, tech };
  }, [videos]);

  const manage = (v: CarnetVideo) => {
    appAlert(v.title, placeOf(v), [
      { text: traduire('Renommer ou ranger'), onPress: () => setEditing(v) },
      {
        text: traduire('Supprimer'),
        style: 'destructive',
        onPress: () =>
          appAlert(traduire('Supprimer la vidéo ?'), traduire("« {0} » sera retirée de YOROI.", v.title), [
            { text: traduire('Annuler'), style: 'cancel' },
            { text: traduire('Supprimer'), style: 'destructive', onPress: () => removeVideo(v).then(load) },
          ]),
      },
      { text: traduire('Annuler'), style: 'cancel' },
    ]);
  };

  const tileW = Math.floor((width - 44 - 12) / 2);

  if (loading) return <ChargementBloc style={{ marginTop: 10 }} />;

  return (
    <View style={{ gap: 14 }}>
      {videos.length === 0 ? (
        <CarnetEmpty
          illus="videos"
          title={traduire("Garde ici les vidéos qui t’inspirent")}
          text={traduire("Un exercice, une technique : importe la vidéo depuis ta galerie, donne un titre à la vidéo et tu la ranges par muscle ou par sport.")}
          action={traduire("Importer une vidéo")}
          onAction={() => setAdding(true)}
        />
      ) : (
        <>
          <Enter i={0}>
            <Summary
              illus="videos"
              items={[
                { value: String(videos.length), label: traduirePluriel(videos.length, videos.length > 1, "vidéo", "vidéos") },
                { value: String(stats.muscles), label: traduirePluriel(stats.muscles, stats.muscles > 1, "muscle rangé", "muscles rangés") },
                { value: String(stats.tech), label: `technique${stats.tech > 1 ? 's' : ''}` },
              ]}
            />
          </Enter>
          <FilterChips items={chips} value={filter} onChange={(k) => { setFilter(k); setQuery(''); }} />
          {videos.length > 6 ? <Field value={query} onChangeText={setQuery} placeholder={traduire("Chercher une vidéo")} maxLength={60} autoCorrect={false} accessibilityLabel={traduire("Chercher une vidéo")} /> : null}
          {list.length === 0 ? (
            <CarnetEmpty compact illus="videos" title={traduire("Rien trouvé")} text={traduire("Aucune vidéo ne correspond. Essaie un autre mot ou un autre rangement.")} />
          ) : (
            sections.map((s) => (
              <View key={s.title || 'toutes'} style={{ gap: 10 }}>
                {s.title ? <BlockHead title={traduire(s.title)} /> : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 }}>
                  {s.items.map((v) => (
                    <VideoTile key={v.id} v={v} width={tileW} onPress={() => openVideo(v, setPlaying)} onLongPress={() => manage(v)} />
                  ))}
                  {s.items.length % 2 === 1 ? <View style={{ width: tileW }} /> : null}
                </View>
              </View>
            ))
          )}
        </>
      )}

      <AddVideoSheet visible={adding || !!editing} editing={editing} onClose={() => { setAdding(false); setEditing(null); }} onSaved={() => load()} />
      <PlayerModal video={playing} onClose={() => setPlaying(null)} />
    </View>
  );
}
