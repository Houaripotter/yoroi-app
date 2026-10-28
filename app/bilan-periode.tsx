/**
 * Ta semaine, ton mois (25 octobre 2026, feuille de route : « bilan du dimanche » et « rendez-vous du mois »).
 * Un seul écran qui réunit ce qui compte sur la période : séances et objectif, records, poids réel (la
 * tendance, sans l'eau du jour), mensurations, régularité. Flèches pour revoir les périodes passées,
 * « Partager » vers la carte « Ma semaine » ou « Mon mois ». Ouvert par le rappel du dimanche soir.
 * Paramètres : type=semaine|mois (semaine par défaut). Calculs : lib/v2/bilan/periode.ts.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { BigButton, EmptyState, Glass, Segments, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { getSportName } from '@/lib/sports';
import { bilanPeriode, periodeDe, periodeParDefaut } from '@/lib/v2/bilan/periode';
import type { TypePeriode } from '@/lib/v2/bilan/periode';
import { chargerDonneesPeriode } from '@/lib/v2/bilan/chargerPeriode';
import type { DonneesPeriode } from '@/lib/v2/bilan/chargerPeriode';
import { MESURES } from '@/lib/v2/bilan/texte';
import { fmtMinutes, fmtNum } from '@/lib/v2/seance/format';
import { formatTonnage, accordSouleve, todayLocalIso } from '@/lib/v2/trainingWeek';
import { versUnitePoids } from '@/lib/v2/unitePoids';
import { LOCALE, traduire, traduirePluriel } from '@/lib/i18n/tr';

const dateDe = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

function libellePeriode(type: TypePeriode, debut: string, fin: string): string {
  try {
    if (type === 'mois') {
      const s = dateDe(debut).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    const a = dateDe(debut);
    const b = dateDe(fin);
    const jm = (d: Date) => d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' });
    return a.getMonth() === b.getMonth() ? traduire('du {0} au {1}', a.getDate(), jm(b)) : traduire('du {0} au {1}', jm(a), jm(b));
  } catch {
    return `${debut} / ${fin}`;
  }
}

/** « +1 », « −2 », « = » */
const signe = (n: number, dec = 0) => (n > 0 ? `+${fmtNum(n, dec)}` : n < 0 ? `−${fmtNum(-n, dec)}` : '=');

