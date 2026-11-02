/**
 * Studio, rubrique Diagnostic : infos de l'appareil a copier, stockage local (recherche et
 * suppression cle par cle, avec confirmation), compteurs d'usage locaux, Sentry (desactive, explique),
 * les 50 derniers messages du journal local (en memoire, rien n'est envoye), et « tout effacer »
 * qui ouvre le meme effacement complet que la carte rouge du haut du Studio (RepartirDeZero.tsx).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Card, Row } from '@/components/yoroi/v2/espace/ui';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import { appInfoText, formatDate, getAppInfo } from '@/lib/v2/creator/deviceInfo';
import { DEMO_PROTECTED_KEYS } from '@/lib/demoDataService';
import { clearRecentLogs, getRecentLogs, type LocalLogEntry } from '@/lib/security/logger';
import { KV, Note, SearchField, SmallAction, StudioSection, SubTitle, confirm, useStudio } from './parts';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, DECIMAL, LOCALE } from '@/lib/i18n/tr';
import { CarteApercu, useMoteurCartes } from '@/components/yoroi/v2/cartes/CarteRendu';
import { ecrireMoteur, STYLE_DEFAUT } from '@/lib/v2/cartes/store';
import type { MoteurCartes } from '@/lib/v2/cartes/store';
import { DEMO_SEANCE_COMBAT, DEMO_SEANCE_COURSE, DEMO_SEANCE_MUSCU, DEMO_SEMAINE, demoExploit } from '@/lib/v2/cartes/demo';
import type { CarteData, OptionsCarte } from '@/lib/v2/cartes/types';
import { lireDateInstallation } from '@/lib/v2/installation';
import type { DateInstallation } from '@/lib/v2/installation';
import { BancPhoto } from './BancPhoto';

/**
 * 2 novembre 2026 (cartes v10) : l'interrupteur du nouveau moteur de cartes. Ici seulement : cet ecran est dans le
 * Studio, monte derriere StudioGate (app/creator-mode.tsx : mode createur actif et jeton reverifie a chaque ouverture).
 * Ancien par defaut ; le retour a l'ancien est instantane (toutes les cartes ouvertes basculent).
 * « Comparer » montre des cartes de demonstration dessinees par les deux moteurs, cote a cote.
 */
const CARTES_COMPARER: { nom: string; d: CarteData }[] = [
  { nom: 'Séance', d: DEMO_SEANCE_MUSCU },
  { nom: 'Course', d: DEMO_SEANCE_COURSE },
  { nom: 'Combat', d: DEMO_SEANCE_COMBAT },
  { nom: 'Semaine', d: DEMO_SEMAINE },
  { nom: 'Record', d: demoExploit('record_charge') },
];

function InterrupteurMoteur() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const moteur = useMoteurCartes();
  const [comparer, setComparer] = useState(false);
  const [format, setFormat] = useState<'story' | 'post'>('story');
  const [installation, setInstallation] = useState<DateInstallation | null>(null);
  useEffect(() => {
    lireDateInstallation().then(setInstallation).catch(() => undefined);
  }, []);
  const choix = (m: MoteurCartes | 'comparer', label: string) => {
    const on = m === 'comparer' ? comparer : !comparer && moteur === m;
    return (
      <Pressable
        key={m}
        onPress={() => {
          if (m === 'comparer') setComparer((x) => !x);
          else {
            setComparer(false);
            void ecrireMoteur(m);
          }
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        accessibilityLabel={label}
        style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.primary : pressed ? c.fillSubtle : c.surface, borderWidth: 1, borderColor: on ? c.primary : c.border })}
      >
        <Ink size={14} weight="extraBold" color={on ? c.onPrimary : c.ink}>{label}</Ink>
      </Pressable>
    );
  };
  const options: OptionsCarte = { ...STYLE_DEFAUT, format, chiffres: [] };
  return (
    <>
      <SubTitle>{traduire('Cartes de partage : moteur')}</SubTitle>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {choix('ancien', traduire('Ancien'))}
        {choix('nouveau', traduire('Nouveau'))}
        {choix('comparer', traduire('Comparer'))}
      </View>
      <Note>{traduire('Ce téléphone seulement, jamais synchronisé. Ancien par défaut. Le nouveau dessine les séances, la semaine, les records, l’année et l’avant après ; les autres cartes restent sur l’ancien.')}</Note>
      <Card>
        <KV first label={traduire('Moteur des cartes')} value={moteur === 'nouveau' ? traduire('Nouveau') : traduire('Ancien')} />
        <KV label={traduire('Date d’installation')} value={installation ? `${installation.date}${installation.statut === 'estimee' ? ` (${traduire('estimée')})` : ''}` : traduire('pas encore écrite')} />
      </Card>
      {comparer ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SmallAction label={format === 'story' ? traduire('Passer en 4:5') : traduire('Passer en story')} onPress={() => setFormat((f) => (f === 'story' ? 'post' : 'story'))} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingRight: 8 }}>
            {CARTES_COMPARER.map((x) => (
              <View key={x.nom} style={{ gap: 6 }}>
                <Ink size={13} weight="extraBold">{traduire(x.nom)}</Ink>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ gap: 4, alignItems: 'center' }}>
                    <CarteApercu largeur={130} data={x.d} options={options} visuels={{ ambiance: false }} moteur="ancien" />
                    <Ink size={11} weight="bold" color={c.textSecondary}>{traduire('Ancien')}</Ink>
                  </View>
                  <View style={{ gap: 4, alignItems: 'center' }}>
                    <CarteApercu largeur={130} data={x.d} options={options} visuels={{ ambiance: false }} moteur="nouveau" />
                    <Ink size={11} weight="bold" color={c.textSecondary}>{traduire('Nouveau')}</Ink>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </>
  );
}

