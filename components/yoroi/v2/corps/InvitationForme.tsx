/**
 * Forme du matin sur la carte Forme de l'accueil et dans Ta recuperation (1er novembre 2026, demande AU, point 3).
 * Pas encore repondu aujourd'hui : une petite invitation, « Répondre » ou « Pas aujourd'hui » (jamais imposee).
 * Deja repondu : ton score de forme du jour. Proposee seulement au niveau Sportif ou Athlete, ou si tu as deja repondu.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { aProposer, lireFormes, lirePasAujourdhui, pasAujourdhui, scoreForme, toneForme } from '@/lib/v2/mesures/formeMatin';
import type { FormeMatin } from '@/lib/v2/mesures/formeMatin';
import { EVENEMENT_CORPS, jourLocal } from '@/lib/v2/mesures/listeStockee';
import { useNiveauSuivi } from '@/lib/v2/mesures/useNiveauSuivi';
import { voirBloc } from '@/lib/v2/mesures/niveauSuivi';
import { carteBlanche } from '@/components/yoroi/v2/seance/pastel';
import { traduire } from '@/lib/i18n/tr';
import { Sticker } from './kit';

export function InvitationForme({ style }: { style?: object }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const niveau = useNiveauSuivi();
  const [formes, setFormes] = useState<FormeMatin[] | null>(null);
  const [refus, setRefus] = useState<string | null>(null);
  const lire = useCallback(() => {
    Promise.all([lireFormes(), lirePasAujourdhui()])
      .then(([f, r]) => {
        setFormes(f);
        setRefus(r);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    lire();
    const s = DeviceEventEmitter.addListener(EVENEMENT_CORPS, lire);
    return () => s.remove();
  }, [lire]);
  if (!formes || !niveau.pret) return null;
  const jour = jourLocal();
  const auj = formes.find((f) => f.date === jour);
  if (!voirBloc(niveau.niveau, 'forme_matin', formes.length > 0)) return null;
  const ouvrir = () => router.push('/forme-matin' as never);
  if (auj) {
    const s = scoreForme(auj);
    const couleur = { bien: c.successText, moyen: c.ink, bas: c.danger }[toneForme(s)];
    return (
      <Pressable onPress={ouvrir} accessibilityRole="button" accessibilityLabel={traduire('Ta forme du matin : {0} sur 100', s)} style={[carteBlanche(c.surface, c.border), { width: '100%', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
        <Sticker nom="lune_soleil" taille={30} />
        <Ink size={14} weight="bold" style={{ flex: 1 }}>{traduire('Ta forme du matin')}</Ink>
        <Ink size={18} weight="black" color={couleur}>{`${s}`}</Ink>
        <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('sur 100')}</Ink>
      </Pressable>
    );
  }
  if (!aProposer(formes, refus, jour)) return null;
  return (
    <View style={[carteBlanche(c.surface, c.border), { width: '100%', padding: 12, gap: 8 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Sticker nom="lune_soleil" taille={34} />
        <View style={{ flex: 1 }}>
          <Ink size={14.5} weight="extraBold">{traduire('Ta forme du matin')}</Ink>
          <Ink size={12.5} color={c.textSecondary}>{traduire('5 questions, 30 secondes')}</Ink>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={ouvrir} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.ink })}>
          <Ink size={14} weight="extraBold" color={c.background}>{traduire('Répondre')}</Ink>
        </Pressable>
        <Pressable
          onPress={() => {
            pasAujourdhui().then(lire).catch(() => {});
          }}
          accessibilityRole="button"
          style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.fillSubtle })}
        >
          <Ink size={14} weight="extraBold">{traduire('Pas aujourd’hui')}</Ink>
        </Pressable>
      </View>
    </View>
  );
}
