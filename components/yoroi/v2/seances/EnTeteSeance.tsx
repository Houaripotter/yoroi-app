/**
 * En-tête de l'onglet Séances (31 octobre 2026, demande de Houari) :
 *  - « Ton programme » : le nom du programme suivi, ce qu'il contient (« PPL, 4 séances par semaine ») et où tu en es
 *    cette semaine (une pastille par séance prévue, pleine quand elle est faite) ;
 *  - selon le jour, sous cette carte : la séance à faire (CarteDuJour.tsx), la carte « Bravo » quand la séance du
 *    jour est faite (résumé et « Partager » vers l'atelier des cartes), ou la carte repos avec la prochaine séance.
 * Tous les chiffres viennent de la vraie séance ou du vrai programme : une donnée absente, une ligne absente.
 * Stickers seulement (trophee et etincelles pour la fête, sommeil pour le repos, carnet pour le programme).
 * 3 novembre 2026 (Houari) : la carte « Bravo » et la carte repos s'ouvrent d'un appui n'importe où, vers la même
 * page que leur lien du bas (la séance faite, le programme). Le bouton et les liens gardent leur propre action.
 */
import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import type { Training } from '@/lib/database';
import { sessionFacts } from '@/lib/v2/seances/weekSummary';
import { sessionTitle } from '@/lib/v2/seances/sessionData';
import { exercisesOf, formatDuration, tonnageParts } from '@/lib/v2/trainingWeek';
import { cardioFait, libelleCardio } from '@/lib/v2/seances/cardioJour';
import { aideKilos, libelleKilos } from '@/lib/v2/seances/kilosSouleves';
import { sansTiret } from '@/lib/v2/texte/sansTiret';
import { traduire } from '@/lib/i18n/tr';
import { tap } from './ui';
import { useCarteA, useTeinte } from './kitA';
import type { TeinteA } from './kitA';

const fr1 = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',');