const FIRST = 15;

const COUNTERS: { key: string; label: string }[] = [
  { key: 'yoroi_review_count', label: traduire('Demandes d’avis montrées') },
  { key: '@yoroi_review_prompts_count', label: traduire('Demandes d’avis sur la période') },
  { key: '@yoroi_rating_action_count', label: traduire('Actions comptées pour l’avis') },
  { key: '@yoroi_rating_dismissed_count', label: traduire('Demandes d’avis refusées') },
  { key: '@yoroi_review_last_prompt', label: traduire('Dernière demande d’avis') },
  { key: '@yoroi_last_auto_backup', label: traduire('Dernière sauvegarde automatique') },
  { key: '@yoroi_first_use_date', label: traduire('Premier lancement') },
];

type KeyRow = { key: string; size: number };

function sizeText(n: number): string {
  if (n < 1024) return traduire("{0} caractères", n);
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace('.', DECIMAL)} ko`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', DECIMAL)} Mo`;
}

function counterText(v: string | null): string {
  if (v === null || v === undefined || v === '') return '0';
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString(LOCALE, { dateStyle: 'short', timeStyle: 'short' });
  if (/^\d{12,}$/.test(v)) return new Date(Number(v)).toLocaleString(LOCALE, { dateStyle: 'short', timeStyle: 'short' });
  return v.length > 24 ? `${v.slice(0, 24)}...` : v;
}

const isProtected = (k: string) => DEMO_PROTECTED_KEYS.includes(k);

