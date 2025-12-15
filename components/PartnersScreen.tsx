import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  Image,
  Platform,
} from 'react-native';
import { X, Phone, MapPin, Globe, Instagram, ExternalLink, Award, Users, Sword, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PartnersScreenProps {
  visible: boolean;
  onClose: () => void;
}

// ============================================
// 🏯 CLUB & COACHS - NOUVELLE STRUCTURE
// ============================================

interface PartnerData {
  id: string;
  name: string;
  role: string;
  description: string;
  images: any[]; // Array of require() sources or { uri: string } for remote URLs
  location?: string;
  instagram?: string | string[]; // Instagram username(s) - can be single or array for multiple accounts
}

// ============================================
// 📸 IMAGES: Using remote placeholder URLs to prevent build errors
// ============================================
const partnersData: PartnerData[] = [
  {
    id: '1',
    name: "Fouad - Coach MMA & Prépa",
    role: "Expert Performance & International",
    description: "Ancien combattant Pro, Coach MMA et Personal Trainer avec une expérience internationale. Une double expertise rare : diplômé par le diplôme et par le terrain. N'hésitez pas à visiter son Instagram pour découvrir son travail.",
    images: [
      require('../assets/images/fouad.jpg'),
      require('../assets/images/fouad_action.jpg')
    ],
    location: "Marseille Fight Club (MFC)",
    instagram: 'fouad_loko'
  },
  {
    id: '2',
    name: "Gracie Barra Les Olives",
    role: "Académie & Famille - JJB",
    description: "Une académie, une famille. Dirigée par Venino Jr (Black Belt, multiple champion) et Mélissa (multiple championne). Le club dispose d'une section féminine dynamique. La porte est grande ouverte à tout le monde : n'hésitez pas à venir faire un cours d'essai !",
    images: [
      require('../assets/images/melissa_venimo.jpg')
    ],
    location: "52 Av. Frédéric Mistral, Marseille",
    instagram: ['veninjr', 'melissa_lcomb']
  },
  {
    id: '3',
    name: "Marseille Fight Club (MFC)",
    role: "Club de MMA",
    description: "Le club de référence à Marseille pour le MMA et le Striking. Une structure d'élite pour progresser.",
    images: [
      require('../assets/images/mfa_logo.png')
    ],
    location: "Marseille",
    instagram: 'fouad_loko' // MFC utilise le même Instagram que Fouad
  },
  {
    id: '4',
    name: "Younes - Kiné & Hijama",
    role: "Expert Médical & Pratiquant JJB",
    description: "Expert dans le domaine Kiné du Sport et Cupping (Hijama). Il connait les besoins des combattants car il est lui-même pratiquant de JJB. Le partenaire idéal pour la récupération.",
    images: [
      require('../assets/images/younes.jpg')
    ],
    location: "Cabinet Kiné Santé Sport",
    instagram: 'kinesantesport16'
  }
];

export function PartnersScreen({ visible, onClose }: PartnersScreenProps) {
  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleGPS = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const url = Platform.select({
      ios: `maps://maps.apple.com/?q=${encodedAddress}`,
      android: `geo:0,0?q=${encodedAddress}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleWeb = (url: string) => {
    Linking.openURL(`https://${url}`);
  };

  const handleInstagram = (username: string) => {
    Linking.openURL(`https://instagram.com/${username}`);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#2D3436" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.title}>Club & Coachs</Text>
          <View style={styles.headerIcon}>
            <Users size={24} color="#007AFF" strokeWidth={2.5} />
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Award size={20} color="#007AFF" strokeWidth={2.5} />
              </View>
              <Text style={styles.sectionTitle}>CLUB & COACHS</Text>
            </View>
          </View>

          {/* Partners Cards */}
          {partnersData.map((partner) => (
            <View key={partner.id} style={styles.partnerCard}>
              {/* Image Section - Support for multiple images */}
              {partner.images.length === 1 ? (
                <Image
                  source={partner.images[0]}
                  style={[styles.partnerImageSingle, { width: '100%', height: 250, borderRadius: 15 }]}
                  resizeMode="cover"
                />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.partnerImagesContainer}
                  contentContainerStyle={styles.partnerImagesContent}
                >
                  {partner.images.map((imageSource, imgIndex) => (
                    <Image
                      key={imgIndex}
                      source={imageSource}
                      style={[styles.partnerImageMultiple, { width: 300, height: 250, borderRadius: 15 }]}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
              )}

              {/* Content Section */}
              <View style={styles.partnerContent}>
                <Text style={styles.partnerName}>{partner.name}</Text>
                <Text style={styles.partnerRole}>{partner.role}</Text>
                <Text style={styles.partnerDescription} numberOfLines={0}>
                  {partner.description}
                </Text>
                {partner.location && (
                  <TouchableOpacity
                    style={styles.locationButton}
                    onPress={() => partner.location && handleGPS(partner.location)}
                    activeOpacity={0.7}
                  >
                    <MapPin size={16} color="#007AFF" strokeWidth={2.5} />
                    <Text style={styles.locationText}>{partner.location}</Text>
                  </TouchableOpacity>
                )}
                {/* Instagram Button(s) */}
                {partner.instagram && (
                  <View style={styles.instagramContainer}>
                    {Array.isArray(partner.instagram) ? (
                      partner.instagram.map((username, idx) => (
                  <TouchableOpacity
                          key={idx}
                          style={[styles.instagramButton, { backgroundColor: '#E3F2FD' }]}
                          onPress={() => handleInstagram(username)}
                    activeOpacity={0.7}
                  >
                          <Instagram size={16} color="#007AFF" strokeWidth={2.5} />
                          <Text style={[styles.instagramText, { color: '#007AFF' }]}>@{username}</Text>
                          <ExternalLink size={14} color="#007AFF" />
                  </TouchableOpacity>
                      ))
                    ) : (
                  <TouchableOpacity
                    style={[styles.instagramButton, { backgroundColor: '#E3F2FD' }]}
                        onPress={() => handleInstagram(partner.instagram as string)}
                    activeOpacity={0.7}
                  >
                    <Instagram size={16} color="#007AFF" strokeWidth={2.5} />
                        <Text style={[styles.instagramText, { color: '#007AFF' }]}>@{partner.instagram}</Text>
                        <ExternalLink size={14} color="#007AFF" />
                  </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              🏯 Réseau de confiance Yoroi - Partenaires certifiés
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8EDF2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D3436',
    letterSpacing: -0.3,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#636E72',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  // Partner Card
  partnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  partnerImageSingle: {
    width: '100%',
    height: 250,
    borderRadius: 15,
  },
  partnerImagesContainer: {
    maxHeight: 250,
  },
  partnerImagesContent: {
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  partnerImageMultiple: {
    width: 300,
    height: 250,
    borderRadius: 15,
    marginRight: 8,
  },
  partnerContent: {
    padding: 20,
  },
  partnerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 6,
  },
  partnerRole: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 12,
  },
  partnerDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#636E72',
    lineHeight: 22,
    marginBottom: 12,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    marginTop: 8,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
    flex: 1,
  },
  instagramContainer: {
    marginTop: 12,
    gap: 8,
  },
  instagramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
  },
  instagramText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // HQ Card
  hqCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  hqGradient: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  hqName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  hqSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  hqActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // Instructors Section
  instructorsSection: {
    gap: 16,
  },
  instructorsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 8,
  },
  couplePhotoContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  couplePhoto: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  couplePhotoPlaceholder: {
    height: 120,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    gap: 8,
  },
  couplePhotoSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0051D5',
  },
  instructorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 12,
  },
  instructorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructorEmoji: {
    fontSize: 32,
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3436',
    marginBottom: 4,
  },
  instructorRole: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 8,
  },
  instructorBio: {
    fontSize: 14,
    fontWeight: '500',
    color: '#636E72',
    lineHeight: 20,
    marginBottom: 12,
  },
  // Combat Card
  combatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  combatAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  combatEmoji: {
    fontSize: 32,
  },
  combatInfo: {
    flex: 1,
  },
  combatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  combatName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3436',
  },
  combatRole: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9500',
    marginBottom: 8,
  },
  combatBio: {
    fontSize: 14,
    fontWeight: '500',
    color: '#636E72',
    lineHeight: 20,
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  certifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#636E72',
  },

  // Care Card
  careCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  careAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  careEmoji: {
    fontSize: 32,
  },
  careInfo: {
    flex: 1,
  },
  careHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  careName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3436',
  },
  careRole: {
    fontSize: 14,
    fontWeight: '700',
    color: '#32ADE6',
    marginBottom: 8,
  },
  careBio: {
    fontSize: 14,
    fontWeight: '500',
    color: '#636E72',
    lineHeight: 20,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B2BEC3',
    textAlign: 'center',
  },
});
