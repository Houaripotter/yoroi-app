/**
 * Partage de la carte de duel (refonte v2) : ton bilan face a un partenaire de sparring.
 * Le calcul du bilan reste celui d'origine.
 */
import React, { useState, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMethodDisplayName } from '@/components/BJJBodyMap';
import { getTrainingsByPartnerName, getProfile, Training, CombatRound } from '@/lib/database';
import { DuelCard } from '@/components/social-cards/DuelCard';
import logger from '@/lib/security/logger';
import { ShareStudio } from '@/components/yoroi/v2/partage/ShareStudio';
import { useStudio } from '@/lib/v2/partage/useStudio';

const STORAGE_KEY = '@yoroi_sparring_partners';

interface PartnerRecord {
  id: string;
  name: string;
  belt?: string;
  sport?: string;
}

/** Calcule le bilan W/L/D + méthodes depuis les trainings du partenaire */
function computeDuelStats(trainings: Training[], partnerNameLower: string) {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let totalRounds = 0;
  const methodsGivenCount: Record<string, number> = {};
  const methodsTakenCount: Record<string, number> = {};
  const sessionResults: ('win' | 'loss' | 'draw')[] = [];

  for (const t of trainings) {
    const rounds: CombatRound[] = Array.isArray(t.combat_rounds) ? t.combat_rounds : [];
    const partnerRounds = rounds.filter(
      r => r.partner && r.partner.toLowerCase().includes(partnerNameLower)
    );
    if (partnerRounds.length === 0) continue;

    // Bilan de séance = résultat du round avec ce partenaire
    let sessionW = 0, sessionL = 0, sessionD = 0;
    for (const r of partnerRounds) {
      totalRounds++;
      if (r.result === 'win') { wins++; sessionW++; }
      else if (r.result === 'loss') { losses++; sessionL++; }
      else if (r.result === 'draw') { draws++; sessionD++; }

      // Méthodes données
      if (Array.isArray(r.methodsGiven)) {
        for (const m of r.methodsGiven) {
          const key = getMethodDisplayName(m);
          methodsGivenCount[key] = (methodsGivenCount[key] ?? 0) + 1;
        }
      }
      // Méthodes subies
      if (Array.isArray(r.methodsTaken)) {
        for (const m of r.methodsTaken) {
          const key = getMethodDisplayName(m);
          methodsTakenCount[key] = (methodsTakenCount[key] ?? 0) + 1;
        }
      }
    }

    // Résultat dominant de la séance
    if (sessionW > sessionL) sessionResults.push('win');
    else if (sessionL > sessionW) sessionResults.push('loss');
    else if (sessionD > 0) sessionResults.push('draw');
    else if (sessionW > 0) sessionResults.push('win');
  }

  // Top méthode donnée / subie
  const topMethodGiven = Object.entries(methodsGivenCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topMethodTaken = Object.entries(methodsTakenCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Dernières 8 séances (les trainings sont déjà triés DESC depuis la DB)
  const last8 = sessionResults.slice(0, 8) as ('win' | 'loss' | 'draw')[];

  return { wins, losses, draws, totalRounds, topMethodGiven, topMethodTaken, last8 };
}


export default function DuelCardScreen() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const params = useLocalSearchParams<{ partnerName?: string; partnerBelt?: string }>();
  const CARD_SIZE = Math.min(SCREEN_WIDTH - 44, 375);
  const studio = useStudio({ square: true, dialogTitle: 'Partager ma carte de duel', source: 'duel' });

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [myName, setMyName] = useState('Moi');
  const [opponentName] = useState(params.partnerName ?? 'Adversaire');
  const [opponentBelt, setOpponentBelt] = useState<string | undefined>(params.partnerBelt);
  const [opponentSport, setOpponentSport] = useState<string | undefined>(undefined);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [draws, setDraws] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [topMethodGiven, setTopMethodGiven] = useState<string | undefined>(undefined);
  const [topMethodTaken, setTopMethodTaken] = useState<string | undefined>(undefined);
  const [lastSessions, setLastSessions] = useState<('win' | 'loss' | 'draw')[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const partnerNameParam = params.partnerName ?? '';

        // 1. Profil utilisateur
        const profile = await getProfile();
        if (profile?.name) setMyName(profile.name);

        // 2. Récupérer la ceinture du partenaire depuis AsyncStorage (si pas passée en param)
        if (!params.partnerBelt && partnerNameParam) {
          try {
            const raw = await AsyncStorage.getItem(STORAGE_KEY);
            if (raw) {
              const partners: PartnerRecord[] = JSON.parse(raw);
              const found = partners.find(
                p => p.name.toLowerCase() === partnerNameParam.toLowerCase()
              );
              if (found) {
                if (found.belt) setOpponentBelt(found.belt);
                if (found.sport) setOpponentSport(found.sport);
              }
            }
          } catch (e) {
            logger.error('DuelCard: erreur lecture AsyncStorage partenaires', e);
          }
        }

        // 3. Séances contre ce partenaire
        if (partnerNameParam) {
          const trainings = await getTrainingsByPartnerName(partnerNameParam);
          const stats = computeDuelStats(trainings, partnerNameParam.toLowerCase());
          setWins(stats.wins);
          setLosses(stats.losses);
          setDraws(stats.draws);
          setTotalRounds(stats.totalRounds);
          setTopMethodGiven(stats.topMethodGiven);
          setTopMethodTaken(stats.topMethodTaken);
          setLastSessions(stats.last8);

          // Sport depuis la première séance si non trouvé en AsyncStorage
          if (!opponentSport && trainings.length > 0) {
            const firstSport = trainings[0].sport?.split(',')[0]?.trim();
            if (firstSport) setOpponentSport(firstSport);
          }
        }
      } catch (error) {
        logger.error('DuelCard: erreur chargement données', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, []);

  const total = wins + losses + draws;
  const empty = !isLoadingData && (!params.partnerName || totalRounds === 0)
    ? { title: 'Pas encore de duel', text: params.partnerName ? `Note un round contre ${params.partnerName} pendant ta séance de combat, ton bilan apparaîtra ici.` : 'Choisis un partenaire de sparring pour créer ta carte.', action: 'Mes partenaires', onAction: () => router.push('/sparring-partners' as any) }
    : null;

  return (
    <ShareStudio
      title="Carte de duel"
      subtitle={total > 0 ? `${total} rounds notés contre ${opponentName}` : `Toi contre ${opponentName}`}
      loading={isLoadingData}
      empty={empty}
      style={studio.style}
      onStyle={studio.setStyle}
      hasPhoto={studio.hasPhoto}
      onPickPhoto={studio.pick}
      onShare={studio.share}
      onSave={studio.save}
      busy={studio.busy}
    >
      <DuelCard
        ref={studio.cardRef}
        myName={myName}
        opponentName={opponentName}
        opponentBelt={opponentBelt}
        wins={wins}
        losses={losses}
        draws={draws}
        totalRounds={totalRounds}
        topMethodGiven={topMethodGiven}
        topMethodTaken={topMethodTaken}
        lastSessions={lastSessions}
        backgroundType={studio.duelBg}
        backgroundImage={studio.style === 'photo' ? studio.photo ?? undefined : undefined}
        sport={opponentSport}
        width={CARD_SIZE}
      />
    </ShareStudio>
  );
}