export function Diagnostic() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { demoActive, repartirDeZero } = useStudio();
  const { expiresAt, label } = useCreatorMode();
  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [counters, setCounters] = useState<Record<string, string | null>>({});
  const [logs, setLogs] = useState<LocalLogEntry[]>([]);
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const info = getAppInfo();

  const load = useCallback(async () => {
    try {
      const names = [...(await AsyncStorage.getAllKeys())].sort((a, b) => a.localeCompare(b));
      const rows: KeyRow[] = [];
      for (let i = 0; i < names.length; i += 40) {
        const part = await AsyncStorage.multiGet(names.slice(i, i + 40));
        part.forEach(([k, v]) => rows.push({ key: k, size: v?.length ?? 0 }));
      }
      setKeys(rows);
      const cs = await AsyncStorage.multiGet(COUNTERS.map((x) => x.key));
      setCounters(Object.fromEntries(cs));
    } catch {
      setKeys([]);
    }
    setLogs(getRecentLogs());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!keys) return [];
    const f = q.trim().toLowerCase();
    return f ? keys.filter((k) => k.key.toLowerCase().includes(f)) : keys;
  }, [keys, q]);
  const shown = q.trim() || all ? filtered : filtered.slice(0, FIRST);
  const total = keys?.reduce((s, k) => s + k.size, 0) ?? 0;

  const copyInfo = async () => {
    const extra: Record<string, string> = { Données: demoActive ? traduire('Heny chargée') : traduire('vraies données') };
    if (expiresAt) extra['Mode créateur'] = traduire("{0}, jusqu’au {1}", label ?? traduire('sans étiquette'), formatDate(expiresAt));
    try {
      await Clipboard.setStringAsync(appInfoText(extra));
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      appAlert(traduire('Copié'), traduire('Les infos de l’appareil sont copiées.'));
    } catch {
      appAlert(traduire('Oups'), traduire('La copie est indisponible.'));
    }
  };

  const copyLogs = async () => {
    const text = logs.map((l) => `${new Date(l.at).toLocaleTimeString(LOCALE)} ${l.level} ${l.message}`).join('\n');
    try {
      await Clipboard.setStringAsync(text || 'Journal vide');
      appAlert(traduire('Copié'), traduire('Le journal est copié. Rien n’a été envoyé.'));
    } catch {
      appAlert(traduire('Oups'), traduire('La copie est indisponible.'));
    }
  };

  const removeKey = (k: string) => {
    if (isProtected(k)) {
      appAlert(traduire('Clé protégée'), traduire('Elle garde tes vraies données pendant une démo. Reviens à tes données depuis Démo et captures, elle partira toute seule.'));
      return;
    }
    confirm(traduire('Effacer cette clé ?'), traduire("{0}\n\nL’écran qui l’utilise repartira de zéro sur ce point.", k), traduire('Effacer'), () => {
      AsyncStorage.removeItem(k)
        .then(load)
        .catch(() => appAlert(traduire('Oups'), traduire('La clé n’a pas pu être effacée.')));
    }, true);
  };

  return (
    <StudioSection id="diag" icon="info" title={traduire("Diagnostic")} sub={traduire("Appareil, stockage, compteurs, journal, tout effacer")} keywords="diagnostic appareil telephone version build stockage cle asyncstorage compteurs usage sentry journal log effacer installation neuve">
      <Card>
        <KV first label={traduire("Version")} value={`${info.version} (build ${info.build})`} />
        <KV label={traduire("Téléphone")} value={info.model} />
        <KV label={traduire("Système")} value={info.os} />
        <KV label={traduire("Environnement")} value={info.env} />
        <KV label={traduire("Expo SDK")} value={info.sdk} />
      </Card>
      <Button tone="ghost" small icon="doc" label={traduire("Copier les infos de l’appareil")} onPress={() => void copyInfo()} />

      <InterrupteurMoteur />
      <BancPhoto />

      <SubTitle>{traduire("Compteurs d’usage de ce téléphone")}</SubTitle>
      <Card>
        {COUNTERS.map((x, i) => (
          <KV key={x.key} first={i === 0} label={traduire(x.label)} value={counterText(counters[x.key] ?? null)} />
        ))}
      </Card>
      <Note>{traduire("YOROI n’a aucun outil de mesure d’audience : rien d’autre n’est compté, rien n’est envoyé.")}</Note>

      <Card>
        <Row first icon="pulse" label={traduire("Erreur test Sentry")} sub={traduire("Désactivée : Sentry n’est pas installé, rien n’est envoyé")} chevron={false} />
      </Card>

      <SubTitle>{`Journal local, ${logs.length} derniers messages`}</SubTitle>
      <Card>
        {logs.length === 0 ? (
          <View style={{ padding: 14 }}>
            <Ink size={13} color={c.textSecondary}>{traduire("Rien pour l’instant. Le journal garde en mémoire les 50 derniers messages depuis l’ouverture de l’app, jamais les données.")}</Ink>
          </View>
        ) : (
          logs.map((l, i) => (
            <View key={`${l.at}-${i}`} style={{ paddingHorizontal: 14, paddingVertical: 8, gap: 2, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.divider }}>
              <Ink size={11} weight="extraBold" color={l.level === 'error' ? c.danger : l.level === 'warn' ? c.goldDeep : c.textMuted}>
                {`${new Date(l.at).toLocaleTimeString(LOCALE)}, ${l.level === 'error' ? 'erreur' : l.level === 'warn' ? 'alerte' : 'info'}`}
              </Ink>
              <Ink size={12} color={c.ink} selectable>{l.message}</Ink>
            </View>
          ))
        )}
      </Card>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button tone="ghost" small label={traduire("Relire")} onPress={() => setLogs(getRecentLogs())} />
        </View>
        <View style={{ flex: 1 }}>
          <Button tone="ghost" small label={traduire("Copier")} onPress={() => void copyLogs()} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            tone="ghost"
            small
            label={traduire("Vider")}
            onPress={() => {
              clearRecentLogs();
              setLogs([]);
            }}
          />
        </View>
      </View>

      <SubTitle>{traduire("Stockage local")}</SubTitle>
      <SearchField value={q} onChange={setQ} placeholder={traduire("Chercher une clé")} label={traduire("Chercher une clé du stockage local")} />
      <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>
        {keys === null ? traduire('Lecture du stockage') : traduire("{0} clés, {1} au total", keys.length, sizeText(total))}
      </Ink>
      <Card>
        {shown.length === 0 ? (
          <View style={{ padding: 16 }}>
            <Ink size={14} color={c.textSecondary}>{keys === null ? traduire('Un instant') : traduire('Aucune clé ne correspond.')}</Ink>
          </View>
        ) : (
          shown.map((k, i) => (
            <Row
              key={k.key}
              first={i === 0}
              label={k.key}
              sub={isProtected(k.key) ? traduire("{0}, protégée", sizeText(k.size)) : sizeText(k.size)}
              chevron={false}
              right={<SmallAction label={traduire("Effacer")} danger onPress={() => removeKey(k.key)} disabled={isProtected(k.key)} />}
            />
          ))
        )}
      </Card>
      {!q.trim() && !all && filtered.length > FIRST ? <Button tone="ghost" label={traduire("Voir les {0} clés", filtered.length)} onPress={() => setAll(true)} small /> : null}

      <View style={{ gap: 6, marginTop: 6 }}>
        <Button tone="danger" icon="trash" label={traduire("Tout effacer et repartir de zéro")} onPress={repartirDeZero} />
        <Note>{traduire("Comme une installation neuve : toutes les données, le jeton créateur compris, puis l’onboarding. Une fenêtre qui dit tout ce qui part, puis le mot à écrire.")}</Note>
      </View>
    </StudioSection>
  );
}

export default Diagnostic;
