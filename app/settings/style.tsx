/**
 * Personnaliser (16 octobre 2026, Houari : « les utilisateurs ne vont pas savoir comment régler les choses, changer
 * le style des courbes etc., c'est grave caché, pas intuitif. Il faut mieux les ranger. »).
 * L'ancienne liste grise « Apparence et style » devient un ecran visuel : de grandes tuiles avec un vrai apercu
 * de ton choix (ta scene, ton personnage, ta courbe dans son style, ton widget, ton icone, le theme clair et sombre),
 * rangees en cinq groupes : Ton univers, Ton accueil, Tes graphiques, Tes widgets, Ton icone.
 * Chaque tuile ouvre son reglage (avec son apercu en direct) ; le theme et le style de la courbe se choisissent
 * aussi d'un toucher, directement ici. Meme logique qu'avant : setMode, usePrefsCourbes().set, les memes pages.
 * Archive de l'ancienne liste : _archive_ancien_design_2026-10-09/perso_ux/app/settings/style.tsx.
 * Les routes : lib/v2/personnaliser/acces.ts (toutes directes).
 * 17 octobre 2026 : « Ta citation », dans Ton accueil : les trois styles de la citation du jour en vrai apercu
 * (pinceau par defaut, losanges de Takeda, sceau indigo), un toucher suffit ; et « Masquer la citation ».
 * 17 octobre soir : « Ta santé », le traitement de la tuile Ta santé aujourd'hui (cadran par defaut, nuit, mosaique).
 * 19 octobre 2026 : « Décorations de saison » n'est plus une ligne sous le theme (Houari ne l'avait pas vue) mais sa
 * propre carte, juste dessous (components/yoroi/v2/saisons/CarteDecorations.tsx).
 */
import React, { useCallback, useState } from 'react';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EspaceScreen, GUTTER, Icon } from '@/components/yoroi/v2/espace/ui';
import { personnageImage, personnageNom, sceneMeta } from '@/components/yoroi/v2/espace/assets';
import { imageDeTaScene, nomDeTaScene, useEspaceAuRetour } from '@/components/yoroi/v2/espace/apercuScene';
import { aUnPersonnage } from '@/lib/v2/dojo/personnages';
import { LanterneDessin } from '@/components/yoroi/v2/accueil/Lanterne';
import { Groupe, Interrupteur } from '@/components/yoroi/v2/reglages/kit';
import { CitationDuJour } from '@/components/yoroi/v2/accueil/Citation';
import { citationDuJour } from '@/lib/v2/accueil/citations';
import { STYLES_CITATION, useStyleCitation, type StyleCitation } from '@/lib/v2/accueil/styleCitation';
import { STYLES_SANTE, useStyleSante, type StyleSante } from '@/lib/v2/accueil/styleSante';
import { LinearGradient } from 'expo-linear-gradient';
import { devNow } from '@/lib/v2/creator/devClock';
import { CONTOURS, RondCadre, contourDe, resumeRond, styleRondDe } from '@/components/yoroi/v2/reglages/contour';
import { BusteRond } from '@/components/yoroi/v2/espace/BusteRond';
import { RondInitiales } from '@/components/yoroi/v2/espace/RondInitiales';
import { ApercuCourbe } from '@/components/yoroi/v2/charts/CourbePoids';
import { sceneDuFond } from '@/components/yoroi/v2/charts/FondCourbe';
import { useEspace } from '@/lib/v2/espace/useEspace';
import { useIdentite } from '@/lib/v2/espace/useIdentite';
import { COULEURS_COURBE, STYLES_COURBE, usePrefsCourbes, type StyleCourbe } from '@/lib/v2/courbes/prefs';
import { STYLES_WIDGETS, useStyleWidgets, type StyleWidgets } from '@/lib/v2/widgets/style';
import { BLOCS_ACCUEIL, useDisposition } from '@/lib/v2/accueil/disposition';
import { blocsAffiches, ROUTES_PERSONNALISER } from '@/lib/v2/personnaliser/acces';
import { useTheme } from '@/lib/ThemeContext';
import { getSelectedLogo, LOGO_OPTIONS } from '@/lib/storage';
import { useYoroiTheme as useModeTheme } from '@/components/yoroi/YoroiThemeProvider';
import type { YoroiMode } from '@/components/yoroi/tokens';
import { useDecorationsSaison } from '@/lib/v2/saisons/reglage';
import { CarteDecorations } from '@/components/yoroi/v2/saisons/CarteDecorations';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { STYLES_ILLUSTRATIONS, illustration, useIllustrations, type StyleIllustrations } from '@/components/yoroi/v2/stickers';

