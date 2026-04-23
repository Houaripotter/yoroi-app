// ============================================
// PARTNER FACEOFF SHARE · Carte face-a-face shareable
// ============================================
// Compose une carte split screen MOI vs LUI, capture via react-native-view-shot
// et partage (Instagram Story / WhatsApp / Messages).
// ============================================

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Dimensions, Share, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2, X, User, Swords } from 'lucide-react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/lib/ThemeContext';
import { lightHaptic, successHaptic, errorHaptic } from '@/lib/haptics';
import logger from '@/lib/security/logger';
import { ARCHETYPE_META, type Archetype } from '@/lib/partnerModel';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.min(SCREEN_W - 32, 420);
const CARD_H = 560;

interface Props {
  partnerName: string;
  partnerPhotoUri?: string;
  partnerBelt?: string;
  partnerArchetype?: Archetype;
  partnerNickname?: string;
  myPhotoUri?: string;
  myName?: string;
  myBelt?: string;
  wins: number;
  losses: number;
  draws: number;
}

export const PartnerFaceoffShare: React.FC<Props> = ({
  partnerName, partnerPhotoUri, partnerBelt, partnerArchetype, partnerNickname,
  myPhotoUri, myName = 'MOI', myBelt,
  wins, losses, draws,
}) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const shotRef = useRef<ViewShot | null>(null);

  const total = wins + losses + draws;
  const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : null;

  const archMeta = partnerArchetype ? ARCHETYPE_META[partnerArchetype] : null;
  const archColor = archMeta?.color || '#D4AF37';

  const openModal = () => {
    lightHaptic().catch(() => {});
    setOpen(true);
  };

  const captureAndShare = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const uri = await captureRef(shotRef, { format: 'png', quality: 1.0, result: 'tmpfile' });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Face-a-face Yoroi' });
      } else {
        await Share.share({ url: uri, title: 'Face-a-face Yoroi' });
      }
      successHaptic().catch(() => {});
    } catch (e) {
      logger.warn('[Faceoff] erreur capture', e);
      errorHaptic().catch(() => {});
      Alert.alert('Erreur', 'Impossible de generer l\'image.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={openModal}
        activeOpacity={0.85}
        style={[styles.trigger, { backgroundColor: archColor + '20', borderColor: archColor + '50' }]}
      >
        <Swords size={16} color={archColor} />
        <Text style={[styles.triggerText, { color: archColor }]}>Face-a-face shareable</Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <X size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Face-a-face</Text>
            <View style={{ width: 26 }} />
          </View>

          <View style={styles.modalBody}>
            <ViewShot ref={shotRef} style={{ width: CARD_W, height: CARD_H }}>
              <LinearGradient
                colors={['#1a1a2e', '#0f0f1a']}
                style={StyleSheet.absoluteFill}
              />
              {/* Split diagonal */}
              <View style={{ flexDirection: 'row', flex: 1 }}>
                <View style={styles.side}>
                  <LinearGradient
                    colors={['#22C55E40', 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.photoBox}>
                    {myPhotoUri ? (
                      <Image source={{ uri: myPhotoUri }} style={styles.photo} resizeMode="cover" />
                    ) : (
                      <View style={[styles.photoPlaceholder, { backgroundColor: 'rgba(34,197,94,0.2)' }]}>
                        <User size={64} color="#22C55E" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.sideLabel}>MOI</Text>
                  <Text style={styles.sideName} numberOfLines={1}>{myName.toUpperCase()}</Text>
                  {myBelt ? <Text style={styles.sideBelt}>{myBelt.toUpperCase()}</Text> : null}
                </View>

                <View style={styles.vsDivider}>
                  <View style={styles.vsCircle}>
                    <Text style={styles.vsText}>VS</Text>
                  </View>
                </View>

                <View style={styles.side}>
                  <LinearGradient
                    colors={[archColor + '40', 'transparent']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.photoBox}>
                    {partnerPhotoUri ? (
                      <Image source={{ uri: partnerPhotoUri }} style={styles.photo} resizeMode="cover" />
                    ) : (
                      <View style={[styles.photoPlaceholder, { backgroundColor: archColor + '33' }]}>
                        <User size={64} color={archColor} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.sideLabel}>LUI</Text>
                  <Text style={styles.sideName} numberOfLines={1}>{partnerName.toUpperCase()}</Text>
                  {partnerBelt ? <Text style={styles.sideBelt}>{partnerBelt.toUpperCase()}</Text> : null}
                </View>
              </View>

              {/* Bas : stats */}
              <View style={styles.statsBar}>
                {partnerNickname ? (
                  <Text style={styles.nickLine} numberOfLines={1}>« {partnerNickname} »</Text>
                ) : null}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNum}>{wins}</Text>
                    <Text style={styles.statLbl}>VICTOIRES</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNum}>{losses}</Text>
                    <Text style={styles.statLbl}>DEFAITES</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNum}>{total}</Text>
                    <Text style={styles.statLbl}>ROUNDS</Text>
                  </View>
                  {winrate != null && (
                    <View style={styles.statItem}>
                      <Text style={[styles.statNum, { color: winrate >= 50 ? '#22C55E' : '#EF4444' }]}>{winrate}%</Text>
                      <Text style={styles.statLbl}>WINRATE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.brand}>YOROI</Text>
              </View>
            </ViewShot>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={captureAndShare}
              disabled={exporting}
              style={[styles.shareBtn, { backgroundColor: archColor, opacity: exporting ? 0.5 : 1 }]}
            >
              <Share2 size={18} color="#1a1a2e" />
              <Text style={styles.shareBtnText}>
                {exporting ? 'Generation...' : 'Partager l\'image'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
  },
  triggerText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  modalWrap: { flex: 1, backgroundColor: '#0a0a0f' },
  modalHeader: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  modalBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  side: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    overflow: 'hidden',
  },
  photoBox: {
    width: 130, height: 130,
    borderRadius: 65,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  sideLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10, fontWeight: '900', letterSpacing: 3,
    marginTop: 12,
  },
  sideName: {
    color: '#fff',
    fontSize: 22, fontWeight: '900',
    marginTop: 4,
    letterSpacing: -0.5,
    paddingHorizontal: 8,
  },
  sideBelt: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11, fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  vsDivider: {
    position: 'absolute',
    top: 0, bottom: 0, left: '50%',
    marginLeft: -30,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  vsCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#D4AF37',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#1a1a2e',
  },
  vsText: { color: '#1a1a2e', fontWeight: '900', fontSize: 18, letterSpacing: 1 },
  statsBar: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  nickLine: {
    color: '#D4AF37',
    fontSize: 12, fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  statsRow: { flexDirection: 'row' },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 20, fontWeight: '900' },
  statLbl: { color: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 },
  brand: {
    color: '#D4AF37',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 12,
  },
  modalFooter: { padding: 16, paddingBottom: 32 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  shareBtnText: { color: '#1a1a2e', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
});

export default PartnerFaceoffShare;
