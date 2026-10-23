/**
 * Tes sports favoris : les sports illustres en grand, puis tous les autres avec une recherche.
 * Le premier de la liste est ton sport principal.
 */
import React, { useMemo, useState } from 'react';
import { Image, Pressable, TextInput, View, useWindowDimensions } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, Check, EspaceScreen, GUTTER, Icon, SectionTitle } from '@/components/yoroi/v2/espace/ui';
import { SPORT_ILLUS } from '@/components/yoroi/v2/espace/assets';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { useIdentite } from '@/lib/v2/espace/useIdentite';
import { SPORTS, getSportName } from '@/lib/sports';
import { pickSportArt } from '@/lib/v2/seance/sportArt';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

/** Sports mis en avant avec leur illustration, dans l'ordre. Un sport n'apparait que s'il a
 *  sa propre illustration (pas celle d'un autre sport) : la grille grandit avec les images. */
const FEATURED = [
  'musculation', 'fitness', 'running', 'crossfit', 'boxe', 'jjb', 'mma', 'yoga', 'marche', 'velo', 'natation', 'rameur',
  'football', 'basketball', 'tennis', 'padel', 'badminton', 'volleyball', 'handball', 'rugby', 'muay_thai', 'judo', 'karate',
  'taekwondo', 'lutte', 'escalade', 'randonnee', 'danse', 'ski', 'surf', 'golf', 'pilates', 'hyrox',
];
const FEATURED_NAMES: Record<string, string> = { running: 'Course', crossfit: 'Cross training', jjb: 'JJB', boxe: 'Boxe', danse: 'Danse', ski: 'Ski' };

const CAT: Record<string, string> = {
  combat_striking: traduire('Combat, pieds et poings'),
  combat_grappling: traduire('Combat, lutte et sol'),
  fitness: traduire('Musculation et fitness'),
  cardio: 'Cardio',
  collectif: 'Sports collectifs',
  raquettes: 'Raquettes',
  danse: 'Danse',
  glisse: 'Glisse',
  nature: traduire('Extérieur'),
  aquatique: 'Sports aquatiques',
  precision: traduire('Précision et adresse'),
  autre: 'Autres',
};

const MUSCLE_IDS = new Set(['pectoraux', 'dos', 'epaules', 'biceps', 'triceps', 'abdos', 'jambes', 'mollets', 'avant_bras', 'fessiers']);

const TILE_PAD = 12;
/** Taille du nom d'une tuile : il tient sur une ligne, sans couper un mot (aussi sur le web, ou
 *  adjustsFontSizeToFit n'existe pas). Archivo Black fait environ 0,6 em par lettre (mesure), 0,62 garde une marge. */
