/**
 * Partage de la séance (refonte v2) : carte « Ma séance » en 9:16, habillage papier, laque ou photo,
 * choix de ce qui s'affiche, partage en image. La lecture des données reste celle d'origine.
 */
import React, { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getMethodDisplayName } from '@/components/BJJBodyMap';
import { getTrainings, Training, getClubs, getProfile, calculateStreak } from '@/lib/database';
import { useAvatar } from '@/lib/AvatarContext';
import { RANKS as RANGS_ANCIENS, getCurrentRank, rankToLevel } from '@/lib/ranks';
import { rangNom } from '@/lib/v2/dojo/univers';
import { getUnifiedPoints } from '@/lib/gamification';
import logger from '@/lib/security/logger';
import { SessionCard, CombatRoundData } from '@/components/social-cards/SessionCard';
import { parseExercisesFromNotes } from '@/lib/exerciseParser';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card, P, Pill, tap } from '@/components/yoroi/v2/accueil/kit';
import { ShareStudio } from '@/components/yoroi/v2/partage/ShareStudio';
import { Stamp, cardWidthFor, paletteOf } from '@/components/yoroi/v2/partage/cardKit';
import { useStudio } from '@/lib/v2/partage/useStudio';

export default function LastSessionScreen() {
  const { avatarImage: contextAvatar } = useAvatar();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const CARD_WIDTH = cardWidthFor(SCREEN_WIDTH);
  const params = useLocalSearchParams<{ id?: string }>();
  const studio = useStudio({ dialogTitle: 'Partager ma séance', source: 'derniere_seance' });

  // Pont avec la lecture d'origine : la photo de profil devient le fond par defaut
  const setBackgroundImage = (uri?: string) => { if (uri) studio.setPhoto(uri); };
  const setBackgroundType = (t: 'photo' | 'black' | 'white') => { studio.setStyleRaw(t === 'photo' ? 'photo' : t === 'white' ? 'papier' : 'laque'); };

  const [lastTraining, setLastTraining] = useState<Training | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [customLocation] = useState<string>('');
  const [userName, setUserName] = useState<string>('Champion');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<any>(null);
  const [userRank, setUserRank] = useState<string>(() => rangNom(0));
  const [userLevel, setUserLevel] = useState<number>(1);
  const [optionDetails, setOptionDetails] = useState<any[]>([]);
  const [combatRoundsData, setCombatRoundsData] = useState<CombatRoundData[] | undefined>(undefined);
  const [combatCelebration, setCombatCelebration] = useState<{ visible: boolean; title: string; subtitle: string } | null>(null);

  // Ce qui s'affiche sur la carte
  const [showDate, setShowDate] = useState(true);
  const [showYearlyCount, setShowYearlyCount] = useState(true);
  const [showClub, setShowClub] = useState(true);
  const [showLieu, setShowLieu] = useState(true);
  const [showExercises, setShowExercises] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [yearlyCount, setYearlyCount] = useState(0);
  const [monthlyCount] = useState(0);
  const [weeklyCount] = useState(0);
  const [yearlyObjective, setYearlyObjective] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [trainings, clubs, profile, streak] = await Promise.all([
          getTrainings(),
          getClubs(),
          getProfile(),
          calculateStreak(),
        ]);

        if (profile) {
          setUserName(profile.name || 'Champion');
          // Level is derived from rank (XP-based)
          if (profile.profile_photo) {
            setUserPhoto(profile.profile_photo);
            setBackgroundImage(profile.profile_photo);
            setBackgroundType('photo');
          }
        }

        // Avatar via context
        if (contextAvatar) {
          setUserAvatar(contextAvatar);
        }

        // Charger le rang (base sur les XP totaux)
        const totalPoints = await getUnifiedPoints();
        const rank = getCurrentRank(totalPoints);
        // Vague 45 : nom du rang dans l'univers choisi
        setUserRank(rangNom(Math.max(0, RANGS_ANCIENS.findIndex((r) => r.id === rank.id))));
        setUserLevel(rankToLevel(rank));

        let currentTraining: Training | null = null;
        if (trainings.length > 0) {
          if (params.id) {
            currentTraining = trainings.find(t => t.id === parseInt(params.id!)) || null;
          } else {
            currentTraining = trainings[0];
          }
          setLastTraining(currentTraining);

          if (currentTraining) {
            let parsedOptions: any[] = [];

            // 1. Exercices structurés de la DB (priorité : données complètes avec séries)
            if (currentTraining.exercises && currentTraining.exercises.length > 0) {
              parsedOptions = currentTraining.exercises.flatMap((ex: any) => {
                // Si on a les séries détaillées, afficher chaque série
                if (Array.isArray(ex.setsData) && ex.setsData.length > 0) {
                  return ex.setsData.map((set: any, i: number) => ({
                    label: i === 0 ? (ex.name ?? 'Exercice') : '',
                    weight: (set.weight ?? 0) > 0 ? set.weight.toString() : undefined,
                    reps: (set.reps ?? 0) > 0 ? set.reps.toString() : undefined,
                  }));
                }
                return [{
                  label: ex.name ?? 'Exercice',
                  weight: (ex.weight ?? 0) > 0 ? ex.weight.toString() : undefined,
                  reps: (ex.reps ?? 0) > 0 ? ex.reps.toString() : undefined,
                  sets: (ex.sets ?? 0) > 1 ? ex.sets.toString() : undefined,
                  distance: ex.distance ? ex.distance.toString() : undefined,
                  calories: ex.calories ? ex.calories.toString() : undefined,
                  pace: ex.pace || undefined,
                  stairs: ex.stairs ? ex.stairs.toString() : undefined,
                }];
              });
            }

            // 2. Fallback : parser les notes texte (si aucun exercice en DB)
            if (parsedOptions.length === 0 && currentTraining.notes) {
              parsedOptions = parseExercisesFromNotes(currentTraining.notes);
            }

            // 3. Pour les sports de combat : parser les combat_rounds si aucun exercice
            if (parsedOptions.length === 0 && (currentTraining as any).combat_rounds) {
              try {
                const rawRounds = (currentTraining as any).combat_rounds;
                const rounds = typeof rawRounds === 'string' ? JSON.parse(rawRounds) : rawRounds;
                if (Array.isArray(rounds) && rounds.length > 0) {
                  const rows: typeof parsedOptions = [];
                  const nb = rounds.length;
                  // Seuils d'affichage :
                  // 1-2 rounds → détail complet
                  // 3 rounds   → sans notes de round
                  // 4+ rounds  → 1 ligne compacte par round + bilan
                  const mode: 'full' | 'medium' | 'compact' =
                    nb <= 2 ? 'full' : nb === 3 ? 'medium' : 'compact';

                  rounds.forEach((r: any) => {
                    const resultEmoji = r.result === 'win' ? 'V' : r.result === 'loss' ? 'D' : r.result === 'draw' ? 'N' : '';
                    const resultLabel = r.result === 'win' ? 'V' : r.result === 'loss' ? 'D' : r.result === 'draw' ? 'N' : '';
                    const partner = r.partner ? ` vs ${r.partner}` : '';

                    if (mode === 'compact') {
                      // ── Mode compact : 1 ligne header + 1 ligne techniques ──
                      const scorePart = (r.pointsFor ?? 0) > 0 || (r.pointsAgainst ?? 0) > 0
                        ? `${r.pointsFor ?? 0}-${r.pointsAgainst ?? 0}pts` : '';
                      const givenSub = Array.isArray(r.methodsGiven) && r.methodsGiven.length > 0
                        ? `donné ${getMethodDisplayName(r.methodsGiven[0])}` : '';
                      const takenSub = Array.isArray(r.methodsTaken) && r.methodsTaken.length > 0
                        ? `subi ${getMethodDisplayName(r.methodsTaken[0])}` : '';
                      const rightParts = [resultEmoji ? `${resultEmoji}${resultLabel}` : '', scorePart, givenSub, takenSub].filter(Boolean);
                      rows.push({ label: `R${r.number}${partner}`, pace: rightParts.join(' ') || undefined });
                      // Techniques utilisées (condensé)
                      const techLabels: string[] = [];
                      if (Array.isArray(r.usedTechniques) && r.usedTechniques.length > 0) {
                        r.usedTechniques.slice(0, 3).forEach((t: any) => techLabels.push(`${t.label}`));
                        if (r.usedTechniques.length > 3) techLabels.push(`+${r.usedTechniques.length - 3}`);
                      }
                      if (techLabels.length > 0) {
                        rows.push({ label: `  ${techLabels.join(', ')}` });
                      }
                    } else {
                      // ── Mode full / medium ──
                      const label = r.partner ? `Round ${r.number} contre ${r.partner}` : `Round ${r.number}`;
                      rows.push({ label, pace: resultEmoji ? `${resultEmoji} ${r.result === 'win' ? 'Victoire' : r.result === 'loss' ? 'Défaite' : 'Nul'}` : undefined });

                      if (r.partnerRating) {
                        const ratingLabel = r.partnerRating <= 2 ? 'Débutant' : r.partnerRating <= 4 ? 'Intermédiaire' : r.partnerRating <= 6 ? 'Bon niveau' : r.partnerRating <= 8 ? 'Avancé' : r.partnerRating === 9 ? 'Expert' : 'Élite';
                        rows.push({ label: `  Niveau adverse`, pace: `${r.partnerRating}/10, ${ratingLabel}` });
                      }

                      if (r.roundIntensity) {
                        const intensityMap: Record<string, string> = { guerre: 'Guerre', technique: 'Technique', detendu: 'Détendu' };
                        rows.push({ label: `  ${intensityMap[r.roundIntensity] ?? r.roundIntensity}` });
                      }

                      if ((r.pointsFor ?? 0) > 0 || (r.pointsAgainst ?? 0) > 0) {
                        rows.push({ label: `  Score`, pace: `${r.pointsFor ?? 0} à ${r.pointsAgainst ?? 0} pts` });
                      }

                      if (Array.isArray(r.methodsGiven) && r.methodsGiven.length > 0) {
                        r.methodsGiven.forEach((m: string) => rows.push({ label: `  ${m}`, pace: 'donné' }));
                      }
                      if (Array.isArray(r.methodsTaken) && r.methodsTaken.length > 0) {
                        r.methodsTaken.forEach((m: string) => rows.push({ label: `  ${m}`, pace: 'subi' }));
                      }

                      if (Array.isArray(r.usedTechniques) && r.usedTechniques.length > 0) {
                        r.usedTechniques.forEach((t: any) => {
                          rows.push({ label: `  ${t.label}`, reps: t.count > 1 ? `x${t.count}` : undefined });
                        });
                      }

                      // Notes uniquement en mode full
                      if (mode === 'full' && r.notes?.trim()) {
                        rows.push({ label: `  "${r.notes.trim()}"` });
                      }
                    }
                  });

                  // ── Bilan global ──
                  const wins = rounds.filter((r: any) => r.result === 'win').length;
                  const losses = rounds.filter((r: any) => r.result === 'loss').length;
                  const draws = rounds.filter((r: any) => r.result === 'draw').length;
                  const totalFor = rounds.reduce((a: number, r: any) => a + (r.pointsFor ?? 0), 0);
                  const totalAgainst = rounds.reduce((a: number, r: any) => a + (r.pointsAgainst ?? 0), 0);
                  const hasResults = wins + losses + draws > 0;
                  const hasPoints = totalFor > 0 || totalAgainst > 0;

                  if (nb > 1 && (hasResults || hasPoints)) {
                    const bilanParts: string[] = [];
                    if (hasResults) bilanParts.push(`${wins}V ${losses}D ${draws}N`);
                    if (hasPoints) bilanParts.push(`${totalFor} à ${totalAgainst} pts`);
                    rows.push({ label: `Bilan`, pace: bilanParts.join(', ') });
                  }

                  parsedOptions = rows;
                  // Stocker les données brutes pour le rendu visuel combat
                  setCombatRoundsData(rounds as CombatRoundData[]);

                  // ── Détection victoire impressionnante ──
                  const getRatingLabel = (r: number) => r <= 2 ? 'Débutant' : r <= 4 ? 'Intermédiaire' : r <= 6 ? 'Bon niveau' : r <= 8 ? 'Avancé' : r === 9 ? 'Expert' : 'Élite';
                  const winsVsRated = rounds.filter((r: any) => r.result === 'win' && (r.partnerRating ?? 0) >= 7);
                  const bestWin = winsVsRated.reduce((best: any, r: any) => (!best || r.partnerRating > best.partnerRating ? r : best), null);
                  const totalWins = rounds.filter((r: any) => r.result === 'win').length;
                  const totalRounds = rounds.length;

                  if (bestWin?.partnerRating >= 9) {
                    setCombatCelebration({
                      visible: true,
                      title: bestWin.partnerRating === 10 ? 'Élite battu !' : 'Expert dominé !',
                      subtitle: bestWin.partner
                        ? `Tu as battu ${bestWin.partner} noté ${bestWin.partnerRating}/10\nLes champions se révèlent dans l'adversité !`
                        : `Victoire contre un adversaire ${getRatingLabel(bestWin.partnerRating)} (${bestWin.partnerRating}/10) !`,
                    });
                  } else if (bestWin?.partnerRating >= 7) {
                    setCombatCelebration({
                      visible: true,
                      title: 'Adversaire fort battu !',
                      subtitle: bestWin.partner
                        ? `Victoire sur ${bestWin.partner} noté ${bestWin.partnerRating}/10\nTu progresses à grande vitesse !`
                        : `Victoire contre un adversaire ${getRatingLabel(bestWin.partnerRating)} (${bestWin.partnerRating}/10) !`,
                    });
                  } else if (totalWins > 0 && totalRounds >= 3 && totalWins === totalRounds) {
                    setCombatCelebration({
                      visible: true,
                      title: 'Séance parfaite !',
                      subtitle: `${totalWins} victoires sur ${totalRounds} rounds\nAucune défaite, domination totale !`,
                    });
                  }
                }
              } catch {
                // combat_rounds malformé : ignorer
                setCombatRoundsData(undefined);
              }
            } else {
              setCombatRoundsData(undefined);
            }

            setOptionDetails(parsedOptions);
          }
        }

        // Calculer l'objectif (Logique unifiée avec Step 2)
        const currentYear = new Date().getFullYear();
        if (currentTraining && currentTraining.club_id) {
          const club = clubs.find(c => c.id === currentTraining?.club_id);
          if (club) {
            setYearlyObjective((club.sessions_per_week || 3) * 52);
          }
        } else {
          setYearlyObjective(365);
        }

        // Calculer les compteurs (Logique unifiée avec Step 2)
        const today = new Date();
        const startOfYear = new Date(currentYear, 0, 1);
        const daysElapsed = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        if (currentTraining) {
          const sportToCount = currentTraining.sport?.split(',')[0].trim();
          const clubToCount = currentTraining.club_id;

          const sportTrainings = trainings.filter(t => {
            const tDate = new Date(t.date);
            if (tDate.getFullYear() !== currentYear) return false;
            
            if (clubToCount) {
              return t.club_id === clubToCount;
            } else {
              const tSports = t.sport ? t.sport.split(',').map(s => s.trim()) : [];
              return tSports.includes(sportToCount);
            }
          });

          const uniqueDays = new Set(sportTrainings.map(t => new Date(t.date).toISOString().split('T')[0]));
          setYearlyCount(Math.min(uniqueDays.size, daysElapsed));
        }

      } catch (error) {
        logger.error('Error loading data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, [params.id]);

  const toggles: { label: string; on: boolean; set: (v: boolean) => void }[] = [
    { label: 'Date', on: showDate, set: setShowDate },
    { label: 'Club', on: showClub, set: setShowClub },
    { label: 'Lieu', on: showLieu, set: setShowLieu },
    { label: 'Objectif', on: showYearlyCount, set: setShowYearlyCount },
    { label: 'Détail', on: showExercises, set: setShowExercises },
    { label: 'Stats', on: showStats, set: setShowStats },
  ];

  const pp = paletteOf('papier');

  return (
    <ShareStudio
      title="Ma séance"
      subtitle="Montre le travail du jour"
      loading={isLoadingData}
      empty={!isLoadingData && !lastTraining ? { title: 'Aucune séance à partager', text: 'Enregistre ta première séance, ta carte sera prête juste après.', action: 'Lancer une séance', onAction: () => router.push('/seance' as any) } : null}
      style={studio.style}
      onStyle={studio.setStyle}
      hasPhoto={studio.hasPhoto}
      onPickPhoto={studio.pick}
      onShare={studio.share}
      onSave={studio.save}
      busy={studio.busy}
      secondary={{ label: 'Étape suivante : sauvegarder mes données', onPress: () => router.push('/social-share/backup-step' as any) }}
      extras={
        <View style={{ gap: 14 }}>
          {combatCelebration?.visible ? (
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Stamp p={pp} size={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={17} weight="black" tight>{combatCelebration.title}</Ink>
                <Ink size={13} weight="medium" color={P.ink2}>{combatCelebration.subtitle}</Ink>
              </View>
            </Card>
          ) : null}
          <View style={{ gap: 10 }}>
            <Ink size={15} weight="black" style={{ paddingHorizontal: 4 }}>Sur la carte</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {toggles.map((t) => (
                <Pill key={t.label} label={t.label} active={t.on} onPress={() => { tap(); t.set(!t.on); }} />
              ))}
            </View>
          </View>
        </View>
      }
    >
      {lastTraining ? (
        <SessionCard
          ref={studio.cardRef}
          training={lastTraining}
          backgroundImage={studio.style === 'photo' ? studio.photo : undefined}
          backgroundType={studio.legacyBg}
          keepPhotoClear={!!studio.photo}
          customLocation={customLocation}
          isLandscape={studio.landscape}
          userAvatar={userAvatar}
          profilePhoto={userPhoto}
          userName={userName}
          rank={userRank}
          userLevel={userLevel}
          options={optionDetails}
          combatRounds={combatRoundsData ?? undefined}
          yearlyCount={yearlyCount}
          monthlyCount={monthlyCount}
          weeklyCount={weeklyCount}
          yearlyObjective={yearlyObjective}
          showDate={showDate}
          showYearlyCount={showYearlyCount}
          showMonthlyCount
          showWeeklyCount
          showGoalProgress
          showClub={showClub}
          showLieu={showLieu}
          showExercises={showExercises}
          showStats={showStats}
          width={CARD_WIDTH}
          disableInternalScroll
        />
      ) : null}
    </ShareStudio>
  );
}
