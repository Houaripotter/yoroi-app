/**
 * Details d'une seance, partages par la muscu, le combat et le cardio :
 * quand (jour, heure, duree) pour une saisie apres coup, ou (club ou cadre), note de fin.
 *
 * 16 octobre 2026, logique du lieu :
 *  - avec un club, la seance est au club (son adresse si elle est connue) ; un seul interrupteur
 *    « Séance en extérieur » dit qu'elle a eu lieu dehors, et seulement alors on propose l'endroit ;
 *  - sans club, un choix simple : salle, extérieur, maison, puis l'endroit facultatif ;
 *  - « Utiliser ma position actuelle » est une action explicite qui dit ce qu'elle fait.
 * Le club habituel du sport est preselectionne pour une nouvelle seance (le dernier club utilise
 * pour ce sport, sinon le seul club de ce sport). Couleur du domaine seances (indigo).
 * 17 octobre : sans club habituel, la course, le trail et le velo partent sur « Dehors ».
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { fontStyle } from '@/components/yoroi/fonts';
import { Ink } from '@/components/yoroi/v2/Ink';
import { DayNav } from '@/components/yoroi/v2/DateChips';
import { teinte } from '@/components/yoroi/v2/accueil/domaines';
import { getClubs, openDatabase } from '@/lib/database';
import type { Club } from '@/lib/database';
import { getClubLogoSource, getSportName } from '@/lib/sports';
import { logger } from '@/lib/security/logger';
import { fmtMinutes, isoDay, longDay, pad2 } from '@/lib/v2/seance/format';
import type { SessionDetails } from '@/lib/v2/seance/model';
import { couleurNote, noteSeance } from '@/lib/v2/seance/note';
import { dehorsParDefaut } from '@/lib/v2/seance/edit';
import { sportImage, sportTint } from '@/lib/v2/seance/sportVisuals';
import { Icon } from './Icon';
import { Stepper } from './Stepper';
import { blancA, paletteSombre } from '@/components/yoroi/livePalette';
import { fondAjouter, PlusPastille } from '@/components/yoroi/v2/accueil/kit';
import { traduire, LOCALE } from '@/lib/i18n/tr';

const DURATIONS = [30, 45, 60, 90, 120];

function shiftDay(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return isoDay(d);
}

export function dayLabel(iso: string): string {
  const today = isoDay(new Date());
  if (iso === today) return traduire("Aujourd'hui");
  if (iso === shiftDay(today, -1)) return traduire('Hier');
  if (iso === shiftDay(today, 1)) return traduire('Demain');
  const s = longDay(iso);
  return s.charAt(0).toLocaleUpperCase(LOCALE) + s.slice(1);
}

type Place = { name: string; lat: number | null; lon: number | null };

let placesCache: Place[] | null = null;

async function recentPlaces(): Promise<Place[]> {
  if (placesCache) return placesCache;
  try {
    const db = await openDatabase();
    const rows = await db.getAllAsync<{ location_name: string; location_lat: number | null; location_lon: number | null }>(
      "SELECT location_name, location_lat, location_lon FROM trainings WHERE location_name IS NOT NULL AND location_name != '' ORDER BY date DESC LIMIT 40",
    );
    const seen = new Set<string>();
    const out: Place[] = [];
    for (const r of rows) {
      const k = r.location_name.trim().toLowerCase();
      // « Maison » a son propre bouton, et l'ancien libelle « Ma position » ne dit rien
      if (!k || seen.has(k) || k === 'maison' || k === 'ma position') continue;
      seen.add(k);
      out.push({ name: r.location_name.trim(), lat: r.location_lat, lon: r.location_lon });
    }
    placesCache = out.slice(0, 6);
    return placesCache;
  } catch {
    return [];
  }
}

/** Le club habituel d'un sport : le dernier utilise pour ce sport, sinon le seul club de ce sport */
async function usualClub(sport: string, clubs: Club[]): Promise<number | null> {
  if (!sport || clubs.length === 0) return null;
  const ids = new Set(clubs.map((c) => c.id));
  try {
    const db = await openDatabase();
    const row = await db.getFirstAsync<{ club_id: number | null; sport: string | null }>(
      'SELECT club_id, sport FROM trainings WHERE sport = ? AND club_id IS NOT NULL ORDER BY date DESC, id DESC LIMIT 1',
      [sport],
    );
    if (row?.club_id && row.sport === sport && ids.has(row.club_id)) return row.club_id;
  } catch {
    // pas d'historique lisible : on regarde les clubs
  }
  const same = clubs.filter((c) => (c.sport ?? '').split(',').map((s) => s.trim()).includes(sport));
  return same.length === 1 ? same[0].id ?? null : null;
}