function tileFont(name: string, avail: number): number {
  return Math.max(11, Math.min(17, Math.floor(avail / (Math.max(1, name.length) * 0.62))));
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default function TesSports() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { espace, update } = useEspace();
  const { profile } = useIdentite();
  const [q, setQ] = useState('');
  const favs = espace.sportsFavoris;
  const { width } = useWindowDimensions();
  const tileW = Math.floor((width - 2 * GUTTER - 10) / 2);
  const genre = espace.personnage === 'guerrier_f' || (espace.personnage !== 'guerrier_h' && profile?.avatar_gender === 'femme') ? 'f' : 'h';

  const toggle = (id: string) => {
    selectionAsync().catch(() => {});
    update({ sportsFavoris: favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id] });
  };
  const toFront = (id: string) => {
    selectionAsync().catch(() => {});
    update({ sportsFavoris: [id, ...favs.filter((x) => x !== id)] });
  };

  const featured = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; nom: string; image: ReturnType<typeof pickSportArt>['source'] }[] = [];
    for (const id of FEATURED) {
      const pick = pickSportArt(id, genre === 'f', 0);
      if (pick.kind !== 'illustration' || seen.has(pick.key)) continue;
      seen.add(pick.key);
      out.push({ id, nom: FEATURED_NAMES[id] ?? SPORT_ILLUS.find((x) => x.id === id)?.nom ?? getSportName(id), image: pick.source });
    }
    return out;
  }, [genre]);

  const groups = useMemo(() => {
    const query = norm(q.trim());
    const illus = new Set(featured.map((s) => s.id));
    const list = SPORTS.filter((s) => !MUSCLE_IDS.has(s.id) && (query ? norm(s.name).includes(query) : !illus.has(s.id)));
    const map = new Map<string, typeof SPORTS>();
    for (const s of list) {
      const k = s.category;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return Array.from(map.entries());
  }, [q, featured]);

  return (
    <EspaceScreen title={traduire("Tes sports")} subtitle={traduire("Le premier est ton sport principal.")}>
      {favs.length ? (
        <Card style={{ padding: 14, gap: 10 }}>
          <Ink size={14} weight="extraBold">{traduire("Tes favoris ({0})", favs.length)}</Ink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {favs.map((id, i) => (
              <Pressable
                key={id}
                onPress={() => (i === 0 ? toggle(id) : toFront(id))}
                accessibilityRole="button"
                accessibilityLabel={i === 0 ? traduire("{0}, sport principal, appuie pour retirer", getSportName(id)) : traduire("{0}, appuie pour le mettre en premier", getSportName(id))}
                style={{ minHeight: 40, borderRadius: 999, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: i === 0 ? c.ink : c.fillSoft }}
              >
                {i === 0 ? <Icon name="star" size={13} color={c.goldLight} stroke={2.4} /> : null}
                <Ink size={13} weight="extraBold" color={i === 0 ? c.background : c.ink}>{getSportName(id)}</Ink>
              </Pressable>
            ))}
          </View>
          <Ink size={12} color={c.textMuted}>{traduire("Appuie sur un sport pour le mettre en premier.")}</Ink>
        </Card>
      ) : (
        <Card style={{ padding: 16, gap: 4 }}>
          <Ink size={16} weight="extraBold">{traduire("Qu’est-ce que tu pratiques ?")}</Ink>
          <Ink size={14} color={c.textSecondary}>{traduire("Choisis un ou plusieurs sports. Ils passeront en premier quand tu ajoutes une séance.")}</Ink>
        </Card>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {featured.map((s) => {
          const on = favs.includes(s.id);
          return (
            <Pressable
              key={s.id}
              onPress={() => toggle(s.id)}
              accessibilityRole="button"
              accessibilityLabel={s.nom}
              accessibilityState={{ selected: on }}
              style={{ width: tileW, height: 178, borderRadius: 22, overflow: 'hidden', backgroundColor: on ? c.accentTint : c.surface, borderWidth: on ? 3 : 1, borderColor: on ? c.accent : c.border, paddingHorizontal: TILE_PAD, paddingTop: 8, paddingBottom: 12 }}
            >
              <View style={{ flex: 1, marginBottom: 6 }}>
                <Image source={s.image} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              </View>
              <Ink size={tileFont(s.nom, tileW - 2 * TILE_PAD - (on ? 6 : 0))} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{s.nom}</Ink>
              {on ? <View style={{ position: 'absolute', left: 10, top: 10 }}><Check size={24} /></View> : null}
            </Pressable>
          );
        })}
      </View>

      <SectionTitle title={traduire("Tous les sports")} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 50, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14 }}>
        <Icon name="search" size={18} color={c.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={traduire("Chercher un sport")}
          placeholderTextColor={c.textMuted}
          autoCorrect={false}
          accessibilityLabel={traduire("Chercher un sport")}
          style={{ flex: 1, fontSize: 16, color: c.ink, height: 48 }}
        />
      </View>
      {groups.length === 0 ? (
        <Ink size={14} color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire("Aucun sport ne correspond. Essaie un autre mot.")}</Ink>
      ) : (
        groups.map(([cat, list]) => (
          <View key={cat} style={{ gap: 8 }}>
            <Ink size={14} weight="extraBold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{CAT[cat] ?? 'Autres'}</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {list.map((s) => {
                const on = favs.includes(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => toggle(s.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={s.name}
                    style={{ minHeight: 44, borderRadius: 999, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: on ? c.ink : c.surface, borderWidth: 1, borderColor: on ? c.ink : c.border }}
                  >
                    <Ink size={14} weight="bold" color={on ? P.paper : c.ink}>{s.name}</Ink>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))
      )}
    </EspaceScreen>
  );
}
