/**
 * Import de seances depuis d'autres apps (refonte v2) : fichiers GPX (Strava) et TCX (Garmin).
 * Analyse du fichier, choix des seances, changement de sport, import dans l'historique.
 */
import React, { useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Image, View } from 'react-native';
import { router } from 'expo-router';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { parseWorkoutFile, activityToTraining, ParsedActivity } from '@/lib/workoutImporter';
import { addTraining } from '@/lib/database';
import { completerLieuImport } from '@/lib/v2/seances/importLieu';
import { SPORTS, getSportName } from '@/lib/sports';
import logger from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Glass, P, Press } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Icon as EIcon } from '@/components/yoroi/v2/espace/ui';
import { Chip, Sheet } from '@/components/yoroi/v2/seances/ui';
import { DoneBlock, NumberedSteps, SummaryHero } from '@/components/yoroi/v2/partage/importKit';
import { SPORT_ILLUS } from '@/components/yoroi/v2/espace/assets';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} h${m > 0 ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`;
};

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export default function ImportWorkoutsScreen() {
  const [step, setStep] = useState<'select' | 'preview' | 'done'>('select');
  const [activities, setActivities] = useState<ParsedActivity[]>([]);
  const [format, setFormat] = useState<'gpx' | 'tcx'>('gpx');
  const [errors, setErrors] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [sportPickerId, setSportPickerId] = useState<string | null>(null);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/gpx+xml', 'application/xml', 'text/xml', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const fileName = file.name || 'unknown.gpx';
      const ext = fileName.toLowerCase().split('.').pop();
      if (ext !== 'gpx' && ext !== 'tcx' && ext !== 'xml') {
        appAlert(traduire('Format non reconnu'), traduire('Choisis un fichier GPX ou TCX.'));
        return;
      }
      setIsParsing(true);
      const content = await FileSystem.readAsStringAsync(file.uri);
      const parsed = parseWorkoutFile(content, fileName);
      setActivities(parsed.activities);
      setFormat(parsed.format);
      setErrors(parsed.errors);
      if (parsed.activities.length > 0) {
        setStep('preview');
        await impactAsync(ImpactFeedbackStyle.Medium);
      } else {
        appAlert(traduire('Aucune séance'), parsed.errors.length > 0 ? parsed.errors[0] : traduire('Aucune séance trouvée dans ce fichier.'));
      }
    } catch (error: any) {
      logger.error('Import file error:', error);
      appAlert(traduire('Lecture impossible'), traduire('Le fichier n’a pas pu être lu. Vérifie que c’est bien un fichier GPX ou TCX.'));
    } finally {
      setIsParsing(false);
    }
  };

  const toggleActivity = (id: string) => setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, selected: !a.selected } : a)));
  const toggleAll = () => {
    const all = activities.every((a) => a.selected);
    setActivities((prev) => prev.map((a) => ({ ...a, selected: !all })));
  };
  const changeSport = (activityId: string, newSportId: string) => {
    setActivities((prev) => prev.map((a) => (a.id === activityId ? { ...a, yoroiSportId: newSportId } : a)));
    setSportPickerId(null);
  };

  const importSelected = async () => {
    const selected = activities.filter((a) => a.selected);
    if (selected.length === 0) return;
    setIsImporting(true);
    let successCount = 0;
    try {
      for (const activity of selected) {
        const training = activityToTraining(activity, activity.yoroiSportId);
        // 17 octobre : le club si un creneau du planning du meme sport chevauche la seance
        await addTraining(await completerLieuImport(training));
        successCount++;
      }
      setImportedCount(successCount);
      setStep('done');
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      await notificationAsync(NotificationFeedbackType.Success);
    } catch (error: any) {
      logger.error('Import error:', error);
      if (successCount > 0) DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      appAlert('Import incomplet', successCount > 0 ? traduire("{0} avant l’arrêt.", plural(successCount, 'séance importée', 'séances importées')) : traduire('L’import n’a pas pu aller au bout.'));
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = activities.filter((a) => a.selected).length;
  const allSelected = activities.length > 0 && activities.every((a) => a.selected);
  const pickerActivity = activities.find((a) => a.id === sportPickerId);

  const back = () => {
    if (step === 'preview') { setStep('select'); setActivities([]); setErrors([]); return; }
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  return (
    <DetailScreen title={step === 'done' ? traduire('Import terminé') : traduire('Importer des séances')} subtitle={step === 'select' ? traduire('Depuis Strava, Garmin et les autres') : undefined} onBack={back}>
      {step === 'select' ? (
        <>
          <Enter i={0}>
            <View style={{ borderRadius: 28, overflow: 'hidden', backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, height: 170 }}>
              <View style={{ position: 'absolute', right: -6, bottom: 0, flexDirection: 'row' }}>
                {SPORT_ILLUS.filter((s) => s.id === 'running' || s.id === 'fitness').map((s) => (
                  <Image key={s.id} source={s.h} style={{ width: 104, height: 150, marginLeft: -24 }} resizeMode="contain" />
                ))}
              </View>
              <View style={{ padding: 16, gap: 10, maxWidth: '60%' }}>
                <Ink size={19} weight="black" tight>{traduire("Ramène tes séances ici")}</Ink>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ backgroundColor: P.accentSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Ink size={14} weight="black" color={P.accent}>GPX</Ink>
                    <Ink size={11} weight="bold" color={P.ink2}>Strava</Ink>
                  </View>
                  <View style={{ backgroundColor: P.indigoSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Ink size={14} weight="black" color={P.indigo}>TCX</Ink>
                    <Ink size={11} weight="bold" color={P.ink2}>Garmin</Ink>
                  </View>
                </View>
              </View>
            </View>
          </Enter>
          <Enter i={1}>
            <NumberedSteps steps={[
              { title: traduire('Exporte ta séance'), text: traduire('Depuis Strava ou Garmin, en fichier GPX ou TCX.') },
              { title: traduire('Choisis le fichier'), text: traduire('YOROI repère toutes les séances qu’il contient.') },
              { title: traduire('Vérifie et importe'), text: traduire('Coche celles à garder, corrige le sport si besoin.') },
            ]} />
          </Enter>
          <Enter i={2}>
            <BigButton label={isParsing ? traduire('Analyse du fichier') : traduire('Choisir un fichier')} icon="plus" onPress={pickFile} disabled={isParsing} />
          </Enter>
          {isParsing ? <ActivityIndicator color={P.accent} /> : null}
        </>
      ) : null}

      {step === 'preview' ? (
        <>
          <SummaryHero big={activities.length} label={activities.length > 1 ? traduire('séances trouvées') : traduire('séance trouvée')} sub={traduirePluriel(selectedCount, selectedCount > 1, "Fichier {0}, {1} cochée", "Fichier {0}, {1} cochées", format.toUpperCase(), selectedCount)} />
          <Press onPress={toggleAll} accessibilityRole="button" accessibilityLabel={traduire("Tout cocher")}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 4 }}>
              <CheckDot on={allSelected} />
              <Ink size={15} weight="extraBold">{traduire("Tout cocher")}</Ink>
            </View>
          </Press>
          {errors.length > 0 ? (
            <Card style={{ backgroundColor: P.dangerSoft, borderColor: P.dangerSoft }}>
              <Ink size={13} weight="bold" color={P.danger}>{errors[0]}</Ink>
            </Card>
          ) : null}
          {activities.map((a) => (
            <Card key={a.id} style={{ padding: 14, gap: 10, opacity: a.selected ? 1 : 0.55, borderColor: a.selected ? P.ink : P.line2, borderWidth: a.selected ? 1.5 : 1 }}>
              <Press onPress={() => toggleActivity(a.id)} accessibilityRole="button" accessibilityLabel={`${a.selected ? traduire('Décocher') : 'Cocher'} ${a.name}`} haptic="light">
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <CheckDot on={a.selected} />
                  <View style={{ flex: 1 }}>
                    <Ink size={15} weight="extraBold" numberOfLines={1}>{a.name}</Ink>
                    <Ink size={12} color={P.ink2}>{`${a.date}, ${a.startTime}`}</Ink>
                  </View>
                </View>
              </Press>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 8 }}>
                <MiniStat value={formatDuration(a.durationMinutes)} label={traduire("Durée")} />
                {a.distanceKm != null ? <MiniStat value={`${String(a.distanceKm).replace('.', DECIMAL)} km`} label="Distance" /> : null}
                {a.avgHeartRate != null ? <MiniStat value={`${a.avgHeartRate}`} label={traduire("Cœur moyen")} /> : null}
                {a.calories != null ? <MiniStat value={`${a.calories}`} label={traduire("Calories")} /> : null}
              </View>
              <Press onPress={() => setSportPickerId(a.id)} accessibilityRole="button" accessibilityLabel={traduire("Changer le sport, actuellement {0}", getSportName(a.yoroiSportId))}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: P.paper, borderWidth: 1, borderColor: P.line2 }}>
                  <EIcon name="dumbbell" size={16} />
                  <Ink size={14} weight="bold">{getSportName(a.yoroiSportId)}</Ink>
                  <EIcon name="down" size={14} color={P.muted} />
                </View>
              </Press>
            </Card>
          ))}
          {isImporting ? <ActivityIndicator color={P.accent} /> : null}
          <BigButton label={traduire("Importer {0}", plural(selectedCount, 'séance', 'séances'))} icon="check" onPress={importSelected} disabled={selectedCount === 0 || isImporting} />
          <BigButton label={traduire("Changer le fichier")} tone="light" onPress={() => { setStep('select'); setActivities([]); setErrors([]); }} />
        </>
      ) : null}

      {step === 'done' ? (
        <>
          <DoneBlock title={traduire("Séances ajoutées")} sub={traduire("{0} à ton historique.", plural(importedCount, 'séance ajoutée', 'séances ajoutées'))} />
          <BigButton label={traduire("Terminé")} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
          <BigButton label={traduire("Importer un autre fichier")} tone="light" onPress={() => { setStep('select'); setActivities([]); setErrors([]); setImportedCount(0); }} />
        </>
      ) : null}

      <Sheet visible={!!pickerActivity} onClose={() => setSportPickerId(null)} title="Quel sport ?">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SPORTS.map((s) => (
            <Chip key={s.id} label={s.name} on={pickerActivity?.yoroiSportId === s.id} onPress={() => pickerActivity && changeSport(pickerActivity.id, s.id)} />
          ))}
        </View>
      </Sheet>
    </DetailScreen>
  );
}

function CheckDot({ on }: { on: boolean }) {
  return (
    <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: on ? P.accent : 'transparent', borderWidth: on ? 0 : 2, borderColor: P.dashed, alignItems: 'center', justifyContent: 'center' }}>
      {on ? <EIcon name="check" size={14} color={P.white} stroke={3} /> : null}
    </View>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <View>
      <Ink size={16} weight="black" tight>{value}</Ink>
      <Ink size={11} weight="bold" color={P.ink2}>{label}</Ink>
    </View>
  );
}