export default function BilanPeriodeEcran() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const unite = useUnitePoids();
  const params = useLocalSearchParams<{ type?: string }>();
  const [type, setType] = useState<TypePeriode>(params.type === 'mois' ? 'mois' : 'semaine');
  const [decalage, setDecalage] = useState(0);
  const [donnees, setDonnees] = useState<DonneesPeriode | null>(null);
  const aujourdhui = todayLocalIso();

  // relu a chaque retour sur l'ecran : une seance notee depuis « Noter quelque chose » apparait tout de suite
  useFocusEffect(
    useCallback(() => {
      chargerDonneesPeriode().then(setDonnees).catch(() => setDonnees({ trainings: [], pesees: [], mesures: [], parSemaine: 0 }));
    }, []),
  );

  // la periode par defaut, puis les fleches pour reculer (jamais au dela de la periode en cours)
  const base = useMemo(() => periodeParDefaut(type, aujourdhui), [type, aujourdhui]);
  const periode = useMemo(() => periodeDe(type, base.debut, decalage), [type, base.debut, decalage]);
  const enCours = periodeDe(type, aujourdhui, 0).debut === periode.debut;
  const b = useMemo(() => (donnees ? bilanPeriode({ periode, aujourdhui, ...donnees }) : null), [donnees, periode, aujourdhui]);

  const changerType = (t: TypePeriode) => {
    setType(t);
    setDecalage(0);
  };

  const s = b?.seances;
  const vide = !!b && s!.nombre === 0 && !b.poids && b.mensurations.length === 0;
  const kg = (v: number, dec = 1) => `${fmtNum(versUnitePoids(v, unite), dec)} ${unite === 'lb' ? 'lb' : 'kg'}`;
  const motPeriode = type === 'semaine' ? traduire('la semaine d’avant') : traduire('le mois d’avant');

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 22, paddingBottom: insets.bottom + 120, gap: 14 }} showsVerticalScrollIndicator={false}>
        <EnTete titre={type === 'semaine' ? traduire('Ta semaine') : traduire('Ton mois')} sousTitre={traduire('tout ce que tu as fait, réuni au même endroit')} repli="/(tabs)/progres" style={{ marginHorizontal: -22, marginTop: -8 }} />

        <Segments items={[{ key: 'semaine', label: traduire('Semaine') }, { key: 'mois', label: traduire('Mois') }]} value={type} onChange={changerType} />

        {/* la periode, avec les fleches pour revoir les precedentes */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Fleche sens="gauche" label={traduire('Période précédente')} onPress={() => { tap(); setDecalage((d) => d - 1); }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Ink size={17} weight="black" style={{ textAlign: 'center' }}>{libellePeriode(type, periode.debut, periode.fin)}</Ink>
            {enCours ? <Ink size={12} weight="bold" color={c.accent}>{type === 'semaine' ? traduire('semaine en cours') : traduire('mois en cours')}</Ink> : null}
          </View>
          <Fleche sens="droite" label={traduire('Période suivante')} actif={!enCours} onPress={() => { tap(); setDecalage((d) => d + 1); }} />
        </View>

        {!b ? null : vide ? (
          <EmptyState
            ornement="kabuto"
            title={type === 'semaine' ? traduire('Rien de noté cette semaine') : traduire('Rien de noté ce mois')}
            text={traduire('Une séance, une pesée ou une mensuration, et ton bilan se remplit tout seul.')}
            action={traduire('Noter quelque chose')}
            onAction={() => router.push('/ajouter' as any)}
          />
        ) : (
          <>
            {/* 1. Les seances, en grand */}
            <View style={{ padding: 18, borderRadius: 24, backgroundColor: '#2F3243', gap: 12 }}>
              <Ink size={12} weight="black" color="rgba(255,255,255,0.7)">{traduire('TES SÉANCES')}</Ink>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                <Ink size={52} weight="black" color="#FFFFFF" tight style={{ fontVariant: ['tabular-nums'] }}>{String(s!.nombre)}</Ink>
                <View style={{ paddingBottom: 9, flex: 1 }}>
                  <Ink size={16} weight="extraBold" color="#FFFFFF">{traduirePluriel(s!.nombre, s!.nombre > 1, 'séance', 'séances')}</Ink>
                  <Ink size={13} color="rgba(255,255,255,0.75)">
                    {s!.nombre === s!.nombreAvant ? traduire('autant que {0}', motPeriode) : traduire('{0} par rapport à {1}', signe(s!.nombre - s!.nombreAvant), motPeriode)}
                  </Ink>
                </View>
              </View>

              {b.objectif ? <ObjectifLigne o={b.objectif} type={type} /> : null}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {s!.minutes > 0 ? <Puce icone="clock" texte={fmtMinutes(s!.minutes)} /> : null}
                {s!.jours > 0 ? <Puce icone="calendar" texte={traduirePluriel(s!.jours, s!.jours > 1, '{0} jour actif', '{0} jours actifs', s!.jours)} /> : null}
                {s!.tonnage > 0 ? <Puce icone="dumbbell" texte={`${formatTonnage(s!.tonnage, unite)} ${accordSouleve(s!.tonnage, unite)}`} /> : null}
                {b.serie > 1 ? <Puce icone="flame" texte={traduire('{0} semaines d’affilée à ton objectif', b.serie)} /> : null}
              </View>

              {s!.sports.length > 1 ? (
                <Ink size={13} color="rgba(255,255,255,0.8)">
                  {s!.sports.map((x) => `${getSportName(x.sport)} ${x.nombre}`).join(', ')}
                </Ink>
              ) : null}
            </View>

            {/* 2. Les records */}
            {b.records.length ? (
              <Glass style={{ gap: 10 }}>
                <Titre icone="trophy" texte={traduirePluriel(b.records.length, b.records.length > 1, '{0} record battu', '{0} records battus', b.records.length)} />
                {b.records.map((r, i) => (
                  <View key={`${r.date}-${i}`} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 7, backgroundColor: c.gold }} />
                    <Ink size={14} style={{ flex: 1 }}>{r.texte}</Ink>
                  </View>
                ))}
              </Glass>
            ) : null}

            {/* 3. Le poids reel */}
            {b.poids ? (
              <Glass style={{ gap: 8 }}>
                <Titre icone="scale" texte={traduire('Ton poids réel')} />
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                  <Ink size={30} weight="black" tight>{kg(b.poids.fin)}</Ink>
                  <Ink size={16} weight="extraBold" color={c.textSecondary} style={{ paddingBottom: 4 }}>
                    {b.poids.ecart === 0 ? traduire('stable') : `${signe(versUnitePoids(b.poids.ecart, unite), 1)} ${unite === 'lb' ? 'lb' : 'kg'}`}
                  </Ink>
                </View>
                <Ink size={13} color={c.textSecondary}>
                  {traduirePluriel(b.poids.pesees, b.poids.pesees > 1, 'Ta tendance, sans l’eau du jour, à partir de {0} pesée.', 'Ta tendance, sans l’eau du jour, à partir de {0} pesées.', b.poids.pesees)}
                </Ink>
              </Glass>
            ) : null}

            {/* 4. Les mensurations */}
            {b.mensurations.length ? (
              <Glass style={{ gap: 10 }}>
                <Titre icone="tape" texte={traduire('Tes mensurations')} />
                {b.mensurations.map((m) => {
                  const label = MESURES.find((x) => x.key === m.cle)?.label ?? m.cle;
                  return (
                    <View key={m.cle} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ink size={14} weight="bold" style={{ flex: 1 }}>{label.charAt(0).toUpperCase() + label.slice(1)}</Ink>
                      <Ink size={14} color={c.textSecondary}>{`${fmtNum(m.fin, 1)} cm`}</Ink>
                      <Ink size={14} weight="extraBold" style={{ minWidth: 56, textAlign: 'right' }}>{m.ecart === 0 ? '=' : `${signe(m.ecart, 1)} cm`}</Ink>
                    </View>
                  );
                })}
              </Glass>
            ) : null}

            {/* ce qu'il manque, sans juger */}
            {!b.poids || !b.mensurations.length ? (
              <Ink size={12} color={c.textMuted} style={{ textAlign: 'center', paddingHorizontal: 12 }}>
                {!b.poids && !b.mensurations.length
                  ? traduire('Note une pesée et tes mensurations pour voir aussi ton corps évoluer ici.')
                  : !b.poids
                    ? traduire('Note au moins deux pesées pour voir ton poids réel ici.')
                    : traduire('Prends tes mensurations pour les voir évoluer ici.')}
              </Ink>
            ) : null}
          </>
        )}
      </ScrollView>

      {b && !vide ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 12, paddingBottom: insets.bottom + 16, backgroundColor: c.background, borderTopWidth: 1, borderColor: c.divider }}>
          <BigButton
            label={type === 'semaine' ? traduire('Partager ma semaine') : traduire('Partager mon mois')}
            icon="share"
            onPress={() => router.push((type === 'semaine' ? '/social-share/weekly-recap-v2' : '/social-share/monthly-recap-v2') as any)}
          />
        </View>
      ) : null}
    </View>
  );
}

