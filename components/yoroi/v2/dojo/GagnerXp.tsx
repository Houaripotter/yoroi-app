/**
 * Vague 45 : « Comment gagner des XP », la carte du Dojo pour un debutant.
 * Une ligne par source d'XP (icone simple, libelle, « +20 XP », limite en petit gris), avec les vrais chiffres
 * de xpRulesFor (lib/v2/armure.ts) pour l'objectif de la semaine. Pliable : 4 lignes, puis « Tout voir ».
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ChevronIcon, formatXp, tap } from '@/components/yoroi/v2/dojo/parts';
import type { XpSource } from '@/lib/v2/armure';

const NB = ' ';

export type RegleXp = { source: XpSource; label: string; xp: number; limit: string };

/** Vague 45 : icone dessinee de chaque source d'XP, trait simple dans une pastille */
function IconeSource({ source, color }: { source: XpSource; color: string }) {
  const s = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  let dessin: React.ReactNode;
  switch (source) {
    case 'seance':
      dessin = <Path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" {...s} />;
      break;
    case 'pesee':
      dessin = (
        <>
          <Rect x={4} y={4} width={16} height={16} rx={4} {...s} />
          <Path d="M8.5 10a4.5 4.5 0 0 1 7 0M12 12.5l1.6-2.6" {...s} />
        </>
      );
      break;
    case 'mensurations':
      dessin = <Path d="M4 15L15 4l5 5L9 20zM8 11l2 2M11 8l2 2M14.5 11.5l-1-1" {...s} />;
      break;
    case 'photo':
      dessin = (
        <>
          <Path d="M4 8h3l2-2h6l2 2h3v11H4z" {...s} />
          <Circle cx={12} cy={13} r={3.3} {...s} />
        </>
      );
      break;
    case 'record':
      dessin = <Path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z" {...s} />;
      break;
    case 'semaine':
      dessin = (
        <>
          <Rect x={4} y={6} width={16} height={14} rx={2.5} {...s} />
          <Path d="M8 4v4M16 4v4M9 14l2 2 4-4" {...s} />
        </>
      );
      break;
    case 'coffre':
      dessin = (
        <>
          <Path d="M4 11h16v8H4z" {...s} />
          <Path d="M4 11a8 5 0 0 1 16 0M11 13h2v2h-2z" {...s} />
        </>
      );
      break;
    case 'sceau':
      dessin = (
        <>
          <Circle cx={12} cy={12} r={7.5} {...s} />
          <Circle cx={12} cy={12} r={3.5} {...s} />
        </>
      );
      break;
    case 'lune':
      dessin = <Path d="M15 4a8 8 0 1 0 5 12.5A7 7 0 0 1 15 4z" {...s} />;
      break;
    default:
      dessin = <Path d="M5 12.5l4.5 4.5L19 7.5" {...s} />;
  }
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      {dessin}
    </Svg>
  );
}

/** Vague 45 : liste courte et pliable des facons de gagner de l'XP */
export function GagnerXp({ regles, visibles = 4, onVoirChemin }: { regles: RegleXp[]; visibles?: number; onVoirChemin?: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [ouvert, setOuvert] = useState(false);
  const liste = ouvert ? regles : regles.slice(0, visibles);
  const reste = Math.max(0, regles.length - visibles);

  // or pour les recompenses (semaine, sceau, Lune), rouge seulement pour le record, indigo pour le reste
  const teinte = (src: XpSource): { fg: string; bg: string } => {
    if (src === 'record') return { fg: c.record, bg: c.dangerTint };
    if (src === 'semaine' || src === 'sceau' || src === 'lune') return { fg: c.goldDeep, bg: c.goldTint };
    return { fg: c.accent, bg: c.accentTint };
  };

  return (
    <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 16, gap: 4 }}>
      <View style={{ gap: 2, marginBottom: 8 }}>
        <Ink size={17} weight="black" accessibilityRole="header">Comment gagner des XP</Ink>
        <Ink size={13} color={c.textSecondary}>Chaque action notée te rapproche du prochain rang. Ton XP ne baisse jamais.</Ink>
      </View>
      {liste.map((r, i) => {
        const t = teinte(r.source);
        return (
          <View
            key={r.source}
            accessible
            accessibilityLabel={`${r.label}, plus ${r.xp} XP, ${r.limit}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 8, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
              <IconeSource source={r.source} color={t.fg} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Ink size={14} weight="bold">{r.label}</Ink>
              <Ink size={12} color={c.textMuted}>{r.limit}</Ink>
            </View>
            <Ink size={14} weight="black" color={r.source === 'record' ? c.record : r.source === 'semaine' || r.source === 'sceau' || r.source === 'lune' ? c.goldDeep : c.accent} style={{ flexShrink: 0 }}>
              {`+${formatXp(r.xp)}${NB}XP`}
            </Ink>
          </View>
        );
      })}
      {reste > 0 ? (
        <Pressable
          onPress={() => {
            tap();
            setOuvert((o) => !o);
          }}
          accessibilityRole="button"
          accessibilityState={{ expanded: ouvert }}
          style={({ pressed }) => ({ minHeight: 44, marginTop: 4, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: pressed ? c.fillSubtle : c.fillSoft })}
        >
          <Ink size={14} weight="extraBold" color={c.accent}>{ouvert ? 'Voir moins' : `Tout voir (${reste} de plus)`}</Ink>
          <View style={{ transform: [{ rotate: ouvert ? '-90deg' : '90deg' }] }}>
            <ChevronIcon size={14} color={c.accent} />
          </View>
        </Pressable>
      ) : null}
      {ouvert && onVoirChemin ? (
        <Pressable onPress={onVoirChemin} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'center', minHeight: 40, justifyContent: 'center' }}>
          <Ink size={13} weight="bold" color={c.textSecondary}>Voir les rangs et ce qu’ils débloquent</Ink>
        </Pressable>
      ) : null}
    </View>
  );
}

export default GagnerXp;
