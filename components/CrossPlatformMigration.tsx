// ============================================
// CROSS PLATFORM MIGRATION
// Composant qui guide l'user pour migrer ses données d'un iPhone vers un
// Android (ou inverse), ou entre 2 Android, ou tout autre combo.
//
// Flow :
//  1. L'user tape "Migrer vers un autre appareil" sur le device source
//  2. On crée un backup léger (sans photos) ou complet
//  3. On ouvre le share sheet natif → email/WhatsApp/Drive/AirDrop
//  4. Sur l'autre device, l'user ouvre le fichier .json → l'app l'importe
// ============================================

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { Smartphone, ArrowRight, CheckCircle2, Info, X } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { exportDataToJSON } from '@/lib/exportService';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    num: '1',
    title: traduire('Crée un backup sur cet appareil'),
    body: traduire("Tape le bouton ci-dessous. L'app crée un fichier .json qui contient toutes tes données."),
  },
  {
    num: '2',
    title: traduire('Envoie le fichier sur ton autre appareil'),
    body: traduire("Un écran de partage s'ouvre. Choisis comment envoyer :\n• Email (à toi-même)\n• WhatsApp (à toi-même)\n• Google Drive / iCloud Drive\n• AirDrop (entre iPhone et iPad / Mac)"),
  },
  {
    num: '3',
    title: traduire('Ouvre le fichier sur l\'autre appareil'),
    body: traduire("Sur ton autre téléphone/tablette, ouvre ton email/WhatsApp et tape sur le fichier `.json`."),
  },
  {
    num: '4',
    title: traduire('L\'app importe automatiquement'),
    body: traduire("Yoroi détecte le fichier, vérifie son intégrité et te propose d'importer. Tape « Importer » et tout revient à l'identique."),
  },
];

export const CrossPlatformMigration: React.FC<Props> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const [creating, setCreating] = useState<'full' | 'light' | null>(null);

  const handleCreate = async (type: 'full' | 'light') => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    setCreating(type);
    try {
      const ok = await exportDataToJSON({ silent: false, includePhotos: type === 'full' });
      if (ok) {
        appAlert(
          traduire('Sauvegarde créée'),
          traduire(`Le fichier est prêt. Envoie le fichier via le partage (email, WhatsApp, Drive…) puis tu l’ouvres sur ton autre appareil pour l'importer automatiquement.`)
        );
      }
    } catch (e) {
      appAlert(traduire('Oups'), traduire('La sauvegarde n’a pas pu être créée.'));
    } finally {
      setCreating(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border ?? '#E5E7EB' }]}>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <X size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{traduire("Migrer vers un autre appareil")}</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Hero */}
          <View style={[styles.hero, { backgroundColor: isDark ? 'rgba(14,165,233,0.15)' : '#E0F2FE' }]}>
            <View style={styles.heroIcons}>
              <View style={styles.deviceIcon}>
                <Smartphone size={28} color="#0EA5E9" />
              </View>
              <ArrowRight size={18} color="#0EA5E9" />
              <View style={styles.deviceIcon}>
                <Smartphone size={28} color="#0EA5E9" />
              </View>
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              {traduire("Transfère tes données entre 2 appareils")}</Text>
            <Text style={[styles.heroSub, { color: colors.textMuted ?? '#666' }]}>
              {traduire("iPhone ↔ Android ↔ iPad ↔ Tablette Android. Marche dans tous les sens.")}</Text>
          </View>

          {/* Compatibilité */}
          <View style={[styles.infoBox, { backgroundColor: isDark ? '#1E1E22' : '#F9FAFB', borderColor: colors.border ?? '#E5E7EB' }]}>
            <Info size={16} color="#0EA5E9" />
            <Text style={[styles.infoText, { color: colors.text }]}>
              <Text style={{ fontWeight: '700' }}>{traduire("Combos supportés :{0}", '\n')}</Text>
              • iPhone → iPad / Mac (via AirDrop recommandé){'\n'}
              • iPhone → Android (via email ou Google Drive){'\n'}
              • Android → iPhone (via email ou Google Drive){'\n'}
              • Android → Tablette Android (via Nearby Share / Drive)
            </Text>
          </View>

          {/* Étapes */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{traduire("Comment ça marche")}</Text>
          {STEPS.map((step) => (
            <View key={step.num} style={[styles.step, { backgroundColor: isDark ? '#1E1E22' : '#fff', borderColor: colors.border ?? '#E5E7EB' }]}>
              <View style={styles.stepNumWrap}>
                <Text style={styles.stepNum}>{step.num}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>{traduire(step.title)}</Text>
                <Text style={[styles.stepBody, { color: colors.textMuted ?? '#666' }]}>{step.body}</Text>
              </View>
            </View>
          ))}

          {/* Boutons */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => handleCreate('full')}
              disabled={!!creating}
              activeOpacity={0.8}
              style={[styles.btn, styles.btnPrimary]}
              accessibilityLabel={traduire("Créer un backup complet avec photos")}
            >
              {creating === 'full' ? <ActivityIndicator color="#fff" size="small" /> : <CheckCircle2 size={16} color="#fff" />}
              <Text style={styles.btnPrimaryText}>
                {creating === 'full' ? traduire('Création…') : traduire('Backup complet (avec photos)')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleCreate('light')}
              disabled={!!creating}
              activeOpacity={0.8}
              style={[styles.btn, styles.btnSecondary, { borderColor: '#0EA5E9' }]}
              accessibilityLabel={traduire("Créer un backup léger sans photos")}
            >
              {creating === 'light' ? <ActivityIndicator color="#0EA5E9" size="small" /> : <CheckCircle2 size={16} color="#0EA5E9" />}
              <Text style={[styles.btnSecondaryText, { color: '#0EA5E9' }]}>
                {creating === 'light' ? traduire('Création…') : traduire('Backup léger (sans photos, rapide)')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.warn, { color: colors.textMuted ?? '#666' }]}>
            {traduire("Le backup est chiffré avec AES-256 si tu as activé le chiffrement. Sinon il est en clair.")}</Text>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  hero: {
    borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16,
  },
  heroIcons: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  deviceIcon: {
    width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(14,165,233,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroTitle: { fontSize: 16, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  heroSub: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
  infoBox: {
    flexDirection: 'row', gap: 10, padding: 12,
    borderRadius: 10, borderWidth: 1, marginBottom: 18,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8, marginTop: 4 },
  step: {
    flexDirection: 'row', gap: 12, padding: 14, marginBottom: 8,
    borderRadius: 10, borderWidth: 1,
  },
  stepNumWrap: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#0EA5E9',
    justifyContent: 'center', alignItems: 'center',
  },
  stepNum: { color: '#fff', fontSize: 13, fontWeight: '900' },
  stepTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  stepBody: { fontSize: 12, lineHeight: 17 },
  actions: { gap: 8, marginTop: 16 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12,
  },
  btnPrimary: { backgroundColor: '#0EA5E9' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  btnSecondary: { borderWidth: 2, backgroundColor: 'transparent' },
  btnSecondaryText: { fontSize: 14, fontWeight: '700' },
  warn: { fontSize: 11, textAlign: 'center', marginTop: 14, lineHeight: 16 },
});
