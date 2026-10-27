/**
 * « Une question ? » (27 octobre 2026) : les quatre tuiles qui étaient sur l'accueil du coach (poids de départ,
 * séries et répétitions, quand monter la charge, quand j'atteins mon but), avec leurs feuilles. Décision du
 * 27 octobre : elles vont à la fin du Guide (app/coach-depart.tsx) et en bas de la page du programme
 * (app/programmes/[id].tsx). Textes et études inchangés (charge.ts, catalogue.ts), repris de app/coach.tsx.
 */
import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { ombrePastel, usePastel } from '@/components/yoroi/v2/programmes/Habillage';
import { FeuillePoidsDeDepart } from '@/components/yoroi/v2/programmes/PoidsDeDepart';
import { PROGRESSION } from '@/lib/v2/programmes/catalogue';
import { sourceParId } from '@/lib/v2/programmes/sources';
import { safeOpenURL } from '@/lib/security/validators';
import { COMMENT_CHOISIR, POIDS_DE_DEPART, SOURCES_COMMENT_CHOISIR } from '@/lib/v2/programmes/charge';
import { traduire } from '@/lib/i18n/tr';

type Cle = 'poids' | 'series' | 'monter' | 'but';

export function QuestionsCoach() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pa = usePastel();
  const router = useRouter();
  const [poidsOuvert, setPoidsOuvert] = useState(false);
  const [seriesOuvert, setSeriesOuvert] = useState(false);
  const [monterOuvert, setMonterOuvert] = useState(false);
  const tuiles: { cle: Cle; titre: string; action: () => void }[] = [
    { cle: 'poids', titre: traduire('Quel poids je prends'), action: () => { tap(); setPoidsOuvert(true); } },
    { cle: 'series', titre: traduire('Séries et répétitions'), action: () => { tap(); setSeriesOuvert(true); } },
    { cle: 'monter', titre: traduire('Quand monter la charge'), action: () => { tap(); setMonterOuvert(true); } },
    { cle: 'but', titre: traduire('Quand j’atteins mon but'), action: () => { tap(); router.push('/objectif' as any); } },
  ];
  return (
    <View style={{ gap: 10 }}>
      <Ink size={16} weight="black" tight color={pa.texte} accessibilityRole="header" style={{ marginHorizontal: 2 }}>{traduire('Une question ?')}</Ink>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {tuiles.map((t) => (
          <Pressable
            key={t.cle}
            onPress={t.action}
            accessibilityRole="button"
            accessibilityLabel={t.titre}
            style={({ pressed }) => [{ width: '47%', flexGrow: 1, minHeight: 92, borderRadius: 20, padding: 12, gap: 8, backgroundColor: pressed ? pa.choisi : pa.carte }, ombrePastel(pa.ombre)]}
          >
            <ApercuQuestion cle={t.cle} />
            <Ink size={13} weight="extraBold" color={pa.texte} style={{ lineHeight: 17 }}>{t.titre}</Ink>
          </Pressable>
        ))}
      </View>

      <FeuillePoidsDeDepart visible={poidsOuvert} onClose={() => setPoidsOuvert(false)} />

      <Sheet visible={seriesOuvert} onClose={() => setSeriesOuvert(false)} title={traduire('Combien de séries et de répétitions ?')}>
        <View style={{ gap: 14, paddingHorizontal: 4 }}>
          <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{traduire('Ton programme te donne les séries et la fourchette de répétitions de chaque exercice. Voici comment choisir ta charge.')}</Ink>
          {COMMENT_CHOISIR.map((x) => (
            <View key={x.titre} style={{ gap: 3 }}>
              <Ink size={15} weight="black" tight>{traduire(x.titre)}</Ink>
              <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{traduire(x.texte)}</Ink>
            </View>
          ))}
          <View style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider }}>
            <Ink size={12} weight="extraBold" color={c.textMuted}>{traduire('LES ÉTUDES')}</Ink>
            {SOURCES_COMMENT_CHOISIR.map((id) => {
              const s = sourceParId(id);
              if (!s) return null;
              return (
                <Pressable key={id} onPress={() => { tap(); void safeOpenURL(s.lien); }} accessibilityRole="link" style={{ minHeight: 40, justifyContent: 'center' }}>
                  <Ink size={12} weight="extraBold" color={c.accent}>{`${s.auteurs}, ${s.annee}`}</Ink>
                  <Ink size={12} color={c.textSecondary}>{traduire(s.apport)}</Ink>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Sheet>

      <Sheet visible={monterOuvert} onClose={() => setMonterOuvert(false)} title={traduire('Quand monter la charge')}>
        <View style={{ gap: 14, paddingHorizontal: 4, paddingBottom: 8 }}>
          <Ink size={15} weight="bold" style={{ lineHeight: 21 }}>{traduire(PROGRESSION)}</Ink>
          {POIDS_DE_DEPART.slice(2).map((x) => (
            <View key={x.titre} style={{ gap: 3 }}>
              <Ink size={15} weight="black" tight>{traduire(x.titre)}</Ink>
              <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{traduire(x.texte)}</Ink>
            </View>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

/** Le petit visuel de chaque question : la barre chargée, 3 × 10, la courbe qui monte, l'anneau rempli */
function ApercuQuestion({ cle }: { cle: Cle }) {
  const pa = usePastel();
  const illus = useIllustrations();
  if (cle === 'series') {
    return (
      <View style={{ height: 30, flexDirection: 'row', alignItems: 'center', gap: 6 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Ink size={22} weight="black" color={pa.menthe.titre}>3</Ink>
        <Ink size={14} weight="black" color={pa.texte2}>×</Ink>
        <Ink size={22} weight="black" color={pa.menthe.titre}>10</Ink>
      </View>
    );
  }
  if (cle === 'but' && illus.stickers) {
    return <Image source={illus.img('calendrier')} style={{ width: 34, height: 34 }} resizeMode="contain" accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={{ height: 30 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {cle === 'poids' ? (
        <Svg width="100%" height={30} viewBox="0 0 140 30" preserveAspectRatio="none">
          <Rect x={0} y={13} width={140} height={4} rx={2} fill={pa.bleu.fond} />
          <Rect x={18} y={4} width={10} height={22} rx={3} fill={pa.bleu.barre} />
          <Rect x={30} y={7} width={8} height={16} rx={3} fill={pa.bleu.barre2} />
          <Rect x={112} y={4} width={10} height={22} rx={3} fill={pa.bleu.barre} />
          <Rect x={102} y={7} width={8} height={16} rx={3} fill={pa.bleu.barre2} />
        </Svg>
      ) : cle === 'monter' ? (
        <Svg width="100%" height={30} viewBox="0 0 140 30" preserveAspectRatio="none">
          <Path d="M4 26 C30 24, 40 18, 60 18 S 100 10, 132 4" fill="none" stroke={pa.creme.titre} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={132} cy={4} r={3.5} fill={pa.carte} stroke={pa.creme.titre} strokeWidth={2.5} />
        </Svg>
      ) : (
        <Svg width={30} height={30} viewBox="0 0 36 36">
          <Circle cx={18} cy={18} r={14} fill="none" stroke={pa.lilas.fond} strokeWidth={5} />
          <Circle cx={18} cy={18} r={14} fill="none" stroke={pa.lilas.barre} strokeWidth={5} />
          <Path d="M12 18l4 4 8-8" fill="none" stroke={pa.lilas.titre} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  );
}
