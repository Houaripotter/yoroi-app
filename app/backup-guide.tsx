import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import {
  Shield,
  Cloud,
  FolderPlus,
  Download,
  Upload,
  Calendar,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import { exportDataToJSON , importAllData } from '@/lib/exportService';
import { successHaptic } from '@/lib/haptics';
import { format } from 'date-fns';
import logger from '@/lib/security/logger';

// ============================================
// GUIDE SAUVEGARDE - BACKUP iCLOUD
// ============================================

interface Step {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export default function BackupGuideScreen() {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const todayFormatted = format(new Date(), 'yyyy-MM-dd');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportDataToJSON();
      successHaptic();
    } catch (error) {
      logger.error('Export error:', error);
      showPopup('Erreur', 'Impossible d\'exporter les donnees', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    showPopup(
      'Importer une sauvegarde',
      'Cette action remplacera tes donnees actuelles. Es-tu sur ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Importer',
          style: 'destructive',
          onPress: async () => {
            setIsImporting(true);
            try {
              await importAllData(async (data) => {
                logger.info('Data imported:', data);
              });
              successHaptic();
              showPopup('Succes', 'Donnees importees avec succes !', [{ text: 'OK', style: 'primary' }]);
            } catch (error) {
              logger.error('Import error:', error);
            } finally {
              setIsImporting(false);
            }
          }
        },
      ]
    );
  };

  const STEPS: Step[] = [
    {
      number: 1,
      title: 'Cree un dossier "Yoroi Backup"',
      description: 'Dans ton iCloud Drive, cree un dossier dedie pour tes sauvegardes Yoroi.',
      icon: <FolderPlus size={24} color={colors.gold} />,
    },
    {
      number: 2,
      title: 'Exporte tes donnees',
      description: 'Clique sur "Exporter mes donnees" ci-dessous. Un fichier JSON sera genere.',
      icon: <Download size={24} color={colors.gold} />,
    },
    {
      number: 3,
      title: 'Enregistre dans iCloud',
      description: 'Sauvegarde le fichier dans ton dossier "Yoroi Backup" sur iCloud Drive.',
      icon: <Cloud size={24} color={colors.gold} />,
    },
  ];

  return (
    <ScreenWrapper>
      <Header title="Sauvegarde" showBack />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Info */}
        <View style={[styles.headerCard, { backgroundColor: colors.goldMuted }]}>
          <Shield size={32} color={colors.gold} />
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.gold }]}>
              Protege tes donnees
            </Text>
            <Text style={[styles.headerText, { color: colors.textPrimary }]}>
              Tes donnees restent sur TON telephone.{'\n'}
              Pour ne jamais les perdre, fais une sauvegarde reguliere !
            </Text>
          </View>
        </View>

        {/* Steps */}
        <Card style={styles.stepsCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Comment faire ?
          </Text>

          {STEPS.map((step, index) => (
            <View key={step.number} style={styles.stepRow}>
              <View style={[styles.stepNumber, { backgroundColor: colors.goldMuted }]}>
                <Text style={[styles.stepNumberText, { color: colors.gold }]}>
                  {step.number}
                </Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>
                  {step.title}
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  {step.description}
                </Text>
              </View>
              {step.icon}
            </View>
          ))}
        </Card>

        {/* Tip */}
        <View style={[styles.tipCard, { backgroundColor: colors.infoMuted, borderColor: colors.info }]}>
          <Calendar size={20} color={colors.info} />
          <Text style={[styles.tipText, { color: colors.info }]}>
            Astuce : Mets un rappel tous les dimanches pour sauvegarder !
          </Text>
        </View>

        {/* Actions */}
        <Card style={styles.actionsCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Actions
          </Text>

          {/* Export */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.gold }]}
            onPress={handleExport}
            disabled={isExporting}
            activeOpacity={0.8}
          >
            <Download size={22} color={colors.background} />
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.background }]}>
                {isExporting ? 'Export en cours...' : 'Exporter mes donnees'}
              </Text>
              <Text style={[styles.actionSub, { color: colors.background + '90' }]}>
                Fichier: yoroi-backup-{todayFormatted}.json
              </Text>
            </View>
          </TouchableOpacity>

          {/* Import */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={handleImport}
            disabled={isImporting}
            activeOpacity={0.8}
          >
            <Upload size={22} color={colors.textPrimary} />
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                {isImporting ? 'Import en cours...' : 'Importer une sauvegarde'}
              </Text>
              <Text style={[styles.actionSub, { color: colors.textSecondary }]}>
                Restaurer depuis un fichier JSON
              </Text>
            </View>
          </TouchableOpacity>
        </Card>

        {/* Warning */}
        <View style={[styles.warningCard, { backgroundColor: colors.warningMuted, borderColor: colors.warning }]}>
          <AlertTriangle size={20} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            L'import remplacera toutes tes donnees actuelles. Assure-toi d'avoir un export recent avant !
          </Text>
        </View>

        {/* What's saved */}
        <Card style={styles.infoCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Ce qui est sauvegarde
          </Text>
          <View style={styles.savedList}>
            {[
              'Toutes tes pesees',
              'Composition corporelle',
              'Mensurations',
              'Historique des entrainements',
              'Tes clubs',
              'Tes reglages',
            ].map((item, i) => (
              <View key={i} style={styles.savedItem}>
                <CheckCircle size={16} color={colors.success} />
                <Text style={[styles.savedItemText, { color: colors.textSecondary }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>
      <PopupComponent />
    </ScreenWrapper>
  );
}

const RADIUS = { sm: 8, md: 12, lg: 16 };

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 20,
    borderRadius: RADIUS.lg,
    marginBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 14,
    lineHeight: 20,
  },
  stepsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  actionsCard: {
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  infoCard: {},
  savedList: {
    gap: 10,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savedItemText: {
    fontSize: 14,
  },
});
