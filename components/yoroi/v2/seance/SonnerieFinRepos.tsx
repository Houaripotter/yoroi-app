/**
 * 31 octobre 2026 : interrupteur « Sonnerie de fin de repos » des reglages de la seance (lib/v2/seances/alarmeRepos.ts).
 * Allume : l'alarme du systeme (iOS 26, module natif present) sonne a la fin du repos, telephone verrouille et sur
 * la montre ; sinon la notification de fin de repos sonne avec le son du minuteur.
 * La ligne dit ce qui se passe vraiment sur ce telephone, sans rien promettre de plus.
 */
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Interrupteur } from '@/components/yoroi/Interrupteur';
import { useYoroiTheme } from '@/components/yoroi';
import { traduire } from '@/lib/i18n/tr';
import {
  chargerSonnerieRepos,
  demanderAlarmesRepos,
  enregistrerSonnerieRepos,
  etatSonnerieAppareil,
  type AutorisationAlarme,
} from '@/lib/v2/seances/alarmeRepos';

function Cloche({ color }: { color: string }) {
  const p = { stroke: color, strokeWidth: 2.2, fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" {...p} />
      <Path d="M10 20.5a2 2 0 0 0 4 0" {...p} />
    </Svg>
  );
}

/** Phrase sous l'interrupteur, selon ce que le telephone permet */
export function phraseSonnerie(o: { actif: boolean; disponible: boolean; autorisation: AutorisationAlarme }): string | null {
  if (!o.actif) return null;
  if (o.disponible && o.autorisation === 'refuse') return traduire('Alarmes refusées : autorise les dans Réglages, YOROI');
  if (o.disponible) return traduire('Sonne même téléphone verrouillé, comme le minuteur d’Apple');
  return traduire('Son du minuteur à la fin du repos');
}

export function SonnerieFinRepos() {
  const c = useYoroiTheme().theme.colors;
  const [actif, setActif] = useState<boolean | null>(null);
  const [etat, setEtat] = useState<{ disponible: boolean; autorisation: AutorisationAlarme }>({ disponible: false, autorisation: 'inconnu' });

  useEffect(() => {
    let vivant = true;
    chargerSonnerieRepos().then((v) => vivant && setActif(v), () => vivant && setActif(true));
    etatSonnerieAppareil().then((e) => vivant && setEtat(e), () => {});
    return () => {
      vivant = false;
    };
  }, []);

  const changer = (on: boolean) => {
    setActif(on);
    void enregistrerSonnerieRepos(on);
    if (on && etat.disponible && etat.autorisation === 'inconnu') {
      void demanderAlarmesRepos().then((a) => setEtat((e) => ({ ...e, autorisation: a })));
    }
  };

  const phrase = phraseSonnerie({ actif: actif !== false, disponible: etat.disponible, autorisation: etat.autorisation });
  const refuse = actif !== false && etat.disponible && etat.autorisation === 'refuse';

  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 30, alignItems: 'center' }}>
          <Cloche color={c.textSecondary} />
        </View>
        <Ink size={15} weight="bold" style={{ flex: 1 }}>{traduire('Sonnerie de fin de repos')}</Ink>
        <Interrupteur value={actif !== false} onValueChange={changer} accessibilityLabel={traduire('Sonnerie de fin de repos')} />
      </View>
      {phrase ? (
        <Pressable
          disabled={!refuse}
          onPress={() => void Linking.openSettings().catch(() => {})}
          accessibilityRole={refuse ? 'button' : 'text'}
          style={{ paddingLeft: 38 }}
        >
          <Ink size={13} weight="medium" color={refuse ? c.accentText : c.textMuted}>{phrase}</Ink>
        </Pressable>
      ) : null}
    </View>
  );
}