/** 27 octobre 2026 : les deux styles d'illustrations (components/yoroi/v2/stickers.ts) */
const NOMS_ILLUSTRATIONS: Record<StyleIllustrations, string> = {
  stickers: traduire('Stickers'),
  encre: traduire('Encre japonaise'),
};

const FONT_LABELS = [traduire('Petite'), traduire('Normale'), traduire('Grande'), traduire('Très grande')];
const MODES_THEME: { key: YoroiMode; label: string }[] = [
  { key: 'clair', label: traduire('Clair') },
  { key: 'sombre', label: traduire('Sombre') },
  { key: 'auto', label: traduire('Automatique') },
];
const WIDGETS: Record<StyleWidgets, { clair: number; sombre: number }> = {
  A: { clair: require('@/assets/widgets/apercu_a_clair.jpg'), sombre: require('@/assets/widgets/apercu_a_sombre.jpg') },
  B: { clair: require('@/assets/widgets/apercu_b_clair.jpg'), sombre: require('@/assets/widgets/apercu_b_sombre.jpg') },
  C: { clair: require('@/assets/widgets/apercu_c_clair.jpg'), sombre: require('@/assets/widgets/apercu_c_sombre.jpg') },
};
const PAPIER = { clair: { fond: '#F5F6FB', carte: '#FFFFFF', encre: '#1D2033', trait: '#E4E7F1' }, sombre: { fond: '#14161F', carte: '#1A1E29', encre: '#F5F6FB', trait: '#343A48' } };

