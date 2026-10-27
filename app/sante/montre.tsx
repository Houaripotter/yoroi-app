/**
 * Ta montre et YOROI (9 octobre 2026).
 * Sans paramètre : toutes les marques, ce qui marche sur ton téléphone.
 * Avec ?marque=garmin : fiche « Ce que ta montre envoie à YOROI », ce qu'elle garde pour elle,
 * et le guide pas à pas pour activer le partage vers Santé ou Health Connect.
 * Contenu tiré des pages d'aide officielles (lib/v2/sante/watches.ts).
 */
import React, { useState } from 'react';
import { FamilyBadge } from '@/components/yoroi/v2/sante/familyIcon';
import { DeviceEventEmitter, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Press, tap } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { IconDot, METRIC_ICON, SanteIcon } from '@/components/yoroi/v2/sante/SanteIcon';
import { Accordion, BrandMark, GlassBox, Notice, PeriodSegments, S, SmallButton, Steps } from '@/components/yoroi/v2/sante/ui';
import { WATCH, WATCHES, pathFor } from '@/lib/v2/sante/watches';
import type { Watch } from '@/lib/v2/sante/watches';
import { FAMILY, FAMILY_ORDER, METRIC, METRICS, availableOn } from '@/lib/v2/sante/metrics';
import type { MetricKey } from '@/lib/v2/sante/metrics';
import { askExtendedAccess, isRunningInExpoGo, syncNow } from '@/lib/v2/sante/data';
import { nombreAvance, texteResume } from '@/lib/v2/sante/typesSante';
import { safeOpenURL } from '@/lib/security/validators';
import { healthConnect } from '@/lib/healthConnect';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { P } from '@/components/yoroi/livePalette';
import { logger } from '@/lib/security/logger';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const ANDROID = Platform.OS === 'android';

function MetricChip({ k, onPress, dim }: { k: MetricKey; onPress?: () => void; dim?: boolean }) {
  const m = METRIC[k];
  if (!m) return null;
  const fam = FAMILY[m.family];
  const body = (
    <View style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: 11, borderRadius: 20, backgroundColor: dim ? '#F5F6FB' : P.white, borderWidth: 1, borderColor: dim ? S.line2 : fam.tint, opacity: dim ? 0.75 : 1 }}>
      <IconDot name={METRIC_ICON[k] ?? 'pulse'} color={dim ? S.muted : fam.color} tint={dim ? '#E4E7F1' : fam.tint} size={30} />
      <Ink size={12} weight="extraBold" color={dim ? S.ink2 : S.ink}>
        {traduire(m.label)}
      </Ink>
    </View>
  );
  if (!onPress) return body;
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={traduire(m.label)}>
      {body}
    </Press>
  );
}

function TextChip({ text, tone = 'ink' }: { text: string; tone?: 'ink' | 'red' }) {
  return (
    <View style={{ minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 17, backgroundColor: tone === 'red' ? S.accentSoft : S.line2 }}>
      <Ink size={12} weight="extraBold" color={tone === 'red' ? S.accent : S.ink2}>
        {text}
      </Ink>
    </View>
  );
}

