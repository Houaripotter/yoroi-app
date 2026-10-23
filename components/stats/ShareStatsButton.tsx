// ============================================
// SHARE STATS BUTTON (refonte v2)
// Appui : ouvre un apercu de la carte en grand.
// L'utilisateur voit ce qu'il va partager AVANT de confirmer.
// API inchangee.
// ============================================

import React, { useRef, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Modal, Pressable, Share, useWindowDimensions } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { logger } from '@/lib/security/logger';
import { format } from 'date-fns';
import { DATE_FNS_LOCALE as fr } from '@/lib/i18n/dateLocale';
import { fontStyle } from '@/components/yoroi/fonts';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';
import { SignatureCarte } from '@/components/yoroi/v2/partage/SignatureCarte';
import { signaturePartage } from '@/constants/partage';
import { noterPartage } from '@/lib/v2/partage/mesure';

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

export type ShareFormat = '1:1' | '9:16';

// Couleurs fixes de la carte partagee (image exportee, independante du theme)
const CARD = {
  paper: '#F2F1EC',
  ink: '#1D2029',
  ink2: '#4A4E5A',
  muted: '#8B8D96',
  line: '#E2DFD8',
  red: '#B0282E',
  gold: '#C59D45',
  goldLight: '#E3C47B',
  white: '#FFFFFF',
};
const STAT_COLORS = [CARD.ink, '#2C4A84', '#6E8C3A', '#A8832F'];

function ShareIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Plate({ size }: { size: number }) {
  // vague 47 : pastille ronde cochee a la place de la plaque kozane
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26">
      <Circle cx={13} cy={13} r={12} fill={CARD.ink} />
      <Path d="M7.6 13.4 L11.3 17 L18.4 9.6" stroke={CARD.goldLight} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// Contenu de la carte, reutilise pour l'apercu et la capture cachee
const ShareCard: React.FC<{
  title: string;
  stats: ShareStat[];
  tagline?: string;
  accent: string;
  dateStr: string;
  fullSize?: boolean;
  scale?: number;
  format?: ShareFormat;
}> = ({ title, stats, tagline, dateStr, fullSize = false, scale = 1, format = '1:1' }) => {
  const isVertical = format === '9:16';
  const previewWidth = 320 * scale;
  const previewHeight = isVertical ? ((320 * 16) / 9) * scale : previewWidth;
  const width = fullSize ? 1080 : previewWidth;
  const height = fullSize ? (isVertical ? 1920 : 1080) : previewHeight;
  const k = width / 320; // facteur d'echelle unique

  const black = fontStyle('black');
  const bold = fontStyle('bold');

  return (
    <View style={{ width, height, padding: 22 * k, backgroundColor: CARD.paper, justifyContent: 'space-between', overflow: 'hidden' }}>
      {/* Filigrane */}
      <Glyph kind="sakura" size={180 * k} color="#E6E3DA" style={{ position: 'absolute', right: -30 * k, top: -24 * k }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 * k }}>
        <Plate size={22 * k} />
        <View style={{ flex: 1 }}>
          <Text style={[black, { color: CARD.ink, fontSize: 20 * k, letterSpacing: -0.9 * k }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[bold, { color: CARD.ink2, fontSize: 11 * k, marginTop: 2 * k }]}>{dateStr}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 * k, marginVertical: 12 * k }}>
        {stats.slice(0, 4).map((s, i) => (
          <View
            key={i}
            style={{
              width: '48%',
              backgroundColor: 'rgba(255,255,255,0.88)',
              borderWidth: 1,
              borderColor: CARD.white,
              padding: 14 * k,
              borderRadius: 18 * k,
              minHeight: (isVertical ? 120 : 88) * k,
              justifyContent: 'center',
            }}
          >
            <Text style={[black, { color: STAT_COLORS[i % STAT_COLORS.length], fontSize: 30 * k, letterSpacing: -1.4 * k }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {s.value}
            </Text>
            <Text style={[bold, { color: CARD.ink2, fontSize: 11 * k, marginTop: 3 * k }]} numberOfLines={2}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      <View>
        {tagline ? (
          <Text style={[black, { color: CARD.ink, fontSize: 15 * k, letterSpacing: -0.5 * k, textAlign: 'center', marginBottom: 10 * k }]}>{tagline}</Text>
        ) : null}
        <View style={{ height: 3 * k, backgroundColor: CARD.goldLight, borderRadius: 2 * k, marginHorizontal: 40 * k, marginBottom: 8 * k }} />
        <SignatureCarte size={10 * k} color={CARD.muted} align="center" />
      </View>
    </View>
  );
};

const ShareStatsButtonInner: React.FC<ShareStatsButtonProps> = ({ title = 'Mes stats Yoroi', stats, tagline, accentColor }) => {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const viewShotSquareRef = useRef<ViewShot>(null);
  const viewShotStoryRef = useRef<ViewShot>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareFormat, setShareFormat] = useState<ShareFormat>('1:1');
  const accent = accentColor || c.accent;
  const dateStr = format(new Date(), 'd MMMM yyyy', { locale: fr });

  // L'apercu tient a l'ecran ; en story on limite la hauteur
  const maxW = Math.min(340, SCREEN_WIDTH - 72);
  const PREVIEW_WIDTH = shareFormat === '9:16' ? Math.min(maxW, 230) : maxW;
  const PREVIEW_SCALE = PREVIEW_WIDTH / 320;
  const PREVIEW_HEIGHT = shareFormat === '9:16' ? (PREVIEW_WIDTH * 16) / 9 : PREVIEW_WIDTH;

  const handleOpenPreview = () => {
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    setPreviewOpen(true);
  };

  const handleShare = async () => {
    if (sharing) return;
    noterPartage('stats_seances');
    setSharing(true);
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const targetRef = shareFormat === '9:16' ? viewShotStoryRef : viewShotSquareRef;
      const uri = await targetRef.current?.capture?.();
      if (!uri) throw new Error('Capture failed');
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        const res = await Share.share({ url: uri, message: signaturePartage() });
        if (res.action === Share.sharedAction) noterPartage('stats_seances', true);
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
      <Pressable
        onPress={handleOpenPreview}
        style={({ pressed }) => [styles.button, { backgroundColor: c.surface, borderColor: c.divider, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        accessibilityRole="button"
        accessibilityLabel="Voir et partager mes stats"
      >
        <View style={[styles.buttonIcon, { backgroundColor: accent }]}>
          <ShareIcon color="#FFFFFF" size={18} />
        </View>
        <Ink size={16} weight="extraBold" style={{ flex: 1 }}>
          Voir et partager mes stats
        </Ink>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path d="M9 5l7 7-7 7" stroke={c.textMuted} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>

      <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPreviewOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: c.background, borderColor: '#FFFFFF' }]} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Ink size={22} weight="black" tight>
                Aperçu de ta carte
              </Ink>
              <Pressable
                onPress={() => setPreviewOpen(false)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                style={[styles.close, { backgroundColor: c.surface, borderColor: c.divider }]}
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 6l12 12M18 6L6 18" stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" />
                </Svg>
              </Pressable>
            </View>

            <View style={[styles.segment, { backgroundColor: c.fillSoft }]}>
              {(['1:1', '9:16'] as ShareFormat[]).map((f) => {
                const active = shareFormat === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => {
                      if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
                      setShareFormat(f);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.segmentItem, active && { backgroundColor: c.surface, shadowColor: c.shadow }]}
                  >
                    <Ink size={14} weight={active ? 'extraBold' : 'bold'} color={active ? c.ink : c.textSecondary}>
                      {f === '1:1' ? 'Carré' : 'Story'}
                    </Ink>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.previewWrap}>
              <View style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: c.border }}>
                <ShareCard title={title} stats={stats} tagline={tagline} accent={accent} dateStr={dateStr} fullSize={false} scale={PREVIEW_SCALE} format={shareFormat} />
              </View>
            </View>

            <Ink size={13} weight="bold" color={c.textMuted} style={styles.modalHint}>
              {shareFormat === '1:1' ? 'Format carré, idéal pour Instagram et WhatsApp' : 'Format vertical, idéal pour les stories'}
            </Ink>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setPreviewOpen(false)} accessibilityRole="button" style={[styles.actionBtn, { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }]}>
                <Ink size={15} weight="bold" color={c.textSecondary}>
                  Fermer
                </Ink>
              </Pressable>
              <Pressable
                onPress={handleShare}
                disabled={sharing}
                accessibilityRole="button"
                accessibilityLabel="Partager"
                style={({ pressed }) => [styles.actionBtn, { backgroundColor: pressed ? c.accentPressed : c.accent }]}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <ShareIcon color="#FFFFFF" size={17} />
                    <Ink size={15} weight="extraBold" color="#FFFFFF">
                      Partager
                    </Ink>
                  </>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Vue cachee 1080x1080 (carre) */}
      <View style={styles.hiddenWrap} pointerEvents="none">
        <ViewShot ref={viewShotSquareRef} options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
          <ShareCard title={title} stats={stats} tagline={tagline} accent={accent} dateStr={dateStr} fullSize format="1:1" />
        </ViewShot>
      </View>

      {/* Vue cachee 1080x1920 (story) */}
      <View style={styles.hiddenWrap} pointerEvents="none">
        <ViewShot ref={viewShotStoryRef} options={{ format: 'png', quality: 1, result: 'tmpfile' }}>
          <ShareCard title={title} stats={stats} tagline={tagline} accent={accent} dateStr={dateStr} fullSize format="9:16" />
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
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  buttonIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(29,32,41,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 30,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#1D2029',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    marginBottom: 12,
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  previewWrap: {
    alignItems: 'center',
    marginVertical: 6,
  },
  modalHint: {
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
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
    minHeight: 54,
    borderRadius: 18,
  },
  hiddenWrap: {
    position: 'absolute',
    top: -10000,
    left: 0,
    opacity: 0,
  },
});
