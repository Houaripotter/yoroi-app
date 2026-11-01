/**
 * Biomarqueurs (1er novembre 2026, demande AU, point 4), niveau Athlete : saisie manuelle de la glycemie, de la
 * tension, des cetones, du lactate, de la temperature et d'un bilan sanguin libre. Unites converties
 * (lib/v2/mesures/biomarqueurs.ts). Lecture d'Apple Sante seulement si l'autorisation existe deja, et reprise des
 * mesures importees par l'IA (sac des mesures). Aucune interpretation medicale : les valeurs, les courbes, et
 * « Parle de tes résultats avec un professionnel de santé ». Donnees sensibles : aucune statistique d'usage ici.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Aide, Carte, ChampNombre, EcranCorps, Lien, MiniCourbe, nb, Puce, TitreCarte } from '@/components/yoroi/v2/corps/kit';
import { creerBiomarqueur, depuisSac, depuisSante, enregistrerBiomarqueurs, seriesBio, TYPE_BIO, TYPES_BIO } from '@/lib/v2/mesures/biomarqueurs';
import type { TypeBio } from '@/lib/v2/mesures/biomarqueurs';
import { jourLocal } from '@/lib/v2/mesures/listeStockee';
import { useCorps } from '@/lib/v2/mesures/useCorps';
import { DateChips } from '@/components/yoroi/v2/DateChips';
import { dayShort, num } from '@/lib/v2/progres/format';
import { logger } from '@/lib/security/logger';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import type { NomSticker } from '@/components/yoroi/v2/stickers';

const STICKER_BIO: Record<TypeBio, NomSticker> = {
  glycemie: 'nutrition',
  glycemie_jeun: 'nutrition',
  glycemie_repas: 'assiette',
  tension: 'coeur',
  cetones: 'flamme',
  lactate: 'endurance',
  temperature: 'thermometre',
  libre: 'document',
};

const SAISIE: TypeBio[] = ['glycemie_jeun', 'glycemie_repas', 'tension', 'cetones', 'lactate', 'temperature', 'libre'];

export default function Biomarqueurs() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const corps = useCorps();
  const [type, setType] = useState<TypeBio>('glycemie_jeun');
  const [date, setDate] = useState(jourLocal());
  const [valeur, setValeur] = useState('');
  const [valeur2, setValeur2] = useState('');
  const [unite, setUnite] = useState(TYPE_BIO.glycemie_jeun.unite);
  const [nom, setNom] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const spec = TYPE_BIO[type];
  const series = useMemo(() => seriesBio(corps.bio), [corps.bio]);
  const aReprendre = useMemo(() => {
    const ids = new Set(corps.bio.map((b) => b.id));
    return depuisSac(corps.brutes).filter((b) => !ids.has(b.id));
  }, [corps.bio, corps.brutes]);

  const changerType = (t: TypeBio) => {
    setType(t);
    setUnite(TYPE_BIO[t].unite);
    setValeur('');
    setValeur2('');
    setMessage(null);
  };

  const enregistrer = async () => {
    const b = creerBiomarqueur({ date, type, valeur, valeur2, unite, nom });
    if (!b) {
      setMessage({ ok: false, texte: type === 'tension' ? traduire('Vérifie les deux chiffres : la systolique (le grand) puis la diastolique (le petit).') : type === 'libre' ? traduire('Il faut le nom de l’analyse, sa valeur et son unité.') : traduire('Valeur hors des plages possibles pour cette unité.') });
      return;
    }
    await enregistrerBiomarqueurs([b]);
    notificationAsync(NotificationFeedbackType.Success).catch(() => {});
    setValeur('');
    setValeur2('');
    setNom('');
    setMessage({ ok: true, texte: b.saisie ? traduire('Enregistré, converti en {0} {1}', nb(b.valeur, spec.digits), b.unite) : traduire('Enregistré') });
  };

  const lireSante = async () => {
    try {
      // lecture seule : aucune fenetre d'autorisation n'est ouverte, rien n'arrive si Apple Sante n'a pas deja dit oui
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const hc = (require('@/lib/healthConnect') as { healthConnect: Record<string, ((...a: unknown[]) => Promise<unknown>) | undefined> }).healthConnect;
      const [glycemie, tension, temperature] = await Promise.all([
        hc.getBloodGlucoseHistory?.(365).catch(() => []) ?? [],
        hc.getBloodPressure?.().catch(() => null) ?? null,
        hc.getBodyTemperatureHistory?.(365).catch(() => []) ?? [],
      ]);
      const l = depuisSante({ glycemie: glycemie as never, tension: tension as never, temperature: temperature as never });
      if (l.length) await enregistrerBiomarqueurs(l);
      setMessage({ ok: true, texte: l.length ? traduirePluriel(l.length, l.length > 1, '{0} valeur lue dans Apple Santé', '{0} valeurs lues dans Apple Santé', l.length) : traduire('Rien à lire : Apple Santé n’a pas ces mesures, ou ne les partage pas avec YOROI.') });
    } catch (e) {
      logger.warn('[Biomarqueurs] lecture Sante impossible', e);
    }
  };

  return (
    <EcranCorps titre={traduire('Biomarqueurs')} repli="/(tabs)/progres">
      <View style={{ padding: 12, borderRadius: 14, backgroundColor: c.fillSubtle }}>
        <Ink size={13.5} weight="bold" style={{ lineHeight: 19 }}>{traduire('Parle de tes résultats avec un professionnel de santé.')}</Ink>
        <Aide>{traduire('YOROI garde tes valeurs et leurs courbes, sans les interpréter. Elles restent sur ton téléphone.')}</Aide>
      </View>

      <Carte>
        <TitreCarte sticker="noter" titre={traduire('Noter une valeur')} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {SAISIE.map((t) => (
            <Puce key={t} label={traduire(TYPE_BIO[t].label)} sticker={STICKER_BIO[t]} on={type === t} onPress={() => changerType(t)} />
          ))}
        </View>
        <DateChips value={date} onChange={setDate} />
        {type === 'libre' ? <ChampNombre texte valeur={nom} onChange={setNom} placeholder={traduire('Ferritine, vitamine D...')} a11y={traduire('Nom de l’analyse')} largeur={220} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <ChampNombre valeur={valeur} onChange={(s) => { setValeur(s); setMessage(null); }} placeholder={type === 'tension' ? '120' : ''} a11y={type === 'tension' ? traduire('Tension systolique') : traduire('Valeur')} />
          {type === 'tension' ? <ChampNombre valeur={valeur2} onChange={(s) => { setValeur2(s); setMessage(null); }} placeholder="80" a11y={traduire('Tension diastolique')} /> : null}
          {type === 'libre' ? <ChampNombre texte valeur={unite} onChange={setUnite} placeholder={traduire('unité')} a11y={traduire('Unité')} largeur={90} /> : null}
        </View>
        {spec.unites.length > 1 ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {spec.unites.map((u) => (
              <Puce key={u} label={u} on={unite === u} onPress={() => setUnite(u)} />
            ))}
          </View>
        ) : null}
        {message ? <Ink size={13} weight="bold" color={message.ok ? c.successText : c.danger}>{message.texte}</Ink> : null}
        <Pressable onPress={enregistrer} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.fillSoft : c.ink })}>
          <Ink size={15} weight="extraBold" color={c.background}>{traduire('Enregistrer')}</Ink>
        </Pressable>
      </Carte>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        <Lien label={traduire('Lire Apple Santé')} onPress={lireSante} />
        {aReprendre.length ? (
          <Lien
            label={traduirePluriel(aReprendre.length, aReprendre.length > 1, 'Reprendre {0} valeur importée', 'Reprendre {0} valeurs importées', aReprendre.length)}
            onPress={() => {
              enregistrerBiomarqueurs(aReprendre).catch(() => {});
            }}
          />
        ) : null}
      </View>

      {series.map((s) => {
        const d = s.points[s.points.length - 1];
        const sp = TYPE_BIO[s.type];
        const texte = (b: typeof d) => (s.type === 'tension' ? `${nb(b.valeur, 0)} / ${nb(b.valeur2 ?? 0, 0)}` : s.type === 'libre' ? num(b.valeur, 2) : nb(b.valeur, sp.digits));
        return (
          <Carte key={s.cle}>
            <TitreCarte sticker={STICKER_BIO[s.type]} titre={s.nom ?? traduire(sp.label)} sous={traduirePluriel(s.points.length, s.points.length > 1, '{0} valeur, la dernière le {1}', '{0} valeurs, la dernière le {1}', s.points.length, dayShort(d.date))} />
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Ink size={28} weight="black" tight>{texte(d)}</Ink>
              <Ink size={14} weight="bold" color={c.textSecondary}>{s.unite}</Ink>
            </View>
            <MiniCourbe points={s.points.map((b) => ({ date: b.date, value: b.valeur }))} label={s.nom ?? traduire(sp.label)} digits={sp.digits} />
            {s.type === 'tension' ? <MiniCourbe points={s.points.map((b) => ({ date: b.date, value: b.valeur2 ?? 0 }))} label={traduire('Tension diastolique')} digits={0} /> : null}
          </Carte>
        );
      })}
      <Aide>{traduire('Conversions : glycémie mg/dL ÷ 18,016 ; cétones mg/dL ÷ 10,41 ; lactate mg/dL ÷ 9,008 ; température (°F − 32) × 5 ÷ 9 ; tension kPa × 7,5.')}</Aide>
    </EcranCorps>
  );
}
