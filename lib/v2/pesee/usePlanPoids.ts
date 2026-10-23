/**
 * Ton plan de poids pour les courbes (vague 32) : la ligne directrice et le torii.
 * Lit le profil (date et poids de depart, cap, taille, sens de l'objectif) et la date du torii gardee dans
 * le telephone. La carte Poids de l'accueil (check: true) fait le point une fois par jour : si ta vraie tendance
 * deplace le torii d'au moins 7 jours, il bouge et une fenetre in-app le dit (au plus une fois par semaine).
 * Les autres courbes font le meme calcul sans rien garder ni ouvrir (vague 33 : meme torii partout, jamais dans le passe).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProfile } from '@/lib/database';
import type { DayWeight } from '@/lib/v2/weightStats';
import type { Ligne, MemoTorii } from './ligneDirectrice';
import { cleDuPlan } from './ligneDirectrice';
import { toriiDuJour } from './arrivee';

const KEY = 'yoroi_torii_v1';
const EVENT = 'YOROI_TORII_CHANGED';

type Profil = { start_date?: string | null; start_weight?: number | null; height_cm?: number | null; weight_goal?: string | null };

export type PlanPoids = {
  ligne: Ligne | null;
  /** date du torii (AAAA-MM-JJ) : l'arrivee prevue, jamais dans le passe, ou ta vraie arrivee ; null sinon */
  torii: string | null;
  /** cap atteint : le torii est ta vraie date d'arrivee (en or) */
  atteint: boolean;
  /** debut du plan (date et poids), meme sans ligne affichee : le depart du chemin vers le torii */
  depart: { date: string; poids: number } | null;
  /** fenetre a montrer aujourd'hui (seulement avec check) */
  fenetre: { kind: 'recule' | 'rapproche'; date: string } | null;
  /** 18 octobre : la date du cap a ete choisie par toi (carte « Ton objectif ») */
  choisie: boolean;
  /** la cle du plan (debut et cap), pour garder une date choisie */
  cle: string | null;
};

let memoCache: MemoTorii | null | undefined;

/** La date du torii gardee dans le telephone (le paywall et le bilan lisent la meme) */
export async function lireToriiGarde(): Promise<MemoTorii | null> {
  return lireMemo();
}

async function lireMemo(): Promise<MemoTorii | null> {
  if (memoCache !== undefined) return memoCache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as MemoTorii) : null;
    memoCache = v && typeof v.date === 'string' && typeof v.cle === 'string' ? v : null;
  } catch {
    memoCache = null;
  }
  return memoCache;
}

async function ecrireMemo(m: MemoTorii): Promise<void> {
  memoCache = m;
  DeviceEventEmitter.emit(EVENT, m);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    // stockage indisponible : la date reste en memoire pour cette session
  }
}

/**
 * 18 octobre (Houari : « pouvoir changer la date du cap ») : ta date du cap, choisie a la main, gardee la ou le torii
 * l'etait deja (yoroi_torii_v1). Toutes les courbes, la montre, le bilan et le paywall la lisent aussitot.
 * Refuse une date qui n'est pas apres aujourd'hui.
 */
export async function choisirDateCap(date: string, cle: string | null, today: string): Promise<boolean> {
  if (!/^\d{4}-\d{2}-\d{2}/.test(date) || date.slice(0, 10) <= today) return false;
  await ecrireMemo({ cle: cle ?? '', date: date.slice(0, 10), fenetreLe: null, choisie: true });
  return true;
}

/** 18 octobre 2026 (visite guidee avec l'exemple) : oublie seulement la copie en memoire, rien n'est efface */
export function oublierToriiEnMemoire(): void {
  memoCache = undefined;
}

/** Studio : oublie la date retenue (elle sera refixee depuis le debut du plan) */
export async function oublierTorii(): Promise<void> {
  memoCache = undefined;
  await AsyncStorage.removeItem(KEY).catch(() => undefined);
}

export function usePlanPoids(series: DayWeight[], cap: number | null, opts: { enabled?: boolean; check?: boolean; today: string }): PlanPoids {
  const enabled = opts.enabled !== false;
  const [profil, setProfil] = useState<Profil | null>(null);
  const [memo, setMemo] = useState<MemoTorii | null | undefined>(memoCache);
  const [fenetre, setFenetre] = useState<PlanPoids['fenetre']>(null);
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const charger = () =>
      getProfile()
        .then((p) => alive && setProfil((p as Profil | null) ?? {}))
        .catch(() => alive && setProfil({}));
    charger();
    lireMemo().then((m) => alive && setMemo(m)).catch(() => {});
    const sub = DeviceEventEmitter.addListener(EVENT, (m: MemoTorii) => setMemo(m));
    // courbe v2 : « Début de mon objectif » change start_date et start_weight du profil : tout se recalcule
    const subP = DeviceEventEmitter.addListener('YOROI_PROFILE_CHANGED', charger);
    return () => {
      alive = false;
      sub.remove();
      subP.remove();
    };
  }, [enabled, cap]);

  // 17 octobre : le meme calcul que le bilan, la montre et le paywall (lib/v2/pesee/arrivee.ts, source unique)
  const jour = useMemo(() => {
    if (!enabled || !profil || cap == null || series.length === 0) return null;
    return toriiDuJour({ profil, series, cap, today: opts.today, memo: memo ?? null });
  }, [enabled, profil, cap, series, opts.today, memo]);
  const datePlan = jour?.datePlan ?? null;
  // memoire pas encore lue : rien a garder ni a ouvrir
  const decision = memo === undefined ? null : jour?.decision ?? null;

  // le point du jour : la carte de l'accueil garde la date et ouvre la fenetre ; les autres courbes ne gardent
  // que la date d'un nouveau plan
  useEffect(() => {
    if (!decision || !decision.memo) return;
    const m = decision.memo;
    const changed = !memo || memo.cle !== m.cle || memo.date !== m.date || (memo.fenetreLe ?? null) !== (m.fenetreLe ?? null);
    if (!opts.check) {
      // 18 octobre : une date du cap choisie garde sa date, seule la cle suit ton nouveau debut ou ton nouvel objectif
      if (!memo || memo.cle !== m.cle) ecrireMemo(m.choisie ? m : { cle: m.cle, date: datePlan ?? m.date, fenetreLe: null }).catch(() => {});
      return;
    }
    const k = `${opts.today}|${m.cle}`;
    if (done.current === k) return;
    done.current = k;
    if (changed) ecrireMemo(m).catch(() => {});
    if (decision.fenetre && decision.date) setFenetre({ kind: decision.fenetre, date: decision.date });
  }, [decision, memo, opts.check, opts.today, datePlan]);

  // perte ou prise sans torii (tendance pas fiable) : pas de ligne, seulement la ligne du cap (vague 33) ;
  // tendance pas encore fiable : la date du plan si elle est a venir, sinon le rythme sain (vague 35, toriiDuJour)
  const choisie = !!(jour?.decision?.memo?.choisie && jour.torii && jour.decision.memo.date === jour.torii);
  return { ligne: jour?.ligne ?? null, depart: jour?.plan?.depart ?? null, torii: jour?.torii ?? null, atteint: !!jour?.atteint, fenetre, choisie, cle: jour?.plan ? cleDuPlan(jour.plan) : null };
}
