/**
 * Zones cardiaques (refonte du 28 octobre 2026, retour de Houari : « c'est moche, je veux les memes zones qu'Apple »).
 *
 *  - Carte heros : arc des 5 zones en degrade pastel (ciel, menthe, jaune doux, peche, corail), FC de repos,
 *    FC max, sticker coeur (ou icone selon le reglage Illustrations).
 *  - Gros bouton « Importer depuis Apple Santé » (Health Connect sur Android) avec la date du dernier import.
 *    iOS 27 : zones exactes de Sante. Sinon : calcul d'Apple depuis ta FC de repos et ta FC max de Sante
 *    (lib/v2/zones/importZones.ts, logique pure et testee dans lib/v2/zones/zonesApple.ts). Enregistre tout de suite.
 *  - Methode en segments pastel : Apple Santé, Ma FC max, Au repos, Mes valeurs.
 *  - Les 5 zones en cartes, bornes en pastilles modifiables ; les zones restent collees comme dans Apple.
 *  - Enregistrer en bas, fixe, sous la liste (jamais par dessus).
 * Toute l'app relit ces bornes par getEffectiveHRZones (lib/hrZones.ts) : seances, statistiques, cartes.
 * Ancienne version : _archive_ancien_design_2026-10-09/zones_cardio_2026-10-28/app/heart-zones-settings.tsx
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { Accordion } from '@/components/yoroi/v2/sante/ui';
import { Capitales, StickerOuIcone, teinteRubrique } from '@/components/yoroi/v2/profil/Rubriques';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { P } from '@/components/yoroi/livePalette';
import { getUserSettings, saveUserSettings } from '@/lib/storage';
import { markAppleZonesNoticeShown } from '@/lib/appleZonesSync';
import { originOnSave, shouldShowAppleNotice } from '@/lib/v2/seances/appleZonesSync';
import type { ZonesMeta } from '@/lib/v2/seances/appleZonesSync';
import type { LowerBounds } from '@/lib/v2/seances/workoutMath';
import { lowerBounds, zonesFromLowers } from '@/lib/v2/seances/workoutMath';
import { getEffectiveHRZones } from '@/lib/hrZones';
import { bornesDesZones, bornesValides, changerBorne, dateImport, fcMaxPlausible, fcReposPlausible, partsArc, zonesCommeApple, zonesDepuisFcMax } from '@/lib/v2/zones/zonesApple';
import type { ResultatImport } from '@/lib/v2/zones/zonesApple';
import { importerZones, lireMemoireImport, lireValeursCoeur } from '@/lib/v2/zones/importZones';
import type { MemoireImport } from '@/lib/v2/zones/importZones';
import { traduire } from '@/lib/i18n/tr';

const GOUTTIERE = 20;
const ANDROID = Platform.OS === 'android';
const NOM_SANTE = ANDROID ? 'Health Connect' : 'Apple Santé';

/** Couleurs pastel des 5 zones : plein (arc, anneau), texte lisible, fond doux. Pas de marron ni de rouge sang. */
const ZONES_CLAIR = [
  { plein: '#8CC4F2', texte: '#225C93', doux: '#E6F2FC' },
  { plein: '#86D5AE', texte: '#17704A', doux: '#E2F5EB' },
  { plein: '#F3D26E', texte: '#7A5A06', doux: '#FBF3D6' },
  { plein: '#F6AE85', texte: '#A04A1A', doux: '#FDEBDF' },
  { plein: '#F08A82', texte: '#A8362F', doux: '#FCE4E1' },
] as const;
const ZONES_SOMBRE = [
  { plein: '#7DB4E6', texte: '#A9CCF0', doux: '#1E2A3A' },
  { plein: '#72C49C', texte: '#8FD9B4', doux: '#1C2D25' },
  { plein: '#E3C062', texte: '#EBCF7E', doux: '#302A1A' },
  { plein: '#E89C74', texte: '#F2B08C', doux: '#36261C' },
  { plein: '#E07D76', texte: '#F09A92', doux: '#38211F' },
] as const;

