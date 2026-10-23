/**
 * Le chemin de l'armure (vague 14) : ton personnage sur ta scene dans le cadre de ton rang,
 * la piece du palier suivant qui se construit en 3 etapes (vague 40), les 5 rangs en chemin vertical avec la piece gagnee
 * a chacun, les dan apres Shogun, et comment gagner de l'XP.
 * Vague 45 : l'univers du personnage (noms des rangs, tenues, pieces) ; « Sans personnage » montre la piece de chaque rang.
 */
import React from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ArmureEnConstruction, EtapesPiece } from '@/components/yoroi/v2/dojo/ArmureEnConstruction';
import { construction } from '@/lib/v2/dojo/pieces';
import { BreathingFigure, GlassTag, ScenePlate } from '@/components/yoroi/v2/dojo/DojoHero';
import { BackHeader, CheckIcon, ChevronIcon, LockIcon, RankFrame, formatXp, tap } from '@/components/yoroi/v2/dojo/parts';
import { DAN_STEP, RANKS, danLabel, xpRulesFor } from '@/lib/v2/armure';
import { useArmure } from '@/lib/v2/dojo/useArmure';
import { THEME_IMAGES, aUnPersonnage, personnageImage } from '@/lib/v2/dojo/personnages';
import { pieceDuRang } from '@/lib/v2/dojo/pieces';
import { libelleChemin, libelleConstruction, rangNom, rangTenue, rangTitre } from '@/lib/v2/dojo/univers';
import { imageDuRang, universDe } from '@/lib/v2/dojo/dojoAffichage';

const NB = ' ';
/** au rythme de 3 seances par semaine (simulation du moteur d'XP) */
const DUREES = ['au départ', 'environ 1 semaine', 'environ 3 mois', 'environ 1 an', 'plusieurs années'];

