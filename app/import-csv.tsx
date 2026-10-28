/**
 * Import d'un tableur (refonte v2) : modele CSV unique (poids, composition, mensurations)
 * et import avance multi-types (seances, sommeil, hydratation, humeur).
 * Parcours : choix du fichier, verification, import termine.
 */
import React, { useState } from 'react';
import { ActivityIndicator, DeviceEventEmitter, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  parseCSVContent,
  importParsedRows,
  shareCSVTemplate,
  CSV_ROW_TYPES,
  type CSVRowType,
  type CSVParseResult,
} from '@/lib/csvImportExportService';
import { type SimpleParseResult, shareTemplate, parseUnifiedCSV, importUnifiedRows } from '@/lib/csvTemplates';
import logger from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Glass, P } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Row } from '@/components/yoroi/v2/espace/ui';
import { DoneBlock, NumberedSteps, ParsedRow, SummaryHero, TypeBadge } from '@/components/yoroi/v2/partage/importKit';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { blancA } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

type Step = 'select' | 'preview' | 'done' | 'advanced-select' | 'advanced-preview' | 'advanced-done';

const ADV_LABELS: Record<CSVRowType, string> = {
  POIDS: traduire('pesées'), ENTRAÎNEMENT: traduire('séances'), MENSURATION: 'mensurations', SOMMEIL: traduire('nuits de sommeil'), HYDRATATION: 'hydratation', HUMEUR: 'humeur',
};

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

function errorPopup(title: string, message: string) {
  appAlert(title, message);
}

