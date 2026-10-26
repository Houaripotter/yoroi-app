/**
 * Le message du jour d'un programme (24 octobre 2026) : « Aujourd'hui : Pectoraux, 5 exercices... »,
 * « Aujourd'hui : Sortie 2, 8 fois 2 min de course... ». Il passe par les rappels de séance existants
 * (lib/notificationService.ts) : un seul réglage, jamais deux rappels le même jour. Les jours conseillés
 * suivent le nombre de séances du programme, l'heure se choisit ici. Rien n'est activé sans toi.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Chip, Glass, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { notificationService } from '@/lib/notificationService';
import { ouvrirReglagesSysteme, permissionPourRappels, rappelsAutorises } from '@/lib/v2/notifications/rappels';
import { chargerProgrammeActif, joursDuProgramme } from '@/lib/v2/programmes/suivi';
import { joursDuRappel } from '@/lib/v2/programmes/rappel';
import type { Programme } from '@/lib/v2/programmes/types';
import { traduire } from '@/lib/i18n/tr';

const HEURES = [
  { h: '07:30', label: 'Le matin, 7 h 30' },
  { h: '12:00', label: 'À midi' },
  { h: '18:00', label: 'Le soir, 18 h' },
];

export function MessageDuJour({ programme }: { programme: Programme }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [actif, setActif] = useState(false);
  const [heure, setHeure] = useState('07:30');
  const [refuse, setRefuse] = useState(false);
  const [occupe, setOccupe] = useState(false);

  const lire = useCallback(async () => {
    try {
      const [s, ok] = await Promise.all([notificationService.loadSettings(), rappelsAutorises()]);
      setActif(ok && s.enabled !== false && !!s.training?.enabled);
      if (s.training?.time) setHeure(s.training.time);
    } catch {
      setActif(false);
    }
  }, []);

  useEffect(() => {
    void lire();
  }, [lire]);

  // programme change (nouveau programme, séance faite) : le texte des rappels suit
  useEffect(() => {
    if (actif) void notificationService.replanifierSeances();
  }, [actif, programme.id]);

  const appliquer = async (on: boolean, h = heure) => {
    if (occupe) return;
    setOccupe(true);
    try {
      if (on) {
        const r = await permissionPourRappels('seance');
        if (r !== 'ok') {
          setRefuse(r === 'refuse');
          return;
        }
      }
      const s = await notificationService.loadSettings();
      // 26 octobre 2026 : tes jours de programme (ChoixJours), comme la carte « Rappel de séance »
      const pa = await chargerProgrammeActif().catch(() => null);
      const jours = joursDuRappel(joursDuProgramme(pa?.id === programme.id ? pa : null, programme));
      await notificationService.updateSettings({
        ...(on ? { enabled: true } : {}),
        training: { ...s.training, enabled: on, time: h, days: jours.slice().sort((a, b) => a - b) },
      });
      setRefuse(false);
      setActif(on);
      setHeure(h);
    } catch {
      // rien de casse : le réglage reste celui d'avant
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Glass style={{ gap: 10 }}>
      <Pressable
        onPress={() => { tap(); void appliquer(!actif); }}
        accessibilityRole="switch"
        accessibilityState={{ checked: actif, busy: occupe }}
        accessibilityLabel={traduire('Recevoir la séance du jour')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="clock" size={20} color={c.ink} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="black" tight>{traduire('Le message du jour')}</Ink>
          <Ink size={12} color={c.textSecondary}>
            {actif ? traduire('Les jours de séance, YOROI te dit ce que tu fais aujourd’hui.') : traduire('Reçois ta séance du jour : quoi faire, combien, dans quel ordre.')}
          </Ink>
        </View>
        <View style={{ width: 48, height: 28, borderRadius: 14, padding: 3, backgroundColor: actif ? c.accent : c.fillSubtle, alignItems: actif ? 'flex-end' : 'flex-start' }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: actif ? c.onAccent : c.textMuted }} />
        </View>
      </Pressable>
      {actif ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {HEURES.map((x) => (
            <Chip key={x.h} label={traduire(x.label)} on={heure === x.h} onPress={() => void appliquer(true, x.h)} />
          ))}
        </View>
      ) : null}
      {refuse ? (
        <Pressable onPress={ouvrirReglagesSysteme} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
          <Ink size={13} weight="extraBold" color={c.accent}>{traduire('Les notifications sont coupées pour YOROI : ouvre les réglages du téléphone.')}</Ink>
        </Pressable>
      ) : null}
    </Glass>
  );
}
