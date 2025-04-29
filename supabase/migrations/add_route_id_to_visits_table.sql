/*
  # Add route_id column to visits table

  1. Modified Tables
    - `visits`
      - Added `route_id` column (uuid, references routes.id, optional)
  2. Security
    - No security changes
*/

ALTER TABLE visits ADD COLUMN IF NOT EXISTS route_id uuid REFERENCES routes(id);