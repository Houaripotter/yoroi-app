/**
 * Page de bilan (16 octobre 2026) : une seule fenetre plein ecran apres une mesure ou une seance.
 * Parametres : type=corps&date=AAAA-MM-JJ&origine=pesee|composition|mensurations|photo|montre|detail,
 * ou type=seance&id=ID (&recues=N quand plusieurs seances arrivent d'un coup de la montre).
 * Ouverte apres la pesee, la composition (manuelle, balance, photo), les mensurations, une seance de la montre,
 * et depuis le detail d'une pesee ou d'une seance. ?demo=1 : donnees de demonstration (copie web),
 * avec &type=corps|seance, &origine=mensurations et &variante=bruit.
 * 16 octobre soir : « Terminé » programme la feuille « Tu aimes YOROI ? » 5 s plus tard (lib/v2/bilan/avis.ts),
 * jamais en demo. Copie web seulement : ?demo=1&avis=1 montre la feuille pour la relecture.
 */
import React, { useEffect, useState } from 'react';
import { BackHandler, Platform, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Hanko } from '@/components/yoroi/v2/seance/Hanko';
import { StampButton } from '@/components/yoroi/v2/progres/ui';
import { BilanCorpsVue, BilanSeanceVue } from '@/components/yoroi/v2/bilan/BilanVue';
import { chargerBilanCorps, chargerBilanSeance, lienCarteBilan } from '@/lib/v2/bilan/charger';
import { demoBilanCorps, demoBilanSeance } from '@/lib/v2/bilan/demo';
import type { BilanCorps, BilanSeance, OrigineCorps } from '@/lib/v2/bilan/texte';
import { todayISO } from '@/lib/v2/weightStats';
import { proposerNotificationsApresReussite } from '@/lib/v2/notifications/permission';
import { logger } from '@/lib/security/logger';
import { programmerAvis } from '@/lib/v2/bilan/avis';
import { AvisFeuille } from '@/components/yoroi/v2/bilan/AvisFeuille';
import { traduire } from '@/lib/i18n/tr';

const ORIGINES: OrigineCorps[] = ['pesee', 'composition', 'mensurations', 'photo', 'montre', 'detail'];
const EN_TETE: Record<OrigineCorps, string> = {
  pesee: traduire('Pesée enregistrée'),
  composition: traduire('Composition enregistrée'),
  mensurations: traduire('Mensurations enregistrées'),
  photo: traduire('Balance lue et enregistrée'),
  montre: traduire('Reçu de ta montre'),
  detail: traduire('Ton bilan'),
};

export default function BilanPage() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const p = useLocalSearchParams<{ type?: string; date?: string; origine?: string; id?: string; recues?: string; demo?: string; variante?: string; avis?: string }>();
  const [apercuAvis, setApercuAvis] = useState(Platform.OS === 'web' && p.demo === '1' && p.avis === '1');
  const origine = (ORIGINES.includes(p.origine as OrigineCorps) ? p.origine : 'detail') as OrigineCorps;
  const seance = p.type === 'seance';
  const [corps, setCorps] = useState<BilanCorps | null>(null);
  const [bs, setBs] = useState<BilanSeance | null>(null);
  const [fini, setFini] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (p.demo === '1') {
          if (seance) setBs(demoBilanSeance());
          else setCorps(demoBilanCorps(origine === 'mensurations' ? 'mensurations' : origine === 'composition' ? 'composition' : 'pesee', p.variante));
        } else if (seance && p.id) {
          const b = await chargerBilanSeance(Number(p.id), { recues: p.recues ? Number(p.recues) : undefined });
          if (alive) setBs(b);
        } else {
          const b = await chargerBilanCorps(p.date ?? todayISO(), origine);
          if (alive) setCorps(b);
        }
      } catch (e) {
        logger.warn('[bilan] chargement', e);
      } finally {
        if (alive) setFini(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [p.demo, p.id, p.date, p.recues, p.variante, seance, origine]);

  const terminer = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as never);
    // rappels proposes apres une reussite, une fois revenu (comme l'ancienne fin de pesee)
    if (p.demo !== '1' && (origine === 'pesee' || origine === 'composition')) setTimeout(() => void proposerNotificationsApresReussite('pesee'), 600);
    // la feuille de note, 5 s apres, si la regle le permet (jamais en demo)
    if (p.demo !== '1') programmerAvis();
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      terminer();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const partager = () => {
    if (p.demo === '1') {
      router.push(`/carte?demo=1&moment=exploit&type=${seance ? 'bilan_seance' : 'bilan_corps'}` as never);
      return;
    }
    const ref = seance ? `seance:${p.id}` : `corps:${(p.date ?? todayISO()).slice(0, 10)}`;
    router.push(lienCarteBilan(ref) as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true, animation: 'fade' }} />
      {corps ? (
        <BilanCorpsVue b={corps} onDone={terminer} onShare={partager} enTete={EN_TETE[origine]} />
      ) : bs ? (
        <BilanSeanceVue
          b={bs}
          onDone={terminer}
          onShare={partager}
          records={bs.records.map((r) => (
            <View key={r} style={{ borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Hanko size={30} rotate={-6} color={c.record} animate />
              <Ink size={15} weight="extraBold" style={{ flex: 1 }}>{r.charAt(0).toUpperCase() + r.slice(1)}</Ink>
            </View>
          ))}
        />
      ) : fini ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 }}>
          <Ink size={22} weight="black" style={{ textAlign: 'center' }}>{traduire("Rien à résumer pour l’instant")}</Ink>
          <Ink size={15} color={c.textSecondary} style={{ textAlign: 'center' }}>{traduire("Cette mesure ou cette séance n’existe plus.")}</Ink>
          <View style={{ alignSelf: 'stretch', marginTop: 10 }}>
            <StampButton label={traduire("Retour")} onPress={terminer} />
          </View>
        </View>
      ) : null}
      {apercuAvis ? <AvisFeuille visible onNoter={() => setApercuAvis(false)} onPlusTard={() => setApercuAvis(false)} /> : null}
    </View>
  );
}
