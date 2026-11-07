/**
 * Le cardio fait avec l'app Exercice de l'Apple Watch, repris dans la seance (7 novembre 2026) : le bouton
 * « Récupérer depuis ta montre », la banniere qui le propose toute seule, le message sans resultat ou sans acces,
 * le choix entre plusieurs entrainements et le badge de l'exercice rempli. Les regles sont dans
 * lib/v2/seance/montreCardio.ts (pur, teste). Que des valeurs lues dans Apple Sante, rien d'estime.
 */
import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { ton } from '@/components/yoroi/v2/seance/pastel';
import { StickerOuIcone } from '@/components/yoroi/v2/profil/Rubriques';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { traduire } from '@/lib/i18n/tr';
import { fmtNum } from '@/lib/v2/seance/format';
import { infoCardio } from '@/lib/v2/seances/cardioChoix';
import type { TypeCardio } from '@/lib/v2/seances/cardioFin';
import { heureCourte, minutesDe, nomActivite } from '@/lib/v2/seance/montreCardio';
import type { ActiviteMontre, EntrainementMontre, MontreCardio } from '@/lib/v2/seance/montreCardio';

const TYPE_DE: Record<ActiviteMontre, TypeCardio> = {
  marche: 'marche_inclinee', randonnee: 'marche_inclinee', course: 'tapis_course', velo: 'velo', rameur: 'rameur',
  elliptique: 'elliptique', escalier: 'escalier', corde: 'corde', cardio: 'autre',
};
const stickerDe = (a: ActiviteMontre | null): NomSticker => (a ? infoCardio(TYPE_DE[a]).sticker : 'activite') as NomSticker;

/** « 22 min · 182 kcal · 1,8 km · 118 bpm » : seulement ce qu'Apple Sante a donne */
export function valeursMontre(v: { dureeSec: number; kcal?: number; distanceKm?: number; fcMoy?: number }): string {
  return [
    traduire('{0} min', minutesDe(v.dureeSec)),
    v.kcal ? traduire('{0} kcal', v.kcal) : '',
    v.distanceKm ? traduire('{0} km', fmtNum(v.distanceKm)) : '',
    v.fcMoy ? traduire('{0} bpm', v.fcMoy) : '',
  ].filter(Boolean).join(' · ');
}

