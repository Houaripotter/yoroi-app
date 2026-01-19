import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, ChevronLeft, ExternalLink } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { LAB_ARTICLES, LabArticle, getArticlesByCategory } from '@/data/labArticles';
import { LAB_PROTOCOLS, LabProtocol } from '@/data/labProtocols';
import { ProtocolChecklist } from '@/components/lab/ProtocolChecklist';
import { HydrationScale } from '@/components/lab/HydrationScale';
import { ActionLink } from '@/components/lab/ActionLink';
import { ScientificCredibilityBadge } from '@/components/lab/ScientificCredibilityBadge';

type TabType = 'ARTICLES' | 'PROTOCOLES';

export default function LabScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('ARTICLES');
  const [selectedArticle, setSelectedArticle] = useState<LabArticle | null>(null);

  const renderArticleCard = (article: LabArticle) => (
    <TouchableOpacity
      key={article.id}
      style={[styles.card, { 
        borderLeftColor: article.categoryColor,
        backgroundColor: colors.backgroundCard,
        borderColor: colors.border
      }]}
      onPress={() => setSelectedArticle(article)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: article.categoryColor }]}>
          <Text style={styles.categoryText}>{article.category}</Text>
        </View>
        <Text style={[styles.readTime, { color: colors.textMuted }]}>{article.readTime} MIN</Text>
      </View>

      {/* Titre */}
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{article.title}</Text>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.referencesCount}>
          {article.references.length} référence{article.references.length > 1 ? 's' : ''}
        </Text>
        <ChevronLeft size={16} color="#3B82F6" style={{ transform: [{ rotate: '180deg' }] }} />
      </View>
    </TouchableOpacity>
  );

  const renderArticleModal = () => {
    if (!selectedArticle) return null;

    return (
      <Modal
        visible={selectedArticle !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedArticle(null)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top']}>
          {/* Header Modal */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedArticle(null)}
              activeOpacity={0.7}
            >
              <X size={24} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: colors.textSecondary }]}>ARTICLE SCIENTIFIQUE</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Catégorie + Temps de lecture */}
            <View style={styles.modalMeta}>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: selectedArticle.categoryColor },
                ]}
              >
                <Text style={styles.categoryText}>{selectedArticle.category}</Text>
              </View>
              <Text style={[styles.readTime, { color: colors.textMuted }]}>{selectedArticle.readTime} MIN DE LECTURE</Text>
            </View>

            {/* Titre */}
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{selectedArticle.title}</Text>

            {/* Sections QUOI / POURQUOI / COMMENT */}
            <View style={styles.contentSection}>
              <Text style={styles.sectionLabel}>QUOI ?</Text>
              <Text style={[styles.sectionText, { color: colors.textPrimary }]}>{selectedArticle.content.what}</Text>
            </View>

            <View style={styles.contentSection}>
              <Text style={styles.sectionLabel}>POURQUOI ?</Text>
              <Text style={[styles.sectionText, { color: colors.textPrimary }]}>{selectedArticle.content.why}</Text>
            </View>

            <View style={styles.contentSection}>
              <Text style={styles.sectionLabel}>COMMENT ?</Text>
              <Text style={[styles.sectionText, { color: colors.textPrimary }]}>{selectedArticle.content.how}</Text>
            </View>

            {/* Action Links */}
            {selectedArticle.actionLinks.length > 0 && (
              <View style={[styles.actionLinksSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.actionLinksTitle, { color: colors.textSecondary }]}>PASSER À L'ACTION</Text>
                {selectedArticle.actionLinks.map((link, index) => (
                  <ActionLink
                    key={index}
                    screen={link.screen}
                    title={link.title}
                    subtitle={link.subtitle}
                  />
                ))}
              </View>
            )}

            {/* Références scientifiques */}
            <View style={[styles.referencesSection, { borderTopColor: colors.border }]}>
              <Text style={[styles.referencesTitle, { color: colors.textSecondary }]}>RÉFÉRENCES SCIENTIFIQUES</Text>
              {selectedArticle.references.map((ref) => (
                <View key={ref.id} style={styles.referenceItem}>
                  <Text style={[styles.referenceText, { color: colors.textSecondary }]}>
                    [{ref.id}] {ref.author} ({ref.year}). {ref.title}. <Text style={styles.referenceJournal}>{ref.journal}</Text>
                    {ref.volume && ` ${ref.volume}`}
                    {ref.pages && `: ${ref.pages}`}.
                  </Text>
                  {ref.doi && (
                    <View style={styles.doiRow}>
                      <Text style={[styles.doiLabel, { color: colors.textMuted }]}>DOI:</Text>
                      <Text style={styles.doiLink}>{ref.doi}</Text>
                    </View>
                  )}
                  {ref.pubmedId && (
                    <View style={styles.doiRow}>
                      <Text style={[styles.doiLabel, { color: colors.textMuted }]}>PubMed ID:</Text>
                      <Text style={styles.doiLink}>{ref.pubmedId}</Text>
                      <ExternalLink size={12} color="#3B82F6" />
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>LABO</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: colors.border, backgroundColor: colors.backgroundCard }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ARTICLES' && styles.tabActive]}
          onPress={() => setActiveTab('ARTICLES')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'ARTICLES' ? colors.textPrimary : colors.textMuted },
            ]}
          >
            ARTICLES
          </Text>
          {activeTab === 'ARTICLES' && <View style={[styles.tabIndicator, { backgroundColor: colors.accent }]} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'PROTOCOLES' && styles.tabActive]}
          onPress={() => setActiveTab('PROTOCOLES')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'PROTOCOLES' ? colors.textPrimary : colors.textMuted },
            ]}
          >
            PROTOCOLES
          </Text>
          {activeTab === 'PROTOCOLES' && <View style={[styles.tabIndicator, { backgroundColor: colors.accent }]} />}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'ARTICLES' ? (
          <>
            {/* Articles */}
            {LAB_ARTICLES.map((article) => renderArticleCard(article))}
          </>
        ) : (
          <>
            {/* Protocoles */}
            {LAB_PROTOCOLS.map((protocol) => (
              <ProtocolChecklist
                key={protocol.id}
                protocolId={protocol.id}
                title={protocol.title}
                categoryColor={protocol.categoryColor}
                items={protocol.items}
                references={protocol.references}
              />
            ))}

            {/* Échelle Hydratation */}
            <HydrationScale />
          </>
        )}

        {/* Badge de crédibilité scientifique */}
        <ScientificCredibilityBadge />
      </ScrollView>

      {/* Modal Article */}
      {renderArticleModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    // Active styling handled by indicator
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    // Dynamic color handled in render
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Article Card
  card: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  readTime: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  referencesCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3B82F6',
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalScroll: {
    flex: 1,
  },
  modalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  contentSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 24,
  },
  actionLinksSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionLinksTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  referencesSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  referencesTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  referenceItem: {
    marginBottom: 16,
  },
  referenceText: {
    fontSize: 12,
    lineHeight: 18,
  },
  referenceJournal: {
    fontStyle: 'italic',
  },
  doiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  doiLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  doiLink: {
    fontSize: 11,
    color: '#3B82F6',
  },
});
