export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      weight_entries: {
        Row: {
          id: string
          user_id: string
          date: string
          weight: number
          body_fat: number | null
          muscle_mass: number | null
          water: number | null
          visceral_fat: number | null
          metabolic_age: number | null
          measurements: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          weight: number
          body_fat?: number | null
          muscle_mass?: number | null
          water?: number | null
          visceral_fat?: number | null
          metabolic_age?: number | null
          measurements?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          weight?: number
          body_fat?: number | null
          muscle_mass?: number | null
          water?: number | null
          visceral_fat?: number | null
          metabolic_age?: number | null
          measurements?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