/** Le bouton sous le chrono du cardio */
export function BoutonMontre({ onPress, lecture }: { onPress: () => void; lecture: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const t = ton('ciel');
  return (
    <Pressable
      onPress={onPress}
      disabled={lecture}
      accessibilityRole="button"
      accessibilityLabel={traduire('Récupérer depuis ta montre')}
      accessibilityState={{ busy: lecture }}
      style={({ pressed }) => ({ minHeight: 52, borderRadius: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed ? c.fillSubtle : t.fond })}
    >
      <StickerOuIcone sticker="sante_appareils" icon="timer" size={36} />
      <Ink size={15} weight="black" color={t.encre} style={{ flex: 1 }} numberOfLines={2}>
        {lecture ? traduire('Lecture de ta montre') : traduire('Récupérer depuis ta montre')}
      </Ink>
      {lecture ? <ActivityIndicator color={t.encre} /> : null}
    </Pressable>
  );
}

/** « Ta marche de 22 min est sur ta montre. La récupérer ? » */
export function BanniereMontre({ texte, onOui, onNon }: { texte: string; onOui: () => void; onNon: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const t = ton('lilas');
  return (
    <View accessibilityLiveRegion="polite" style={{ borderRadius: 22, backgroundColor: t.fond, padding: 14, gap: 12, borderWidth: 2, borderColor: t.encre }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <StickerOuIcone sticker="sante_appareils" icon="timer" size={52} />
        <Ink size={16} weight="black" color={t.encre} style={{ flex: 1 }}>{texte}</Ink>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={onOui} accessibilityRole="button" accessibilityLabel={traduire('Récupérer')} style={({ pressed }) => ({ flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.primaryPressed : c.primary })}>
          <Ink size={15} weight="black" color={c.onPrimary}>{traduire('Récupérer')}</Ink>
        </Pressable>
        <Pressable onPress={onNon} accessibilityRole="button" accessibilityLabel={traduire('Pas maintenant')} style={({ pressed }) => ({ flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSubtle : c.surface })}>
          <Ink size={15} weight="extraBold" color={c.ink}>{traduire('Pas maintenant')}</Ink>
        </Pressable>
      </View>
    </View>
  );
}

/** Aucun entrainement, ou Apple Sante pas connecte (avec le bouton vers la connexion habituelle) */
export function MessageMontre({ texte, action, onAction, onFermer }: { texte: string; action?: string; onAction?: () => void; onFermer: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const t = ton('peche');
  return (
    <View accessibilityLiveRegion="polite" style={{ borderRadius: 18, backgroundColor: t.fond, padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <StickerOuIcone sticker="sante_appareils" icon="timer" size={34} />
        <Ink size={14} weight="extraBold" color={t.encre} style={{ flex: 1 }}>{texte}</Ink>
        <Pressable onPress={onFermer} accessibilityRole="button" accessibilityLabel={traduire('Fermer')} hitSlop={10} style={{ minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={18} weight="black" color={t.encre}>×</Ink>
        </Pressable>
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={action} style={({ pressed }) => ({ minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.primaryPressed : c.primary })}>
          <Ink size={15} weight="black" color={c.onPrimary}>{action}</Ink>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Plusieurs entrainements vont avec ce cardio : tu choisis le bon */
export function FeuilleChoixMontre({ visible, liste, onChoisir, onClose }: { visible: boolean; liste: EntrainementMontre[]; onChoisir: (w: EntrainementMontre) => void; onClose: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Sheet visible={visible} onClose={onClose} title={traduire('Lequel est ton cardio ?')} scroll>
      <Ink size={14} weight="bold" color={c.textSecondary} style={{ paddingHorizontal: 4 }}>{traduire('Ta montre en a plusieurs pendant ta séance.')}</Ink>
      {liste.map((w, i) => (
        <Pressable
          key={w.id}
          onPress={() => onChoisir(w)}
          accessibilityRole="button"
          accessibilityLabel={traduire('{0}, de {1} à {2}', nomActivite(w.activite), heureCourte(w.debutMs), heureCourte(w.finMs))}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: pressed ? c.fillSubtle : i % 2 ? ton('menthe').fond : ton('ciel').fond })}
        >
          <StickerOuIcone sticker={stickerDe(w.activite)} icon="timer" size={48} />
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={17} weight="black" color={c.ink}>{nomActivite(w.activite)}</Ink>
            <Ink size={14} weight="extraBold" color={c.textSecondary}>{traduire('De {0} à {1}', heureCourte(w.debutMs), heureCourte(w.finMs))}</Ink>
            <Ink size={14} weight="bold" color={c.ink}>{valeursMontre(w)}</Ink>
          </View>
        </Pressable>
      ))}
    </Sheet>
  );
}

/** L'exercice rempli : d'ou viennent les chiffres, et les kcal mesurees */
export function BadgeMontre({ montre, dureeSec, distanceKm, fcMoy }: { montre: MontreCardio; dureeSec: number; distanceKm?: number; fcMoy?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const t = ton('ciel');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18, backgroundColor: c.surface }}>
      <StickerOuIcone sticker="sante_appareils" icon="timer" size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: t.fond }}>
          <Ink size={13} weight="black" color={t.encre}>{montre.appareil ?? traduire('Apple Santé')}</Ink>
        </View>
        <Ink size={14} weight="extraBold" color={c.ink}>{valeursMontre({ dureeSec, kcal: montre.kcal, distanceKm, fcMoy })}</Ink>
      </View>
    </View>
  );
}
