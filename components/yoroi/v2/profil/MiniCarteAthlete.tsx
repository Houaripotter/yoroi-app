/**
 * Carte d'entree de Ton profil dans les Reglages (28 octobre 2026, maquette validee « le melange », carte de A) :
 * ta scene, ton rond decore, ton prenom, ta ceinture (sport principal) et une ligne de details.
 * Fichier a part : il ne depend pas des feuilles des Reglages (pas d'import circulaire).
 * 28 octobre 2026 (Houari : « on peut mieux faire ») : plus equilibree, dans le style de la carte d'athlete. Le rond est
 * pose dans la scene, a cheval sur son bas ; le prenom et une fleche ronde pastel alignes a sa droite ; la ceinture dans
 * une pastille bleu pastel ; la taille et l'objectif en petites pastilles de couleur (l'objectif atteint en menthe, coche).
 * Ancienne version : _archive_ancien_design_2026-10-09/rond_retours_2026-10-28/.
 */
import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { P } from '@/components/yoroi/livePalette';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import type { SceneId } from '@/lib/v2/espace';
import { RondCadre, type StyleRond } from '@/components/yoroi/v2/reglages/contour';
import { gammeDe, regleGrade, texteGrade, titreCeinture } from '@/lib/v2/profil/gammes';
import type { Pratique } from '@/lib/v2/profil/pratiques';
import { traduire } from '@/lib/i18n/tr';
import { CeintureNouee } from './CeintureNouee';
import { SceneImage } from './SceneImage';

const SCENE_H = 96;
const ROND = 86;
const MARGE = 16;

function Pastille({ texte, fond, couleur, coche, label }: { texte: string; fond: string; couleur: string; coche?: boolean; label?: string }) {
  return (
    <View accessible accessibilityLabel={label ?? texte} style={{ height: 26, borderRadius: 13, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: fond, maxWidth: '100%' }}>
      {coche ? <Icon name="check" size={11} color={couleur} stroke={3} /> : null}
      <Ink size={12} weight="extraBold" color={couleur} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1 }}>{texte}</Ink>
    </View>
  );
}

export function MiniCarteAthlete({ scene, rond, styleRond, name, ceinture, details, taille, objectif, atteint, onPress, onPhoto }: {
  scene: SceneId;
  rond: React.ReactNode;
  styleRond: StyleRond;
  name: string;
  ceinture: Pratique | null;
  /** « 178 cm, objectif 80 kg, atteint », ou tes sports : montre seulement sans taille ni objectif */
  details: string;
  /** « 178 cm » */
  taille?: string | null;
  /** « Objectif 80 kg » (atteint : pastille menthe et coche) */
  objectif?: string | null;
  atteint?: boolean;
  onPress: () => void;
  onPhoto?: () => void;
}) {
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const W = width - 2 * 16;
  const g = ceinture ? gammeDe(ceinture.sport) : null;
  const regle = ceinture ? regleGrade(ceinture.sport, ceinture.ceinture) : null;
  const n = ceinture?.degres ?? 0;
  const grade = ceinture?.ceinture ? texteGrade(ceinture.sport, ceinture.ceinture, n) : null;
  const ligneCeinture = ceinture?.ceinture ? (grade && !(regle?.type === 'degres' && n === 0) ? `${titreCeinture(ceinture.ceinture)}, ${grade.charAt(0).toLowerCase()}${grade.slice(1)}` : titreCeinture(ceinture.ceinture)) : null;
  const press = () => { selectionAsync().catch(() => {}); onPress(); };
  const avecPastilles = !!(taille || objectif);
  const gauche = MARGE + ROND + 14;
  return (
    <Pressable
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={traduire('Ton profil, {0}. Modifier', name || traduire('à compléter'))}
      style={({ pressed }) => ({ borderRadius: 26, backgroundColor: c.surface, shadowColor: c.ink, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, transform: [{ scale: pressed ? 0.99 : 1 }] })}
    >
      <View style={{ borderRadius: 26, overflow: 'hidden' }}>
        {/* ta scene, fondue vers le blanc de la carte */}
        <View style={{ height: SCENE_H, overflow: 'hidden' }}>
          <SceneImage scene={scene} w={W} h={SCENE_H} />
          <LinearGradient pointerEvents="none" colors={[isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)', c.surface]} locations={[0.35, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        </View>

        {/* le prenom et la fleche, alignes a droite du rond */}
        <View style={{ marginLeft: gauche, marginRight: MARGE, marginTop: -20, minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ink size={24} weight="extraBold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ flex: 1, letterSpacing: -0.5 }}>{name || traduire('Ton prénom')}</Ink>
          <View pointerEvents="none" style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: P.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevron" size={15} color={P.onPrimary} stroke={2.6} />
          </View>
        </View>

        <View style={{ marginLeft: gauche, marginRight: MARGE, marginTop: 6, paddingBottom: 16, gap: 8 }}>
          {ceinture?.ceinture && ligneCeinture ? (
            <View style={{ alignSelf: 'flex-start', maxWidth: '100%', height: 30, borderRadius: 15, paddingLeft: 6, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: isDark ? c.fillSoft : '#E6ECF8' }}>
              <CeintureNouee ceinture={ceinture.ceinture} degres={regle?.type === 'degres' ? n : 0} barrette={!!g?.barrette} width={36} ombre={false} />
              <Ink size={12.5} weight="extraBold" color={P.accent} numberOfLines={1} style={{ flexShrink: 1 }} adjustsFontSizeToFit minimumFontScale={0.8}>{ligneCeinture}</Ink>
            </View>
          ) : null}
          {avecPastilles ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {taille ? <Pastille texte={taille} fond={P.programmeFond} couleur={P.etiquettePrune} /> : null}
              {objectif ? <Pastille texte={objectif} fond={atteint ? P.tuileMentheFond : P.tuileSableFond} couleur={atteint ? P.tuileMentheTexte : P.tuileSableTexte} coche={atteint} label={atteint ? traduire('{0}, atteint', objectif) : objectif} /> : null}
            </View>
          ) : (
            <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2}>{details}</Ink>
          )}
        </View>

        {/* ton rond, pose dans la scene, a cheval sur son bas */}
        <View style={{ position: 'absolute', left: MARGE, top: SCENE_H - ROND + 26 }}>
          <Pressable disabled={!onPhoto} onPress={onPhoto ? () => { selectionAsync().catch(() => {}); onPhoto(); } : undefined} accessibilityRole="button" accessibilityLabel={traduire('Modifier ta photo et son contour')} hitSlop={4}>
            {/* l'ombre seulement sous le rond et le carre arrondi (sous une forme decoupee, elle dessinerait un carre) */}
            <View style={styleRond.forme === 'rond' || styleRond.forme === 'carre' ? { borderRadius: styleRond.forme === 'rond' ? ROND / 2 : ROND * 0.3, shadowColor: c.ink, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 } : undefined}>
              <RondCadre size={ROND} {...styleRond} fond="scene" fill="#E6ECF8">{rond}</RondCadre>
            </View>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
