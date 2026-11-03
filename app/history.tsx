/**
 * L'historique complet de tes séances (3 novembre 2026, Houari : « un appui sur Ta dernière séance ouvre la liste de
 * TOUTES les séances passées »). Avant, cette route renvoyait seulement vers l'onglet Séances (ancien écran archivé
 * dans _archive_ancien_design_2026-10-09/vague5/app/history.tsx) : elle devient la liste complète, reliée depuis
 * « Ta dernière séance » et depuis l'historique du bas de l'onglet.
 *  - de la plus récente à la plus ancienne, groupées par jour : un même jour garde toutes ses séances ensemble
 *    (deux marches, la musculation et le JJB), avec le résumé du jour ;
 *  - chaque ligne : le sticker du sport, le nom de la séance, l'heure, la durée et le chiffre clé ;
 *  - un filtre par sport en pastilles en haut ;
 *  - un appui sur une ligne ouvre l'écran « Détails » (workout-detail) ;
 *  - une SectionList chargée par paquets de jours, fluide même avec des centaines de séances.
 * Les règles (regroupement, filtre, chiffre clé) : lib/v2/seances/historique.ts.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { LargeurPage } from '@/components/yoroi/v2/PageLarge';
import { CarreSticker } from '@/components/yoroi/v2/seances/kitA';
import type { TeinteA } from '@/components/yoroi/v2/seances/kitA';
import { stickerDuSport } from '@/components/yoroi/v2/seances/MonthMarks';
import { Chip, ChipRow, EmptyState, Hanko, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import type { Training } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { usePageLarge } from '@/lib/v2/nav/useGrandEcran';
import { useSeancesData } from '@/lib/v2/seances/useSeancesData';
import { familyOf, sessionTitle } from '@/lib/v2/seances/sessionData';
import { isImported, sportsByCount } from '@/lib/v2/seances/weekCompare';
import { chiffreCle, filtrerParSport, grouperParJour, heureDe, premiersJours } from '@/lib/v2/seances/historique';
import type { SectionJour } from '@/lib/v2/seances/historique';
import { durationOf, formatDuration } from '@/lib/v2/trainingWeek';
import { todayISO } from '@/lib/v2/weightStats';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { LANG, traduire, traduirePluriel } from '@/lib/i18n/tr';

/** Jours chargés au départ, puis à chaque fin de liste */
const PAQUET_JOURS = 30;

/** La teinte du carré du sticker, par famille de sport */
function teinteDe(sport: string | undefined): TeinteA {
  const f = familyOf(sport);
  if (f === 'muscu') return 'bleu';
  if (f === 'combat_sol') return 'lilas';
  if (f === 'combat_pied') return 'peche';
  if (f === 'cardio') return 'menthe';
  return 'creme';
}

/** Une séance de l'historique : sticker, nom, heure, durée, chiffre clé */
const LigneSeance = React.memo(function LigneSeance({ t, unite, record, premiere, derniere, onOuvrir }: {
  t: Training;
  unite: UnitePoids;
  record: boolean;
  premiere: boolean;
  derniere: boolean;
  onOuvrir: (t: Training) => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const titre = sansTiret(sessionTitle(t));
  const heure = heureDe(t, LANG);
  const min = durationOf(t);
  const duree = min > 0 ? formatDuration(min) : '';
  const cle = chiffreCle(t, unite);
  const details = [heure ? traduire('à {0}', heure) : '', duree, t.club_name ?? ''].filter(Boolean).join(', ');
  const montre = isImported(t);
  return (
    <Pressable
      onPress={() => onOuvrir(t)}
      disabled={!t.id}
      accessibilityRole="button"
      accessibilityLabel={sansTiret([titre, details, cle, record ? traduire('record battu') : ''].filter(Boolean).join(', '))}
      accessibilityHint={traduire('Ouvre le détail de la séance')}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 68,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: pressed ? c.fillSoft : c.surface,
        borderTopLeftRadius: premiere ? 20 : 0,
        borderTopRightRadius: premiere ? 20 : 0,
        borderBottomLeftRadius: derniere ? 20 : 0,
        borderBottomRightRadius: derniere ? 20 : 0,
        borderTopWidth: premiere ? 0 : 1,
        borderColor: c.divider,
      })}
    >
      <CarreSticker nom={stickerDuSport(t.sport, !!t.is_outdoor)} teinte={teinteDe(t.sport)} taille={46} rayon={14} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ink size={15} weight="extraBold" numberOfLines={2} style={{ flexShrink: 1 }}>{titre}</Ink>
          {record ? <Hanko size={18} /> : null}
        </View>
        {details ? <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={2}>{sansTiret(details)}</Ink> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 3, maxWidth: '34%' }}>
        {cle ? <Ink size={15} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{cle}</Ink> : null}
        {montre ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name="watch" size={12} color={c.indigo} strokeWidth={2.4} />
            <Ink size={11} weight="extraBold" color={c.indigo}>{traduire('montre')}</Ink>
          </View>
        ) : null}
      </View>
      <Icon name="chevron" size={16} color={c.textMuted} />
    </Pressable>
  );
});

