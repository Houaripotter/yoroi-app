/**
 * « Quoi faire aujourd'hui ? » sur l'accueil (25 octobre 2026). Houari : « la présentation de Quoi faire,
 * quand tu ouvres l'app, je veux que ce soit comme les autres applications de sport ». Dans ces applis, la
 * séance du jour est une grande carte en haut de l'accueil, pas une petite icône parmi les outils.
 * La carte : la figurine en grand, trois séances toutes faites en un appui (haut du corps, bas du corps,
 * corps entier), « Choisir mes muscles », et « Refaire » tes zones de la dernière fois quand il y en a.
 * Les séances toutes faites ouvrent l'écran des zones déjà rempli (on voit les exercices avant de commencer).
 */
import React, { useCallback, useState } from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { P, Press } from './kit';
import { RACCOURCIS_ZONES, ZONES, seanceZones, titreZones } from '@/lib/v2/programmes/zones';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import { dureeEstimee } from '@/lib/v2/programmes/express';
import { traduire } from '@/lib/i18n/tr';

const FIGURINE: ImageSourcePropType = require('@/assets/avatars/app/ornements/zones_corps.webp');
/** la cle des zones choisies la derniere fois (app/programmes/zones.tsx) */
const CLE_ZONES = 'yoroi_zones_choisies_v1';
/** les trois seances toutes faites montrees sur l'accueil */
const SUR_ACCUEIL = ['haut', 'bas', 'entier'];

const minutesDe = (zones: string[]) => Math.max(10, Math.round((dureeEstimee(seanceZones(zones)) + 5) / 5) * 5);

export function CarteQuoiFaire() {
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const [derniere, setDerniere] = useState<ZoneId[]>([]);

  // tes zones de la derniere fois, relues a chaque retour sur l'accueil
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(CLE_ZONES)
        .then((raw) => {
          const v = raw ? (JSON.parse(raw) as string[]) : [];
          setDerniere(ZONES.map((z) => z.id).filter((id) => v.includes(id)));
        })
        .catch(() => setDerniere([]));
    }, []),
  );

  const presets = RACCOURCIS_ZONES.filter((r) => SUR_ACCUEIL.includes(r.id));
  const titreDerniere = derniere.length ? titreZones(derniere, traduire) : '';

  const refaire = () =>
    router.push({ pathname: '/seance/muscu' as any, params: { sport: 'musculation', zones: derniere.join(','), label: titreDerniere } });

  return (
    <View style={{ borderRadius: 26, overflow: 'hidden', backgroundColor: isDark ? P.tuileIndigo : '#E3E6EE', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(29,32,41,0.06)' }}>
      {/* le haut : le texte a gauche, la figurine en grand a droite */}
      <Press onPress={() => router.push('/programmes/zones' as any)} accessibilityRole="button" accessibilityLabel={traduire('Quoi faire aujourd’hui ? Choisis tes muscles, YOROI te donne ta séance')}>
        <View style={{ minHeight: 150, paddingLeft: 18, paddingTop: 18, paddingRight: 130, paddingBottom: 6, gap: 4 }}>
          <Ink size={11} weight="black" color={c.accent} style={{ letterSpacing: 0.8 }}>{traduire('TA SÉANCE DU JOUR')}</Ink>
          <Ink size={23} weight="black" tight>{traduire('Quoi faire aujourd’hui ?')}</Ink>
          <Ink size={14} color={c.textSecondary}>{traduire('Choisis tes muscles, YOROI te donne ta séance avec les bons exercices.')}</Ink>
          <Image source={FIGURINE} style={{ position: 'absolute', right: -8, top: 6, width: 150, height: 150 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </View>
      </Press>

      <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
        {/* trois seances toutes faites, en un appui */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {presets.map((r) => (
            <Press
              key={r.id}
              onPress={() => router.push({ pathname: '/programmes/zones' as any, params: { preset: r.id } })}
              accessibilityRole="button"
              accessibilityLabel={traduire('{0}, environ {1} min', traduire(r.nom), minutesDe(r.zones))}
              style={{ flex: 1 }}
            >
              <View style={{ minHeight: 58, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF' }}>
                <Ink size={13} weight="black" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ textAlign: 'center' }}>{traduire(r.nom)}</Ink>
                <Ink size={11} weight="bold" color={c.textSecondary}>{traduire('{0} min', minutesDe(r.zones))}</Ink>
              </View>
            </Press>
          ))}
        </View>

        {/* choisir soi-meme */}
        <Press onPress={() => router.push('/programmes/zones' as any)} accessibilityRole="button">
          <View style={{ minHeight: 52, borderRadius: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: c.ink }}>
            <Ink size={15} weight="extraBold" color={c.background}>{traduire('Choisir mes muscles')}</Ink>
            <Icon name="chevron" size={16} color={c.background} />
          </View>
        </Press>

        {/* tes zones de la derniere fois : la seance demarre tout de suite */}
        {derniere.length ? (
          <Press onPress={refaire} accessibilityRole="button" accessibilityLabel={traduire('Refaire ta dernière séance : {0}', titreDerniere)}>
            <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
              <Icon name="repeat" size={16} color={c.accent} />
              <Ink size={13} weight="extraBold" color={c.accent} numberOfLines={1} style={{ flex: 1 }}>{traduire('Refaire : {0}', titreDerniere)}</Ink>
            </View>
          </Press>
        ) : null}
      </View>
    </View>
  );
}