function ObjectifLigne({ o, type }: { o: { parSemaine: number; tenu: boolean | null; semainesTenues: number; semaines: number }; type: TypePeriode }) {
  const texte =
    type === 'semaine'
      ? o.tenu === true
        ? traduire('Objectif de {0} séances tenu', o.parSemaine)
        : o.tenu === false
          ? traduire('Objectif de {0} séances pas atteint cette fois', o.parSemaine)
          : traduire('Objectif : {0} séances cette semaine', o.parSemaine)
      : traduire('Objectif tenu {0} semaines sur {1}', o.semainesTenues, o.semaines);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: o.tenu === true || (type === 'mois' && o.semaines > 0 && o.semainesTenues === o.semaines) ? '#5FB98A' : 'rgba(255,255,255,0.18)' }}>
        <Icon name={o.tenu === true ? 'check' : 'target'} size={13} color="#FFFFFF" />
      </View>
      <Ink size={14} weight="extraBold" color="#FFFFFF" style={{ flex: 1 }}>{texte}</Ink>
    </View>
  );
}

function Puce({ icone, texte }: { icone: 'clock' | 'calendar' | 'dumbbell' | 'flame'; texte: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)' }}>
      <Icon name={icone} size={15} color="#FFFFFF" />
      <Ink size={13} weight="extraBold" color="#FFFFFF">{texte}</Ink>
    </View>
  );
}

function Titre({ icone, texte }: { icone: 'trophy' | 'scale' | 'tape'; texte: string }) {
  const { theme } = useYoroiTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Icon name={icone} size={18} color={theme.colors.accent} />
      <Ink size={16} weight="black">{texte}</Ink>
    </View>
  );
}

function Fleche({ sens, label, onPress, actif = true }: { sens: 'gauche' | 'droite'; label: string; onPress: () => void; actif?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={actif ? onPress : undefined}
      disabled={!actif}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !actif }}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.fillSubtle, opacity: actif ? 1 : 0.3 })}
    >
      <View style={{ transform: [{ rotate: sens === 'gauche' ? '180deg' : '0deg' }] }}>
        <Icon name="chevron" size={18} color={c.ink} />
      </View>
    </Pressable>
  );
}