export default function Rangs() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { snap, espace } = useArmure();
  const st = snap?.state;
  const xp = st?.xp ?? 0;
  const current = st?.rank.index ?? 0;
  const dan = st?.rank.dan ?? 0;
  // Vague 45 : l'univers choisi donne les noms, les tenues et les pieces
  const u = universDe(espace);
  const avecPerso = aUnPersonnage(espace.personnage);
  const title = rangTitre(current, dan, u);
  const rules = xpRulesFor(st?.weeklyGoal ?? espace.objectifSemaine);
  const W = width - 44;
  const heroH = Math.round(Math.min(400, Math.max(330, W * 1.05)));
  const figH = heroH - 100;
  const figW = Math.round((figH * 3) / 4);
  const cons = construction(xp, u);
  const image = personnageImage(espace.personnage, current, st?.sportCounts ?? {});
  // Vague 45 : ce que gagne chaque rang, la tenue du personnage ou, sans personnage, la piece du rang
  const gainDuRang = (i: number) => (avecPerso ? rangTenue(i, u) : i >= 1 ? pieceDuRang(i, u).nom : 'Le départ');
  const sousTitre = !avecPerso ? 'Chaque rang débloque une nouvelle pièce' : u === 'classique' ? 'Chaque rang ajoute une pièce à ta tenue' : 'Chaque rang ajoute une pièce à ton armure';

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        <BackHeader title={libelleChemin(u)} subtitle={sousTitre} />

        <Animated.View entering={ENTREE}>
          <RankFrame rankIndex={current} dan={dan}>
          <ScenePlate scene={THEME_IMAGES[espace.scene] ?? THEME_IMAGES.dojo} height={heroH}>
            <View style={{ position: 'absolute', left: 14, top: 14, right: 14, flexDirection: 'row' }}>
              <GlassTag style={{ maxWidth: '86%' }}>
                <Ink size={12} weight="extraBold" color={c.goldDeep}>{`Ton rang, ${current + 1} sur ${RANKS.length}`}</Ink>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Ink size={28} weight="black" tight numberOfLines={1} style={{ flexShrink: 1 }}>{title}</Ink>
                </View>
              </GlassTag>
            </View>
            {/* Vague 45 : « Sans personnage », la scene seule */}
            {avecPerso ? (
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' }}>
                <BreathingFigure source={image} width={figW} height={figH} label={`Ton personnage au rang ${rangNom(current, u)}`} />
              </View>
            ) : null}
          </ScenePlate>
          </RankFrame>
        </Animated.View>

        <Animated.View
          entering={ENTREE}
          accessible
          accessibilityLabel={`${cons.titre}, étape ${cons.enCours} sur 3. ${formatXp(xp)} XP sur ${formatXp(cons.objectifXp)}, encore ${formatXp(cons.resteXp)} XP`}
          style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, gap: 12 }}
        >
          <View style={{ gap: 3 }}>
            <Ink size={12} weight="extraBold" color={c.textMuted}>{libelleConstruction(u)}</Ink>
            <Ink size={19} weight="black" tight numberOfLines={2}>{cons.titre}</Ink>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <ArmureEnConstruction piece={cons.piece} progres={cons.progres} taille={104} />
            <View style={{ flex: 1, gap: 8 }}>
              {[2, 1, 0].map((i) => {
                const fait = i < cons.faites;
                const encours = i === cons.faites;
                return (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: fait ? c.gold : 'transparent', borderWidth: fait ? 0 : 2, borderColor: encours ? c.gold : c.divider }}>
                      {fait ? <CheckIcon size={12} color="#FFFFFF" /> : null}
                    </View>
                    <Ink size={13} weight={encours ? 'extraBold' : 'bold'} color={fait || encours ? c.ink : c.textMuted} style={{ flex: 1 }} numberOfLines={2}>
                      {`${cons.piece.etapes[i].charAt(0).toUpperCase()}${cons.piece.etapes[i].slice(1)}`}
                    </Ink>
                  </View>
                );
              })}
            </View>
          </View>
          <EtapesPiece faites={cons.faites} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Ink size={15} weight="black" style={{ flex: 1 }} numberOfLines={1}>{`${formatXp(xp)} / ${formatXp(cons.objectifXp)}${NB}XP`}</Ink>
            <Ink size={13} weight="extraBold" color={c.accent} numberOfLines={1}>{`encore ${formatXp(cons.resteXp)}${NB}XP`}</Ink>
          </View>
        </Animated.View>

        {/* Le chemin */}
        <Animated.View entering={ENTREE} style={{ gap: 0, marginTop: 6 }}>
          <Ink size={20} weight="black" tight style={{ paddingHorizontal: 2, marginBottom: 10 }} accessibilityRole="header">Les 5 rangs</Ink>
          {RANKS.map((k, i) => {
            const done = k.index < current;
            const here = k.index === current;
            const last = false;
            const visuel = imageDuRang(espace.personnage, k.index, u);
            return (
              <View key={k.id} style={{ flexDirection: 'row', gap: 14 }}>
                {/* colonne du chemin */}
                <View style={{ width: 76, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 76,
                      height: 96,
                      borderRadius: 18,
                      overflow: 'hidden',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      backgroundColor: here ? c.accentTint : done ? c.successTint : c.fillSoft,
                      borderWidth: here ? 2 : 1,
                      borderColor: here ? c.accent : done ? '#D3DEC4' : c.border,
                      borderStyle: done || here ? 'solid' : 'dashed',
                    }}
                  >
                    {/* Vague 45 : la figure du rang, ou sa piece sans personnage (le premier rang montre son numero) */}
                    {visuel.image ? (
                      <Image
                        source={visuel.image}
                        style={visuel.piece ? { width: 60, height: 60, marginBottom: 18, opacity: done || here ? 1 : 0.32 } : { width: 76, height: 92, opacity: done || here ? 1 : 0.32 }}
                        resizeMode="contain"
                        accessibilityLabel={`${rangNom(k.index, u)}, ${gainDuRang(k.index).toLowerCase()}`}
                      />
                    ) : (
                      <View style={{ flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
                        <Ink size={28} weight="black" color={done || here ? c.accent : c.textMuted}>{String(k.index + 1)}</Ink>
                      </View>
                    )}
                  </View>
                  {!last ? <View style={{ width: 3, flex: 1, minHeight: 18, borderRadius: 2, backgroundColor: done ? c.success : c.border }} /> : null}
                </View>
                <View style={{ flex: 1, paddingTop: 8, paddingBottom: last ? 0 : 18, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ink size={18} weight="black" tight color={done || here ? c.ink : c.textSecondary} style={{ flexShrink: 1 }}>{rangNom(k.index, u)}</Ink>
                    <View style={{ flex: 1 }} />
                    {done ? <CheckIcon size={20} color={c.success} /> : here ? null : <LockIcon size={18} color={c.textMuted} />}
                  </View>
                  <Ink size={13} color={done || here ? c.textSecondary : c.textMuted}>{gainDuRang(k.index)}</Ink>
                  {here ? (
                    <View style={{ alignSelf: 'flex-start', marginTop: 4, borderRadius: 999, backgroundColor: c.accent, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Ink size={12} weight="extraBold" color={c.onAccent}>Tu es ici</Ink>
                    </View>
                  ) : (
                    <Ink size={12} weight="bold" color={c.textMuted}>
                      {done ? `Gagné, dès ${formatXp(k.minXp)}${NB}XP` : `${formatXp(k.minXp)}${NB}XP, ${DUREES[k.index]}`}
                    </Ink>
                  )}
                </View>
              </View>
            );
          })}
          {/* Apres Shogun : les dan */}
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ width: 76, alignItems: 'center' }}>
              <View style={{ width: 76, height: 76, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: dan > 0 ? '#1D2029' : c.fillSoft, borderWidth: 1, borderColor: dan > 0 ? c.goldLight : c.border, borderStyle: dan > 0 ? 'solid' : 'dashed' }}>
                <Glyph kind="laurier" size={44} color={dan > 0 ? c.goldLight : c.textMuted} />
              </View>
            </View>
            <View style={{ flex: 1, paddingTop: 8, gap: 3 }}>
              <Ink size={18} weight="black" tight color={dan > 0 ? c.ink : c.textSecondary}>Les dan</Ink>
              <Ink size={13} color={dan > 0 ? c.textSecondary : c.textMuted}>{`Après ${rangNom(RANKS.length - 1, u)}, un dan tous les ${formatXp(DAN_STEP)}${NB}XP, sans fin.`}</Ink>
              <Ink size={12} weight="bold" color={dan > 0 ? c.goldDeep : c.textMuted}>
                {dan > 0 ? `Tu es ${danLabel(dan)}` : `${danLabel(1)} à ${formatXp(RANKS[RANKS.length - 1].minXp + DAN_STEP)}${NB}XP`}
              </Ink>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={ENTREE} style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, gap: 10, marginTop: 6 }}>
          <Ink size={17} weight="black">Comment gagner de l’XP</Ink>
          {rules.map((rule, i) => (
            <View key={rule.source} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider, paddingTop: i === 0 ? 0 : 10 }}>
              <View style={{ flex: 1 }}>
                <Ink size={14} weight="bold">{rule.label}</Ink>
                <Ink size={12} color={c.textMuted}>{rule.limit}</Ink>
              </View>
              <View style={{ borderRadius: 12, backgroundColor: c.accentTint, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Ink size={14} weight="black" color={c.accent}>{`+${rule.xp}${NB}XP`}</Ink>
              </View>
            </View>
          ))}
          <Ink size={12} color={c.textSecondary}>
            Ton XP ne baisse jamais. Supprimer une séance ne retire rien. Une séance notée plus de 7 jours après sa date ne rapporte pas d’XP (30 jours pour Apple Santé ou une montre). L’historique d’Apple Santé d’avant ton arrivée dans YOROI ne compte pas. Rien n’est lié à un nombre de kilos.
          </Ink>
        </Animated.View>

        <Pressable
          onPress={() => {
            tap();
            router.push('/dojo/journal' as any);
          }}
          accessibilityRole="button"
          style={({ pressed }) => ({ minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 18, backgroundColor: pressed ? c.fillSoft : c.surface, borderWidth: 1, borderColor: c.border })}
        >
          <Ink size={15} weight="bold" style={{ flex: 1 }}>Voir ton journal d’XP</Ink>
          <ChevronIcon />
        </Pressable>
      </ScrollView>
    </View>
  );
}
