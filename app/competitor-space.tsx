/**
 * Espace competiteur (refonte v2) : ta prochaine competition en plaques, ton palmares en tampons,
 * ta pesee face a ta categorie, et tes outils propres (profil competiteur, coupe de poids, hydratation).
 * Vague 18 : Competitions et Analyse de combat retirees des outils, elles sont deja dans Combat et competition.
 */
import React, { useCallback, useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Image, ImageBackground, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Glass, P, Press, SectionTitle } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, Hanko } from '@/components/yoroi/v2/ornements/screens';
import { AccessTile, Note } from '@/components/yoroi/v2/competition/ui';
import { CountdownPlates } from '@/components/yoroi/v2/competition/CountdownPlates';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { getCombats, getNextCompetition } from '@/lib/fighterModeService';
import type { Combat, Competition } from '@/lib/fighterMode';
import { capitalize, daysUntil, longDate, parseLocalDate } from '@/lib/v2/competition/dates';
import { useAthlete } from '@/lib/v2/competition/athlete';
import { sportArt } from '@/lib/v2/seances/illustrations';
import { formatKg } from '@/lib/v2/weightStats';
import { traduire } from '@/lib/i18n/tr';

const SCENE = require('@/assets/avatars/app/themes/theme_nuit.webp');

const TOOLS: { title: string; text: string; route: string }[] = [
  { title: traduire('Profil compétiteur'), text: traduire('Catégorie, ceinture, sport'), route: '/competitor-profile' },
  { title: traduire('Coupe de poids'), text: traduire('Gérer ton poids pour la pesée'), route: '/weight-cut' },
  { title: traduire('Hydratation'), text: traduire('Protocole avant compétition'), route: '/hydration' },
];

export default function CompetitorSpaceScreen() {
  const router = useRouter();
  const { gender, lastWeight } = useAthlete();
  const [next, setNext] = useState<Competition | null>(null);
  const [combats, setCombats] = useState<Combat[]>([]);

  useFocusEffect(
    useCallback(() => {
      getNextCompetition().then(setNext).catch(() => setNext(null));
      getCombats().then(setCombats).catch(() => setCombats([]));
    }, []),
  );

  const wins = combats.filter((c) => c.resultat === 'victoire').length;
  const losses = combats.filter((c) => c.resultat === 'defaite').length;
  const draws = combats.length - wins - losses;
  const days = next ? daysUntil(next.date) : null;
  const gap = next?.poids_max && next.poids_max < 900 && lastWeight ? lastWeight.weight - next.poids_max : null;

  return (
    <PremiumGate source="competiteur" featureTitle={traduire("Espace compétiteur")} perks={[traduire('Ta prochaine compétition en compte à rebours'), traduire('Ton palmarès d’un coup d’œil'), traduire('Tous tes outils de compétiteur réunis')]}>
      <DetailScreen title={traduire("Espace compétiteur")} subtitle={traduire("Préparer et suivre tes compétitions")}>
        <Enter i={0}>
          <ImageBackground source={SCENE} style={{ borderRadius: 28, overflow: 'hidden', minHeight: 230 }} resizeMode="cover">
            <Image source={sportArt(next?.sport ?? 'jjb', gender, 3)} style={{ position: 'absolute', right: -20, bottom: -40, width: 200, height: 280 }} resizeMode="contain" />
            <View style={{ padding: 14, flex: 1, justifyContent: 'flex-end' }}>
              {next && days !== null ? (
                <Press onPress={() => router.push(`/competition-detail?id=${next.id}` as any)} accessibilityRole="button" accessibilityLabel={traduire("Prochaine compétition : {0}", next.nom)}>
                  <Glass style={{ maxWidth: '70%', padding: 16, gap: 4 }}>
                    <Ink size={12} weight="bold" color={P.muted}>
                      {traduire("Prochaine compétition")}</Ink>
                    <Ink size={44} weight="black" tight>
                      {days === 0 ? traduire("Aujourd'hui") : String(days)}
                      {days > 0 ? (
                        <Ink size={14} weight="extraBold" color={P.ink2}>
                          {days > 1 ? ' jours' : ' jour'}
                        </Ink>
                      ) : null}
                    </Ink>
                    <Ink size={14} weight="extraBold" numberOfLines={2}>
                      {traduire(next.nom)}
                    </Ink>
                    <Ink size={12} weight="bold" color={P.ink2}>
                      {capitalize(longDate(parseLocalDate(next.date), false))}
                    </Ink>
                  </Glass>
                </Press>
              ) : (
                <Glass style={{ maxWidth: '72%', padding: 16, gap: 6 }}>
                  <Ink size={18} weight="black" tight>
                    {traduire("Pas de compétition prévue")}</Ink>
                  <Ink size={13} weight="bold" color={P.ink2}>
                    {traduire("Ajoute la prochaine pour lancer le compte à rebours.")}</Ink>
                </Glass>
              )}
            </View>
          </ImageBackground>
        </Enter>

        {next && days !== null && days >= 0 ? (
          <Enter i={1}>
            <Card style={{ gap: 12 }}>
              <CountdownPlates daysLeft={days} max={28} plate={22} />
              {gap !== null ? (
                <Ink size={13} weight="bold" color={gap <= 0 ? P.mossText : P.danger}>
                  {gap <= 0 ? traduire("Tu es dans ta catégorie {0}, avec {1} kg de marge.", next.categorie_poids, formatKg(-gap)) : traduire("Encore {0} kg pour entrer en {1}.", formatKg(gap), next.categorie_poids)}
                </Ink>
              ) : null}
            </Card>
          </Enter>
        ) : (
          <Enter i={1}>
            <BigButton label={traduire("Ajouter une compétition")} icon="plus" onPress={() => router.push('/add-competition' as any)} />
          </Enter>
        )}

        <Enter i={2} style={{ gap: 10 }}>
          <SectionTitle action={traduire("Palmarès")} onAction={() => router.push('/palmares' as any)}>
            {traduire("Ton palmarès")}</SectionTitle>
          <Card style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 18 }}>
            {[
              { n: wins, l: 'victoires', k: 'etoile' as const },
              { n: losses, l: traduire('défaites'), k: 'vague' as const },
              { n: draws, l: 'nuls', k: 'eventail' as const },
            ].map((s) => (
              <View key={s.l} style={{ alignItems: 'center', gap: 6 }}>
                {s.n > 0 && s.k === 'etoile' ? <Hanko size={36} /> : (
                  <View style={{ height: 36, justifyContent: 'center' }}>
                    <Glyph kind={s.k} size={28} color={P.line} />
                  </View>
                )}
                <Ink size={28} weight="black" tight>
                  {String(s.n)}
                </Ink>
                <Ink size={12} weight="bold" color={P.ink2}>
                  {s.l}
                </Ink>
              </View>
            ))}
          </Card>
        </Enter>

        <Enter i={3} style={{ gap: 10 }}>
          <SectionTitle>{traduire("Tes outils")}</SectionTitle>
          {[0, 2].map((r) => (
            <View key={r} style={{ flexDirection: 'row', gap: 10 }}>
              {TOOLS.slice(r, r + 2).map((t, i) => (
                <AccessTile key={t.route} title={traduire(t.title)} text={traduire(t.text)} tone={r === 0 && i === 0 ? 'ink' : 'light'} onPress={() => router.push(t.route as any)} />
              ))}
            </View>
          ))}
        </Enter>

        <Note>{traduire("Note chaque compétition et chaque combat dans ton palmarès : tu verras ta progression sur le long terme.")}</Note>
      </DetailScreen>
    </PremiumGate>
  );
}