/** Un sticker qui arrive avec un rebond (mouvement réduit : il apparaît simplement) */
function StickerFete({ nom, taille, angle = 0, delai = 0 }: { nom: NomSticker; taille: number; angle?: number; delai?: number }) {
  const illus = useIllustrations();
  return (
    <Animated.View entering={ZoomIn.springify().damping(10).stiffness(160).delay(delai).reduceMotion(ReduceMotion.System)} style={{ transform: [{ rotate: `${angle}deg` }] }}>
      <Image source={illus.img(nom)} style={{ width: taille, height: taille }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </Animated.View>
  );
}

// ============================================================
// Ton programme
// ============================================================

export function CarteProgramme({ titre, contenu, semaine, faits, prevus, onOpen, onProchaines }: {
  /** « PPL » */
  titre: string;
  /** « 4 séances par semaine » */
  contenu: string;
  /** « semaine 2 sur 8 » */
  semaine?: string;
  faits: number;
  prevus: number;
  onOpen: () => void;
  /** 1er novembre 2026 : « Tes prochaines séances » (app/programmes/prochaines.tsx) */
  onProchaines?: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const illus = useIllustrations();
  const bleu = useTeinte('bleu');
  const menthe = useTeinte('menthe');
  const n = Math.max(1, prevus);
  const fini = faits >= n;
  const progression = fini
    ? traduire('Semaine bouclée : {0} sur {1}', faits, n)
    : traduire('{0} sur {1} cette semaine', Math.min(faits, n), n);
  return (
    <Pressable
      onPress={() => { tap(); onOpen(); }}
      accessibilityRole="button"
      accessibilityLabel={`${traduire('Ton programme')}, ${titre}, ${contenu}, ${progression}`}
      accessibilityHint={traduire('Ouvre ton programme')}
      style={({ pressed }) => [carte, { padding: 14, opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: bleu.fond, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={illus.img('carnet')} style={{ width: 38, height: 38 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Ink size={11} weight="extraBold" color={bleu.texte} style={{ letterSpacing: 1.4 }}>{traduire('Ton programme').toLocaleUpperCase()}</Ink>
          <Ink size={19} weight="black" tight numberOfLines={2}>{sansTiret(titre)}</Ink>
          <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={2}>{sansTiret([contenu, semaine].filter(Boolean).join(', '))}</Ink>
        </View>
      </View>
      <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', gap: 5 }}>
          {Array.from({ length: n }).map((_, i) => (
            <View key={i} style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: i < faits ? (theme.isDark ? '#9DB1FF' : '#4256C9') : bleu.fond }} />
          ))}
        </View>
        <Ink size={12.5} weight="extraBold" color={fini ? menthe.texte : c.textSecondary}>{progression}</Ink>
      </View>
      {onProchaines ? (
        <Pressable
          onPress={() => { tap(); onProchaines(); }}
          accessibilityRole="button"
          accessibilityLabel={traduire('Tes prochaines séances')}
          style={({ pressed }) => ({ marginTop: 12, minHeight: 44, borderRadius: 14, backgroundColor: bleu.fond, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, opacity: pressed ? 0.8 : 1 })}
        >
          <Image source={illus.img('calendrier')} style={{ width: 26, height: 26 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Ink size={13.5} weight="extraBold" color={bleu.texte} style={{ flex: 1 }}>{traduire('Tes prochaines séances')}</Ink>
          <Ink size={13} weight="extraBold" color={bleu.texte}>{traduire('Voir')}</Ink>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

// ============================================================
// Un chiffre, avec son aide au toucher si besoin
// ============================================================

export function TuileChiffre({ valeur, unite, libelle, teinte, aide }: { valeur: string; unite?: string; libelle: string; teinte: TeinteA; aide?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const t = useTeinte(teinte);
  const illus = useIllustrations();
  const [ouverte, setOuverte] = useState(false);
  const corps = (
    <>
      <Ink size={19} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {valeur}
        {unite ? <Ink size={12} weight="bold" color={c.textSecondary}>{` ${unite}`}</Ink> : null}
      </Ink>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ink size={11.5} weight="bold" color={t.texte} numberOfLines={2} style={{ flexShrink: 1 }}>{libelle}</Ink>
        {aide ? <Image source={illus.img('info')} style={{ width: 14, height: 14 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
      </View>
      {aide && ouverte ? (
        <Animated.View entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)}>
          <Ink size={11} weight="bold" color={c.textSecondary} style={{ marginTop: 3, lineHeight: 14 }}>{aide}</Ink>
        </Animated.View>
      ) : null}
    </>
  );
  const style = { flex: 1, minWidth: 0, borderRadius: 16, backgroundColor: t.fond, paddingVertical: 9, paddingHorizontal: 10 };
  if (!aide) return <View style={style}>{corps}</View>;
  return (
    <Pressable onPress={() => { tap(); setOuverte((o) => !o); }} accessibilityRole="button" accessibilityLabel={`${valeur} ${unite ?? ''}, ${libelle}`} accessibilityHint={aide} style={style}>
      {corps}
    </Pressable>
  );
}

/** Les trois chiffres d'une séance faite : durée, séries, et son chiffre clé (kilos soulevés, distance ou rounds) */
export function chiffresSeance(t: Training, unite: 'kg' | 'lb'): { valeur: string; unite?: string; libelle: string; aide?: string }[] {
  const f = sessionFacts(t);
  const out: { valeur: string; unite?: string; libelle: string; aide?: string }[] = [];
  if (f.minutes > 0) out.push({ valeur: formatDuration(f.minutes), libelle: traduire('durée') });
  if (f.sets > 0) out.push({ valeur: String(f.sets), libelle: f.sets > 1 ? traduire('séries') : traduire('série') });
  if (f.tonnageKg > 0) {
    const p = tonnageParts(f.tonnageKg, unite);
    out.push({ valeur: p.value, unite: p.unit, libelle: libelleKilos(), aide: aideKilos('seance') });
  } else if (f.distanceKm > 0) out.push({ valeur: fr1(f.distanceKm), unite: 'km', libelle: 'distance' });
  else if (f.rounds > 0) out.push({ valeur: String(f.rounds), libelle: f.rounds > 1 ? 'rounds' : 'round' });
  return out.slice(0, 3);
}

// ============================================================
// Bravo : la séance du jour est faite
// ============================================================

export function CarteBravo({ t, nombre, ensuite, onPartager, onVoir }: {
  t: Training;
  /** séances faites aujourd'hui */
  nombre: number;
  /** « Prochaine séance : jeudi, Pull. » */
  ensuite?: string;
  onPartager: () => void;
  onVoir: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const unite = useUnitePoids();
  const menthe = useTeinte('menthe');
  const illus = useIllustrations();
  const chiffres = chiffresSeance(t, unite);
  const cardio = cardioFait(exercisesOf(t));
  const teintes: TeinteA[] = ['creme', 'bleu', 'peche'];
  const sombre = theme.isDark;
  return (
    <Pressable
      onPress={() => { tap(); onVoir(); }}
      // le bouton Partager et le lien restent des boutons séparés pour VoiceOver : la carte ne les regroupe pas
      accessible={false}
      style={({ pressed }) => ({ borderRadius: 30, shadowColor: '#1C6B45', shadowOpacity: sombre ? 0 : 0.12, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 3, opacity: pressed ? 0.92 : 1 })}
    >
      <LinearGradient colors={sombre ? ['#1F2B24', '#1E2538'] : ['#DFF5E8', '#E9F0FB']} locations={[0, 0.7]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ borderRadius: 30, overflow: 'hidden', padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 84, height: 84, alignItems: 'center', justifyContent: 'center' }}>
            <StickerFete nom="trophee" taille={78} angle={-6} />
            <View style={{ position: 'absolute', right: -6, top: -6 }}>
              <StickerFete nom="etincelles" taille={34} angle={8} delai={180} />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Ink size={11} weight="extraBold" color={menthe.texte} style={{ letterSpacing: 1.4 }}>{traduire('Séance du jour faite').toLocaleUpperCase()}</Ink>
            <Ink size={27} weight="black" tight accessibilityRole="header" style={{ letterSpacing: -0.6 }}>{traduire('Bravo !')}</Ink>
            <Ink size={13.5} weight="bold" color={c.textSecondary} numberOfLines={2}>
              {nombre > 1 ? traduire('{0}, et {1} autres aujourd’hui', sansTiret(traduire(sessionTitle(t))), nombre - 1) : sansTiret(traduire(sessionTitle(t)))}
            </Ink>
          </View>
        </View>
        {/* 31 octobre 2026 : le cardio vraiment fait, son type et sa duree reelle (rien s'il a ete passe) */}
        {cardio ? (
          <Ink size={13.5} weight="extraBold" color={menthe.texte} style={{ marginTop: 10, paddingHorizontal: 4 }}>{traduire('Puis {0}', libelleCardio(cardio.type, cardio.minutes))}</Ink>
        ) : null}
        {chiffres.length ? (
          <View style={{ marginTop: 14, flexDirection: 'row', gap: 8 }}>
            {chiffres.map((x, i) => <TuileChiffre key={x.libelle} valeur={x.valeur} unite={x.unite} libelle={x.libelle} aide={x.aide} teinte={teintes[i % 3]} />)}
          </View>
        ) : null}
        <BoutonPrincipal
          label={traduire('Partager')}
          onPress={onPartager}
          hauteur={56}
          rayon={28}
          tailleTexte={16.5}
          lignes={1}
          style={{ marginTop: 14 }}
          accessibilityHint={traduire('Ouvre l’atelier des cartes avec ta séance')}
          icone={() => <Image source={illus.img('partager')} style={{ width: 26, height: 26 }} resizeMode="contain" accessibilityIgnoresInvertColors />}
        />
        <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, paddingHorizontal: 6 }}>
          <Pressable onPress={() => { tap(); onVoir(); }} accessibilityRole="button" hitSlop={6} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Ink size={13.5} weight="extraBold" color={c.accentText}>{traduire('Voir la séance')}</Ink>
          </Pressable>
          {ensuite ? <Ink size={12.5} weight="bold" color={c.textSecondary} style={{ flexShrink: 1, paddingVertical: 4 }}>{sansTiret(ensuite)}</Ink> : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ============================================================
// Jour de repos
// ============================================================

export function CarteRepos({ titre, quand, texte, onFaire, onProgramme }: {
  /** la prochaine séance prévue (« Pull ») */
  titre: string;
  /** « demain », « jeudi » */
  quand?: string;
  /** le mot du coach pour un jour de repos */
  texte?: string;
  /** la faire quand même aujourd'hui */
  onFaire?: () => void;
  onProgramme?: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const carte = useCarteA();
  const lilas = useTeinte('lilas');
  const bleu = useTeinte('bleu');
  const illus = useIllustrations();
  return (
    <Pressable
      onPress={onProgramme ? () => { tap(); onProgramme(); } : undefined}
      disabled={!onProgramme}
      accessible={false}
      style={({ pressed }) => [carte, { padding: 16, opacity: pressed && onProgramme ? 0.92 : 1 }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: lilas.fond, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={illus.img('sommeil')} style={{ width: 48, height: 48 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Ink size={11} weight="extraBold" color={lilas.texte} style={{ letterSpacing: 1.4 }}>{traduire('Aujourd’hui').toLocaleUpperCase()}</Ink>
          <Ink size={23} weight="black" tight accessibilityRole="header">{traduire('Jour de repos')}</Ink>
          {texte ? <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={3}>{sansTiret(texte)}</Ink> : null}
        </View>
      </View>
      <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: bleu.fond, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Image source={illus.img('calendrier')} style={{ width: 30, height: 30 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Ink size={11.5} weight="extraBold" color={bleu.texte}>{quand ? traduire('Prochaine séance, {0}', quand) : traduire('Prochaine séance')}</Ink>
          <Ink size={16} weight="black" numberOfLines={2}>{sansTiret(titre)}</Ink>
        </View>
      </View>
      <View style={{ marginTop: 6, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, paddingHorizontal: 4 }}>
        {onProgramme ? (
          <Pressable onPress={() => { tap(); onProgramme(); }} accessibilityRole="button" hitSlop={6} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Ink size={13.5} weight="extraBold" color={c.accentText}>{traduire('Voir le programme')}</Ink>
          </Pressable>
        ) : null}
        {onFaire ? (
          <Pressable onPress={() => { tap(); onFaire(); }} accessibilityRole="button" hitSlop={6} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Ink size={13.5} weight="extraBold" color={c.accentText}>{traduire('La faire aujourd’hui')}</Ink>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}
