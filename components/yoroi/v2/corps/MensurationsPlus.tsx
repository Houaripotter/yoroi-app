/**
 * « Autres mensurations » de l'ecran Mensurations (1er novembre 2026, demande AT, point 3) : poignet, cheville,
 * genou (gauche et droite), fessiers, taille la plus etroite, biceps contracte (gauche et droite). Rangees a part
 * (lib/v2/mesures/mensurationsPlus.ts) : les 14 tours de la silhouette au-dessus ne changent pas.
 * Chaque case montre ta derniere mesure ; seules les cases remplies sont enregistrees, a la date choisie en haut.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Pressable, View } from 'react-native';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { casesPlus, creerMensuration, enregistrerMensurationsPlus, lireMensurationsPlus, serieZone, ZONE_PLUS, ZONES_PLUS } from '@/lib/v2/mesures/mensurationsPlus';
import type { MensurationPlus, ZonePlus } from '@/lib/v2/mesures/mensurationsPlus';
import type { Cote } from '@/lib/v2/mesures/sac';
import { EVENEMENT_CORPS } from '@/lib/v2/mesures/listeStockee';
import { dayShort } from '@/lib/v2/progres/format';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { Aide, Carte, ChampNombre, MiniCourbe, nb, TitreCarte } from './kit';
import type { NomSticker } from '@/components/yoroi/v2/stickers';

const STICKER_ZONE: Record<ZonePlus, NomSticker> = {
  poignet: 'grip',
  cheville: 'chaussure',
  genou: 'mobilite',
  fessiers: 'fessiers',
  taille_etroite: 'ventre',
  biceps_contracte: 'bras',
};

const cle = (z: ZonePlus, c: Cote | null) => `${z}_${c ?? 'x'}`;
const coteTexte = (c: Cote | null) => (c === 'droite' ? traduire('droite') : c === 'gauche' ? traduire('gauche') : '');

export function MensurationsPlus({ date }: { date: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [liste, setListe] = useState<MensurationPlus[]>([]);
  const [saisies, setSaisies] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<number | null>(null);

  useEffect(() => {
    let vivant = true;
    const lire = () => lireMensurationsPlus().then((l) => vivant && setListe(l)).catch(() => {});
    lire();
    const s = DeviceEventEmitter.addListener(EVENEMENT_CORPS, lire);
    return () => {
      vivant = false;
      s.remove();
    };
  }, []);

  const remplies = useMemo(() => casesPlus().filter((k) => (saisies[cle(k.zone, k.cote)] ?? '').trim()), [saisies]);

  const enregistrer = async () => {
    const nouvelles: MensurationPlus[] = [];
    for (const k of remplies) {
      const m = creerMensuration(date, k.zone, k.cote, saisies[cle(k.zone, k.cote)], 'saisie');
      if (!m) {
        const z = ZONE_PLUS[k.zone];
        setErreur(traduire('{0} : entre {1} et {2} cm', `${traduire(z.label)} ${coteTexte(k.cote)}`.trim(), z.min, z.max));
        return;
      }
      nouvelles.push(m);
    }
    if (!nouvelles.length) return;
    const ok = await enregistrerMensurationsPlus(nouvelles);
    if (ok) {
      notificationAsync(NotificationFeedbackType.Success).catch(() => {});
      setFait(nouvelles.length);
      setSaisies({});
      setErreur(null);
    }
  };

  return (
    <Carte>
      <TitreCarte sticker="metre_ruban" titre={traduire('Autres mensurations')} sous={traduire('En centimètres, à la date choisie en haut. Remplis seulement ce que tu mesures.')} />
      {ZONES_PLUS.map((z) => {
        const cotes: (Cote | null)[] = z.cotes ? ['droite', 'gauche'] : [null];
        return (
          <View key={z.id} style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderColor: c.divider }}>
            <TitreCarte sticker={STICKER_ZONE[z.id]} titre={traduire(z.label)} sous={traduire(z.aide)} />
            {cotes.map((co) => {
              const serie = serieZone(liste, z.id, co);
              const der = serie[serie.length - 1];
              const k = cle(z.id, co);
              return (
                <View key={k} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Ink size={14} weight="bold">{co ? coteTexte(co).replace(/^./, (x) => x.toUpperCase()) : traduire('Tour')}</Ink>
                      <Ink size={12} color={c.textSecondary}>{der ? traduire('{0} cm le {1}', nb(der.value, 1), dayShort(der.date)) : traduire('pas encore mesuré')}</Ink>
                    </View>
                    <ChampNombre valeur={saisies[k] ?? ''} onChange={(s) => { setSaisies((o) => ({ ...o, [k]: s })); setErreur(null); setFait(null); }} placeholder={der ? nb(der.value, 1) : ''} unite="cm" a11y={`${traduire(z.label)} ${coteTexte(co)}, ${traduire('en centimètres')}`} />
                  </View>
                  <MiniCourbe points={serie} label={`${traduire(z.label)} ${coteTexte(co)}`} />
                </View>
              );
            })}
          </View>
        );
      })}
      {erreur ? <Ink size={13} weight="bold" color={c.danger}>{erreur}</Ink> : null}
      {fait ? <Ink size={13} weight="bold" color={c.successText}>{traduirePluriel(fait, fait > 1, '{0} mesure enregistrée', '{0} mesures enregistrées', fait)}</Ink> : null}
      <Pressable
        onPress={enregistrer}
        disabled={!remplies.length}
        accessibilityRole="button"
        accessibilityState={{ disabled: !remplies.length }}
        style={({ pressed }) => ({ minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: !remplies.length ? c.fillSubtle : pressed ? c.fillSoft : c.ink })}
      >
        <Ink size={15} weight="extraBold" color={remplies.length ? c.background : c.textSecondary}>
          {remplies.length ? traduirePluriel(remplies.length, remplies.length > 1, 'Enregistrer {0} mesure en plus', 'Enregistrer {0} mesures en plus', remplies.length) : traduire('Enregistrer ces mesures')}
        </Ink>
      </Pressable>
      <Aide>{traduire('Le tour de bras de la silhouette reste le bras relâché ; le biceps contracté se range ici.')}</Aide>
    </Carte>
  );
}
