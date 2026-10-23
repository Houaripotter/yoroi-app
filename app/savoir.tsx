/**
 * Savoir (refonte v2) : fiches scientifiques et protocoles d'entrainement en belles fiches lisibles,
 * liseuse plein ecran, progression de lecture, protocoles a cocher, echelle d'hydratation.
 * Une fiche ouverte plus de huit secondes est comptee comme lue (comme avant).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { FeatureList } from '@/components/yoroi/v2/FeatureList';
import { Enter, Glass, P, Pill, SectionTitle } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Chip } from '@/components/yoroi/v2/competition/ui';
import { FicheCard, HydrationScale, ProtocolChecklist, Reader } from '@/components/yoroi/v2/competition/Savoir';
import type { ReaderContent } from '@/components/yoroi/v2/competition/Savoir';
import { protocolData, scienceData } from '@/lib/v2/competition/savoirData';
import { LAB_PROTOCOLS } from '@/data/labProtocols';
import { safeOpenURL } from '@/lib/security/validators';
import { ProgressBar } from '@/components/yoroi/v2/espace/ProgressBar';
import { traduire, LOCALE } from '@/lib/i18n/tr';

const SAVOIR_READ_ARTICLES_KEY = '@yoroi_savoir_read_articles';
const SAVOIR_READ_PROTOCOLS_KEY = '@yoroi_savoir_read_protocols';
const AUTO_READ_DELAY_MS = 8000;

type Tab = 'ARTICLES' | 'PROTOCOLES';

function useReadSet(key: string) {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw) {
          const p = JSON.parse(raw);
          if (Array.isArray(p)) setSet(new Set(p));
        }
      })
      .catch(() => {});
  }, [key]);
  const write = (next: Set<string>) => {
    AsyncStorage.setItem(key, JSON.stringify([...next])).catch(() => {});
    return next;
  };
  const mark = useCallback((id: string) => setSet((prev) => (prev.has(id) ? prev : write(new Set(prev).add(id)))), []);
  const toggle = useCallback(
    (id: string) =>
      setSet((prev) => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return write(n);
      }),
    [],
  );
  return { set, mark, toggle };
}

/**
 * Casse francaise pour les titres ecrits a l'anglaise : seule la premiere lettre en capitale,
 * les sigles (LISS, HIIT, VO2) gardent leurs capitales. « Déficit Calorique : La Loi Physique »
 * devient « Déficit calorique : la loi physique ».
 */
function frenchCase(title: string): string {
  let first = true;
  return title
    .split(/(\s+)/)
    .map((w) => {
      if (/^\s+$/.test(w) || w === '') return w;
      const core = w.replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿŒœ]/g, '');
      const acronym = core.length >= 2 && core === core.toUpperCase() && /[A-Za-zÀ-ÖØ-öø-ÿŒœ]/.test(core);
      let out = w;
      if (!acronym && !/\d/.test(core)) out = w.toLocaleLowerCase(LOCALE);
      if (first && core) {
        out = out.replace(/[A-Za-zÀ-ÖØ-öø-ÿŒœ]/, (ch) => ch.toLocaleUpperCase(LOCALE));
        first = false;
      }
      return out;
    })
    .join('');
}

