/**
 * « J'ai commencé plus tôt » (7 novembre 2026) : en haut de la seance en direct, l'heure de debut se corrige
 * (jusqu'a 3 heures en arriere). La duree et toutes les heures de la seance suivent (startedAt du brouillon,
 * aucune nouvelle colonne). Si la montre a un entrainement commence plus tot aujourd'hui, son heure est proposee
 * en un appui. Regles dans lib/v2/seance/montreCardio.ts (bornesDebut, suggestionsDebut).
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { ton } from '@/components/yoroi/v2/seance/pastel';
import { StickerOuIcone } from '@/components/yoroi/v2/profil/Rubriques';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { StickerSinon } from '@/components/yoroi/v2/ui/StickerSinon';
import { traduire } from '@/lib/i18n/tr';
import { bornesDebut, debutBorne, heureCourte, nomActivite } from '@/lib/v2/seance/montreCardio';
import type { EntrainementMontre } from '@/lib/v2/seance/montreCardio';

/** « Commencée à 16 h 10 », sous le chrono de la seance */
export function PastilleDebut({ debut, onPress }: { debut: number; onPress: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={traduire('Commencée à {0}. Modifier', heureCourte(debut))} hitSlop={8} style={({ pressed }) => ({ alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 28, paddingHorizontal: 9, borderRadius: 11, backgroundColor: pressed ? c.fillSubtle : ton('creme').fond })}>
      <Ink size={13} weight="extraBold" color={ton('creme').encre} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ flexShrink: 1 }}>{traduire('Commencée à {0}', heureCourte(debut))}</Ink>
      <StickerSinon nom="crayon" taille={16}>
        <Ink size={12} weight="black" color={c.accentText}>✎</Ink>
      </StickerSinon>
    </Pressable>
  );
}

const PAS: number[] = [5, 15, 30];

export function FeuilleDebut({ visible, debut, maintenant, suggestions, lecture, onValider, onClose }: {
  visible: boolean;
  debut: number;
  maintenant: number;
  /** entrainements de la montre commences plus tot aujourd'hui (deja filtres) */
  suggestions: EntrainementMontre[];
  lecture: boolean;
  onValider: (ms: number) => void;
  onClose: () => void;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [valeur, setValeur] = useState(debut);
  useEffect(() => {
    if (visible) setValeur(debutBorne(debut, maintenant));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  const { min, max } = bornesDebut(maintenant);
  const minutes = Math.max(0, Math.round((maintenant - valeur) / 60_000));
  const t = ton('creme');
  return (
    <Sheet visible={visible} onClose={onClose} title={traduire('J’ai commencé plus tôt')}>
      <View style={{ borderRadius: 24, backgroundColor: t.fond, padding: 16, alignItems: 'center', gap: 4 }}>
        <StickerOuIcone sticker="chrono" icon="timer" size={56} />
        <Ink size={14} weight="extraBold" color={t.encre}>{traduire('Commencée à')}</Ink>
        <Ink size={48} weight="black" tight color={c.ink} style={{ fontVariant: ['tabular-nums'] }} accessibilityLiveRegion="polite">{heureCourte(valeur)}</Ink>
        <Ink size={14} weight="bold" color={c.textSecondary}>{traduire('Il y a {0} min', minutes)}</Ink>
      </View>
      {([['tot', -1], ['tard', 1]] as const).map(([cle, sens]) => (
        <View key={cle} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ink size={15} weight="extraBold" color={c.ink} style={{ width: 92 }}>{sens < 0 ? traduire('Plus tôt') : traduire('Plus tard')}</Ink>
          {PAS.map((p) => {
            const cible = valeur + sens * p * 60_000;
            const ok = sens < 0 ? cible >= min : cible <= max;
            return (
              <Pressable
                key={p}
                onPress={() => setValeur(debutBorne(cible, maintenant))}
                disabled={!ok}
                accessibilityRole="button"
                accessibilityLabel={sens < 0 ? traduire('{0} minutes plus tôt', p) : traduire('{0} minutes plus tard', p)}
                style={({ pressed }) => ({ flex: 1, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: ok ? 1 : 0.4, backgroundColor: pressed ? c.fillSubtle : sens < 0 ? ton('peche').fond : ton('menthe').fond })}
              >
                <Ink size={16} weight="black" color={sens < 0 ? ton('peche').encre : ton('menthe').encre}>{traduire('{0} min', p)}</Ink>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Ink size={12} weight="bold" color={c.textMuted} style={{ paddingHorizontal: 4 }}>{traduire('Jusqu’à 3 heures avant maintenant.')}</Ink>
      {lecture ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
          <ActivityIndicator color={c.textSecondary} />
          <Ink size={13} weight="bold" color={c.textSecondary}>{traduire('Lecture de ta montre')}</Ink>
        </View>
      ) : null}
      {suggestions.map((w) => (
        <Pressable
          key={w.id}
          onPress={() => onValider(debutBorne(w.debutMs, maintenant))}
          accessibilityRole="button"
          accessibilityLabel={traduire('Ta montre : {0} commencée à {1}', nomActivite(w.activite), heureCourte(w.debutMs))}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: pressed ? c.fillSubtle : ton('lilas').fond })}
        >
          <StickerOuIcone sticker="sante_appareils" icon="timer" size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={15} weight="black" color={ton('lilas').encre}>{traduire('Ta montre : {0} à {1}', nomActivite(w.activite), heureCourte(w.debutMs))}</Ink>
            <Ink size={13} weight="bold" color={c.textSecondary}>{traduire('Prendre cette heure')}</Ink>
          </View>
        </Pressable>
      ))}
      <BoutonPrincipal label={traduire('Valider')} onPress={() => onValider(valeur)} />
    </Sheet>
  );
}
