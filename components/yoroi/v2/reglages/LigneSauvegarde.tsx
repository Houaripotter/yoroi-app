/**
 * Reglages, Donnees et sauvegardes : la ligne d'etat de la sauvegarde automatique (7 novembre 2026).
 * Vert quand une vraie copie est passee il y a moins de 48 heures, rouge sinon (ou si la derniere a rate) avec
 * « Sauvegarder maintenant », gris quand iCloud n'est pas disponible. Regle et textes : lib/v2/sauvegarde/ligneEtat.ts.
 * Se relit apres chaque copie (PROTECTION_CHANGED_EVENT, YOROI_AUTO_BACKUP_DONE) et chaque minute (« il y a X min »).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Platform, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { MiniAction } from '@/components/yoroi/v2/espace/reglages/parts';
import { PROTECTION_CHANGED_EVENT, copierMaintenant, lireProtection, type InfosProtection } from '@/lib/v2/sauvegarde/copieAuto';
import { ligneEtatSauvegarde } from '@/lib/v2/sauvegarde/ligneEtat';
import { traduire } from '@/lib/i18n/tr';

export function LigneSauvegarde({ infosDemo }: { infosDemo?: InfosProtection } = {}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [infos, setInfos] = useState<InfosProtection | null>(infosDemo ?? null);
  const [busy, setBusy] = useState(false);
  const [, setTic] = useState(0);

  const lire = useCallback(async () => {
    if (infosDemo) return;
    try {
      setInfos(await lireProtection());
    } catch {
      // la ligne reste telle quelle
    }
  }, [infosDemo]);

  useFocusEffect(
    useCallback(() => {
      void lire();
      const a = DeviceEventEmitter.addListener(PROTECTION_CHANGED_EVENT, () => void lire());
      const b = DeviceEventEmitter.addListener('YOROI_AUTO_BACKUP_DONE', () => void lire());
      return () => {
        a.remove();
        b.remove();
      };
    }, [lire]),
  );
  useEffect(() => {
    const t = setInterval(() => setTic((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  if (!infos) return null;
  const l = ligneEtatSauvegarde(infos, Platform.OS);
  const couleur = l.ton === 'vert' ? c.successText : l.ton === 'rouge' ? c.danger : c.textSecondary;
  const fond = l.ton === 'vert' ? c.successTint : l.ton === 'rouge' ? c.dangerTint : c.fillSubtle;
  const icone = l.ton === 'vert' ? 'cloud-check' : l.ton === 'rouge' ? 'cloud-alert' : 'cloud-off-outline';

  const sauver = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await copierMaintenant({ immediat: true });
    } finally {
      setBusy(false);
      void lire();
    }
  };

  return (
    <View style={{ borderRadius: 18, backgroundColor: fond, paddingVertical: 12, paddingHorizontal: 14, gap: 10 }} accessibilityLiveRegion="polite">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <MaterialCommunityIcons name={icone} size={22} color={couleur} />
        <Ink size={13.5} weight="extraBold" color={couleur} style={{ flex: 1, lineHeight: 19 }}>{l.texte}</Ink>
      </View>
      {l.bouton ? (
        <View style={{ alignSelf: 'flex-start' }}>
          <MiniAction label={traduire('Sauvegarder maintenant')} onPress={() => void sauver()} busy={busy} />
        </View>
      ) : null}
    </View>
  );
}

export default LigneSauvegarde;
