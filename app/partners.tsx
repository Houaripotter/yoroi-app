/**
 * Selection YOROI v2 : coachs et clubs recommandes. Cartes illustrees,
 * fiche detaillee avec photo en grand, contacts, specialites et adresse.
 */
import React, { useState } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Image, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ink } from '@/components/yoroi/v2/Ink';
import { safeOpenURL } from '@/lib/security/validators';
import { CLUBS, COACHES } from '@/data/partners';
import type { Club, Coach } from '@/data/partners';
import { BigButton, Card, CIcon, DetailScreen, Enter, Glass, Hanko, IconBtn, P, Press, Section } from '@/components/yoroi/v2/combat/ui';
import type { CIconName } from '@/components/yoroi/v2/combat/ui';
import { blancA } from '@/components/yoroi/livePalette';

type Item = Coach | Club;
const isCoach = (x: Item): x is Coach => 'specialties' in x;

const openInstagram = (h: string) => safeOpenURL(`https://instagram.com/${h.replace('@', '')}`);
const openYoutube = (c: string) => safeOpenURL(`https://youtube.com/@${c}`);
const openPhone = (n: string) => safeOpenURL(`tel:${n.replace(/\s/g, '').replace(/\./g, '')}`);
const openEmail = (e?: string) => (e ? safeOpenURL(`mailto:${e}?subject=${encodeURIComponent('Contact via YOROI')}`) : safeOpenURL('https://www.instagram.com/yoroiapp'));
const openFacebook = (h: string) => safeOpenURL(`https://facebook.com/${h.replace('@', '').replace('/', '')}`);
const openMap = (address: string) => {
  const q = encodeURIComponent(address);
  const url = Platform.select({ ios: `maps://maps.apple.com/?q=${q}`, android: `geo:0,0?q=${q}` });
  if (url) safeOpenURL(url);
};


function ItemCard({ item, onPress }: { item: Item; onPress: () => void }) {
  const sub = isCoach(item) ? `${item.title}, ${item.location}` : `${item.type}, ${item.location}`;
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={`Voir ${item.name}`}>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={{ height: 170, backgroundColor: P.ink }}>
          {item.imageUrl ? (
            <Image source={item.imageUrl} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: P.lacquer }}>
              <Glyph kind={isCoach(item) ? 'sakura' : 'eventail'} size={80} color="rgba(255,255,255,0.35)" />
            </View>
          )}
          <LinearGradient colors={['transparent', 'rgba(29,32,41,0.75)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 100 }} />
          {item.featured ? (
            <View style={{ position: 'absolute', right: 14, top: 14, backgroundColor: blancA(0.92), borderRadius: 14, padding: 4 }}>
              <Hanko size={38} />
            </View>
          ) : null}
          <View style={{ position: 'absolute', left: 22, right: 22, bottom: 12 }}>
            <Ink size={20} weight="black" tight color={P.white} numberOfLines={2}>
              {item.name}
            </Ink>
            <Ink size={13} weight="bold" color="rgba(255,255,255,0.88)" numberOfLines={2}>
              {sub}
            </Ink>
          </View>
        </View>
        <View style={{ padding: 14, gap: 10 }}>
          {isCoach(item) ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {item.specialties.slice(0, 3).map((s) => (
                <View key={s} style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: P.paper }}>
                  <Ink size={12} weight="bold" color={P.ink2}>
                    {s}
                  </Ink>
                </View>
              ))}
            </View>
          ) : item.trainers && item.trainers.length > 0 ? (
            <Ink size={13} color={P.ink2} numberOfLines={2}>
              {`Avec ${item.trainers.join(', ')}`}
            </Ink>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Ink size={13} weight="bold" color={P.muted}>
              {item.instagram ? (Array.isArray(item.instagram) ? `${item.instagram.length} comptes Instagram` : item.instagram) : item.featured ? 'Coup de cœur' : 'Voir la fiche'}
            </Ink>
            <CIcon name="chevron" size={16} color={P.muted} />
          </View>
        </View>
      </Card>
    </Press>
  );
}

function ContactTile({ icon, label, onPress, tone = P.ink }: { icon: CIconName; label: string; onPress: () => void; tone?: string }) {
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ width: '48%' }}>
      <View style={{ height: 56, borderRadius: 18, backgroundColor: tone, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <CIcon name={icon} size={18} color={P.white} />
        <Ink size={15} weight="extraBold" color={P.white} numberOfLines={1}>
          {label}
        </Ink>
      </View>
    </Press>
  );
}

