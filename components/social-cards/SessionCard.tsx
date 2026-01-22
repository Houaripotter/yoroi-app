// ============================================
// SESSION CARD COMPONENT - V12 ULTRA PREMIUM
// ============================================
import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Training } from '@/lib/database';
import { getClubLogoSource, getSportIcon, getSportName } from '@/lib/sports';
import { SocialCardFooter } from '@/components/social-cards/SocialCardBranding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_WIDTH = SCREEN_WIDTH - 40;
const GOLD_COLOR = '#D4AF37';

interface SessionCardProps {
  training: Partial<Training>;
  backgroundImage?: string | null;
  backgroundType?: 'photo' | 'black' | 'white';
  customLocation?: string;
  isLandscape?: boolean;
  width?: number;
  userAvatar?: any;
  profilePhoto?: string | null;
  userName?: string;
  rank?: string;
  showDate?: boolean;
  showYearlyCount?: boolean;
  showMonthlyCount?: boolean;
  showWeeklyCount?: boolean;
  showGoalProgress?: boolean;
  showClub?: boolean;
  showLieu?: boolean;
  showExercises?: boolean;
  showStats?: boolean;
  yearlyCount?: number;
  monthlyCount?: number;
  weeklyCount?: number;
  yearlyObjective?: number;
  sessionsPerWeek?: number;
  options?: { 
    label: string, 
    icon?: string, 
    color?: string, 
    weight?: string, 
    reps?: string,
    distance?: string,
    duration?: string,
    speed?: string,
    pente?: string,
    calories?: string,
    watts?: string,
    resistance?: string,
    stairs?: string
  }[];
}

