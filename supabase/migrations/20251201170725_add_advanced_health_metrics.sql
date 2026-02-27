/*
  # Add Advanced Health Metrics

  1. Updates
    - Add body composition metrics to weight_entries table:
      - `body_fat` (decimal, percentage)
      - `muscle_mass` (decimal, kg)
      - `water` (decimal, percentage)
      - `visceral_fat` (integer, 1-59 scale)
      - `metabolic_age` (integer, years)
    - Add body measurements to weight_entries table:
      - `waist` (decimal, cm)
      - `chest` (decimal, cm)
      - `arms` (decimal, cm)
      - `thighs` (decimal, cm)

  2. Notes
    - All new fields are optional to maintain backward compatibility
    - Supports data from body composition scales (Withings, Xiaomi, Omron, etc.)
    - Uses JSONB for measurements to allow flexible schema
*/

-- Create weight_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS weight_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  weight decimal(5,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add body composition metrics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weight_entries' AND column_name = 'body_fat'
  ) THEN
    ALTER TABLE weight_entries ADD COLUMN body_fat decimal(4,1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weight_entries' AND column_name = 'muscle_mass'
  ) THEN
    ALTER TABLE weight_entries ADD COLUMN muscle_mass decimal(5,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weight_entries' AND column_name = 'water'
  ) THEN
    ALTER TABLE weight_entries ADD COLUMN water decimal(4,1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weight_entries' AND column_name = 'visceral_fat'
  ) THEN
    ALTER TABLE weight_entries ADD COLUMN visceral_fat integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weight_entries' AND column_name = 'metabolic_age'
  ) THEN
    ALTER TABLE weight_entries ADD COLUMN metabolic_age integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weight_entries' AND column_name = 'measurements'
  ) THEN
    ALTER TABLE weight_entries ADD COLUMN measurements jsonb;
  END IF;
END $$;

-- Add constraints for data validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'body_fat_range'
  ) THEN
    ALTER TABLE weight_entries ADD CONSTRAINT body_fat_range CHECK (body_fat >= 0 AND body_fat <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'water_range'
  ) THEN
    ALTER TABLE weight_entries ADD CONSTRAINT water_range CHECK (water >= 0 AND water <= 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'visceral_fat_range'
  ) THEN
    ALTER TABLE weight_entries ADD CONSTRAINT visceral_fat_range CHECK (visceral_fat >= 1 AND visceral_fat <= 59);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'metabolic_age_range'
  ) THEN
    ALTER TABLE weight_entries ADD CONSTRAINT metabolic_age_range CHECK (metabolic_age >= 1 AND metabolic_age <= 150);
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own weight entries" ON weight_entries;
DROP POLICY IF EXISTS "Users can insert own weight entries" ON weight_entries;
DROP POLICY IF EXISTS "Users can update own weight entries" ON weight_entries;
DROP POLICY IF EXISTS "Users can delete own weight entries" ON weight_entries;

-- Create RLS policies
CREATE POLICY "Users can view own weight entries"
  ON weight_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight entries"
  ON weight_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight entries"
  ON weight_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight entries"
  ON weight_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS weight_entries_user_id_idx ON weight_entries(user_id);
CREATE INDEX IF NOT EXISTS weight_entries_date_idx ON weight_entries(date DESC);
CREATE INDEX IF NOT EXISTS weight_entries_user_date_idx ON weight_entries(user_id, date DESC);