const NOMS = ['Récupération', 'Endurance', 'Tempo', 'Seuil', 'Maximum'] as const;
const EFFETS = [
  'Retour au calme, footing très léger',
  'Long et facile, tu peux parler',
  'Soutenu, tu parles par phrases courtes',
  'Dur, quelques mots seulement',
  'Sprint, tu es à fond',
] as const;

type Methode = 'apple' | 'fcmax' | 'repos' | 'manuel';

// ---------- Petits composants ----------

/** Pastille de nombre modifiable : garde ce que tu tapes, transmet des que la valeur tient debout */
function PastilleNombre({ valeur, onValeur, couleur, fond, label, large = 58 }: { valeur: number | null; onValeur: (n: number) => void; couleur: string; fond: string; label: string; large?: number }) {
  const [texte, setTexte] = useState(valeur == null ? '' : String(valeur));
  const focus = useRef(false);
  useEffect(() => {
    if (!focus.current) setTexte(valeur == null ? '' : String(valeur));
  }, [valeur]);
  return (
    <TextInput
      value={texte}
      onChangeText={(t) => {
        const propre = t.replace(/[^0-9]/g, '').slice(0, 3);
        setTexte(propre);
        const n = parseInt(propre, 10);
        if (n >= 30 && n <= 239) onValeur(n);
      }}
      onFocus={() => { focus.current = true; }}
      onBlur={() => { focus.current = false; setTexte(valeur == null ? '' : String(valeur)); }}
      keyboardType="number-pad"
      returnKeyType="done"
      maxLength={3}
      selectTextOnFocus
      accessibilityLabel={label}
      style={{ width: large, height: 40, borderRadius: 14, backgroundColor: fond, textAlign: 'center', fontSize: 17, fontWeight: '800', color: couleur, paddingVertical: 0 }}
    />
  );
}

