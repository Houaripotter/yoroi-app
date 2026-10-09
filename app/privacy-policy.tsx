// ============================================
// YOROI - POLITIQUE DE CONFIDENTIALITÉ
// Intégrée dans l'app, sans dépendance externe
// ============================================

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Shield, Lock, Server, CreditCard, Smartphone, Eye, Trash2, Mail } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';

const LAST_UPDATE_FR = '19 août 2026 · Version 2.4';
const LAST_UPDATE_EN = 'August 19, 2026 · Version 2.4';

const SECTIONS_FR = [
  {
    number: '1',
    title: 'Présentation',
    icon: Shield,
    color: '#3B82F6',
    content: [
      'Yoroi est une application de suivi sportif et de santé personnelle destinée aux sportifs et pratiquants d\'arts martiaux.',
      'Contact : yoroiapp@gmail.com',
      'Notre engagement : vos données vous appartiennent. Elles ne quittent jamais votre appareil sans votre accord explicite.',
    ],
  },
  {
    number: '2',
    title: 'Données stockées localement',
    icon: Smartphone,
    color: '#10B981',
    content: [
      'Uniquement sur votre appareil :',
      '· Poids, composition corporelle, mensurations',
      '· Séances d\'entraînement et performances',
      '· Sommeil, hydratation, humeur, jeûne',
      '· Photos de transformation (optionnel)',
      '· Préférences et paramètres de l\'app',
      '· Statut d\'abonnement (chiffré via RevenueCat)',
      'Durée : conservées tant que l\'app est installée. La désinstallation entraîne leur suppression immédiate et irréversible.',
    ],
  },
  {
    number: '3',
    title: 'Données non collectées',
    icon: Server,
    color: '#EF4444',
    content: [
      'Yoroi ne collecte pas :',
      '· Données d\'identification personnelle (nom, email, téléphone)',
      '· Données de santé sur nos serveurs',
      '· Données d\'utilisation ou de télémétrie',
      '· Publicités ou tracking comportemental',
      'Aucun serveur Yoroi ne reçoit vos données de santé.',
    ],
  },
  {
    number: '4',
    title: 'Abonnement Premium',
    icon: CreditCard,
    color: '#F59E0B',
    content: [
      'Yoroi propose un abonnement Premium optionnel (mensuel ou annuel). L\'accès de base reste gratuit.',
      'Les paiements sont traités par Apple App Store. Yoroi n\'a accès à aucune donnée bancaire.',
      'La gestion des abonnements est assurée par RevenueCat (revenuecat.com). RevenueCat reçoit uniquement :',
      '· Un identifiant d\'appareil anonyme',
      '· La version de l\'application et la plateforme',
      '· Le statut d\'achat',
      'Aucune donnée de santé n\'est transmise à RevenueCat.',
      'Politique RevenueCat : revenuecat.com/privacy',
    ],
  },
  {
    number: '5',
    title: 'Apple Santé (HealthKit)',
    icon: Eye,
    color: '#EC4899',
    content: [
      'Si vous autorisez l\'accès à Apple Santé :',
      '· Yoroi peut lire vos données de santé existantes (poids, pas, fréquence cardiaque, sommeil)',
      '· Yoroi peut écrire vos nouvelles données dans Apple Santé',
      '· Ces données sont gérées par Apple selon leur propre politique',
      'Vous pouvez révoquer cet accès à tout moment : Réglages > Santé > Accès aux données > Yoroi.',
    ],
  },
  {
    number: '6',
    title: 'Permissions utilisées',
    icon: Smartphone,
    color: '#8B5CF6',
    content: [
      '· Caméra : photo de profil et photos de transformation (optionnel)',
      '· Localisation : recherche de lieux d\'entraînement via OpenStreetMap. La position n\'est jamais sauvegardée ni partagée',
      '· Notifications : rappels d\'entraînement et alertes (optionnel)',
      '· Apple Santé : lecture et écriture de données santé (optionnel)',
    ],
  },
  {
    number: '7',
    title: 'Sécurité',
    icon: Lock,
    color: '#06B6D4',
    content: [
      'Vos données bénéficient de :',
      '· La protection et le chiffrement natifs d\'iOS',
      '· L\'absence de transmission sur internet (sauf RevenueCat pour les abonnements)',
      '· L\'absence de stockage cloud sans votre accord',
      'Les sauvegardes que vous exportez sont sous votre responsabilité.',
    ],
  },
  {
    number: '8',
    title: 'Vos droits',
    icon: Trash2,
    color: '#F97316',
    content: [
      'Vous pouvez à tout moment :',
      '· Exporter toutes vos données (Réglages > Sauvegarde)',
      '· Supprimer une catégorie de données (Réglages > Confidentialité)',
      '· Supprimer toutes vos données (Réglages > Zone sensible > Réinitialiser)',
      '· Désinstaller l\'application (supprime toutes les données locales)',
    ],
  },
  {
    number: '9',
    title: 'Protection des mineurs',
    icon: Shield,
    color: '#6B7280',
    content: [
      'Yoroi est destiné aux personnes de 12 ans et plus. Nous ne collectons pas sciemment d\'informations auprès d\'enfants de moins de 12 ans.',
    ],
  },
  {
    number: '10',
    title: 'Transferts internationaux',
    icon: Server,
    color: '#6B7280',
    content: [
      'Apple et RevenueCat (USA) peuvent traiter des données de transaction selon leurs propres politiques de confidentialité.',
    ],
  },
  {
    number: '11',
    title: 'Modifications',
    icon: Eye,
    color: '#6B7280',
    content: [
      'Cette politique peut être mise à jour. La date de "dernière mise à jour" sera modifiée en conséquence. Les changements importants seront signalés dans les nouveautés de la version.',
    ],
  },
];

