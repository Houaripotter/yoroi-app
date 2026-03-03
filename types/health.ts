export type MetricType = 'weight' | 'bodyFat' | 'muscleMass' | 'water' | 'waist' | 'arms' | 'chest';

export interface WeightEntry {
  id?: string;
  date: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
  water?: number;
  visceralFat?: number;
  metabolicAge?: number;
  boneMass?: number;
  bmr?: number;
  measurements?: {
    arms?: number;
    chest?: number;
    navel?: number;
    hips?: number;
    thighs?: number;
  };
}

export interface MetricConfig {
  type: MetricType;
  label: string;
  color: string;
  unit: string;
  icon: string;
}

export const METRIC_CONFIGS: Record<MetricType, MetricConfig> = {
  weight: {
    type: 'weight',
    label: 'Poids',
    color: '#4ECDC4',
    unit: 'kg',
    icon: 'weight',
  },
  bodyFat: {
    type: 'bodyFat',
    label: 'Graisse',
    color: '#FF9500',
    unit: '%',
    icon: 'droplet',
  },
  muscleMass: {
    type: 'muscleMass',
    label: 'Muscle',
    color: '#5856D6',
    unit: 'kg',
    icon: 'zap',
  },
  water: {
    type: 'water',
    label: 'Eau',
    color: '#32ADE6',
    unit: '%',
    icon: 'droplets',
  },
  waist: {
    type: 'waist',
    label: 'Tour de Taille',
    color: '#F39C12',
    unit: 'cm',
    icon: 'ruler',
  },
  arms: {
    type: 'arms',
    label: 'Bras',
    color: '#3498DB',
    unit: 'cm',
    icon: 'arm',
  },
  chest: {
    type: 'chest',
    label: 'Poitrine',
    color: '#E74C3C',
    unit: 'cm',
    icon: 'chest',
  },
};
