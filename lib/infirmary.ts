// ============================================
// YOROI - SERVICE SUIVI BLESSURES
// ============================================
// Gestion des blessures et suivi EVA

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';
import secureStorage from '@/lib/security/secureStorage';

// ============================================
// TYPES
// ============================================

export type BodySide = 'front' | 'back';

export type InjuryStatus = 'active' | 'healing' | 'healed';

export type TreatmentType = 'ice' | 'heat' | 'medication' | 'physio' | 'rest' | 'compression' | 'elevation';

export interface BodyZone {
  id: string;
  name: string;
  x: number; // Position en % (0-100)
  y: number; // Position en % (0-100)
  side: BodySide;
}

export interface EVARecord {
  date: string; // ISO date
  score: number; // 0-10
}

export interface Treatment {
  id: string;
  date: string;
  type: TreatmentType;
  note?: string;
  duration?: number; // en minutes
}

export interface Injury {
  id: string;
  zoneId: string;
  zoneName: string;
  type: string; // Entorse, Contusion, Élongation, etc.
  dateCreated: string;
  dateHealed?: string;
  status: InjuryStatus;
  evaHistory: EVARecord[];
  treatments: Treatment[];
  notes?: string;
}

export interface FitForDutyStatus {
  status: 'operational' | 'restricted' | 'unfit';
  color: string;
  label: string;
  message: string;
  maxEVA: number;
  affectedZones: string[];
}

// ============================================
// ZONES DU CORPS
// ============================================

export const BODY_ZONES: Record<BodySide, BodyZone[]> = {
  front: [
    { id: 'head', name: 'Tête', x: 50, y: 8, side: 'front' },
    { id: 'neck', name: 'Cou', x: 50, y: 12, side: 'front' },
    { id: 'shoulder_left', name: 'Épaule gauche', x: 30, y: 18, side: 'front' },
    { id: 'shoulder_right', name: 'Épaule droite', x: 70, y: 18, side: 'front' },
    { id: 'chest', name: 'Poitrine', x: 50, y: 25, side: 'front' },
    { id: 'bicep_left', name: 'Biceps gauche', x: 22, y: 28, side: 'front' },
    { id: 'bicep_right', name: 'Biceps droit', x: 78, y: 28, side: 'front' },
    { id: 'forearm_left', name: 'Avant-bras gauche', x: 18, y: 38, side: 'front' },
    { id: 'forearm_right', name: 'Avant-bras droit', x: 82, y: 38, side: 'front' },
    { id: 'wrist_left', name: 'Poignet gauche', x: 15, y: 45, side: 'front' },
    { id: 'wrist_right', name: 'Poignet droit', x: 85, y: 45, side: 'front' },
    { id: 'abs', name: 'Abdominaux', x: 50, y: 38, side: 'front' },
    { id: 'hip_left', name: 'Hanche gauche', x: 38, y: 48, side: 'front' },
    { id: 'hip_right', name: 'Hanche droite', x: 62, y: 48, side: 'front' },
    { id: 'thigh_left', name: 'Cuisse gauche', x: 38, y: 58, side: 'front' },
    { id: 'thigh_right', name: 'Cuisse droite', x: 62, y: 58, side: 'front' },
    { id: 'knee_left', name: 'Genou gauche', x: 38, y: 70, side: 'front' },
    { id: 'knee_right', name: 'Genou droit', x: 62, y: 70, side: 'front' },
    { id: 'shin_left', name: 'Tibia gauche', x: 38, y: 80, side: 'front' },
    { id: 'shin_right', name: 'Tibia droit', x: 62, y: 80, side: 'front' },
    { id: 'ankle_left', name: 'Cheville gauche', x: 38, y: 90, side: 'front' },
    { id: 'ankle_right', name: 'Cheville droite', x: 62, y: 90, side: 'front' },
  ],
  back: [
    { id: 'upper_back', name: 'Haut du dos', x: 50, y: 22, side: 'back' },
    { id: 'lower_back', name: 'Lombaires', x: 50, y: 40, side: 'back' },
    { id: 'tricep_left', name: 'Triceps gauche', x: 22, y: 28, side: 'back' },
    { id: 'tricep_right', name: 'Triceps droit', x: 78, y: 28, side: 'back' },
    { id: 'glute_left', name: 'Fessier gauche', x: 42, y: 52, side: 'back' },
    { id: 'glute_right', name: 'Fessier droit', x: 58, y: 52, side: 'back' },
    { id: 'hamstring_left', name: 'Ischio gauche', x: 38, y: 62, side: 'back' },
    { id: 'hamstring_right', name: 'Ischio droit', x: 62, y: 62, side: 'back' },
    { id: 'calf_left', name: 'Mollet gauche', x: 38, y: 78, side: 'back' },
    { id: 'calf_right', name: 'Mollet droit', x: 62, y: 78, side: 'back' },
  ],
};

