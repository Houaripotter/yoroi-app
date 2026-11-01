/**
 * Forme du matin (1er novembre 2026, demande AU, point 3) : 30 secondes, 5 curseurs a stickers (sommeil ressenti,
 * fatigue, courbatures, stress, motivation), un score de forme du jour et sa courbe sur 4 semaines.
 * Jamais impose : « Pas aujourd'hui » le cache jusqu'a demain. Questionnaire de Hooper et Mackinnon (1995),
 * calculs dans lib/v2/mesures/formeMatin.ts.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { notificationAsync, NotificationFeedbackType, selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Aide, Carte, EcranCorps, Lien, MiniCourbe, Sticker, TitreCarte } from '@/components/yoroi/v2/corps/kit';
import { courbeForme, creerForme, enregistrerForme, indiceHooper, ITEMS_FORME, pasAujourdhui, scoreForme, toneForme } from '@/lib/v2/mesures/formeMatin';
import type { ItemForme } from '@/lib/v2/mesures/formeMatin';
import { jourLocal } from '@/lib/v2/mesures/listeStockee';
import { useCorps } from '@/lib/v2/mesures/useCorps';
import { traduire } from '@/lib/i18n/tr';
import type { NomSticker } from '@/components/yoroi/v2/stickers';

const ITEM: Record<ItemForme, { titre: string; bien: string; mal: string; sticker: NomSticker }> = {
  sommeil: { titre: 'Sommeil ressenti', bien: 'très bien dormi', mal: 'très mal dormi', sticker: 'sommeil' },
  fatigue: { titre: 'Fatigue', bien: 'en pleine forme', mal: 'épuisé', sticker: 'energie' },
  courbatures: { titre: 'Courbatures', bien: 'aucune', mal: 'très fortes', sticker: 'muscle' },
  stress: { titre: 'Stress', bien: 'détendu', mal: 'très stressé', sticker: 'cerveau' },
  motivation: { titre: 'Motivation', bien: 'à fond', mal: 'aucune envie', sticker: 'flamme' },
};

const SOURCE_HOOPER = 'Hooper et Mackinnon, Sports Medicine 1995';

export default function FormeMatin() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const corps = useCorps();
  const aujourdhui = jourLocal();
  const deja = corps.formes.find((f) => f.date === aujourdhui);
  const [v, setV] = useState<Partial<Record<ItemForme, number>>>({});
  const vals = { ...(deja ?? {}), ...v } as Partial<Record<ItemForme, number>>;
  const complet = ITEMS_FORME.every((k) => vals[k]);
  const courbe = useMemo(() => courbeForme(corps.formes, aujourdhui), [corps.formes, aujourdhui]);
  const score = deja ? scoreForme(deja) : null;
  const tons = { bien: c.successText, moyen: c.ink, bas: c.danger };

  const enregistrer = async () => {
    const f = creerForme(aujourdhui, vals);
    if (!f) return;
    const ok = await enregistrerForme(f);
    if (ok) notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    setV({});
  };

  return (
    <EcranCorps titre={traduire('Forme du matin')} sousTitre={traduire('30 secondes')} repli="/readiness-detail">
      {score !== null && deja ? (
        <Carte>
          <TitreCarte sticker="recuperation" titre={traduire('Ta forme du jour')} sous={traduire('Indice de Hooper : {0} sur 28, plus il est bas, mieux tu vas', indiceHooper(deja))} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Ink size={44} weight="black" tight color={tons[toneForme(score)]}>{String(score)}</Ink>
            <Ink size={16} weight="bold" color={c.textSecondary}>{traduire('sur 100')}</Ink>
          </View>
        </Carte>
      ) : null}

      <Carte>
        <TitreCarte sticker="lune_soleil" titre={deja ? traduire('Modifier tes réponses') : traduire('Comment tu te sens ce matin ?')} sous={traduire('De 1, au mieux, à 7, au plus mal.')} />
        {ITEMS_FORME.map((k) => (
          <View key={k} style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Sticker nom={ITEM[k].sticker} taille={30} />
              <Ink size={15} weight="extraBold" style={{ flex: 1 }}>{traduire(ITEM[k].titre)}</Ink>
            </View>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                const on = vals[k] === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => {
                      selectionAsync().catch(() => {});
                      setV((o) => ({ ...o, [k]: n }));
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={traduire('{0}, {1} sur 7', traduire(ITEM[k].titre), n)}
                    style={{ flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.ink : n <= 2 ? c.successTint : n >= 6 ? c.dangerTint : c.fillSubtle }}
                  >
                    <Ink size={15} weight="black" color={on ? c.background : c.ink}>{String(n)}</Ink>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Aide>{traduire(ITEM[k].bien)}</Aide>
              <Aide>{traduire(ITEM[k].mal)}</Aide>
            </View>
          </View>
        ))}
        <Pressable
          onPress={enregistrer}
          disabled={!complet}
          accessibilityRole="button"
          accessibilityState={{ disabled: !complet }}
          style={({ pressed }) => ({ minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: !complet ? c.fillSubtle : pressed ? c.fillSoft : c.ink })}
        >
          <Ink size={15} weight="extraBold" color={complet ? c.background : c.textSecondary}>{complet ? traduire('Enregistrer ma forme') : traduire('Réponds aux 5 questions')}</Ink>
        </Pressable>
        {!deja ? (
          <Lien
            label={traduire('Pas aujourd’hui')}
            onPress={() => {
              pasAujourdhui().catch(() => {});
              if (router.canGoBack()) router.back();
            }}
          />
        ) : null}
      </Carte>

      {courbe.length ? (
        <Carte>
          <TitreCarte sticker="courbe_hausse" titre={traduire('Tes 4 dernières semaines')} sous={courbe.length < 3 ? traduire('La courbe se dessine dès la troisième réponse.') : null} />
          <MiniCourbe points={courbe} label={traduire('Forme du matin sur 4 semaines')} digits={0} />
        </Carte>
      ) : null}

      <Aide>{traduire('Score de forme : tes 5 réponses ramenées sur 100, plus haut = mieux. Indice de Hooper : la somme du sommeil, de la fatigue, du stress et des courbatures, de 4 à 28. Source : {0}.', SOURCE_HOOPER)}</Aide>
    </EcranCorps>
  );
}
