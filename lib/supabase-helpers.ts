import { supabase } from './supabase';

export interface WeightEntry {
  id: string;
  user_id: string;
  date: string;
  weight: number;
  body_fat?: number | null;
  muscle_mass?: number | null;
  water?: number | null;
  visceral_fat?: number | null;
  metabolic_age?: number | null;
  measurements?: {
    arms?: number;
    chest?: number;
    navel?: number;
    hips?: number;
    thighs?: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface WeightEntryInsert {
  user_id: string;
  date?: string;
  weight: number;
  body_fat?: number | null;
  muscle_mass?: number | null;
  water?: number | null;
  visceral_fat?: number | null;
  metabolic_age?: number | null;
  measurements?: {
    arms?: number;
    chest?: number;
    navel?: number;
    hips?: number;
    thighs?: number;
  } | null;
}

export interface WeightEntryUpdate {
  date?: string;
  weight?: number;
  body_fat?: number | null;
  muscle_mass?: number | null;
  water?: number | null;
  visceral_fat?: number | null;
  metabolic_age?: number | null;
  measurements?: {
    arms?: number;
    chest?: number;
    navel?: number;
    hips?: number;
    thighs?: number;
  } | null;
  updated_at?: string;
}

/**
 * Récupère toutes les entrées de poids de l'utilisateur connecté
 */
export async function getWeightEntries() {
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching weight entries:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Récupère les entrées de poids pour une période donnée
 */
export async function getWeightEntriesByDateRange(
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching weight entries by date range:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Récupère les N dernières entrées de poids
 */
export async function getRecentWeightEntries(limit: number = 30) {
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent weight entries:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Ajoute une nouvelle entrée de poids
 */
export async function addWeightEntry(entry: Omit<WeightEntryInsert, 'user_id'>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  const insertData: WeightEntryInsert = {
    ...entry,
    user_id: user.id,
  };

  const { data, error } = await supabase
    .from('weight_entries')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error adding weight entry:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Met à jour une entrée de poids existante
 */
export async function updateWeightEntry(id: string, updates: WeightEntryUpdate) {
  const updateData: WeightEntryUpdate = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('weight_entries')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating weight entry:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Supprime une entrée de poids
 */
export async function deleteWeightEntry(id: string) {
  const { error } = await supabase
    .from('weight_entries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting weight entry:', error);
    return { error };
  }

  return { error: null };
}

/**
 * Récupère l'entrée de poids la plus récente
 */
export async function getLatestWeightEntry() {
  const { data, error } = await supabase
    .from('weight_entries')
    .select('*')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching latest weight entry:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Vérifie si l'utilisateur est connecté
 */
export async function isAuthenticated() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

/**
 * Récupère l'utilisateur actuel
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Error fetching current user:', error);
    return { user: null, error };
  }

  return { user, error: null };
}
