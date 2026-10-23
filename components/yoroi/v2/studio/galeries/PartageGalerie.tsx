/**
 * Studio, galerie des cartes de partage : chaque carte de components/social-cards, la carte de combattant
 * et la feuille de partage d'un record du carnet (avec ses fonds partage_*), remplies avec les donnees
 * fictives de Heny (musculation et JJB). Une carte a la fois, habillage papier, laque ou photo, et le vrai partage.
 */
import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { useTheme } from '@/lib/ThemeContext';
import { Ink } from '@/components/yoroi/v2/Ink';
import { cardWidthFor } from '@/components/yoroi/v2/partage/cardKit';
import { FighterCardView } from '@/components/yoroi/v2/partage/FighterCardView';
import { RecordShareSheet } from '@/components/yoroi/v2/carnet/RecordShareSheet';
import type { ShareRecord } from '@/components/yoroi/v2/carnet/RecordShareSheet';
import { WeeklyRecapCardV2 } from '@/components/social-cards/WeeklyRecapCardV2';
import { MonthlyRecapCardV2 } from '@/components/social-cards/MonthlyRecapCardV2';
import { YearCounterCardV2 } from '@/components/social-cards/YearCounterCardV2';
import { DuelCard } from '@/components/social-cards/DuelCard';
import { SessionCard } from '@/components/social-cards/SessionCard';
import { UniversalShareCard } from '@/components/social-cards/UniversalShareCard';
import { CombatShareCard } from '@/components/social-cards/CombatShareCard';
import { WeeklyRecapCard } from '@/components/social-cards/WeeklyRecapCard';
import { MonthlyRecapCard } from '@/components/social-cards/MonthlyRecapCard';
import { YearCounterCard } from '@/components/social-cards/YearCounterCard';
import { useStudio } from '@/lib/v2/partage/useStudio';
import type { CardVariant } from '@/components/yoroi/v2/partage/cardKit';
import { COMBATTANT, DUEL, NOM, OPTIONS_MUSCU, RECORDS_PARTAGE, ROUNDS_JJB, SEANCE_JJB, SEANCE_MUSCU, anneeFictive, identiteFictive, moisFictif, semaineFictive } from './fictif';
import { Bloc, Bouton, GalerieScreen, Ligne, Lignes, Pastille, PastilleRow, Rubrique } from './kit';
import { traduire } from '@/lib/i18n/tr';

type CarteId = 'semaine' | 'mois' | 'annee' | 'seance_muscu' | 'seance_jjb' | 'duel' | 'combattant' | 'universelle' | 'combat' | 'ancienne_semaine' | 'ancien_mois' | 'ancienne_annee';

const CARTES: { id: CarteId; label: string; fichier: string; utilisee: boolean }[] = [
  { id: 'semaine', label: traduire('Ma semaine'), fichier: 'WeeklyRecapCardV2', utilisee: true },
  { id: 'mois', label: traduire('Mon mois'), fichier: 'MonthlyRecapCardV2', utilisee: true },
  { id: 'annee', label: traduire('Mon année'), fichier: 'YearCounterCardV2', utilisee: true },
  { id: 'seance_muscu', label: traduire('Séance muscu'), fichier: 'SessionCard', utilisee: true },
  { id: 'seance_jjb', label: traduire('Séance JJB'), fichier: traduire('SessionCard, avec les rounds'), utilisee: true },
  { id: 'duel', label: 'Duel', fichier: 'DuelCard', utilisee: true },
  { id: 'combattant', label: traduire('Carte de combattant'), fichier: 'FighterCardView', utilisee: true },
  { id: 'universelle', label: 'Carte universelle', fichier: 'UniversalShareCard', utilisee: false },
  { id: 'combat', label: traduire('Carte combat'), fichier: 'CombatShareCard', utilisee: false },
  { id: 'ancienne_semaine', label: traduire('Ancienne semaine'), fichier: 'WeeklyRecapCard', utilisee: false },
  { id: 'ancien_mois', label: traduire('Ancien mois'), fichier: 'MonthlyRecapCard', utilisee: false },
  { id: 'ancienne_annee', label: traduire('Ancienne année'), fichier: 'YearCounterCard', utilisee: false },
];

const STYLES: { key: CardVariant; label: string }[] = [
  { key: 'papier', label: 'Papier' },
  { key: 'laque', label: 'Laque' },
  { key: 'photo', label: 'Photo' },
];