type Props = {
  value: SessionDetails;
  onChange: (patch: Partial<SessionDetails>) => void;
  sport: string;
  /** jour, heure et duree (saisie apres coup ou modification) */
  showWhen?: boolean;
  /** la duree vient d'ailleurs (chrono, cardio) */
  hideDuration?: boolean;
};

export function SessionDetailsForm({ value, onChange, sport, showWhen = false, hideDuration = false }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const d = teinte('seances');
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getClubs()
      .then(async (l) => {
        const list = l ?? [];
        if (!alive) return;
        setClubs(list);
        // nouvelle seance : le club habituel du sport, une seule fois
        if (!value.clubFixe && value.clubId === null) {
          const id = await usualClub(sport, list);
          // 17 octobre : course, trail, velo sans club habituel, « Dehors » propose d'office
          const dehors = !id && !value.cadre && !value.outdoor && dehorsParDefaut(sport);
          if (alive) onChange(id ? { clubId: id, clubFixe: true } : dehors ? { clubFixe: true, cadre: 'exterieur', outdoor: true } : { clubFixe: true });
        }
      })
      .catch(() => setClubs([]));
    recentPlaces().then((p) => alive && setPlaces(p)).catch(() => setPlaces([]));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // les clubs du sport d'abord
  const sortedClubs = useMemo(
    () => [...clubs].sort((a, b) => Number((b.sport ?? '').includes(sport)) - Number((a.sport ?? '').includes(sport))),
    [clubs, sport],
  );
  const club = value.clubId !== null ? clubs.find((cl) => cl.id === value.clubId) ?? null : null;
  const note = noteSeance(sport);
  // sans club, le cadre ; une seance dehors deja notee compte comme « exterieur »
  const cadre = value.cadre ?? (value.outdoor ? 'exterieur' : null);

  const locate = async () => {
    setLocating(true);
    setLocError(null);
    try {
      const Location = await import('expo-location');
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setLocError(traduire('Accès à ta position refusé. Écris l’endroit à la main, ou autorise la position dans les réglages.'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let name = '';
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        const g = geo[0];
        if (g) name = [g.name && g.name !== g.street ? g.name : '', g.city ?? g.subregion ?? ''].filter(Boolean).join(', ');
      } catch {
        // pas de nom, on garde la position
      }
      onChange({ lat: pos.coords.latitude, lon: pos.coords.longitude, place: name || value.place || 'Position GPS' });
    } catch (err) {
      logger.warn('Position indisponible', err);
      setLocError(traduire('Position introuvable pour le moment. Écris l’endroit à la main.'));
    } finally {
      setLocating(false);
    }
  };

  const pickClub = (id: number | null) => {
    selectionAsync().catch(() => {});
    // au club et en salle : l'endroit tape pour une seance dehors ne vaut plus
    if (id !== null) onChange({ clubId: id, clubFixe: true, outdoor: false, place: '', lat: null, lon: null, cadre: null });
    else onChange({ clubId: null, clubFixe: true, outdoor: false, place: '', lat: null, lon: null, cadre: null });
  };

  const pickCadre = (k: 'salle' | 'exterieur' | 'maison') => {
    selectionAsync().catch(() => {});
    if (cadre === k) {
      onChange({ cadre: null, outdoor: false, place: '', lat: null, lon: null });
      return;
    }
    onChange({ cadre: k, outdoor: k === 'exterieur', place: '', lat: null, lon: null });
  };

  const setOutdoor = (on: boolean) => {
    selectionAsync().catch(() => {});
    onChange(on ? { outdoor: true } : { outdoor: false, place: '', lat: null, lon: null });
  };

  const chosen = (on: boolean) => ({
    backgroundColor: on ? d.fond : blancA(0.75),
    borderWidth: on ? 2 : 1,
    borderColor: on ? d.plein : c.border,
  });

  return (
    <View style={{ gap: 22 }}>
      {showWhen ? (
        <Section icon="calendar" title={traduire("Quand")}>
          <DayNav value={value.date} onChange={(iso) => onChange({ date: iso })} label={dayLabel(value.date)} maxDate={null} inline />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 14, borderRadius: 18, backgroundColor: blancA(0.75), borderWidth: 1, borderColor: c.border }}>
            <Ink size={15} weight="bold">{traduire("Début")}</Ink>
            <Stepper value={value.startMin} step={15} min={0} max={23 * 60 + 45} unit={traduire("minutes")} size={22} button={34} format={(v) => `${pad2(Math.floor(v / 60))}:${pad2(v % 60)}`} onChange={(v) => onChange({ startMin: v })} />
          </View>
          {!hideDuration ? (
            <>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {DURATIONS.map((m) => {
                  const on = m === value.duration;
                  return (
                    <Pressable key={m} onPress={() => { selectionAsync().catch(() => {}); onChange({ duration: m }); }} accessibilityRole="button" accessibilityLabel={traduire("Durée {0}", fmtMinutes(m))} accessibilityState={{ selected: on }} style={{ flex: 1, minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? d.plein : blancA(0.75), borderWidth: on ? 0 : 1, borderColor: c.border }}>
                      <Ink size={12} weight="extraBold" color={on ? d.surPlein : c.ink}>{fmtMinutes(m)}</Ink>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 14, borderRadius: 18, backgroundColor: blancA(0.75), borderWidth: 1, borderColor: c.border }}>
                <Ink size={15} weight="bold">{traduire("Durée")}</Ink>
                <Stepper value={value.duration} step={5} min={5} max={600} unit={traduire("minutes")} size={22} button={34} format={(v) => fmtMinutes(v)} onChange={(v) => onChange({ duration: v })} />
              </View>
            </>
          ) : null}
        </Section>
      ) : null}

      <Section icon="pin" title={traduire("Où")}>
        {clubs.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {sortedClubs.map((cl) => {
              const on = cl.id === value.clubId;
              return (
                <Pressable key={cl.id} onPress={() => pickClub(cl.id ?? null)} accessibilityRole="button" accessibilityLabel={`Club ${cl.name}`} accessibilityState={{ selected: on }} style={{ ...chosen(on), maxWidth: '100%', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 6, paddingRight: 12, paddingVertical: 6, borderRadius: 16 }}>
                  <ClubMark club={cl} size={30} />
                  <Ink size={14} weight="extraBold" color={on ? d.texte : c.ink} numberOfLines={2} style={{ flexShrink: 1 }}>{traduire(cl.name)}</Ink>
                </Pressable>
              );
            })}
            <Pressable onPress={() => pickClub(null)} accessibilityRole="button" accessibilityState={{ selected: value.clubId === null }} style={{ ...chosen(value.clubId === null), minHeight: 48, paddingHorizontal: 14, borderRadius: 16, justifyContent: 'center' }}>
              <Ink size={14} weight="extraBold" color={value.clubId === null ? d.texte : c.ink}>{traduire("Sans club")}</Ink>
            </Pressable>
            <Pressable onPress={() => router.push('/add-club' as any)} accessibilityRole="button" accessibilityLabel={traduire("Ajouter un club")} style={{ minHeight: 48, paddingHorizontal: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: fondAjouter() }}>
              <PlusPastille taille={24} />
              <Ink size={13} weight="extraBold" color={c.accentText}>{traduire("Un club")}</Ink>
            </Pressable>
          </View>
        ) : null}

        {club ? (
          <View style={{ borderRadius: 18, backgroundColor: blancA(0.75), borderWidth: 1, borderColor: c.border, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
              <ClubMark club={club} size={40} />
              <View style={{ flex: 1, gap: 1 }}>
                <Ink size={15} weight="extraBold" numberOfLines={2}>{traduire(club.name)}</Ink>
                <Ink size={13} color={c.textSecondary} numberOfLines={2}>
                  {value.outdoor ? traduire('Séance du club, dehors') : club.address?.trim() ? club.address.trim() : traduire('Au club, en salle')}
                </Ink>
              </View>
            </View>
            <Pressable onPress={() => setOutdoor(!value.outdoor)} accessibilityRole="switch" accessibilityLabel={traduire("Séance en extérieur")} accessibilityState={{ checked: value.outdoor }} style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderTopWidth: 1, borderColor: c.border }}>
              <PlaceGlyph kind="exterieur" size={20} color={value.outdoor ? d.texte : c.textSecondary} />
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="bold">{traduire("Séance en extérieur")}</Ink>
                <Ink size={12} color={c.textMuted}>{traduire("Active si tu t’es entraîné dehors")}</Ink>
              </View>
              <Toggle on={value.outdoor} />
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([
              { k: 'salle', label: 'En salle' },
              { k: 'exterieur', label: 'Dehors' },
              { k: 'maison', label: 'À la maison' },
            ] as const).map((o) => {
              const on = cadre === o.k;
              return (
                <Pressable key={o.k} onPress={() => pickCadre(o.k)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ ...chosen(on), flex: 1, minHeight: 68, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 4 }}>
                  <PlaceGlyph kind={o.k} size={22} color={on ? d.texte : c.textSecondary} />
                  <Ink size={13} weight="extraBold" color={on ? d.texte : c.ink} numberOfLines={1}>{traduire(o.label)}</Ink>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* l'endroit : seulement quand il apporte quelque chose */}
        {(club && value.outdoor) || (!club && (cadre === 'exterieur' || cadre === 'salle')) ? (
          <View style={{ gap: 8 }}>
            <TextInput
              value={value.place}
              onChangeText={(t) => onChange({ place: t, lat: null, lon: null })}
              placeholder={cadre === 'salle' && !club ? traduire('Nom de la salle, facultatif') : 'Parc, plage, stade, facultatif'}
              placeholderTextColor={c.textMuted}
              accessibilityLabel={cadre === 'salle' && !club ? traduire('Nom de la salle') : traduire('Endroit de la séance')}
              style={[fontStyle('bold'), { height: 50, fontSize: 15, color: c.ink, paddingHorizontal: 14, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }]}
            />
            {club || cadre === 'exterieur' ? (
              <Pressable onPress={locate} disabled={locating} accessibilityRole="button" accessibilityLabel={traduire("Utiliser ma position actuelle")} accessibilityHint={traduire("Remplit l’endroit avec le lieu où tu te trouves")} style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderRadius: 16, backgroundColor: pressed ? d.bord : d.fond })}>
                {locating ? <ActivityIndicator size="small" color={d.texte} /> : <PlaceGlyph kind="gps" size={20} color={d.texte} />}
                <View style={{ flex: 1 }}>
                  <Ink size={14} weight="extraBold" color={d.texte}>{locating ? traduire('Recherche de ta position...') : traduire('Utiliser ma position actuelle')}</Ink>
                  <Ink size={12} color={c.textSecondary}>{traduire("Remplit l’endroit avec le lieu où tu te trouves")}</Ink>
                </View>
              </Pressable>
            ) : null}
            {locError ? <Ink size={12} color={c.danger} style={{ paddingHorizontal: 4 }}>{locError}</Ink> : null}
            {places.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {places.map((p) => {
                  const on = p.name === value.place;
                  return (
                    <Pressable key={p.name} onPress={() => onChange({ place: p.name, lat: p.lat, lon: p.lon })} accessibilityRole="button" accessibilityLabel={`Endroit ${p.name}`} accessibilityState={{ selected: on }} style={{ minHeight: 40, maxWidth: '100%', paddingHorizontal: 12, borderRadius: 12, justifyContent: 'center', backgroundColor: on ? d.plein : c.fillSoft }}>
                      <Ink size={13} weight="bold" color={on ? d.surPlein : c.ink} numberOfLines={1}>{traduire(p.name)}</Ink>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {clubs.length === 0 ? (
          <Pressable onPress={() => router.push('/add-club' as any)} accessibilityRole="button" style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
            <Icon name="plus" size={14} strokeWidth={2.8} color={d.texte} />
            <Ink size={14} weight="bold" color={d.texte}>{traduire("Ajouter ton club")}</Ink>
          </Pressable>
        ) : null}
      </Section>

      <Section icon="star" title={traduire(note.titre)}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {note.mots.map((mot, i) => {
            const n = i + 1;
            const sel = value.technique ?? 0;
            const on = sel >= n;
            const picked = sel === n;
            const col = couleurNote(n);
            return (
              <Pressable key={mot} onPress={() => { selectionAsync().catch(() => {}); onChange({ technique: value.technique === n ? null : n }); }} accessibilityRole="button" accessibilityLabel={traduire("{0} {1} sur 5, {2}", note.nom, n, mot)} accessibilityState={{ selected: value.technique === n }} style={{ flex: 1, minHeight: 50, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: picked ? col.fill : on ? col.tint : blancA(0.75), borderWidth: on ? 0 : 1, borderColor: c.border }}>
                <Ink size={17} weight="black" color={picked ? col.onFill : on ? col.text : c.textMuted}>{n}</Ink>
              </Pressable>
            );
          })}
        </View>
        {value.technique ? (
          <Ink size={13} weight="extraBold" color={couleurNote(value.technique).text} style={{ paddingHorizontal: 4 }}>{traduire("{0} sur 5, {1}", value.technique, note.mots[value.technique - 1].toLocaleLowerCase(LOCALE))}</Ink>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
            <Ink size={12} color={c.textMuted}>{`1, ${note.mots[0].toLocaleLowerCase(LOCALE)}`}</Ink>
            <Ink size={12} color={c.textMuted}>{`5, ${note.mots[4].toLocaleLowerCase(LOCALE)}`}</Ink>
          </View>
        )}
      </Section>
    </View>
  );
}

/** En tete de la feuille de fin : le sport avec son illustration et sa couleur, le club s'il y en a un */
export function SportRibbon({ sport, femme = false, title, sub }: { sport: string; femme?: boolean; title?: string; sub?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const d = teinte('seances');
  const img = sportImage(sport, femme);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, paddingRight: 14, borderRadius: 20, backgroundColor: d.fond }}>
      <View style={{ width: 52, height: 52, borderRadius: 15, backgroundColor: paletteSombre() ? d.bord : sportTint(sport), overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
        {img ? <Image source={img} style={{ width: 52, height: 62, marginBottom: -8 }} resizeMode="contain" /> : null}
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={17} weight="black" tight color={d.texte} numberOfLines={1}>{title || getSportName(sport)}</Ink>
        {sub ? <Ink size={13} weight="bold" color={c.textSecondary} numberOfLines={1}>{sub}</Ink> : null}
      </View>
    </View>
  );
}

function Section({ icon, title, children }: { icon: 'calendar' | 'pin' | 'star'; title: string; children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const d = teinte('seances');
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2 }}>
        <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: d.fond, alignItems: 'center', justifyContent: 'center' }}>
          {icon === 'calendar' ? <Icon name="calendar" size={17} color={d.texte} /> : <PlaceGlyph kind={icon} size={17} color={d.texte} />}
        </View>
        <Ink size={16} weight="black" tight color={theme.colors.ink} style={{ flex: 1 }}>{title}</Ink>
      </View>
      {children}
    </View>
  );
}

/** Logo du club, sinon son initiale sur sa couleur */
function ClubMark({ club, size }: { club: Club; size: number }) {
  const src = club.logo_uri ? getClubLogoSource(club.logo_uri) : null;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: src ? '#FFFFFF' : club.color || '#2C4A84', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: paletteSombre() ? 1 : 0, borderColor: 'rgba(242,241,236,0.18)' }}>
      {src ? <Image source={src} style={{ width: size, height: size }} resizeMode="cover" /> : <Ink size={size * 0.44} weight="black" color="#FFFFFF">{(club.name?.trim()[0] ?? '?').toLocaleUpperCase(LOCALE)}</Ink>}
    </View>
  );
}

function Toggle({ on }: { on: boolean }) {
  const { theme } = useYoroiTheme();
  const d = teinte('seances');
  return (
    <View style={{ width: 48, height: 30, borderRadius: 15, padding: 3, backgroundColor: on ? d.plein : theme.colors.border, alignItems: on ? 'flex-end' : 'flex-start', justifyContent: 'center' }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: on ? d.surPlein : '#FFFFFF' }} />
    </View>
  );
}

