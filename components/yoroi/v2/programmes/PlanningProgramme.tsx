/**
 * Mettre le programme dans ton planning (24 octobre 2026) : un créneau par séance, les jours conseillés,
 * à l'heure choisie. Rien n'est ajouté sans ton tap, et « Retirer » n'enlève que les créneaux créés ici
 * (lib/v2/programmes/agenda.ts). Tes autres créneaux ne bougent pas.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Chip, Glass, tap } from '@/components/yoroi/v2/seances/ui';
import { RondIcone } from '@/components/yoroi/v2/programmes/Habillage';
import { addWeeklyPlanItem, deleteWeeklyPlanItem, getWeeklyPlan } from '@/lib/database';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { chargerCreneaux, creneauxACreer, creneauxRestants, enregistrerCreneaux } from '@/lib/v2/programmes/agenda';
import type { CreneauxProgramme } from '@/lib/v2/programmes/agenda';
import { PROGRAMME_CHANGED_EVENT, chargerProgrammeActif, joursConseilles, joursDuProgramme } from '@/lib/v2/programmes/suivi';
import type { ProgrammeActif } from '@/lib/v2/programmes/suivi';
import type { Programme } from '@/lib/v2/programmes/types';
import { traduire } from '@/lib/i18n/tr';

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const HEURES = ['07:00', '12:00', '18:00', '19:30'];
/** « 18 h », « 19 h 30 » */
const libelleHeure = (h: string) => (h.endsWith(':00') ? `${Number(h.slice(0, 2))} h` : `${Number(h.slice(0, 2))} h ${h.slice(3, 5)}`);

/** nu : sans carte autour, pour se ranger dans le bloc de réglages (BlocReglages, Habillage.tsx) */
export function PlanningProgramme({ programme, nu }: { programme: Programme; nu?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [creneaux, setCreneaux] = useState<CreneauxProgramme | null>(null);
  const [heure, setHeure] = useState('18:00');
  const [occupe, setOccupe] = useState(false);
  // 25 octobre 2026 : tes jours d'entraînement choisis (components/yoroi/v2/programmes/ChoixJours.tsx)
  const [actif, setActif] = useState<ProgrammeActif | null>(null);
  useEffect(() => {
    const lireActif = () => chargerProgrammeActif().then(setActif).catch(() => setActif(null));
    lireActif();
    const sub = DeviceEventEmitter.addListener(PROGRAMME_CHANGED_EVENT, lireActif);
    return () => sub.remove();
  }, []);
  const joursChoisis = joursDuProgramme(actif?.id === programme.id ? actif : null, programme);

  const lire = useCallback(async () => {
    const cr = await chargerCreneaux();
    let plan: Awaited<ReturnType<typeof getWeeklyPlan>>;
    try {
      plan = await getWeeklyPlan();
    } catch {
      // lecture ratee : on ne nettoie rien, les creneaux restent retirables
      setCreneaux(cr);
      if (cr?.heure) setHeure(cr.heure);
      return;
    }
    // creneaux supprimes a la main dans le planning : on les oublie
    const restants = creneauxRestants(cr, plan ?? []);
    const net = cr && restants.length ? { ...cr, ids: restants } : null;
    if (cr && (!net || net.ids.length !== cr.ids.length)) await enregistrerCreneaux(net);
    setCreneaux(net);
    if (net?.heure) setHeure(net.heure);
  }, []);

  useEffect(() => {
    void lire();
  }, [lire, programme.id]);

  const retirerIds = async (ids: number[]) => {
    for (const id of ids) await deleteWeeklyPlanItem(id).catch(() => {});
  };

  const planifier = async (h: string) => {
    if (occupe) return;
    setOccupe(true);
    try {
      if (creneaux) await retirerIds(creneaux.ids);
      const ids: number[] = [];
      // chaque creneau cree est note tout de suite : meme si la suite echoue, « Retirer » le retrouve
      for (const s of creneauxACreer(programme, h, traduire(programme.titre), joursChoisis)) {
        ids.push(await addWeeklyPlanItem(s));
        await enregistrerCreneaux({ programme: programme.id, ids: [...ids], heure: h, jours: joursChoisis });
      }
      const net = { programme: programme.id, ids, heure: h, jours: joursChoisis };
      setCreneaux(net);
      setHeure(h);
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
    } catch {
      // le planning garde ce qu'il avait ; on relit l'etat reel
      void lire();
    } finally {
      setOccupe(false);
    }
  };

  const retirer = async () => {
    if (occupe || !creneaux) return;
    setOccupe(true);
    try {
      await retirerIds(creneaux.ids);
      await enregistrerCreneaux(null);
      setCreneaux(null);
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
    } finally {
      setOccupe(false);
    }
  };

  const pourCeProgramme = creneaux?.programme === programme.id;
  // tu as changé tes jours : les créneaux déjà posés suivent, à la même heure
  const cleJours = joursChoisis.join(',');
  useEffect(() => {
    if (!pourCeProgramme || !creneaux || occupe || !actif) return;
    if ((creneaux.jours ?? joursConseilles(programme.joursParSemaine)).join(',') !== cleJours) void planifier(creneaux.heure);
  }, [cleJours, pourCeProgramme]); // eslint-disable-line react-hooks/exhaustive-deps
  const jours = joursChoisis.map((d) => traduire(JOURS[d])).join(', ');

  const Cadre = nu ? View : Glass;
  return (
    <Cadre style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RondIcone icone="calendar" />
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="black" tight>{traduire('Dans mon planning')}</Ink>
          <Ink size={12} color={c.textSecondary}>
            {pourCeProgramme
              ? traduire('Tes séances sont prévues : {0}, à {1}.', jours, libelleHeure(heure))
              : traduire('Ajoute tes séances à ton planning : {0}. Tu les retrouves à l’accueil.', jours)}
          </Ink>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {HEURES.map((h) => (
          <Chip key={h} label={libelleHeure(h)} on={pourCeProgramme && heure === h} onPress={() => { tap(); void planifier(h); }} />
        ))}
      </View>
      {creneaux ? (
        <Pressable onPress={() => { tap(); void retirer(); }} accessibilityRole="button" style={{ minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' }}>
          <Ink size={13} weight="extraBold" color={c.textSecondary}>{traduire('Retirer ces créneaux de mon planning')}</Ink>
        </Pressable>
      ) : null}
    </Cadre>
  );
}