export function PartageGalerie() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const { colors: legacyColors } = useTheme();
  const { width: sw } = useWindowDimensions();
  const width = cardWidthFor(sw);
  const studio = useStudio({ dialogTitle: traduire('Partager ma carte YOROI') });
  const [carte, setCarte] = useState<CarteId>('semaine');
  const [genre, setGenre] = useState<'h' | 'f'>('f');
  const [record, setRecord] = useState<ShareRecord | null>(null);

  const [semaine] = useState(() => semaineFictive());
  const [mois] = useState(() => moisFictif());
  const [annee] = useState(() => anneeFictive());

  const bg = studio.style === 'photo' ? studio.photo ?? undefined : undefined;
  const info = CARTES.find((x) => x.id === carte) ?? CARTES[0];
  const i = CARTES.findIndex((x) => x.id === carte);

  const rendu = () => {
    switch (carte) {
      case 'semaine':
        return <WeeklyRecapCardV2 ref={studio.cardRef} stats={semaine} format="stories" backgroundImage={bg} backgroundType={studio.legacyBg} username={NOM} weeklyGoal={4} width={width} />;
      case 'mois':
        return <MonthlyRecapCardV2 ref={studio.cardRef} stats={mois} format="stories" backgroundImage={bg} backgroundType={studio.legacyBg} username={NOM} weeklyGoal={4} width={width} />;
      case 'annee':
        return <YearCounterCardV2 ref={studio.cardRef} stats={annee} format="stories" backgroundImage={bg} backgroundType={studio.legacyBg} username={NOM} weeklyGoal={4} width={width} />;
      case 'seance_muscu':
        return <SessionCard ref={studio.cardRef} training={SEANCE_MUSCU} backgroundImage={bg} backgroundType={studio.legacyBg} userName={NOM} options={OPTIONS_MUSCU} yearlyCount={168} weeklyCount={5} monthlyCount={19} yearlyObjective={208} width={width} disableInternalScroll />;
      case 'seance_jjb':
        return <SessionCard ref={studio.cardRef} training={SEANCE_JJB} backgroundImage={bg} backgroundType={studio.legacyBg} userName={NOM} combatRounds={ROUNDS_JJB} yearlyCount={168} weeklyCount={5} monthlyCount={19} yearlyObjective={208} width={width} disableInternalScroll />;
      case 'duel':
        return <DuelCard ref={studio.cardRef} {...DUEL} backgroundType={studio.duelBg} backgroundImage={bg} width={width} />;
      case 'combattant':
        return <FighterCardView ref={studio.cardRef} data={COMBATTANT} id={identiteFictive(genre)} variant={studio.style === 'photo' && !studio.photo ? 'laque' : studio.style} photo={studio.photo} width={width} />;
      case 'universelle':
        return <UniversalShareCard ref={studio.cardRef} training={SEANCE_JJB} rounds={ROUNDS_JJB} width={width} backgroundImage={bg} userName={NOM} yearlyCount={168} yearlyObjective={208} />;
      case 'combat':
        return <CombatShareCard ref={studio.cardRef} training={SEANCE_JJB} rounds={ROUNDS_JJB} width={width} backgroundImage={bg} userName={NOM} />;
      case 'ancienne_semaine':
        return <WeeklyRecapCard ref={studio.cardRef} stats={semaine} backgroundImage={bg ?? null} backgroundType={studio.legacyBg} width={width} userName={NOM} />;
      case 'ancien_mois':
        return <MonthlyRecapCard ref={studio.cardRef} stats={mois} format="stories" colors={legacyColors} username={NOM} />;
      case 'ancienne_annee':
        return <YearCounterCard ref={studio.cardRef} stats={annee} format="stories" colors={legacyColors} username={NOM} />;
      default:
        return null;
    }
  };

  return (
    <GalerieScreen
      title={traduire("Cartes de partage")}
      sub={traduire("Chaque carte avec les données fictives de {0}, musculation et JJB. Le bouton Partager envoie la vraie image.", NOM)}
      overlay={<RecordShareSheet data={record} onClose={() => setRecord(null)} />}
    >
      <PastilleRow>
        {CARTES.map((x) => (
          <Pastille key={x.id} label={x.label} on={carte === x.id} onPress={() => setCarte(x.id)} />
        ))}
      </PastilleRow>
      <PastilleRow>
        {STYLES.map((s) => (
          <Pastille key={s.key} label={s.label} on={studio.style === s.key} onPress={() => studio.setStyle(s.key)} />
        ))}
        {carte === 'combattant' ? (
          <>
            <Pastille label={traduire("Guerrière")} on={genre === 'f'} onPress={() => setGenre('f')} />
            <Pastille label="Guerrier" on={genre === 'h'} onPress={() => setGenre('h')} />
          </>
        ) : null}
      </PastilleRow>

      <Bloc style={{ paddingVertical: 12, gap: 2 }}>
        <Ink size={16} weight="black">{traduire("{0} sur {1}, {2}", i + 1, CARTES.length, info.label)}</Ink>
        <Ink size={12} color={c.textMuted}>{info.fichier}</Ink>
        <Ink size={12} weight="bold" color={info.utilisee ? c.successText : c.textSecondary}>
          {info.utilisee ? traduire('Utilisée dans l’app') : traduire('Plus appelée nulle part dans l’app')}
        </Ink>
      </Bloc>

      <View style={{ alignItems: 'center' }} key={`${carte}-${studio.style}-${genre}`}>
        {rendu()}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Bouton label={traduire("Précédente")} light onPress={() => setCarte(CARTES[(i - 1 + CARTES.length) % CARTES.length].id)} />
        </View>
        <View style={{ flex: 1 }}>
          <Bouton label="Suivante" light onPress={() => setCarte(CARTES[(i + 1) % CARTES.length].id)} />
        </View>
      </View>
      <Bouton label={studio.busy ? traduire('Un instant') : traduire('Partager cette carte')} icon="share" onPress={studio.share} disabled={studio.busy} />

      <Rubrique title={traduire("Record du carnet")} sub={traduire("La feuille de partage d’un record, avec ses fonds partage_ et ses deux formats")} />
      <Lignes>
        {RECORDS_PARTAGE.map((r, k) => (
          <Ligne key={r.label} first={k === 0} icon={r.data.isPR ? 'trophy' : 'dumbbell'} label={r.label} sub={r.sub} onPress={() => setRecord(r.data)} />
        ))}
      </Lignes>
    </GalerieScreen>
  );
}

export default PartageGalerie;