// Types de blessures courants
export const INJURY_TYPES = [
  'Entorse',
  'Contusion',
  'Élongation',
  'Déchirure',
  'Tendinite',
  'Fracture',
  'Luxation',
  'Crampe',
  'Courbature',
  'Autre',
];

// ============================================
// SERVICE DE GESTION DES BLESSURES
// ============================================

const STORAGE_KEY = '@yoroi_injuries';

class InfirmaryService {
  private migrationDone = false;

  /**
   * Migre les données de AsyncStorage vers SecureStorage (une seule fois)
   */
  private async migrateFromAsyncStorage(): Promise<void> {
    if (this.migrationDone) return;

    try {
      // Vérifier si des données existent déjà dans SecureStorage
      const secureData = await secureStorage.getItem(STORAGE_KEY);
      if (secureData && Array.isArray(secureData) && secureData.length > 0) {
        this.migrationDone = true;
        return;
      }

      // Essayer de récupérer les anciennes données depuis AsyncStorage
      const oldData = await AsyncStorage.getItem(STORAGE_KEY);
      if (oldData) {
        const parsed = JSON.parse(oldData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migrer vers SecureStorage
          await secureStorage.setItem(STORAGE_KEY, parsed);
          // Supprimer les anciennes données
          await AsyncStorage.removeItem(STORAGE_KEY);
          logger.info('[Infirmary] Migration vers SecureStorage réussie');
        }
      }
    } catch (error) {
      logger.error('[Infirmary] Erreur migration:', error);
    }

    this.migrationDone = true;
  }

  /**
   * Obtenir toutes les blessures
   */
  async getAllInjuries(): Promise<Injury[]> {
    try {
      // Assurer la migration au premier accès
      await this.migrateFromAsyncStorage();

      const data = await secureStorage.getItem(STORAGE_KEY);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      logger.error('[Infirmary] Erreur chargement blessures:', error);
      return [];
    }
  }

  /**
   * Obtenir les blessures actives
   */
  async getActiveInjuries(): Promise<Injury[]> {
    const injuries = await this.getAllInjuries();
    return injuries.filter(i => i.status === 'active' || i.status === 'healing');
  }

  /**
   * Obtenir les blessures guéries (archives)
   */
  async getHealedInjuries(): Promise<Injury[]> {
    const injuries = await this.getAllInjuries();
    return injuries.filter(i => i.status === 'healed');
  }

