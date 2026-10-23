// ============================================
// TRAINING TEMPLATES : Modeles de seance rapides
// ============================================
// Templates pre-remplis que l'utilisateur peut appliquer en 1 tap.
// Stockes en AsyncStorage, editables.
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSportName } from '@/lib/sports';
import logger from '@/lib/security/logger';

export interface TrainingTemplate {
  id: string;
  name: string;
  type: string;            // BJJ, Boxe, Musculation, Running, etc.
  duration: number;        // minutes
  rpe?: number;            // 1-10
  description?: string;
  icon?: string;           // Lucide name
  color?: string;
  isBuiltIn?: boolean;
}

const KEY = '@yoroi_training_templates';

export const DEFAULT_TEMPLATES: TrainingTemplate[] = [
  {
    id: 'bjj_classic',
    name: 'JJB classique',
    type: getSportName('jjb'),
    duration: 90,
    rpe: 7,
    description: 'Echauffement, technique, sparring 5x5min, etirements.',
    icon: 'Swords',
    color: '#3B82F6',
    isBuiltIn: true,
  },
  {
    id: 'padel_express',
    name: 'Padel 45min',
    type: 'Padel',
    duration: 45,
    rpe: 5,
    description: 'Match rapide, 2 sets.',
    icon: 'Zap',
    color: '#10B981',
    isBuiltIn: true,
  },
  {
    id: 'muscu_full',
    name: 'Musculation Full-Body',
    type: 'Musculation',
    duration: 60,
    rpe: 8,
    description: 'Squat, Bench, Rowing, Core. 4x8.',
    icon: 'Dumbbell',
    color: '#D4AF37',
    isBuiltIn: true,
  },
  {
    id: 'muscu_push',
    name: 'Push (Pecs/Epaules/Triceps)',
    type: 'Musculation',
    duration: 60,
    rpe: 8,
    description: 'Bench, Dev militaire, Dips, Extensions.',
    icon: 'Dumbbell',
    color: '#D4AF37',
    isBuiltIn: true,
  },
  {
    id: 'muscu_pull',
    name: 'Pull (Dos/Biceps)',
    type: 'Musculation',
    duration: 60,
    rpe: 8,
    description: 'Tractions, Rowing, Curls, Face pull.',
    icon: 'Dumbbell',
    color: '#D4AF37',
    isBuiltIn: true,
  },
  {
    id: 'muscu_legs',
    name: 'Legs Day',
    type: 'Musculation',
    duration: 60,
    rpe: 9,
    description: 'Squat, RDL, Split, Mollets.',
    icon: 'Dumbbell',
    color: '#D4AF37',
    isBuiltIn: true,
  },
  {
    id: 'run_easy',
    name: 'Footing facile',
    type: 'Course',
    duration: 30,
    rpe: 4,
    description: 'Z2, allure de conversation.',
    icon: 'Wind',
    color: '#06B6D4',
    isBuiltIn: true,
  },
  {
    id: 'run_intervals',
    name: 'Fractionne 30/30',
    type: 'Course',
    duration: 30,
    rpe: 9,
    description: '10x (30s allure 5k, 30s trot).',
    icon: 'Wind',
    color: '#EF4444',
    isBuiltIn: true,
  },
  {
    id: 'boxe_rounds',
    name: 'Boxe 5 rounds',
    type: 'Boxe',
    duration: 45,
    rpe: 8,
    description: '5x3min sac, 1min repos.',
    icon: 'Swords',
    color: '#EF4444',
    isBuiltIn: true,
  },
  {
    id: 'mobility',
    name: 'Mobilite / Recuperation',
    type: 'Recuperation',
    duration: 20,
    rpe: 2,
    description: 'Etirements actifs, routine hanches/epaules.',
    icon: 'Moon',
    color: '#8B5CF6',
    isBuiltIn: true,
  },
];

export async function getTemplates(): Promise<TrainingTemplate[]> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    const userTemplates: TrainingTemplate[] = stored ? JSON.parse(stored) : [];
    return [...DEFAULT_TEMPLATES, ...userTemplates];
  } catch (e) {
    logger.warn('[Templates] erreur getTemplates', e);
    return DEFAULT_TEMPLATES;
  }
}

export async function saveCustomTemplate(template: TrainingTemplate): Promise<void> {
  const stored = await AsyncStorage.getItem(KEY);
  const list: TrainingTemplate[] = stored ? JSON.parse(stored) : [];
  const idx = list.findIndex(t => t.id === template.id);
  if (idx >= 0) {
    list[idx] = template;
  } else {
    list.push(template);
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

export async function deleteCustomTemplate(templateId: string): Promise<void> {
  const stored = await AsyncStorage.getItem(KEY);
  const list: TrainingTemplate[] = stored ? JSON.parse(stored) : [];
  const filtered = list.filter(t => t.id !== templateId);
  await AsyncStorage.setItem(KEY, JSON.stringify(filtered));
}