export default function Historique() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const page = usePageLarge(false);
  const unite = useUnitePoids();
  const { sport: sportDemande } = useLocalSearchParams<{ sport?: string }>();
  const { trainings, records, loaded } = useSeancesData();
  const [sport, setSport] = useState<string | null>(typeof sportDemande === 'string' && sportDemande ? sportDemande : null);
  const [jours, setJours] = useState(PAQUET_JOURS);
  const today = todayISO();

  const sports = useMemo(() => sportsByCount(trainings), [trainings]);
  const toutes = useMemo(() => grouperParJour(filtrerParSport(trainings, sport), today), [trainings, sport, today]);
  const sections = useMemo(() => premiersJours(toutes, jours), [toutes, jours]);
  const total = useMemo(() => toutes.reduce((n, s) => n + s.data.length, 0), [toutes]);

  const choisir = (s: string | null) => {
    tap();
    setSport(s);
    setJours(PAQUET_JOURS);
    // le filtre est gardé dans la route : « rouvrir la dernière page » le retrouve (lib/v2/nav/dernierePage.ts)
    router.setParams({ sport: s ?? '' } as never);
  };
  const ouvrir = useCallback((t: Training) => {
    if (!t.id) return;
    tap();
    router.push({ pathname: '/workout-detail', params: { id: String(t.id) } } as never);
  }, [router]);

  const enTete = (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      <EnTete
        titre={traduire('Ton historique')}
        sousTitre={loaded ? traduirePluriel(total, total > 1, '{0} séance', '{0} séances', total) : undefined}
        onRetour={() => router.back()}
        repli="/(tabs)/seances"
        zoneSure="insets"
        style={{ marginHorizontal: -16 }}
      />
      {sports.length > 1 ? (
        <View style={{ marginHorizontal: -4 }}>
          <ChipRow>
            <Chip label={traduire('Tous')} on={sport === null} onPress={() => choisir(null)} />
            {sports.map(({ sport: s, count }) => (
              <Chip key={s} label={`${sansTiret(getSportName(s))} ${count}`} on={sport === s} onPress={() => choisir(sport === s ? null : s)} />
            ))}
          </ChipRow>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <LargeurPage actif={page.grand} largeur={Math.min(page.largeur, 760)}>
        <SectionList<Training, SectionJour>
          sections={sections}
          keyExtractor={(t, i) => (t.id != null ? String(t.id) : `${t.date}${t.start_time ?? ''}${i}`)}
          ListHeaderComponent={enTete}
          renderSectionHeader={({ section }) => (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, paddingTop: 18, paddingBottom: 8, paddingHorizontal: 4, backgroundColor: c.background }} accessibilityRole="header">
              <Ink size={16} weight="black" tight numberOfLines={1} style={{ flexShrink: 1 }}>{section.titre}</Ink>
              <Ink size={12.5} weight="bold" color={c.textSecondary}>{section.resume}</Ink>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <LigneSeance
              t={item}
              unite={unite}
              record={!!item.id && (records.stampedTrainings.get(item.id) ?? 0) > 0}
              premiere={index === 0}
              derniere={index === section.data.length - 1}
              onOuvrir={ouvrir}
            />
          )}
          stickySectionHeadersEnabled
          initialNumToRender={14}
          maxToRenderPerBatch={16}
          windowSize={9}
          onEndReachedThreshold={0.6}
          onEndReached={() => { if (sections.length < toutes.length) setJours((n) => n + PAQUET_JOURS); }}
          ListEmptyComponent={
            loaded ? (
              <View style={{ paddingTop: 24 }}>
                <EmptyState
                  title={sport ? traduire('Aucune séance de ce sport') : traduire('Ta première séance t’attend')}
                  text={sport ? traduire('Touche Tous pour revoir toutes tes séances.') : traduire('Note ta séance avec le bouton +, ou importe celles de ta montre : elles arrivent ici, jour après jour.')}
                />
              </View>
            ) : null
          }
          ListFooterComponent={sections.length < toutes.length ? (
            <Ink size={12.5} weight="bold" color={c.textMuted} style={{ textAlign: 'center', paddingVertical: 16 }}>{traduire('Les séances plus anciennes arrivent…')}</Ink>
          ) : null}
          contentContainerStyle={{ paddingHorizontal: page.grand ? page.marge : 16, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        />
      </LargeurPage>
    </View>
  );
}
