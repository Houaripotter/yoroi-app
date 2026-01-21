// ============================================
// ÉTAPE 4 : SAUVEGARDE iCLOUD
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Cloud,
  FolderPlus,
  Download,
  Shield,
  ArrowRight,
  CheckCircle,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { exportDataToJSON } from '@/lib/exportService';
import { successHaptic } from '@/lib/haptics';
import * as Haptics from 'expo-haptics';

export default function BackupStepScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isExporting, setIsExporting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportDataToJSON();
      successHaptic();
      setIsDone(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScreenWrapper noPadding noContainer>
      {/* HEADER ÉTAPE 4 - SOMMET ABSOLU */}
      <View style={{ 
        backgroundColor: '#F2F2F7', 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border,
        zIndex: 999
      }}>
        <View style={{ paddingBottom: 10, paddingTop: 5, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: colors.gold, letterSpacing: 3, marginBottom: 8 }}>ÉTAPE 4 SUR 4</Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            {/* Etapes Passées (Gold) */}
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold }} />
            <View style={{ width: 30, height: 2, backgroundColor: colors.gold }} />
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold }} />
            <View style={{ width: 30, height: 2, backgroundColor: colors.gold }} />
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold }} />
            <View style={{ width: 30, height: 2, backgroundColor: colors.gold }} />
            
            {/* Etape 4 (Actuelle - Big Gold) */}
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.5, shadowRadius: 5 }} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#000000', marginTop: 4, letterSpacing: 1 }}>SÉCURISATION</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        
        {/* LOGO SYNC */}
        <View style={styles.iconContainer}>
          <Cloud size={60} color={colors.gold} />
          <View style={styles.shieldOverlay}>
            <Shield size={24} color="#10B981" fill="#10B981" />
          </View>
        </View>

        <Text style={[styles.title, { color: '#000000' }]}>
          Sauvegarde ton Cloud ☁️
        </Text>
        
        <View style={[styles.warningBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
          <Text style={styles.warningText}>
            Attention : YOROI fonctionne sans serveur pour respecter ta vie privée. Tes données sont uniquement sur ce téléphone.
          </Text>
        </View>

        <View style={[styles.instructionCard, { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }]}>
          <Text style={[styles.instructionTitle, { color: colors.gold }]}>MARCHE À SUIVRE :</Text>
          
          <View style={styles.stepRow}>
            <FolderPlus size={20} color={colors.gold} />
            <Text style={[styles.stepText, { color: '#000000' }]}>Cree un dossier <Text style={{fontWeight: '900'}}>"Yoroi_app Backup"</Text> dans ton iCloud Drive.</Text>
          </View>

          <View style={styles.stepRow}>
            <Download size={20} color={colors.gold} />
            <Text style={[styles.stepText, { color: '#000000' }]}>Clique sur le bouton ci-dessous pour generer ton fichier de sauvegarde.</Text>
          </View>

          <View style={styles.stepRow}>
            <Cloud size={20} color={colors.gold} />
            <Text style={[styles.stepText, { color: '#000000' }]}>Enregistre ce fichier dans ton dossier iCloud pour ne jamais rien perdre.</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.exportBtn, { backgroundColor: colors.gold }]}
          onPress={handleExport}
          disabled={isExporting}
        >
          <Download size={24} color="#FFFFFF" />
          <Text style={styles.exportBtnText}>
            {isExporting ? 'GÉNÉRATION...' : 'GÉNÉRER MA SAUVEGARDE'}
          </Text>
        </TouchableOpacity>

        {isDone && (
          <View style={styles.successMsg}>
            <CheckCircle size={20} color="#10B981" />
            <Text style={{ color: '#10B981', fontWeight: '700' }}>Fichier prêt pour iCloud !</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.finishBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace('/(tabs)');
          }}
        >
          <Text style={[styles.finishBtnText, { color: '#6B7280' }]}>TERMINER LE PARCOURS</Text>
          <ArrowRight size={18} color="#6B7280" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  shieldOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  warningBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  warningText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
  instructionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: '100%',
    padding: 20,
    borderRadius: 24,
    gap: 16,
    marginBottom: 32,
  },
  instructionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  exportBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: '#D4AF37',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  exportBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
  },
  successMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  finishBtn: {
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  finishBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
