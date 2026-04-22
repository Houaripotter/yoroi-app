// ============================================
// SHARE STATS BUTTON
// Tap → ouvre un MODAL PREVIEW avec la carte affichée en grand.
// L'utilisateur voit ce qu'il va partager AVANT de confirmer.
// Boutons : Partager (partage réel) / Fermer.
// ============================================

import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator,
  Modal, Pressable, useWindowDimensions,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Share2, X } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { logger } from '@/lib/security/logger';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ShareStat {
  label: string;
  value: string;
  color: string;
}

interface ShareStatsButtonProps {
  title?: string;
  stats: ShareStat[];
  tagline?: string;
  accentColor?: string;
}

// Card contenu — extrait pour réutilisation dans preview + hidden capture
const ShareCard: React.FC<{
  title: string;
  stats: ShareStat[];
  tagline?: string;
  accent: string;
  dateStr: string;
  fullSize?: boolean;  // true pour la version 1080×1080, false pour preview fitté à l'écran
  scale?: number;       // pour scaling proportionnel
}> = ({ title, stats, tagline, accent, dateStr, fullSize = false, scale = 1 }) => {
  const size = fullSize ? 1080 : 320 * scale;
  const padding = fullSize ? 80 : 24;
  const logoSize = fullSize ? 64 : 40;
  const titleSize = fullSize ? 32 : 18;
  const dateSize = fullSize ? 18 : 11;
  const statValueSize = fullSize ? 64 : 30;
  const statLabelSize = fullSize ? 22 : 11;
  const taglineSize = fullSize ? 26 : 14;
  const footerSize = fullSize ? 18 : 10;
  const gridGap = fullSize ? 24 : 10;

  return (
    <View
      style={{
        width: size,
        height: size,
        padding,
        backgroundColor: '#0F172A',
        justifyContent: 'space-between',
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: fullSize ? 20 : 10 }}>
        <View style={{
          width: logoSize, height: logoSize, borderRadius: logoSize / 3.5,
          backgroundColor: accent, justifyContent: 'center', alignItems: 'center',
        }}>
          <Text style={{ color: '#FFFFFF', fontSize: logoSize * 0.56, fontWeight: '900' }}>Y</Text>
        </View>
        <View>
          <Text style={{ color: '#FFFFFF', fontSize: titleSize, fontWeight: '900', letterSpacing: -0.5 }}>
            {title}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: dateSize, fontWeight: '600', marginTop: 2 }}>
            {dateStr}
          </Text>
        </View>
      </View>

      {/* Grid 2×2 */}
      <View style={{
        flexDirection: 'row', flexWrap: 'wrap', gap: gridGap,
        marginVertical: fullSize ? 40 : 14, justifyContent: 'space-between',
      }}>
        {stats.slice(0, 4).map((s, i) => (
          <View
            key={i}
            style={{
              width: '47%',
              backgroundColor: 'rgba(255,255,255,0.06)',
              padding: fullSize ? 32 : 14,
              borderRadius: fullSize ? 24 : 14,
              minHeight: fullSize ? 200 : 92,
              justifyContent: 'center',
            }}
          >
            <Text style={{
              color: s.color, fontSize: statValueSize, fontWeight: '900',
              letterSpacing: -2, marginBottom: fullSize ? 8 : 3,
            }}>
              {s.value}
            </Text>
            <Text style={{
              color: 'rgba(255,255,255,0.7)', fontSize: statLabelSize, fontWeight: '700',
              textTransform: 'uppercase', letterSpacing: 1,
            }}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Tagline + branding */}
      <View>
        {tagline ? (
          <Text style={{
            color: 'rgba(255,255,255,0.85)', fontSize: taglineSize, fontWeight: '700',
            letterSpacing: -0.3, textAlign: 'center',
            marginBottom: fullSize ? 20 : 10,
          }}>
            {tagline}
          </Text>
        ) : null}
        <View style={{
          alignItems: 'center', paddingTop: fullSize ? 12 : 8,
          borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
        }}>
          <Text style={{
            color: 'rgba(255,255,255,0.4)', fontSize: footerSize, fontWeight: '700',
            letterSpacing: 1,
          }}>
            YOROI · Suivi sport personnel
          </Text>
        </View>
      </View>
    </View>
  );
};

const ShareStatsButtonInner: React.FC<ShareStatsButtonProps> = ({
  title = 'Mes stats Yoroi',
  stats,
  tagline,
  accentColor,
}) => {
  const { colors } = useTheme();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const viewShotRef = useRef<ViewShot>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const accent = accentColor || colors.accent || '#3B82F6';
  const dateStr = format(new Date(), 'd MMMM yyyy', { locale: fr });

  // La preview affiche la carte scalée pour tenir à l'écran (max 340px de large)
  const PREVIEW_WIDTH = Math.min(340, SCREEN_WIDTH - 48);
  const PREVIEW_SCALE = PREVIEW_WIDTH / 320;

  const handleOpenPreview = () => {
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    setPreviewOpen(true);
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error('Capture failed');
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        logger.warn('[ShareStats] Sharing not available');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Partager mes stats Yoroi',
        UTI: 'public.png',
      });
    } catch (e) {
      logger.error('[ShareStats] Erreur partage:', e);
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      {/* Bouton visible */}
      <TouchableOpacity
        onPress={handleOpenPreview}
        activeOpacity={0.85}
        style={[styles.button, { backgroundColor: accent }]}
        accessibilityRole="button"
        accessibilityLabel="Voir et partager mes stats"
      >
        <Share2 size={18} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.buttonText}>Voir et partager mes stats</Text>
      </TouchableOpacity>

      {/* Modal PREVIEW — l'utilisateur voit la carte avant de partager */}
      <Modal
        visible={previewOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPreviewOpen(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: '#1F2937' }]}
            onPress={() => { /* absorbe */ }}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Aperçu de ta carte</Text>
              <TouchableOpacity
                onPress={() => setPreviewOpen(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>

            {/* Preview scalée */}
            <View style={styles.previewWrap}>
              <View
                style={{
                  width: PREVIEW_WIDTH,
                  height: PREVIEW_WIDTH,
                  borderRadius: 16,
                  overflow: 'hidden',
                }}
              >
                <ShareCard
                  title={title}
                  stats={stats}
                  tagline={tagline}
                  accent={accent}
                  dateStr={dateStr}
                  fullSize={false}
                  scale={PREVIEW_SCALE}
                />
              </View>
            </View>

            <Text style={styles.modalHint}>
              Carte 1080×1080 parfaite pour Instagram, WhatsApp, etc.
            </Text>

            {/* Boutons action */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                onPress={() => setPreviewOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Fermer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: accent }]}
                onPress={handleShare}
                disabled={sharing}
                activeOpacity={0.85}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Share2 size={16} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Partager</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Vue cachée 1080×1080 pour ViewShot (capture en HD pour partage) */}
      <View style={styles.hiddenWrap} pointerEvents="none">
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1, result: 'tmpfile' }}
        >
          <ShareCard
            title={title}
            stats={stats}
            tagline={tagline}
            accent={accent}
            dateStr={dateStr}
            fullSize
          />
        </ViewShot>
      </View>
    </>
  );
};

export const ShareStatsButton = React.memo(ShareStatsButtonInner);

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Modal preview
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  previewWrap: {
    alignItems: 'center',
    marginVertical: 8,
  },
  modalHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  hiddenWrap: {
    position: 'absolute',
    top: -10000,
    left: 0,
    opacity: 0,
  },
});
