/**
 * Professionnels de sante (refonte v2) : kines, nutritionnistes, osteopathes et medecins du sport
 * recommandes. Onglets, cartes avec photo, fiche detaillee dans une feuille du bas,
 * liens Instagram, site et itineraire.
 */
import React, { useState } from 'react';
import { Ornement } from '@/components/yoroi/v2/ornements/Ornement';
import { Image, Platform, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Card, Enter, Press } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen } from '@/components/yoroi/v2/ornements/screens';
import { Badge, BottomSheet, H2, IconDot, LinkCard, NIcon, P, Segments } from '@/components/yoroi/v2/nutrition/ui';
import { safeOpenURL } from '@/lib/security/validators';
import { COACHES, NUTRITIONISTS, OSTEOPATHS, SPORT_DOCTORS } from '@/data/partners';
import type { Coach, Nutritionist, Osteopath, SportDoctor } from '@/data/partners';
import { traduire } from '@/lib/i18n/tr';

type Pro = Coach | Nutritionist | Osteopath | SportDoctor;
type TabKey = 'kines' | 'nutritionists' | 'osteos' | 'sport-doctors';

const TABS: { key: TabKey; label: string; empty: string }[] = [
  { key: 'kines', label: traduire('Kinés'), empty: traduire('Aucun kiné pour le moment') },
  { key: 'nutritionists', label: traduire('Nutrition'), empty: traduire('Aucun nutritionniste pour le moment') },
  { key: 'osteos', label: traduire('Ostéos'), empty: traduire('Aucun ostéopathe pour le moment') },
  { key: 'sport-doctors', label: traduire('Médecins'), empty: traduire('Aucun médecin du sport pour le moment') },
];

export default function HealthProfessionalsScreen() {
  const [tab, setTab] = useState<TabKey>('kines');
  const [selected, setSelected] = useState<Pro | null>(null);

  const lists: Record<TabKey, Pro[]> = {
    kines: COACHES.filter((c) => c.type === 'kine'),
    nutritionists: NUTRITIONISTS,
    osteos: OSTEOPATHS,
    'sport-doctors': SPORT_DOCTORS,
  };
  const list = lists[tab];
  const current = TABS.find((t) => t.key === tab) ?? TABS[0];

  const openMaps = (address: string) => {
    const q = encodeURIComponent(address);
    const url = Platform.select({ ios: `maps://maps.apple.com/?q=${q}`, android: `geo:0,0?q=${q}` });
    if (url) safeOpenURL(url);
  };

  return (
    <>
      <DetailScreen title={traduire("Pros de santé")} subtitle={traduire("Des exemples de profils à chercher près de chez toi")}>
        <Segments items={TABS.map((t) => ({ key: t.key, label: t.label }))} value={tab} onChange={setTab} />

        {list.length > 0 ? (
          list.map((p, i) => (
            <Enter key={p.id} i={i}>
              <ProCard pro={p} onPress={() => setSelected(p)} />
            </Enter>
          ))
        ) : (
          <Enter i={0}>
            <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
              <Ornement name="koi" size={84} />
              <Ink size={18} weight="black" style={{ textAlign: 'center' }}>
                {current.empty}
              </Ink>
              <Ink size={14} weight="medium" color={P.ink2} style={{ textAlign: 'center' }}>
                {traduire("Les partenariats arrivent bientôt.")}</Ink>
            </Card>
          </Enter>
        )}

        <Enter i={list.length + 1}>
          <H2>{traduire("Tu es un pro de santé ?")}</H2>
          <View style={{ marginTop: 10 }}>
            <LinkCard icon="people" tone="red" title={traduire("Rejoindre la sélection")} sub={traduire("Un message sur Instagram suffit, je serai ravi de te mettre en avant.")} onPress={() => safeOpenURL('https://www.instagram.com/yoroiapp')} right={<NIcon name="link" size={18} color={P.muted} />} />
          </View>
        </Enter>

        <Ink size={12} weight="medium" color={P.ink2} style={{ paddingHorizontal: 4 }}>
          {traduire("Exemples génériques, sans lien avec de vrais professionnels.")}</Ink>
      </DetailScreen>

      <BottomSheet visible={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''} subtitle={traduire(selected?.title)}>
        {selected ? (
          <>
            {selected.imageUrl ? (
              <View style={{ height: 220, borderRadius: 24, overflow: 'hidden', backgroundColor: P.line2 }}>
                <Image source={selected.imageUrl} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
              </View>
            ) : null}
            {selected.featured ? <Badge label={traduire("Recommandé")} tone="red" /> : null}
            {selected.bio ? (
              <View style={{ gap: 6 }}>
                <Ink size={13} weight="extraBold" color={P.ink2}>
                  {traduire("À propos")}</Ink>
                <Ink size={15} weight="medium" style={{ lineHeight: 22 }}>
                  {selected.bio}
                </Ink>
              </View>
            ) : null}
            {selected.specialties?.length ? (
              <View style={{ gap: 8 }}>
                <Ink size={13} weight="extraBold" color={P.ink2}>
                  {traduire("Spécialités")}</Ink>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {selected.specialties.map((s) => (
                    <View key={s} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
                      <Ink size={13} weight="bold">
                        {s}
                      </Ink>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {selected.location ? <LinkCard icon="pin" tone="indigo" title={selected.location} sub={traduire("Ouvrir l’itinéraire")} onPress={() => openMaps(selected.location)} /> : null}
            {selected.instagram ? <LinkCard icon="link" tone="red" title={selected.instagram} sub={traduire("Voir sur Instagram")} onPress={() => safeOpenURL(`https://instagram.com/${selected.instagram!.replace('@', '')}`)} /> : null}
            {selected.website ? <BigButton label={traduire("Voir le site")} icon="share" onPress={() => safeOpenURL(selected.website!)} /> : null}
          </>
        ) : null}
      </BottomSheet>
    </>
  );
}

function ProCard({ pro, onPress }: { pro: Pro; onPress: () => void }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={[pro.name, pro.title, pro.location].filter(Boolean).join(', ')}>
      <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 12 }}>
        <View style={{ width: 84, height: 96, borderRadius: 20, overflow: 'hidden', backgroundColor: P.paper, alignItems: 'center', justifyContent: 'center' }}>
          {pro.imageUrl ? <Image source={pro.imageUrl} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors /> : <IconDot name="user" tone="ink" size={48} />}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Ink size={16} weight="black" style={{ flexShrink: 1 }}>
              {traduire(pro.name)}
            </Ink>
            {pro.featured ? <Badge label={traduire("Recommandé")} tone="red" /> : null}
          </View>
          <Ink size={13} weight="bold" color={P.ink2} numberOfLines={3}>
            {pro.title.replace(/\s&\s/g, ' et ')}
          </Ink>
          {pro.location ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <NIcon name="pin" size={13} color={P.muted} />
              <Ink size={12} weight="bold" color={P.ink2} numberOfLines={1} style={{ flex: 1 }}>
                {pro.location}
              </Ink>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
            {pro.specialties.slice(0, 3).map((s) => (
              <View key={s} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: P.paper }}>
                <Ink size={11} weight="bold" color={P.ink2}>
                  {s}
                </Ink>
              </View>
            ))}
          </View>
        </View>
        <NIcon name="chevron" size={18} color={P.muted} />
      </Card>
    </Press>
  );
}