/** Petits pictos du lieu, dessines au trait */
function PlaceGlyph({ kind, size, color }: { kind: 'salle' | 'exterieur' | 'maison' | 'gps' | 'pin' | 'star'; size: number; color: string }) {
  const p = { stroke: color, strokeWidth: 2, fill: 'none' as const, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  let body: React.ReactNode = null;
  switch (kind) {
    case 'salle': body = <><Path d="M3 10l9-6 9 6" {...p} /><Rect x={5} y={10} width={14} height={10} rx={1.5} {...p} /><Path d="M9 15h6M7.5 13.5v3M16.5 13.5v3" {...p} /></>; break;
    case 'exterieur': body = <><Circle cx={12} cy={9} r={3.5} {...p} /><Path d="M12 2.5v1.5M12 14v1.5M5.5 9H4M20 9h-1.5M7.4 4.4l1 1M16.6 4.4l-1 1M3 20.5c3-2.5 6-2.5 9 0s6 2.5 9 0" {...p} /></>; break;
    case 'maison': body = <><Path d="M4 11l8-6.5 8 6.5" {...p} /><Path d="M6 9.5V20h12V9.5" {...p} /><Path d="M10 20v-5h4v5" {...p} /></>; break;
    case 'gps': body = <><Circle cx={12} cy={12} r={6.5} {...p} /><Circle cx={12} cy={12} r={2} fill={color} /><Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" {...p} /></>; break;
    case 'pin': body = <><Path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" {...p} /><Circle cx={12} cy={10} r={2.3} {...p} /></>; break;
    case 'star': body = <Path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" {...p} />; break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
