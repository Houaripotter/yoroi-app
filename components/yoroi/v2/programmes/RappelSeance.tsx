/**
 * Rappel de séance (26 octobre 2026), sur la page du programme en cours : tu choisis l'heure, YOROI te
 * rappelle tes jours de programme (ChoixJours) avec la séance du jour dans le texte.
 * Un seul réglage pour toute l'app : celui des rappels de séance (lib/notificationService.ts, training),
 * le même que « Le message du jour ». Jamais deux rappels le même jour. La permission n'est demandée
 * que quand tu allumes le rappel.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Chip, Glass, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { TimeField } from '@/components/yoroi/v2/notifications/parts';
import { notificationService } from '@/lib/notificationService';
import { ouvrirReglagesSysteme, permissionPourRappels, rappelsAutorises } from '@/lib/v2/notifications/rappels';
import { HEURES_RAPPEL, estAutreHeure, heureRappelValide, joursDuRappel, libelleHeureRappel, memesJours } from '@/lib/v2/programmes/rappel';
import { messageDuJour } from '@/lib/v2/programmes/lancer';
import { semaineDuProgramme } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { Programme } from '@/lib/v2/programmes/types';
import { traduire } from '@/lib/i18n/tr';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function RappelSeance({ programme, actif, jours }: { programme: Programme; actif: ProgrammeActif; jours: number[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [on, setOn] = useState(false);
  const [heure, setHeure] = useState('18:00');
  const [joursRappel, setJoursRappel] = useState<number[]>([]);
  const [autre, setAutre] = useState(false);
  const [refuse, setRefuse] = useState(false);
  const [occupe, setOccupe] = useState(false);

  const lire = useCallback(async () => {
    try {
      const [s, ok] = await Promise.all([notificationService.loadSettings(), rappelsAutorises()]);
      setOn(ok && s.enabled !== false && !!s.training?.enabled);
      if (heureRappelValide(s.training?.time)) {
        setHeure(s.training.time);
        setAutre(estAutreHeure(s.training.time));
      }
      setJoursRappel(s.training?.days ?? []);
    } catch {
      setOn(false);
    }
  }, []);

  useEffect(() => {
    void lire();
  }, [lire]);

  const appliquer = async (allumer: boolean, h = heure) => {
    if (occupe) return;
    setOccupe(true);
    try {
      if (allumer) {
        // seulement ici, sur ton tap : un mot d'explication, puis la fenêtre du système
        const r = await permissionPourRappels('seance');
        if (r !== 'ok') {
          setRefuse(r === 'refuse');
          return;
        }
      }
      const s = await notificationService.loadSettings();
      const days = joursDuRappel(jours);
      await notificationService.updateSettings({
        ...(allumer ? { enabled: true } : {}),
        training: { ...s.training, enabled: allumer, time: h, days },
      });
      setRefuse(false);
      setOn(allumer);
      setHeure(h);
      setJoursRappel(days);
    } catch {
      // rien de cassé : le réglage reste celui d'avant
    } finally {
      setOccupe(false);
    }
  };

  // tu changes tes jours d'entraînement : le rappel suit, à la même heure
  const cleJours = jours.join(',');
  useEffect(() => {
    if (on && !occupe && !memesJours(joursRappel, joursDuRappel(jours))) void appliquer(true, heure);
  }, [cleJours, on]); // eslint-disable-line react-hooks/exhaustive-deps

  // séance faite, programme changé : le texte des rappels suit
  useEffect(() => {
    if (on) void notificationService.replanifierSeances();
  }, [on, actif.prochain, programme.id]);

  const nomsJours = jours.map((d) => traduire(JOURS[d])).join(', ');
  const exemple = messageDuJour(programme, programme.jours[Math.min(actif.prochain, programme.jours.length - 1)], semaineDuProgramme(actif));

  return (
    <Glass style={{ gap: 12, borderColor: on ? c.accent : c.divider }}>
      <Pressable
        onPress={() => { tap(); void appliquer(!on); }}
        accessibilityRole="switch"
        accessibilityState={{ checked: on, busy: occupe }}
        accessibilityLabel={traduire('Rappel de séance')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: on ? c.accentTint : c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="clock" size={20} color={on ? c.accent : c.ink} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="black" tight>{traduire('Rappel de séance')}</Ink>
          <Ink size={12} color={c.textSecondary}>
            {on
              ? traduire('Chaque {0}, à {1}, YOROI te dit ta séance du jour.', nomsJours, libelleHeureRappel(heure))
              : traduire('Choisis une heure : YOROI te rappelle ta séance tes jours d’entraînement.')}
          </Ink>
        </View>
        <View style={{ width: 48, height: 28, borderRadius: 14, padding: 3, backgroundColor: on ? c.accent : c.fillSubtle, alignItems: on ? 'flex-end' : 'flex-start' }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: on ? c.onAccent : c.textMuted }} />
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {HEURES_RAPPEL.map((h) => (
          <Chip key={h} label={libelleHeureRappel(h)} on={on && !autre && heure === h} onPress={() => { setAutre(false); void appliquer(true, h); }} />
        ))}
        <Chip label={traduire('Autre heure')} on={autre} onPress={() => setAutre((a) => !a)} />
      </View>
      {autre ? <TimeField label={traduire('Heure du rappel')} value={heure} onChange={(h) => void appliquer(true, h)} /> : null}

      {on ? (
        <View style={{ padding: 12, borderRadius: 14, backgroundColor: c.fillSubtle, gap: 2 }}>
          <Ink size={11} weight="extraBold" color={c.textMuted}>{traduire('TON PROCHAIN RAPPEL')}</Ink>
          <Ink size={13} weight="extraBold">{exemple.titre}</Ink>
          <Ink size={12} color={c.textSecondary} numberOfLines={3}>{exemple.corps}</Ink>
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
