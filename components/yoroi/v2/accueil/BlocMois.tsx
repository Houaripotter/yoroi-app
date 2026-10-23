/**
 * « Ton mois » en bas de l'accueil (vague 37). Houari : « dans l'Accueil, en bas, mets-moi mon calendrier
 * où je vois mes séances ».
 * Le calendrier du mois de l'onglet Seances (MonthCard : jours d'entrainement marques du logo de ton club,
 * sinon ses initiales, sinon l'icone du sport ; contour or les jours de competition), puis tes prochaines
 * seances prevues (ton planning de la semaine, trois au plus). Un toucher ouvre le calendrier complet.
 * Reglable dans « Personnaliser l'accueil ».
 */
import React, { useCallback, useMemo, useState } from 'react';
import { DeviceEventEmitter, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getCompetitions, getWeeklyPlan } from '@/lib/database';
import type { Competition, Training, WeeklyPlan } from '@/lib/database';
import { getSportName } from '@/lib/sports';
import { formatHour } from '@/lib/v2/accueil/home';
import { devNow } from '@/lib/v2/creator/devClock';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { MonthCard, SessionMark } from '@/components/yoroi/v2/seances/MonthMarks';
import { Section } from './Sections';
import { Icon, P, Press, useAccent } from './kit';
import { traduire } from '@/lib/i18n/tr';

const JOURS = [traduire('lundi'), traduire('mardi'), traduire('mercredi'), traduire('jeudi'), traduire('vendredi'), traduire('samedi'), traduire('dimanche')];

export type SeancePrevue = { key: string; quand: string; titre: string; club: string | null; slot: WeeklyPlan };

/** Tes prochaines seances prevues sur les 7 jours a venir (planning de la semaine), dans l'ordre */
export function seancesAVenir(plan: WeeklyPlan[], trainings: Training[], max = 3, now: Date = devNow()): SeancePrevue[] {
  const actifs = plan.filter((p) => !p.is_rest_day && p.sport);
  if (!actifs.length) return [];
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = iso(now);
  const faitAujourdhui = trainings.some((t) => (t.date ?? '').slice(0, 10) === today);
  const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const idx = (now.getDay() + 6) % 7;
  const out: SeancePrevue[] = [];
  for (let off = 0; off < 7 && out.length < max; off++) {
    const day = (idx + off) % 7;
    const items = actifs
      .filter((p) => p.day_of_week === day)
      .filter((p) => (off !== 0 ? true : p.time ? p.time.slice(0, 5) >= hm : !faitAujourdhui))
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
    for (const p of items) {
      if (out.length >= max) break;
      const jour = off === 0 ? (p.time && p.time < '17:00' ? traduire('Aujourd’hui') : p.time ? traduire('Ce soir') : traduire('Aujourd’hui')) : off === 1 ? traduire('Demain') : `${JOURS[day].charAt(0).toUpperCase()}${JOURS[day].slice(1)}`;
      const h = formatHour(p.time);
      out.push({
        key: `${off}-${p.id ?? p.sport}-${p.time ?? ''}`,
        quand: h ? `${jour} ${h}` : jour,
        titre: p.label?.trim() || p.session_type?.trim() || getSportName(p.sport),
        club: p.club_name?.trim() || null,
        slot: p,
      });
    }
  }
  return out;
}

export function BlocMois({ trainings }: { trainings: Training[] }) {
  const router = useRouter();
  const { accent } = useAccent();
  const [plan, setPlan] = useState<WeeklyPlan[]>([]);
  const [comps, setComps] = useState<Competition[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const load = () => {
        getWeeklyPlan()
          .then((p) => alive && setPlan(p ?? []))
          .catch(() => {});
        getCompetitions()
          .then((c) => alive && setComps(c ?? []))
          .catch(() => {});
      };
      load();
      const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
      return () => {
        alive = false;
        sub.remove();
      };
    }, []),
  );

  const prevues = useMemo(() => seancesAVenir(plan, trainings, 3), [plan, trainings]);
  const ouvrir = () => router.push('/planning?tab=mois' as any);

  return (
    <View style={{ gap: 10 }}>
      <Section title={traduire("Ton mois")} action={traduire("Planning")} onAction={() => router.push('/planning' as any)} />
      <MonthCard trainings={trainings} competitions={comps} onOpen={ouvrir} />
      {prevues.length ? (
        <View style={{ borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2, paddingHorizontal: 14, paddingVertical: 6 }}>
          <Ink size={12} weight="extraBold" color={P.ink2} style={{ paddingTop: 6, paddingBottom: 2 }}>
            {traduire("À venir")}</Ink>
          {prevues.map((s, i) => (
            <Press key={s.key} onPress={ouvrir} haptic="light" accessibilityRole="button" accessibilityLabel={traduire("{0}, {1}{2}. Ouvrir le calendrier", s.quand, s.titre, s.club ? `, ${s.club}` : '')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, borderTopWidth: i === 0 ? 0 : 1, borderColor: P.line2 }}>
                <SessionMark t={{ sport: s.slot.sport, club_id: s.slot.club_id, club_name: s.slot.club_name, club_logo: s.slot.club_logo, club_color: s.slot.club_color, date: '' } as unknown as Training} size={26} />
                <View style={{ flex: 1 }}>
                  <Ink size={14} weight="extraBold" numberOfLines={1}>
                    {traduire(s.titre)}
                  </Ink>
                  <Ink size={12} weight="bold" color={P.muted} numberOfLines={1}>
                    {s.club ? `${s.quand}, ${s.club}` : s.quand}
                  </Ink>
                </View>
                <Icon name="chevron" size={15} color={accent} width={2.6} />
              </View>
            </Press>
          ))}
        </View>
      ) : null}
    </View>
  );
}
