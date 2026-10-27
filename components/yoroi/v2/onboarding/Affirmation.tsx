/**
 * Ecran 7 de l'onboarding : « Tu n'es pas un cas a part », puis tes rappels.
 * Vague 27 a 49 : une affirmation qui rassure, choisie selon ce qui t'a freine (lib/v2/onboarding/freins.ts, affirmationMelee),
 * les tampons des freins, le texte et les points dans la couleur de chaque frein. Aucun chiffre ni etude.
 * 27 octobre 2026, refonte complete (Houari : « un truc qui tue, incroyable » ; le texte du bas etait coupe et Continuer
 * restait grise avec « Descends pour continuer ») :
 *  1. en haut, compact : les tampons, le titre, le texte, les points en petites pastilles ;
 *  2. le grand bloc des rappels : un apercu de deux vraies notifications de YOROI (les textes de
 *     lib/v2/notifications/discipline.ts), qui arrivent l'une apres l'autre, et un bouton clair « Activer mes rappels ».
 *     Il allume le rappel de seance (sur tes jours d'entrainement, choisis plus loin) et le rappel de pesee, en passant
 *     par la meme demande que partout (permissionPourRappels : un mot d'explication puis la fenetre du systeme).
 *     Refuse : le lien vers Reglages. « Choisir mes rappels » ouvre le reglage detaille, comme avant ;
 *  3. Continuer est toujours actif : rien n'oblige a descendre ni a activer.
 * Reduire les animations : tout est affiche d'un coup.
 */
