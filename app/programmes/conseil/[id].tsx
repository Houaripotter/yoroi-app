/**
 * Fiche conseil (24 octobre 2026) : un sujet (perdre du gras, grip, sac de frappe...), des points courts,
 * les programmes qui vont avec et les etudes sources. Contenu dans lib/v2/programmes/conseils.ts.
 */
import React from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { stickerDuGuide } from '@/components/yoroi/v2/programmes/stickersGuides';
import { carteBlanche, ton } from '@/components/yoroi/v2/seance/pastel';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { Glass, SectionTitle } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { safeOpenURL } from '@/lib/security/validators';
import { guideParId } from '@/lib/v2/programmes/conseils';
import { programmeParId } from '@/lib/v2/programmes/catalogue';
import { sourceParId } from '@/lib/v2/programmes/sources';
import { traduire } from '@/lib/i18n/tr';

export default function ConseilScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const g = guideParId(typeof id === 'string' ? id : undefined);
  const illus = useIllustrations();

  if (!g) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <EnTete titre={traduire('Conseil introuvable')} repli="/programmes" style={{ marginHorizontal: -16, marginTop: -8 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        <EnTete titre={traduire(g.titre)} sousTitre={traduire(g.accroche)} repli="/programmes" style={{ marginHorizontal: -16, marginTop: -8 }} />

        {/* 27 octobre 2026 (refonte Pastel) : l'essentiel sur le creme, avec le sticker du conseil */}
        <View style={{ padding: 16, borderRadius: 24, backgroundColor: ton('creme').fond, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Ink size={12} weight="black" color={ton('creme').encre} style={{ letterSpacing: 0.6 }}>{traduire('L’ESSENTIEL')}</Ink>
            <Image source={illus.img(stickerDuGuide(g.id))} style={{ width: 52, height: 52, marginVertical: -6 }} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
          {g.essentiel.map((t, i) => (
            <Ink key={i} size={15} weight="bold" style={{ lineHeight: 21 }}>{traduire(t)}</Ink>
          ))}
        </View>

        {g.sections.map((s, i) => (
          <View key={i} style={{ gap: 8 }}>
            <SectionTitle title={traduire(s.titre)} />
            <Glass style={[carteBlanche(c.surface, c.divider), { gap: 12 }]}>
              {s.points.map((pt, k) => (
                <View key={k} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.detail, marginTop: 7 }} />
                  <Ink size={14} style={{ flex: 1, lineHeight: 20 }}>{traduire(pt)}</Ink>
                </View>
              ))}
            </Glass>
          </View>
        ))}

        {g.programmes.length > 0 ? (
          <>
            <SectionTitle title={traduire('Les programmes qui vont avec')} />
            {g.programmes.map((pid) => {
              const p = programmeParId(pid);
              if (!p) return null;
              return (
                <Glass key={pid} onPress={() => router.push({ pathname: '/programmes/[id]' as any, params: { id: pid } })} label={traduire(p.titre)} style={[carteBlanche(c.surface, c.divider), { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Ink size={15} weight="black" tight>{traduire(p.titre)}</Ink>
                    <Ink size={12} color={c.textSecondary} numberOfLines={2}>{traduire(p.accroche)}</Ink>
                  </View>
                  <Icon name="chevron" size={18} color={c.textMuted} />
                </Glass>
              );
            })}
          </>
        ) : null}

        <SectionTitle title={traduire('Les sources')} />
        <View style={{ gap: 8 }}>
          {g.sources.map((sid) => {
            const s = sourceParId(sid);
            if (!s) return null;
            return (
              <Glass key={sid} onPress={() => void safeOpenURL(s.lien)} label={s.titre} style={[carteBlanche(c.surface, c.divider), { gap: 4, padding: 14 }]}>
                <Ink size={13} weight="extraBold">{`${s.auteurs}, ${s.annee}`}</Ink>
                <Ink size={13} color={c.textSecondary}>{traduire(s.apport)}</Ink>
                <Ink size={11} color={c.textMuted} numberOfLines={2}>{`${s.titre}. ${s.revue}.`}</Ink>
              </Glass>
            );
          })}
        </View>
        <Ink size={12} color={c.textMuted} style={{ paddingHorizontal: 4 }}>
          {traduire('Ces conseils sont généraux. Si tu as un problème de santé, une douleur ou une blessure, demande l’avis d’un médecin.')}
        </Ink>
      </ScrollView>
    </View>
  );
}