const SECTIONS_EN = [
  {
    number: '1',
    title: 'Overview',
    icon: Shield,
    color: '#3B82F6',
    content: [
      'Yoroi is a personal sports and health tracking application designed for athletes and martial arts practitioners.',
      'Contact: yoroiapp@gmail.com',
      'Our commitment: your data belongs to you. It never leaves your device without your explicit consent.',
    ],
  },
  {
    number: '2',
    title: 'Locally Stored Data',
    icon: Smartphone,
    color: '#10B981',
    content: [
      'Stored only on your device:',
      '· Weight, body composition, measurements',
      '· Training sessions and performance',
      '· Sleep, hydration, mood, fasting',
      '· Transformation photos (optional)',
      '· App preferences and settings',
      '· Subscription status (encrypted via RevenueCat)',
      'Duration: retained as long as the app is installed. Uninstalling results in immediate and irreversible deletion.',
    ],
  },
  {
    number: '3',
    title: 'Data Not Collected',
    icon: Server,
    color: '#EF4444',
    content: [
      'Yoroi does not collect:',
      '· Personal identification data (name, email, phone)',
      '· Health data on our servers',
      '· Usage or telemetry data',
      '· Advertising or behavioral tracking',
      'No Yoroi server receives your health data.',
    ],
  },
  {
    number: '4',
    title: 'Premium Subscription',
    icon: CreditCard,
    color: '#F59E0B',
    content: [
      'Yoroi offers an optional Premium subscription (monthly or annual). Basic access remains free.',
      'Payments are processed by the Apple App Store. Yoroi has no access to any banking data.',
      'Subscription management is handled by RevenueCat (revenuecat.com). RevenueCat only receives:',
      '· An anonymous device identifier',
      '· App version and platform',
      '· Purchase status',
      'No health data is transmitted to RevenueCat.',
      'RevenueCat policy: revenuecat.com/privacy',
    ],
  },
  {
    number: '5',
    title: 'Apple Health (HealthKit)',
    icon: Eye,
    color: '#EC4899',
    content: [
      'If you grant access to Apple Health:',
      '· Yoroi can read your existing health data (weight, steps, heart rate, sleep)',
      '· Yoroi can write your new data to Apple Health',
      '· This data is managed by Apple under their own policy',
      'You can revoke this access at any time: Settings > Health > Data Access > Yoroi.',
    ],
  },
  {
    number: '6',
    title: 'Permissions Used',
    icon: Smartphone,
    color: '#8B5CF6',
    content: [
      '· Camera: profile photo and transformation photos (optional)',
      '· Location: search for training venues via OpenStreetMap. Your position is never saved or shared',
      '· Notifications: training reminders and alerts (optional)',
      '· Apple Health: reading and writing health data (optional)',
    ],
  },
  {
    number: '7',
    title: 'Security',
    icon: Lock,
    color: '#06B6D4',
    content: [
      'Your data benefits from:',
      '· Native iOS protection and encryption',
      '· No internet transmission (except RevenueCat for subscriptions)',
      '· No cloud storage without your consent',
      'Backups you export are your responsibility.',
    ],
  },
  {
    number: '8',
    title: 'Your Rights',
    icon: Trash2,
    color: '#F97316',
    content: [
      'You can at any time:',
      '· Export all your data (Settings > Backup)',
      '· Delete a category of data (Settings > Privacy)',
      '· Delete all your data (Settings > Danger Zone > Reset)',
      '· Uninstall the app (deletes all local data)',
    ],
  },
  {
    number: '9',
    title: 'Child Protection',
    icon: Shield,
    color: '#6B7280',
    content: [
      'Yoroi is intended for users aged 12 and over. We do not knowingly collect information from children under 12.',
    ],
  },
  {
    number: '10',
    title: 'International Transfers',
    icon: Server,
    color: '#6B7280',
    content: [
      'Apple and RevenueCat (USA) may process transaction data under their own privacy policies.',
    ],
  },
  {
    number: '11',
    title: 'Changes',
    icon: Eye,
    color: '#6B7280',
    content: [
      'This policy may be updated. The "last updated" date will be changed accordingly. Significant changes will be noted in the version release notes.',
    ],
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark, screenBackground } = useTheme();
  const { language } = useI18n();

  const isFR = language === 'fr';
  const SECTIONS = isFR ? SECTIONS_FR : SECTIONS_EN;
  const LAST_UPDATE = isFR ? LAST_UPDATE_FR : LAST_UPDATE_EN;
  const headerTitle = isFR ? 'Confidentialité' : 'Privacy';
  const heroTitle = isFR ? 'Politique de Confidentialité' : 'Privacy Policy';
  const heroBadge = isFR ? '✓ 100% hors ligne, zéro serveur' : '✓ 100% offline, zero server';
  const contactLabel = isFR ? 'Pour toute question' : 'For any questions';
  const footerText = isFR ? '© 2026 Yoroi. Tous droits réservés.' : '© 2026 Yoroi. All rights reserved.';

  return (
    <View style={[styles.container, { backgroundColor: screenBackground }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: screenBackground, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.backgroundCard }]}>
          <ChevronLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{headerTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <View style={[styles.heroIcon, { backgroundColor: '#3B82F620' }]}>
            <Shield size={36} color="#3B82F6" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            {heroTitle}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            YOROI · {isFR ? 'Dernière mise à jour :' : 'Last updated:'} {LAST_UPDATE}
          </Text>
          <View style={[styles.heroBadge, { backgroundColor: '#10B98115', borderColor: '#10B981' }]}>
            <Text style={styles.heroBadgeText}>{heroBadge}</Text>
          </View>
        </View>

        {/* Sections */}
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <View key={section.number} style={[styles.section, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBg, { backgroundColor: section.color + '18' }]}>
                  <Icon size={18} color={section.color} />
                </View>
                <View style={styles.sectionTitleRow}>
                  <Text style={[styles.sectionNumber, { color: section.color }]}>{section.number}.</Text>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
                </View>
              </View>
              {section.content.map((line, idx) => (
                <Text
                  key={idx}
                  style={[
                    styles.sectionLine,
                    { color: line.startsWith('·') ? colors.textSecondary : colors.textMuted },
                    line.startsWith('·') && styles.bulletLine,
                    !line.startsWith('·') && idx === 0 && { color: colors.textSecondary, fontWeight: '500' },
                  ]}
                >
                  {line}
                </Text>
              ))}
            </View>
          );
        })}

        {/* Contact */}
        <View style={[styles.contact, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Mail size={20} color="#3B82F6" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactLabel, { color: colors.textMuted }]}>{contactLabel}</Text>
            <Text style={[styles.contactEmail, { color: '#3B82F6' }]}>yoroiapp@gmail.com</Text>
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.textMuted }]}>
          {footerText}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scrollView: { flex: 1 },
  content: { padding: 16, gap: 12 },

  // Hero
  hero: {
    borderRadius: 20, borderWidth: 1,
    padding: 24, alignItems: 'center', gap: 8, marginBottom: 4,
  },
  heroIcon: {
    width: 72, height: 72, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  heroSubtitle: { fontSize: 12, textAlign: 'center' },
  heroBadge: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, marginTop: 4,
  },
  heroBadgeText: { color: '#10B981', fontSize: 13, fontWeight: '700' },

  // Section
  section: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 6,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6,
  },
  sectionIconBg: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  sectionNumber: { fontSize: 14, fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  sectionLine: { fontSize: 13, lineHeight: 19 },
  bulletLine: { paddingLeft: 4 },

  // Contact
  contact: {
    borderRadius: 16, borderWidth: 1,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  contactLabel: { fontSize: 11, fontWeight: '500' },
  contactEmail: { fontSize: 15, fontWeight: '700' },

  footer: { fontSize: 11, textAlign: 'center', marginTop: 8 },
});