export default function SavoirScreen() {
  const [tab, setTab] = useState<Tab>('ARTICLES');
  const [cat, setCat] = useState<string | null>(null);
  const [reader, setReader] = useState<ReaderContent | null>(null);
  const articles = useReadSet(SAVOIR_READ_ARTICLES_KEY);
  const protocols = useReadSet(SAVOIR_READ_PROTOCOLS_KEY);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);
  useFocusEffect(useCallback(() => clearTimer, []));

  const list = tab === 'ARTICLES' ? scienceData : protocolData;
  const readSet = tab === 'ARTICLES' ? articles : protocols;
  const categories = useMemo(() => Array.from(new Set(list.map((c) => c.category))), [list]);
  const shown = cat ? list.filter((c) => c.category === cat) : list;

  const open = (content: ReaderContent) => {
    clearTimer();
    setReader(content);
    const rs = content.kind === 'article' ? articles : protocols;
    if (!rs.set.has(content.id)) {
      timer.current = setTimeout(() => {
        rs.mark(content.id);
        timer.current = null;
      }, AUTO_READ_DELAY_MS);
    }
  };
  const close = () => {
    clearTimer();
    setReader(null);
  };

  const readerRead = reader ? (reader.kind === 'article' ? articles.set : protocols.set).has(reader.id) : false;

  return (
    <DetailScreen title={traduire("Savoir")} subtitle={traduire("La science derrière ton entraînement")}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Pill
            label={`Fiches (${scienceData.length})`}
            active={tab === 'ARTICLES'}
            onPress={() => {
              setTab('ARTICLES');
              setCat(null);
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Pill
            label={`Protocoles (${protocolData.length})`}
            active={tab === 'PROTOCOLES'}
            onPress={() => {
              setTab('PROTOCOLES');
              setCat(null);
            }}
          />
        </View>
      </View>

      <Enter i={0}>
        <Glass style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Ink size={34} weight="black" tight>
              {String(readSet.set.size)}
              <Ink size={15} weight="bold" color={P.muted}>
                {traduire(" sur {0} lues", list.length)}
              </Ink>
            </Ink>
            <Ink size={12} weight="bold" color={P.ink2}>
              {readSet.set.size >= list.length ? traduire('Tout lu, bravo') : traduire('Ta progression de lecture')}
            </Ink>
          </View>
          <ProgressBar progress={list.length ? readSet.set.size / list.length : 0} accessibilityLabel={traduire("Ta progression de lecture")} />
        </Glass>
      </Enter>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label={traduire("Toutes")} active={cat === null} onPress={() => setCat(null)} />
        {categories.map((c) => (
          <Chip key={c} label={c} active={cat === c} onPress={() => setCat(cat === c ? null : c)} />
        ))}
      </View>

      <View style={{ gap: 10 }}>
        {tab === 'ARTICLES'
          ? scienceData
              .filter((c) => !cat || c.category === cat)
              .map((c) => (
                <FicheCard
                  key={c.id}
                  title={frenchCase(c.title)}
                  category={c.category}
                  read={articles.set.has(c.id)}
                  onToggleRead={() => articles.toggle(c.id)}
                  onOpen={() => open({ kind: 'article', id: c.id, title: frenchCase(c.title), category: c.category, ...c.content })}
                />
              ))
          : protocolData
              .filter((c) => !cat || c.category === cat)
              .map((c) => (
                <FicheCard
                  key={c.id}
                  title={frenchCase(c.title)}
                  category={c.category}
                  difficulty={c.difficulty}
                  read={protocols.set.has(c.id)}
                  onToggleRead={() => protocols.toggle(c.id)}
                  onOpen={() => open({ kind: 'protocol', id: c.id, title: frenchCase(c.title), category: c.category, difficulty: c.difficulty, ...c.content })}
                />
              ))}
        {shown.length === 0 ? (
          <Ink size={14} weight="bold" color={P.muted} style={{ textAlign: 'center', paddingVertical: 20 }}>
            {traduire("Aucune fiche dans cette catégorie.")}</Ink>
        ) : null}
      </View>

      {tab === 'PROTOCOLES' ? (
        <>
          <SectionTitle>{traduire("Protocoles à cocher")}</SectionTitle>
          {LAB_PROTOCOLS.map((p) => (
            <ProtocolChecklist key={p.id} protocol={p} />
          ))}
          <SectionTitle>{traduire("Indicateur d'hydratation")}</SectionTitle>
          <HydrationScale />
        </>
      ) : null}

      <FeatureList title={traduire("Les sources")} items={[{ label: traduire('Sources scientifiques'), sub: traduire('les études derrière les calculs de YOROI'), href: '/scientific-sources' }]} />

      <Reader
        content={reader}
        read={readerRead}
        onClose={close}
        onToggleRead={() => {
          if (!reader) return;
          clearTimer();
          (reader.kind === 'article' ? articles : protocols).toggle(reader.id);
        }}
        onSource={(url) => safeOpenURL(url.replace(/\[([^\]]+)\]\(([^)]+)\)/, '$2'))}
      />
    </DetailScreen>
  );
}
