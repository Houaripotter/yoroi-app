import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Plus,
  Edit3,
  Trash2,
  Building2,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import { getClubs, deleteClub, Club } from '@/lib/database';
import { getSportIcon, getSportColor, getSportName, getClubLogoSource } from '@/lib/sports';
import { useI18n } from '@/lib/I18nContext';
import { logger } from '@/lib/security/logger';
import { AddClubModal } from '@/components/planning/AddClubModal';

// ============================================
// GESTION DES CLUBS / SALLES
// ============================================

export default function ClubsScreen() {
  const { colors, gradients } = useTheme();
  const { t } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [showAddClubModal, setShowAddClubModal] = useState(false);
  const [editingClub, setEditingClub] = useState<Club | null>(null);

  const loadClubs = useCallback(async () => {
    try {
      const data = await getClubs();
      setClubs(data);
    } catch (error) {
      logger.error('Erreur chargement clubs:', error);
    }
  }, []);

  // Charger les clubs au montage
  useEffect(() => {
    loadClubs();
  }, []);

  const handleOpenAddClub = () => {
    setEditingClub(null);
    setShowAddClubModal(true);
  };

  const handleEditClub = (club: Club) => {
    setEditingClub(club);
    setShowAddClubModal(true);
  };

  const handleDelete = (club: Club) => {
    showPopup(
      t('screens.clubs.deleteClub'),
      t('screens.clubs.deleteConfirm', { name: club.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClub(club.id!);
              await loadClubs();
            } catch (error) {
              logger.error('Erreur suppression:', error);
              showPopup(t('common.error'), t('screens.clubs.deleteError'), [
                { text: t('common.ok'), style: 'primary' }
              ]);
            }
          },
        },
      ]
    );
  };

  const renderClubLogo = (club: Club, size: number = 50) => {
    const logoSource = club.logo_uri ? getClubLogoSource(club.logo_uri) : null;
    if (logoSource) {
      return (
        <Image
          source={logoSource}
          style={[styles.clubLogoImage, { width: size, height: size, borderRadius: size / 2 }]}
          resizeMode="cover"
        />
      );
    }
    return (
      <View
        style={[
          styles.clubIcon,
          {
            backgroundColor: club.color || getSportColor(club.sport),
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <MaterialCommunityIcons
          name={getSportIcon(club.sport) as any}
          size={size * 0.48}
          color="#FFFFFF"
        />
      </View>
    );
  };

  return (
    <ScreenWrapper noPadding>
      <Header
        title={t('screens.clubs.title')}
        showBack
        rightElement={
          <TouchableOpacity
            onPress={handleOpenAddClub}
            style={styles.addButton}
          >
            <Plus size={24} color={colors.gold} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* DESCRIPTION */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {t('screens.clubs.description')}
        </Text>

        {/* LISTE DES CLUBS */}
        {clubs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Building2 size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('screens.clubs.noClubs')}</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('screens.clubs.addFirstClub')}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleOpenAddClub}
            >
              <LinearGradient
                colors={gradients.gold}
                style={styles.emptyButtonGradient}
              >
                <Plus size={20} color={colors.textOnGold} />
                <Text style={[styles.emptyButtonText, { color: colors.textOnGold }]}>{t('screens.clubs.addClub')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Card>
        ) : (
          <View style={styles.clubsList}>
            {clubs.map((club) => (
              <Card key={club.id} style={styles.clubCard}>
                <View style={styles.clubRow}>
                  {renderClubLogo(club, 50)}

                  <View style={styles.clubInfo}>
                    <Text style={[styles.clubName, { color: colors.textPrimary }]}>{club.name}</Text>
                    <Text style={[styles.clubSport, { color: colors.textSecondary }]}>{getSportName(club.sport)}</Text>
                  </View>

                  <View style={styles.clubActions}>
                    <TouchableOpacity
                      onPress={() => handleEditClub(club)}
                      style={[styles.actionButton, { backgroundColor: colors.cardHover }]}
                    >
                      <Edit3 size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(club)}
                      style={[styles.actionButton, { backgroundColor: colors.cardHover }]}
                    >
                      <Trash2 size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODAL AJOUT/EDITION - Utilise le meme AddClubModal que planning */}
      <AddClubModal
        visible={showAddClubModal}
        editingClub={editingClub}
        onClose={() => {
          setShowAddClubModal(false);
          setEditingClub(null);
        }}
        onSave={() => {
          setShowAddClubModal(false);
          setEditingClub(null);
          loadClubs();
        }}
      />
      <PopupComponent />
    </ScreenWrapper>
  );
}

const RADIUS = { sm: 8, md: 12 };

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // HEADER
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },

  // EMPTY STATE
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // CLUBS LIST
  clubsList: {
    gap: 12,
  },
  clubCard: {
    padding: 0,
  },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  clubIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubLogoImage: {},
  clubInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '700',
  },
  clubSport: {
    fontSize: 13,
    marginTop: 2,
  },
  clubActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
});
