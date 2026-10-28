/**
 * Carte d'entree de Ton profil dans les Reglages (28 octobre 2026, maquette validee « le melange », carte de A) :
 * ta scene, ton rond decore, ton prenom, ta ceinture (sport principal) et une ligne de details.
 * Fichier a part : il ne depend pas des feuilles des Reglages (pas d'import circulaire).
 */
import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import type { SceneId } from '@/lib/v2/espace';
import { RondCadre, type StyleRond } from '@/components/yoroi/v2/reglages/contour';
import { gammeDe, regleGrade, texteGrade, titreCeinture } from '@/lib/v2/profil/gammes';
import type { Pratique } from '@/lib/v2/profil/pratiques';
import { traduire } from '@/lib/i18n/tr';
import { CeintureNouee } from './CeintureNouee';
import { SceneImage } from './SceneImage';

export function MiniCarteAthlete({ scene, rond, styleRond, name, ceinture, details, onPress, onPhoto }: {
  scene: SceneId;
  rond: React.ReactNode;
  styleRond: StyleRond;
  name: string;
  ceinture: Pratique | null;
  /** « 178 cm, objectif 80 kg, atteint », ou tes sports */
  details: string;
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
  return (
    <Pressable
      onPress={press}
      accessibilityRole="button"
      accessibilityLabel={traduire('Ton profil, {0}. Modifier', name || traduire('à compléter'))}
      style={({ pressed }) => ({ minHeight: 176, borderRadius: 26, backgroundColor: c.surface, shadowColor: c.ink, shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, transform: [{ scale: pressed ? 0.99 : 1 }] })}
    >
      <View style={{ borderRadius: 26, overflow: 'hidden', minHeight: 176 }}>
        <View style={{ height: 84, overflow: 'hidden' }}>
          <SceneImage scene={scene} w={W} h={84} />
          <LinearGradient pointerEvents="none" colors={[isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)', c.surface]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 52 }} />
        </View>
        <View style={{ position: 'absolute', left: 14, top: 34 }}>
          <Pressable disabled={!onPhoto} onPress={onPhoto ? () => { selectionAsync().catch(() => {}); onPhoto(); } : undefined} accessibilityRole="button" accessibilityLabel={traduire('Modifier ta photo et son contour')}>
            <RondCadre size={84} {...styleRond} fond="papier" fill="#E6ECF8">{rond}</RondCadre>
          </Pressable>
        </View>
        <View style={{ marginLeft: 110, marginRight: 40, marginTop: 8, paddingBottom: 14, gap: 4 }}>
          <Ink size={23} weight="extraBold" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ letterSpacing: -0.5 }}>{name || traduire('Ton prénom')}</Ink>
          {ceinture?.ceinture && ligneCeinture ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CeintureNouee ceinture={ceinture.ceinture} degres={regle?.type === 'degres' ? n : 0} barrette={!!g?.barrette} width={40} ombre={false} />
              <Ink size={12.5} weight="extraBold" color="#3557D9" numberOfLines={1} style={{ flexShrink: 1 }} adjustsFontSizeToFit minimumFontScale={0.8}>{ligneCeinture}</Ink>
            </View>
          ) : null}
          <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2}>{details}</Ink>
        </View>
        <View pointerEvents="none" style={{ position: 'absolute', right: 14, top: 116 }}>
          <Icon name="chevron" size={16} color={c.textMuted} stroke={2.4} />
        </View>
      </View>
    </Pressable>
  );
}