function BrandList({ onOpen }: { onOpen: (k: string) => void }) {
  return (
    <View style={{ gap: 10 }}>
      {WATCHES.map((w) => {
        const p = pathFor(w, ANDROID);
        const count = p.keys.length;
        const sub = !p.ok ? (ANDROID ? traduire('Pas de partage avec Health Connect') : traduire('Pas de partage avec l’app Santé de ton téléphone')) : p.list === 'unknown' ? traduire(`Partage possible, liste non publiée`) : traduirePluriel(count, count > 1, "{0} mesure pour YOROI", "{0} mesures pour YOROI", count);
        return (
          <Press key={w.key} onPress={() => onOpen(w.key)} accessibilityRole="button" accessibilityLabel={`${w.name}, ${sub}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, borderRadius: 22, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, paddingHorizontal: 14, paddingVertical: 10, opacity: p.ok ? 1 : 0.7 }}>
              <BrandMark text={w.mark} kind={w.kind} size={42} />
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="black">
                  {traduire(w.name)}
                </Ink>
                <Ink size={12} weight="bold" color={p.ok ? S.ink2 : S.muted}>
                  {`${w.kind}, ${sub}`}
                </Ink>
              </View>
              <SanteIcon name="chevron" size={16} color={S.muted} />
            </View>
          </Press>
        );
      })}
    </View>
  );
}

function BrandSheet({ w }: { w: Watch }) {
  const router = useRouter();
  const [plat, setPlat] = useState<'ios' | 'android'>(ANDROID ? 'android' : 'ios');
  const [syncing, setSyncing] = useState(false);
  const p = plat === 'android' ? w.android : w.ios;
  const provider = plat === 'android' ? 'Health Connect' : 'Apple Santé';
  const mine = (plat === 'android') === ANDROID;

  const openSettings = () => {
    if (ANDROID) {
      const fn = (healthConnect as any).openHealthConnectSettings;
      if (typeof fn === 'function') Promise.resolve(fn.call(healthConnect)).catch(() => {});
      else safeOpenURL('market://details?id=com.google.android.apps.healthdata');
    } else {
      safeOpenURL('x-apple-health://');
    }
  };

  const done = async () => {
    setSyncing(true);
    tap('medium');
    try {
      await syncNow();
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      tap('success');
    } catch (e) {
      // audit 18 octobre : une synchro qui echoue ne bloque plus l'ecran (le retour se fait quand meme)
      logger.warn('[Montre] synchro', e);
    } finally {
      setSyncing(false);
    }
    router.back();
  };

  return (
    <>
      <GlassBox style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <BrandMark text={w.mark} kind={w.kind} size={58} />
          <View style={{ flex: 1 }}>
            <Ink size={24} weight="black" tight>
              {traduire(w.name)}
            </Ink>
            <Ink size={13} weight="bold" color={S.ink2}>
              {`${w.kind}, app ${p.app || w.ios.app || w.android.app}`}
            </Ink>
          </View>
        </View>
        <PeriodSegments
          items={[
            { key: 'ios' as const, label: traduire('iPhone') },
            { key: 'android' as const, label: traduire('Android') },
          ]}
          value={plat}
          onChange={(k) => setPlat(k)}
          accent={S.ink}
        />
        {!mine ? (
          <Ink size={12} weight="bold" color={S.muted}>
            {traduire("Tu regardes la version {0}, pas celle de ton téléphone.", plat === 'android' ? traduire('Android') : traduire('iPhone'))}
          </Ink>
        ) : null}
      </GlassBox>

      {!p.ok ? (
        <View style={{ borderRadius: 24, backgroundColor: S.dangerSoft, padding: 16, gap: 6 }}>
          <Ink size={17} weight="black" color={S.danger}>
            {traduire("Pas de partage avec {0}", provider)}
          </Ink>
          <Ink size={14} weight="medium" color={S.ink2}>
            {p.note ?? traduire('Cette marque ne partage pas ses données sur cette plateforme.')}
          </Ink>
        </View>
      ) : (
        <>
          <View style={{ borderRadius: 26, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: S.mossSoft, alignItems: 'center', justifyContent: 'center' }}>
                <SanteIcon name="check" size={18} color={S.mossText} width={2.6} />
              </View>
              <Ink size={18} weight="black" tight style={{ flex: 1 }}>
                {traduire("Ce que ta montre envoie à YOROI")}</Ink>
            </View>
            {p.keys.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {p.keys.map((k) => (
                  <MetricChip key={k} k={k} onPress={mine ? () => router.push(`/sante/${k}` as any) : undefined} />
                ))}
              </View>
            ) : (
              <Ink size={14} weight="medium" color={S.ink2}>
                {traduire("{0} ne publie pas la liste de ce qu’elle écrit dans {1}. YOROI affiche tout ce qui arrive : regarde ton tableau de bord après la synchro.", w.name.split(',')[0], provider)}
              </Ink>
            )}
            {p.extra && p.extra.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {p.extra.map((e) => (
                  <TextChip key={e} text={e} />
                ))}
              </View>
            ) : null}
            {p.list === 'partial' ? (
              <Ink size={12} weight="bold" color={S.muted}>
                {traduire("Liste incomplète publiée par la marque : d’autres mesures peuvent arriver.")}</Ink>
            ) : null}
          </View>

          {(p.missing && p.missing.length > 0) || w.keeps.length > 0 ? (
            <View style={{ borderRadius: 26, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, padding: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  <SanteIcon name="lock" size={17} color={S.accent} />
                </View>
                <Ink size={18} weight="black" tight style={{ flex: 1 }}>
                  {traduire("Ce qu’elle garde pour elle")}</Ink>
              </View>
              {p.missing && p.missing.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Ink size={13} weight="bold" color={S.ink2}>
                    {traduire("Mesuré par ta montre mais pas envoyé à {0} :", provider)}
                  </Ink>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {p.missing.map((k) => (
                      <MetricChip key={k} k={k} dim />
                    ))}
                  </View>
                </View>
              ) : null}
              {w.keeps.length > 0 ? (
                <View style={{ gap: 8 }}>
                  <Ink size={13} weight="bold" color={S.ink2}>
                    {traduire("Scores maison, visibles seulement dans son app :")}</Ink>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {w.keeps.map((k) => (
                      <TextChip key={k} text={k} tone="red" />
                    ))}
                  </View>
                  <Ink size={12} weight="bold" color={S.muted}>
                    {traduire("YOROI calcule son propre score de préparation avec les mesures brutes qu’il reçoit.")}</Ink>
                </View>
              ) : null}
            </View>
          ) : null}

          {p.note ? <Notice text={p.note} /> : null}

          <View style={{ borderRadius: 26, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, padding: 16, gap: 14 }}>
            <Ink size={18} weight="black" tight>
              {traduire("Activer le partage vers {0}", provider)}
            </Ink>
            <Steps steps={p.steps} color={S.accent} />
            {mine ? (
              <View style={{ gap: 10 }}>
                <SmallButton label={`Ouvrir ${provider}`} tone="light" icon="external" onPress={openSettings} />
                <SmallButton label={syncing ? 'Synchronisation' : traduire('C’est fait, synchroniser')} tone="red" icon="sync" busy={syncing} onPress={done} />
              </View>
            ) : null}
          </View>
        </>
      )}

      <Ink size={11} weight="bold" color={S.muted} style={{ paddingHorizontal: 6 }}>
        {traduire("Source : {0}. Vérifié le 9 octobre 2026. Les marques changent parfois ce qu’elles partagent.", w.from)}
      </Ink>
    </>
  );
}

/**
 * Tout ce que YOROI lit sur ce téléphone, rangé par famille (10 octobre 2026).
 * Chaque mesure ouvre sa page ; un bouton repropose l'autorisation des rubriques ajoutées.
 */
function ReadsCard() {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [done, setDone] = useState(false);
  const provider = ANDROID ? 'Health Connect' : 'Apple Santé';
  const mine = METRICS.filter((m) => availableOn(m, ANDROID));
  const groups = FAMILY_ORDER.map((f) => ({ f, list: mine.filter((m) => m.family === f) })).filter((g) => g.list.length > 0);
  const events = mine.filter((m) => m.event).length;

  const ask = async () => {
    if (asking) return;
    setAsking(true);
    tap('medium');
    try {
      await askExtendedAccess();
      await syncNow();
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      tap('success');
      setDone(true);
    } catch (e) {
      logger.warn('[Montre] autorisation des mesures avancees', e);
    } finally {
      setAsking(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <GlassBox style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: S.indigoSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ink size={26} weight="black" tight color={S.indigo}>
              {String(mine.length)}
            </Ink>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={20} weight="black" tight>
              {traduire("Ce que YOROI lit")}</Ink>
            <Ink size={13} weight="medium" color={S.ink2}>
              {ANDROID ? traduire("{0} mesures dans {1}, dont {2} alertes et événements datés, plus tes séances.", mine.length, provider, events) : traduire("{0} mesures dans {1}, dont {2} alertes et événements datés, plus tes séances et leurs tracés GPS.", mine.length, provider, events)}
            </Ink>
          </View>
        </View>
        <Ink size={13} weight="medium" color={S.ink2}>
          {traduire("Une mesure n’apparaît dans Ta santé que si un appareil l’envoie. Touche une famille pour voir le détail.")}</Ink>
        {/* 14 octobre 2026 (SANTÉ CONNEXION) : le compte exact de la fenêtre du système */}
        <Ink size={13} weight="medium" color={S.ink2}>
          {traduire("À la connexion, {0} demande {1}. Les {2} mesures avancées (marche, alertes du cœur, sons, autres sports, nutriments) ne sont demandées que si tu touches le bouton.", provider, texteResume(ANDROID ? 'android' : 'ios'), nombreAvance(ANDROID ? 'android' : 'ios'))}
        </Ink>
        {!isRunningInExpoGo ? (
          <SmallButton
            label={done ? traduire('C’est à jour') : asking ? 'Autorisation' : traduire('Autoriser les mesures avancées')}
            tone={done ? 'light' : 'red'}
            icon={done ? 'check' : 'shield'}
            busy={asking}
            disabled={done}
            onPress={ask}
          />
        ) : null}
        <Ink size={12} weight="bold" color={S.muted}>
          {ANDROID
            ? traduire('Sur la fenêtre de Health Connect, touche Tout autoriser. Tu peux changer d’avis à tout moment dans Health Connect.')
            : traduire('Sur la fenêtre d’Apple, touche Tout activer. Apple ne montre que les mesures jamais proposées. Tu peux changer d’avis dans Réglages, Santé, Accès aux données.')}
        </Ink>
      </GlassBox>

      {groups.map(({ f, list }) => {
        const fam = FAMILY[f];
        return (
          <Accordion
            key={f}
            title={traduire(fam.label)}
            sub={list.slice(0, 3).map((m) => m.label).join(', ') + (list.length > 3 ? traduire(' et plus') : '')}
            badge={String(list.length)}
            color={fam.color}
            mark={
              <FamilyBadge family={f} box={40} radius={14} iconSize={21} tint={fam.tint} color={fam.color} />
            }
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {list.map((m) => (
                <MetricChip key={m.key} k={m.key} onPress={() => router.push(`/sante/${m.key}` as any)} />
              ))}
            </View>
          </Accordion>
        );
      })}

      <Notice text={traduire("YOROI ne lit pas ta santé reproductive ni ton activité sexuelle : ça ne sert pas à ton entraînement.")} />
    </View>
  );
}

export default function MontreScreen() {
  const router = useRouter();
  const { marque } = useLocalSearchParams<{ marque?: string }>();
  const w = marque ? WATCH[String(marque)] : null;
  if (w) {
    return (
      <DetailScreen title={w.name.split(',')[0]} subtitle={traduire("Ta montre et YOROI")}>
        <BrandSheet w={w} />
      </DetailScreen>
    );
  }
  return (
    <DetailScreen title={traduire("Ta montre et YOROI")} subtitle={ANDROID ? 'Via Health Connect' : traduire('Via l’app Santé de ton téléphone')}>
      <GlassBox style={{ gap: 8 }}>
        <Ink size={18} weight="black" tight>
          {traduire("Comment ça marche")}</Ink>
        <Ink size={14} weight="medium" color={S.ink2}>
          {ANDROID
            ? traduire('Ta montre écrit ses mesures dans Health Connect, le coffre santé d’Android. YOROI les lit là, sans serveur : tout reste sur ton téléphone.')
            : traduire('Ta montre écrit ses mesures dans l’app Santé de ton téléphone, son coffre santé. YOROI les lit là, sans serveur : tout reste sur ton téléphone.')}
        </Ink>
        <Ink size={14} weight="medium" color={S.ink2}>
          {traduire("Choisis ta marque pour voir ce qu’elle envoie et comment l’activer.")}</Ink>
      </GlassBox>
      <BrandList onOpen={(k) => router.push(`/sante/montre?marque=${k}` as any)} />
      <Ink size={11} weight="bold" color={S.muted} style={{ paddingHorizontal: 6 }}>
        {traduire("Pages d’aide officielles des marques, vérifiées le 9 octobre 2026.")}</Ink>
      <ReadsCard />
    </DetailScreen>
  );
}
