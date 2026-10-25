/**
 * Mes séances (25 octobre 2026). Houari : « la bibliothèque des séances que je pourrai enregistrer ».
 * Tes séances à toi, avec un nom, à refaire en un appui. « Commencer » ouvre la séance en direct,
 * exercices dans l'ordre, charges reprises de ta dernière fois sur chaque exercice.
 * Le menu « ... » : noter comme faite (sans chrono), modifier les exercices, renommer, dupliquer, supprimer.
 * Données : lib/v2/seance/mesSeances.ts.
 */
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { BigButton, EmptyState, Row, Sheet, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { NomSeanceSheet } from '@/components/yoroi/v2/seance/NomSeance';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { P } from '@/components/yoroi/livePalette';
import { relativeDay } from '@/lib/v2/seance/format';
import { nomFr } from '@/lib/v2/seance/rechercheExo';
import { MES_SEANCES_EVENT, chargerMesSeances, dupliquerMaSeance, modifierMaSeance, supprimerMaSeance, totalSeries } from '@/lib/v2/seance/mesSeances';
import type { MaSeance } from '@/lib/v2/seance/mesSeances';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export default function MesSeances() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [liste, setListe] = useState<MaSeance[] | null>(null);
  const [menu, setMenu] = useState<MaSeance | null>(null);
  const [renommer, setRenommer] = useState<MaSeance | null>(null);

  useEffect(() => {
    const charger = () => chargerMesSeances().then(setListe).catch(() => setListe([]));
    charger();
    const sub = DeviceEventEmitter.addListener(MES_SEANCES_EVENT, charger);
    return () => sub.remove();
  }, []);

  const commencer = (s: MaSeance, faite = false) => {
    tap();
    const ouvrir = () => router.push({ pathname: '/seance/muscu' as any, params: { sport: s.sport, maSeance: s.id, ...(faite ? { form: '1' } : {}) } });
    // depuis le menu : la feuille se ferme d'abord (deux fenetres a la fois se bloquent sur iPhone)
    if (menu) {
      setMenu(null);
      setTimeout(ouvrir, 380);
    } else ouvrir();
  };
  const modifier = (s: MaSeance | null) => {
    tap();
    setMenu(null);
    router.push({ pathname: '/mes-seances/modifier' as any, params: s ? { id: s.id } : {} });
  };
  const supprimer = (s: MaSeance) => {
    setMenu(null);
    // la feuille se ferme d'abord : deux fenetres a la fois se bloquent sur iPhone
    setTimeout(() => appAlert(traduire('Supprimer {0} ?', s.nom), traduire('Tes séances déjà faites restent dans ton historique.'), [
      { text: traduire('Annuler'), style: 'cancel' },
      { text: traduire('Supprimer'), style: 'destructive', onPress: () => void supprimerMaSeance(s.id).catch(() => {}) },
    ]), 380);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        <EnTete titre={traduire('Mes séances')} sousTitre={traduire('tes séances à toi, à refaire en un appui')} repli="/(tabs)/seances" style={{ marginHorizontal: -22, marginTop: -8 }} />

        {liste && liste.length === 0 ? (
          <EmptyState
            ornement="kabuto"
            title={traduire('Ta première séance enregistrée')}
            text={traduire('Crée ta séance ici, ou à la fin d’une séance touche « Enregistrer cette séance ». Ensuite, un appui suffit pour la refaire.')}
            action={traduire('Créer une séance')}
            onAction={() => modifier(null)}
          />
        ) : null}

        {(liste ?? []).map((s) => {
          const noms = s.exos.map((e) => traduire(nomFr(e.nom)));
          const vus = noms.slice(0, 4);
          const reste = noms.length - vus.length;
          const quand = s.faiteLe
            ? traduirePluriel(s.fois, s.fois > 1, 'Faite {0}, {1} fois', 'Faite {0}, {1} fois', traduire(relativeDay(s.faiteLe)), s.fois)
            : traduire('Pas encore faite');
          return (
            <View key={s.id} style={{ borderRadius: 24, padding: 16, gap: 12, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Ink size={20} weight="black" tight numberOfLines={2}>{s.nom}</Ink>
                  <Ink size={13} weight="bold" color={c.textSecondary}>
                    {traduirePluriel(s.exos.length, s.exos.length > 1, '{0} exercice, {1} séries', '{0} exercices, {1} séries', s.exos.length, totalSeries(s))}
                  </Ink>
                </View>
                <Pressable onPress={() => { tap(); setMenu(s); }} accessibilityRole="button" accessibilityLabel={traduire('Options de {0}', s.nom)} hitSlop={6} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.fillSubtle })}>
                  <Icon name="more" size={20} color={c.ink} />
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {vus.map((n, i) => (
                  <View key={`${n}-${i}`} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: c.fillSubtle }}>
                    <Ink size={12} weight="bold" numberOfLines={1}>{n}</Ink>
                  </View>
                ))}
                {reste > 0 ? (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: c.fillSubtle }}>
                    <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('+{0}', reste)}</Ink>
                  </View>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ink size={12} color={c.textMuted} style={{ flex: 1 }} numberOfLines={2}>{quand}</Ink>
                <Pressable
                  onPress={() => commencer(s)}
                  disabled={s.exos.length === 0}
                  accessibilityRole="button"
                  accessibilityLabel={traduire('Commencer {0}', s.nom)}
                  style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 18, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: s.exos.length === 0 ? c.fillSoft : pressed ? c.accentPressed : c.accent })}
                >
                  <Icon name="play" size={16} color={c.onAccent} />
                  <Ink size={15} weight="extraBold" color={c.onAccent}>{traduire('Commencer')}</Ink>
                </Pressable>
              </View>
            </View>
          );
        })}

        {liste && liste.length > 0 ? (
          <>
            <BigButton label={traduire('Créer une séance')} icon="plus" tone="soft" onPress={() => modifier(null)} />
            <Ink size={12} color={c.textMuted} style={{ textAlign: 'center', paddingHorizontal: 12 }}>
              {traduire('Astuce : à la fin de chaque séance, « Enregistrer cette séance » l’ajoute ici.')}
            </Ink>
          </>
        ) : null}
      </ScrollView>

      <Sheet visible={!!menu} onClose={() => setMenu(null)} title={menu?.nom}>
        {menu ? (
          <>
            <Row icon="calendar" title={traduire('Noter comme faite')} sub={traduire('sans chrono, la date et l’heure au choix')} onPress={() => commencer(menu, true)} />
            <Row icon="edit" title={traduire('Modifier les exercices')} sub={traduire('ajouter, retirer, changer l’ordre et les séries')} onPress={() => modifier(menu)} />
            <Row icon="bookmark" title={traduire('Renommer')} onPress={() => { const s = menu; setMenu(null); setTimeout(() => setRenommer(s), 380); }} />
            <Row icon="repeat" title={traduire('Dupliquer')} sub={traduire('pour en faire une variante')} onPress={() => { const s = menu; setMenu(null); void dupliquerMaSeance(s.id).catch(() => {}); }} />
            <Row icon="trash" danger title={traduire('Supprimer')} onPress={() => supprimer(menu)} />
          </>
        ) : null}
      </Sheet>

      <NomSeanceSheet
        visible={!!renommer}
        titre={traduire('Renommer')}
        nomInitial={renommer?.nom ?? ''}
        action={traduire('Valider')}
        onClose={() => setRenommer(null)}
        onValider={(nom) => {
          const s = renommer;
          setRenommer(null);
          if (s) void modifierMaSeance(s.id, { nom }).catch(() => {});
        }}
      />
    </View>
  );
}
