/**
 * Ce que Premium fait de TON plan (17 octobre 2026). Houari : « il faut mettre les choses en avant pour donner envie de
 * payer, par exemple mettre Heny ton plan, perdre du poids, etc., à la place des notes ». Sous la carte « Ton plan » :
 *  - une phrase qui relie Premium a ce plan (selon ton objectif, avec ton vrai poids vise ; sans plan, une phrase generale) ;
 *  - la courbe en entier (ta vraie courbe voilee au-dela de la periode gratuite, sinon un exemple marque comme tel) ;
 *  - trois benefices concrets, chacun avec sa petite illustration, dans l'ordre de ton objectif.
 * Chaque promesse reprend la description de lib/v2/premium/offer.ts (PREMIUM_ROWS) : rien qui ne soit vraiment dans Premium,
 * aucun chiffre invente, aucune urgence.
 */
import React from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon, type IconName } from '@/components/yoroi/v2/espace/ui';
import { sceneForNow } from '@/components/yoroi/v2/accueil/images';
import { PREMIUM_ROWS } from '@/lib/v2/premium/offer';
import type { SceneId } from '@/lib/v2/espace';
import { traduire } from '@/lib/i18n/tr';

const desc = (id: string) => PREMIUM_ROWS.find((r) => r.id === id)?.desc ?? '';

/** La phrase qui relie Premium a ton plan. cible : ton poids vise deja formate (« 80 »), null sans poids vise */
export function phrasePlan(goal: string | null, cible: string | null): string {
  if ((goal === 'lose' || goal === 'gain') && cible) return traduire("Premium te montre tout le chemin jusqu’à {0} kg : ta courbe en entier et ton poids projeté.", cible);
  if (goal === 'combat') return traduire('Premium suit ta préparation jusqu’à la pesée : tes rounds analysés, ton camp et ta coupe.');
  if (goal === 'maintain') return traduire('Premium garde tout ton historique : tu vois mois après mois si ton poids tient.');
  if (cible) return traduire("Premium te montre tout le chemin jusqu’à {0} kg : ta courbe en entier et ton poids projeté.", cible);
  return traduire('Premium te montre tout le chemin : ta courbe en entier, ton poids projeté et tes analyses.');
}

export function PhrasePlan({ texte }: { texte: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 }}>
      <View style={{ marginTop: 2 }}>
        <Icon name="crown" size={15} color={c.accent} />
      </View>
      <Ink size={14.5} weight="extraBold" style={{ flex: 1, lineHeight: 20 }}>{texte}</Ink>
    </View>
  );
}

type Benefice = { id: string; titre: string; texte: string; visuel: React.ReactNode };

/** Radar dessine (illustration, aucune valeur) */
function RadarDessin({ couleur, trait }: { couleur: string; trait: string }) {
  const pts = (r: number[]) => r.map((v, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    return `${28 + Math.cos(a) * 22 * v},${28 + Math.sin(a) * 22 * v}`;
  }).join(' ');
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56">
      <Polygon points={pts([1, 1, 1, 1, 1, 1])} fill="none" stroke={trait} strokeWidth={1.4} />
      <Polygon points={pts([0.55, 0.55, 0.55, 0.55, 0.55, 0.55])} fill="none" stroke={trait} strokeWidth={1} />
      {[0, 1, 2].map((i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 3;
        return <Line key={i} x1={28 - Math.cos(a) * 22} y1={28 - Math.sin(a) * 22} x2={28 + Math.cos(a) * 22} y2={28 + Math.sin(a) * 22} stroke={trait} strokeWidth={1} />;
      })}
      <Polygon points={pts([0.85, 0.6, 0.9, 0.5, 0.75, 0.65])} fill={couleur} fillOpacity={0.28} stroke={couleur} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={28} cy={28} r={2} fill={couleur} />
    </Svg>
  );
}

function Tuile({ children, fond }: { children: React.ReactNode; fond: string }) {
  return <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: fond, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{children}</View>;
}

function TuileIcone({ icon, fond, encre }: { icon: IconName; fond: string; encre: string }) {
  return (
    <Tuile fond={fond}>
      <Icon name={icon} size={28} color={encre} stroke={2.2} />
    </Tuile>
  );
}

/** Une vraie scene Premium avec son personnage, en vignette (comme la photo de ta carte « Ton plan ») */
function TuileMonde({ scene, personnage }: { scene: SceneId; personnage: ImageSourcePropType }) {
  const h = 64;
  const w = Math.round(h * (1200 / 670));
  return (
    <View style={{ width: 64, height: 64, borderRadius: 18, overflow: 'hidden', backgroundColor: '#1E2336' }}>
      <Image source={sceneForNow(scene)} resizeMode="cover" style={{ position: 'absolute', top: 0, left: -Math.round((w - 64) * 0.55), width: w, height: h }} />
      <Image source={personnage} resizeMode="contain" style={{ position: 'absolute', top: 2, left: -28, width: 120, height: 160 }} />
    </View>
  );
}

/** Les trois benefices, dans l'ordre de ton objectif (combat d'abord si tu vises la competition) */
export function ListeBenefices({ goal, monde: vitrine }: { goal: string | null; monde: { scene: SceneId; personnage: ImageSourcePropType } }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const analyses: Benefice = { id: 'analyses', titre: traduire('Analyses et bilans'), texte: desc('analyses'), visuel: <Tuile fond={c.accentTint}><RadarDessin couleur={c.accent} trait={c.textMuted} /></Tuile> };
  const combat: Benefice = { id: 'combat', titre: traduire('Combat et compétition'), texte: desc('combat'), visuel: <TuileIcone icon="swords" fond={c.accentTint} encre={c.accent} /> };
  const monde: Benefice = { id: 'monde', titre: traduire('Scènes et personnages'), texte: desc('monde'), visuel: <TuileMonde scene={vitrine.scene} personnage={vitrine.personnage} /> };
  const liste = goal === 'combat' ? [combat, analyses, monde] : [analyses, combat, monde];
  return (
    <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
      {liste.map((b, i) => (
        <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderColor: c.divider }} accessible accessibilityLabel={traduire("{0}, avec Premium. {1}", b.titre, b.texte)}>
          {b.visuel}
          <View style={{ flex: 1, gap: 3 }}>
            <Ink size={15} weight="black" style={{ lineHeight: 19 }}>{traduire(b.titre)}</Ink>
            <Ink size={13} color={c.textSecondary} style={{ lineHeight: 18 }}>{traduire(b.texte)}</Ink>
          </View>
        </View>
      ))}
    </View>
  );
}

/** La carte de la courbe en entier : titre selon ton objectif, ta vraie courbe voilee (ou un exemple), une ligne vraie */
export function CarteCourbe({ titre, ligne, exemple, children, pastille }: { titre: string; ligne: string; exemple: boolean; children: React.ReactNode; pastille: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ borderRadius: 22, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, padding: 16, gap: 10, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ink size={16} weight="black" style={{ flex: 1 }} numberOfLines={2}>{titre}</Ink>
        {pastille}
      </View>
      <View>
        {children}
        {exemple ? (
          <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: c.accentTint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Ink size={10} weight="black" color={c.accent} style={{ letterSpacing: 0.8 }}>{traduire("EXEMPLE")}</Ink>
          </View>
        ) : null}
      </View>
      <Ink size={13} color={c.textSecondary} style={{ lineHeight: 18 }}>{ligne}</Ink>
    </View>
  );
}
