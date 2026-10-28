/**
 * Exporter tes donnees (refonte v2) : seances en fichier complet, tableur ou texte,
 * corps en tableur, et export de seances filtre par sport et periode.
 * Gratuit : tes donnees t'appartiennent. Seul le bilan PDF reste Premium.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Button, Card, EspaceScreen, Icon, SectionTitle } from '@/components/yoroi/v2/espace/ui';
import type { IconName } from '@/components/yoroi/v2/espace/ui';
import { useCustomPopup } from '@/components/CustomPopup';
import { exportTrainingToCSV, exportTrainingToJSON, generateTrainingTextReport } from '@/lib/trainingExportService';
import { shareExportCSV, shareFilteredTrainingsCSV } from '@/lib/csvTemplates';
import { getSportName } from '@/lib/sports';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { logger } from '@/lib/security/logger';
import { useSensitiveScreen } from '@/lib/security/screenshotProtection';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

type Format = 'json' | 'csv' | 'txt';

const FORMATS: { id: Format; icon: IconName; label: string; sub: string }[] = [
  { id: 'csv', icon: 'table', label: traduire('Tableur'), sub: traduire('Pour Excel ou Google Sheets, réimportable dans YOROI') },
  { id: 'json', icon: 'archive', label: traduire('Fichier complet'), sub: traduire('Toutes tes séances et exercices, pour archiver') },
  { id: 'txt', icon: 'doc', label: traduire('Rapport texte'), sub: traduire('Un résumé lisible de ta progression, facile à partager') },
];

const PERIODS: { id: string; label: string; days: number | null }[] = [
  { id: '30', label: traduire('30 jours'), days: 30 },
  { id: '90', label: traduire('3 mois'), days: 90 },
  { id: '365', label: '1 an', days: 365 },
  { id: 'all', label: traduire('Tout'), days: null },
];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function ExportDataScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { showPopup, PopupComponent } = useCustomPopup();
  const { espace } = useEspace();
  // Protection contre les captures d'ecran (donnees sensibles)
  const { isBlurred } = useSensitiveScreen();

  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [sport, setSport] = useState<string>('');
  const [period, setPeriod] = useState('all');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const sports = useMemo(() => {
    const base = espace.sportsFavoris.length ? espace.sportsFavoris : ['musculation', 'jjb', 'running', 'boxe', 'mma'];
    return base.slice(0, 8);
  }, [espace.sportsFavoris]);

  const flash = (id: string) => {
    setDone(id);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(null), 3000);
  };

  const fail = (err: unknown) => {
    logger.error('[Export] erreur', err);
    showPopup(traduire('Oups'), traduire('L’export n’a pas abouti. Réessaie.'));
  };

  const exportFormat = async (f: Format) => {
    if (busy) return;
    setBusy(f);
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const ok = f === 'json' ? await exportTrainingToJSON() : f === 'csv' ? await exportTrainingToCSV() : await generateTrainingTextReport();
      if (ok) flash(f);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const exportBody = async () => {
    if (busy) return;
    setBusy('body');
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      if (await shareExportCSV()) flash('body');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const exportFiltered = async () => {
    if (busy) return;
    setBusy('filtered');
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const p = PERIODS.find((x) => x.id === period);
      const ok = await shareFilteredTrainingsCSV({
        sport: sport || undefined,
        dateFrom: p?.days ? isoDaysAgo(p.days) : undefined,
        dateTo: undefined,
      });
      if (ok) flash('filtered');
      else showPopup(traduire('Aucune séance'), traduire('Aucune séance ne correspond à ce choix.'));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const chip = (key: string, label: string, on: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={() => { selectionAsync().catch(() => {}); onPress(); }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? c.ink : c.fillSoft }}
    >
      <Ink size={13} weight="extraBold" color={on ? P.paper : c.ink}>{label}</Ink>
    </Pressable>
  );

  return (
    <>
      <View style={{ flex: 1 }}>
      <EspaceScreen title={traduire("Exporter")} subtitle={traduire("Tes données t’appartiennent. Tu les emportes où tu veux.")}>
        <SectionTitle title={traduire("Tes séances")} />
        {FORMATS.map((f) => {
          const isDone = done === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => exportFormat(f.id)}
              disabled={!!busy}
              accessibilityRole="button"
              accessibilityLabel={traduire(f.label)}
              style={({ pressed }) => ({ borderRadius: 22, backgroundColor: c.surface, borderWidth: isDone ? 2 : 1, borderColor: isDone ? c.success : c.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.85 : 1 })}
            >
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: isDone ? c.successTint : c.ink, alignItems: 'center', justifyContent: 'center' }}>
                {busy === f.id ? <ActivityIndicator color={c.background} /> : <Icon name={isDone ? 'check' : f.icon} size={22} color={isDone ? c.successText : c.goldLight} />}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={16} weight="extraBold">{traduire(f.label)}</Ink>
                <Ink size={13} color={isDone ? c.successText : c.textSecondary}>{isDone ? traduire('Exporté') : f.sub}</Ink>
              </View>
              <Icon name="share" size={18} color={c.textMuted} />
            </Pressable>
          );
        })}

        <SectionTitle title={traduire("Ton corps")} sub={traduire("Poids, composition et mensurations, une ligne par date")} />
        <Button tone={done === 'body' ? 'ghost' : 'accent'} icon={done === 'body' ? 'check' : 'table'} label={done === 'body' ? traduire('Exporté') : traduire('Exporter en tableur')} loading={busy === 'body'} onPress={exportBody} />

        <SectionTitle title={traduire("Une sélection de séances")} sub={traduire("Choisis un sport et une période")} />
        <Card style={{ padding: 14, gap: 14 }}>
          <View style={{ gap: 8 }}>
            <Ink size={14} weight="extraBold">{traduire("Sport")}</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {chip('all', traduire('Tous'), sport === '', () => setSport(''))}
              {sports.map((id) => chip(id, getSportName(id), sport === id, () => setSport(id)))}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Ink size={14} weight="extraBold">{traduire("Période")}</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PERIODS.map((p) => chip(p.id, p.label, period === p.id, () => setPeriod(p.id)))}
            </View>
          </View>
          <Button tone={done === 'filtered' ? 'ghost' : 'accent'} icon={done === 'filtered' ? 'check' : 'download'} label={done === 'filtered' ? traduire('Exporté') : traduire('Exporter la sélection')} loading={busy === 'filtered'} onPress={exportFiltered} />
        </Card>
        <PopupComponent />
      </EspaceScreen>
      {isBlurred && Platform.OS === 'ios' ? <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} /> : null}
      </View>
    </>
  );
}
