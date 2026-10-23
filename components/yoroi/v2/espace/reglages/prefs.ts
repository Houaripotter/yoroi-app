/** Unites de poids et de mensurations (cle @yoroi_settings, inchangee) */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';
import { uniteDepuisReglage, type UnitePoids } from '@/lib/v2/unitePoids';

export type WeightUnit = 'kg' | 'lbs';
export type MeasureUnit = 'cm' | 'in';

type UnitesLues = { w?: WeightUnit; m?: MeasureUnit };

// 18 octobre 2026 : une seule lecture partagee par tous les ecrans (une liste de seances appelle ce hook pour chaque ligne),
// relue quand les donnees changent (unite changee dans le Profil) ; un ecran deja ouvert suit le changement
let derniere: UnitesLues | null = null;
let lecture: Promise<UnitesLues> | null = null;
const abonnes = new Set<(u: UnitesLues) => void>();
let ecoute = false;

function lireUnites(): Promise<UnitesLues> {
  if (!lecture) {
    lecture = (async () => {
      try {
        const raw = await AsyncStorage.getItem('@yoroi_settings');
        const s = raw ? JSON.parse(raw) : {};
        derniere = { w: s?.weight_unit || undefined, m: s?.measurement_unit || undefined };
      } catch {
        derniere = derniere ?? {};
      }
      return derniere;
    })();
  }
  return lecture;
}

function ecouterChangements() {
  if (ecoute) return;
  ecoute = true;
  DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', () => {
    lecture = null;
    lireUnites().then((u) => abonnes.forEach((f) => f(u))).catch(() => {});
  });
}

export function useUnits() {
  const [weightUnit, setW] = useState<WeightUnit>(derniere?.w ?? 'kg');
  const [measurementUnit, setM] = useState<MeasureUnit>(derniere?.m ?? 'cm');

  useEffect(() => {
    let vivant = true;
    const appliquer = (u: UnitesLues) => {
      if (!vivant) return;
      if (u.w) setW(u.w);
      if (u.m) setM(u.m);
    };
    ecouterChangements();
    abonnes.add(appliquer);
    lireUnites().then(appliquer).catch(() => {});
    return () => {
      vivant = false;
      abonnes.delete(appliquer);
    };
  }, []);

  const save = useCallback(async (key: 'weight_unit' | 'measurement_unit', value: string) => {
    try {
      const raw = await AsyncStorage.getItem('@yoroi_settings');
      const s = raw ? JSON.parse(raw) : {};
      s[key] = value;
      await AsyncStorage.setItem('@yoroi_settings', JSON.stringify(s));
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
    } catch (e) {
      logger.error('[Reglages] sauvegarde des unités impossible', e);
    }
  }, []);

  const setWeightUnit = (v: WeightUnit) => { setW(v); save('weight_unit', v); };
  const setMeasurementUnit = (v: MeasureUnit) => { setM(v); save('measurement_unit', v); };

  return { weightUnit, measurementUnit, setWeightUnit, setMeasurementUnit };
}

/** L'unite d'affichage des charges et des poids : 'kg' ou 'lb' (stockage toujours en kilos) */
export function useUnitePoids(): UnitePoids {
  return uniteDepuisReglage(useUnits().weightUnit);
}