export const SessionCard = React.forwardRef<View, SessionCardProps>(
  ({ 
    training, backgroundImage, backgroundType = 'black', width = DEFAULT_WIDTH,
    userAvatar, profilePhoto, rank, options,
    showYearlyCount = true,
    yearlyCount = 0, yearlyObjective = 365,
    showGoalProgress = true
  }, ref) => {
    
    const CARD_HEIGHT = width * (16 / 9);
    const dateObj = training.date ? new Date(training.date) : new Date();
    const formattedDate = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).toUpperCase();

    const sportNameStr = training.sport?.split(',').map(s => getSportName(s)).join(' + ') || 'SÉANCE';
    const clubLogoSource = training.club_logo ? getClubLogoSource(training.club_logo) : null;
    
    // Calcul Progression
    const safeObjective = yearlyObjective && yearlyObjective > 0 ? yearlyObjective : 365;
    const progressPercent = Math.min(100, (yearlyCount / safeObjective) * 100);

    const isWhite = backgroundType === 'white';
    const bg = isWhite ? '#FFFFFF' : '#000000';
    const txt = isWhite ? '#000000' : '#FFFFFF';
    const subTxt = isWhite ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)';
    const borderColor = isWhite ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';

    // Source pour l'avatar (gère require et uri)
    const avatarSource = typeof userAvatar === 'string' ? { uri: userAvatar } : userAvatar;
    const profileSource = profilePhoto ? { uri: profilePhoto } : null;

    // Helper Allure
    const getPace = (speedStr?: string) => {
      const s = parseFloat((speedStr || '0').replace(',', '.'));
      if (s > 0) {
        const paceDecimal = 60 / s;
        const mins = Math.floor(paceDecimal);
        const secs = Math.round((paceDecimal - mins) * 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }
      return null;
    };

    return (
      <View ref={ref} style={[styles.card, { width, height: CARD_HEIGHT, backgroundColor: bg }]} collapsable={false}>
        
        {/* 1. SECTION PHOTO (HAUT - 55%) */}
        <View style={{ height: '55%', width: '100%', backgroundColor: '#111' }}>
          {backgroundImage ? (
            <Image 
              source={{ uri: backgroundImage }} 
              style={{ width: '100%', height: '100%' }} 
              resizeMode="cover" 
            />
          ) : (
            <LinearGradient colors={['#1a1a1a', '#000']} style={{ flex: 1 }} />
          )}
          
          {/* OVERLAY INFOS HAUT */}
          <LinearGradient
            colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.85)']}
            style={StyleSheet.absoluteFill}
          >
            <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              
              {/* GAUCHE : PHOTO PROFIL + RANG */}
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: GOLD_COLOR, overflow: 'hidden', backgroundColor: '#FFF' }}>
                  {profileSource ? (
                    <Image source={profileSource} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }}>
                      <MaterialCommunityIcons name="account" size={30} color="#000" />
                    </View>
                  )}
                </View>
                {rank && (
                  <View style={{ backgroundColor: GOLD_COLOR, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: -10 }}>
                    <Text style={{ color: '#000', fontSize: 8, fontWeight: '900' }}>{rank.toUpperCase()}</Text>
                  </View>
                )}
              </View>

              {/* DROITE : AVATAR YOROI */}
              {userAvatar && (
                <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: GOLD_COLOR, overflow: 'hidden', backgroundColor: '#FFF' }}>
                  <Image source={avatarSource} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                </View>
              )}
            </View>
          </LinearGradient>

          {/* TITRE DU SPORT + CLUB EN BAS DE PHOTO */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }}>
            <Text style={{ color: GOLD_COLOR, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 4 }}>{formattedDate}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {clubLogoSource && (
                <View style={{ padding: 2, backgroundColor: '#FFF', borderRadius: 4 }}>
                  <Image source={clubLogoSource} style={{ width: 24, height: 24 }} resizeMode="contain" />
                </View>
              )}
              <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '900' }}>
                {training.club_name?.toUpperCase() || (training.is_outdoor ? 'PLEIN AIR' : 'SÉANCE INDIVIDUELLE')}
              </Text>
            </View>

            <Text style={{ color: '#FFF', fontSize: 32, fontWeight: '900', marginTop: 4, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 10 }}>
              {sportNameStr.toUpperCase()}
            </Text>
          </View>

          {/* Badge Durée flottant */}
          <View style={{ position: 'absolute', bottom: 20, right: 20, backgroundColor: GOLD_COLOR, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10 }}>
            {(() => {
              const h = Math.floor((training.duration_minutes || 0) / 60);
              const m = (training.duration_minutes || 0) % 60;
              return <Text style={{ color: '#000', fontWeight: '900', fontSize: 14 }}>{h > 0 ? `${h}H ${m > 0 ? m : ''}` : `${m} MIN`}</Text>;
            })()}
          </View>
        </View>

        {/* 2. SECTION STATS & EXERCICES (MILIEU - 30%) */}
        <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: 'center', gap: 15 }}>
          
          {/* CHIFFRES CLÉS & PROGRESSION */}
          {showYearlyCount && (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                <View>
                  <Text style={{ color: GOLD_COLOR, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }}>OBJECTIF ANNUEL {new Date().getFullYear()}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Text style={{ color: GOLD_COLOR, fontSize: 36, fontWeight: '900' }}>{yearlyCount}</Text>
                    <Text style={{ color: txt, fontSize: 16, fontWeight: '800' }}>/ {safeObjective} JOURS</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: txt, fontSize: 28, fontWeight: '900' }}>{Math.round(progressPercent)}%</Text>
                  <Text style={{ color: subTxt, fontSize: 8, fontWeight: '800' }}>COMPLÉTÉ</Text>
                </View>
              </View>
              
              {showGoalProgress && (
                <View style={{ width: '100%', height: 12, backgroundColor: isWhite ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)' }}>
                  <LinearGradient 
                    colors={[GOLD_COLOR, '#F59E0B']} 
                    start={{x:0, y:0}} end={{x:1, y:0}}
                    style={{ height: '100%', width: `${progressPercent}%` }} 
                  />
                </View>
              )}
            </View>
          )}

          {/* LISTE DES EXERCICES */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ height: 1, flex: 1, backgroundColor: GOLD_COLOR, opacity: 0.4 }} />
              <Text style={{ color: GOLD_COLOR, fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>TRAVAIL EFFECTUÉ</Text>
              <View style={{ height: 1, flex: 1, backgroundColor: GOLD_COLOR, opacity: 0.4 }} />
            </View>

            <View style={{ gap: 8 }}>
              {options && options.length > 0 ? (
                options.slice(0, 5).map((opt, i) => {
                  const pace = getPace(opt.speed);
                  return (
                    <View key={i} style={{ borderBottomWidth: 0.5, borderBottomColor: borderColor, paddingBottom: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: txt, fontSize: 13, fontWeight: '800', flex: 1 }} numberOfLines={1}>
                          {opt.label.toUpperCase()}
                        </Text>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {/* Force */}
                          {opt.weight && <Text style={{ color: GOLD_COLOR, fontSize: 14, fontWeight: '900' }}>{opt.weight}kg</Text>}
                          {opt.reps && <Text style={{ color: txt, fontSize: 14, fontWeight: '900' }}>x{opt.reps}</Text>}
                          
                          {/* Cardio complet */}
                          {opt.distance && <Text style={{ color: GOLD_COLOR, fontSize: 14, fontWeight: '900' }}>{opt.distance}km</Text>}
                          {opt.speed && <Text style={{ color: txt, fontSize: 12, fontWeight: '700' }}>{opt.speed}km/h</Text>}
                          {pace && <Text style={{ color: subTxt, fontSize: 10 }}>({pace})</Text>}
                          {opt.pente && <Text style={{ color: txt, fontSize: 12 }}>{opt.pente}%</Text>}
                          
                          {/* Marches */}
                          {opt.stairs && <Text style={{ color: GOLD_COLOR, fontSize: 14, fontWeight: '900' }}>{opt.stairs} etages</Text>}
                          
                          {/* Énergie */}
                          {opt.calories && <Text style={{ color: GOLD_COLOR, fontSize: 14, fontWeight: '900' }}>{opt.calories} kcal</Text>}
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={{ color: subTxt, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 10 }}>
                  {training.notes || 'SÉANCE VALIDÉE AVEC SUCCÈS'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* 3. FOOTER PUBLICITAIRE (BAS - 12%) */}
        <View style={{ height: '12%', borderTopWidth: 1, borderTopColor: isWhite ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)', paddingHorizontal: 20, justifyContent: 'center' }}>
          <SocialCardFooter variant={isWhite ? "light" : "dark"} />
        </View>

      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: { borderRadius: 32, overflow: 'hidden' },
});