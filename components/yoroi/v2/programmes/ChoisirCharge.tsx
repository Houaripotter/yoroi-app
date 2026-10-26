/**
 * « Comment choisir ta charge » (26 octobre 2026) : lourd, moyen, léger expliqués simplement,
 * avec les études qui le disent (lib/v2/programmes/charge.ts, sources.ts).
 */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Glass, Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { COMMENT_CHOISIR, SOURCES_COMMENT_CHOISIR } from '@/lib/v2/programmes/charge';
import { sourceParId } from '@/lib/v2/programmes/sources';
import { safeOpenURL } from '@/lib/security/validators';
import { traduire } from '@/lib/i18n/tr';

export function ChoisirCharge() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <Glass onPress={() => setOuvert(true)} label={traduire('Comment choisir ta charge')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="dumbbell" size={20} color={c.ink} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="black" tight>{traduire('Comment choisir ta charge')}</Ink>
          <Ink size={12} color={c.textSecondary}>{traduire('Lourd, moyen ou léger : ce que ça veut dire pour toi.')}</Ink>
        </View>
        <Icon name="chevron" size={18} color={c.textMuted} />
      </Glass>
      <Sheet visible={ouvert} onClose={() => setOuvert(false)} title={traduire('Comment choisir ta charge')}>
        <View style={{ gap: 14, paddingHorizontal: 4 }}>
          {COMMENT_CHOISIR.map((x) => (
            <View key={x.titre} style={{ gap: 3 }}>
              <Ink size={15} weight="black" tight>{traduire(x.titre)}</Ink>
              <Ink size={14} color={c.textSecondary} style={{ lineHeight: 20 }}>{traduire(x.texte)}</Ink>
            </View>
          ))}
          <View style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider }}>
            <Ink size={12} weight="extraBold" color={c.textMuted}>{traduire('LES ÉTUDES')}</Ink>
            {SOURCES_COMMENT_CHOISIR.map((id) => {
              const s = sourceParId(id);
              if (!s) return null;
              return (
                <Pressable key={id} onPress={() => { tap(); void safeOpenURL(s.lien); }} accessibilityRole="link" style={{ minHeight: 40, justifyContent: 'center' }}>
                  <Ink size={12} weight="extraBold" color={c.accent}>{`${s.auteurs}, ${s.annee}`}</Ink>
                  <Ink size={12} color={c.textSecondary}>{traduire(s.apport)}</Ink>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Sheet>
    </>
  );
}