export default function ImportCSVScreen() {
  const [step, setStep] = useState<Step>('select');
  const [parseResult, setParseResult] = useState<SimpleParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [importDetails, setImportDetails] = useState({ weights: 0, measurements: 0, compositions: 0 });
  const [importErrors, setImportErrors] = useState<Array<{ line: number; error: string }>>([]);
  const [advParseResult, setAdvParseResult] = useState<CSVParseResult | null>(null);
  const [advImportErrors, setAdvImportErrors] = useState<Array<{ line: number; type: string; error: string }>>([]);

  // ===== Parcours simple =====
  const handleDownloadTemplate = async () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    const success = await shareTemplate();
    if (!success) errorPopup(traduire('Partage impossible'), traduire('Le modèle n’a pas pu être partagé. Réessaie.'));
  };

  const readCsv = async (): Promise<string | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return null;
    const file = result.assets[0];
    const ext = (file.name || 'unknown.csv').toLowerCase().split('.').pop();
    if (ext !== 'csv' && ext !== 'txt') {
      errorPopup(traduire('Format non reconnu'), traduire('Choisis un fichier .csv'));
      return null;
    }
    setIsParsing(true);
    return FileSystem.readAsStringAsync(file.uri);
  };

  const pickFile = async () => {
    try {
      const content = await readCsv();
      if (content == null) return;
      const parsed = parseUnifiedCSV(content);
      if (parsed.rows.length === 0) {
        errorPopup('Fichier vide', traduire('Aucune donnée trouvée. Vérifie le format du fichier.'));
        return;
      }
      setParseResult(parsed);
      setStep('preview');
      await impactAsync(ImpactFeedbackStyle.Medium);
    } catch (error: any) {
      logger.error('CSV file read error:', error);
      errorPopup(traduire('Lecture impossible'), traduire('Le fichier n’a pas pu être lu. Vérifie que c’est bien un tableur au format CSV.'));
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult) return;
    const validRows = parseResult.rows.filter((r) => r.valid);
    if (validRows.length === 0) return;
    setIsImporting(true);
    try {
      const result = await importUnifiedRows(validRows);
      setImportedCount(result.success);
      setImportDetails(result.details);
      setImportErrors(result.errors);
      setStep('done');
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      await notificationAsync(NotificationFeedbackType.Success);
    } catch (error: any) {
      logger.error('CSV import error:', error);
      errorPopup('Import interrompu', traduire('L’import n’a pas pu aller au bout. Réessaie.'));
    } finally {
      setIsImporting(false);
    }
  };

  // ===== Import avance =====
  const handleAdvDownloadTemplate = async () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    const success = await shareCSVTemplate();
    if (!success) errorPopup(traduire('Partage impossible'), traduire('Le modèle n’a pas pu être partagé. Réessaie.'));
  };

  const pickAdvancedFile = async () => {
    try {
      const content = await readCsv();
      if (content == null) return;
      const parsed = parseCSVContent(content);
      if (parsed.rows.length === 0) {
        errorPopup('Fichier vide', traduire('Aucune donnée trouvée.'));
        return;
      }
      setAdvParseResult(parsed);
      setStep('advanced-preview');
      await impactAsync(ImpactFeedbackStyle.Medium);
    } catch (error: any) {
      logger.error('CSV file read error:', error);
      errorPopup(traduire('Lecture impossible'), traduire('Le fichier n’a pas pu être lu. Vérifie que c’est bien un tableur au format CSV.'));
    } finally {
      setIsParsing(false);
    }
  };

  const handleAdvancedImport = async () => {
    if (!advParseResult) return;
    const validRows = advParseResult.rows.filter((r) => r.valid);
    if (validRows.length === 0) return;
    setIsImporting(true);
    try {
      const result = await importParsedRows(validRows);
      setImportedCount(result.success);
      setAdvImportErrors(result.errors);
      setStep('advanced-done');
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      await notificationAsync(NotificationFeedbackType.Success);
    } catch (error: any) {
      logger.error('CSV import error:', error);
      errorPopup('Import interrompu', traduire('L’import n’a pas pu aller au bout. Réessaie.'));
    } finally {
      setIsImporting(false);
    }
  };

  const resetAll = () => {
    setStep('select');
    setParseResult(null);
    setAdvParseResult(null);
    setImportedCount(0);
    setImportDetails({ weights: 0, measurements: 0, compositions: 0 });
    setImportErrors([]);
    setAdvImportErrors([]);
  };

  const handleBack = () => {
    switch (step) {
      case 'select': router.canGoBack() ? router.back() : router.replace('/(tabs)'); break;
      case 'preview': setParseResult(null); setStep('select'); break;
      case 'advanced-select': setStep('select'); break;
      case 'advanced-preview': setAdvParseResult(null); setStep('advanced-select'); break;
      default: resetAll();
    }
  };

  const title = step === 'select' ? traduire('Importer un tableur')
    : step === 'preview' || step === 'advanced-preview' ? traduire('Vérification')
    : step === 'advanced-select' ? traduire('Import avancé')
    : traduire('Import terminé');
  const subtitle = step === 'select' ? traduire('Pesées, composition et mensurations')
    : step === 'advanced-select' ? traduire('Séances, sommeil, hydratation, humeur')
    : undefined;

  const errorsCount = importErrors.length || advImportErrors.length;

  return (
    <DetailScreen title={title} subtitle={subtitle} onBack={handleBack}>
      {step === 'select' ? (
        <>
          <Enter i={0}>
            <Glass style={{ gap: 12, backgroundColor: blancA(0.92) }}>
              <Ink size={18} weight="black" tight>{traduire("Un seul fichier pour tout ton historique")}</Ink>
              <Ink size={14} color={P.ink2}>{traduire("Remplis le modèle sur ton ordinateur, puis importe le fichier ici.")}</Ink>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <TypeBadge icon="scale" label="Poids" tint={P.indigo} soft={P.indigoSoft} />
                <TypeBadge icon="pulse" label={traduire("Composition")} tint={P.mossText} soft={P.mossSoft} />
                <TypeBadge icon="ruler" label={traduire("Mensurations")} tint={P.goldDark} soft={P.goldSoft} />
              </View>
            </Glass>
          </Enter>
          <Enter i={1}>
            <NumberedSteps steps={[
              { title: traduire('Télécharge le modèle'), text: traduire('Il s’ouvre dans Excel, Google Sheets ou Numbers, avec des exemples.') },
              { title: traduire('Remplis tes données'), text: traduire('Une ligne par date. Laisse vide ce que tu n’as pas.') },
              { title: 'Importer le fichier', text: traduire('Range le fichier dans tes fichiers en ligne, puis tu le choisis plus bas.') },
            ]} />
          </Enter>
          <Enter i={2} style={{ gap: 10 }}>
            <BigButton label={traduire("Télécharger le modèle")} tone="light" icon="list" onPress={handleDownloadTemplate} />
            <BigButton label={isParsing ? traduire('Analyse du fichier') : traduire('Choisir mon fichier')} icon="plus" onPress={pickFile} disabled={isParsing} />
          </Enter>
          <Card style={{ padding: 0 }}>
            <Row first icon="table" label={traduire("Import avancé")} sub={traduire("Séances, sommeil, hydratation, humeur")} onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setStep('advanced-select'); }} />
          </Card>
          <Card style={{ gap: 6, backgroundColor: P.goldSoft, borderColor: P.goldSoft }}>
            <Ink size={14} weight="extraBold" color={P.goldDark}>{traduire("Astuce")}</Ink>
            <Ink size={13} color={P.ink2}>
              {Platform.OS === 'ios'
                ? traduire('Range le fichier dans iCloud Drive sur ton Mac, il apparaît dans Fichiers sur ton iPhone. AirDrop et mail marchent aussi.')
                : traduire('Range le fichier dans Google Drive sur ton ordinateur, puis ouvre le fichier depuis Fichiers. WhatsApp et mail marchent aussi.')}
            </Ink>
            <Ink size={12} color={P.ink2}>{traduire("Les fichiers des anciennes versions sont acceptés. Séparateurs virgule ou point virgule, dates JJ/MM/AAAA ou AAAA-MM-JJ.")}</Ink>
          </Card>
        </>
      ) : null}

      {step === 'preview' && parseResult ? (
        <>
          <SummaryHero big={parseResult.validCount} label={plural(parseResult.validCount, traduire('ligne prête'), traduire('lignes prêtes'))} sub={parseResult.invalidCount > 0 ? plural(parseResult.invalidCount, traduire('ligne à corriger'), traduire('lignes à corriger')) : traduire('Tout est bon')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {parseResult.summary.weights > 0 ? <TypeBadge icon="scale" label={plural(parseResult.summary.weights, traduire('pesée'), traduire('pesées'))} tint={P.indigo} soft={P.indigoSoft} /> : null}
            {parseResult.summary.compositions > 0 ? <TypeBadge icon="pulse" label={plural(parseResult.summary.compositions, 'composition', 'compositions')} tint={P.mossText} soft={P.mossSoft} /> : null}
            {parseResult.summary.measurements > 0 ? <TypeBadge icon="ruler" label={plural(parseResult.summary.measurements, 'mensuration', 'mensurations')} tint={P.goldDark} soft={P.goldSoft} /> : null}
          </View>
          <Card style={{ paddingVertical: 6 }}>
            {parseResult.rows.slice(0, 20).map((row, idx) => (
              <ParsedRow key={idx} ok={row.valid} title={row.preview || `Ligne ${row.lineNumber}`} error={row.error} />
            ))}
            {parseResult.rows.length > 20 ? <Ink size={13} weight="bold" color={P.ink2} style={{ paddingVertical: 10 }}>{traduire("Et {0} de plus", parseResult.rows.length - 20)}</Ink> : null}
          </Card>
          {isImporting ? <ActivityIndicator color={P.accent} /> : null}
          <BigButton label={traduire("Importer {0}", plural(parseResult.validCount, 'ligne', 'lignes'))} icon="check" onPress={handleImport} disabled={parseResult.validCount === 0 || isImporting} />
          <BigButton label={traduire("Changer de fichier")} tone="light" onPress={() => { setParseResult(null); setStep('select'); }} />
        </>
      ) : null}

      {step === 'advanced-select' ? (
        <>
          <Glass style={{ gap: 10, backgroundColor: blancA(0.92) }}>
            <Ink size={18} weight="black" tight>{traduire("Plusieurs types dans un fichier")}</Ink>
            <Ink size={14} color={P.ink2}>{traduire("Une colonne « TYPE » indique ce que contient chaque ligne.")}</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <TypeBadge icon="dumbbell" label={traduire("Séances")} tint={P.accent} soft={P.accentSoft} />
              <TypeBadge icon="bed" label={traduire("Sommeil")} tint={P.indigo} soft={P.indigoSoft} />
              <TypeBadge icon="drop" label={traduire("Hydratation")} tint={P.water} soft={P.indigoSoft} />
              <TypeBadge icon="heart" label={traduire("Humeur")} tint={P.goldDark} soft={P.goldSoft} />
            </View>
          </Glass>
          <BigButton label={traduire("Télécharger le modèle avancé")} tone="light" icon="list" onPress={handleAdvDownloadTemplate} />
          <BigButton label={isParsing ? traduire('Analyse du fichier') : traduire('Choisir mon fichier')} icon="plus" onPress={pickAdvancedFile} disabled={isParsing} />
        </>
      ) : null}

      {step === 'advanced-preview' && advParseResult ? (
        <>
          <SummaryHero big={advParseResult.validCount} label={plural(advParseResult.validCount, traduire('entrée prête'), traduire('entrées prêtes'))} sub={advParseResult.invalidCount > 0 ? plural(advParseResult.invalidCount, traduire('entrée à corriger'), traduire('entrées à corriger')) : traduire('Tout est bon')} />
          <Card style={{ paddingVertical: 6 }}>
            {CSV_ROW_TYPES.map((type) => {
              const typeRows = advParseResult.byType[type];
              if (!typeRows || typeRows.length === 0) return null;
              const valid = typeRows.filter((r) => r.valid).length;
              const invalid = typeRows.length - valid;
              return <ParsedRow key={type} ok={invalid === 0} title={`${valid} ${ADV_LABELS[type]}`} error={invalid > 0 ? plural(invalid, 'invalide', 'invalides') : undefined} />;
            })}
          </Card>
          {advParseResult.invalidCount > 0 ? (
            <Card style={{ paddingVertical: 6 }}>
              <Ink size={15} weight="black" color={P.danger} style={{ paddingVertical: 8 }}>{traduire("À corriger")}</Ink>
              {advParseResult.rows.filter((r) => !r.valid).slice(0, 10).map((row, idx) => (
                <ParsedRow key={idx} ok={false} title={`Ligne ${row.lineNumber}, ${ADV_LABELS[row.type as CSVRowType] ?? 'type inconnu'}`} error={row.error} />
              ))}
            </Card>
          ) : null}
          {isImporting ? <ActivityIndicator color={P.accent} /> : null}
          <BigButton label={traduire("Importer {0}", plural(advParseResult.validCount, 'entrée', 'entrées'))} icon="check" onPress={handleAdvancedImport} disabled={advParseResult.validCount === 0 || isImporting} />
          <BigButton label={traduire("Changer de fichier")} tone="light" onPress={() => { setAdvParseResult(null); setStep('advanced-select'); }} />
        </>
      ) : null}

      {step === 'done' || step === 'advanced-done' ? (
        <>
          <DoneBlock title={traduire("Import terminé")} sub={traduire("{0}, ton suivi est à jour.", plural(importedCount, 'ligne importée', 'lignes importées'))}>
            {step === 'done' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {importDetails.weights > 0 ? <TypeBadge icon="scale" label={plural(importDetails.weights, traduire('pesée'), traduire('pesées'))} tint={P.indigo} soft={P.indigoSoft} /> : null}
                {importDetails.measurements > 0 ? <TypeBadge icon="ruler" label={plural(importDetails.measurements, 'mensuration', 'mensurations')} tint={P.goldDark} soft={P.goldSoft} /> : null}
                {importDetails.compositions > 0 ? <TypeBadge icon="pulse" label={plural(importDetails.compositions, 'composition', 'compositions')} tint={P.mossText} soft={P.mossSoft} /> : null}
              </View>
            ) : null}
            {errorsCount > 0 ? <Ink size={13} weight="bold" color={P.danger}>{plural(errorsCount, traduire('erreur pendant l’import'), traduire('erreurs pendant l’import'))}</Ink> : null}
          </DoneBlock>
          <BigButton label={traduire("Terminé")} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
          <BigButton label={traduire("Importer un autre fichier")} tone="light" onPress={resetAll} />
        </>
      ) : null}
    </DetailScreen>
  );
}