/** Segment pastel a 4 choix, pastille blanche sur le choix actif */
function Segments({ options, valeur, onChange }: { options: { key: Methode; label: string }[]; valeur: Methode; onChange: (m: Methode) => void }) {
  const { isDark } = useYoroiTheme();
  const t = teinteRubrique('lilas', isDark);
  return (
    <View accessibilityRole="radiogroup" style={{ height: 46, padding: 4, borderRadius: 23, backgroundColor: t.voile, flexDirection: 'row', gap: 2 }}>
      {options.map((o) => {
        const on = o.key === valeur;
        return (
          <Pressable
            key={o.key}
            onPress={() => { selectionAsync().catch(() => {}); onChange(o.key); }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            style={{ flex: 1, borderRadius: 19, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, backgroundColor: on ? P.white : 'transparent', shadowColor: t.titre, shadowOpacity: on ? 0.16 : 0, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}
          >
            <Ink size={12.5} weight="extraBold" color={on ? t.titre : t.doux} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{o.label}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Arc des 5 zones, de ta FC de repos a ta FC max, en degrade pastel */
function ArcZones({ lb, repos, max, largeur }: { lb: LowerBounds; repos: number | null; max: number | null; largeur: number }) {
  const { isDark } = useYoroiTheme();
  const Z = isDark ? ZONES_SOMBRE : ZONES_CLAIR;
  const ep = 18;
  const marge = 22;
  const r = Math.max(60, Math.min(150, (largeur - ep) / 2 - marge));
  const cx = largeur / 2;
  const cy = r + ep / 2 + marge;
  const haut = cy + 6;
  const { parts } = partsArc(lb, repos, max);
  const ecart = 0.012;
  const point = (t: number, rr = r) => {
    const a = Math.PI * (1 - t);
    return { x: cx + rr * Math.cos(a), y: cy - rr * Math.sin(a) };
  };
  const arc = (t0: number, t1: number) => {
    const a = point(t0);
    const b = point(t1);
    return `M ${a.x} ${a.y} A ${r} ${r} 0 0 1 ${b.x} ${b.y}`;
  };
  let t = 0;
  const segs = parts.map((p, i) => {
    const s = { i, t0: t + (i === 0 ? 0 : ecart / 2), t1: t + p - (i === 4 ? 0 : ecart / 2), milieu: t + p / 2, fin: t + p };
    t += p;
    return s;
  });
  // degrade horizontal : l'arc avance de gauche a droite, chaque couleur se pose au milieu de sa zone
  const gauche = cx - r - ep / 2;
  const total = 2 * r + ep;
  const offset = (tt: number) => Math.min(1, Math.max(0, (point(tt).x - gauche) / total));
  const debutArc = point(0);
  const finArc = point(1);
  return (
    <View style={{ width: largeur, height: haut }}>
      <Svg width={largeur} height={haut}>
        <Defs>
          <SvgGradient id="degradeZones" x1={gauche} y1="0" x2={gauche + total} y2="0" gradientUnits="userSpaceOnUse">
            {segs.map((s) => <Stop key={s.i} offset={offset(s.milieu)} stopColor={Z[s.i].plein} />)}
          </SvgGradient>
        </Defs>
        <Path d={arc(0, 1)} stroke={isDark ? 'rgba(255,255,255,0.06)' : '#EEF0F7'} strokeWidth={ep + 8} fill="none" strokeLinecap="round" />
        {segs.map((s) => <Path key={s.i} d={arc(s.t0, s.t1)} stroke="url(#degradeZones)" strokeWidth={ep} fill="none" />)}
        <Circle cx={debutArc.x} cy={debutArc.y} r={ep / 2} fill={Z[0].plein} />
        <Circle cx={finArc.x} cy={finArc.y} r={ep / 2} fill={Z[4].plein} />
      </Svg>
      {segs.slice(0, 4).map((s) => {
        const p = point(s.fin, r + ep / 2 + 13);
        return (
          <View key={s.i} pointerEvents="none" style={{ position: 'absolute', left: p.x - 20, top: p.y - 9, width: 40, alignItems: 'center' }}>
            <Ink size={11} weight="extraBold" color={P.muted}>{String(lb[s.i])}</Ink>
          </View>
        );
      })}
      {segs.map((s) => {
        const p = point(s.milieu, r - ep / 2 - 15);
        return (
          <View key={`z${s.i}`} pointerEvents="none" style={{ position: 'absolute', left: p.x - 14, top: p.y - 9, width: 28, alignItems: 'center' }}>
            <Ink size={11} weight="black" color={Z[s.i].texte}>{`Z${s.i + 1}`}</Ink>
          </View>
        );
      })}
    </View>
  );
}

function Chiffre({ valeur, legende, couleur }: { valeur: number | null; legende: string; couleur: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Ink size={28} weight="black" tight color={P.ink}>{valeur == null ? '?' : String(valeur)}</Ink>
        <Ink size={12} weight="bold" color={P.muted}>bpm</Ink>
      </View>
      <Ink size={10.5} weight="extraBold" color={couleur} style={{ letterSpacing: 1.2 }}>{legende.toUpperCase()}</Ink>
    </View>
  );
}

function IconeImport({ couleur }: { couleur: string }) {
  return (
    <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path d="M12 3v12M7 10l5 5 5-5M5 20h14" stroke={couleur} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/** Ligne d'un reglage de la methode : libelle, precision, pastille */
function LigneValeur({ titre, sous, valeur, onValeur, label }: { titre: string; sous: string; valeur: number | null; onValeur: (n: number) => void; label: string }) {
  const { isDark } = useYoroiTheme();
  const t = teinteRubrique('lilas', isDark);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Ink size={15} weight="extraBold">{titre}</Ink>
        <Ink size={12} weight="bold" color={P.ink2}>{sous}</Ink>
      </View>
      <PastilleNombre valeur={valeur} onValeur={onValeur} couleur={t.titre} fond={P.white} label={label} large={64} />
    </View>
  );
}

function BoutonSecondaire({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { isDark } = useYoroiTheme();
  const t = teinteRubrique('lilas', isDark);
  return (
    <Pressable onPress={disabled ? undefined : onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}>
      {({ pressed }) => (
        <View style={{ height: 48, borderRadius: 16, backgroundColor: P.white, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed && !disabled ? 0.97 : 1 }] }}>
          <Icon name="check" size={18} color={t.titre} />
          <Ink size={15} weight="extraBold" color={t.titre}>{label}</Ink>
        </View>
      )}
    </Pressable>
  );
}

// ---------- Textes de l'import ----------

function texteImport(r: ResultatImport): { ok: boolean; titre: string; detail?: string } {
  if (r.type === 'exactes') {
    return {
      ok: true,
      titre: traduire('Zones exactes d’Apple importées et enregistrées.'),
      detail: r.appleSource === 'user' ? traduire('Ce sont tes zones manuelles de Santé.') : traduire('Ce sont les zones automatiques de ta montre.'),
    };
  }
  if (r.type === 'calculees') {
    const pourquoi =
      r.pourquoi === 'android' ? traduire('Health Connect ne partage pas les zones de ta montre.')
        : r.pourquoi === 'app_a_jour' ? traduire('Ton iPhone peut donner les zones exactes, mais cette version de Yoroi ne sait pas encore les lire. Mets l’app à jour.')
          : r.pourquoi === 'sante_vide' ? traduire('Santé ne m’a pas donné tes zones exactes.')
            : traduire('Les zones exactes de ta montre ne sont lisibles qu’à partir d’iOS 27.');
    const max = r.sourceMax === 'age' ? traduire('FC max : 220 moins ton âge, faute de record dans {0}.', NOM_SANTE) : r.sourceMax === 'seances' ? traduire('FC max : le plus haut de tes séances.') : '';
    return {
      ok: true,
      titre: traduire('Calculées comme Apple, depuis ta FC de repos ({0}) et ta FC max ({1}) de {2}. Enregistrées.', r.repos, r.max, ANDROID ? 'Health Connect' : 'Santé'),
      detail: [pourquoi, max].filter(Boolean).join(' '),
    };
  }
  if (r.raison === 'pas_de_repos') return { ok: false, titre: traduire('Pas de FC de repos dans {0}.', NOM_SANTE), detail: traduire('Porte ta montre une journée et une nuit, ou entre la dans « Au repos ».') };
  if (r.raison === 'pas_de_max') return { ok: false, titre: traduire('Pas de FC max dans {0}, ni d’âge dans ton profil.', NOM_SANTE), detail: traduire('Entre la dans « Ma FC max ».') };
  return { ok: false, titre: traduire('Les valeurs lues ne tiennent pas debout.'), detail: traduire('Entre ta FC de repos et ta FC max dans « Au repos ».') };
}

// ---------- Ecran ----------

export default function HeartZonesSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useYoroiTheme();
  const Z = isDark ? ZONES_SOMBRE : ZONES_CLAIR;
  const lilas = teinteRubrique('lilas', isDark);
  const params = useLocalSearchParams<{ mode?: string }>();

  const [lb, setLb] = useState<LowerBounds | null>(null);
  const [lbCharge, setLbCharge] = useState<LowerBounds | null>(null);
  const [z1min, setZ1min] = useState(0);
  const [meta, setMeta] = useState<ZonesMeta | null>(null);
  const [source, setSource] = useState<'custom' | 'age' | 'default'>('default');
  const [memoire, setMemoire] = useState<MemoireImport | null>(null);
  const [repos, setRepos] = useState<number | null>(null);
  const [max, setMax] = useState<number | null>(null);
  const [methode, setMethode] = useState<Methode>(params.mode === 'repos' ? 'repos' : 'apple');
  const [importEnCours, setImportEnCours] = useState(false);
  const [resultat, setResultat] = useState<ResultatImport | null>(null);
  const [appleNotice, setAppleNotice] = useState(false);
  const [largeurHeros, setLargeurHeros] = useState(0);
  const [defile, setDefile] = useState(false);
  const [enregistre, setEnregistre] = useState(false);

  useEffect(() => {
    let vivant = true;
    (async () => {
      const [st, eff, mem] = await Promise.all([getUserSettings().catch(() => null), getEffectiveHRZones(), lireMemoireImport()]);
      if (!vivant) return;
      const m = st?.heartRateZonesMeta ?? null;
      setMeta(m);
      if (shouldShowAppleNotice(m)) {
        setAppleNotice(true);
        markAppleZonesNoticeShown();
      }
      const l = lowerBounds(eff);
      setLb(l);
      setLbCharge(l);
      setZ1min(eff.z1min ?? 0);
      setSource(eff.source);
      setMemoire(mem);
      if (params.mode !== 'repos') setMethode(eff.source === 'custom' && m?.origin === 'manual' ? 'manuel' : 'apple');
      if (mem?.repos) setRepos(mem.repos);
      if (mem?.max) setMax(mem.max);
      // FC de repos et FC max du moment (lecture seule, rien n'est enregistre)
      const v = await lireValeursCoeur().catch(() => null);
      if (!vivant || !v) return;
      if (v.repos != null) setRepos((x) => x ?? v.repos);
      if (v.fcMax) {
        const vm = v.fcMax.valeur;
        setMax((x) => x ?? vm);
      }
    })();
    return () => { vivant = false; };
  }, [params.mode]);

  const importer = async () => {
    setImportEnCours(true);
    setResultat(null);
    try {
      const r = await importerZones();
      setResultat(r);
      if (r.type !== 'echec') {
        tap('success');
        const [st, mem] = await Promise.all([getUserSettings().catch(() => null), lireMemoireImport()]);
        setMeta(st?.heartRateZonesMeta ?? null);
        setMemoire(mem);
        setLb(r.lb);
        setLbCharge(r.lb);
        setZ1min(0);
        setSource('custom');
        setMethode('apple');
        if (r.type === 'calculees') { setRepos(r.repos); setMax(r.max); }
      }
    } catch {
      setResultat({ type: 'echec', raison: 'illisible' });
    } finally {
      setImportEnCours(false);
    }
  };

  const valide = bornesValides(lb);

  const enregistrer = async () => {
    if (!lb || !valide) return;
    const hz = zonesFromLowers(lb, z1min);
    const origine = originOnSave(lb, meta, lbCharge);
    const m: ZonesMeta = meta && origine === meta.origin ? meta : { origin: origine, updatedAt: new Date().toISOString(), noticeShown: meta?.noticeShown };
    await saveUserSettings({ heartRateZones: hz, heartRateZonesMeta: m });
    tap('success');
    setEnregistre(true);
    router.back();
  };

  const changerZone = (zone: number, cote: 'debut' | 'fin', n: number) => {
    if (!lb) return;
    setLb(changerBorne(lb, zone, cote, n));
    setMethode('manuel');
  };

  const apercuRepos = repos != null && max != null ? zonesCommeApple(repos, max) : null;
  const apercuMax = max != null ? zonesDepuisFcMax(max) : null;

  const origine = source !== 'custom' ? 'estimation' : meta?.origin === 'apple' ? 'apple' : meta?.origin === 'manual' || !meta ? 'manuel' : memoire?.type === 'calculees' ? 'comme_apple' : 'estimee';
  const verte = origine === 'apple' || origine === 'comme_apple';
  const puce = origine === 'apple' ? NOM_SANTE : origine === 'comme_apple' ? traduire('Comme Apple') : origine === 'manuel' ? traduire('Tes valeurs') : traduire('Estimation');
  const phrase =
    origine === 'apple' ? (meta?.appleSource === 'user' ? traduire('Tes zones manuelles de Santé, reprises à l’identique.') : traduire('Les zones exactes de ta montre, lues dans Santé.'))
      : origine === 'comme_apple' ? traduire('Calculées comme Apple, depuis ta FC de repos et ta FC max de {0}.', ANDROID ? 'Health Connect' : 'Santé')
        : origine === 'manuel' ? traduire('Tes zones à toi. Apple ne les remplace jamais.')
          : origine === 'estimee' ? traduire('Estimées depuis ta FC max. Importe les pour avoir celles d’Apple.')
            : traduire('Estimation par défaut. Importe tes zones pour avoir celles d’Apple.');
  const derniere = dateImport(memoire?.at ?? (meta?.origin === 'apple' ? meta.appleCheckedAt : null));
  const msg = resultat ? texteImport(resultat) : null;

  const options: { key: Methode; label: string }[] = useMemo(() => [
    { key: 'apple', label: ANDROID ? 'Health Connect' : 'Apple Santé' },
    { key: 'fcmax', label: traduire('Ma FC max') },
    { key: 'repos', label: traduire('Au repos') },
    { key: 'manuel', label: traduire('Mes valeurs') },
  ], []);

  const zones = lb ? bornesDesZones(lb) : [];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: P.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <EnTete titre={traduire('Zones cardiaques')} sousTitre={traduire('Tes 5 zones en battements par minute')} onRetour={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)' as never))} zoneSure defile={defile} fond={P.paper} />
      <ScrollView
        style={{ flex: 1 }}
        onScroll={(e) => {
          const d = e.nativeEvent.contentOffset.y > 4;
          if (d !== defile) setDefile(d);
        }}
        scrollEventThrottle={32}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: GOUTTIERE, paddingTop: 8, paddingBottom: 28, gap: 14 }}
      >
        {/* Carte heros */}
        <Animated.View entering={FadeIn.duration(220)} style={{ backgroundColor: P.white, borderRadius: 28, padding: 16, paddingBottom: 18, shadowColor: '#23358F', shadowOpacity: isDark ? 0 : 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Capitales color={Z[4].texte}>{traduire('Tes zones')}</Capitales>
            <View style={{ paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: verte ? Z[1].doux : lilas.fond, justifyContent: 'center' }}>
              <Ink size={11.5} weight="extraBold" color={verte ? Z[1].texte : lilas.titre}>{puce}</Ink>
            </View>
          </View>
          <View onLayout={(e) => setLargeurHeros(Math.round(e.nativeEvent.layout.width))} style={{ marginTop: 6, alignItems: 'center' }}>
            {lb && largeurHeros > 0 ? (
              <View>
                <ArcZones lb={lb} repos={repos} max={max} largeur={largeurHeros} />
                <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 4, alignItems: 'center' }}>
                  <StickerOuIcone sticker="coeur" icon="heart" size={Math.round(Math.min(78, largeurHeros * 0.22))} />
                </View>
              </View>
            ) : <View style={{ height: 170 }} />}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Chiffre valeur={repos} legende={traduire('Au repos')} couleur={Z[0].texte} />
            <View style={{ width: 1, backgroundColor: P.line, marginVertical: 4 }} />
            <Chiffre valeur={max} legende={traduire('FC max')} couleur={Z[4].texte} />
          </View>
          <Ink size={13} weight="bold" color={P.ink2} style={{ marginTop: 12, textAlign: 'center' }}>{phrase}</Ink>
          {appleNotice ? <Ink size={12} weight="bold" color={Z[1].texte} style={{ marginTop: 4, textAlign: 'center' }}>{traduire('Elles se mettent à jour toutes seules quand Apple les change.')}</Ink> : null}
        </Animated.View>

        {/* Import */}
        {Platform.OS === 'ios' || ANDROID ? (
          <BoutonPrincipal onPress={importer} loading={importEnCours} disabled={importEnCours} hauteur={76} rayon={22} accessibilityLabel={traduire('Importer depuis {0}', NOM_SANTE)} styleBouton={{ justifyContent: 'flex-start', paddingHorizontal: 16 }}>
            {(c) => (
              <>
                <IconeImport couleur={c} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Ink size={16.5} weight="extraBold" color={c} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{importEnCours ? traduire('Lecture de {0}', NOM_SANTE) : traduire('Importer depuis {0}', NOM_SANTE)}</Ink>
                  <Ink size={12.5} weight="bold" color={c} style={{ opacity: 0.82 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                    {derniere ? traduire('Dernier import {0}', derniere) : traduire('Jamais importé. Enregistré tout de suite.')}
                  </Ink>
                </View>
              </>
            )}
          </BoutonPrincipal>
        ) : null}
        {msg ? (
          <View style={{ borderRadius: 18, backgroundColor: msg.ok ? Z[1].doux : Z[4].doux, padding: 14, flexDirection: 'row', gap: 10 }}>
            <Icon name={msg.ok ? 'check' : 'info'} size={18} color={msg.ok ? Z[1].texte : Z[4].texte} />
            <View style={{ flex: 1, gap: 3 }}>
              <Ink size={13.5} weight="extraBold" color={msg.ok ? Z[1].texte : Z[4].texte}>{msg.titre}</Ink>
              {msg.detail ? <Ink size={12.5} weight="bold" color={P.ink2}>{msg.detail}</Ink> : null}
            </View>
          </View>
        ) : null}

        {/* Methode */}
        <View style={{ backgroundColor: lilas.fond, borderRadius: 26, padding: 14, gap: 12 }}>
          <Capitales color={lilas.titre}>{traduire('Méthode')}</Capitales>
          <Segments options={options} valeur={methode} onChange={setMethode} />
          {methode === 'apple' ? (
            <Ink size={13} weight="bold" color={lilas.doux}>
              {ANDROID
                ? traduire('Calculées comme Apple, depuis ta FC de repos et ta FC max de Health Connect : repos plus 60, 70, 80 et 90 % de ta réserve cardiaque.')
                : traduire('Avec iOS 27, l’import reprend les zones exactes de ta montre. Avant, elles sont calculées comme Apple, depuis ta FC de repos et ta FC max de Santé.')}
            </Ink>
          ) : null}
          {methode === 'fcmax' ? (
            <View style={{ gap: 12 }}>
              <LigneValeur titre={traduire('FC max')} sous={traduire('Ton maximum, en bpm')} valeur={max} onValeur={setMax} label={traduire('Fréquence cardiaque maximale')} />
              <Ink size={12.5} weight="bold" color={lilas.doux}>{traduire('Sans FC de repos : 63, 71, 79 et 90 % de ta FC max. Moins précis que la méthode d’Apple.')}</Ink>
              <BoutonSecondaire label={traduire('Appliquer ces zones')} disabled={!apercuMax} onPress={() => { if (apercuMax) { tap('medium'); setLb(apercuMax); } }} />
            </View>
          ) : null}
          {methode === 'repos' ? (
            <View style={{ gap: 12 }}>
              <LigneValeur titre={traduire('FC au repos')} sous={traduire('Au réveil, allongé')} valeur={repos} onValeur={setRepos} label={traduire('Fréquence cardiaque au repos')} />
              <LigneValeur titre={traduire('FC max')} sous={traduire('Ton maximum, en bpm')} valeur={max} onValeur={setMax} label={traduire('Fréquence cardiaque maximale')} />
              <Ink size={12.5} weight="bold" color={lilas.doux}>
                {repos != null && max != null && fcReposPlausible(repos) && fcMaxPlausible(max) ? traduire('Réserve de {0} battements. La méthode d’Apple : repos plus 60, 70, 80 et 90 % de ta réserve.', max - repos) : traduire('La méthode d’Apple : repos plus 60, 70, 80 et 90 % de ta réserve cardiaque.')}
              </Ink>
              <BoutonSecondaire label={traduire('Appliquer ces zones')} disabled={!apercuRepos} onPress={() => { if (apercuRepos) { tap('medium'); setLb(apercuRepos); } }} />
            </View>
          ) : null}
          {methode === 'manuel' ? (
            <Ink size={13} weight="bold" color={lilas.doux}>{traduire('Touche un nombre dans une zone pour le changer. Les zones restent collées, comme dans Apple.')}</Ink>
          ) : null}
        </View>

        {/* Les 5 zones */}
        <View style={{ paddingHorizontal: 4, marginTop: 4 }}>
          <Capitales color={P.ink2}>{traduire('Tes 5 zones')}</Capitales>
        </View>
        {zones.map((b, i) => (
          <View key={i} style={{ backgroundColor: P.white, borderRadius: 22, padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: Z[i].doux, borderWidth: 3, borderColor: Z[i].plein, alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={15} weight="black" color={Z[i].texte}>{String(i + 1)}</Ink>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Ink size={16} weight="black" tight numberOfLines={1}>{traduire(NOMS[i])}</Ink>
                <Ink size={12.5} weight="bold" color={P.ink2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{traduire(EFFETS[i])}</Ink>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 50 }}>
              {i === 0 ? <Ink size={13} weight="bold" color={P.muted}>{traduire('moins de')}</Ink> : null}
              {i === 0 ? <PastilleNombre valeur={(b.fin ?? 0) + 1} onValeur={(n) => changerZone(1, 'debut', n)} couleur={Z[i].texte} fond={Z[i].doux} label={traduire('Zone 1, moins de')} /> : null}
              {i > 0 && b.debut != null ? <PastilleNombre valeur={b.debut} onValeur={(n) => changerZone(i, 'debut', n)} couleur={Z[i].texte} fond={Z[i].doux} label={traduire('Zone {0}, début', i + 1)} /> : null}
              {i > 0 && i < 4 ? <Ink size={13} weight="bold" color={P.muted}>{traduire('à')}</Ink> : null}
              {i > 0 && i < 4 && b.fin != null ? <PastilleNombre valeur={b.fin} onValeur={(n) => changerZone(i, 'fin', n)} couleur={Z[i].texte} fond={Z[i].doux} label={traduire('Zone {0}, fin', i + 1)} /> : null}
              {i === 4 ? <Ink size={13} weight="bold" color={P.muted}>{traduire('et plus')}</Ink> : null}
              <Ink size={12} weight="bold" color={P.muted} style={{ marginLeft: 'auto' }}>bpm</Ink>
            </View>
          </View>
        ))}
        {lb && !valide ? (
          <View style={{ borderRadius: 18, backgroundColor: Z[4].doux, padding: 14 }}>
            <Ink size={13} weight="bold" color={Z[4].texte}>{traduire('Chaque zone doit commencer au moins 2 battements après la précédente, entre 40 et 229 bpm.')}</Ink>
          </View>
        ) : null}

        {/* Pour comparer */}
        <View style={{ paddingHorizontal: 4, marginTop: 6 }}>
          <Capitales color={P.ink2}>{traduire('Pour comparer')}</Capitales>
        </View>
        <Accordion title={traduire('Tes zones dans Apple')} sub={traduire('App Watch, Exercice')}>
          <Ink size={13} weight="medium" color={P.ink2}>
            {traduire('App Watch de ton iPhone, onglet Ma montre, Exercice, Zones de fréquence cardiaque. En automatique, Apple y affiche aussi la FC max et la FC au repos qu’il utilise : si elles diffèrent des tiennes ici, corrige les dans « Au repos ».')}
          </Ink>
        </Accordion>
        <Accordion title={traduire('Garmin, Samsung, Fitbit')} sub={traduire('Reporte tes valeurs dans Mes valeurs')}>
          <Ink size={13} weight="medium" color={P.ink2}>
            {traduire('Garmin Connect : Appareils Garmin, ton appareil, Paramètres utilisateur, Zones de fréquence cardiaque.\nSamsung Health : Exercice, une activité, Paramètres, Zones de fréquence cardiaque.\nFitbit : Profil, Paramètres activité, Zones de fréquence cardiaque.')}
          </Ink>
        </Accordion>
      </ScrollView>

      {/* Enregistrer : fixe en bas, sous la liste, jamais par dessus */}
      <View style={{ paddingHorizontal: GOUTTIERE, paddingTop: 10, paddingBottom: insets.bottom + 10, backgroundColor: P.paper, borderTopWidth: 1, borderTopColor: defile ? P.line2 : 'transparent' }}>
        <BoutonPrincipal
          label={enregistre ? traduire('Enregistré') : traduire('Enregistrer mes zones')}
          disabled={!valide || enregistre}
          onPress={enregistrer}
          lignes={1}
          icone={(c) => <Icon name="check" size={20} color={c} />}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
