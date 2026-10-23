/**
 * Noter ta nuit : heures pre-remplies avec ta derniere nuit, qualite en un appui.
 */
import { track } from '@/utils/telemetry';
import React, { useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { DateChips } from '@/components/yoroi/v2/DateChips';
import { addSleepEntry, getSleepEntries, getSleepGoal } from '@/lib/sleepService';
import { healthConnect } from '@/lib/healthConnect';
import { logger } from '@/lib/security/logger';
import { localISO } from '@/lib/v2/accueil/hydration';
import { BigButton, Card, Enter, Icon, P, Pill, Press, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { QUALITY_LABELS, Stars, Stepper, clock, dayLabel, hm, shiftTime } from '@/components/yoroi/v2/accueil/sleepKit';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { doitEcrireNuitSante, nuitDejaEcriteSante, retenirNuitEcriteSante } from '@/lib/v2/sante/sommeilSante';
import { traduire } from '@/lib/i18n/tr';

function toMin(t: string): number {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10) || 0);
  return h * 60 + m;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return localISO(d);
}

export default function NoterMaNuit() {
  const router = useRouter();
  const today = localISO();
  const [date, setDate] = useState(today);
  const [bed, setBed] = useState('23:00');
  const [wake, setWake] = useState('07:00');
  const [quality, setQuality] = useState(3);
  const [goal, setGoal] = useState(480);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<{ date: string; bedTime: string; wakeTime: string; quality: number; id: string }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [entries, g] = await Promise.all([getSleepEntries(), getSleepGoal()]);
        setGoal(g || 480);
        setEntries((entries ?? []).filter((e) => e.bedTime && e.wakeTime && !e.id.startsWith('hk_')));
        const last = [...(entries ?? [])].filter((e) => e.bedTime && e.wakeTime && !e.id.startsWith('hk_')).sort((a, b) => b.date.localeCompare(a.date))[0];
        if (last) {
          setBed(last.bedTime);
          setWake(last.wakeTime);
          if (last.quality > 0) setQuality(last.quality);
        }
      } catch {
        // valeurs par defaut
      }
    })();
  }, []);

  // Une nuit deja notee ce jour-la : on la reprend pour la corriger
  useEffect(() => {
    const same = entries.find((e) => e.date.slice(0, 10) === date);
    if (same) {
      setBed(same.bedTime);
      setWake(same.wakeTime);
      if (same.quality > 0) setQuality(same.quality);
    }
  }, [date, entries]);

  const duration = useMemo(() => {
    let d = toMin(wake) - toMin(bed);
    if (d <= 0) d += 1440;
    return d;
  }, [bed, wake]);
  const valid = duration >= 60 && duration <= 960;

  const save = async () => {
    if (saving) return;
    if (!valid) {
      appAlert(traduire('Horaires à vérifier'), traduire('Une nuit doit durer entre 1 h et 16 h.'));
      return;
    }
    setSaving(true);
    tap('medium');
    try {
      // audit 18 octobre : une nuit deja notee ce jour-la est une correction, elle ne repart pas vers Santé
      const dejaNoteeDansYoroi = entries.some((e) => e.date.slice(0, 10) === date);
      await addSleepEntry(bed, wake, quality, '', date);
      track('sommeil_saisi');
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
      try {
        // writeSleepData ne sait ni modifier ni remplacer une nuit : une seule ecriture par nuit, jamais de doublon
        if (doitEcrireNuitSante({ dejaNoteeDansYoroi, dejaEcriteDansSante: await nuitDejaEcriteSante(date) })) {
          const end = new Date(date + 'T00:00:00');
          end.setHours(Math.floor(toMin(wake) / 60), toMin(wake) % 60, 0, 0);
          const start = new Date(end.getTime() - duration * 60000);
          if (await healthConnect.writeSleepData({ startDate: start, endDate: end })) await retenirNuitEcriteSante(date);
        }
      } catch (e) {
        // Sante indisponible : la nuit reste enregistree dans YOROI, l'erreur est notee sans bloquer la saisie
        logger.warn('[Sommeil] nuit non écrite dans Santé ou Health Connect', e);
      }
      tap('success');
      router.back();
    } catch (err) {
      logger.error('Enregistrement de la nuit impossible', err);
      appAlert(traduire('Oups'), traduire('Ta nuit n’a pas pu être enregistrée. Vérifie les horaires et réessaie.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DetailScreen
      title={traduire("Ta nuit")}
      subtitle={dayLabel(date, true)}
      footer={<BigButton label={saving ? 'Enregistrement' : traduire('Enregistrer ma nuit')} icon="check" onPress={save} disabled={saving || !valid} />}
    >
      <Enter i={0}>
        <DateChips value={date} onChange={setDate} todayLabel={traduire("Cette nuit")} yesterdayLabel={traduire("La veille")} activeColor={P.indigo} />
      </Enter>

      <Enter i={1}>
        <View style={{ borderRadius: 26, backgroundColor: P.indigo, padding: 22, alignItems: 'center', gap: 4 }}>
          <Ink size={13} weight="bold" color="#C9D3EA">
            {traduire("Tu as dormi")}</Ink>
          <Ink size={64} weight="black" tight color={P.white}>
            {hm(duration)}
          </Ink>
          <Ink size={14} weight="bold" color={valid ? (duration >= goal ? P.goldLight : '#E4E9F3') : '#F3C9C5'}>
            {!valid ? traduire('Horaires à vérifier') : duration >= goal ? traduire('Objectif atteint') : traduire("{0} sous ton objectif", hm(goal - duration))}
          </Ink>
        </View>
      </Enter>

      <Enter i={2}>
        <Card style={{ gap: 16 }}>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="moon" size={18} color={P.indigo} />
              <Ink size={15} weight="extraBold">
                {traduire("Couché à")}</Ink>
            </View>
            <Stepper value={clock(bed)} label={traduire("Heure du coucher")} onMinus={() => setBed(shiftTime(bed, -15))} onPlus={() => setBed(shiftTime(bed, 15))} />
          </View>
          <View style={{ height: 1, backgroundColor: P.line2 }} />
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="sun" size={18} color={P.gold} />
              <Ink size={15} weight="extraBold">
                {traduire("Réveillé à")}</Ink>
            </View>
            <Stepper value={clock(wake)} label={traduire("Heure du réveil")} onMinus={() => setWake(shiftTime(wake, -15))} onPlus={() => setWake(shiftTime(wake, 15))} />
          </View>
        </Card>
      </Enter>

      <Enter i={3}>
        <Card style={{ alignItems: 'center', gap: 6 }}>
          <Ink size={15} weight="extraBold">
            {traduire("Comment as-tu dormi ?")}</Ink>
          <Stars value={quality} size={30} onChange={setQuality} />
          <Ink size={14} weight="bold" color={quality >= 4 ? P.mossText : quality === 3 ? P.ink2 : P.goldDark}>
            {QUALITY_LABELS[quality]}
          </Ink>
        </Card>
      </Enter>
    </DetailScreen>
  );
}
