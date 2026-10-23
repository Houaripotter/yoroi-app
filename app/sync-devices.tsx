/**
 * Synchronisation locale iPhone et iPad (refonte v2) : appareils appaires, appairage par code,
 * cet appareil, derniere synchro (ouvre le journal de synchro), forcer l'envoi, aide. 100 % en local.
 *
 * 13 octobre 2026 : la synchro ne tourne que pendant que cet ecran est ouvert, et seulement avec un appareil
 * appaire par un code a 6 chiffres. Voir lib/peerSyncService.ts et lib/v2/sync/appairage.ts.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Ink } from '@/components/yoroi/v2/Ink';
import { SanteIcon } from '@/components/yoroi/v2/sante/SanteIcon';
import { ActionRow, CardBox, GlassBox, Label, Notice, S, SmallButton } from '@/components/yoroi/v2/sante/ui';
import {
  annulerAppairage,
  commencerAppairageAffiche,
  commencerAppairageSaisi,
  forceSync,
  getMyDeviceName,
  getSyncStatus,
  initPeerSync,
  isPeerSyncAvailable,
  onSyncStatusChange,
  oublierAppareil,
  stopPeerSync,
} from '@/lib/peerSyncService';
import type { SyncStatus } from '@/lib/peerSyncService';

function DevicesScene({ connected, peers }: { connected: boolean; peers: number }) {
  const color = connected ? S.moss : S.muted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 }}>
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: S.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        <SanteIcon name="phone" size={32} color={S.accent} />
      </View>
      <Svg width={110} height={30} viewBox="0 0 110 30">
        <Path d="M4 15 C30 4 50 26 76 12 S100 14 106 15" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray={connected ? undefined : '3 9'} />
      </Svg>
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: connected ? S.mossSoft : S.line2, alignItems: 'center', justifyContent: 'center' }}>
        <SanteIcon name="tablet" size={32} color={connected ? S.mossText : S.muted} />
        {peers > 1 ? (
          <View style={{ position: 'absolute', top: -6, right: -6, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: S.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Ink size={11} weight="black" color={S.paper}>
              {String(peers)}
            </Ink>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function SyncDevicesScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  const [myName, setMyName] = useState<string>(getMyDeviceName());
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: 'neutral' | 'good' | 'bad' } | null>(null);
  const [isAvailable] = useState<boolean>(isPeerSyncAvailable());

  const [saisie, setSaisie] = useState<string | null>(null);
  const [maintenant, setMaintenant] = useState(Date.now());

  useEffect(() => {
    // La synchro tourne seulement pendant que cet ecran est ouvert
    if (isAvailable) initPeerSync().catch(() => {});
    const unsub = onSyncStatusChange(setStatus);
    const tn = setTimeout(() => setMyName(getMyDeviceName()), 500);
    return () => {
      unsub();
      clearTimeout(tn);
      stopPeerSync().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // compte a rebours du code d'appairage
  useEffect(() => {
    if (!status.appairage) return;
    const t = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(t);
  }, [status.appairage]);

  useEffect(() => {
    if (status.appairageResultat === 'reussi') {
      setSaisie(null);
      setMsg({ tone: 'good', text: 'Appareil appairé. Tes données se synchronisent quand YOROI est ouvert sur cet écran, sur les deux appareils.' });
    } else if (status.appairageResultat === 'expire') {
      setMsg({ tone: 'bad', text: 'Le code a expiré. Recommence l’appairage.' });
    } else if (status.appairageResultat === 'annule') {
      setSaisie(null);
    }
  }, [status.appairageResultat]);

  const afficherCode = useCallback(async () => {
    setMsg(null);
    setSaisie(null);
    await commencerAppairageAffiche();
  }, []);

  const validerCode = useCallback(async () => {
    if (saisie == null) return;
    setMsg(null);
    const ok = await commencerAppairageSaisi(saisie);
    if (!ok) setMsg({ tone: 'bad', text: 'Le code fait 6 chiffres.' });
  }, [saisie]);

  const handleForceSync = useCallback(async () => {
    if (syncing) return;
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    setSyncing(true);
    setMsg(null);
    try {
      const count = await forceSync();
      if (count === 0) setMsg({ tone: 'bad', text: "Aucun appareil appairé à proximité. Ouvre cet écran sur ton autre appareil, à côté de celui-ci, avec le wifi et le réseau local autorisés." });
      else setMsg({ tone: 'good', text: `Synchronisation envoyée à ${count} appareil${count > 1 ? 's' : ''}. Les données se mettent à jour dans quelques secondes.` });
    } catch (e: any) {
      setMsg({ tone: 'bad', text: `Erreur : ${e?.message || 'inconnue'}` });
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  const n = status.connectedPeers.length;
  const isConnected = n > 0;
  const lastSyncStr = status.lastSyncTs
    ? (() => {
        try {
          return format(parseISO(status.lastSyncTs), "d MMM yyyy 'à' HH:mm", { locale: fr });
        } catch {
          return status.lastSyncTs;
        }
      })()
    : null;

  return (
    <DetailScreen title={Platform.OS === 'ios' ? 'iPhone et iPad' : 'Tes appareils'} subtitle="Synchronisation locale">
      <GlassBox style={{ gap: 12, alignItems: 'center' }}>
        <DevicesScene connected={isConnected} peers={n} />
        <Ink size={22} weight="black" tight style={{ textAlign: 'center' }}>
          {!isAvailable ? (__DEV__ ? 'Disponible dans l’app installée' : 'Pas disponible ici') : isConnected ? `${n} appareil${n > 1 ? 's' : ''} relié${n > 1 ? 's' : ''}` : status.paires.length ? 'À la recherche de tes appareils' : 'Aucun appareil appairé'}
        </Ink>
        <Ink size={14} weight="medium" color={S.ink2} style={{ textAlign: 'center' }}>
          {!isAvailable
            ? __DEV__
              ? "Mode test\u00A0: le module de synchronisation locale n'est pas présent dans Expo Go. Il fonctionne dans l'app installée."
              : "La synchronisation entre tes appareils n'est pas disponible sur cet appareil."
            : isConnected
              ? 'Tes données se synchronisent'
              : status.paires.length
                ? 'Ouvre cet écran sur ton autre appareil, à côté de celui-ci'
                : 'Appaire d’abord ton autre appareil avec un code'}
        </Ink>
        {isAvailable && !isConnected && status.paires.length > 0 ? <ActivityIndicator size="small" color={S.accent} /> : null}
      </GlassBox>

      <CardBox>
        <ActionRow first icon="phone" title={myName} sub="Cet appareil" color={S.accent} tint={S.accentSoft} />
        <ActionRow icon="history" title={lastSyncStr || 'Aucune pour le moment'} sub={status.lastSyncDevice ? `Dernière synchro, avec ${status.lastSyncDevice}, voir le journal` : 'Dernière synchro, voir le journal'} onPress={() => router.push('/sync-history' as any)} color={S.indigo} tint={S.indigoSoft} />
      </CardBox>

      <Label aside={status.paires.length ? `${n} en ligne` : undefined}>Tes appareils</Label>
      {status.paires.length ? (
        <CardBox>
          {status.paires.map((p, i) => {
            const enLigne = status.connectedPeers.includes(p.nom);
            return (
              <ActionRow
                key={p.id}
                first={i === 0}
                icon="tablet"
                title={p.nom}
                sub={enLigne ? 'Relié, synchronisation active' : 'Appairé, pas à proximité'}
                color={enLigne ? S.mossText : S.muted}
                tint={enLigne ? S.mossSoft : S.line2}
                right={
                  <SmallButton label="Oublier" tone="light" icon="trash" onPress={() => { void oublierAppareil(p.id); }} />
                }
              />
            );
          })}
        </CardBox>
      ) : (
        <Notice text={`Aucun appareil appairé. Pour synchroniser, appaire ${Platform.OS === 'ios' ? 'ton autre iPhone ou iPad' : 'ton autre téléphone ou ta tablette'} avec un code : YOROI n’échange rien avec un appareil que tu n’as pas appairé.`} />
      )}

      <Label>Appairer un appareil</Label>
      {status.appairage?.role === 'affiche' ? (
        <GlassBox style={{ gap: 10, alignItems: 'center' }}>
          <Ink size={14} weight="bold" color={S.ink2} style={{ textAlign: 'center' }}>
            Sur ton autre appareil, ouvre cet écran, touche « Entrer un code » et tape :
          </Ink>
          <Ink size={40} weight="black" tight style={{ letterSpacing: 6 }}>
            {status.appairage.code}
          </Ink>
          <Ink size={12} weight="bold" color={S.muted}>
            {`Valable encore ${Math.max(0, Math.ceil((status.appairage.expireA - maintenant) / 1000))} s`}
          </Ink>
          <SmallButton label="Annuler" tone="light" icon="close" onPress={annulerAppairage} />
        </GlassBox>
      ) : status.appairage?.role === 'saisit' ? (
        <GlassBox style={{ gap: 10, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={S.accent} />
          <Ink size={14} weight="bold" color={S.ink2} style={{ textAlign: 'center' }}>
            Recherche de l’appareil qui affiche ce code. Garde YOROI ouvert sur les deux.
          </Ink>
          <SmallButton label="Annuler" tone="light" icon="close" onPress={annulerAppairage} />
        </GlassBox>
      ) : saisie != null ? (
        <GlassBox style={{ gap: 10 }}>
          <Ink size={14} weight="bold" color={S.ink2}>
            Tape le code à 6 chiffres affiché sur ton autre appareil.
          </Ink>
          <TextInput
            value={saisie}
            onChangeText={(t) => setSaisie(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            accessibilityLabel="Code d’appairage"
            style={{ fontSize: 32, fontWeight: '800', letterSpacing: 6, textAlign: 'center', color: S.ink, borderRadius: 16, borderWidth: 1, borderColor: S.line2, paddingVertical: 12 }}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <SmallButton label="Annuler" tone="light" onPress={() => setSaisie(null)} />
            </View>
            <View style={{ flex: 1 }}>
              <SmallButton label="Appairer" tone="red" icon="link" disabled={saisie.length !== 6} onPress={() => { void validerCode(); }} />
            </View>
          </View>
        </GlassBox>
      ) : (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <SmallButton label="Afficher un code" tone="ink" icon="lock" disabled={!isAvailable} onPress={() => { void afficherCode(); }} />
          </View>
          <View style={{ flex: 1 }}>
            <SmallButton label="Entrer un code" tone="light" icon="link" disabled={!isAvailable} onPress={() => setSaisie('')} />
          </View>
        </View>
      )}

      <SmallButton label={syncing ? 'Synchronisation' : 'Forcer la synchronisation'} tone="red" icon="sync" busy={syncing} disabled={!isAvailable || status.paires.length === 0} onPress={handleForceSync} />
      {msg ? <Notice text={msg.text} tone={msg.tone} /> : null}

      <Label>Comment ça marche</Label>
      <CardBox>
        <ActionRow first icon="shield" title="100 % en local" sub="Sans internet ni serveur, par Bluetooth et wifi direct. Tes données sont chiffrées de bout en bout." color={S.indigo} tint={S.indigoSoft} />
        <ActionRow icon="lock" title="Seulement tes appareils" sub="Un appareil n'est synchronisé qu'après un appairage par code. Un téléphone inconnu à côté de toi ne reçoit rien." color={S.mossText} tint={S.mossSoft} />
        <ActionRow icon="wifi" title="Quand cet écran est ouvert" sub="La synchronisation tourne pendant que cet écran est ouvert sur les deux appareils, proches l'un de l'autre." color={S.accent} tint={S.accentSoft} />
        <ActionRow icon="info" title="Si rien ne démarre" sub="Réglages, Confidentialité, Réseau local : vérifie que YOROI est activé." color={S.gold} tint={S.goldSoft} />
      </CardBox>
    </DetailScreen>
  );
}
