/**
 * Logo de l'app (refonte v2, 16 octobre 2026) : le logo v7 n.8 sur plusieurs couleurs de fond.
 * Le choix est garde (getSelectedLogo, saveSelectedLogo) et applique a l'icone native
 * avec expo-alternate-app-icons quand le telephone le permet (build installe, pas Expo Go).
 * Les noms natifs (appiconset iOS, activity-alias Android) sont dans LOGO_OPTIONS.nativeName.
 */
import React, { useEffect, useState } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Card, Press, BigButton, Icon, Enter, P, useAccent, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Ink } from '@/components/yoroi/v2/Ink';
import { usePremium } from '@/context/PremiumContext';
import { getSelectedLogo, saveSelectedLogo, nativeIconNameFor, LOGO_OPTIONS, LogoVariant } from '@/lib/storage';
import { logger } from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import { traduire } from '@/lib/i18n/tr';

// Module natif : absent dans Expo Go, d'ou le chargement protege
let setAlternateAppIcon: ((name: string | null) => Promise<string | null>) | null = null;
let supportsAlternateIcons = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('expo-alternate-app-icons');
  setAlternateAppIcon = mod.setAlternateAppIcon;
  supportsAlternateIcons = !!mod.supportsAlternateIcons;
} catch {
  supportsAlternateIcons = false;
}

const COLS = 4;
const GAP = 8;

export default function LogoSelectionScreen() {
  const router = useRouter();
  const { accent } = useAccent();
  const { isPremium } = usePremium();
  const [current, setCurrent] = useState<LogoVariant>('default');
  const [selected, setSelected] = useState<LogoVariant>('default');
  const [saving, setSaving] = useState(false);
  const { width } = useWindowDimensions();
  // 4 colonnes regulieres dans la marge de 22 points
  const tileW = Math.floor((width - 44 - GAP * (COLS - 1)) / COLS);
  const icon = Math.min(60, tileW - 14);

  useEffect(() => {
    getSelectedLogo().then((l) => {
      setCurrent(l);
      setSelected(l);
    });
  }, []);

  const choose = (id: LogoVariant, locked: boolean) => {
    if (locked) {
      tap('medium');
      appAlert(traduire('Logo Premium'), traduire('Cette couleur fait partie de Premium. Passe à Premium pour la débloquer.'), [
        { text: traduire('Plus tard'), style: 'cancel' },
        { text: traduire('Voir Premium'), onPress: () => ouvrirPaywall('logos') },
      ]);
      return;
    }
    setSelected(id);
  };

  const apply = async () => {
    if (selected === current) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      await saveSelectedLogo(selected);
      let applied = false;
      if (supportsAlternateIcons && setAlternateAppIcon) {
        try {
          await setAlternateAppIcon(nativeIconNameFor(selected));
          applied = true;
        } catch (e) {
          // le choix reste enregistre meme si l'icone native refuse de changer
          logger.warn('Icone native non changee:', e);
        }
      }
      tap('success');
      setCurrent(selected);
      appAlert(
        traduire('Logo changé'),
        applied ? traduire('Ton nouveau logo est sur l’écran d’accueil de ton téléphone.') : traduire('Ton choix est enregistré. Il s’appliquera à l’icône du téléphone dans la version installée depuis l’App Store.'),
        [{ text: traduire('Super'), onPress: () => router.back() }],
      );
    } catch (e) {
      logger.error('Erreur changement de logo:', e);
      appAlert(traduire('Oups'), traduire('Le logo n’a pas pu être changé. Réessaie dans un instant.'));
    } finally {
      setSaving(false);
    }
  };

  const sel = LOGO_OPTIONS.find((o) => o.id === selected) ?? LOGO_OPTIONS[0];

  return (
    <DetailScreen
      title={traduire("Logo de l’app")}
      subtitle={traduire("Choisis la couleur de fond de ton icône.")}
      footer={selected !== current ? <BigButton label={saving ? traduire('Un instant') : traduire('Appliquer ce logo')} icon="check" onPress={apply} disabled={saving} /> : undefined}
    >
      <Enter i={0}>
        <Card style={{ alignItems: 'center', paddingVertical: 26, gap: 14 }}>
          <View style={{ width: 120, height: 120, borderRadius: 120 * 0.225, overflow: 'hidden', backgroundColor: sel.color, borderWidth: 1, borderColor: P.line2, shadowColor: P.ink, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }}>
            <Image source={sel.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
          </View>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Ink size={20} weight="black" tight>
              {traduire(sel.name)}
            </Ink>
            <Ink size={14} weight="medium" color={P.ink2}>
              {selected === current ? traduire('Logo actuel') : traduire('Aperçu de ton choix')}
            </Ink>
          </View>
        </Card>
      </Enter>

      <Enter i={1}>
        {/* Grille de 4 colonnes : icone arrondie facon iOS, nom de la couleur, coche sur le choix */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: GAP, rowGap: GAP }}>
          {LOGO_OPTIONS.map((o) => {
            const locked = o.isPremium && !isPremium;
            const on = o.id === selected;
            const tag = locked ? traduire('Premium') : o.id === current ? traduire('Actuel') : null;
            return (
              <Press
                key={o.id}
                onPress={() => choose(o.id, locked)}
                accessibilityRole="button"
                accessibilityLabel={`Fond ${o.name}${locked ? traduire(', Premium') : ''}${o.id === current ? traduire(', logo actuel') : ''}`}
                accessibilityState={{ selected: on }}
                style={{ width: tileW }}
              >
                <View style={{ width: tileW, borderRadius: 18, backgroundColor: on ? P.white : 'transparent', borderWidth: 2, borderColor: on ? accent : 'transparent', paddingTop: 10, paddingBottom: 8, alignItems: 'center', gap: 6 }}>
                  <View style={{ width: icon, height: icon }}>
                    <View style={{ width: icon, height: icon, borderRadius: icon * 0.225, overflow: 'hidden', backgroundColor: o.color, borderWidth: 1, borderColor: P.line2, opacity: locked ? 0.6 : 1 }}>
                      <Image source={o.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
                    </View>
                    {on ? (
                      <View style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: accent, borderWidth: 2, borderColor: P.white, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="check" size={12} color={P.white} width={3} />
                      </View>
                    ) : null}
                  </View>
                  <Ink size={12} weight={on ? 'extraBold' : 'bold'} color={P.ink} numberOfLines={1} style={{ textAlign: 'center' }}>
                    {traduire(o.name)}
                  </Ink>
                  <View style={{ height: 18, justifyContent: 'center' }}>
                    {tag ? (
                      <View style={{ paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: locked ? P.goldSoft : P.mossSoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Ink size={10} weight="extraBold" color={locked ? P.goldDark : P.mossText}>
                          {tag}
                        </Ink>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Press>
            );
          })}
        </View>
      </Enter>

      {!supportsAlternateIcons ? (
        <Enter i={2}>
          <Ink size={13} weight="medium" color={P.muted} style={{ textAlign: 'center', paddingHorizontal: 12 }}>
            {traduire("Le changement d’icône se fait dans la version installée depuis l’App Store. Ton choix est gardé.")}</Ink>
        </Enter>
      ) : null}
    </DetailScreen>
  );
}