export default function PartnersScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'coaches' | 'clubs'>('coaches');
  const [selected, setSelected] = useState<Item | null>(null);
  const [zoom, setZoom] = useState(false);
  const coaches = COACHES.filter((c) => c.type === 'coach');
  const list: Item[] = tab === 'coaches' ? coaches : CLUBS;

  return (
    <DetailScreen title="Sélection YOROI" subtitle="Des coachs et des clubs que je recommande">
      <View style={{ flexDirection: 'row', backgroundColor: '#E6E4DD', borderRadius: 18, padding: 4 }}>
        {([
          { k: 'coaches', l: 'Coachs', n: coaches.length },
          { k: 'clubs', l: 'Clubs', n: CLUBS.length },
        ] as const).map((t) => {
          const on = tab === t.k;
          return (
            <Press key={t.k} onPress={() => setTab(t.k)} style={{ flex: 1 }} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${t.l}, ${t.n}`}>
              <View style={{ height: 44, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? P.white : 'transparent' }}>
                <Ink size={15} weight={on ? 'black' : 'bold'} color={on ? P.ink : P.ink2}>
                  {t.l}
                </Ink>
                <View style={{ minWidth: 24, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? P.ink : 'rgba(29,32,41,0.1)' }}>
                  <Ink size={12} weight="extraBold" color={on ? P.white : P.ink2}>{String(t.n)}</Ink>
                </View>
              </View>
            </Press>
          );
        })}
      </View>

      {list.map((it, i) => (
        <Enter key={it.id} i={Math.min(i, 8)}>
          <ItemCard item={it} onPress={() => setSelected(it)} />
        </Enter>
      ))}

      <Glass style={{ gap: 10 }}>
        <Ink size={20} weight="black" tight>
          Tu veux être dans la sélection ?
        </Ink>
        <Ink size={14} color={P.ink2}>
          Écris-moi sur Instagram, je serai ravi de te mettre en avant.
        </Ink>
        <BigButton label="Nous contacter" icon="share" onPress={() => openEmail()} />
      </Glass>
      <Ink size={12} color={P.muted} style={{ textAlign: 'center', paddingHorizontal: 12 }}>
        Sélection personnelle et subjective. Ces professionnels ne sont pas liés par contrat à Yoroi.
      </Ink>

      <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setSelected(null); setZoom(false); }}>
        {selected ? (
          <View style={{ flex: 1, backgroundColor: P.paper }}>
            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
              <Pressable onPress={() => selected.imageUrl && setZoom(true)} accessibilityRole="button" accessibilityLabel="Agrandir la photo" style={{ height: 340, backgroundColor: P.lacquer }}>
                {selected.imageUrl ? (
                  <Image source={selected.imageUrl} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Glyph kind={isCoach(selected) ? 'sakura' : 'eventail'} size={120} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
                <LinearGradient colors={['transparent', 'rgba(242,241,236,1)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 }} />
              </Pressable>
              <View style={{ position: 'absolute', top: 16, right: 16 }}>
                <IconBtn icon="close" label="Fermer" onPress={() => { setSelected(null); setZoom(false); }} />
              </View>
              <View style={{ paddingHorizontal: 22, marginTop: -40, gap: 14 }}>
                <View style={{ gap: 4 }}>
                  <Ink size={32} weight="black" tight>
                    {selected.name}
                  </Ink>
                  <Ink size={15} weight="bold" color={P.ink2}>
                    {isCoach(selected) ? selected.title : selected.type}
                  </Ink>
                </View>
                {selected.bio ? (
                  <Card>
                    <Ink size={15} style={{ lineHeight: 22 }}>
                      {selected.bio}
                    </Ink>
                  </Card>
                ) : null}
                <Section title="Contact" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
                  {selected.phone ? <ContactTile icon="phone" label="Appeler" tone={P.mossText} onPress={() => openPhone(selected.phone!)} /> : null}
                  {selected.instagram && !Array.isArray(selected.instagram) ? <ContactTile icon="share" label="Instagram" tone={P.accent} onPress={() => openInstagram(selected.instagram as string)} /> : null}
                  {selected.website ? <ContactTile icon="globe" label="Site web" tone={P.indigo} onPress={() => safeOpenURL(selected.website!)} /> : null}
                  {selected.email ? <ContactTile icon="mail" label="E-mail" tone={P.goldDark} onPress={() => openEmail(selected.email)} /> : null}
                  {selected.facebook ? <ContactTile icon="users" label="Facebook" tone={P.water} onPress={() => openFacebook(selected.facebook!)} /> : null}
                  {isCoach(selected) && selected.youtube ? <ContactTile icon="play" label="YouTube" tone={P.accentDark} onPress={() => openYoutube(selected.youtube!)} /> : null}
                </View>
                {Array.isArray(selected.instagram) ? (
                  <View style={{ gap: 8 }}>
                    <Ink size={13} weight="bold" color={P.ink2}>
                      Comptes Instagram
                    </Ink>
                    {selected.instagram.map((h) => (
                      <BigButton key={h} label={h} tone="light" icon="share" onPress={() => openInstagram(h)} />
                    ))}
                  </View>
                ) : null}
                {isCoach(selected) && selected.specialties.length > 0 ? (
                  <>
                    <Section title="Spécialités" />
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {selected.specialties.map((s) => (
                        <View key={s} style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, justifyContent: 'center', backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
                          <Ink size={14} weight="bold">
                            {s}
                          </Ink>
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}
                {!isCoach(selected) && selected.trainers && selected.trainers.length > 0 ? (
                  <>
                    <Section title="Entraîneurs" />
                    <Card style={{ gap: 8 }}>
                      {selected.trainers.map((t) => (
                        <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: P.accent }} />
                          <Ink size={15} weight="bold">
                            {t}
                          </Ink>
                        </View>
                      ))}
                    </Card>
                  </>
                ) : null}
                {selected.location ? (
                  <Press onPress={() => openMap(selected.location)} accessibilityRole="button" accessibilityLabel={`Ouvrir l'adresse ${selected.location} dans Plans`}>
                    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <CIcon name="pin" size={22} color={P.accent} />
                      <Ink size={15} weight="bold" style={{ flex: 1 }}>
                        {selected.location}
                      </Ink>
                      <CIcon name="chevron" size={16} color={P.muted} />
                    </Card>
                  </Press>
                ) : null}
              </View>
            </ScrollView>
            <Modal visible={zoom} transparent animationType="fade" onRequestClose={() => setZoom(false)}>
              <Pressable onPress={() => setZoom(false)} accessibilityLabel="Fermer la photo" style={{ flex: 1, backgroundColor: 'rgba(29,32,41,0.94)', alignItems: 'center', justifyContent: 'center' }}>
                {selected.imageUrl ? <Image source={selected.imageUrl} style={{ width: '94%', height: '80%' }} resizeMode="contain" /> : null}
              </Pressable>
            </Modal>
          </View>
        ) : null}
      </Modal>
    </DetailScreen>
  );
}
