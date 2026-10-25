/**
 * « Mes séances » dans l'onglet Séances (25 octobre 2026) : tes trois séances enregistrées les plus récentes,
 * chacune avec son bouton pour la commencer tout de suite ; sans séance, l'invitation à en créer une.
 * Données : lib/v2/seance/mesSeances.ts. Liste complète : app/mes-seances.
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from '@/components/yoroi/livePalette';
import { Icon } from './Icon';
import { SectionTitle, tap } from './ui';
import { relativeDay } from '@/lib/v2/seance/format';
import { MES_SEANCES_EVENT, chargerMesSeances } from '@/lib/v2/seance/mesSeances';
import type { MaSeance } from '@/lib/v2/seance/mesSeances';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export function MesSeancesCarte() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const [liste, setListe] = useState<MaSeance[] | null>(null);

  useEffect(() => {
    const charger = () => chargerMesSeances().then(setListe).catch(() => setListe([]));
    charger();
    const sub = DeviceEventEmitter.addListener(MES_SEANCES_EVENT, charger);
    return () => sub.remove();
  }, []);

  if (!liste) return null;
  const ouvrir = () => {
    tap();
    router.push('/mes-seances' as any);
  };

  if (liste.length === 0) {
    return (
      <>
        <SectionTitle title={traduire('Mes séances')} />
        <Pressable onPress={ouvrir} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 72, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? P.white : P.carte, borderWidth: 1, borderColor: c.divider })}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.accentTint, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bookmark" size={22} color={c.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={16} weight="black" tight>{traduire('Enregistre tes séances')}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduire('Push, Jambes, Haut du corps : à refaire en un appui')}</Ink>
          </View>
          <Icon name="chevron" size={18} color={c.textMuted} />
        </Pressable>
      </>
    );
  }

  return (
    <>
      <SectionTitle title={traduire('Mes séances')} action={traduire('Voir tout')} onAction={ouvrir} />
      <View style={{ borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }}>
        {liste.slice(0, 3).map((s, i) => (
          <View key={s.id} style={{ minHeight: 68, paddingLeft: 16, paddingRight: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider }}>
            <Pressable onPress={ouvrir} accessibilityRole="button" style={{ flex: 1, gap: 2 }}>
              <Ink size={16} weight="black" tight numberOfLines={1}>{s.nom}</Ink>
              <Ink size={12} color={c.textSecondary} numberOfLines={1}>
                {[
                  traduirePluriel(s.exos.length, s.exos.length > 1, '{0} exercice', '{0} exercices', s.exos.length),
                  s.faiteLe ? traduire('faite {0}', traduire(relativeDay(s.faiteLe))) : traduire('pas encore faite'),
                ].join(', ')}
              </Ink>
            </Pressable>
            <Pressable
              onPress={() => {
                tap();
                router.push({ pathname: '/seance/muscu' as any, params: { sport: s.sport, maSeance: s.id } });
              }}
              accessibilityRole="button"
              accessibilityLabel={traduire('Commencer {0}', s.nom)}
              style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.accentPressed : c.accent })}
            >
              <Icon name="play" size={18} color={c.onAccent} />
            </Pressable>
          </View>
        ))}
      </View>
    </>
  );
}
