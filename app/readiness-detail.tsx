/**
 * Ta recuperation (score unique, lib/v2/accueil/forme.ts) : recuperation du jour, energie de la semaine et etat du corps.
 * Remplace aussi les anciens ecrans Energie et Etat du corps.
 * Vague 14 : la rangee Sommeil, Eau, Seance (doublon du bouton + et des facteurs) est retiree.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Ornement } from '@/components/yoroi/v2/ornements/Ornement';
import { DeviceEventEmitter, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getSleepStats } from '@/lib/sleepService';
import type { SleepStats } from '@/lib/sleepService';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { safeComputeForme, formatMinutes } from '@/lib/v2/accueil/forme';
import type { FactorKey, FormeResult } from '@/lib/v2/accueil/forme';
import { relativeDay } from '@/lib/v2/accueil/home';
import { BigButton, BrushRing, Card, Enter, Icon, P, Press, SectionTitle, Stat } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { BodyZones } from '@/components/yoroi/v2/accueil/BodyZones';
import { intensite } from '@/lib/v2/intensite';
import { RECUP_METHOD, messageScoreIncomplet, scoreRecupFiable } from '@/lib/v2/recuperation';
import { traduire, traduirePluriel, DECIMAL } from '@/lib/i18n/tr';

const FACTOR_ICON: Record<FactorKey, 'moon' | 'bolt' | 'drop' | 'body' | 'heart'> = {
  sommeil: 'moon',
  charge: 'bolt',
  hydratation: 'drop',
  corps: 'body',
  coeur: 'heart',
  vfc: 'heart',
};

const MISSING: Partial<Record<FactorKey, { label: string; text: string; href?: string }>> = {
  sommeil: { label: traduire('Sommeil'), text: traduire('Note ta nuit'), href: '/sleep-input' },
  charge: { label: traduire('Charge d’entraînement'), text: traduire('Ajoute une séance'), href: '/ajouter' },
  hydratation: { label: traduire('Hydratation'), text: traduire('Note ton eau'), href: '/hydration' },
  corps: { label: traduire('État du corps'), text: traduire('Indique une gêne plus bas') },
};

function colorFor(score: number) {
  // Vague 32 : echelle d'intensite commune, lue a l'envers pour la forme (vert, or, orange)
  return intensite(score >= 65 ? 2 : score >= 45 ? 3 : 4).text;
}

export default function TaForme() {
  const router = useRouter();
  const [forme, setForme] = useState<FormeResult | null>(null);
  const [sleep, setSleep] = useState<SleepStats | null>(null);
  const [recent, setRecent] = useState<Training[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [f, s, t] = await Promise.all([safeComputeForme(), getSleepStats().catch(() => null), getTrainings(30).catch(() => [] as Training[])]);
    setForme(f);
    setSleep(s);
    setRecent([...(t ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4));
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', load);
    return () => sub.remove();
  }, [load]);

  const score = forme?.score ?? null;
  const level = forme?.level ?? null;
  // un score sur 100 n'a de sens qu'a partir de deux elements mesures
  const factorCount = forme?.factors.length ?? 0;
  // meme regle que l'accueil (lib/v2/recuperation.ts, scoreRecupFiable)
  const reliable = level !== null && scoreRecupFiable(score, factorCount);
  const missingNight = !!forme?.missing.includes('sommeil');

  return (
    <DetailScreen title={traduire("Ta récupération")} subtitle={reliable && level ? level.label : traduire('Ton score du jour, sur 100')}>
      {/* Score */}
      <Enter i={0}>
        {score !== null && level && !reliable ? (
          <Card style={{ gap: 12, paddingVertical: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
                <BrushRing value={0} size={64} stroke={8} color={P.line} />
                <View style={{ position: 'absolute' }}>
                  <Icon name={missingNight ? 'moon' : 'heart'} size={24} color={P.indigo} />
                </View>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Ink size={20} weight="black" tight>
                  {messageScoreIncomplet(missingNight)}
                </Ink>
                <Ink size={13} weight="medium" color={P.ink2}>
                  {traduire("Pour l’instant, seul {0} est mesuré. Le détail est juste en dessous.", forme?.factors[0]?.label.toLowerCase() ?? 'un élément')}
                </Ink>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: P.paper }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: level.color }} />
              <Ink size={13} weight="bold" color={P.ink2} style={{ flex: 1 }}>
                {traduire("Indication de ce seul élément : {0}. {1}", level.label.toLowerCase(), level.advice)}
              </Ink>
            </View>
            {missingNight ? <BigButton label={traduire("Noter ma nuit")} icon="moon" onPress={() => router.push('/sleep-input' as any)} /> : null}
          </Card>
        ) : score !== null && level ? (
          <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
            <View style={{ width: 176, height: 176, alignItems: 'center', justifyContent: 'center' }}>
              <BrushRing value={score / 100} size={176} stroke={16} color={level.color} />
              <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Ink size={58} weight="black" tight color={level.color}>
                  {String(score)}
                </Ink>
                <Ink size={13} weight="bold" color={P.muted} style={{ marginTop: -4 }}>
                  {traduire("sur 100")}</Ink>
              </View>
            </View>
            <Ink size={22} weight="black" tight>
              {traduire(level.label)}
            </Ink>
            <Ink size={15} weight="medium" color={P.ink2} style={{ textAlign: 'center', paddingHorizontal: 12 }}>
              {level.advice}
            </Ink>
            <Ink size={12} weight="bold" color={P.muted}>
              {traduirePluriel((forme?.factors.length ?? 0), (forme?.factors.length ?? 0) > 1, "Calculé sur {0} élément mesuré", "Calculé sur {0} éléments mesurés", forme?.factors.length ?? 0)}
            </Ink>
          </Card>
        ) : (
          <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 26 }}>
            <Ornement name="koi" size={88} />
            <Ink size={20} weight="black" tight style={{ textAlign: 'center' }}>
              {loaded ? traduire('Pas encore assez de données') : traduire('On écoute ton corps')}
            </Ink>
            <Ink size={14} weight="medium" color={P.ink2} style={{ textAlign: 'center', paddingHorizontal: 8 }}>
              {traduire("Note ta nuit ou ta prochaine séance. On ne te donne un score que s’il repose sur du vrai.")}</Ink>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 6 }}>
              <View style={{ flex: 1 }}>
                <BigButton label={traduire("Ma nuit")} icon="moon" tone="light" compact onPress={() => router.push('/sleep-input' as any)} />
              </View>
              <View style={{ flex: 1 }}>
                <BigButton label={traduire("Une séance")} icon="plus" compact onPress={() => router.push('/ajouter' as any)} />
              </View>
            </View>
          </Card>
        )}
      </Enter>

      {/* Facteurs */}
      {forme && (forme.factors.length > 0 || forme.missing.length > 0) ? (
        <Enter i={1} style={{ gap: 10 }}>
          <SectionTitle>{traduire("Ce qui compte aujourd’hui")}</SectionTitle>
          <Card style={{ gap: 16 }}>
            {forme.factors.map((f) => (
              <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={FACTOR_ICON[f.key]} size={20} color={colorFor(f.score)} />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Ink size={15} weight="extraBold">
                      {traduire(f.label)}
                    </Ink>
                    <Ink size={15} weight="black" color={colorFor(f.score)}>
                      {String(f.score)}
                    </Ink>
                  </View>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: P.line2, overflow: 'hidden' }}>
                    <View style={{ width: `${Math.max(4, f.score)}%`, height: 8, borderRadius: 4, backgroundColor: colorFor(f.score) }} />
                  </View>
                  <Ink size={12} weight="bold" color={P.ink2}>
                    {f.detail}
                  </Ink>
                </View>
              </View>
            ))}
            {forme.missing.map((k) => {
              const m = MISSING[k];
              if (!m) return null;
              return (
                <Press key={k} onPress={() => (m.href ? router.push(m.href as any) : undefined)} haptic={m.href ? 'light' : 'none'} accessibilityRole="button" accessibilityLabel={`${m.label} : ${m.text}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 13, borderWidth: 1.5, borderStyle: 'dashed', borderColor: P.dashed, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={FACTOR_ICON[k]} size={18} color={P.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Ink size={15} weight="extraBold" color={P.ink2}>
                        {traduire(m.label)}
                      </Ink>
                      <Ink size={12} weight="bold" color={m.href ? P.accent : P.muted}>
                        {traduire(m.text)}
                      </Ink>
                    </View>
                    {m.href ? <Icon name="chevron" size={18} color={P.muted} /> : null}
                  </View>
                </Press>
              );
            })}
          </Card>
        </Enter>
      ) : null}

      {/* Energie de la semaine */}
      <Enter i={2} style={{ gap: 10 }}>
        <SectionTitle>{traduire("Ton énergie")}</SectionTitle>
        <Card style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat value={String(forme?.sessions7 ?? 0)} label={traduire("séances en 7 jours")} />
            <Stat value={forme && forme.minutes7 > 0 ? formatMinutes(forme.minutes7) : '0'} label={traduire("d’entraînement")} />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat value={forme?.sleepAvg7 ? formatMinutes(forme.sleepAvg7) : traduire('pas noté')} label={traduire("de sommeil par nuit, 7 nuits")} color={P.indigo} />
            <Stat
              value={forme?.daysSinceLast === null || forme?.daysSinceLast === undefined ? 'aucune' : forme.daysSinceLast === 0 ? traduire('aujourd’hui') : forme.daysSinceLast === 1 ? 'hier' : traduire("{0} jours", forme.daysSinceLast)}
              label={traduire("dernière séance")}
            />
          </View>
          {sleep && sleep.sleepDebtHours > 0 ? (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: P.indigoSoft, borderRadius: 16, padding: 12 }}>
              <Icon name="moon" size={18} color={P.indigo} />
              <Ink size={13} weight="bold" color={P.indigo} style={{ flex: 1 }}>
                {traduire("Il te manque {0} h de sommeil sur 7 jours. Couche-toi un peu plus tôt ce soir.", String(sleep.sleepDebtHours).replace('.', DECIMAL))}
              </Ink>
            </View>
          ) : null}
        </Card>
        {recent.length > 0 ? (
          <Card style={{ gap: 4, paddingVertical: 10 }}>
            {recent.map((t, i) => (
              <Press key={`${t.id ?? i}`} onPress={() => router.push('/seances' as any)} accessibilityRole="button" accessibilityLabel={getSportName(t.sport)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: P.line2 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: P.accent }} />
                  <Ink size={15} weight="extraBold" style={{ flex: 1 }} numberOfLines={1}>
                    {getSportName(t.sport)}
                  </Ink>
                  <Ink size={13} weight="bold" color={P.ink2}>
                    {`${relativeDay(t.date)}${(t.duration_minutes ?? t.duration) ? `, ${formatMinutes(t.duration_minutes ?? t.duration ?? 0)}` : ''}`}
                  </Ink>
                </View>
              </Press>
            ))}
          </Card>
        ) : null}
      </Enter>

      {/* Etat du corps */}
      <Enter i={3} style={{ gap: 10 }}>
        <SectionTitle>{traduire("Ton corps")}</SectionTitle>
        <Ink size={14} weight="medium" color={P.ink2} style={{ paddingHorizontal: 4 }}>
          {traduire("Touche une zone pour signaler une gêne ou une blessure. Ta récupération en tient compte.")}</Ink>
        <BodyZones body={forme?.body ?? {}} onChange={() => load()} />
      </Enter>

      <Enter i={4}>
        <Card style={{ backgroundColor: P.goldSoft, borderColor: P.goldSoft, gap: 6 }}>
          <Ink size={15} weight="extraBold" color={P.goldDark}>
            {traduire("Comment on calcule")}</Ink>
          {RECUP_METHOD.map((l) => (
            <Ink key={l} size={13} weight="medium" color={P.ink2} style={{ lineHeight: 19 }}>
              {l}
            </Ink>
          ))}
        </Card>
      </Enter>
    </DetailScreen>
  );
}