import React, { useState } from 'react';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import type { Frein } from '@/lib/v2/onboarding/draft';
import { affirmationMelee } from '@/lib/v2/onboarding/freins';
import { Tampon } from '@/components/yoroi/v2/tampons/Tampon';
import { RappelsDiscipline } from '@/components/yoroi/v2/notifications/RappelsDiscipline';
import type { ChoixRappels } from '@/lib/v2/notifications/discipline';
import { MESSAGES_PESEE, MESSAGES_SEANCE } from '@/lib/v2/notifications/discipline';
import { ouvrirReglagesSysteme, permissionPourRappels } from '@/lib/v2/notifications/rappels';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { ENCRE_FREIN, TAMPON_FREIN } from './Frein';
import { ENCRES_THEME as ENCRES } from './couleurs';
import { MainButton, Shell, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

// le logo actuel de l'app (app.json, icon), jamais l'ancienne mascotte
const ICONE_APP = require("@/assets/logo d'app/yoroi-logo2.png");
const LILAS = '#8A3F78';
const BLEU = '#3557D9';
const MENTHE = '#1C6B45';

/** « du texte **cle** » vers des morceaux, les cles en gras et en couleur */
export function morceaux(t: string): { txt: string; cle: boolean }[] {
  return t.split('**').map((txt, i) => ({ txt, cle: i % 2 === 1 })).filter((m) => m.txt.length > 0);
}

/** Une vraie notification de YOROI, telle qu'elle arrive sur l'ecran verrouille */
function Notif({ titre, texte, quand, delai, calme }: { titre: string; texte: string; quand: string; delai: number; calme: boolean }) {
  const c = useColors();
  return (
    <Animated.View
      entering={calme ? undefined : FadeInDown.delay(delai).duration(420)}
      style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: 18, padding: 11, shadowColor: c.shadow, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
    >
      <Image source={ICONE_APP} style={{ width: 34, height: 34, borderRadius: 8 }} accessibilityIgnoresInvertColors />
      <View style={{ flex: 1, gap: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <Ink size={11.5} weight="black" color={c.textSecondary} style={{ letterSpacing: 0.6 }}>YOROI</Ink>
          <Ink size={11} weight="bold" color={c.textMuted}>{quand}</Ink>
        </View>
        <Ink size={14} weight="black" color="#1D2033" numberOfLines={1}>{titre}</Ink>
        <Ink size={13} weight="medium" color="#1D2033" style={{ lineHeight: 17 }} numberOfLines={2}>{texte}</Ink>
      </View>
    </Animated.View>
  );
}

/** Le grand bloc des rappels : l'apercu, le bouton, puis l'etat (actifs, refuses) */
function BlocRappels({ value, onChange, apercu }: { value: ChoixRappels; onChange: (r: ChoixRappels) => void; apercu: boolean }) {
  const c = useColors();
  const calme = !!useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [refuse, setRefuse] = useState(false);
  const [detail, setDetail] = useState(false);
  const actifs = value.seance.actif || value.pesee.actif || value.eau.actif || value.bilan.actif;

  const activer = async () => {
    if (busy) return;
    tap('medium');
    if (!apercu) {
      setBusy(true);
      try {
        const r = await permissionPourRappels('onboarding');
        if (r === 'refuse') {
          setRefuse(true);
          return;
        }
        if (r === 'plus_tard') return;
        setRefuse(false);
      } finally {
        setBusy(false);
      }
    }
    tap('success');
    onChange({ ...value, seance: { ...value.seance, actif: true }, pesee: { ...value.pesee, actif: true } });
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={{ borderRadius: 26, overflow: 'hidden' }}>
        <LinearGradient colors={['#E8ECFF', '#EFE6F3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 16, gap: 12 }}>
          <View style={{ gap: 3 }}>
            <Ink size={11} weight="black" color={LILAS} style={{ letterSpacing: 1.3 }}>{traduire('LE PLUS EFFICACE POUR TENIR')}</Ink>
            <Ink size={22} weight="black" tight color={c.ink} style={{ lineHeight: 26 }}>
              {traduire('Ton coach, ')}
              <Ink size={22} weight="black" tight color={BLEU}>{traduire('dans ta poche')}</Ink>
            </Ink>
            <Ink size={13.5} weight="medium" color={c.textSecondary} style={{ lineHeight: 19 }}>{traduire('Un rappel les jours où tu t’entraînes, un autre si ta pesée manque. Rien d’autre.')}</Ink>
          </View>
          <View style={{ gap: 7 }} accessible accessibilityLabel={traduire('Exemple de notifications de YOROI : {0}. {1}', MESSAGES_SEANCE[0].title, MESSAGES_PESEE[0])}>
            <Notif titre={MESSAGES_SEANCE[0].title} texte={MESSAGES_SEANCE[0].body} quand={traduire('18 h')} delai={350} calme={calme} />
            <Notif titre={traduire('Ta pesée')} texte={MESSAGES_PESEE[0]} quand={traduire('7 h 30')} delai={900} calme={calme} />
          </View>
          {actifs ? (
            <Animated.View entering={calme ? undefined : FadeIn.duration(260)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, borderRadius: 18, backgroundColor: '#E3F2EA', paddingHorizontal: 14 }} accessibilityLiveRegion="polite">
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: MENTHE, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="check" size={15} color="#FFFFFF" stroke={3} />
              </View>
              <Ink size={15} weight="black" color={MENTHE} style={{ flex: 1 }}>{traduire('Tes rappels sont activés')}</Ink>
            </Animated.View>
          ) : (
            <Pressable
              onPress={() => void activer()}
              accessibilityRole="button"
              accessibilityLabel={traduire('Activer mes rappels')}
              accessibilityState={{ busy }}
              style={({ pressed }) => ({ minHeight: 58, borderRadius: 18, backgroundColor: pressed ? '#1A2870' : '#23358F', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: busy ? 0.7 : 1 })}
            >
              <Icon name="bell" size={19} color="#FFFFFF" stroke={2.4} />
              <Ink size={17} weight="black" color="#FFFFFF">{busy ? traduire('Un instant') : traduire('Activer mes rappels')}</Ink>
            </Pressable>
          )}
        </LinearGradient>
      </View>
      {refuse ? (
        <Animated.View entering={FadeIn.duration(180)} style={{ borderRadius: 18, backgroundColor: c.goldTint, padding: 14, gap: 10 }}>
          <Ink size={13.5} weight="bold" style={{ lineHeight: 19 }}>{traduire('Les notifications de YOROI sont coupées sur ton téléphone. Tu peux les autoriser dans Réglages, puis revenir ici.')}</Ink>
          <Pressable onPress={ouvrirReglagesSysteme} accessibilityRole="link" style={({ pressed }) => ({ minHeight: 44, borderRadius: 14, backgroundColor: pressed ? c.primaryPressed : c.primary, alignItems: 'center', justifyContent: 'center' })}>
            <Ink size={14.5} weight="extraBold" color={c.onPrimary}>{traduire('Ouvrir les Réglages')}</Ink>
          </Pressable>
        </Animated.View>
      ) : null}
      <Pressable onPress={() => setDetail((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: detail }} hitSlop={6} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Ink size={14} weight="extraBold" color={c.accent}>{detail ? traduire('Masquer le détail') : traduire('Choisir mes rappels un par un')}</Ink>
        <Icon name={detail ? 'up' : 'down'} size={15} color={c.accent} stroke={2.6} />
      </Pressable>
      {detail ? (
        <Animated.View entering={calme ? undefined : FadeIn.duration(220)}>
          <RappelsDiscipline value={value} onChange={onChange} ecran="onboarding" apercu={apercu} joursAutoTexte={traduire('Tes jours d’entraînement, choisis plus loin. Ou touche tes jours ici.')} />
        </Animated.View>
      ) : null}
      <Ink size={12} weight="medium" color={c.textMuted} style={{ textAlign: 'center', lineHeight: 17 }}>{traduire('Rien ne s’allume sans toi. Tu changes tout dans Réglages, Rappels.')}</Ink>
    </View>
  );
}

export function Affirmation({ nav, name, freins, genre = null, rappels, onRappels, apercu = false, onNext }: {
  nav: Nav;
  name: string;
  freins: Frein[];
  genre?: 'h' | 'f' | null;
  rappels: ChoixRappels;
  onRappels: (r: ChoixRappels) => void;
  /** apercu du Studio : rien n'est demande au systeme */
  apercu?: boolean;
  onNext: () => void;
}) {
  const c = useColors();
  const a = affirmationMelee(freins, genre);
  const e = ENCRE_FREIN[a.principal] ?? ENCRES.indigo;
  const prenom = name.trim();
  const { height, width } = useWindowDimensions();
  const petit = height < 720;
  const titre = prenom ? `${prenom}, ${a.titre.charAt(0).toLowerCase()}${a.titre.slice(1)}` : a.titre;
  const n = a.freins.length;
  const tSize = n === 1 ? (petit ? 60 : 76) : Math.min(petit ? 48 : 62, Math.floor((width - 44 + (n - 1) * 12) / n));
  const fs = petit ? 15 : 16;
  return (
    <Shell {...nav} gap={petit ? 10 : 14} footer={<MainButton label={traduire('Continuer')} onPress={onNext} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flexDirection: 'row' }}>
          {a.freins.slice(0, 3).map((f, i) => (
            <Tampon key={f} name={TAMPON_FREIN[f] ?? 'frein_rien'} size={tSize} rotate={[-7, 5, -3][i] ?? 0} ink={(ENCRE_FREIN[f] ?? ENCRES.indigo).ink} animate style={{ marginLeft: i ? -12 : 0 }} accessibilityLabel={null} />
          ))}
        </View>
        <Ink size={petit ? 22 : 25} weight="black" tight maxFontSizeMultiplier={1.15} style={{ flex: 1, lineHeight: petit ? 26 : 29 }} accessibilityRole="header">{titre}</Ink>
      </View>
      <Ink size={fs} weight="medium" color={c.ink} maxFontSizeMultiplier={1.15} style={{ lineHeight: Math.round(fs * 1.42) }}>
        {morceaux(a.texte).map((m, i) => (m.cle ? <Ink key={i} size={fs} weight="black" color={e.ink} maxFontSizeMultiplier={1.15}>{m.txt}</Ink> : m.txt))}
        {a.lien ? ' ' : ''}
        {a.lien
          ? morceaux(a.lien).map((m, i, all) => {
              if (!m.cle) return m.txt;
              const k = all.slice(0, i).filter((x) => x.cle).length;
              const ink = (ENCRE_FREIN[a.autres[k]] ?? e).ink;
              return <Ink key={`l${i}`} size={fs} weight="black" color={ink} maxFontSizeMultiplier={1.15}>{m.txt}</Ink>;
            })
          : null}
      </Ink>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {a.points.map((p) => {
          const pe = ENCRE_FREIN[p.frein] ?? e;
          return (
            <View key={p.texte} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, backgroundColor: pe.fond, paddingHorizontal: 10, paddingVertical: 7 }}>
              <Icon name="check" size={13} color={pe.ink} stroke={3} />
              <Ink size={13} weight="extraBold" color={c.ink} maxFontSizeMultiplier={1.15}>{traduire(p.texte)}</Ink>
            </View>
          );
        })}
      </View>
      <BlocRappels value={rappels} onChange={onRappels} apercu={apercu} />
    </Shell>
  );
}

export default Affirmation;
