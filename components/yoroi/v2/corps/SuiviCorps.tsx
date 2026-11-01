/**
 * Ajouts de Progres Corps du 1er novembre 2026 (demandes AT et AU), en deux blocs poses dans CorpsSection :
 * - SuiviCorpsHaut : « Ce que tu suis » propose une fois, et ta moyenne sur 7 jours, bien visible en haut ;
 * - SuiviCorpsBas : tes reperes (WHtR, FFMI, epaules sur taille), la composition detaillee, la perte d'eau sur tes
 *   seances, et les entrees Forme du matin, Biomarqueurs et Plis cutanes.
 * Le niveau ne cache jamais une donnee : il decide des cartes vides et des invitations (lib/v2/mesures/niveauSuivi.ts).
 */
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useCorps } from '@/lib/v2/mesures/useCorps';
import type { DonneesCorps } from '@/lib/v2/mesures/useCorps';
import { useNiveauSuivi } from '@/lib/v2/mesures/useNiveauSuivi';
import { voirBloc } from '@/lib/v2/mesures/niveauSuivi';
import type { NiveauSuivi } from '@/lib/v2/mesures/niveauSuivi';
import { jourLocal } from '@/lib/v2/mesures/listeStockee';
import { scoreForme } from '@/lib/v2/mesures/formeMatin';
import { CarteB, LigneDetail, teinte } from '@/components/yoroi/v2/progres/ThemesProgres';
import { dayShort } from '@/lib/v2/progres/format';
import { traduire } from '@/lib/i18n/tr';
import { Carte, Lien, TitreCarte } from './kit';
import { MoyenneSeptJours, IndicesCorps } from './IndicesCorps';
import { CompositionDetaillee } from './CompositionDetaillee';
import { PertesEauRecentes } from './PeseeSeance';
import { libelleNiveau } from './libelles';

export function useSuiviCorps(): { corps: DonneesCorps & { pret: boolean }; niveau: NiveauSuivi; choisi: boolean; propose: boolean; pretNiveau: boolean } {
  const corps = useCorps();
  const n = useNiveauSuivi();
  return { corps, niveau: n.niveau, choisi: n.choisi, propose: n.propose, pretNiveau: n.pret };
}

export function SuiviCorpsHaut({ s }: { s: ReturnType<typeof useSuiviCorps> }) {
  const router = useRouter();
  return (
    <View style={{ gap: 10 }}>
      {s.pretNiveau && !s.propose && !s.choisi ? (
        <Carte>
          <TitreCarte sticker="objectifs" titre={traduire('Ce que tu suis')} sous={traduire('Essentiel, Sportif ou Athlète : choisis ce que YOROI te propose de mesurer. Proposé : {0}.', libelleNiveau(s.niveau))} />
          <Lien label={traduire('Choisir mon niveau')} onPress={() => router.push('/niveau-suivi' as never)} />
        </Carte>
      ) : null}
      <MoyenneSeptJours pesees={s.corps.pesees} />
    </View>
  );
}

export function SuiviCorpsBas({ s }: { s: ReturnType<typeof useSuiviCorps> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const { corps, niveau } = s;
  const formeJour = corps.formes.find((f) => f.date === jourLocal());
  const derniereForme = [...corps.formes].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const voirForme = voirBloc(niveau, 'forme_matin', corps.formes.length > 0);
  const voirBio = voirBloc(niveau, 'biomarqueurs', corps.bio.length > 0);
  const voirPlis = voirBloc(niveau, 'plis', corps.plis.length > 0);
  const lignes: React.ReactNode[] = [];
  if (voirForme) lignes.push(<LigneDetail key="forme" premiere={!lignes.length} sticker="lune_soleil" fond={teinte('menthe').fond} titre={traduire('Forme du matin')} sous={formeJour ? traduire('Ta forme du jour : {0} sur 100', scoreForme(formeJour)) : derniereForme ? traduire('Dernière réponse le {0}', dayShort(derniereForme.date)) : traduire('30 secondes, 5 questions')} onPress={() => router.push('/forme-matin' as never)} />);
  if (voirBio) lignes.push(<LigneDetail key="bio" premiere={!lignes.length} sticker="thermometre" fond={teinte('peche').fond} titre={traduire('Biomarqueurs')} sous={corps.bio.length ? traduire('{0} valeurs notées', corps.bio.length) : traduire('Glycémie, tension, cétones, lactate, bilan sanguin')} onPress={() => router.push('/biomarqueurs' as never)} />);
  if (voirPlis) lignes.push(<LigneDetail key="plis" premiere={!lignes.length} sticker="pourcentage" fond={teinte('lilas').fond} titre={traduire('Plis cutanés')} sous={corps.plis.length ? traduire('{0} mesures à la pince', corps.plis.length) : traduire('7 plis ou 3 plis, % de graisse par Jackson et Pollock')} onPress={() => router.push('/plis' as never)} />);
  lignes.push(<LigneDetail key="niveau" premiere={!lignes.length} sticker="reglage_machine" fond={teinte('creme').fond} titre={traduire('Ce que tu suis')} sous={libelleNiveau(niveau)} onPress={() => router.push('/niveau-suivi' as never)} />);
  return (
    <View style={{ gap: 14 }}>
      <IndicesCorps pesees={corps.pesees} mensurations={corps.mensurations} tailleCm={corps.profil?.height_cm} niveau={niveau} />
      <CompositionDetaillee pesees={corps.pesees} contextes={corps.contextes} brutes={corps.brutes} niveau={niveau} />
      <PertesEauRecentes contextes={corps.contextes} />
      <View style={{ gap: 8 }}>
        <Ink size={11} weight="black" color={c.textSecondary} style={{ letterSpacing: 1.4 }}>{traduire('Aller plus loin').toUpperCase()}</Ink>
        <CarteB>{lignes}</CarteB>
      </View>
    </View>
  );
}