/** Une grande tuile : l'apercu en haut, le nom et ton choix dessous, un chevron */
function Tuile({ titre, valeur, onPress, apercu, largeur, a11y, chevron = true }: { titre: string; valeur?: string; onPress: () => void; apercu: React.ReactNode; largeur: number; a11y?: string; chevron?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? `${titre}${valeur ? `, ${valeur}` : ''}`}
      style={({ pressed }) => ({ width: largeur, borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden', transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      <View style={{ padding: 8, paddingBottom: 0 }}>{apercu}</View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 }}>
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={chevron ? 15 : 14.5} weight="black" numberOfLines={1}>{titre}</Ink>
          {valeur ? <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={1}>{valeur}</Ink> : null}
        </View>
        {chevron ? <Icon name="chevron" size={15} color={c.textMuted} stroke={2.6} /> : null}
      </View>
    </Pressable>
  );
}

/** Un petit ecran d'app, en clair ou en sombre (le choix du theme) */
function MiniEcran({ mode, largeur, hauteur }: { mode: 'clair' | 'sombre'; largeur: number; hauteur: number }) {
  const p = PAPIER[mode];
  return (
    <View style={{ width: largeur, height: hauteur, backgroundColor: p.fond, padding: 8, gap: 5 }}>
      <View style={{ width: '46%', height: 6, borderRadius: 3, backgroundColor: p.encre, opacity: 0.85 }} />
      <View style={{ flex: 1, borderRadius: 8, backgroundColor: p.carte, padding: 6, gap: 4, borderWidth: mode === 'clair' ? 1 : 0, borderColor: '#E4E7F1' }}>
        <View style={{ width: '38%', height: 5, borderRadius: 3, backgroundColor: p.encre, opacity: 0.7 }} />
        <View style={{ width: '70%', height: 4, borderRadius: 2, backgroundColor: p.trait }} />
        <View style={{ width: '56%', height: 4, borderRadius: 2, backgroundColor: mode === 'clair' ? '#23358F' : '#8FA8DE' }} />
      </View>
    </View>
  );
}

export default function Personnaliser() {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const sombre = !!theme.isDark;
  const { espace } = useEspace();
  const { profile, armure } = useIdentite();
  const { fontSizeLevel } = useTheme();
  const { mode, setMode } = useModeTheme();
  const courbes = usePrefsCourbes();
  const styleWidgets = useStyleWidgets();
  const { disposition, changer: changerDisposition } = useDisposition();
  const styleCitation = useStyleCitation();
  const styleSante = useStyleSante();
  // 18 octobre 2026 : Décorations de saison (Halloween, Noël sur ton accueil), activees par defaut
  const decorations = useDecorationsSaison();
  // 27 octobre 2026 : Illustrations, Stickers (par defaut) ou Encre japonaise (les dessins d'avant)
  const illus = useIllustrations();
  const choisirIllustrations = (s: StyleIllustrations) => {
    if (s === illus.style) return;
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    illus.changer(s);
  };
  const { width } = useWindowDimensions();
  const [logo, setLogo] = useState<string | null>(null);

  // au retour du choix de l'icone : on relit ton icone
  useFocusEffect(
    useCallback(() => {
      getSelectedLogo().then(setLogo).catch(() => setLogo(null));
    }, []),
  );

  const go = (href: string) => router.push(href as any);
  const W = Math.min(560, width) - GUTTER * 2;
  const demi = Math.floor((W - 12) / 2);
  const rankIndex = armure?.rank.index ?? 0;
  const genre: 'h' | 'f' = espace.personnage === 'guerrier_f' ? 'f' : espace.personnage === 'guerrier_h' ? 'h' : profile?.avatar_gender === 'femme' ? 'f' : 'h';
  // 27 octobre 2026 : l'apercu montre TA scene et TON personnage, comme l'accueil, relus au retour sur l'ecran
  const vu = useEspaceAuRetour(espace);
  const scene = { nom: nomDeTaScene(vu.sceneFixe ?? vu.scene), image: imageDeTaScene(vu.scene) };
  const avecPerso = aUnPersonnage(vu.personnage);
  // 16 octobre 2026 : le rond de profil (meme regle que l'accueil) et son contour
  const montrePhoto = !!profile?.profile_photo && (espace.identite === 'photo' || !avecPerso);
  const contour = contourDe(espace);
  const styleCourbe = STYLES_COURBE.find((x) => x.id === courbes.style) ?? STYLES_COURBE[0];
  const couleur = COULEURS_COURBE.find((x) => x.id === courbes.couleur) ?? COULEURS_COURBE[0];
  const fondScene = sceneDuFond(courbes.fond, vu.scene);
  const widget = STYLES_WIDGETS.find((x) => x.id === styleWidgets) ?? STYLES_WIDGETS[0];
  const logoMeta = LOGO_OPTIONS.find((o) => o.id === logo) ?? LOGO_OPTIONS[0];
  const blocs = blocsAffiches(disposition.ordre, disposition.caches, BLOCS_ACCUEIL);
  const taille = FONT_LABELS[(fontSizeLevel ?? 2) - 1] ?? traduire('Normale');

  const choisirMode = (m: YoroiMode) => {
    if (m === mode) return;
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    setMode(m);
  };
  const choisirStyle = (s: StyleCourbe) => {
    if (s === courbes.style) return;
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    courbes.set({ style: s });
  };

  // la citation du jour : la meme que sur ton accueil ; cachee = le bloc « Ta citation du jour » decoche
  const citation = citationDuJour(devNow());
  const citationCachee = disposition.caches.includes('conseil');
  const montrerCitation = (montrer: boolean) => {
    const caches = disposition.caches.filter((b) => b !== 'conseil');
    changerDisposition({ ...disposition, caches: montrer ? caches : [...caches, 'conseil'] });
  };
  const choisirCitation = (s: StyleCitation) => {
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    if (s !== styleCitation.style) styleCitation.changer(s);
    if (citationCachee) montrerCitation(true);
  };

  const choisirSante = (s: StyleSante) => {
    if (s === styleSante.style) return;
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    styleSante.changer(s);
  };

  const themeL = Math.floor((W - 16 - 16) / 3);
  const styleL = Math.floor((W - 16 - 18) / 4);

  return (
    <EspaceScreen title={traduire("Personnaliser")} subtitle={traduire("Ta scène, ton personnage, ta photo, tes courbes, tes widgets et ton icône. Touche une tuile pour la changer.")} gap={12}>
      {/* ============ TON UNIVERS ============ */}
      <Groupe title={traduire("Ton univers")} sub={traduire("Le décor et l’ambiance de ton app")} />

      {/* le theme : trois petits ecrans, un toucher suffit */}
      <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 8, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {MODES_THEME.map((m) => {
            const actif = m.key === mode;
            return (
              <Pressable
                key={m.key}
                onPress={() => choisirMode(m.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: actif }}
                accessibilityLabel={traduire("Thème {0}", m.label)}
                style={({ pressed }) => ({ width: themeL, gap: 6, alignItems: 'center', opacity: pressed ? 0.85 : 1 })}
              >
                <View style={{ width: themeL, height: 82, borderRadius: 14, overflow: 'hidden', borderWidth: 2.5, borderColor: actif ? c.accent : c.divider, flexDirection: 'row' }}>
                  {m.key === 'auto' ? (
                    <>
                      <MiniEcran mode="clair" largeur={themeL / 2} hauteur={82} />
                      <MiniEcran mode="sombre" largeur={themeL / 2} hauteur={82} />
                    </>
                  ) : (
                    <MiniEcran mode={m.key as 'clair' | 'sombre'} largeur={themeL} hauteur={82} />
                  )}
                  {actif ? (
                    <View style={{ position: 'absolute', right: 5, bottom: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="check" size={12} color={c.onPrimary} stroke={3} />
                    </View>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <LanterneDessin mode={m.key} size={14} />
                  <Ink size={12.5} weight={actif ? 'black' : 'bold'} color={actif ? c.ink : c.textSecondary} numberOfLines={1}>{traduire(m.label)}</Ink>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 6, paddingBottom: 4 }}>
          {traduire("Thème. Aussi avec la petite lanterne en haut de l’accueil.")}</Ink>
      </View>

      {/* 19 octobre 2026 : Décorations de saison, une vraie carte (citrouille et sapin, gros interrupteur), juste sous le theme */}
      <CarteDecorations active={decorations.active} onChange={decorations.changer} date={devNow()} />

      {/* 27 octobre 2026 : Illustrations, deux styles en vrai apercu (chrono, carnet, objectifs), un toucher suffit */}
      <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 8, gap: 8 }}>
        <View style={{ paddingHorizontal: 8, paddingTop: 6, gap: 1 }}>
          <Ink size={15} weight="black" accessibilityRole="header">{traduire('Illustrations')}</Ink>
          <Ink size={12.5} weight="bold" color={c.textSecondary}>{traduire('Le style des dessins de toute l’app. Les tampons ne changent pas.')}</Ink>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {STYLES_ILLUSTRATIONS.map((s) => {
            const actif = s.id === illus.style;
            const nom = NOMS_ILLUSTRATIONS[s.id];
            return (
              <Pressable
                key={s.id}
                onPress={() => choisirIllustrations(s.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: actif }}
                accessibilityLabel={traduire('Illustrations, style {0}', nom)}
                style={({ pressed }) => ({ flex: 1, gap: 6, alignItems: 'center', opacity: pressed ? 0.85 : 1 })}
              >
                <View style={{ alignSelf: 'stretch', height: 76, borderRadius: 14, borderWidth: 2.5, borderColor: actif ? c.accent : c.divider, backgroundColor: c.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 4 }}>
                  {s.apercu.map((n) => (
                    <Image key={n} source={illustration(n, undefined, s.id)} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors />
                  ))}
                  {actif ? (
                    <View style={{ position: 'absolute', right: 5, bottom: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="check" size={11} color={c.onPrimary} stroke={3} />
                    </View>
                  ) : null}
                </View>
                <Ink size={12.5} weight={actif ? 'black' : 'bold'} color={actif ? c.ink : c.textSecondary} numberOfLines={1}>{nom}</Ink>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Tuile
          chevron={false}
          largeur={demi}
          titre={traduire("Ta scène")}
          valeur={vu.sceneRotation ? traduire('Elle change') : scene.nom}
          onPress={() => go(ROUTES_PERSONNALISER.scene)}
          apercu={
            <View style={{ height: 128, borderRadius: 15, overflow: 'hidden', backgroundColor: c.fillSoft }}>
              <Image source={scene.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
            </View>
          }
        />
        <Tuile
          chevron={false}
          largeur={demi}
          titre={traduire("Ton personnage")}
          valeur={personnageNom(vu.personnage)}
          onPress={() => go(ROUTES_PERSONNALISER.personnage)}
          apercu={
            <View style={{ height: 128, borderRadius: 15, overflow: 'hidden', backgroundColor: sombre ? '#222838' : '#E9E6DE', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Image source={scene.image} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.28 }} resizeMode="cover" accessibilityIgnoresInvertColors />
              {avecPerso ? (
                <Image source={personnageImage(vu.personnage, rankIndex, genre)} style={{ width: demi - 24, height: 124 }} resizeMode="contain" accessibilityIgnoresInvertColors />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Icon name="user" size={38} color={c.textMuted} stroke={2} />
                </View>
              )}
            </View>
          }
        />
      </View>

      {/* 16 octobre 2026 : Photo et contour, bien visible (Houari ne trouvait plus le contour de sa photo) */}
      <Tuile
        largeur={W}
        titre={traduire("Photo et contour")}
        // 28 octobre 2026 : le resume du rond, « Ta photo, hexagone, contour lilas, cœur »
        valeur={resumeRond(styleRondDe(espace), montrePhoto ? 'photo' : avecPerso ? 'personnage' : 'initiales')}
        onPress={() => go(ROUTES_PERSONNALISER.photo)}
        apercu={
          <View style={{ height: 92, borderRadius: 15, overflow: 'hidden', backgroundColor: c.fillSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' }}>
            <Image source={scene.image} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.45 }} resizeMode="cover" accessibilityIgnoresInvertColors />
            {/* 28 octobre 2026 : quatre contours et le tien (ils sont 19), dans ta forme et ton epaisseur */}
            {CONTOURS.filter((o) => o.id === contour || ['fin', 'or', 'lilas', 'aurore'].includes(o.id)).slice(0, 5).map((o) => (
              <View key={o.id} style={{ opacity: o.id === contour ? 1 : 0.55, transform: [{ scale: o.id === contour ? 1.08 : 0.9 }] }}>
                {/* le tien porte aussi ton badge */}
                <RondCadre size={58} {...styleRondDe(espace)} contour={o.id} badge={o.id === contour ? styleRondDe(espace).badge : null} fond="scene" fill="#F5F6FB">
                  {montrePhoto ? (
                    <Image source={{ uri: profile!.profile_photo! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
                  ) : avecPerso ? (
                    <BusteRond source={personnageImage(vu.personnage, rankIndex, genre)} />
                  ) : (
                    <RondInitiales size={58} nom={profile?.name} />
                  )}
                </RondCadre>
              </View>
            ))}
          </View>
        }
      />

      {/* ============ TON ACCUEIL ============ */}
      <Groupe title={traduire("Ton accueil")} sub={traduire("Ce que tu vois sous ta courbe, dans ton ordre")} />
      <Tuile
        largeur={W}
        titre={traduire("Tes blocs")}
        valeur={traduirePluriel(blocs.length, blocs.length > 1, "{0} bloc affiché, à ranger comme tu veux", "{0} blocs affichés, à ranger comme tu veux", blocs.length)}
        onPress={() => go(ROUTES_PERSONNALISER.accueil)}
        apercu={
          <View style={{ flexDirection: 'row', gap: 10, height: 112 }}>
            <View style={{ width: 78, borderRadius: 14, overflow: 'hidden', backgroundColor: c.fillSoft }}>
              <Image source={scene.image} style={{ width: '100%', height: 44 }} resizeMode="cover" accessibilityIgnoresInvertColors />
              <View style={{ padding: 6, gap: 4 }}>
                <View style={{ height: 14, borderRadius: 4, backgroundColor: c.surface }} />
                {[0, 1, 2].map((k) => (
                  <View key={k} style={{ height: 10, borderRadius: 3, backgroundColor: c.surface, opacity: k < blocs.length ? 1 : 0.35 }} />
                ))}
              </View>
            </View>
            <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
              {blocs.slice(0, 4).map((b, k) => (
                <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
                    <Ink size={11} weight="black" color={c.accent}>{String(k + 1)}</Ink>
                  </View>
                  <Ink size={13} weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{b}</Ink>
                </View>
              ))}
              {blocs.length > 4 ? <Ink size={12} color={c.textMuted}>{traduire("et {0} de plus", blocs.length - 4)}</Ink> : null}
              {blocs.length === 0 ? <Ink size={13} color={c.textMuted}>{traduire("Aucun bloc sous ta courbe")}</Ink> : null}
            </View>
          </View>
        }
      />

      {/* 17 octobre : ta citation du jour, trois styles en vrai apercu, et la masquer */}
      <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 8, gap: 8 }}>
        <View style={{ paddingHorizontal: 8, paddingTop: 6, gap: 1 }}>
          <Ink size={15} weight="black" accessibilityRole="header">{traduire("Ta citation")}</Ink>
          <Ink size={12.5} weight="bold" color={c.textSecondary}>{traduire("La phrase du jour sous tes outils. Touche un style.")}</Ink>
        </View>
        {STYLES_CITATION.map((s) => {
          const actif = !citationCachee && s.id === styleCitation.style;
          return (
            <Pressable
              key={s.id}
              onPress={() => choisirCitation(s.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: actif }}
              accessibilityLabel={`Citation, style ${s.nom}`}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <View style={{ borderRadius: 16, borderWidth: 2, borderColor: actif ? c.accent : c.divider, backgroundColor: c.background, paddingTop: 14, paddingBottom: 10, paddingHorizontal: 10, gap: 8, opacity: citationCachee ? 0.55 : 1 }}>
                <CitationDuJour texte={citation} style={s.id} />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {actif ? (
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="check" size={11} color={c.onPrimary} stroke={3} />
                    </View>
                  ) : null}
                  <Ink size={12.5} weight={actif ? 'black' : 'bold'} color={actif ? c.accent : c.textSecondary} numberOfLines={1}>{traduire(s.nom)}</Ink>
                </View>
              </View>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
            montrerCitation(citationCachee);
          }}
          accessibilityRole="switch"
          accessibilityState={{ checked: citationCachee }}
          accessibilityLabel={traduire("Masquer la citation")}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, paddingVertical: 8, opacity: pressed ? 0.85 : 1 })}
        >
          <View style={{ flex: 1, gap: 1 }}>
            <Ink size={14.5} weight="black">{traduire("Masquer la citation")}</Ink>
            <Ink size={12} weight="bold" color={c.textSecondary}>{citationCachee ? traduire('Tes outils, puis directement Ton poids') : traduire('Elle reste sous tes outils')}</Ink>
          </View>
          <Interrupteur on={citationCachee} />
        </Pressable>
      </View>

      {/* 17 octobre soir : le traitement de la tuile Ta sante aujourd'hui */}
      <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 8, gap: 8 }}>
        <View style={{ paddingHorizontal: 8, paddingTop: 6, gap: 1 }}>
          <Ink size={15} weight="black" accessibilityRole="header">{traduire("Ta santé")}</Ink>
          <Ink size={12.5} weight="bold" color={c.textSecondary}>{traduire("L’allure du rectangle de tes mesures du jour.")}</Ink>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {STYLES_SANTE.map((s) => {
            const actif = s.id === styleSante.style;
            const anneaux = ['#5FE3AE', '#FFA45C', '#BBA8FF'];
            return (
              <Pressable key={s.id} onPress={() => choisirSante(s.id)} accessibilityRole="radio" accessibilityState={{ selected: actif }} accessibilityLabel={traduire("Ta santé, style {0}", s.nom)} style={({ pressed }) => ({ flex: 1, gap: 6, alignItems: 'center', opacity: pressed ? 0.85 : 1 })}>
                <View style={{ alignSelf: 'stretch', height: 70, borderRadius: 14, borderWidth: 2.5, borderColor: actif ? c.accent : c.divider, overflow: 'hidden', backgroundColor: c.background }}>
                  {s.id === 'anneaux' ? (
                    <View style={{ flex: 1, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
                      {(sombre ? ['#5FE3AE', '#FFA45C', '#8FA8DE'] : ['#1F9E6A', '#E07B22', '#2C4A84']).map((k, i) => (
                        <View key={k} style={{ position: 'absolute', width: 44 - i * 12, height: 44 - i * 12, borderRadius: 22, borderWidth: 4, borderColor: k, borderRightColor: 'transparent' }} />
                      ))}
                    </View>
                  ) : s.id === 'clair' ? (
                    <View style={{ flex: 1, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      {(sombre ? [['#17302A', '#7FCDB3'], ['#2F2A1C', '#D8B562'], ['#272246', '#B5A8FF']] : [['#EEF7F3', '#1E6650'], ['#FAF4E8', '#7E5A14'], ['#F7F5FF', '#4B37C9']]).map(([f, k]) => (
                        <View key={k} style={{ width: 18, height: 30, borderRadius: 5, backgroundColor: f, alignItems: 'center', paddingTop: 4 }}>
                          <View style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: k }} />
                        </View>
                      ))}
                    </View>
                  ) : s.id === 'cadran' ? (
                    <LinearGradient colors={['#1E2639', '#121725']} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' }}>
                      {anneaux.map((k) => (
                        <View key={k} style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: k }} />
                      ))}
                    </LinearGradient>
                  ) : s.id === 'nuit' ? (
                    <View style={{ flex: 1, backgroundColor: c.surface }}>
                      <LinearGradient colors={['#151D38', '#243F78', '#2F569A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 38, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-evenly', paddingBottom: 8 }}>
                        {[0, 1, 2].map((k) => (
                          <View key={k} style={{ width: 18, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' }} />
                        ))}
                      </LinearGradient>
                    </View>
                  ) : (
                    <View style={{ flex: 1, backgroundColor: c.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' }}>
                      {(sombre ? ['#17302A', '#2F2A1C', '#272246'] : ['#DFF0EA', '#F5ECD6', '#F1EEFF']).map((k) => (
                        <View key={k} style={{ width: 20, height: 34, borderRadius: 6, backgroundColor: k }} />
                      ))}
                    </View>
                  )}
                  {actif ? (
                    <View style={{ position: 'absolute', right: 5, bottom: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="check" size={11} color={c.onPrimary} stroke={3} />
                    </View>
                  ) : null}
                </View>
                <Ink size={12.5} weight={actif ? 'black' : 'bold'} color={actif ? c.ink : c.textSecondary} numberOfLines={1}>{traduire(s.nom)}</Ink>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ============ TES GRAPHIQUES ============ */}
      <Groupe title={traduire("Tes graphiques")} sub={traduire("L’allure de ta courbe de poids, partout dans l’app")} />
      <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
        <Pressable onPress={() => go(ROUTES_PERSONNALISER.courbes)} accessibilityRole="button" accessibilityLabel={traduire("Tes courbes : style {0}, {1}, {2}. Ouvrir", styleCourbe.id, styleCourbe.nom, couleur.nom)} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
          <View style={{ margin: 8, marginBottom: 0, height: 118, borderRadius: 15, overflow: 'hidden', backgroundColor: c.background, borderWidth: 1, borderColor: c.divider, alignItems: 'center', justifyContent: 'center' }}>
            {fondScene ? (
              <>
                <Image source={sceneMeta(fondScene).image} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.background, opacity: 0.72 }} />
              </>
            ) : null}
            <ApercuCourbe style={styleCourbe.id} width={W - 40} height={96} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={15} weight="black" numberOfLines={1}>{traduire("Tes courbes")}</Ink>
              <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={1}>{`Style ${styleCourbe.id}, ${styleCourbe.nom.toLowerCase()}, ${couleur.nom.toLowerCase()}`}</Ink>
            </View>
            <Icon name="chevron" size={15} color={c.textMuted} stroke={2.6} />
          </View>
        </Pressable>
        {/* les quatre styles, d'un toucher : ta courbe change tout de suite */}
        <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 8, paddingBottom: 10, paddingTop: 4 }}>
          {STYLES_COURBE.map((s) => {
            const actif = s.id === courbes.style;
            return (
              <Pressable
                key={s.id}
                onPress={() => choisirStyle(s.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: actif }}
                accessibilityLabel={`Style ${s.id}, ${s.nom}`}
                style={({ pressed }) => ({ width: styleL, alignItems: 'center', gap: 4, opacity: pressed ? 0.85 : 1 })}
              >
                <View style={{ borderRadius: 12, borderWidth: 2, borderColor: actif ? c.accent : 'transparent', padding: 1 }}>
                  <ApercuCourbe style={s.id} width={styleL - 6} height={40} />
                </View>
                <Ink size={11.5} weight={actif ? 'black' : 'bold'} color={actif ? c.accent : c.textSecondary} numberOfLines={1}>{`Style ${s.id}`}</Ink>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ============ TES WIDGETS ============ */}
      <Groupe title={traduire("Tes widgets")} sub={traduire("Sur ton écran d’accueil et ton écran verrouillé")} />
      <Tuile
        largeur={W}
        titre={traduire("Style des widgets")}
        valeur={widget.nom}
        onPress={() => go(ROUTES_PERSONNALISER.widgets)}
        apercu={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['clair', 'sombre'] as const).map((m) => (
              <View key={m} style={{ flex: 1, gap: 4, alignItems: 'center' }}>
                <Image source={WIDGETS[widget.id][m]} style={{ width: '100%', aspectRatio: 1, maxHeight: 150, borderRadius: 16 }} resizeMode="cover" accessibilityIgnoresInvertColors />
              </View>
            ))}
          </View>
        }
      />

      {/* ============ TON ICONE ============ */}
      <Groupe title={traduire("Ton icône")} sub={traduire("L’icône de YOROI et la taille du texte")} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Tuile
          chevron={false}
          largeur={demi}
          titre={traduire("Icône de l’app")}
          valeur={logoMeta.name}
          onPress={() => go(ROUTES_PERSONNALISER.icone)}
          apercu={
            <View style={{ height: 104, borderRadius: 15, backgroundColor: c.fillSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={logoMeta.image} style={{ width: 72, height: 72, borderRadius: 17 }} resizeMode="cover" accessibilityIgnoresInvertColors />
            </View>
          }
        />
        <Tuile
          chevron={false}
          largeur={demi}
          titre={traduire("Taille du texte")}
          valeur={taille}
          onPress={() => go(ROUTES_PERSONNALISER.affichage)}
          apercu={
            <View style={{ height: 104, borderRadius: 15, backgroundColor: c.fillSoft, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, paddingBottom: 26 }}>
              {[1, 2, 3, 4].map((lvl) => (
                <Ink key={lvl} size={11 + lvl * 3.5} weight="black" allowFontScaling={false} color={lvl === (fontSizeLevel ?? 2) ? c.accent : c.textMuted}>{traduire("Aa")}</Ink>
              ))}
            </View>
          }
        />
      </View>
    </EspaceScreen>
  );
}