  /**
   * Ajouter une nouvelle blessure
   */
  async addInjury(injury: Omit<Injury, 'id' | 'dateCreated'>): Promise<Injury> {
    const newInjury: Injury = {
      ...injury,
      id: `inj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      dateCreated: new Date().toISOString(),
    };

    const injuries = await this.getAllInjuries();
    injuries.push(newInjury);
    await secureStorage.setItem(STORAGE_KEY, injuries);

    return newInjury;
  }

  /**
   * Mettre à jour une blessure
   */
  async updateInjury(injuryId: string, updates: Partial<Injury>): Promise<void> {
    const injuries = await this.getAllInjuries();
    const index = injuries.findIndex(i => i.id === injuryId);

    if (index !== -1) {
      injuries[index] = { ...injuries[index], ...updates };
      await secureStorage.setItem(STORAGE_KEY, injuries);
    }
  }

  /**
   * Ajouter un enregistrement EVA
   */
  async addEVARecord(injuryId: string, score: number): Promise<void> {
    const injuries = await this.getAllInjuries();
    const injury = injuries.find(i => i.id === injuryId);

    if (injury) {
      const newRecord: EVARecord = {
        date: new Date().toISOString(),
        score,
      };

      injury.evaHistory.push(newRecord);

      // Mettre à jour le statut selon l'EVA
      if (score === 0) {
        injury.status = 'healed';
        injury.dateHealed = new Date().toISOString();
      } else if (score <= 3 && injury.status === 'active') {
        injury.status = 'healing';
      }

      await secureStorage.setItem(STORAGE_KEY, injuries);
    }
  }

  /**
   * Ajouter un soin
   */
  async addTreatment(injuryId: string, treatment: Omit<Treatment, 'id' | 'date'>): Promise<void> {
    const injuries = await this.getAllInjuries();
    const injury = injuries.find(i => i.id === injuryId);

    if (injury) {
      const newTreatment: Treatment = {
        ...treatment,
        id: `treat_${Date.now()}`,
        date: new Date().toISOString(),
      };

      injury.treatments.push(newTreatment);
      await secureStorage.setItem(STORAGE_KEY, injuries);
    }
  }

  /**
   * Marquer une blessure comme guérie
   */
  async markAsHealed(injuryId: string): Promise<void> {
    await this.updateInjury(injuryId, {
      status: 'healed',
      dateHealed: new Date().toISOString(),
    });

    // Ajouter EVA = 0
    await this.addEVARecord(injuryId, 0);
  }

  /**
   * Supprimer une blessure
   */
  async deleteInjury(injuryId: string): Promise<void> {
    const injuries = await this.getAllInjuries();
    const filtered = injuries.filter(i => i.id !== injuryId);
    await secureStorage.setItem(STORAGE_KEY, filtered);
  }

  /**
   * Calculer le statut "Fit for Duty"
   */
  async getFitForDutyStatus(): Promise<FitForDutyStatus> {
    const activeInjuries = await this.getActiveInjuries();

    if (activeInjuries.length === 0) {
      return {
        status: 'operational',
        color: '#4CAF50',
        label: 'OPÉRATIONNEL',
        message: 'Aucune blessure active',
        maxEVA: 0,
        affectedZones: [],
      };
    }

    // Trouver l'EVA max parmi les blessures actives
    const maxEVA = Math.max(
      ...activeInjuries.map(i => {
        const lastEVA = i.evaHistory[i.evaHistory.length - 1];
        return lastEVA ? lastEVA.score : 0;
      })
    );

    const affectedZones = activeInjuries.map(i => i.zoneName);

    if (maxEVA >= 7) {
      return {
        status: 'unfit',
        color: '#F44336',
        label: 'INAPTE',
        message: 'Blessure sévère : Repos obligatoire recommandé',
        maxEVA,
        affectedZones,
      };
    }

    if (maxEVA >= 3) {
      return {
        status: 'restricted',
        color: '#FF9800',
        label: 'RESTREINT',
        message: 'Blessure légère : Entraînement adapté conseillé',
        maxEVA,
        affectedZones,
      };
    }

    return {
      status: 'operational',
      color: '#4CAF50',
      label: 'OPÉRATIONNEL',
      message: 'Blessures mineures : Rester vigilant',
      maxEVA,
      affectedZones,
    };
  }

  /**
   * Détecter les zones à risque (blessures récurrentes)
   */
  async getRecurringInjuries(): Promise<{ zoneId: string; zoneName: string; count: number }[]> {
    const allInjuries = await this.getAllInjuries();
    const zoneCount: Record<string, { name: string; count: number }> = {};

    allInjuries.forEach(injury => {
      if (!zoneCount[injury.zoneId]) {
        zoneCount[injury.zoneId] = { name: injury.zoneName, count: 0 };
      }
      zoneCount[injury.zoneId].count++;
    });

    return Object.entries(zoneCount)
      .filter(([_, data]) => data.count >= 2)
      .map(([zoneId, data]) => ({
        zoneId,
        zoneName: data.name,
        count: data.count,
      }));
  }

  /**
   * Obtenir la tendance de guérison d'une blessure
   */
  getTrend(injury: Injury): 'improving' | 'stable' | 'worsening' {
    if (injury.evaHistory.length < 2) return 'stable';

    const recent = injury.evaHistory.slice(-3); // 3 derniers enregistrements
    const scores = recent.map(r => r.score);

    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];

    if (lastScore < firstScore - 1) return 'improving';
    if (lastScore > firstScore + 1) return 'worsening';
    return 'stable';
  }
}

// Instance singleton
export const infirmaryService = new InfirmaryService();

export default infirmaryService;
